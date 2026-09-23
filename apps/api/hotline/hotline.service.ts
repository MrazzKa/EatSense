import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HotlineRequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { HotlineAvailabilityService } from './hotline-availability.service';
import { CreateHotlineRequestDto } from './dto';
import {
  HOTLINE_CLIENT_PUSH_BODY,
  HOTLINE_EXPERT_PUSH_BODY,
  HOTLINE_PUSH_TITLE,
  MINUTES_PER_PERSON_AHEAD,
  REQUEST_TTL_MINUTES,
} from './hotline.constants';

const REQUEST_SELECT = {
  id: true,
  status: true,
  reason: true,
  symptomReportId: true,
  conversationId: true,
  createdAt: true,
  acceptedAt: true,
  expiresAt: true,
  expert: { select: { id: true, displayName: true, type: true, avatarUrl: true } },
} as const;

const OPEN_STATUSES: HotlineRequestStatus[] = [
  HotlineRequestStatus.WAITING,
  HotlineRequestStatus.ACCEPTED,
];

/**
 * The hotline queue.
 *
 * First in, first out, one open request per person, and everything that is not
 * taken expires. The alternative — a queue that quietly grows — is worse than a
 * closed line, because it tells someone in discomfort that help is on the way
 * when it is not.
 */
@Injectable()
export class HotlineService {
  private readonly logger = new Logger(HotlineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: HotlineAvailabilityService,
    private readonly notifications: NotificationsService,
  ) {}

  async statusFor(userId: string) {
    await this.expireStale();
    const [line, waiting, active] = await Promise.all([
      this.availability.status(),
      this.prisma.hotlineRequest.count({ where: { status: HotlineRequestStatus.WAITING } }),
      this.activeRequest(userId),
    ]);

    return {
      ...line,
      waiting,
      estimatedWaitMinutes: line.open ? waiting * MINUTES_PER_PERSON_AHEAD : null,
      request: active,
    };
  }

  async activeRequest(userId: string) {
    return this.prisma.hotlineRequest.findFirst({
      where: { clientId: userId, status: { in: OPEN_STATUSES } },
      orderBy: { createdAt: 'desc' },
      select: REQUEST_SELECT,
    });
  }

  async create(userId: string, dto: CreateHotlineRequestDto) {
    await this.expireStale();

    const existing = await this.activeRequest(userId);
    if (existing) {
      // Not an error: the app may have retried, or the user may have reopened
      // the screen. Handing back the same request is what they meant.
      return existing;
    }

    const line = await this.availability.status();
    if (!line.open) {
      throw new ConflictException('The hotline is closed right now.');
    }

    if (dto.symptomReportId) {
      const owned = await this.prisma.symptomReport.findFirst({
        where: { id: dto.symptomReportId, userId },
        select: { id: true },
      });
      if (!owned) throw new BadRequestException('Unknown symptom report.');
    }

    const request = await this.prisma.hotlineRequest.create({
      data: {
        clientId: userId,
        reason: dto.reason?.trim() || null,
        symptomReportId: dto.symptomReportId || null,
        locale: dto.locale || null,
        expiresAt: new Date(Date.now() + REQUEST_TTL_MINUTES * 60_000),
      },
      select: REQUEST_SELECT,
    });

    // Fire and forget: a push that fails must not fail the request. Without it
    // an expert only learns about the queue by staring at an open portal tab.
    void this.alertOnDutyExperts();

    return request;
  }

  private async alertOnDutyExperts() {
    try {
      const onDutyIds = await this.availability.expertIdsOnDuty();
      if (onDutyIds.length === 0) return;

      const experts = await this.prisma.expertProfile.findMany({
        where: { id: { in: onDutyIds } },
        select: { userId: true },
      });

      await Promise.all(
        experts.map((expert) => this.push(expert.userId, HOTLINE_EXPERT_PUSH_BODY, 'hotline_request')),
      );
    } catch (error: any) {
      this.logger.warn(`[Hotline] could not alert experts: ${error?.message}`);
    }
  }

  private push(userId: string, body: string, type: string, extra?: Record<string, any>) {
    return this.notifications
      .sendPushNotification(userId, HOTLINE_PUSH_TITLE, body, { type, ...extra })
      .catch(() => undefined);
  }

  async cancel(userId: string, requestId: string) {
    const { count } = await this.prisma.hotlineRequest.updateMany({
      where: { id: requestId, clientId: userId, status: { in: OPEN_STATUSES } },
      data: { status: HotlineRequestStatus.CANCELLED, closedAt: new Date() },
    });
    if (count === 0) throw new NotFoundException('Request not found.');
    return { cancelled: true };
  }

  async queueFor(expertUserId: string) {
    const expert = await this.requireOnDutyExpert(expertUserId);
    await this.expireStale();

    const [waiting, mine] = await Promise.all([
      this.prisma.hotlineRequest.findMany({
        where: { status: HotlineRequestStatus.WAITING },
        orderBy: { createdAt: 'asc' },
        take: 25,
        select: {
          id: true,
          reason: true,
          symptomReportId: true,
          locale: true,
          createdAt: true,
          expiresAt: true,
          client: { select: { id: true, email: true } },
        },
      }),
      this.prisma.hotlineRequest.findMany({
        where: { expertId: expert.id, status: HotlineRequestStatus.ACCEPTED },
        orderBy: { acceptedAt: 'desc' },
        take: 25,
        select: REQUEST_SELECT,
      }),
    ]);

    return { waiting, accepted: mine };
  }

  /**
   * Takes a request off the queue and opens the conversation.
   *
   * The status change is a conditional update rather than read-then-write: two
   * experts pressing "take" at the same moment must not both end up talking to
   * the same person. Whoever loses the race gets a plain 409.
   */
  async accept(expertUserId: string, requestId: string) {
    const expert = await this.requireOnDutyExpert(expertUserId);

    const { count } = await this.prisma.hotlineRequest.updateMany({
      where: { id: requestId, status: HotlineRequestStatus.WAITING },
      data: {
        status: HotlineRequestStatus.ACCEPTED,
        expertId: expert.id,
        acceptedAt: new Date(),
      },
    });
    if (count === 0) {
      throw new ConflictException('Somebody else has already taken this request.');
    }

    const request = await this.prisma.hotlineRequest.findUniqueOrThrow({
      where: { id: requestId },
      select: { id: true, clientId: true },
    });

    const conversation = await this.openConversation(expert.id, request.clientId);

    // The waiting screen tells people they can close the app because we will
    // notify them. This is that notification.
    void this.push(request.clientId, HOTLINE_CLIENT_PUSH_BODY, 'hotline_accepted', {
      conversationId: conversation.id,
    });

    return this.prisma.hotlineRequest.update({
      where: { id: requestId },
      data: { conversationId: conversation.id },
      select: REQUEST_SELECT,
    });
  }

  async complete(expertUserId: string, requestId: string) {
    const expert = await this.requireExpert(expertUserId);
    const { count } = await this.prisma.hotlineRequest.updateMany({
      where: { id: requestId, expertId: expert.id, status: HotlineRequestStatus.ACCEPTED },
      data: { status: HotlineRequestStatus.COMPLETED, closedAt: new Date() },
    });
    if (count === 0) throw new NotFoundException('Request not found.');
    return { completed: true };
  }

  /**
   * Reuses the existing conversation when there is one. A hotline call should
   * land in the same thread as any earlier contact, not start a parallel history
   * the expert has to reconcile.
   */
  private async openConversation(expertId: string, clientId: string) {
    return this.prisma.conversation.upsert({
      where: { clientId_expertId: { clientId, expertId } },
      create: { clientId, expertId, status: 'active', lastMessageAt: new Date() },
      update: { status: 'active' },
      select: { id: true },
    });
  }

  private async expireStale() {
    const { count } = await this.prisma.hotlineRequest.updateMany({
      where: { status: HotlineRequestStatus.WAITING, expiresAt: { lt: new Date() } },
      data: { status: HotlineRequestStatus.EXPIRED, closedAt: new Date() },
    });
    if (count > 0) this.logger.log(`[Hotline] expired ${count} unanswered request(s)`);
  }

  private async requireExpert(userId: string) {
    const expert = await this.prisma.expertProfile.findUnique({
      where: { userId },
      select: { id: true, isActive: true, isPublished: true, isVerified: true },
    });
    if (!expert || !expert.isActive || !expert.isPublished || !expert.isVerified) {
      throw new ForbiddenException('Not a hotline expert.');
    }
    return expert;
  }

  private async requireOnDutyExpert(userId: string) {
    const expert = await this.requireExpert(userId);
    const onDuty = await this.availability.expertIdsOnDuty();
    if (!onDuty.includes(expert.id)) {
      throw new ForbiddenException('You are not on the line right now.');
    }
    return expert;
  }
}

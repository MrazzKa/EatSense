import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { HotlineRequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { HotlineAvailabilityService } from './hotline-availability.service';
import { CreateHotlineRequestDto } from './dto';
import { HOTLINE_PUSH_TITLE, HotlinePushKind, hotlinePushBody } from './hotline-copy';
import {
  ACCEPTED_TTL_HOURS,
  MINUTES_PER_PERSON_AHEAD,
  RED_FLAGGED_CODE,
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

/**
 * What an expert sees in the queue before taking a request. No contact details:
 * until someone takes it, nobody needs to know who is asking — only what about.
 */
const QUEUE_SELECT = {
  id: true,
  reason: true,
  symptomReportId: true,
  locale: true,
  createdAt: true,
  expiresAt: true,
} as const;

/** Exactly what the case card renders: where, how strong, the person's answers and note. */
const CASE_REPORT_SELECT = {
  reportedAt: true,
  note: true,
  entries: {
    select: { zoneId: true, severity: true, answers: true },
    orderBy: { severity: 'desc' as const },
  },
} as const;

const OPEN_STATUSES: HotlineRequestStatus[] = [
  HotlineRequestStatus.WAITING,
  HotlineRequestStatus.ACCEPTED,
];

/** How long the app keeps telling someone their last request went unanswered. */
const EXPIRY_NOTICE_MINUTES = 30;

type ExpertRecord = { id: string; userId: string };

type BlockReader = Pick<PrismaService, 'userBlock'>;

/**
 * Requests from people who have blocked this expert, or whom the expert has
 * blocked, in either direction. The same rule conversations.service applies
 * before opening a chat — the hotline must not be a way around a block.
 */
const notBlockedWith = (expertUserId: string) => ({
  client: {
    blocksMade: { none: { blockedId: expertUserId } },
    blocksReceived: { none: { blockerId: expertUserId } },
  },
});

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

  // ------------------------------------------------------------- client ---

  async statusFor(userId: string) {
    await this.expireStale();
    const [line, waiting, active, lastExpired] = await Promise.all([
      this.availability.status(),
      this.prisma.hotlineRequest.count({ where: { status: HotlineRequestStatus.WAITING } }),
      this.activeRequest(userId),
      this.prisma.hotlineRequest.findFirst({
        where: {
          clientId: userId,
          status: HotlineRequestStatus.EXPIRED,
          closedAt: { gt: new Date(Date.now() - EXPIRY_NOTICE_MINUTES * 60_000) },
        },
        select: { id: true },
      }),
    ]);

    return {
      ...line,
      waiting,
      estimatedWaitMinutes: line.open ? waiting * MINUTES_PER_PERSON_AHEAD : null,
      request: active,
      recentlyExpired: !active && Boolean(lastExpired),
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

    if (dto.symptomReportId) await this.assertAttachable(userId, dto.symptomReportId);

    const line = await this.availability.status();
    if (!line.open) {
      throw new ConflictException('The hotline is closed right now.');
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

  async cancel(userId: string, requestId: string) {
    const { count } = await this.prisma.hotlineRequest.updateMany({
      where: { id: requestId, clientId: userId, status: { in: OPEN_STATUSES } },
      data: { status: HotlineRequestStatus.CANCELLED, closedAt: new Date() },
    });
    if (count === 0) throw new NotFoundException('Request not found.');
    return { cancelled: true };
  }

  /**
   * A report is attachable only if it is the caller's and nothing on it was an
   * emergency. The line is staffed by nutrition specialists; routing someone who
   * ticked "chest pain spreading to the arm" into a chat queue would delay the
   * one thing they need. The app shows the emergency screen on this code.
   */
  private async assertAttachable(userId: string, symptomReportId: string) {
    const report = await this.prisma.symptomReport.findFirst({
      where: { id: symptomReportId, userId },
      select: { redFlagged: true },
    });
    if (!report) throw new BadRequestException('Unknown symptom report.');
    if (report.redFlagged) {
      throw new UnprocessableEntityException({
        code: RED_FLAGGED_CODE,
        message: 'This needs emergency care, not the hotline.',
      });
    }
  }

  // ------------------------------------------------------------- expert ---

  async queueFor(expertUserId: string) {
    const expert = await this.requireOnDutyExpert(expertUserId);
    await this.expireStale();

    const [waiting, mine] = await Promise.all([
      this.prisma.hotlineRequest.findMany({
        where: { status: HotlineRequestStatus.WAITING, ...notBlockedWith(expert.userId) },
        orderBy: { createdAt: 'asc' },
        take: 25,
        select: QUEUE_SELECT,
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
   * The case card: the request plus the body-map record attached to it.
   *
   * Visible to an on-duty expert while the request is waiting — reading it is
   * how they decide whether to take it — and afterwards only to the expert who
   * took it. Anything else is indistinguishable from a request that does not
   * exist.
   */
  async caseFor(expertUserId: string, requestId: string) {
    const expert = await this.requireExpert(expertUserId);
    const request = await this.prisma.hotlineRequest.findUnique({
      where: { id: requestId },
      select: { ...QUEUE_SELECT, status: true, expertId: true, clientId: true },
    });
    if (!request) throw new NotFoundException('Request not found.');

    const isMine =
      request.status === HotlineRequestStatus.ACCEPTED && request.expertId === expert.id;
    const isOpenToMe =
      request.status === HotlineRequestStatus.WAITING && (await this.isOnDuty(expert.id));
    if (!isMine && !isOpenToMe) throw new NotFoundException('Request not found.');
    if (await this.isBlockedPair(this.prisma, expert.userId, request.clientId)) {
      throw new NotFoundException('Request not found.');
    }

    // Scoped to the requester as well as the id: a report id copied into someone
    // else's request must not leak the original owner's record.
    const report = request.symptomReportId
      ? await this.prisma.symptomReport.findFirst({
          where: { id: request.symptomReportId, userId: request.clientId },
          select: CASE_REPORT_SELECT,
        })
      : null;

    const { expertId: _expertId, clientId: _clientId, ...visible } = request;
    return { ...visible, report };
  }

  /**
   * Takes a request off the queue and opens the conversation.
   *
   * The status change is a conditional update rather than read-then-write: two
   * experts pressing "take" at the same moment must not both end up talking to
   * the same person. Whoever loses the race gets a plain 409. The whole handover
   * is one transaction, so a failure opening the conversation cannot leave a
   * request marked as taken with nowhere to talk.
   */
  async accept(expertUserId: string, requestId: string) {
    const expert = await this.requireOnDutyExpert(expertUserId);

    const { request, conversationId } = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.hotlineRequest.updateMany({
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

      const taken = await tx.hotlineRequest.findUniqueOrThrow({
        where: { id: requestId },
        select: { clientId: true, locale: true },
      });

      // Thrown inside the transaction so the status flip above rolls back and
      // the request stays in the queue for everyone else.
      if (await this.isBlockedPair(tx, expert.userId, taken.clientId)) {
        throw new NotFoundException('Request not found.');
      }

      // Reuse the existing conversation: a hotline call should land in the same
      // thread as any earlier contact, not start a parallel history.
      const conversation = await tx.conversation.upsert({
        where: { clientId_expertId: { clientId: taken.clientId, expertId: expert.id } },
        create: {
          clientId: taken.clientId,
          expertId: expert.id,
          status: 'active',
          lastMessageAt: new Date(),
        },
        update: { status: 'active' },
        select: { id: true },
      });

      const updated = await tx.hotlineRequest.update({
        where: { id: requestId },
        data: { conversationId: conversation.id },
        select: REQUEST_SELECT,
      });

      return { request: { ...updated, ...taken }, conversationId: conversation.id };
    });

    // The waiting screen tells people they can close the app because we will
    // notify them. This is that notification.
    void this.push(request.clientId, 'clientAccepted', request.locale, 'hotline_accepted', {
      conversationId,
    });

    const { clientId: _clientId, locale: _locale, ...visible } = request;
    return visible;
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

  /** Resolves the caller to an expert allowed anywhere near the line. */
  async requireExpert(userId: string): Promise<ExpertRecord> {
    const expert = await this.prisma.expertProfile.findUnique({
      where: { userId },
      select: { id: true, isActive: true, isPublished: true, isVerified: true },
    });
    if (!expert || !expert.isActive || !expert.isPublished || !expert.isVerified) {
      throw new ForbiddenException('Not a hotline expert.');
    }
    return { id: expert.id, userId };
  }

  // -------------------------------------------------------- housekeeping ---

  /**
   * Expires waiting requests past their deadline and tells each person.
   *
   * Runs on every queue read and on a schedule — the schedule is what keeps the
   * promise on the waiting screen ("you can close the app, we will notify you")
   * when nobody happens to be reading the queue. Each row is flipped with its
   * own conditional update so that two overlapping sweeps notify a person once.
   */
  async expireStale(now: Date = new Date()): Promise<number> {
    const stale = await this.prisma.hotlineRequest.findMany({
      where: { status: HotlineRequestStatus.WAITING, expiresAt: { lt: now } },
      select: { id: true, clientId: true, locale: true },
      take: 100,
    });

    let expired = 0;
    for (const request of stale) {
      const { count } = await this.prisma.hotlineRequest.updateMany({
        where: { id: request.id, status: HotlineRequestStatus.WAITING },
        data: { status: HotlineRequestStatus.EXPIRED, closedAt: now },
      });
      if (count === 1) {
        expired += 1;
        void this.push(request.clientId, 'clientExpired', request.locale, 'hotline_expired');
      }
    }

    if (expired > 0) this.logger.log(`[Hotline] expired ${expired} unanswered request(s)`);
    return expired;
  }

  /**
   * Closes taken requests whose conversation has gone quiet.
   *
   * "Taken" only means the hotline handed the person to an expert; the chat
   * itself lives on in the conversation, which this never touches. What closing
   * does change is that the client may ask the line again and the expert loses
   * the case card — so a request is closed only when BOTH the hand-over and the
   * last message are older than the window, never on age alone while people are
   * still talking.
   */
  async closeAbandoned(now: Date = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - ACCEPTED_TTL_HOURS * 3_600_000);
    const candidates = await this.prisma.hotlineRequest.findMany({
      where: { status: HotlineRequestStatus.ACCEPTED, acceptedAt: { lt: cutoff } },
      select: { id: true, conversationId: true },
      take: 100,
    });
    if (candidates.length === 0) return 0;

    const conversationIds = candidates
      .map((request) => request.conversationId)
      .filter((id): id is string => Boolean(id));
    const active = await this.prisma.conversation.findMany({
      where: { id: { in: conversationIds }, lastMessageAt: { gte: cutoff } },
      select: { id: true },
    });
    const stillTalking = new Set(active.map((conversation) => conversation.id));

    let closed = 0;
    for (const request of candidates) {
      if (request.conversationId && stillTalking.has(request.conversationId)) continue;
      const { count } = await this.prisma.hotlineRequest.updateMany({
        where: { id: request.id, status: HotlineRequestStatus.ACCEPTED },
        data: { status: HotlineRequestStatus.COMPLETED, closedAt: now },
      });
      closed += count;
    }

    if (closed > 0) this.logger.log(`[Hotline] closed ${closed} quiet request(s)`);
    return closed;
  }

  // ------------------------------------------------------------ private ---

  private async alertOnDutyExperts() {
    try {
      const onDutyIds = await this.availability.expertIdsOnDuty();
      if (onDutyIds.length === 0) return;

      const experts = await this.prisma.expertProfile.findMany({
        where: { id: { in: onDutyIds } },
        select: {
          userId: true,
          user: { select: { userProfile: { select: { preferences: true } } } },
        },
      });

      await Promise.all(
        experts.map((expert) =>
          this.push(
            expert.userId,
            'expertAlert',
            (expert.user?.userProfile?.preferences as { language?: string } | null)?.language,
            'hotline_request',
          ),
        ),
      );
    } catch (error: any) {
      this.logger.warn(`[Hotline] could not alert experts: ${error?.message}`);
    }
  }

  private push(
    userId: string,
    kind: HotlinePushKind,
    locale: string | null | undefined,
    type: string,
    extra?: Record<string, string>,
  ) {
    return this.notifications
      .sendPushNotification(userId, HOTLINE_PUSH_TITLE, hotlinePushBody(kind, locale), {
        type,
        ...extra,
      })
      .catch(() => undefined);
  }

  private async isBlockedPair(db: BlockReader, expertUserId: string, clientId: string) {
    const block = await db.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: clientId, blockedId: expertUserId },
          { blockerId: expertUserId, blockedId: clientId },
        ],
      },
      select: { id: true },
    });
    return Boolean(block);
  }

  private async isOnDuty(expertId: string) {
    return (await this.availability.expertIdsOnDuty()).includes(expertId);
  }

  private async requireOnDutyExpert(userId: string) {
    const expert = await this.requireExpert(userId);
    if (!(await this.isOnDuty(expert.id))) {
      throw new ForbiddenException('You are not on the line right now.');
    }
    return expert;
  }
}

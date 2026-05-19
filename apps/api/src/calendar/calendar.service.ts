import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const MIN_SLOT_MINUTES = 15;

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // ============== Availability ==============

  async getMyAvailability(userId: string) {
    const expert = await this.requireExpertByUserId(userId);
    const [rules, exceptions] = await Promise.all([
      this.prisma.expertAvailability.findMany({
        where: { expertId: expert.id },
        orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
      }),
      this.prisma.availabilityException.findMany({
        where: { expertId: expert.id, date: { gte: new Date(Date.now() - 7 * 86400000) } },
        orderBy: { date: 'asc' },
      }),
    ]);
    return { timezone: (expert as any).timezone || 'UTC', rules, exceptions };
  }

  async setMyAvailability(userId: string, payload: { timezone?: string; rules: Array<{ weekday: number; startMinute: number; endMinute: number; isActive?: boolean }> }) {
    const expert = await this.requireExpertByUserId(userId);
    const tz = payload.timezone || (expert as any).timezone || 'UTC';

    // Validation
    for (const r of payload.rules || []) {
      if (!Number.isInteger(r.weekday) || r.weekday < 0 || r.weekday > 6) {
        throw new BadRequestException('weekday must be 0..6');
      }
      if (r.startMinute < 0 || r.endMinute > 24 * 60 || r.startMinute >= r.endMinute) {
        throw new BadRequestException('Invalid time range');
      }
      if ((r.endMinute - r.startMinute) % MIN_SLOT_MINUTES !== 0) {
        throw new BadRequestException(`Block length must be a multiple of ${MIN_SLOT_MINUTES} min`);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.expertAvailability.deleteMany({ where: { expertId: expert.id } });
      if (payload.rules?.length) {
        await tx.expertAvailability.createMany({
          data: payload.rules.map((r) => ({
            expertId: expert.id,
            weekday: r.weekday,
            startMinute: r.startMinute,
            endMinute: r.endMinute,
            timezone: tz,
            isActive: r.isActive !== false,
          })),
        });
      }
      if (payload.timezone) {
        await tx.expertProfile.update({ where: { id: expert.id }, data: { timezone: tz } as any });
      }
    });

    return this.getMyAvailability(userId);
  }

  async addException(userId: string, dto: { date: string; kind: 'closed' | 'custom'; startMinute?: number; endMinute?: number; reason?: string }) {
    const expert = await this.requireExpertByUserId(userId);
    if (!dto.date) throw new BadRequestException('date required');
    return this.prisma.availabilityException.create({
      data: {
        expertId: expert.id,
        date: new Date(dto.date),
        kind: dto.kind,
        startMinute: dto.startMinute,
        endMinute: dto.endMinute,
        reason: dto.reason,
      },
    });
  }

  async removeException(userId: string, id: string) {
    const expert = await this.requireExpertByUserId(userId);
    const found = await this.prisma.availabilityException.findUnique({ where: { id } });
    if (!found || found.expertId !== expert.id) throw new NotFoundException();
    await this.prisma.availabilityException.delete({ where: { id } });
    return { ok: true };
  }

  // ============== Public slots for booking ==============

  async listSlots(expertId: string, opts: { from: Date; to: Date; durationMinutes: number }) {
    if (opts.durationMinutes < MIN_SLOT_MINUTES) {
      throw new BadRequestException(`duration min ${MIN_SLOT_MINUTES} minutes`);
    }
    const expert = await this.prisma.expertProfile.findUnique({
      where: { id: expertId },
      select: { id: true, isActive: true, isPublished: true, timezone: true, awayUntil: true } as any,
    });
    if (!expert || !expert.isActive || !expert.isPublished) throw new NotFoundException();

    const tz = (expert as any).timezone || 'UTC';
    const awayUntil = (expert as any).awayUntil as Date | null;

    const [rules, exceptions, busy] = await Promise.all([
      this.prisma.expertAvailability.findMany({ where: { expertId, isActive: true } }),
      this.prisma.availabilityException.findMany({
        where: { expertId, date: { gte: new Date(opts.from.getTime() - 86400000), lte: opts.to } },
      }),
      this.prisma.scheduledConsultation.findMany({
        where: {
          expertId,
          status: { in: ['SCHEDULED', 'PENDING_RESCHEDULE', 'IN_PROGRESS'] as any },
          startAt: { lt: opts.to },
          endAt: { gt: opts.from },
        },
        select: { startAt: true, endAt: true },
      }),
    ]);

    const slots: Array<{ startAt: string; endAt: string }> = [];
    const dayMs = 86400000;
    for (let dayStart = startOfDayUtc(opts.from); dayStart < opts.to; dayStart = new Date(dayStart.getTime() + dayMs)) {
      // Convert dayStart (UTC) to expert's local weekday using the tz offset (simple approach via Intl)
      const local = new Date(dayStart);
      const weekday = local.getUTCDay();
      // Apply exceptions for this date
      const exceptionsForDay = exceptions.filter((e) => sameUtcDate(e.date, dayStart));
      const closed = exceptionsForDay.find((e) => e.kind === 'closed');
      if (closed) continue;
      if (awayUntil && dayStart <= awayUntil) continue;

      const customs = exceptionsForDay.filter((e) => e.kind === 'custom' && e.startMinute != null && e.endMinute != null);
      const blocks =
        customs.length > 0
          ? customs.map((c) => ({ startMinute: c.startMinute!, endMinute: c.endMinute! }))
          : rules.filter((r) => r.weekday === weekday).map((r) => ({ startMinute: r.startMinute, endMinute: r.endMinute }));

      for (const b of blocks) {
        for (let m = b.startMinute; m + opts.durationMinutes <= b.endMinute; m += MIN_SLOT_MINUTES) {
          const start = new Date(dayStart.getTime() + m * 60000);
          const end = new Date(start.getTime() + opts.durationMinutes * 60000);
          if (start < opts.from || end > opts.to) continue;
          if (start.getTime() < Date.now()) continue;
          const conflicts = busy.some((c) => c.startAt < end && c.endAt > start);
          if (!conflicts) slots.push({ startAt: start.toISOString(), endAt: end.toISOString() });
        }
      }
    }
    return { timezone: tz, slots };
  }

  // ============== Consultations CRUD ==============

  async createConsultation(actorUserId: string, dto: { expertId?: string; clientId?: string; startAt: string; durationMinutes: number; offerId?: string; conversationId?: string }) {
    const start = new Date(dto.startAt);
    if (Number.isNaN(start.getTime())) throw new BadRequestException('Invalid startAt');
    if (dto.durationMinutes < MIN_SLOT_MINUTES) throw new BadRequestException('duration too short');
    const end = new Date(start.getTime() + dto.durationMinutes * 60000);

    // Resolve expert + client based on actor role
    const expertProfile = await this.prisma.expertProfile.findUnique({ where: { userId: actorUserId } });
    let expertId: string;
    let clientId: string;
    let initiatedBy: 'expert' | 'client';

    if (expertProfile) {
      expertId = expertProfile.id;
      if (!dto.clientId) throw new BadRequestException('clientId required');
      clientId = dto.clientId;
      initiatedBy = 'expert';
    } else {
      if (!dto.expertId) throw new BadRequestException('expertId required');
      expertId = dto.expertId;
      clientId = actorUserId;
      initiatedBy = 'client';
    }

    // Verify link exists (expert must know this client via code or manual)
    const link = await this.prisma.expertClientLink.findFirst({ where: { expertId, clientId, isActive: true } });
    if (!link) throw new ForbiddenException('No active expert-client link');

    // Overlap check
    const conflict = await this.prisma.scheduledConsultation.findFirst({
      where: {
        OR: [{ expertId }, { clientId }],
        status: { in: ['SCHEDULED', 'PENDING_RESCHEDULE', 'IN_PROGRESS'] as any },
        startAt: { lt: end },
        endAt: { gt: start },
      },
    });
    if (conflict) throw new BadRequestException('Slot overlaps with an existing consultation');

    const consultation = await this.prisma.scheduledConsultation.create({
      data: {
        expertId,
        clientId,
        conversationId: dto.conversationId,
        offerId: dto.offerId,
        startAt: start,
        endAt: end,
        durationMinutes: dto.durationMinutes,
        initiatedBy,
        livekitRoom: `consult-${cryptoRandomId()}`,
      },
    });

    // Notify counterparty
    this.notifyConsultationEvent(consultation, 'created').catch(() => {});
    return consultation;
  }

  async listMyConsultations(userId: string, opts: { role?: 'expert' | 'client'; status?: string; from?: Date; to?: Date }) {
    const expert = await this.prisma.expertProfile.findUnique({ where: { userId }, select: { id: true } });
    const where: any = {};
    if (opts.role === 'expert' && expert) where.expertId = expert.id;
    else if (opts.role === 'client') where.clientId = userId;
    else where.OR = [{ clientId: userId }, ...(expert ? [{ expertId: expert.id }] : [])];
    if (opts.status) where.status = opts.status;
    if (opts.from || opts.to) where.startAt = { ...(opts.from && { gte: opts.from }), ...(opts.to && { lte: opts.to }) };
    return this.prisma.scheduledConsultation.findMany({
      where,
      orderBy: { startAt: 'asc' },
      take: 200,
      include: {
        expert: { select: { id: true, displayName: true, avatarUrl: true } },
        client: { select: { id: true, email: true, userProfile: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
      },
    });
  }

  async cancelConsultation(userId: string, id: string, reason?: string) {
    const c = await this.requireParticipant(userId, id);
    if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(c.status)) throw new BadRequestException('Already finalized');
    const expertProfile = await this.prisma.expertProfile.findUnique({ where: { userId }, select: { id: true } });
    const cancelledBy = expertProfile?.id === c.expertId ? 'expert' : 'client';
    const updated = await this.prisma.scheduledConsultation.update({
      where: { id },
      data: { status: 'CANCELLED' as any, cancellationReason: reason, cancelledBy, cancelledAt: new Date() },
    });
    this.notifyConsultationEvent(updated, 'cancelled').catch(() => {});
    return updated;
  }

  async proposeReschedule(userId: string, id: string, dto: { startAt: string; durationMinutes?: number }) {
    const c = await this.requireParticipant(userId, id);
    if (!['SCHEDULED', 'PENDING_RESCHEDULE'].includes(c.status)) throw new BadRequestException('Cannot reschedule in this state');
    const start = new Date(dto.startAt);
    const duration = dto.durationMinutes || c.durationMinutes;
    const end = new Date(start.getTime() + duration * 60000);
    const expertProfile = await this.prisma.expertProfile.findUnique({ where: { userId }, select: { id: true } });
    const proposedBy = expertProfile?.id === c.expertId ? 'expert' : 'client';
    const updated = await this.prisma.scheduledConsultation.update({
      where: { id },
      data: { status: 'PENDING_RESCHEDULE' as any, proposedStartAt: start, proposedEndAt: end, proposedBy },
    });
    this.notifyConsultationEvent(updated, 'reschedule_proposed').catch(() => {});
    return updated;
  }

  async respondReschedule(userId: string, id: string, accept: boolean) {
    const c = await this.requireParticipant(userId, id);
    if (c.status !== 'PENDING_RESCHEDULE') throw new BadRequestException('No pending reschedule');
    if (!c.proposedStartAt || !c.proposedEndAt) throw new BadRequestException('No proposal');
    const expertProfile = await this.prisma.expertProfile.findUnique({ where: { userId }, select: { id: true } });
    const isMine = (c.proposedBy === 'expert') === (expertProfile?.id === c.expertId);
    if (isMine) throw new BadRequestException('Counterparty must accept/decline');

    if (accept) {
      const updated = await this.prisma.scheduledConsultation.update({
        where: { id },
        data: {
          status: 'SCHEDULED' as any,
          startAt: c.proposedStartAt,
          endAt: c.proposedEndAt,
          proposedStartAt: null,
          proposedEndAt: null,
          proposedBy: null,
          reminder24hSentAt: null,
          reminder1hSentAt: null,
          reminder10mSentAt: null,
        },
      });
      this.notifyConsultationEvent(updated, 'reschedule_accepted').catch(() => {});
      return updated;
    } else {
      const updated = await this.prisma.scheduledConsultation.update({
        where: { id },
        data: { status: 'SCHEDULED' as any, proposedStartAt: null, proposedEndAt: null, proposedBy: null },
      });
      this.notifyConsultationEvent(updated, 'reschedule_declined').catch(() => {});
      return updated;
    }
  }

  async startConsultation(userId: string, id: string) {
    const c = await this.requireParticipant(userId, id);
    if (!['SCHEDULED', 'IN_PROGRESS'].includes(c.status)) throw new BadRequestException('Cannot start in this state');
    const now = Date.now();
    if (c.startAt.getTime() - now > 5 * 60000) {
      throw new BadRequestException('Too early — call opens 5 min before start');
    }
    return this.prisma.scheduledConsultation.update({
      where: { id },
      data: { status: 'IN_PROGRESS' as any, startedAt: c.startedAt || new Date() },
    });
  }

  async completeConsultation(userId: string, id: string) {
    const c = await this.requireParticipant(userId, id);
    if (c.status === 'COMPLETED') return c;
    return this.prisma.scheduledConsultation.update({
      where: { id },
      data: { status: 'COMPLETED' as any, completedAt: new Date() },
    });
  }

  // ============== iCal ==============

  signICalToken(userId: string): string {
    const secret = process.env.JWT_SECRET || '';
    const payload = `${userId}.ical`;
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 32);
    return `${userId}.${sig}`;
  }

  verifyICalToken(token: string): string | null {
    const [userId, sig] = (token || '').split('.');
    if (!userId || !sig) return null;
    const expected = this.signICalToken(userId).split('.')[1];
    if (crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return userId;
    return null;
  }

  async generateICalForToken(token: string): Promise<string> {
    const userId = this.verifyICalToken(token);
    if (!userId) throw new BadRequestException('Invalid token');
    const items = await this.listMyConsultations(userId, { from: new Date(Date.now() - 30 * 86400000), to: new Date(Date.now() + 180 * 86400000) });
    const now = formatICalDate(new Date());
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//EatSense//Consultations//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:EatSense consultations',
    ];
    for (const c of items as any[]) {
      if (c.status === 'CANCELLED' || c.status === 'NO_SHOW') continue;
      const expertName = c.expert?.displayName || 'Expert';
      const clientName = c.client?.userProfile?.firstName || c.client?.email || 'Client';
      lines.push(
        'BEGIN:VEVENT',
        `UID:${c.id}@eatsense.ch`,
        `DTSTAMP:${now}`,
        `DTSTART:${formatICalDate(new Date(c.startAt))}`,
        `DTEND:${formatICalDate(new Date(c.endAt))}`,
        `SUMMARY:Consultation — ${expertName} / ${clientName}`,
        `STATUS:${c.status === 'COMPLETED' ? 'CONFIRMED' : 'TENTATIVE'}`,
        c.livekitRoom ? `URL:https://experts.eatsense.ch/call/${c.id}` : '',
        'END:VEVENT',
      );
    }
    lines.push('END:VCALENDAR');
    return lines.filter(Boolean).join('\r\n');
  }

  // ============== Helpers ==============

  private async requireExpertByUserId(userId: string) {
    const expert = await this.prisma.expertProfile.findUnique({ where: { userId } });
    if (!expert) throw new ForbiddenException('Not an expert');
    return expert;
  }

  private async requireParticipant(userId: string, consultationId: string) {
    const c = await this.prisma.scheduledConsultation.findUnique({ where: { id: consultationId } });
    if (!c) throw new NotFoundException();
    if (c.clientId !== userId) {
      const expert = await this.prisma.expertProfile.findUnique({ where: { userId }, select: { id: true } });
      if (!expert || expert.id !== c.expertId) throw new ForbiddenException();
    }
    return c;
  }

  async notifyConsultationEvent(c: any, kind: 'created' | 'cancelled' | 'reschedule_proposed' | 'reschedule_accepted' | 'reschedule_declined' | 'reminder_24h' | 'reminder_1h' | 'reminder_10m' | 'no_show') {
    const [expert, client] = await Promise.all([
      this.prisma.expertProfile.findUnique({ where: { id: c.expertId }, select: { userId: true, displayName: true } }),
      this.prisma.user.findUnique({ where: { id: c.clientId }, select: { id: true, userProfile: { select: { firstName: true } } } }),
    ]);
    if (!expert || !client) return;
    const startLocal = new Date(c.startAt).toISOString();
    const clientName = client.userProfile?.firstName || 'Client';
    const expertName = expert.displayName || 'Expert';

    const messages: Record<string, { titleExpert: string; titleClient: string; body: string }> = {
      created: { titleExpert: 'New consultation', titleClient: 'Consultation scheduled', body: `${startLocal}` },
      cancelled: { titleExpert: 'Consultation cancelled', titleClient: 'Consultation cancelled', body: `${startLocal}` },
      reschedule_proposed: { titleExpert: 'Reschedule requested', titleClient: 'Reschedule requested', body: 'Accept or decline in the app' },
      reschedule_accepted: { titleExpert: 'Reschedule accepted', titleClient: 'Reschedule accepted', body: `New time: ${startLocal}` },
      reschedule_declined: { titleExpert: 'Reschedule declined', titleClient: 'Reschedule declined', body: 'Original time kept' },
      reminder_24h: { titleExpert: 'Consultation tomorrow', titleClient: 'Consultation tomorrow', body: `with ${expertName} / ${clientName} at ${startLocal}` },
      reminder_1h: { titleExpert: 'Consultation in 1 hour', titleClient: 'Consultation in 1 hour', body: `at ${startLocal}` },
      reminder_10m: { titleExpert: 'Consultation in 10 minutes', titleClient: 'Consultation in 10 minutes', body: `Open the app` },
      no_show: { titleExpert: 'Marked as no-show', titleClient: 'Expert did not join — refund issued', body: '' },
    };
    const m = messages[kind];
    if (!m) return;
    await Promise.all([
      this.notifications.sendPushNotification(expert.userId, m.titleExpert, m.body, { type: `consultation.${kind}`, id: c.id }),
      this.notifications.sendPushNotification(client.id, m.titleClient, m.body, { type: `consultation.${kind}`, id: c.id }),
    ]).catch(() => {});
  }
}

function startOfDayUtc(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function sameUtcDate(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
}

function cryptoRandomId(): string {
  // LiveKit room name — needs to be unguessable.
  return crypto.randomBytes(9).toString('base64url');
}

function formatICalDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CalendarService, pickConsultLang } from './calendar.service';

// Localized "rate your session" prompt (push sent ~30 min after completion).
const RATING_PROMPT: Record<string, { title: string; body: (expert: string) => string }> = {
  en: { title: 'How was your consultation?', body: (e) => `Rate your session with ${e}.` },
  ru: { title: 'Как прошла консультация?', body: (e) => `Оцените сессию с ${e}.` },
  kk: { title: 'Кеңес қалай өтті?', body: (e) => `${e} маманмен сессияңызды бағалаңыз.` },
  fr: { title: 'Comment s’est passée votre consultation ?', body: (e) => `Évaluez votre séance avec ${e}.` },
  de: { title: 'Wie war Ihre Beratung?', body: (e) => `Bewerten Sie Ihre Sitzung mit ${e}.` },
  es: { title: '¿Cómo fue tu consulta?', body: (e) => `Valora tu sesión con ${e}.` },
};

@Injectable()
export class CalendarScheduler {
  private readonly logger = new Logger(CalendarScheduler.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private calendar: CalendarService,
  ) {}

  // Every minute: handle no-show, auto-complete, and rating prompt windows.
  @Cron(CronExpression.EVERY_MINUTE)
  async tick() {
    const now = new Date();

    // 1) No-show: SCHEDULED past startAt + 15min and never started.
    try {
      const candidates = await this.prisma.scheduledConsultation.findMany({
        where: {
          status: 'SCHEDULED' as any,
          startAt: { lte: new Date(now.getTime() - 15 * 60000) },
          startedAt: null,
        },
        take: 50,
      });
      for (const c of candidates) {
        await this.prisma.scheduledConsultation.update({
          where: { id: c.id },
          data: { status: 'NO_SHOW' as any, cancelledAt: now, cancellationReason: 'No-show (auto)' },
        });
        if (c.paymentId) {
          // Best-effort: actual refund handled in payments module (out of scope here).
          this.logger.warn(`[no-show] payment ${c.paymentId} should be refunded for consultation ${c.id}`);
        }
        this.calendar.notifyConsultationEvent(c, 'no_show').catch(() => {});
      }
    } catch (e) {
      this.logger.warn(`no-show tick failed: ${(e as any)?.message}`);
    }

    // 2) Auto-complete: IN_PROGRESS past endAt + 10min.
    try {
      const overdue = await this.prisma.scheduledConsultation.findMany({
        where: {
          status: 'IN_PROGRESS' as any,
          endAt: { lte: new Date(now.getTime() - 10 * 60000) },
        },
        take: 50,
      });
      for (const c of overdue) {
        await this.prisma.scheduledConsultation.update({
          where: { id: c.id },
          data: { status: 'COMPLETED' as any, completedAt: now },
        });
      }
    } catch (e) {
      this.logger.warn(`auto-complete tick failed: ${(e as any)?.message}`);
    }

    // 3) Rating prompt: COMPLETED at least 30min ago, prompt not yet sent.
    try {
      const promptables = await this.prisma.scheduledConsultation.findMany({
        where: {
          status: 'COMPLETED' as any,
          completedAt: { lte: new Date(now.getTime() - 30 * 60000) },
          ratingPromptSentAt: null,
        },
        take: 50,
      });
      for (const c of promptables) {
        const [expert, clientProfile] = await Promise.all([
          this.prisma.expertProfile.findUnique({ where: { id: c.expertId }, select: { displayName: true } }),
          this.prisma.userProfile.findUnique({ where: { userId: c.clientId }, select: { preferences: true } }),
        ]);
        const lang = pickConsultLang((clientProfile?.preferences as any)?.language);
        const strings = RATING_PROMPT[lang] || RATING_PROMPT.en;
        const expertName = expert?.displayName
          || ({ en: 'your expert', ru: 'вашим специалистом', kk: 'маманыңызбен', fr: 'votre expert', de: 'Ihrem Experten', es: 'tu experto' }[lang]);
        await this.notifications
          .sendPushNotification(c.clientId, strings.title, strings.body(expertName), {
            type: 'consultation.rating_prompt',
            id: c.id,
          })
          .catch(() => {});
        await this.prisma.scheduledConsultation.update({
          where: { id: c.id },
          data: { ratingPromptSentAt: now },
        });
      }
    } catch (e) {
      this.logger.warn(`rating prompt tick failed: ${(e as any)?.message}`);
    }
  }

  // Every 5 minutes: send 24h / 1h / 10m reminders.
  @Cron('*/5 * * * *')
  async remindersTick() {
    const now = new Date();
    try {
      const upcoming = await this.prisma.scheduledConsultation.findMany({
        where: {
          status: { in: ['SCHEDULED', 'PENDING_RESCHEDULE'] as any },
          startAt: { gte: now, lte: new Date(now.getTime() + 25 * 3600000) },
        },
        take: 200,
      });
      // Tick runs every 5 min. Reminder windows are tight (~ tick-size wide)
      // so each reminder fires near its true target, never as a "1h reminder"
      // when the call is actually 15 minutes away.
      for (const c of upcoming) {
        const minutesUntil = (c.startAt.getTime() - now.getTime()) / 60000;
        if (minutesUntil >= 5 && minutesUntil <= 12 && !c.reminder10mSentAt) {
          this.calendar.notifyConsultationEvent(c, 'reminder_10m').catch(() => {});
          await this.prisma.scheduledConsultation.update({ where: { id: c.id }, data: { reminder10mSentAt: now } });
        } else if (minutesUntil >= 55 && minutesUntil <= 65 && !c.reminder1hSentAt) {
          this.calendar.notifyConsultationEvent(c, 'reminder_1h').catch(() => {});
          await this.prisma.scheduledConsultation.update({ where: { id: c.id }, data: { reminder1hSentAt: now } });
        } else if (minutesUntil >= 24 * 60 - 5 && minutesUntil <= 24 * 60 + 5 && !c.reminder24hSentAt) {
          this.calendar.notifyConsultationEvent(c, 'reminder_24h').catch(() => {});
          await this.prisma.scheduledConsultation.update({ where: { id: c.id }, data: { reminder24hSentAt: now } });
        }
      }
    } catch (e) {
      this.logger.warn(`reminders tick failed: ${(e as any)?.message}`);
    }
  }
}

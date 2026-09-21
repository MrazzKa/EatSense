import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateSymptomReportDto, SymptomEntryDto } from './dto';
import { RedFlagPolicy } from './red-flag.policy';
import { isKnownZone, isValidAnswer, questionIdsForZone } from './symptom-catalog';

/** How far back a report may be backdated. Beyond this it is data entry, not logging. */
const MAX_BACKDATE_DAYS = 365;
/** Tolerance for a phone clock running slightly ahead of ours. */
const CLOCK_SKEW_MS = 5 * 60 * 1000;

const REPORT_LIST_SELECT = {
  id: true,
  reportedAt: true,
  note: true,
  maxSeverity: true,
  redFlagged: true,
  redFlags: true,
  createdAt: true,
  entries: {
    select: { id: true, zoneId: true, severity: true, answers: true },
    orderBy: { severity: 'desc' as const },
  },
} as const;

/**
 * Storage and retrieval for body-map symptom reports.
 *
 * The service does three things and refuses to do a fourth. It validates a
 * submission against the catalogue, it decides nothing about what the symptoms
 * mean, and it hands back history. There is no scoring, no ranking by urgency
 * and no "possible causes" — that boundary is what keeps this a diary feature
 * rather than a regulated one, and it is easier to hold if the code simply has
 * nowhere for such a thing to live.
 */
@Injectable()
export class SymptomsService {
  private readonly logger = new Logger(SymptomsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redFlagPolicy: RedFlagPolicy,
  ) {}

  async create(userId: string, dto: CreateSymptomReportDto) {
    const entries = dto.entries.map((entry) => this.sanitiseEntry(entry));

    // One zone per report — two entries for the same zone would make "how severe
    // was the stomach today" ambiguous for every reader afterwards.
    const zoneIds = new Set(entries.map((e) => e.zoneId));
    if (zoneIds.size !== entries.length) {
      throw new BadRequestException('Each body zone may appear only once in a report.');
    }

    const verdict = this.redFlagPolicy.evaluate(dto.redFlags);
    const reportedAt = this.resolveReportedAt(dto.reportedAt);
    const maxSeverity = entries.reduce((max, e) => Math.max(max, e.severity), 0);

    const report = await this.prisma.symptomReport.create({
      data: {
        userId,
        reportedAt,
        note: dto.note?.trim() || null,
        maxSeverity,
        redFlagged: verdict.triggered,
        redFlags: verdict.flags,
        locale: dto.locale || null,
        entries: {
          create: entries.map((e) => ({
            zoneId: e.zoneId,
            severity: e.severity,
            answers: e.answers,
          })),
        },
      },
      select: REPORT_LIST_SELECT,
    });

    if (verdict.triggered) {
      // Worth a log line: if this fires often we are being used for something we
      // are not, and that is a product decision, not a support ticket.
      this.logger.warn(
        `[Symptoms] report ${report.id} flagged: ${verdict.flags.join(', ')}`,
      );
    }

    return report;
  }

  /**
   * History, newest first. Keyset pagination on (reportedAt, id) rather than
   * offset — offsets shift under you as soon as the user adds a report while
   * scrolling.
   */
  async list(userId: string, limit: number, cursor?: string) {
    const take = Math.min(Math.max(limit || 20, 1), 50);

    const reports = await this.prisma.symptomReport.findMany({
      where: { userId },
      orderBy: [{ reportedAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: REPORT_LIST_SELECT,
    });

    const hasMore = reports.length > take;
    const page = hasMore ? reports.slice(0, take) : reports;

    return {
      reports: page,
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  async getById(userId: string, id: string) {
    // userId is part of the filter, not checked afterwards: a report belonging to
    // someone else must be indistinguishable from one that does not exist.
    const report = await this.prisma.symptomReport.findFirst({
      where: { id, userId },
      select: REPORT_LIST_SELECT,
    });
    if (!report) throw new NotFoundException('Report not found.');
    return report;
  }

  async remove(userId: string, id: string) {
    const { count } = await this.prisma.symptomReport.deleteMany({ where: { id, userId } });
    if (count === 0) throw new NotFoundException('Report not found.');
    return { deleted: true };
  }

  // -------------------------------------------------------------------------

  /**
   * Validates one entry against the catalogue and returns it with unknown
   * answers stripped.
   *
   * An unknown ZONE is an error — the app and the server disagree about the body,
   * and guessing would file the symptom in the wrong place forever. An unknown
   * ANSWER is also an error rather than a silent drop, for the same reason in
   * miniature: a newer app quietly losing half a questionnaire is a bug nobody
   * reports.
   */
  private sanitiseEntry(entry: SymptomEntryDto): {
    zoneId: string;
    severity: number;
    answers: Record<string, string>;
  } {
    if (!isKnownZone(entry.zoneId)) {
      throw new BadRequestException(`Unknown body zone: ${entry.zoneId}`);
    }

    const answers: Record<string, string> = {};
    const source = entry.answers ?? {};
    for (const [questionId, answerId] of Object.entries(source)) {
      if (answerId === null || answerId === undefined || answerId === '') continue;
      if (!isValidAnswer(entry.zoneId, questionId, answerId)) {
        throw new BadRequestException(
          `Answer "${String(answerId)}" is not valid for question "${questionId}" ` +
            `on zone "${entry.zoneId}". Expected one of: ${questionIdsForZone(entry.zoneId).join(', ')}.`,
        );
      }
      answers[questionId] = answerId as string;
    }

    return { zoneId: entry.zoneId, severity: entry.severity, answers };
  }

  private resolveReportedAt(raw?: string): Date {
    const now = Date.now();
    if (!raw) return new Date(now);

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('reportedAt must be an ISO-8601 date.');
    }

    const value = parsed.getTime();
    if (value > now + CLOCK_SKEW_MS) {
      throw new BadRequestException('reportedAt cannot be in the future.');
    }
    if (value < now - MAX_BACKDATE_DAYS * 24 * 60 * 60 * 1000) {
      throw new BadRequestException(`reportedAt cannot be more than ${MAX_BACKDATE_DAYS} days ago.`);
    }
    return parsed;
  }
}

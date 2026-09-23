import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { coversNow, isValidTimezone, localMoment, minutesUntil } from './hotline-time';
import { PRESENCE_HEARTBEAT_MAX_MINUTES } from './hotline.constants';

export interface LineStatus {
  open: boolean;
  onDutyCount: number;
  /** ISO instant of the next shift, when the line is closed and one is scheduled. */
  nextOpensAt: string | null;
}

interface ShiftRow {
  expertId: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
  timezone: string;
}

/**
 * Who is on the hotline, and whether it is open at all.
 *
 * Two independent things put an expert on the line: a recurring shift, and a
 * live heartbeat from the portal. The shift is the promise shown to users; the
 * heartbeat is what actually proves somebody is at a screen right now. An
 * expert counts as on duty if either holds, so the line can open unscheduled
 * without anyone editing a rota.
 */
@Injectable()
export class HotlineAvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async status(now: Date = new Date()): Promise<LineStatus> {
    const onDuty = await this.expertIdsOnDuty(now);
    if (onDuty.length > 0) {
      return { open: true, onDutyCount: onDuty.length, nextOpensAt: null };
    }
    return { open: false, onDutyCount: 0, nextOpensAt: await this.nextOpening(now) };
  }

  async expertIdsOnDuty(now: Date = new Date()): Promise<string[]> {
    const [online, shifts] = await Promise.all([
      this.prisma.expertProfile.findMany({
        where: {
          hotlineEnabled: true,
          isActive: true,
          isPublished: true,
          hotlineOnlineUntil: { gt: now },
        },
        select: { id: true },
      }),
      this.activeShifts(),
    ]);

    const ids = new Set(online.map((expert) => expert.id));
    for (const shift of shifts) {
      const moment = localMoment(now, shift.timezone);
      if (coversNow(moment, shift.weekday, shift.startMinute, shift.endMinute)) {
        ids.add(shift.expertId);
      }
    }
    return [...ids];
  }

  async nextOpening(now: Date = new Date()): Promise<string | null> {
    const shifts = await this.activeShifts();
    let soonest: number | null = null;
    for (const shift of shifts) {
      const moment = localMoment(now, shift.timezone);
      const minutes = minutesUntil(moment, shift.weekday, shift.startMinute);
      if (soonest === null || minutes < soonest) soonest = minutes;
    }
    if (soonest === null) return null;
    return new Date(now.getTime() + soonest * 60_000).toISOString();
  }

  async listShifts(expertId: string) {
    return this.prisma.hotlineShift.findMany({
      where: { expertId },
      orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
    });
  }

  async replaceShifts(
    expertId: string,
    shifts: { weekday: number; startMinute: number; endMinute: number; timezone: string }[],
  ) {
    for (const shift of shifts) {
      if (shift.weekday < 0 || shift.weekday > 6) {
        throw new BadRequestException('weekday must be 0..6');
      }
      if (shift.startMinute < 0 || shift.endMinute > 24 * 60 || shift.startMinute >= shift.endMinute) {
        throw new BadRequestException('Shift must start before it ends, within one day.');
      }
      if (!isValidTimezone(shift.timezone)) {
        throw new BadRequestException(`Unknown timezone: ${shift.timezone}`);
      }
    }

    // Replace wholesale: a rota is edited as a whole, and diffing rows would let
    // a dropped one linger and put someone on the line they never agreed to.
    await this.prisma.$transaction([
      this.prisma.hotlineShift.deleteMany({ where: { expertId } }),
      ...(shifts.length > 0
        ? [this.prisma.hotlineShift.createMany({ data: shifts.map((shift) => ({ ...shift, expertId })) })]
        : []),
    ]);

    return this.listShifts(expertId);
  }

  /**
   * Extends presence. Capped so a stuck tab cannot hold someone on the line for
   * hours; the portal re-sends this while the switch is on.
   */
  async heartbeat(expertId: string, minutes: number) {
    const span = Math.min(Math.max(Math.round(minutes) || 0, 1), PRESENCE_HEARTBEAT_MAX_MINUTES);
    const until = new Date(Date.now() + span * 60_000);
    await this.prisma.expertProfile.update({
      where: { id: expertId },
      data: { hotlineEnabled: true, hotlineOnlineUntil: until },
    });
    return { onlineUntil: until.toISOString() };
  }

  async goOffline(expertId: string) {
    await this.prisma.expertProfile.update({
      where: { id: expertId },
      data: { hotlineOnlineUntil: null },
    });
    return { onlineUntil: null };
  }

  private async activeShifts(): Promise<ShiftRow[]> {
    return this.prisma.hotlineShift.findMany({
      where: {
        isActive: true,
        expert: { hotlineEnabled: true, isActive: true, isPublished: true },
      },
      select: {
        expertId: true,
        weekday: true,
        startMinute: true,
        endMinute: true,
        timezone: true,
      },
    });
  }
}

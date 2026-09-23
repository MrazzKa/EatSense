/// <reference types="jest" />

import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { HotlineService } from '../../hotline/hotline.service';
import { HotlineAvailabilityService } from '../../hotline/hotline-availability.service';
import { coversNow, localMoment, minutesUntil, isValidTimezone } from '../../hotline/hotline-time';

/**
 * Two things here can go wrong silently and expensively: a shift evaluated in
 * the server's timezone instead of the expert's, and two experts taking the same
 * request. The first opens the line at the wrong hour; the second puts two
 * people in one conversation.
 */

describe('hotline time', () => {
  it('reads the weekday and minute in the given zone, not the server one', () => {
    // 2026-09-22 is a Tuesday. 23:30 UTC is already Wednesday in Zurich.
    const at = new Date('2026-09-22T23:30:00Z');
    expect(localMoment(at, 'UTC')).toEqual({ weekday: 2, minute: 23 * 60 + 30 });
    expect(localMoment(at, 'Europe/Zurich')).toEqual({ weekday: 3, minute: 60 + 30 });
  });

  it('handles midnight without wrapping to 24:00', () => {
    const at = new Date('2026-09-22T00:00:00Z');
    expect(localMoment(at, 'UTC').minute).toBe(0);
  });

  it('covers a shift only on its own weekday and inside its window', () => {
    const moment = { weekday: 2, minute: 19 * 60 };
    expect(coversNow(moment, 2, 18 * 60, 21 * 60)).toBe(true);
    expect(coversNow(moment, 3, 18 * 60, 21 * 60)).toBe(false);
    expect(coversNow(moment, 2, 20 * 60, 21 * 60)).toBe(false);
    // End is exclusive: a shift ending at 21:00 is over at 21:00.
    expect(coversNow({ weekday: 2, minute: 21 * 60 }, 2, 18 * 60, 21 * 60)).toBe(false);
  });

  it('measures the wait to the next shift, wrapping over the week', () => {
    const tuesdayEvening = { weekday: 2, minute: 19 * 60 };
    expect(minutesUntil(tuesdayEvening, 2, 20 * 60)).toBe(60);
    expect(minutesUntil(tuesdayEvening, 3, 19 * 60)).toBe(24 * 60);
    // Same weekday but already past: a whole week away.
    expect(minutesUntil(tuesdayEvening, 2, 18 * 60)).toBe(7 * 24 * 60 - 60);
  });

  it('rejects a timezone it cannot resolve', () => {
    expect(isValidTimezone('Europe/Zurich')).toBe(true);
    expect(isValidTimezone('Middle/Earth')).toBe(false);
  });
});

function makePrisma(overrides: any = {}) {
  const calls: any[] = [];
  const base = {
    calls,
    expertProfile: {
      findMany: jest.fn(async () => []),
      findUnique: jest.fn(async () => ({
        id: 'expert_1',
        isActive: true,
        isPublished: true,
        isVerified: true,
      })),
      update: jest.fn(async (args: any) => {
        calls.push(args);
        return {};
      }),
    },
    hotlineShift: {
      findMany: jest.fn(async () => []),
      deleteMany: jest.fn(async () => ({ count: 0 })),
      createMany: jest.fn(async () => ({ count: 0 })),
    },
    hotlineRequest: {
      findFirst: jest.fn(async () => null),
      findMany: jest.fn(async () => []),
      count: jest.fn(async () => 0),
      create: jest.fn(async (args: any) => ({ id: 'req_1', ...args.data })),
      update: jest.fn(async (args: any) => ({ id: args.where.id, ...args.data })),
      updateMany: jest.fn(async () => ({ count: 1 })),
      findUniqueOrThrow: jest.fn(async () => ({ id: 'req_1', clientId: 'user_1' })),
    },
    symptomReport: { findFirst: jest.fn(async () => ({ id: 'rep_1' })) },
    conversation: { upsert: jest.fn(async () => ({ id: 'conv_1' })) },
    $transaction: jest.fn(async (ops: any[]) => Promise.all(ops)),
  };
  return Object.assign(base, overrides);
}

function makeService(prisma: any, onDuty: string[] = ['expert_1']) {
  const availability = new HotlineAvailabilityService(prisma as any);
  jest.spyOn(availability, 'expertIdsOnDuty').mockResolvedValue(onDuty);
  jest
    .spyOn(availability, 'status')
    .mockResolvedValue({ open: onDuty.length > 0, onDutyCount: onDuty.length, nextOpensAt: null });
  // Typed so `mock.calls` carries the arguments; an untyped `jest.fn(async () => …)`
  // infers an empty tuple and the assertions below would not compile.
  const notifications = {
    sendPushNotification: jest.fn(
      async (_userId: string, _title: string, _body: string, _data?: Record<string, any>) => ({}),
    ),
  };
  return {
    service: new HotlineService(prisma as any, availability, notifications as any),
    availability,
    notifications,
  };
}

/** Lets the fire-and-forget pushes settle before asserting on them. */
const settle = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};

describe('HotlineService', () => {
  it('refuses to queue anyone while the line is closed', async () => {
    const prisma = makePrisma();
    const { service } = makeService(prisma, []);
    await expect(service.create('user_1', {} as any)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.hotlineRequest.create).not.toHaveBeenCalled();
  });

  it('hands back the existing request instead of queueing twice', async () => {
    const prisma = makePrisma();
    prisma.hotlineRequest.findFirst = jest.fn(async () => ({ id: 'req_existing' }));
    const { service } = makeService(prisma);

    const result = await service.create('user_1', {} as any);
    expect(result).toEqual({ id: 'req_existing' });
    expect(prisma.hotlineRequest.create).not.toHaveBeenCalled();
  });

  it('refuses a symptom report belonging to somebody else', async () => {
    const prisma = makePrisma();
    prisma.symptomReport.findFirst = jest.fn(async () => null);
    const { service } = makeService(prisma);

    await expect(
      service.create('user_1', { symptomReportId: 'someone_elses' } as any),
    ).rejects.toThrow();
    expect(prisma.hotlineRequest.create).not.toHaveBeenCalled();
  });

  it('gives a new request an expiry rather than letting it sit forever', async () => {
    const prisma = makePrisma();
    const { service } = makeService(prisma);

    await service.create('user_1', { reason: '  под рёбрами  ' } as any);
    const data = prisma.hotlineRequest.create.mock.calls[0][0].data;
    expect(data.reason).toBe('под рёбрами');
    expect(data.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('takes a request with a conditional update, so a race has one winner', async () => {
    const prisma = makePrisma();
    const { service } = makeService(prisma);

    await service.accept('expert_user', 'req_1');
    const where = prisma.hotlineRequest.updateMany.mock.calls[0][0].where;
    // The guard is in the WHERE clause, not in a prior read.
    expect(where).toMatchObject({ id: 'req_1', status: 'WAITING' });
  });

  it('tells the loser of the race plainly', async () => {
    const prisma = makePrisma();
    prisma.hotlineRequest.updateMany = jest.fn(async () => ({ count: 0 }));
    const { service } = makeService(prisma);

    await expect(service.accept('expert_user', 'req_1')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.conversation.upsert).not.toHaveBeenCalled();
  });

  it('reuses the existing conversation with that client', async () => {
    const prisma = makePrisma();
    const { service } = makeService(prisma);

    await service.accept('expert_user', 'req_1');
    const args = prisma.conversation.upsert.mock.calls[0][0];
    expect(args.where).toEqual({ clientId_expertId: { clientId: 'user_1', expertId: 'expert_1' } });
  });

  it('will not let an expert who is off the line take anything', async () => {
    const prisma = makePrisma();
    const { service } = makeService(prisma, []);
    await expect(service.accept('expert_user', 'req_1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('will not let an unverified expert near the queue', async () => {
    const prisma = makePrisma();
    prisma.expertProfile.findUnique = jest.fn(async () => ({
      id: 'expert_1',
      isActive: true,
      isPublished: true,
      isVerified: false,
    }));
    const { service } = makeService(prisma);
    await expect(service.queueFor('expert_user')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('only cancels a request the caller owns', async () => {
    const prisma = makePrisma();
    const { service } = makeService(prisma);

    await service.cancel('user_1', 'req_1');
    expect(prisma.hotlineRequest.updateMany.mock.calls[0][0].where).toMatchObject({
      id: 'req_1',
      clientId: 'user_1',
    });
  });

  it('reports a request that cannot be cancelled as missing, not forbidden', async () => {
    const prisma = makePrisma();
    prisma.hotlineRequest.updateMany = jest.fn(async () => ({ count: 0 }));
    const { service } = makeService(prisma);
    await expect(service.cancel('user_1', 'req_1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('tells on-duty experts that somebody is waiting', async () => {
    const prisma = makePrisma();
    prisma.expertProfile.findMany = jest.fn(async () => [{ userId: 'expert_user_1' }]);
    const { service, notifications } = makeService(prisma);

    await service.create('user_1', { reason: 'жжёт под рёбрами' } as any);
    await settle();

    expect(notifications.sendPushNotification).toHaveBeenCalledTimes(1);
    const [userId, , body] = notifications.sendPushNotification.mock.calls[0];
    expect(userId).toBe('expert_user_1');
    // The complaint must never reach a lock screen.
    expect(body).not.toContain('рёбрами');
  });

  it('does not let a failed push fail the request', async () => {
    const prisma = makePrisma();
    prisma.expertProfile.findMany = jest.fn(async () => [{ userId: 'expert_user_1' }]);
    const { service, notifications } = makeService(prisma);
    notifications.sendPushNotification.mockRejectedValue(new Error('expo down'));

    await expect(service.create('user_1', {} as any)).resolves.toBeTruthy();
    await settle();
  });

  it('notifies the client when an expert picks the request up', async () => {
    const prisma = makePrisma();
    const { service, notifications } = makeService(prisma);

    await service.accept('expert_user', 'req_1');
    await settle();

    const call = notifications.sendPushNotification.mock.calls.find(
      (args) => args[0] === 'user_1',
    );
    expect(call).toBeTruthy();
    expect(call?.[3]).toMatchObject({ type: 'hotline_accepted', conversationId: 'conv_1' });
  });

  it('expires stale requests whenever the queue is read', async () => {
    const prisma = makePrisma();
    const { service } = makeService(prisma);

    await service.statusFor('user_1');
    const expiring = prisma.hotlineRequest.updateMany.mock.calls.find(
      (call: any[]) => call[0].data.status === 'EXPIRED',
    );
    expect(expiring).toBeTruthy();
    expect(expiring[0].where.status).toBe('WAITING');
  });
});

describe('HotlineAvailabilityService', () => {
  it('caps a heartbeat so a stuck tab cannot hold the line open', async () => {
    const prisma = makePrisma();
    const service = new HotlineAvailabilityService(prisma as any);

    await service.heartbeat('expert_1', 600);
    const data = prisma.expertProfile.update.mock.calls[0][0].data;
    const minutes = (data.hotlineOnlineUntil.getTime() - Date.now()) / 60000;
    expect(minutes).toBeLessThanOrEqual(15.1);
    expect(data.hotlineEnabled).toBe(true);
  });

  it('rejects a rota that ends before it starts, or lands outside a day', async () => {
    const service = new HotlineAvailabilityService(makePrisma() as any);
    const bad = [
      { weekday: 2, startMinute: 1200, endMinute: 600, timezone: 'UTC' },
      { weekday: 9, startMinute: 600, endMinute: 700, timezone: 'UTC' },
      { weekday: 2, startMinute: 600, endMinute: 700, timezone: 'Middle/Earth' },
    ];
    for (const shift of bad) {
      await expect(service.replaceShifts('expert_1', [shift])).rejects.toThrow();
    }
  });

  it('counts an expert on duty from a live heartbeat with no rota at all', async () => {
    const prisma = makePrisma();
    prisma.expertProfile.findMany = jest.fn(async () => [{ id: 'expert_online' }]);
    const service = new HotlineAvailabilityService(prisma as any);

    expect(await service.expertIdsOnDuty()).toEqual(['expert_online']);
  });

  it('counts an expert on duty from a shift covering now', async () => {
    const now = new Date('2026-09-22T19:00:00Z');
    const prisma = makePrisma();
    prisma.hotlineShift.findMany = jest.fn(async () => [
      { expertId: 'expert_shift', weekday: 2, startMinute: 18 * 60, endMinute: 21 * 60, timezone: 'UTC' },
    ]);
    const service = new HotlineAvailabilityService(prisma as any);

    expect(await service.expertIdsOnDuty(now)).toEqual(['expert_shift']);
  });

  it('reports the line closed, with the next opening, outside every shift', async () => {
    const now = new Date('2026-09-22T09:00:00Z');
    const prisma = makePrisma();
    prisma.hotlineShift.findMany = jest.fn(async () => [
      { expertId: 'expert_shift', weekday: 2, startMinute: 18 * 60, endMinute: 21 * 60, timezone: 'UTC' },
    ]);
    const service = new HotlineAvailabilityService(prisma as any);

    const status = await service.status(now);
    expect(status.open).toBe(false);
    expect(status.onDutyCount).toBe(0);
    expect(new Date(status.nextOpensAt!).toISOString()).toBe('2026-09-22T18:00:00.000Z');
  });

  it('says nothing about a next opening when nobody has a rota', async () => {
    const service = new HotlineAvailabilityService(makePrisma() as any);
    const status = await service.status(new Date('2026-09-22T09:00:00Z'));
    expect(status).toEqual({ open: false, onDutyCount: 0, nextOpensAt: null });
  });
});

/// <reference types="jest" />

import { BadRequestException } from '@nestjs/common';
import { SymptomsService } from '../../symptoms/symptoms.service';
import { RedFlagPolicy } from '../../symptoms/red-flag.policy';
import { CreateSymptomReportDto } from '../../symptoms/dto';

/**
 * The body map writes user-supplied ids straight into a table that later feeds
 * the food/symptom correlation work. Everything below is about the boundary
 * where that input is either accepted or refused — the one place where a bug
 * would quietly poison the data rather than throw.
 */

/** Minimal Prisma stand-in: records what the service tried to write. */
function makePrisma() {
  const calls: any[] = [];
  return {
    calls,
    symptomReport: {
      create: jest.fn(async (args: any) => {
        calls.push(args);
        return { id: 'report_1', ...args.data, entries: args.data.entries.create };
      }),
    },
  };
}

function makeService() {
  const prisma = makePrisma();
  const service = new SymptomsService(prisma as any, new RedFlagPolicy());
  return { service, prisma };
}

const USER = 'user_1';

function dto(overrides: Partial<CreateSymptomReportDto> = {}): CreateSymptomReportDto {
  return {
    entries: [{ zoneId: 'abdomen_epigastrium', severity: 6, answers: { onset: 'days' } }],
    ...overrides,
  } as CreateSymptomReportDto;
}

describe('SymptomsService.create', () => {
  it('stores a valid report and derives maxSeverity from the entries', async () => {
    const { service, prisma } = makeService();

    await service.create(
      USER,
      dto({
        entries: [
          { zoneId: 'abdomen_epigastrium', severity: 4, answers: {} },
          { zoneId: 'back_lower', severity: 9, answers: {} },
        ],
      }),
    );

    const written = prisma.calls[0].data;
    expect(written.userId).toBe(USER);
    expect(written.maxSeverity).toBe(9);
    expect(written.entries.create).toHaveLength(2);
  });

  it('rejects a zone the catalogue does not know', async () => {
    const { service } = makeService();
    await expect(
      service.create(USER, dto({ entries: [{ zoneId: 'left_wing', severity: 5 }] as any })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an answer that is not an option for that question', async () => {
    const { service } = makeService();
    await expect(
      service.create(
        USER,
        dto({ entries: [{ zoneId: 'head', severity: 5, answers: { onset: 'last_tuesday' } }] as any }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a question that does not belong to the zone group', async () => {
    // stool_change is an abdomen question; asking it about the head is a bug in
    // the app, and silently dropping it would hide that bug.
    const { service } = makeService();
    await expect(
      service.create(
        USER,
        dto({ entries: [{ zoneId: 'head', severity: 5, answers: { stool_change: 'loose' } }] as any }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a group question on a zone that does have it', async () => {
    const { service, prisma } = makeService();
    await service.create(
      USER,
      dto({
        entries: [
          { zoneId: 'abdomen_lower', severity: 3, answers: { stool_change: 'loose', related_food: 'yes' } },
        ],
      }),
    );
    expect(prisma.calls[0].data.entries.create[0].answers).toEqual({
      stool_change: 'loose',
      related_food: 'yes',
    });
  });

  it('drops empty answers instead of failing on them', async () => {
    const { service, prisma } = makeService();
    await service.create(
      USER,
      dto({ entries: [{ zoneId: 'head', severity: 2, answers: { onset: '', frequency: 'daily' } }] as any }),
    );
    expect(prisma.calls[0].data.entries.create[0].answers).toEqual({ frequency: 'daily' });
  });

  it('refuses the same zone twice in one report', async () => {
    const { service } = makeService();
    await expect(
      service.create(
        USER,
        dto({
          entries: [
            { zoneId: 'head', severity: 3, answers: {} },
            { zoneId: 'head', severity: 8, answers: {} },
          ],
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('records recognised emergency items and flags the report', async () => {
    const { service, prisma } = makeService();
    await service.create(USER, dto({ redFlags: ['fainting', 'chest_pain_radiating'] }));

    const written = prisma.calls[0].data;
    expect(written.redFlagged).toBe(true);
    expect(written.redFlags.sort()).toEqual(['chest_pain_radiating', 'fainting']);
  });

  it('ignores emergency ids it does not recognise', async () => {
    const { service, prisma } = makeService();
    await service.create(USER, dto({ redFlags: ['made_up_flag'] }));

    const written = prisma.calls[0].data;
    expect(written.redFlagged).toBe(false);
    expect(written.redFlags).toEqual([]);
  });

  it('refuses a report dated in the future', async () => {
    const { service } = makeService();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await expect(service.create(USER, dto({ reportedAt: tomorrow }))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('refuses a report backdated beyond a year', async () => {
    const { service } = makeService();
    const longAgo = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString();
    await expect(service.create(USER, dto({ reportedAt: longAgo }))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('accepts a report backdated to earlier today', async () => {
    const { service, prisma } = makeService();
    const earlier = new Date(Date.now() - 6 * 60 * 60 * 1000);
    await service.create(USER, dto({ reportedAt: earlier.toISOString() }));
    expect(prisma.calls[0].data.reportedAt.getTime()).toBe(earlier.getTime());
  });

  it('stores the exact point the user tapped', async () => {
    const { service, prisma } = makeService();
    await service.create(
      USER,
      dto({ entries: [{ zoneId: 'chest', severity: 5, x: 103.4, y: 111.2, view: 'front' }] as any }),
    );
    expect(prisma.calls[0].data.entries.create[0]).toMatchObject({
      x: 103.4,
      y: 111.2,
      view: 'front',
    });
  });

  it('treats a half-written point as no point at all', async () => {
    // One axis is not a location. Storing it would put the mark on the wrong
    // part of the body the next time the report is drawn.
    const { service, prisma } = makeService();
    await service.create(
      USER,
      dto({ entries: [{ zoneId: 'chest', severity: 5, x: 103.4, view: 'front' }] as any }),
    );
    const written = prisma.calls[0].data.entries.create[0];
    expect(written.x).toBeNull();
    expect(written.y).toBeNull();
    expect(written.view).toBeNull();
  });

  it('accepts a report with no point, as older apps send', async () => {
    const { service, prisma } = makeService();
    await service.create(USER, dto());
    const written = prisma.calls[0].data.entries.create[0];
    expect(written.x).toBeNull();
    expect(written.y).toBeNull();
    expect(written.zoneId).toBe('abdomen_epigastrium');
  });

  it('normalises a blank note to null rather than storing whitespace', async () => {
    const { service, prisma } = makeService();
    await service.create(USER, dto({ note: '   ' }));
    expect(prisma.calls[0].data.note).toBeNull();
  });
});

describe('RedFlagPolicy', () => {
  const policy = new RedFlagPolicy();

  it('treats nothing ticked as not triggered', () => {
    expect(policy.evaluate([])).toEqual({ triggered: false, flags: [] });
    expect(policy.evaluate(undefined)).toEqual({ triggered: false, flags: [] });
    expect(policy.evaluate(null)).toEqual({ triggered: false, flags: [] });
  });

  it('de-duplicates and keeps only known ids', () => {
    const verdict = policy.evaluate(['fainting', 'fainting', 'nope', 42 as any]);
    expect(verdict.triggered).toBe(true);
    expect(verdict.flags).toEqual(['fainting']);
  });

  it('does not infer an emergency from anything but an explicit tick', () => {
    // Guards the product boundary: severity alone must never trigger it.
    expect(policy.evaluate([]).triggered).toBe(false);
  });
});

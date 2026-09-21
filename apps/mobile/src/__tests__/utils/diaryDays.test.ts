import { buildDiaryDays, dayKeyFor, dayKeyOfMeal } from '../../utils/diaryDays';

/**
 * These cover the ways the diary can lose an entry without anyone noticing: a
 * day that exists only because of a symptom, a timestamp read in the wrong
 * timezone, and a symptom list truncated in the wrong order.
 */

const iso = (y: number, m: number, d: number, hh = 12, mm = 0) =>
  new Date(y, m - 1, d, hh, mm).toISOString();

describe('dayKeyFor', () => {
  it('uses the local calendar day, not the UTC one', () => {
    // Built from local parts, so whatever the runner's timezone is, the key must
    // come back as that same local date.
    expect(dayKeyFor(iso(2026, 9, 20, 1, 30))).toBe('2026-09-20');
    expect(dayKeyFor(iso(2026, 9, 20, 23, 30))).toBe('2026-09-20');
  });

  it('returns null for nothing and for rubbish', () => {
    expect(dayKeyFor(null)).toBeNull();
    expect(dayKeyFor(undefined)).toBeNull();
    expect(dayKeyFor('')).toBeNull();
    expect(dayKeyFor('not a date')).toBeNull();
  });

  it('prefers when a meal was eaten over when it was recorded', () => {
    expect(
      dayKeyOfMeal({ consumedAt: iso(2026, 9, 19), createdAt: iso(2026, 9, 20) }),
    ).toBe('2026-09-19');
    expect(dayKeyOfMeal({ createdAt: iso(2026, 9, 20) })).toBe('2026-09-20');
  });
});

describe('buildDiaryDays', () => {
  it('sums a day and counts its meals', () => {
    const days = buildDiaryDays(
      [
        { consumedAt: iso(2026, 9, 20, 9), totalCalories: 400, totalProtein: 20, totalCarbs: 50, totalFat: 10 },
        { consumedAt: iso(2026, 9, 20, 19), calories: 600, protein: 30, carbs: 60, fat: 20 },
      ],
      [],
    );
    expect(days).toHaveLength(1);
    expect(days[0]).toMatchObject({ key: '2026-09-20', count: 2, calories: 1000, protein: 50, carbs: 110, fat: 30 });
  });

  it('creates a day that exists only because of a symptom report', () => {
    const days = buildDiaryDays([], [
      { reportedAt: iso(2026, 9, 18, 14), entries: [{ zoneId: 'abdomen_epigastrium', severity: 6 }] },
    ]);
    expect(days).toHaveLength(1);
    expect(days[0].key).toBe('2026-09-18');
    expect(days[0].count).toBe(0);
    expect(days[0].symptoms).toEqual([{ zoneId: 'abdomen_epigastrium', severity: 6 }]);
  });

  it('merges meals and symptoms logged on the same day', () => {
    const days = buildDiaryDays(
      [{ consumedAt: iso(2026, 9, 20, 9), totalCalories: 400 }],
      [{ reportedAt: iso(2026, 9, 20, 21), entries: [{ zoneId: 'back_lower', severity: 4 }] }],
    );
    expect(days).toHaveLength(1);
    expect(days[0].count).toBe(1);
    expect(days[0].symptoms).toHaveLength(1);
  });

  it('orders days newest first', () => {
    const days = buildDiaryDays(
      [
        { consumedAt: iso(2026, 9, 18) },
        { consumedAt: iso(2026, 9, 20) },
        { consumedAt: iso(2026, 9, 19) },
      ],
      [],
    );
    expect(days.map((d) => d.key)).toEqual(['2026-09-20', '2026-09-19', '2026-09-18']);
  });

  it('orders a day’s symptoms worst first, because the list gets truncated', () => {
    const days = buildDiaryDays([], [
      {
        reportedAt: iso(2026, 9, 20),
        entries: [
          { zoneId: 'head', severity: 3 },
          { zoneId: 'chest', severity: 9 },
          { zoneId: 'back_lower', severity: 6 },
        ],
      },
    ]);
    expect(days[0].symptoms.map((s) => s.zoneId)).toEqual(['chest', 'back_lower', 'head']);
  });

  it('collects several reports from the same day onto that day', () => {
    const days = buildDiaryDays([], [
      { reportedAt: iso(2026, 9, 20, 9), entries: [{ zoneId: 'head', severity: 2 }] },
      { reportedAt: iso(2026, 9, 20, 22), entries: [{ zoneId: 'head', severity: 7 }] },
    ]);
    expect(days).toHaveLength(1);
    expect(days[0].symptoms).toEqual([
      { zoneId: 'head', severity: 7 },
      { zoneId: 'head', severity: 2 },
    ]);
  });

  it('survives missing, empty and malformed input', () => {
    expect(buildDiaryDays(null, null)).toEqual([]);
    expect(buildDiaryDays(undefined, undefined)).toEqual([]);
    expect(buildDiaryDays([{ consumedAt: null, createdAt: null }], [])).toEqual([]);
    expect(buildDiaryDays([], [{ reportedAt: 'nonsense', entries: [] }])).toEqual([]);
  });

  it('skips entries with no zone and defaults a missing severity to 1', () => {
    const days = buildDiaryDays([], [
      {
        reportedAt: iso(2026, 9, 20),
        entries: [{ zoneId: null, severity: 5 }, { zoneId: 'neck' }],
      },
    ]);
    expect(days[0].symptoms).toEqual([{ zoneId: 'neck', severity: 1 }]);
  });

  it('treats non-numeric nutrients as zero rather than NaN', () => {
    const days = buildDiaryDays(
      [{ consumedAt: iso(2026, 9, 20), totalCalories: 'oops' as any, totalProtein: null }],
      [],
    );
    expect(days[0].calories).toBe(0);
    expect(days[0].protein).toBe(0);
  });
});

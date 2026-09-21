/**
 * Folds the diary's two sources — logged meals and body-map symptom reports —
 * into one list of days.
 *
 * Extracted from the screen because this is where the diary can silently lose an
 * entry: a timezone slip puts a meal on the wrong day, and a symptoms-only day
 * disappears entirely if only meals are allowed to create days. Neither failure
 * throws, and neither is visible in a screenshot, so it is tested instead.
 */

export interface DiaryMealLike {
  consumedAt?: string | null;
  createdAt?: string | null;
  totalCalories?: number | null;
  calories?: number | null;
  totalProtein?: number | null;
  protein?: number | null;
  totalCarbs?: number | null;
  carbs?: number | null;
  totalFat?: number | null;
  fat?: number | null;
}

export interface DiarySymptomReportLike {
  reportedAt?: string | null;
  entries?: { zoneId?: string | null; severity?: number | null }[] | null;
}

export interface DiaryDaySymptom {
  zoneId: string;
  severity: number;
}

export interface DiaryDay {
  /** Local calendar day, YYYY-MM-DD. Also the list key. */
  key: string;
  date: Date;
  /** Number of meals logged that day. Zero is legal: a symptoms-only day. */
  count: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Marked body zones that day, worst first. */
  symptoms: DiaryDaySymptom[];
}

const toNum = (v: unknown): number => (Number.isFinite(Number(v)) ? Number(v) : 0);

/**
 * Local YYYY-MM-DD for a timestamp — local, not UTC.
 *
 * A meal at 01:00 belongs to the night the person lived through, not to the
 * previous UTC day, and a symptom logged at 23:30 must not jump to tomorrow.
 */
export function dayKeyFor(raw?: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const dayKeyOfMeal = (meal?: DiaryMealLike | null): string | null =>
  dayKeyFor(meal?.consumedAt || meal?.createdAt);

/**
 * Both sources create days.
 *
 * A day where someone logged a stomach ache and ate nothing they bothered to
 * photograph is still a day in the diary — dropping it would hide exactly the
 * entries people come back looking for.
 */
export function buildDiaryDays(
  meals?: DiaryMealLike[] | null,
  reports?: DiarySymptomReportLike[] | null,
): DiaryDay[] {
  const map = new Map<string, DiaryDay>();

  const bucket = (key: string, date: Date): DiaryDay => {
    let day = map.get(key);
    if (!day) {
      day = { key, date, count: 0, calories: 0, protein: 0, carbs: 0, fat: 0, symptoms: [] };
      map.set(key, day);
    }
    return day;
  };

  for (const meal of meals || []) {
    const key = dayKeyOfMeal(meal);
    if (!key) continue;
    const day = bucket(key, new Date((meal.consumedAt || meal.createdAt) as string));
    day.count += 1;
    day.calories += toNum(meal.totalCalories ?? meal.calories);
    day.protein += toNum(meal.totalProtein ?? meal.protein);
    day.carbs += toNum(meal.totalCarbs ?? meal.carbs);
    day.fat += toNum(meal.totalFat ?? meal.fat);
  }

  for (const report of reports || []) {
    const key = dayKeyFor(report?.reportedAt);
    if (!key) continue;
    const day = bucket(key, new Date(report.reportedAt as string));
    for (const entry of report.entries || []) {
      if (!entry?.zoneId) continue;
      day.symptoms.push({ zoneId: entry.zoneId, severity: toNum(entry.severity) || 1 });
    }
  }

  // Worst first: on a one-line summary, the zone that hurt most is the one worth
  // showing before the list is truncated.
  for (const day of map.values()) day.symptoms.sort((a, b) => b.severity - a.severity);

  return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
}

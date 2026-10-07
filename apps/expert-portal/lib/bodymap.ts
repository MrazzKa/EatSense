import labels from './bodymap-labels.json';
import type { Locale } from './i18n/messages';

/**
 * Read-only view of the app's body-map catalogue: just enough to turn the ids
 * stored on a symptom report into words a specialist can read.
 *
 * The labels are copied from the app's translations and checked against its
 * catalogue by `node scripts/check-bodymap-sync.js`.
 */

type SeverityBand = 'mild' | 'moderate' | 'severe' | 'extreme';

interface BodyMapLabels {
  zones: Record<string, string>;
  questions: Record<string, { label: string; options: Record<string, string> }>;
  severityBands: Record<SeverityBand, string>;
}

const LABELS = labels as Record<Locale, BodyMapLabels>;

/** Same ramp as the app (`features/bodymap/severity.ts`), so a 7 looks like a 7 on both sides. */
export const SEVERITY_COLORS: Record<SeverityBand, string> = {
  mild: '#4ADE80',
  moderate: '#FACC15',
  severe: '#FB923C',
  extreme: '#EF4444',
};

export function severityBand(severity: number): SeverityBand {
  if (severity <= 3) return 'mild';
  if (severity <= 5) return 'moderate';
  if (severity <= 8) return 'severe';
  return 'extreme';
}

function labelsFor(locale: Locale): BodyMapLabels {
  return LABELS[locale] ?? LABELS.en;
}

export function zoneLabel(locale: Locale, zoneId: string): string {
  return labelsFor(locale).zones[zoneId] ?? LABELS.en.zones[zoneId] ?? zoneId;
}

export function severityLabel(locale: Locale, severity: number): string {
  return labelsFor(locale).severityBands[severityBand(severity)];
}

export function answerLabels(
  locale: Locale,
  questionId: string,
  answerId: string,
): { question: string; answer: string } {
  const question = labelsFor(locale).questions[questionId] ?? LABELS.en.questions[questionId];
  return {
    question: question?.label ?? questionId,
    answer: question?.options[answerId] ?? answerId,
  };
}

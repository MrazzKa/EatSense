/**
 * The body-map catalogue: which zones exist, which questions each zone asks and
 * which answers are accepted.
 *
 * This file is the CONTRACT between the app and the server. The app owns how a
 * zone is drawn and how it reads in six languages; the server owns nothing but
 * validation — it never translates and never interprets. Both sides use the same
 * ids, so a report written by an app in Kazakh is readable by an app in French
 * and by us in the admin panel.
 *
 * Adding a zone or a question is a data change here plus translation keys in the
 * app. Nothing in the service, controller or database has to move — that is the
 * point of keeping it as data rather than as branches in code.
 */

/** Which silhouette a zone belongs to. */
export type BodyView = 'front' | 'back';

/**
 * Zones are grouped so that questionnaires can be shared. The group decides what
 * is asked on top of the common questions.
 */
export type ZoneGroup = 'head' | 'chest' | 'abdomen' | 'back' | 'limb';

export interface ZoneDefinition {
  readonly id: string;
  readonly view: BodyView;
  readonly group: ZoneGroup;
}

export interface QuestionDefinition {
  readonly id: string;
  /** Answer ids the server will accept. Anything else is rejected. */
  readonly options: readonly string[];
}

/** 22 zones: 14 on the front silhouette, 8 on the back. */
export const ZONES: readonly ZoneDefinition[] = Object.freeze([
  // ---- front ----
  { id: 'head', view: 'front', group: 'head' },
  { id: 'neck', view: 'front', group: 'head' },
  { id: 'chest', view: 'front', group: 'chest' },
  { id: 'shoulder_right', view: 'front', group: 'limb' },
  { id: 'shoulder_left', view: 'front', group: 'limb' },
  { id: 'arm_right', view: 'front', group: 'limb' },
  { id: 'arm_left', view: 'front', group: 'limb' },
  { id: 'abdomen_hypochondrium_right', view: 'front', group: 'abdomen' },
  { id: 'abdomen_epigastrium', view: 'front', group: 'abdomen' },
  { id: 'abdomen_hypochondrium_left', view: 'front', group: 'abdomen' },
  { id: 'abdomen_lower', view: 'front', group: 'abdomen' },
  { id: 'pelvis', view: 'front', group: 'abdomen' },
  { id: 'leg_right', view: 'front', group: 'limb' },
  { id: 'leg_left', view: 'front', group: 'limb' },
  // ---- back ----
  { id: 'neck_back', view: 'back', group: 'head' },
  { id: 'back_upper', view: 'back', group: 'back' },
  { id: 'flank_right', view: 'back', group: 'back' },
  { id: 'flank_left', view: 'back', group: 'back' },
  { id: 'back_lower', view: 'back', group: 'back' },
  { id: 'glutes', view: 'back', group: 'limb' },
  { id: 'leg_back_right', view: 'back', group: 'limb' },
  { id: 'leg_back_left', view: 'back', group: 'limb' },
]);

/** Asked for every zone, in this order. */
export const COMMON_QUESTIONS: readonly QuestionDefinition[] = Object.freeze([
  { id: 'onset', options: ['today', 'days', 'weeks', 'months', 'recurring'] },
  { id: 'frequency', options: ['constant', 'daily', 'weekly', 'rare'] },
  {
    id: 'character',
    options: ['aching', 'sharp', 'burning', 'pressing', 'cramping', 'throbbing'],
  },
  {
    id: 'worse',
    options: ['after_eating', 'empty_stomach', 'movement', 'rest', 'night', 'stress', 'unknown'],
  },
  { id: 'relief', options: ['food', 'medication', 'rest', 'warmth', 'nothing'] },
]);

/**
 * Asked in addition to the common set, by group.
 *
 * The abdomen questions are the ones that actually earn their place in a
 * nutrition app: "is it tied to a particular food" and "has your stool changed"
 * are the two answers that make a symptom entry worth putting next to the food
 * diary.
 */
export const GROUP_QUESTIONS: Readonly<Record<ZoneGroup, readonly QuestionDefinition[]>> =
  Object.freeze({
    head: [{ id: 'head_trigger', options: ['sleep', 'hunger', 'screen', 'stress', 'weather', 'unknown'] }],
    chest: [],
    abdomen: [
      { id: 'related_food', options: ['yes', 'no', 'unsure'] },
      { id: 'stool_change', options: ['none', 'loose', 'constipation', 'alternating'] },
    ],
    back: [{ id: 'injury', options: ['yes', 'no'] }],
    limb: [{ id: 'injury', options: ['yes', 'no'] }],
  });

/**
 * The emergency checklist, shown once at the end of a report.
 *
 * Ticking any of these is not a diagnosis and is not scored — it switches the
 * app to a screen that says "this is not something an app should handle, call
 * emergency services". That is a refusal to answer, which is the one safe thing
 * software in this position can do.
 */
export const RED_FLAGS: readonly string[] = Object.freeze([
  'chest_pain_radiating',
  'sudden_breathlessness',
  'fainting',
  'blood_in_stool_vomit_urine',
  'worst_headache',
  'one_sided_weakness',
  'high_fever_abdominal_pain',
  'persistent_vomiting',
]);

/** Severity slider bounds, shared by the DTO and the app. */
export const SEVERITY_MIN = 1;
export const SEVERITY_MAX = 10;

/** How many marks one report may carry — more than this stops being a report. */
export const MAX_ZONES_PER_REPORT = 3;

/**
 * The silhouette's coordinate space.
 *
 * A mark carries the exact point the user tapped. The server does not draw
 * anything, but it does have to reject coordinates that cannot have come from
 * the silhouette — a point outside this box is a bug or a forged request, and
 * either way it must not enter the timeline.
 */
export const BODY_VIEWBOX = { width: 200, height: 440 };

/** Which silhouette a mark was placed on. */
export const BODY_VIEWS = ['front', 'back'] as const;

/** Free-text note cap. Long enough for context, short enough not to be a journal. */
export const MAX_NOTE_LENGTH = 1000;

// ---------------------------------------------------------------------------
// Lookups. Built once at module load — the catalogue is static.
// ---------------------------------------------------------------------------

const ZONES_BY_ID: ReadonlyMap<string, ZoneDefinition> = new Map(ZONES.map((z) => [z.id, z]));

const QUESTIONS_BY_GROUP: ReadonlyMap<ZoneGroup, ReadonlyMap<string, ReadonlySet<string>>> = new Map(
  (Object.keys(GROUP_QUESTIONS) as ZoneGroup[]).map((group) => [
    group,
    new Map(
      [...COMMON_QUESTIONS, ...GROUP_QUESTIONS[group]].map((q) => [q.id, new Set(q.options)]),
    ),
  ]),
);

const RED_FLAG_SET: ReadonlySet<string> = new Set(RED_FLAGS);

export function findZone(zoneId: string): ZoneDefinition | undefined {
  return ZONES_BY_ID.get(zoneId);
}

export function isKnownZone(zoneId: string): boolean {
  return ZONES_BY_ID.has(zoneId);
}

export function isKnownRedFlag(flagId: string): boolean {
  return RED_FLAG_SET.has(flagId);
}

export function isKnownView(view: string): boolean {
  return (BODY_VIEWS as readonly string[]).includes(view);
}

/** Question ids a zone may legitimately carry, in display order. */
export function questionIdsForZone(zoneId: string): string[] {
  const zone = ZONES_BY_ID.get(zoneId);
  if (!zone) return [];
  return [...COMMON_QUESTIONS, ...GROUP_QUESTIONS[zone.group]].map((q) => q.id);
}

/**
 * Whether `answerId` is an accepted answer to `questionId` for this zone.
 *
 * Unknown question ids are rejected rather than ignored: silently dropping an
 * answer would mean an app one version ahead of the server loses data without
 * anyone noticing.
 */
export function isValidAnswer(zoneId: string, questionId: string, answerId: unknown): boolean {
  const zone = ZONES_BY_ID.get(zoneId);
  if (!zone) return false;
  const options = QUESTIONS_BY_GROUP.get(zone.group)?.get(questionId);
  return typeof answerId === 'string' && !!options?.has(answerId);
}

/** The whole catalogue, in the shape the app fetches it. */
export function describeCatalog() {
  return {
    version: 1,
    severity: { min: SEVERITY_MIN, max: SEVERITY_MAX },
    maxZonesPerReport: MAX_ZONES_PER_REPORT,
    viewBox: BODY_VIEWBOX,
    views: BODY_VIEWS,
    zones: ZONES,
    commonQuestions: COMMON_QUESTIONS,
    groupQuestions: GROUP_QUESTIONS,
    redFlags: RED_FLAGS,
  };
}

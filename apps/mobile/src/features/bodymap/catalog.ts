/**
 * Body-map catalogue: the zones on the silhouette, their geometry, and the
 * questionnaire each zone asks.
 *
 * This mirrors `apps/api/symptoms/symptom-catalog.ts` — same ids, same answer
 * options. The server validates against its copy and rejects anything it does
 * not recognise, so the two must be changed together. The app keeps its own copy
 * rather than fetching one so the screen opens instantly and offline; the server
 * exposes `GET /symptoms/catalog` purely so a mismatch can be diagnosed without
 * shipping a build.
 *
 * Geometry lives here too, next to the ids it belongs to, so adding a zone is one
 * edit in one file plus its translation keys.
 *
 * LEFT AND RIGHT ARE THE PERSON'S, NOT THE VIEWER'S. On the front silhouette the
 * person's right side is drawn on the left of the image; on the back silhouette
 * it is drawn on the right. Getting this backwards would put every symptom on the
 * wrong side of the body, so the coordinates below are the authority and the
 * suffix in the id follows anatomy.
 */

export type BodyView = 'front' | 'back';
export type ZoneGroup = 'head' | 'chest' | 'abdomen' | 'back' | 'limb';

export type ZoneShape =
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; rx: number };

export interface BodyZone {
  id: string;
  view: BodyView;
  group: ZoneGroup;
  shape: ZoneShape;
}

export interface Question {
  id: string;
  options: string[];
}

/** The silhouette is authored in this coordinate space and scaled to fit. */
export const BODY_VIEWBOX = { width: 200, height: 440 };

export const SEVERITY_MIN = 1;
export const SEVERITY_MAX = 10;
export const MAX_ZONES_PER_REPORT = 3;
export const MAX_NOTE_LENGTH = 1000;

export const BODY_ZONES: BodyZone[] = [
  // ---------------- front ----------------
  // The body is laid out top to bottom with a 2-unit gap between neighbours; the
  // gaps are what let a thumb tell two zones apart without a border.
  { id: 'head', view: 'front', group: 'head', shape: { kind: 'ellipse', cx: 100, cy: 38, rx: 25, ry: 30 } },
  { id: 'neck', view: 'front', group: 'head', shape: { kind: 'rect', x: 87, y: 64, w: 26, h: 22, rx: 6 } },
  // Shoulders are caps above the arms rather than ellipses beside the torso. As
  // ellipses they overlapped the chest and stuck out past the arm, which read as
  // epaulettes and stole the chest's hit area along the overlap.
  // Person's right shoulder/arm → drawn on the left of a front view.
  { id: 'shoulder_right', view: 'front', group: 'limb', shape: { kind: 'rect', x: 32, y: 92, w: 28, h: 24, rx: 9 } },
  { id: 'shoulder_left', view: 'front', group: 'limb', shape: { kind: 'rect', x: 140, y: 92, w: 28, h: 24, rx: 9 } },
  { id: 'chest', view: 'front', group: 'chest', shape: { kind: 'rect', x: 62, y: 88, w: 76, h: 46, rx: 14 } },
  { id: 'arm_right', view: 'front', group: 'limb', shape: { kind: 'rect', x: 36, y: 118, w: 22, h: 106, rx: 11 } },
  { id: 'arm_left', view: 'front', group: 'limb', shape: { kind: 'rect', x: 142, y: 118, w: 22, h: 106, rx: 11 } },
  { id: 'abdomen_hypochondrium_right', view: 'front', group: 'abdomen', shape: { kind: 'rect', x: 62, y: 136, w: 24, h: 32, rx: 6 } },
  { id: 'abdomen_epigastrium', view: 'front', group: 'abdomen', shape: { kind: 'rect', x: 88, y: 136, w: 24, h: 32, rx: 6 } },
  { id: 'abdomen_hypochondrium_left', view: 'front', group: 'abdomen', shape: { kind: 'rect', x: 114, y: 136, w: 24, h: 32, rx: 6 } },
  { id: 'abdomen_lower', view: 'front', group: 'abdomen', shape: { kind: 'rect', x: 64, y: 170, w: 72, h: 34, rx: 8 } },
  { id: 'pelvis', view: 'front', group: 'abdomen', shape: { kind: 'rect', x: 68, y: 206, w: 64, h: 30, rx: 12 } },
  { id: 'leg_right', view: 'front', group: 'limb', shape: { kind: 'rect', x: 66, y: 238, w: 30, h: 182, rx: 15 } },
  { id: 'leg_left', view: 'front', group: 'limb', shape: { kind: 'rect', x: 104, y: 238, w: 30, h: 182, rx: 15 } },

  // ---------------- back ----------------
  // Mirrors the front layout so flipping the view does not make the body jump.
  { id: 'neck_back', view: 'back', group: 'head', shape: { kind: 'rect', x: 87, y: 64, w: 26, h: 22, rx: 6 } },
  { id: 'back_upper', view: 'back', group: 'back', shape: { kind: 'rect', x: 62, y: 88, w: 76, h: 62, rx: 14 } },
  // Back view: the person's left side is now on the left of the image.
  { id: 'flank_left', view: 'back', group: 'back', shape: { kind: 'rect', x: 62, y: 152, w: 28, h: 40, rx: 7 } },
  { id: 'flank_right', view: 'back', group: 'back', shape: { kind: 'rect', x: 110, y: 152, w: 28, h: 40, rx: 7 } },
  { id: 'back_lower', view: 'back', group: 'back', shape: { kind: 'rect', x: 64, y: 194, w: 72, h: 38, rx: 8 } },
  { id: 'glutes', view: 'back', group: 'limb', shape: { kind: 'rect', x: 66, y: 234, w: 68, h: 34, rx: 16 } },
  { id: 'leg_back_left', view: 'back', group: 'limb', shape: { kind: 'rect', x: 66, y: 270, w: 30, h: 150, rx: 15 } },
  { id: 'leg_back_right', view: 'back', group: 'limb', shape: { kind: 'rect', x: 104, y: 270, w: 30, h: 150, rx: 15 } },
];

/**
 * Drawn but not tappable — they exist so the silhouette reads as a body rather
 * than as a pile of rectangles. The spine strip between the flanks is here
 * deliberately: "my spine hurts" belongs to back_upper or back_lower, and giving
 * it its own target would only split the same complaint across three zones.
 */
export const INERT_SHAPES: Record<BodyView, ZoneShape[]> = {
  front: [],
  back: [
    { kind: 'ellipse', cx: 100, cy: 38, rx: 25, ry: 30 },
    { kind: 'rect', x: 32, y: 92, w: 28, h: 24, rx: 9 },
    { kind: 'rect', x: 140, y: 92, w: 28, h: 24, rx: 9 },
    { kind: 'rect', x: 36, y: 118, w: 22, h: 106, rx: 11 },
    { kind: 'rect', x: 142, y: 118, w: 22, h: 106, rx: 11 },
    { kind: 'rect', x: 92, y: 152, w: 16, h: 40, rx: 5 },
  ],
};

export const COMMON_QUESTIONS: Question[] = [
  { id: 'onset', options: ['today', 'days', 'weeks', 'months', 'recurring'] },
  { id: 'frequency', options: ['constant', 'daily', 'weekly', 'rare'] },
  { id: 'character', options: ['aching', 'sharp', 'burning', 'pressing', 'cramping', 'throbbing'] },
  { id: 'worse', options: ['after_eating', 'empty_stomach', 'movement', 'rest', 'night', 'stress', 'unknown'] },
  { id: 'relief', options: ['food', 'medication', 'rest', 'warmth', 'nothing'] },
];

export const GROUP_QUESTIONS: Record<ZoneGroup, Question[]> = {
  head: [{ id: 'head_trigger', options: ['sleep', 'hunger', 'screen', 'stress', 'weather', 'unknown'] }],
  chest: [],
  abdomen: [
    { id: 'related_food', options: ['yes', 'no', 'unsure'] },
    { id: 'stool_change', options: ['none', 'loose', 'constipation', 'alternating'] },
  ],
  back: [{ id: 'injury', options: ['yes', 'no'] }],
  limb: [{ id: 'injury', options: ['yes', 'no'] }],
};

/**
 * The emergency checklist.
 *
 * Ticking any of these does not produce advice — it replaces the rest of the flow
 * with "call emergency services". The report is still saved, because it is the
 * user's record, but the app stops pretending it can help.
 */
export const RED_FLAGS: string[] = [
  'chest_pain_radiating',
  'sudden_breathlessness',
  'fainting',
  'blood_in_stool_vomit_urine',
  'worst_headache',
  'one_sided_weakness',
  'high_fever_abdominal_pain',
  'persistent_vomiting',
];

const ZONES_BY_ID = new Map(BODY_ZONES.map((z) => [z.id, z]));

export function getZone(zoneId: string): BodyZone | undefined {
  return ZONES_BY_ID.get(zoneId);
}

export function zonesForView(view: BodyView): BodyZone[] {
  return BODY_ZONES.filter((z) => z.view === view);
}

/** Questions a zone asks, common set first. */
export function questionsForZone(zoneId: string): Question[] {
  const zone = ZONES_BY_ID.get(zoneId);
  if (!zone) return [];
  return [...COMMON_QUESTIONS, ...GROUP_QUESTIONS[zone.group]];
}

/** i18n key for a zone's display name. */
export function zoneNameKey(zoneId: string): string {
  return `bodyMap.zones.${zoneId}`;
}

/** Coarse severity band, used for colour and for the word next to the number. */
export function severityBand(severity: number): 'mild' | 'moderate' | 'severe' | 'extreme' {
  if (severity <= 3) return 'mild';
  if (severity <= 5) return 'moderate';
  if (severity <= 8) return 'severe';
  return 'extreme';
}

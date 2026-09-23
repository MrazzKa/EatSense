/**
 * Body-map catalogue: the zones, the questionnaire each one asks, and the
 * geometry of the silhouette people tap on.
 *
 * Zone ids and answer options mirror `apps/api/symptoms/symptom-catalog.ts`.
 * The server validates against its copy and rejects anything it does not
 * recognise, so the two must change together (`node scripts/check-bodymap-sync.js`).
 * The app keeps its own copy so the screen opens instantly and offline; the
 * server exposes `GET /symptoms/catalog` purely so a mismatch can be diagnosed
 * without shipping a build.
 *
 * HOW THE SILHOUETTE WORKS
 *
 * The body is one smooth outline, not a stack of shapes: a hand-placed list of
 * points for the left half, mirrored, then smoothed through Catmull-Rom into
 * cubic béziers. That same list is the hit-test polygon, so what is drawn and
 * what is tappable cannot drift apart.
 *
 * A tap produces a point, not a region. The exact coordinate is what the person
 * meant — "it hurts *here*" — and the zone is derived by looking up which hit
 * region contains it. That keeps both the precise mark the user made and the
 * structured zone the questionnaire and the future food/symptom correlations
 * need, without asking the user to think about either.
 *
 * LEFT AND RIGHT ARE THE PERSON'S, NOT THE VIEWER'S. On the front silhouette the
 * person's right side is drawn on the left of the image; on the back silhouette
 * it is drawn on the right. Getting this backwards would file every symptom on
 * the wrong side of the body, so the coordinates below are the authority and the
 * suffix in each id follows anatomy.
 */

export type BodyView = 'front' | 'back';
export type ZoneGroup = 'head' | 'chest' | 'abdomen' | 'back' | 'limb';
export type Gender = 'male' | 'female';

export interface BodyZone {
  id: string;
  /** The silhouette this zone belongs to conceptually. Arms, shoulders and the
   *  head are reachable from both views — see HIT_REGIONS. */
  view: BodyView;
  group: ZoneGroup;
}

export interface Question {
  id: string;
  options: string[];
}

/** A tappable rectangle in viewBox space, resolved to a zone. */
export interface HitRegion {
  zoneId: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export type Point = readonly [number, number];

/** The silhouette is authored in this coordinate space and scaled to fit. */
export const BODY_VIEWBOX = { width: 200, height: 440 };

export const SEVERITY_MIN = 1;
export const SEVERITY_MAX = 10;
/** How many marks one report may carry — more stops being a report. */
export const MAX_POINTS_PER_REPORT = 3;
export const MAX_NOTE_LENGTH = 1000;

// ---------------------------------------------------------------------------
// Zones
// ---------------------------------------------------------------------------

export const BODY_ZONES: BodyZone[] = [
  { id: 'head', view: 'front', group: 'head' },
  { id: 'neck', view: 'front', group: 'head' },
  { id: 'shoulder_right', view: 'front', group: 'limb' },
  { id: 'shoulder_left', view: 'front', group: 'limb' },
  { id: 'chest', view: 'front', group: 'chest' },
  { id: 'arm_right', view: 'front', group: 'limb' },
  { id: 'arm_left', view: 'front', group: 'limb' },
  { id: 'abdomen_hypochondrium_right', view: 'front', group: 'abdomen' },
  { id: 'abdomen_epigastrium', view: 'front', group: 'abdomen' },
  { id: 'abdomen_hypochondrium_left', view: 'front', group: 'abdomen' },
  { id: 'abdomen_lower', view: 'front', group: 'abdomen' },
  { id: 'pelvis', view: 'front', group: 'abdomen' },
  { id: 'leg_right', view: 'front', group: 'limb' },
  { id: 'leg_left', view: 'front', group: 'limb' },

  { id: 'neck_back', view: 'back', group: 'head' },
  { id: 'back_upper', view: 'back', group: 'back' },
  { id: 'flank_left', view: 'back', group: 'back' },
  { id: 'flank_right', view: 'back', group: 'back' },
  { id: 'back_lower', view: 'back', group: 'back' },
  { id: 'glutes', view: 'back', group: 'limb' },
  { id: 'leg_back_left', view: 'back', group: 'limb' },
  { id: 'leg_back_right', view: 'back', group: 'limb' },
];

/**
 * Where a tap lands, per view. Order matters — the first region containing the
 * point wins, so limbs come before the torso; otherwise a tap on the upper arm
 * would be filed under the chest.
 *
 * The rectangles are deliberately generous and do not hug the body, because a
 * tap is only considered at all once it is already inside the silhouette.
 */
export const HIT_REGIONS: Record<BodyView, HitRegion[]> = {
  front: [
    { zoneId: 'head', x0: 0, y0: 0, x1: 200, y1: 62 },
    { zoneId: 'neck', x0: 0, y0: 62, x1: 200, y1: 84 },
    { zoneId: 'shoulder_right', x0: 0, y0: 84, x1: 64, y1: 112 },
    { zoneId: 'shoulder_left', x0: 136, y0: 84, x1: 200, y1: 112 },
    { zoneId: 'arm_right', x0: 0, y0: 112, x1: 62, y1: 270 },
    { zoneId: 'arm_left', x0: 138, y0: 112, x1: 200, y1: 270 },
    { zoneId: 'chest', x0: 0, y0: 84, x1: 200, y1: 140 },
    { zoneId: 'abdomen_hypochondrium_right', x0: 0, y0: 140, x1: 87, y1: 176 },
    { zoneId: 'abdomen_epigastrium', x0: 87, y0: 140, x1: 113, y1: 176 },
    { zoneId: 'abdomen_hypochondrium_left', x0: 113, y0: 140, x1: 200, y1: 176 },
    { zoneId: 'abdomen_lower', x0: 0, y0: 176, x1: 200, y1: 206 },
    { zoneId: 'pelvis', x0: 0, y0: 206, x1: 200, y1: 238 },
    { zoneId: 'leg_right', x0: 0, y0: 238, x1: 100, y1: 440 },
    { zoneId: 'leg_left', x0: 100, y0: 238, x1: 200, y1: 440 },
  ],
  back: [
    // The head, shoulders and arms are the same body parts seen from behind, so
    // they resolve to the same zones instead of being dead area that swallows
    // taps silently.
    { zoneId: 'head', x0: 0, y0: 0, x1: 200, y1: 62 },
    { zoneId: 'neck_back', x0: 0, y0: 62, x1: 200, y1: 84 },
    { zoneId: 'shoulder_left', x0: 0, y0: 84, x1: 64, y1: 112 },
    { zoneId: 'shoulder_right', x0: 136, y0: 84, x1: 200, y1: 112 },
    { zoneId: 'arm_left', x0: 0, y0: 112, x1: 62, y1: 270 },
    { zoneId: 'arm_right', x0: 138, y0: 112, x1: 200, y1: 270 },
    { zoneId: 'back_upper', x0: 0, y0: 84, x1: 200, y1: 150 },
    { zoneId: 'flank_left', x0: 0, y0: 150, x1: 90, y1: 192 },
    { zoneId: 'flank_right', x0: 110, y0: 150, x1: 200, y1: 192 },
    // The spine strip between the flanks belongs to the back, not to a side.
    { zoneId: 'back_upper', x0: 90, y0: 150, x1: 110, y1: 192 },
    { zoneId: 'back_lower', x0: 0, y0: 192, x1: 200, y1: 232 },
    { zoneId: 'glutes', x0: 0, y0: 232, x1: 200, y1: 268 },
    { zoneId: 'leg_back_left', x0: 0, y0: 268, x1: 100, y1: 440 },
    { zoneId: 'leg_back_right', x0: 100, y0: 268, x1: 200, y1: 440 },
  ],
};

// ---------------------------------------------------------------------------
// Silhouette geometry
// ---------------------------------------------------------------------------

/**
 * Left half of the silhouette: crown, down the side of the head, into the neck,
 * over the shoulder, around the arm, back up to the armpit, then down the torso
 * and leg to the crotch. Mirroring produces the right half, so the figure is
 * symmetric by construction and there is only one side to edit.
 *
 * The head is part of this list rather than a separate ellipse. Drawn on top it
 * left a stroked arc across the throat, and the two shapes had to be kept in
 * agreement for hit-testing.
 */
const HALF_OUTLINE: Record<Gender, Point[]> = {
  male: [
    [100, 5], [88, 7], [80, 15], [76, 27], [76, 39], [81, 49], [86, 56],
    [88, 63], [86, 72], [81, 78],
    [70, 81], [56, 87], [48, 97],
    [44, 113], [42, 138], [41, 164],
    [40, 190], [40, 212], [42, 234],
    [44, 248], [49, 255], [54, 249],
    [55, 239], [54, 225], [54, 207],
    [55, 185], [56, 159], [58, 133],
    [60, 115], [63, 103],
    [70, 127], [73, 149], [75, 169],
    [75, 183],
    [70, 195], [65, 209], [63, 223],
    [65, 241], [68, 267], [71, 297],
    [73, 319],
    [75, 347], [77, 383], [78, 409],
    [78, 421], [81, 431], [88, 432],
    [93, 429], [94, 418],
    [95, 390], [96, 354], [97, 318],
    [98, 286], [99, 258], [100, 236],
  ],
  female: [
    [100, 6], [89, 8], [82, 16], [78, 28], [78, 39], [82, 49], [87, 56],
    [88, 64], [86, 73], [82, 79],
    [73, 83], [61, 90], [54, 100],
    [50, 114], [48, 138], [47, 163],
    [46, 188], [46, 210], [48, 231],
    [50, 245], [54, 252], [59, 246],
    [60, 236], [59, 223], [59, 206],
    [60, 185], [61, 159], [63, 134],
    [65, 116], [68, 104],
    [72, 124], [75, 144], [78, 164],
    [79, 178],
    [73, 190], [66, 206], [62, 222],
    [63, 241], [66, 267], [70, 297],
    [72, 319],
    [74, 347], [76, 383], [77, 409],
    [77, 421], [80, 431], [87, 432],
    [92, 429], [93, 418],
    [94, 390], [95, 354], [96, 318],
    [97, 286], [98, 258], [100, 236],
  ],
};

function closedOutline(half: Point[]): Point[] {
  const mirrored = half.map(([x, y]) => [BODY_VIEWBOX.width - x, y] as Point).reverse();
  return [...half, ...mirrored];
}

/**
 * Catmull-Rom through the points, emitted as cubic béziers. Indices wrap, so the
 * curve closes over the crown and the crotch without a corner.
 */
function smoothClosedPath(points: Point[]): string {
  if (points.length < 3) return '';
  const at = (i: number) => points[(i + points.length) % points.length];
  let d = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return `${d} Z`;
}

const OUTLINES: Record<Gender, Point[]> = {
  male: closedOutline(HALF_OUTLINE.male),
  female: closedOutline(HALF_OUTLINE.female),
};
const PATHS: Record<Gender, string> = {
  male: smoothClosedPath(OUTLINES.male),
  female: smoothClosedPath(OUTLINES.female),
};

export function bodyPath(gender: Gender): string {
  return PATHS[gender];
}

export function bodyPolygon(gender: Gender): Point[] {
  return OUTLINES[gender];
}

function pointInPolygon(x: number, y: number, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function isOnBody(gender: Gender, x: number, y: number): boolean {
  return pointInPolygon(x, y, OUTLINES[gender]);
}

export function zoneAt(view: BodyView, gender: Gender, x: number, y: number): string | null {
  if (!isOnBody(gender, x, y)) return null;
  for (const region of HIT_REGIONS[view]) {
    if (x >= region.x0 && x < region.x1 && y >= region.y0 && y < region.y1) {
      return region.zoneId;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Questionnaire
// ---------------------------------------------------------------------------

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

/**
 * A sensible point inside a zone, on the body.
 *
 * Needed twice: when a zone is picked from the list instead of tapped (the
 * accessible path, and the one some people simply prefer), and when an old
 * report that predates points is reopened. Both need a mark to draw, and the
 * middle of a hit rectangle is often off the body — between the legs, or beside
 * an arm — so the region is sampled and the on-body point nearest its centre
 * wins.
 */
export function defaultPointForZone(
  view: BodyView,
  gender: Gender,
  zoneId: string,
): { x: number; y: number } | null {
  const region = HIT_REGIONS[view].find((r) => r.zoneId === zoneId);
  if (!region) return null;

  // The test has to be `zoneAt`, not just "inside the body". Hit rectangles are
  // deliberately generous and overlap — the upper-right abdomen rectangle
  // reaches across the arm — so the geometric centre of a rectangle can sit on
  // a different zone entirely. Sampling against the same lookup the tap uses is
  // what keeps picking "upper right abdomen" from the list out of the arm.
  const STEPS = 16;
  const valid: { x: number; y: number }[] = [];
  for (let i = 0; i <= STEPS; i++) {
    for (let j = 0; j <= STEPS; j++) {
      const x = region.x0 + ((region.x1 - region.x0) * i) / STEPS;
      const y = region.y0 + ((region.y1 - region.y0) * j) / STEPS;
      if (zoneAt(view, gender, x, y) === zoneId) valid.push({ x, y });
    }
  }
  if (valid.length === 0) return null;

  // The middle of what actually belongs to the zone, rather than the middle of
  // the rectangle that merely contains it.
  const cx = valid.reduce((sum, p) => sum + p.x, 0) / valid.length;
  const cy = valid.reduce((sum, p) => sum + p.y, 0) / valid.length;
  let best = valid[0];
  let bestDistance = Infinity;
  for (const candidate of valid) {
    const d = (candidate.x - cx) ** 2 + (candidate.y - cy) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = candidate;
    }
  }
  return best;
}

/**
 * The exact outline of a zone as it sits on the body, as one or more polygons.
 *
 * A zone is defined by rectangles, but those rectangles are deliberately
 * generous and overlap each other — drawing one would paint a bar across the
 * page and over the other leg. So the area is traced instead: scan the zone's
 * bounding box line by line, keep the spans that `zoneAt` actually assigns to
 * this zone, and stitch the spans into polygons. The result is the zone as the
 * user sees it, and it cannot disagree with where their tap lands, because both
 * come from the same lookup.
 *
 * Deliberately not `<ClipPath>`, which would be the obvious way to paint a
 * rectangle onto a body shape: nothing outside the app can render clip paths, so
 * the result could only ever be checked by building and installing.
 */
export function zoneShape(view: BodyView, gender: Gender, zoneId: string): Point[][] {
  const key = `${view}:${gender}:${zoneId}`;
  const cached = SHAPE_CACHE.get(key);
  if (cached) return cached;

  const shape = traceZone(view, gender, zoneId);
  SHAPE_CACHE.set(key, shape);
  return shape;
}

const SHAPE_CACHE = new Map<string, Point[][]>();

const TRACE_Y_STEP = 2;
const TRACE_X_STEP = 1;
/** A span shorter than this is a rounding artefact at the edge of the body. */
const MIN_SPAN = 2;

type Span = { x0: number; x1: number };

function traceZone(view: BodyView, gender: Gender, zoneId: string): Point[][] {
  const regions = HIT_REGIONS[view].filter((r) => r.zoneId === zoneId);
  if (regions.length === 0) return [];

  const minX = Math.min(...regions.map((r) => r.x0));
  const maxX = Math.max(...regions.map((r) => r.x1));
  const minY = Math.min(...regions.map((r) => r.y0));
  const maxY = Math.max(...regions.map((r) => r.y1));

  const lines: { y: number; spans: Span[] }[] = [];
  for (let y = minY; y <= maxY; y += TRACE_Y_STEP) {
    const spans: Span[] = [];
    let start: number | null = null;
    let last = minX;
    for (let x = minX; x <= maxX; x += TRACE_X_STEP) {
      const matches = zoneAt(view, gender, x, y) === zoneId;
      if (matches) {
        if (start === null) start = x;
        last = x;
      } else if (start !== null) {
        if (last - start >= MIN_SPAN) spans.push({ x0: start, x1: last });
        start = null;
      }
    }
    if (start !== null && last - start >= MIN_SPAN) spans.push({ x0: start, x1: last });
    if (spans.length > 0) lines.push({ y, spans });
  }

  return stitch(lines);
}

/** Joins per-line spans into polygons, following overlap from one line to the next. */
function stitch(lines: { y: number; spans: Span[] }[]): Point[][] {
  type Strip = { left: Point[]; right: Point[]; last: Span };
  const finished: Point[][] = [];
  let open: Strip[] = [];

  const close = (strip: Strip) => {
    if (strip.left.length < 2) return;
    finished.push([...strip.left, ...[...strip.right].reverse()]);
  };

  for (const line of lines) {
    const carried: Strip[] = [];
    for (const span of line.spans) {
      const strip = open.find(
        (candidate) => span.x0 <= candidate.last.x1 && span.x1 >= candidate.last.x0,
      );
      if (strip && !carried.includes(strip)) {
        strip.left.push([span.x0, line.y]);
        strip.right.push([span.x1, line.y]);
        strip.last = span;
        carried.push(strip);
      } else {
        carried.push({
          left: [[span.x0, line.y]],
          right: [[span.x1, line.y]],
          last: span,
        });
      }
    }
    for (const strip of open) if (!carried.includes(strip)) close(strip);
    open = carried;
  }
  for (const strip of open) close(strip);

  return finished;
}

/** Zones that can actually be marked on a given silhouette, in listed order. */
export function markableZones(view: BodyView): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const region of HIT_REGIONS[view]) {
    if (seen.has(region.zoneId)) continue;
    seen.add(region.zoneId);
    out.push(region.zoneId);
  }
  return out;
}

/** Which view a zone can be marked on — used to flip the silhouette for it. */
export function viewForZone(zoneId: string): BodyView {
  return HIT_REGIONS.front.some((r) => r.zoneId === zoneId) ? 'front' : 'back';
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

/** Normalises whatever the profile stores into a silhouette to draw. */
export function genderFromProfile(raw?: string | null): Gender {
  return String(raw || '').toLowerCase() === 'female' ? 'female' : 'male';
}

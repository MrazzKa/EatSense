import {
  BODY_ZONES,
  BODY_VIEWBOX,
  COMMON_QUESTIONS,
  GROUP_QUESTIONS,
  HIT_REGIONS,
  MAX_POINTS_PER_REPORT,
  RED_FLAGS,
  SEVERITY_MAX,
  SEVERITY_MIN,
  bodyPath,
  bodyPolygon,
  defaultPointForZone,
  genderFromProfile,
  isOnBody,
  markableZones,
  zoneShape,
  questionsForZone,
  severityBand,
  viewForZone,
  zoneAt,
} from '../../features/bodymap/catalog';
import type { BodyView, Gender, ZoneGroup } from '../../features/bodymap/catalog';

import en from '../../../app/i18n/locales/en.json';
import ru from '../../../app/i18n/locales/ru.json';
import de from '../../../app/i18n/locales/de.json';
import fr from '../../../app/i18n/locales/fr.json';
import es from '../../../app/i18n/locales/es.json';
import kk from '../../../app/i18n/locales/kk.json';

const LOCALES: Record<string, any> = { en, ru, de, fr, es, kk };
const GENDERS: Gender[] = ['male', 'female'];
const VIEWS: BodyView[] = ['front', 'back'];

/**
 * The body map fails quietly or not at all. A zone can render, be translated and
 * fire its handler while still being unreachable, mirrored onto the wrong side,
 * or outside the drawing. None of that throws — it just produces a wrong record
 * that nobody notices until a clinician reads it. Hence these.
 */
describe('body map catalogue', () => {
  it('has unique zone ids', () => {
    const ids = BODY_ZONES.map((z) => z.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('can reach every zone from at least one silhouette', () => {
    const reachable = new Set(VIEWS.flatMap((v) => HIT_REGIONS[v].map((r) => r.zoneId)));
    const unreachable = BODY_ZONES.filter((z) => !reachable.has(z.id)).map((z) => z.id);
    // An unreachable zone is a zone the user can never log — it would exist in
    // the catalogue, be translated, and simply never happen.
    expect(unreachable).toEqual([]);
  });

  it('never points a hit region at a zone that does not exist', () => {
    const known = new Set(BODY_ZONES.map((z) => z.id));
    for (const view of VIEWS) {
      const unknown = HIT_REGIONS[view].map((r) => r.zoneId).filter((id) => !known.has(id));
      expect(unknown).toEqual([]);
    }
  });

  it('keeps every hit region inside the viewBox and non-empty', () => {
    for (const view of VIEWS) {
      for (const region of HIT_REGIONS[view]) {
        expect(region.x1).toBeGreaterThan(region.x0);
        expect(region.y1).toBeGreaterThan(region.y0);
        expect(region.x0).toBeGreaterThanOrEqual(0);
        expect(region.y0).toBeGreaterThanOrEqual(0);
        expect(region.x1).toBeLessThanOrEqual(BODY_VIEWBOX.width);
        expect(region.y1).toBeLessThanOrEqual(BODY_VIEWBOX.height);
      }
    }
  });

  it('mirrors left and right between the two views', () => {
    // On a front view the person's right is drawn on the left of the image; on
    // the back view it is on the right. Getting this backwards files every
    // shoulder and arm complaint on the wrong side of the body.
    const frontRight = HIT_REGIONS.front.find((r) => r.zoneId === 'shoulder_right')!;
    const backRight = HIT_REGIONS.back.find((r) => r.zoneId === 'shoulder_right')!;
    expect(frontRight.x0).toBeLessThan(BODY_VIEWBOX.width / 2);
    expect(backRight.x0).toBeGreaterThanOrEqual(BODY_VIEWBOX.width / 2);

    const frontArmLeft = HIT_REGIONS.front.find((r) => r.zoneId === 'arm_left')!;
    const backArmLeft = HIT_REGIONS.back.find((r) => r.zoneId === 'arm_left')!;
    expect(frontArmLeft.x0).toBeGreaterThanOrEqual(BODY_VIEWBOX.width / 2);
    expect(backArmLeft.x1).toBeLessThanOrEqual(BODY_VIEWBOX.width / 2);
  });

  it('asks the common questions for every zone', () => {
    for (const zone of BODY_ZONES) {
      const ids = questionsForZone(zone.id).map((q) => q.id);
      for (const common of COMMON_QUESTIONS) expect(ids).toContain(common.id);
    }
  });

  it('gives every question at least two options and no duplicates', () => {
    const groups = Object.keys(GROUP_QUESTIONS) as ZoneGroup[];
    const all = [...COMMON_QUESTIONS, ...groups.flatMap((g) => GROUP_QUESTIONS[g])];
    for (const question of all) {
      expect(question.options.length).toBeGreaterThanOrEqual(2);
      expect(new Set(question.options).size).toBe(question.options.length);
    }
  });

  it('bands the whole severity range', () => {
    const seen = new Set<string>();
    for (let s = SEVERITY_MIN; s <= SEVERITY_MAX; s++) seen.add(severityBand(s));
    expect([...seen].sort()).toEqual(['extreme', 'mild', 'moderate', 'severe']);
  });

  it('keeps a report small enough to stay meaningful', () => {
    expect(MAX_POINTS_PER_REPORT).toBeGreaterThanOrEqual(1);
    expect(MAX_POINTS_PER_REPORT).toBeLessThanOrEqual(5);
  });

  it('reads a gender out of whatever the profile happens to hold', () => {
    expect(genderFromProfile('female')).toBe('female');
    expect(genderFromProfile('FEMALE')).toBe('female');
    expect(genderFromProfile('male')).toBe('male');
    expect(genderFromProfile('other')).toBe('male');
    expect(genderFromProfile(null)).toBe('male');
    expect(genderFromProfile(undefined)).toBe('male');
    expect(genderFromProfile('')).toBe('male');
  });
});

describe('silhouette geometry', () => {
  it('draws a closed path for both silhouettes', () => {
    for (const gender of GENDERS) {
      const path = bodyPath(gender);
      expect(path.startsWith('M ')).toBe(true);
      expect(path.endsWith(' Z')).toBe(true);
      expect(path).toContain(' C ');
    }
  });

  it('keeps the whole outline inside the viewBox', () => {
    for (const gender of GENDERS) {
      for (const [x, y] of bodyPolygon(gender)) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(BODY_VIEWBOX.width);
        expect(y).toBeLessThanOrEqual(BODY_VIEWBOX.height);
      }
    }
  });

  it('is symmetric about the centre line', () => {
    for (const gender of GENDERS) {
      const polygon = bodyPolygon(gender);
      const half = polygon.length / 2;
      for (let i = 0; i < half; i++) {
        const [lx, ly] = polygon[i];
        const [rx, ry] = polygon[polygon.length - 1 - i];
        expect(rx).toBeCloseTo(BODY_VIEWBOX.width - lx, 5);
        expect(ry).toBeCloseTo(ly, 5);
      }
    }
  });

  it('puts the torso, head and legs on the body and the corners off it', () => {
    for (const gender of GENDERS) {
      expect(isOnBody(gender, 100, 34)).toBe(true); // head
      expect(isOnBody(gender, 100, 110)).toBe(true); // chest
      expect(isOnBody(gender, 100, 155)).toBe(true); // abdomen
      expect(isOnBody(gender, 80, 350)).toBe(true); // right leg
      expect(isOnBody(gender, 120, 350)).toBe(true); // left leg

      expect(isOnBody(gender, 2, 2)).toBe(false);
      expect(isOnBody(gender, 198, 2)).toBe(false);
      expect(isOnBody(gender, 4, 300)).toBe(false); // beside the legs
      expect(isOnBody(gender, 100, 438)).toBe(false); // below the feet
    }
  });

  it('refuses to place a mark off the body', () => {
    for (const gender of GENDERS) {
      for (const view of VIEWS) {
        expect(zoneAt(view, gender, 2, 2)).toBeNull();
        expect(zoneAt(view, gender, 5, 300)).toBeNull();
      }
    }
  });

  it('resolves a tap to the zone it looks like', () => {
    expect(zoneAt('front', 'male', 100, 30)).toBe('head');
    expect(zoneAt('front', 'male', 100, 110)).toBe('chest');
    expect(zoneAt('front', 'male', 100, 155)).toBe('abdomen_epigastrium');
    expect(zoneAt('front', 'male', 75, 155)).toBe('abdomen_hypochondrium_right');
    expect(zoneAt('front', 'male', 125, 155)).toBe('abdomen_hypochondrium_left');
    expect(zoneAt('back', 'male', 100, 110)).toBe('back_upper');
    expect(zoneAt('back', 'male', 100, 210)).toBe('back_lower');
  });

  it('prefers the limb over the torso where the two regions overlap', () => {
    // The arm region spans the same y band as the chest; listed first, it wins,
    // so a tap on the upper arm is not filed under the chest.
    const arm = zoneAt('front', 'male', 46, 150);
    expect(arm).toBe('arm_right');
  });

  it('offers a point on the body for every markable zone', () => {
    for (const gender of GENDERS) {
      for (const view of VIEWS) {
        for (const zoneId of markableZones(view)) {
          const point = defaultPointForZone(view, gender, zoneId);
          expect(point).not.toBeNull();
          expect(isOnBody(gender, point!.x, point!.y)).toBe(true);
          // And it must resolve back to the zone it was asked for, or picking
          // from the list would file the mark somewhere else.
          expect(zoneAt(view, gender, point!.x, point!.y)).toBe(zoneId);
        }
      }
    }
  });

  it('lists each markable zone once, in hit-region order', () => {
    for (const view of VIEWS) {
      const zones = markableZones(view);
      expect(new Set(zones).size).toBe(zones.length);
      expect(zones.length).toBeGreaterThan(5);
    }
  });

  it('joins the head to the body in one closed outline', () => {
    for (const gender of GENDERS) {
      // A separate head would leave a gap at the throat, and the two shapes
      // could disagree about what counts as "on the body".
      expect(isOnBody(gender, 100, 10)).toBe(true); // crown
      expect(isOnBody(gender, 100, 40)).toBe(true); // face
      expect(isOnBody(gender, 100, 62)).toBe(true); // throat
      expect(isOnBody(gender, 100, 70)).toBe(true); // neck
      expect(isOnBody(gender, 100, 90)).toBe(true); // chest
      // The outline closes over the crown, so it starts and ends on the centre.
      const polygon = bodyPolygon(gender);
      expect(polygon[0][0]).toBe(100);
      expect(polygon[polygon.length - 1][0]).toBe(100);
    }
  });

  it('traces every zone as a shape that stays on the body', () => {
    for (const gender of GENDERS) {
      for (const view of VIEWS) {
        for (const zoneId of markableZones(view)) {
          const polygons = zoneShape(view, gender, zoneId);
          expect(polygons.length).toBeGreaterThan(0);
          for (const polygon of polygons) {
            expect(polygon.length).toBeGreaterThanOrEqual(4);
            for (const [x, y] of polygon) {
              // Every vertex came from a point the lookup assigned to this zone,
              // so a vertex off the body would mean the trace and the tap
              // disagree — which is the bug the old rectangle highlight was.
              expect(isOnBody(gender, x, y)).toBe(true);
            }
          }
        }
      }
    }
  });

  it('keeps a traced zone inside its own hit regions', () => {
    for (const view of VIEWS) {
      for (const zoneId of markableZones(view)) {
        const regions = HIT_REGIONS[view].filter((r) => r.zoneId === zoneId);
        for (const polygon of zoneShape(view, 'male', zoneId)) {
          for (const [x, y] of polygon) {
            const inSome = regions.some((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1);
            expect(inSome).toBe(true);
          }
        }
      }
    }
  });

  it('separates the two legs instead of spanning the gap between them', () => {
    const right = zoneShape('front', 'male', 'leg_right');
    const left = zoneShape('front', 'male', 'leg_left');
    const maxX = Math.max(...right.flat().map(([x]) => x));
    const minX = Math.min(...left.flat().map(([x]) => x));
    expect(maxX).toBeLessThanOrEqual(100);
    expect(minX).toBeGreaterThanOrEqual(100);
  });

  it('knows which view to flip to for a zone', () => {
    expect(viewForZone('chest')).toBe('front');
    expect(viewForZone('abdomen_epigastrium')).toBe('front');
    expect(viewForZone('back_lower')).toBe('back');
    expect(viewForZone('glutes')).toBe('back');
    // Reachable from both; the front is the sensible default.
    expect(viewForZone('arm_left')).toBe('front');
  });
});

describe('body map translations', () => {
  const localeNames = Object.keys(LOCALES);

  function lookup(locale: string, path: string): unknown {
    return path
      .split('.')
      .reduce<any>((node, key) => (node == null ? node : node[key]), LOCALES[locale]);
  }

  function expectStringEverywhere(path: string) {
    for (const locale of localeNames) {
      const value = lookup(locale, path);
      if (typeof value !== 'string' || value.trim() === '') {
        throw new Error(`Missing translation "${path}" in ${locale}.json`);
      }
    }
  }

  it('names every body zone in all six languages', () => {
    for (const zone of BODY_ZONES) expectStringEverywhere(`bodyMap.zones.${zone.id}`);
  });

  it('labels every question and every option in all six languages', () => {
    const groups = Object.keys(GROUP_QUESTIONS) as ZoneGroup[];
    const all = [...COMMON_QUESTIONS, ...groups.flatMap((g) => GROUP_QUESTIONS[g])];
    for (const question of all) {
      expectStringEverywhere(`bodyMap.questions.${question.id}.label`);
      for (const option of question.options) {
        expectStringEverywhere(`bodyMap.questions.${question.id}.options.${option}`);
      }
    }
  });

  it('spells out every emergency item in all six languages', () => {
    for (const flag of RED_FLAGS) expectStringEverywhere(`bodyMap.redFlags.${flag}`);
  });

  it('translates the screen chrome in all six languages', () => {
    const paths = [
      'bodyMap.title',
      'bodyMap.dashboardTitle',
      'bodyMap.dashboardSubtitle',
      'bodyMap.hintPick',
      'bodyMap.hintTapAgain',
      'bodyMap.viewFront',
      'bodyMap.viewBack',
      'bodyMap.genderMale',
      'bodyMap.genderFemale',
      'bodyMap.chooseFromList',
      'bodyMap.bodyA11y',
      'bodyMap.maxZonesTitle',
      'bodyMap.maxZonesBody',
      'bodyMap.stepOf',
      'bodyMap.severityLabel',
      'bodyMap.severityAria',
      'bodyMap.severityBands.mild',
      'bodyMap.severityBands.moderate',
      'bodyMap.severityBands.severe',
      'bodyMap.severityBands.extreme',
      'bodyMap.checkTitle',
      'bodyMap.checkSubtitle',
      'bodyMap.emergencyTitle',
      'bodyMap.emergencyBody',
      'bodyMap.emergencyNumber',
      'bodyMap.emergencyCall',
      'bodyMap.noteLabel',
      'bodyMap.notePlaceholder',
      'bodyMap.disclaimer',
      'bodyMap.save',
      'bodyMap.saveFailed',
      'bodyMap.savedTitle',
      'bodyMap.savedBody',
      'bodyMap.historyTitle',
      'bodyMap.historyHint',
      'bodyMap.showSpecialist',
      'bodyMap.diaryA11y',
      'bodyMap.deleteTitle',
      'bodyMap.deleteBody',
      'bodyMap.deleteFailed',
      'common.remove',
      'common.cancel',
      'common.delete',
      'common.tryAgain',
      'hotline.title',
      'hotline.dashboardTitle',
      'hotline.dashboardSubtitle',
      'hotline.closed',
      'hotline.opensAt',
      'hotline.noSchedule',
      'hotline.bookInstead',
      'hotline.open',
      'hotline.waitEstimate',
      'hotline.answeredSoon',
      'hotline.attachedReport',
      'hotline.reasonLabel',
      'hotline.reasonPlaceholder',
      'hotline.connect',
      'hotline.disclaimer',
      'hotline.waiting',
      'hotline.waitHint',
      'hotline.offline',
      'hotline.requestFailed',
    ];
    for (const path of paths) expectStringEverywhere(path);
  });

  it('keeps the {{placeholders}} the code substitutes', () => {
    for (const locale of localeNames) {
      expect(lookup(locale, 'bodyMap.stepOf')).toContain('{{current}}');
      expect(lookup(locale, 'bodyMap.stepOf')).toContain('{{total}}');
      expect(lookup(locale, 'bodyMap.emergencyCall')).toContain('{{number}}');
      expect(lookup(locale, 'bodyMap.severityAria')).toContain('{{value}}');
      expect(lookup(locale, 'bodyMap.severityAria')).toContain('{{max}}');
      expect(lookup(locale, 'bodyMap.diaryA11y')).toContain('{{zones}}');
      expect(lookup(locale, 'hotline.opensAt')).toContain('{{when}}');
      expect(lookup(locale, 'hotline.open')).toContain('{{count}}');
      expect(lookup(locale, 'hotline.waitEstimate')).toContain('{{minutes}}');
    }
  });

  it('gives every locale a dialable emergency number', () => {
    for (const locale of localeNames) {
      expect(String(lookup(locale, 'bodyMap.emergencyNumber'))).toMatch(/^[0-9+][0-9\s-]*$/);
    }
  });
});

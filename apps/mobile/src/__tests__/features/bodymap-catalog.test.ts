import {
  BODY_ZONES,
  BODY_VIEWBOX,
  COMMON_QUESTIONS,
  GROUP_QUESTIONS,
  MAX_ZONES_PER_REPORT,
  RED_FLAGS,
  SEVERITY_MAX,
  SEVERITY_MIN,
  ZoneGroup,
  questionsForZone,
  severityBand,
  zonesForView,
} from '../../features/bodymap/catalog';

import en from '../../../app/i18n/locales/en.json';
import ru from '../../../app/i18n/locales/ru.json';
import de from '../../../app/i18n/locales/de.json';
import fr from '../../../app/i18n/locales/fr.json';
import es from '../../../app/i18n/locales/es.json';
import kk from '../../../app/i18n/locales/kk.json';

const LOCALES: Record<string, any> = { en, ru, de, fr, es, kk };

/**
 * The body map has three things that silently rot: the catalogue can drift from
 * the server's copy, a zone can ship without a translation and read as a raw id
 * on someone's phone, and a shape can be authored outside the viewBox where it
 * is simply invisible. None of those throw at runtime — they just look broken,
 * in one language, on one screen. Hence these.
 */
describe('body map catalogue', () => {
  it('has unique zone ids', () => {
    const ids = BODY_ZONES.map((z) => z.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('places every zone inside the viewBox', () => {
    const outside = BODY_ZONES.filter((zone) => {
      const s = zone.shape;
      const [left, top, right, bottom] =
        s.kind === 'ellipse'
          ? [s.cx - s.rx, s.cy - s.ry, s.cx + s.rx, s.cy + s.ry]
          : [s.x, s.y, s.x + s.w, s.y + s.h];
      return (
        left < 0 || top < 0 || right > BODY_VIEWBOX.width || bottom > BODY_VIEWBOX.height
      );
    });
    // Naming the offenders matters: "expected 0, got 2" would send you reading
    // all 22 shapes by hand.
    expect(outside.map((z) => z.id)).toEqual([]);
  });

  it('draws zones on both silhouettes', () => {
    expect(zonesForView('front').length).toBeGreaterThan(0);
    expect(zonesForView('back').length).toBeGreaterThan(0);
    expect(zonesForView('front').length + zonesForView('back').length).toBe(BODY_ZONES.length);
  });

  it('asks the common questions for every zone', () => {
    for (const zone of BODY_ZONES) {
      const ids = questionsForZone(zone.id).map((q) => q.id);
      for (const common of COMMON_QUESTIONS) {
        expect(ids).toContain(common.id);
      }
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

  it('keeps the report small enough to stay meaningful', () => {
    expect(MAX_ZONES_PER_REPORT).toBeGreaterThanOrEqual(1);
    expect(MAX_ZONES_PER_REPORT).toBeLessThanOrEqual(5);
  });
});

describe('body map translations', () => {
  const localeNames = Object.keys(LOCALES);

  function lookup(locale: string, path: string): unknown {
    return path.split('.').reduce<any>((node, key) => (node == null ? node : node[key]), LOCALES[locale]);
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
      'bodyMap.viewFront',
      'bodyMap.viewBack',
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
      'bodyMap.diaryA11y',
      'bodyMap.deleteTitle',
      'bodyMap.deleteBody',
      'bodyMap.deleteFailed',
      'common.remove',
      'common.cancel',
      'common.delete',
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
    }
  });

  it('gives every locale a dialable emergency number', () => {
    for (const locale of localeNames) {
      expect(String(lookup(locale, 'bodyMap.emergencyNumber'))).toMatch(/^[0-9+][0-9\s-]*$/);
    }
  });
});

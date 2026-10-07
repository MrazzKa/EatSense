#!/usr/bin/env node
/**
 * Checks that the body-map catalogue in the app and the one in the API still
 * agree on zone ids, question ids, answer options and emergency items.
 *
 * They are two files on purpose — the app needs geometry and opens offline, the
 * server needs nothing but validation — but they are one contract. The failure
 * mode when they drift is quiet and nasty: the app offers a zone or an answer
 * the server rejects with a 400, and the user just sees "could not save" with no
 * way to know why. That is worth twenty lines of regex to prevent.
 *
 * The expert portal holds a third, label-only copy so a specialist can read the
 * record attached to a hotline request. A zone missing there shows up as a raw
 * id in front of the person who has to make sense of it, so it is checked too.
 *
 * Run: node scripts/check-bodymap-sync.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const APP_CATALOG = path.join(ROOT, 'apps/mobile/src/features/bodymap/catalog.ts');
const API_CATALOG = path.join(ROOT, 'apps/api/symptoms/symptom-catalog.ts');
const PORTAL_LABELS = path.join(ROOT, 'apps/expert-portal/lib/bodymap-labels.json');

function read(file) {
  if (!fs.existsSync(file)) {
    console.error(`✗ Missing catalogue: ${path.relative(ROOT, file)}`);
    process.exit(1);
  }
  return fs.readFileSync(file, 'utf8');
}

/** Every `id: 'value'` in the file, in order of appearance. */
function ids(source) {
  return [...source.matchAll(/\bid:\s*'([a-z0-9_]+)'/g)].map((m) => m[1]);
}

/** Every `options: [...]` list, flattened to "<question>:<option>" pairs. */
function questionOptions(source) {
  const pairs = [];
  const re = /\bid:\s*'([a-z0-9_]+)',\s*options:\s*\[([^\]]*)\]/g;
  for (const match of source.matchAll(re)) {
    const question = match[1];
    for (const option of match[2].matchAll(/'([a-z0-9_]+)'/g)) {
      pairs.push(`${question}:${option[1]}`);
    }
  }
  return pairs;
}

/** The RED_FLAGS array, wherever it is declared. */
function redFlags(source) {
  const match = source.match(/RED_FLAGS[^=]*=\s*(?:Object\.freeze\()?\[([\s\S]*?)\]/);
  if (!match) return [];
  return [...match[1].matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]);
}

function compare(label, appList, apiList) {
  const appSet = new Set(appList);
  const apiSet = new Set(apiList);
  const onlyApp = [...appSet].filter((v) => !apiSet.has(v));
  const onlyApi = [...apiSet].filter((v) => !appSet.has(v));

  if (onlyApp.length === 0 && onlyApi.length === 0) {
    console.log(`✓ ${label}: ${appSet.size} in sync`);
    return true;
  }
  console.error(`✗ ${label} out of sync`);
  if (onlyApp.length) console.error(`    only in the app: ${onlyApp.join(', ')}`);
  if (onlyApi.length) console.error(`    only in the API: ${onlyApi.join(', ')}`);
  return false;
}

const appSource = read(APP_CATALOG);
const apiSource = read(API_CATALOG);

// Zone ids are the `id:` entries that sit next to a `view:` — question ids sit
// next to `options:`, so splitting on that keeps the two sets apart.
const zoneIds = (source) =>
  [...source.matchAll(/\bid:\s*'([a-z0-9_]+)',\s*view:/g)].map((m) => m[1]);

const results = [
  compare('body zones', zoneIds(appSource), zoneIds(apiSource)),
  compare('question options', questionOptions(appSource), questionOptions(apiSource)),
  compare('emergency checklist', redFlags(appSource), redFlags(apiSource)),
];

/** Every zone and question option the app can send must have a label in every portal locale. */
function checkPortalLabels() {
  const labels = JSON.parse(read(PORTAL_LABELS));
  const zones = zoneIds(appSource);
  const options = questionOptions(appSource);
  let ok = true;
  for (const [locale, set] of Object.entries(labels)) {
    const missing = [
      ...zones.filter((zone) => !set.zones?.[zone]),
      ...options.filter((pair) => {
        const [question, option] = pair.split(':');
        return !set.questions?.[question]?.label || !set.questions[question].options?.[option];
      }),
    ];
    if (missing.length) {
      console.error(`✗ portal labels (${locale}) missing: ${missing.join(', ')}`);
      ok = false;
    }
  }
  if (ok) console.log(`✓ portal labels: ${Object.keys(labels).length} locales complete`);
  return ok;
}

results.push(checkPortalLabels());

if (zoneIds(appSource).length === 0 || ids(apiSource).length === 0) {
  console.error('✗ Parsed nothing — the catalogue format changed, update this script.');
  process.exit(1);
}

process.exit(results.every(Boolean) ? 0 : 1);

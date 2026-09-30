#!/usr/bin/env node
/**
 * Draws the body-map silhouette straight from the app's catalogue into SVG files,
 * so the geometry can be looked at without building and installing the app.
 *
 * This exists because the silhouette is the one part of the feature whose bugs
 * are invisible to tests and type checks: the outline can be inside the viewBox,
 * be translated, report taps correctly and still look like a pile of rectangles
 * or sprout a seam where the neck should be. Those are only findable by looking,
 * and looking used to mean a 20-minute build.
 *
 * Run: node scripts/render-bodymap.js [outDir]
 * Then open the two SVGs, or rasterise them:
 *   convert -density 144 <out>/body-front.svg front.png
 *
 * NOTE: zone ids are emitted as `data-zone` attributes rather than <title>
 * children. ImageMagick's built-in SVG renderer silently drops an <ellipse> that
 * has child elements, which once made the head and shoulders look missing when
 * they were not.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CATALOG = path.join(ROOT, 'apps/mobile/src/features/bodymap/catalog.ts');
const outDir = process.argv[2] || path.join(require('os').tmpdir(), 'eatsense-bodymap');

const PALETTE = {
  page: '#F4F5F7',
  body: '#FFFFFF',
  outline: '#CBD5F5',
  pinRing: '#FFFFFF',
  mild: '#4ADE80',
  moderate: '#FACC15',
  severe: '#FB923C',
  extreme: '#EF4444',
};

/** A plausible in-use state, so the pins are visible too. */
const SAMPLE = {
  front: [
    { zoneId: 'abdomen_epigastrium', x: 103, y: 152, severity: 7 },
    { zoneId: 'shoulder_right', x: 54, y: 101, severity: 3 },
  ],
  back: [{ zoneId: 'back_lower', x: 96, y: 210, severity: 9 }],
};

const band = (s) => (s <= 3 ? 'mild' : s <= 5 ? 'moderate' : s <= 8 ? 'severe' : 'extreme');

function readCatalog() {
  if (!fs.existsSync(CATALOG)) {
    console.error(`\u2717 Catalogue not found: ${path.relative(ROOT, CATALOG)}`);
    process.exit(1);
  }
  const src = fs.readFileSync(CATALOG, 'utf8');

  // Half outlines, one block per gender.
  const halfSrc = src.slice(src.indexOf('const HALF_OUTLINE'), src.indexOf('function closedOutline'));
  const halves = {};
  for (const gender of ['male', 'female']) {
    // Stop at the closing bracket of the whole array, not at the first "]," —
    // every coordinate pair ends with one of those.
    const block = halfSrc.match(new RegExp(`${gender}:\\s*\\[([\\s\\S]*?)\\n  \\],`));
    halves[gender] = block
      ? [...block[1].matchAll(/\[(\d+),\s*(\d+)\]/g)].map((m) => [+m[1], +m[2]])
      : [];
  }

  // Hit regions, per view.
  const hitSrc = src.slice(src.indexOf('export const HIT_REGIONS'), src.indexOf('// ------', src.indexOf('export const HIT_REGIONS')));
  const regions = { front: [], back: [] };
  let currentView = null;
  for (const line of hitSrc.split('\n')) {
    if (/^\s*front:\s*\[/.test(line)) currentView = 'front';
    else if (/^\s*back:\s*\[/.test(line)) currentView = 'back';
    const m = line.match(/zoneId:\s*'([a-z_]+)',\s*x0:\s*(\d+),\s*y0:\s*(\d+),\s*x1:\s*(\d+),\s*y1:\s*(\d+)/);
    if (m && currentView) {
      regions[currentView].push({ zoneId: m[1], x0: +m[2], y0: +m[3], x1: +m[4], y1: +m[5] });
    }
  }

  return { halves, regions };
}

const mirror = (pts) => pts.map(([x, y]) => [200 - x, y]).reverse();

function smooth(points) {
  const at = (i) => points[(i + points.length) % points.length];
  let d = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return `${d} Z`;
}

function pointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function zoneAt(view, x, y, polygon) {
  if (!pointInPolygon(x, y, polygon)) return null;
  for (const r of regions[view]) {
    if (x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1) return r.zoneId;
  }
  return null;
}

const { halves, regions } = readCatalog();
if (!halves.male || halves.male.length === 0 || regions.front.length === 0) {
  console.error('\u2717 Parsed nothing useful — the catalogue format changed, update this script.');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

for (const gender of ['male', 'female']) {
  for (const view of ['front', 'back']) {
    const outline = smooth([...halves[gender], ...mirror(halves[gender])]);
    const marks = SAMPLE[view];

    const polygon = [...halves[gender], ...mirror(halves[gender])];
    const pins = marks
      .map(
        (m) =>
          `<circle cx="${m.x}" cy="${m.y}" r="9" fill="${PALETTE.pinRing}"/>` +
          `<circle cx="${m.x}" cy="${m.y}" r="6.5" fill="${PALETTE[band(m.severity)]}" stroke="${PALETTE.outline}" stroke-width="0.5"/>`,
      )
      .join('');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 440" width="300" height="660">
<rect width="200" height="440" fill="${PALETTE.page}"/>
<path d="${outline}" fill="${PALETTE.body}" stroke="${PALETTE.outline}" stroke-width="1.5"/>
${pins}
</svg>`;

    const file = path.join(outDir, `body-${gender}-${view}.svg`);
    fs.writeFileSync(file, svg);

    // A pin that resolves to a different zone than it was authored for means the
    // outline and the hit regions have drifted apart.
    const misplaced = marks.filter((m) => zoneAt(view, m.x, m.y, polygon) !== m.zoneId);
    console.log(`\u2713 ${gender.padEnd(6)} ${view.padEnd(5)} ${marks.length} pin(s) \u2192 ${file}`);
    for (const m of misplaced) {
      console.log(`  \u2717 pin at ${m.x},${m.y} reads as ${zoneAt(view, m.x, m.y, polygon)}, not ${m.zoneId}`);
    }
  }
}

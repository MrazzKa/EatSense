#!/usr/bin/env node
/**
 * Draws the body-map silhouette straight from the app's catalogue into SVG files,
 * so the geometry can be looked at without building and installing the app.
 *
 * This exists because the silhouette is the one part of the feature whose bugs
 * are invisible to tests and type checks: a zone can be inside the viewBox, have
 * a translation, fire its onPress and still look like a pile of rectangles or
 * sprout an ellipse where a shoulder should be. Those are only findable by
 * looking, and looking used to mean a 20-minute build.
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
  idle: '#FFFFFF',
  outline: '#CBD5F5',
  inert: '#F4F5F7',
  inertOutline: '#E2E8F0',
  selectedOutline: '#1F2937',
  mild: '#4ADE80',
  moderate: '#FACC15',
  severe: '#FB923C',
  extreme: '#EF4444',
};

/** A plausible in-use state, so selected styling is visible too. */
const SAMPLE_SELECTION = { abdomen_epigastrium: 7, shoulder_right: 3, back_lower: 9 };

const band = (s) => (s <= 3 ? 'mild' : s <= 5 ? 'moderate' : s <= 8 ? 'severe' : 'extreme');

function parseObject(literal) {
  const out = {};
  for (const m of literal.matchAll(/(\w+):\s*(-?\d+|'[a-z]+')/g)) {
    out[m[1]] = m[2].startsWith("'") ? m[2].slice(1, -1) : Number(m[2]);
  }
  return out;
}

function readCatalog() {
  if (!fs.existsSync(CATALOG)) {
    console.error(`✗ Catalogue not found: ${path.relative(ROOT, CATALOG)}`);
    process.exit(1);
  }
  const src = fs.readFileSync(CATALOG, 'utf8');

  const zones = [
    ...src.matchAll(
      /\{\s*id:\s*'([a-z_]+)',\s*view:\s*'(front|back)',\s*group:\s*'[a-z]+',\s*shape:\s*(\{[^}]*\})\s*\}/g,
    ),
  ].map((m) => ({ id: m[1], view: m[2], shape: parseObject(m[3]) }));

  const inertSrc = src.slice(
    src.indexOf('export const INERT_SHAPES'),
    src.indexOf('export const COMMON_QUESTIONS'),
  );
  const backStart = inertSrc.indexOf('back: [');
  const inertBack = [...inertSrc.slice(backStart).matchAll(/\{\s*kind:[^}]*\}/g)].map((m) =>
    parseObject(m[0]),
  );

  return { zones, inert: { front: [], back: inertBack } };
}

function draw(shape, { fill, stroke, width, zoneId }) {
  const attrs = `fill="${fill}" stroke="${stroke}" stroke-width="${width}"${
    zoneId ? ` data-zone="${zoneId}"` : ''
  }`;
  return shape.kind === 'ellipse'
    ? `<ellipse cx="${shape.cx}" cy="${shape.cy}" rx="${shape.rx}" ry="${shape.ry}" ${attrs}/>`
    : `<rect x="${shape.x}" y="${shape.y}" width="${shape.w}" height="${shape.h}" rx="${shape.rx}" ry="${shape.rx}" ${attrs}/>`;
}

const { zones, inert } = readCatalog();
if (zones.length === 0) {
  console.error('✗ Parsed no zones — the catalogue format changed, update this script.');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

for (const view of ['front', 'back']) {
  const parts = [`<rect x="0" y="0" width="200" height="440" fill="${PALETTE.page}"/>`];

  for (const shape of inert[view]) {
    parts.push(draw(shape, { fill: PALETTE.inert, stroke: PALETTE.inertOutline, width: 1 }));
  }

  const inView = zones.filter((z) => z.view === view);
  for (const zone of inView) {
    const severity = SAMPLE_SELECTION[zone.id];
    parts.push(
      draw(zone.shape, {
        fill: severity ? PALETTE[band(severity)] : PALETTE.idle,
        stroke: severity ? PALETTE.selectedOutline : PALETTE.outline,
        width: severity ? 2.5 : 1,
        zoneId: zone.id,
      }),
    );
  }

  const file = path.join(outDir, `body-${view}.svg`);
  fs.writeFileSync(
    file,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 440" width="300" height="660">${parts.join(
      '',
    )}</svg>`,
  );
  console.log(`✓ ${view.padEnd(5)} ${String(inView.length).padStart(2)} zones → ${file}`);
}

/**
 * Lightweight Vision smoke test (no DB / no server).
 * Runs a real OpenAI Vision call on a fixture image and prints per-item
 * estimated_nutrients + portions + timing, validating:
 *  - estimated_nutrients look like PER-100g values (kcal ~ 4p+4c+9f)
 *  - no recurring "67"-style artifacts leaking as portion totals
 *  - latency budget
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/verify-vision.ts [path-to-image]
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import * as sharp from 'sharp';
import { VisionService } from '../src/analysis/vision.service';

const fakeCache: any = {
  get: async () => null,
  set: async () => {},
};

async function main() {
  const imgPath = process.argv[2] || path.join(__dirname, '..', 'food', 'fixtures', 'food.jpg');
  if (!fs.existsSync(imgPath)) {
    console.error('Image not found:', imgPath);
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set');
    process.exit(1);
  }

  // Mirror food.processor: re-encode to JPEG. Dim/quality configurable for tuning.
  const DIM = parseInt(process.env.VERIFY_DIM || '768', 10);
  const Q = parseInt(process.env.VERIFY_Q || '70', 10);
  const raw = fs.readFileSync(imgPath);
  const jpeg = await sharp(raw)
    .resize(DIM, DIM, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: Q, mozjpeg: true })
    .toBuffer();
  const base64 = jpeg.toString('base64');
  console.log(`Encoded: ${DIM}px q${Q} -> ${Math.round(jpeg.length / 1024)}KB`);
  const vision = new VisionService(fakeCache);

  console.log('Model:', process.env.VISION_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini');
  console.log('Image:', imgPath, `(${Math.round(base64.length / 1024)}KB base64)`);

  const t0 = Date.now();
  const result = await vision.getOrExtractComponents({
    imageBase64: base64,
    locale: 'en',
    skipCache: true,
  });
  const ms = Date.now() - t0;

  console.log(`\nVision status: ${result.status}  |  latency: ${ms}ms  |  items: ${result.components.length}`);
  console.log('Dish:', result.dish?.dish_name ?? '(none)');
  console.log('\nPer-item estimated_nutrients (should be PER 100g):');
  for (const c of result.components) {
    const en: any = (c as any).estimated_nutrients || {};
    const p = en.protein_g || 0, cb = en.carbs_g || 0, f = en.fat_g || 0, kcal = en.calories || 0;
    const derived = Math.round(4 * p + 4 * cb + 9 * f);
    const consistent = kcal === 0 ? '—' : Math.abs(kcal - derived) <= Math.max(15, kcal * 0.2) ? 'ok' : `MISMATCH(calc=${derived})`;
    const sixtySeven = [kcal, p, cb, f, (c as any).est_portion_g].includes(67) ? '  <== contains 67' : '';
    console.log(
      `  - ${(c.name || '').padEnd(22)} portion=${String((c as any).est_portion_g ?? '?').padStart(4)}g  ` +
      `per100g[kcal=${kcal} p=${p} c=${cb} f=${f}] kcalCheck=${consistent}${sixtySeven}`,
    );
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

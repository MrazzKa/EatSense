/**
 * Vision eval harness — "did this change make recognition better or worse?"
 *
 * Runs the REAL VisionService (same prompt, same schema, same post-processing as
 * production) over a golden set of photos and scores the output against expected
 * answers. Model and even vendor are env-driven, so OpenAI, a fine-tuned model
 * and an open-weights model behind an OpenAI-compatible endpoint are all scored
 * on identical terms.
 *
 * See scripts/eval/README.md for the golden-set format and usage.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/eval-vision.ts
 *   npx ts-node -r tsconfig-paths/register scripts/eval-vision.ts --compare a.json b.json
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import * as sharp from 'sharp';
import { VisionService } from '../src/analysis/vision.service';

const EVAL_DIR = path.join(__dirname, 'eval');
const RESULTS_DIR = path.join(EVAL_DIR, 'results');

interface Expected {
  dishName: string;
  dishAliases?: string[];
  components?: string[];
  portionG?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

interface GoldenEntry {
  id: string;
  image: string;
  locale?: string;
  cuisine?: string;
  expected: Expected;
}

interface CaseResult {
  id: string;
  cuisine: string;
  ok: boolean;
  latencyMs: number;
  dishMatch: boolean | null;
  predictedDish: string | null;
  componentRecall: number | null;
  portionError: number | null;
  caloriesError: number | null;
  proteinError: number | null;
  carbsError: number | null;
  fatError: number | null;
  error?: string;
}

/** Loose match: case/diacritics/punctuation-insensitive, either direction. */
function normalize(s: string): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function namesMatch(predicted: string, expected: string): boolean {
  const p = normalize(predicted);
  const e = normalize(expected);
  if (!p || !e) return false;
  return p === e || p.includes(e) || e.includes(p);
}

function mean(values: number[]): number | null {
  const clean = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (!clean.length) return null;
  return clean.reduce((a, b) => a + b, 0) / clean.length;
}

function percentile(values: number[], p: number): number | null {
  const sorted = [...values].filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function round(v: number | null, digits = 1): number | null {
  if (v === null) return null;
  const f = Math.pow(10, digits);
  return Math.round(v * f) / f;
}

function summarize(cases: CaseResult[]) {
  const done = cases.filter((c) => c.ok);
  return {
    photos: cases.length,
    analysed: done.length,
    failureRate: cases.length ? round((cases.length - done.length) / cases.length, 3) : null,
    dishTop1: round(mean(done.map((c) => (c.dishMatch ? 1 : 0))), 3),
    componentRecall: round(mean(done.map((c) => c.componentRecall!).filter((v) => v !== null)), 3),
    portionMae: round(mean(done.map((c) => c.portionError!).filter((v) => v !== null))),
    caloriesMae: round(mean(done.map((c) => c.caloriesError!).filter((v) => v !== null))),
    proteinMae: round(mean(done.map((c) => c.proteinError!).filter((v) => v !== null))),
    carbsMae: round(mean(done.map((c) => c.carbsError!).filter((v) => v !== null))),
    fatMae: round(mean(done.map((c) => c.fatError!).filter((v) => v !== null))),
    latencyP50: percentile(done.map((c) => c.latencyMs), 50),
    latencyP95: percentile(done.map((c) => c.latencyMs), 95),
  };
}

function printSummary(label: string, s: ReturnType<typeof summarize>) {
  console.log(`\n── ${label} ──`);
  console.log(`  photos analysed     ${s.analysed}/${s.photos}   (failures ${s.failureRate})`);
  console.log(`  dish name top-1     ${s.dishTop1 ?? '—'}`);
  console.log(`  component recall    ${s.componentRecall ?? '—'}`);
  console.log(`  portion MAE (g)     ${s.portionMae ?? '—'}`);
  console.log(`  calories MAE        ${s.caloriesMae ?? '—'}`);
  console.log(`  protein MAE (g)     ${s.proteinMae ?? '—'}`);
  console.log(`  carbs MAE (g)       ${s.carbsMae ?? '—'}`);
  console.log(`  fat MAE (g)         ${s.fatMae ?? '—'}`);
  console.log(`  latency p50 / p95   ${s.latencyP50 ?? '—'}ms / ${s.latencyP95 ?? '—'}ms`);
}

/** Two saved runs side by side, so a decision can be made on deltas. */
function compare(fileA: string, fileB: string) {
  const a = JSON.parse(fs.readFileSync(fileA, 'utf-8'));
  const b = JSON.parse(fs.readFileSync(fileB, 'utf-8'));
  console.log(`\nA = ${a.model}  (${a.ranAt})`);
  console.log(`B = ${b.model}  (${b.ranAt})\n`);

  // Lower is better for errors and latency; higher is better for the rest.
  const lowerIsBetter = new Set([
    'portionMae', 'caloriesMae', 'proteinMae', 'carbsMae', 'fatMae',
    'latencyP50', 'latencyP95', 'failureRate',
  ]);

  const keys = Object.keys(a.summary).filter((k) => k !== 'photos' && k !== 'analysed');
  console.log('metric'.padEnd(20) + 'A'.padStart(12) + 'B'.padStart(12) + '  verdict');
  for (const k of keys) {
    const va = a.summary[k];
    const vb = b.summary[k];
    let verdict = '';
    if (typeof va === 'number' && typeof vb === 'number' && va !== vb) {
      const bBetter = lowerIsBetter.has(k) ? vb < va : vb > va;
      verdict = bBetter ? 'B better' : 'A better';
    }
    console.log(k.padEnd(20) + String(va ?? '—').padStart(12) + String(vb ?? '—').padStart(12) + '  ' + verdict);
  }
  console.log('\nNote: a difference smaller than the run-to-run noise of the model is not a result.');
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--compare') {
    if (args.length < 3) {
      console.error('Usage: --compare <resultA.json> <resultB.json>');
      process.exit(1);
    }
    compare(args[1], args[2]);
    return;
  }

  const goldenPath = path.join(EVAL_DIR, 'golden-set.json');
  if (!fs.existsSync(goldenPath)) {
    console.error(
      `No golden set at ${goldenPath}\n` +
        `Copy golden-set.example.json to golden-set.json and fill it in — see scripts/eval/README.md.`,
    );
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set');
    process.exit(1);
  }

  const golden: GoldenEntry[] = JSON.parse(fs.readFileSync(goldenPath, 'utf-8'));
  const model = process.env.VISION_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1 (default)';

  console.log(`Model:    ${model}`);
  console.log(`Endpoint: ${baseUrl}`);
  console.log(`Golden:   ${golden.length} photos\n`);

  // Same encoding the production processor applies before calling Vision, so the
  // harness scores the image the model actually sees in prod.
  const DIM = parseInt(process.env.VERIFY_DIM || '768', 10);
  const Q = parseInt(process.env.VERIFY_Q || '70', 10);

  const fakeCache: any = { get: async () => null, set: async () => {} };
  const vision = new VisionService(fakeCache);

  const cases: CaseResult[] = [];

  for (const entry of golden) {
    const imgPath = path.isAbsolute(entry.image) ? entry.image : path.join(EVAL_DIR, entry.image);
    const base: CaseResult = {
      id: entry.id,
      cuisine: entry.cuisine || 'unspecified',
      ok: false,
      latencyMs: 0,
      dishMatch: null,
      predictedDish: null,
      componentRecall: null,
      portionError: null,
      caloriesError: null,
      proteinError: null,
      carbsError: null,
      fatError: null,
    };

    if (!fs.existsSync(imgPath)) {
      cases.push({ ...base, error: `image not found: ${imgPath}` });
      console.log(`  ✗ ${entry.id}: image not found`);
      continue;
    }

    try {
      const jpeg = await sharp(fs.readFileSync(imgPath))
        .resize(DIM, DIM, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: Q, mozjpeg: true })
        .toBuffer();

      const t0 = Date.now();
      const result = await vision.getOrExtractComponents({
        imageBase64: jpeg.toString('base64'),
        locale: (entry.locale as any) || 'en',
        skipCache: true,
      });
      const latencyMs = Date.now() - t0;

      const components: any[] = Array.isArray(result.components) ? result.components : [];
      if (!components.length) {
        cases.push({ ...base, latencyMs, error: `no components (status=${result.status})` });
        console.log(`  ✗ ${entry.id}: no components (${result.status})`);
        continue;
      }

      const exp = entry.expected;
      const predictedDish = (result.dish as any)?.dish_name || null;

      // Dish name
      const candidates = [exp.dishName, ...(exp.dishAliases || [])];
      const dishMatch = predictedDish ? candidates.some((c) => namesMatch(predictedDish, c)) : false;

      // Component recall: how many expected components did it find?
      let componentRecall: number | null = null;
      if (exp.components?.length) {
        const found = exp.components.filter((wanted) =>
          components.some((c) => namesMatch(c.name || '', wanted)),
        ).length;
        componentRecall = found / exp.components.length;
      }

      // Totals. estimated_nutrients are PER 100 g (see analysis pipeline notes),
      // so scale each component by its own portion before summing.
      let portionG = 0;
      let calories = 0;
      let protein = 0;
      let carbs = 0;
      let fat = 0;
      for (const c of components) {
        const grams = Number((c as any).est_portion_g) || 0;
        const en: any = (c as any).estimated_nutrients || {};
        const factor = grams / 100;
        portionG += grams;
        calories += (Number(en.calories) || 0) * factor;
        protein += (Number(en.protein_g) || 0) * factor;
        carbs += (Number(en.carbs_g) || 0) * factor;
        fat += (Number(en.fat_g) || 0) * factor;
      }

      const err = (predicted: number, expected?: number) =>
        typeof expected === 'number' ? Math.abs(predicted - expected) : null;

      const caseResult: CaseResult = {
        ...base,
        ok: true,
        latencyMs,
        dishMatch,
        predictedDish,
        componentRecall,
        portionError: err(portionG, exp.portionG),
        caloriesError: err(calories, exp.calories),
        proteinError: err(protein, exp.protein),
        carbsError: err(carbs, exp.carbs),
        fatError: err(fat, exp.fat),
      };
      cases.push(caseResult);

      console.log(
        `  ${dishMatch ? '✓' : '~'} ${entry.id.padEnd(22)} ` +
          `"${predictedDish || '?'}"  ` +
          `kcalΔ=${caseResult.caloriesError === null ? '—' : Math.round(caseResult.caloriesError)}  ` +
          `portionΔ=${caseResult.portionError === null ? '—' : Math.round(caseResult.portionError)}g  ` +
          `${latencyMs}ms`,
      );
    } catch (e: any) {
      cases.push({ ...base, error: e?.message || String(e) });
      console.log(`  ✗ ${entry.id}: ${e?.message}`);
    }
  }

  const summary = summarize(cases);
  printSummary(`OVERALL (${model})`, summary);

  // Sliced by cuisine — "good on Western food, bad on local dishes" is the
  // answer that actually drives what to fine-tune, and an average hides it.
  const cuisines = [...new Set(cases.map((c) => c.cuisine))];
  const bySlice: Record<string, any> = {};
  if (cuisines.length > 1) {
    for (const cuisine of cuisines) {
      const slice = summarize(cases.filter((c) => c.cuisine === cuisine));
      bySlice[cuisine] = slice;
      printSummary(`slice: ${cuisine}`, slice);
    }
  }

  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = path.join(RESULTS_DIR, `${model.replace(/[^\w.-]/g, '_')}-${stamp}.json`);
  fs.writeFileSync(
    outPath,
    JSON.stringify({ model, endpoint: baseUrl, ranAt: new Date().toISOString(), summary, bySlice, cases }, null, 2),
  );
  console.log(`\nSaved → ${outPath}`);
  console.log(`Compare with:  pnpm run eval:vision -- --compare <other.json> ${path.relative(process.cwd(), outPath)}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

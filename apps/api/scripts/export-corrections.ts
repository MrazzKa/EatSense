/**
 * Export captured corrections as a training / evaluation dataset.
 *
 * This is the other half of capturing corrections: without an export they are
 * just rows. It writes JSONL, which is what every fine-tuning provider
 * (Together, Fireworks, a local LoRA run) expects.
 *
 * PRIVACY: exports the correction pairs only — text and numbers. It never emits
 * userId, mealId, analysisId or anything else that points back at a person, even
 * for users who opted into linkage. Those columns exist so a user can withdraw
 * consent and have their rows un-linked; they are not part of the dataset.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/export-corrections.ts
 *   npx ts-node -r tsconfig-paths/register scripts/export-corrections.ts --since 2026-07-01 --out data.jsonl
 *   npx ts-node -r tsconfig-paths/register scripts/export-corrections.ts --stats
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** Only keep a pair when the user actually changed something meaningful. */
function isUseful(row: any): boolean {
  const nameChanged =
    !!row.correctedName &&
    String(row.originalName || '').trim().toLowerCase() !== String(row.correctedName).trim().toLowerCase();
  const numberChanged = [
    ['originalPortionG', 'correctedPortionG', 1],
    ['originalCalories', 'correctedCalories', 1],
    ['originalProtein', 'correctedProtein', 0.5],
    ['originalCarbs', 'correctedCarbs', 0.5],
    ['originalFat', 'correctedFat', 0.5],
  ].some(([a, b, tol]) => {
    const x = row[a as string];
    const y = row[b as string];
    return typeof x === 'number' && typeof y === 'number' && Math.abs(x - y) > (tol as number);
  });
  return nameChanged || numberChanged;
}

async function main() {
  const since = arg('since');
  const statsOnly = process.argv.includes('--stats');
  const outPath = path.resolve(arg('out') || `corrections-${new Date().toISOString().split('T')[0]}.jsonl`);

  const where: any = {};
  if (since) {
    const d = new Date(since);
    if (isNaN(d.getTime())) {
      console.error(`--since must be a date, got "${since}"`);
      process.exit(1);
    }
    where.createdAt = { gte: d };
  }

  const rows = await prisma.analysisCorrection.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  });

  const useful = rows.filter(isUseful);

  // What is the model actually getting wrong? This is the number that decides
  // what to fine-tune first.
  const byType = new Map<string, number>();
  const byCategory = new Map<string, number>();
  for (const r of useful) {
    byType.set(r.correctionType, (byType.get(r.correctionType) || 0) + 1);
    const cat = r.foodCategory || 'uncategorized';
    byCategory.set(cat, (byCategory.get(cat) || 0) + 1);
  }

  console.log(`Rows in table:        ${rows.length}`);
  console.log(`Useful pairs:         ${useful.length}`);
  console.log(`Linked to a user:     ${useful.filter((r) => r.userId).length} (consented)`);
  console.log(`Anonymous:            ${useful.filter((r) => !r.userId).length}`);
  console.log('\nBy correction type:');
  for (const [k, v] of [...byType.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(20)} ${v}`);
  }
  console.log('\nBy food category:');
  for (const [k, v] of [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    console.log(`  ${k.padEnd(20)} ${v}`);
  }

  if (statsOnly) return;

  if (useful.length === 0) {
    console.log('\nNothing to export yet. Corrections accumulate as users fix analyses.');
    return;
  }

  const lines = useful.map((r) =>
    JSON.stringify({
      wrong: {
        name: r.originalName,
        portionG: r.originalPortionG,
        calories: r.originalCalories,
        protein: r.originalProtein,
        carbs: r.originalCarbs,
        fat: r.originalFat,
      },
      right: {
        name: r.correctedName ?? r.originalName,
        portionG: r.correctedPortionG,
        calories: r.correctedCalories,
        protein: r.correctedProtein,
        carbs: r.correctedCarbs,
        fat: r.correctedFat,
      },
      correctionType: r.correctionType,
      foodCategory: r.foodCategory,
      // Day only, not a timestamp — enough to split train/eval chronologically
      // without being a per-user fingerprint.
      day: r.createdAt.toISOString().split('T')[0],
    }),
  );

  fs.writeFileSync(outPath, lines.join('\n') + '\n');
  console.log(`\nWrote ${lines.length} pairs → ${outPath}`);
  console.log('Split chronologically (older = train, newest = eval) so you never evaluate on data you trained on.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

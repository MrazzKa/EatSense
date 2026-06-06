/**
 * One-off: recompute goal-aware dailyCalories for existing profiles.
 *
 * Background: until 2026-06-06 both onboarding and the backend computed pure TDEE
 * (BMR × activity) and ignored the user's goal, so weight-loss users got
 * maintenance calories everywhere (dashboard ring, AI assistant, reports). The
 * formula was fixed to apply a goal factor (lose ×0.85 / gain ×1.10 / maintain
 * ×1.0, floor 1200). This backfills the corrected target for existing users.
 *
 * Safe: skips profiles with a manual override (preferences.isManualCalories===true)
 * and profiles missing the inputs needed to compute a value. Idempotent — running
 * twice produces the same result. Dry-run by default; pass --apply to write.
 *
 * Run:  npx ts-node scripts/recalc-daily-calories.ts            (dry-run)
 *       npx ts-node scripts/recalc-daily-calories.ts --apply    (write)
 */
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

for (const p of [path.resolve(__dirname, '../.env'), path.resolve(process.cwd(), '.env')]) {
  const r = dotenv.config({ path: p });
  if (!r.error && process.env.DATABASE_URL) break;
}

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

const ACTIVITY: Record<string, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extremely_active: 1.9,
};

function goalAwareCalories(p: any): number | null {
  const { height, weight, age, gender, activityLevel, goal } = p;
  if (!height || !weight || !age || !gender || !activityLevel) return null;
  const bmr = gender === 'male'
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;
  const tdee = bmr * (ACTIVITY[activityLevel] || 1.2);
  const goalFactor = goal === 'lose_weight' ? 0.85 : goal === 'gain_weight' ? 1.10 : 1.0;
  return Math.max(1200, Math.round(tdee * goalFactor));
}

async function main() {
  console.log(`[recalc-daily-calories] mode: ${APPLY ? 'APPLY (writing)' : 'DRY-RUN (no writes)'}`);
  const profiles = await prisma.userProfile.findMany({
    select: {
      id: true, userId: true, height: true, weight: true, age: true,
      gender: true, activityLevel: true, goal: true, dailyCalories: true, preferences: true,
    },
  });
  console.log(`[recalc-daily-calories] scanning ${profiles.length} profiles…`);

  let updated = 0, skippedManual = 0, skippedNoInputs = 0, unchanged = 0;

  for (const p of profiles) {
    const prefs = (p.preferences as any) || {};
    if (prefs.isManualCalories === true) { skippedManual++; continue; }

    const next = goalAwareCalories(p);
    if (next == null) { skippedNoInputs++; continue; }
    if (next === p.dailyCalories) { unchanged++; continue; }

    console.log(`  ${p.userId}: ${p.dailyCalories ?? '—'} → ${next} (goal=${p.goal || 'n/a'})`);
    if (APPLY) {
      await prisma.userProfile.update({ where: { id: p.id }, data: { dailyCalories: next } });
    }
    updated++;
  }

  console.log(`[recalc-daily-calories] done. ${APPLY ? 'updated' : 'would update'}=${updated}, unchanged=${unchanged}, skippedManual=${skippedManual}, skippedNoInputs=${skippedNoInputs}`);
  if (!APPLY && updated > 0) console.log('[recalc-daily-calories] re-run with --apply to write these changes.');
}

main()
  .catch((e) => { console.error('[recalc-daily-calories] error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

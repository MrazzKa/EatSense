import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

/** A meal item as it stood before the user touched it. */
export interface CorrectionSnapshot {
  name: string;
  weight?: number | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
}

/**
 * Captures the "model said X → user said Y" delta whenever someone corrects an
 * analyzed meal.
 *
 * WHY THIS EXISTS
 * ---------------
 * The `AnalysisCorrection` table has been in the schema for a long time but
 * nothing ever wrote to it — the app has a "Correct" button, corrections flow
 * through `editMealItems` / `updateMealItem`, the privacy policy even mentions
 * that we keep them, yet the delta was silently discarded. Since the nutrition
 * pipeline went GPT-only (USDA sits behind `USE_USDA_NUTRITION`), every number
 * the user fixes is literally "corrected model output" — the exact training and
 * evaluation signal we need, and it was leaking on every single edit.
 *
 * PRIVACY
 * -------
 * By default we store the delta ANONYMOUSLY: text and numbers only, no `userId`.
 * That keeps a growing dataset lawful under GDPR/FADP without asking anyone for
 * anything. Linking a correction to its author (and keeping the photo that
 * produced it) happens only when the user explicitly opts in via the
 * "help improve accuracy" toggle — see `isLinkageAllowed`.
 *
 * Every method here is best-effort: capturing a correction must NEVER be able to
 * fail the user's edit.
 */
@Injectable()
export class AnalysisCorrectionService {
  private readonly logger = new Logger(AnalysisCorrectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Has this user opted in to linking their corrections (and photos) to them? */
  async isLinkageAllowed(userId: string): Promise<boolean> {
    try {
      const profile = await this.prisma.userProfile.findUnique({
        where: { userId },
        select: { preferences: true },
      });
      const prefs = (profile?.preferences as any) || {};
      return prefs.improveAccuracy === true;
    } catch {
      return false;
    }
  }

  private num(v: any): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private changed(a: number | null, b: number | null, tolerance = 0.5): boolean {
    if (a === null || b === null) return a !== b;
    return Math.abs(a - b) > tolerance;
  }

  /**
   * Classify what the user actually fixed, so the dataset can be sliced later
   * ("the model is fine on names but bad at portions" is an answerable question
   * only if we record this).
   */
  private classify(before: CorrectionSnapshot, after: CorrectionSnapshot): string | null {
    const nameChanged =
      !!after.name && before.name.trim().toLowerCase() !== after.name.trim().toLowerCase();
    const portionChanged = this.changed(this.num(before.weight), this.num(after.weight), 1);
    const macrosChanged =
      this.changed(this.num(before.calories), this.num(after.calories), 1) ||
      this.changed(this.num(before.protein), this.num(after.protein)) ||
      this.changed(this.num(before.carbs), this.num(after.carbs)) ||
      this.changed(this.num(before.fat), this.num(after.fat));

    const parts: string[] = [];
    if (nameChanged) parts.push('name');
    if (portionChanged) parts.push('portion');
    if (macrosChanged) parts.push('macros');

    return parts.length ? parts.join('+') : null;
  }

  /**
   * Record one before/after pair. Returns silently when nothing meaningfully
   * changed, so re-saving an untouched meal does not pollute the dataset.
   */
  async record(params: {
    userId: string;
    before: CorrectionSnapshot;
    after: CorrectionSnapshot;
    analysisId?: string | null;
    mealId?: string | null;
    itemId?: string | null;
    foodCategory?: string | null;
    /** Consent already resolved by the caller — lets a batch look it up once. */
    linked?: boolean;
  }): Promise<void> {
    try {
      const { before, after } = params;
      const correctionType = this.classify(before, after);
      if (!correctionType) return;

      // Without consent the row is stored with NO owner and no ids pointing back
      // at the user's data — just "this text/number was wrong, that one is right".
      const linked =
        typeof params.linked === 'boolean'
          ? params.linked
          : await this.isLinkageAllowed(params.userId);

      await this.prisma.analysisCorrection.create({
        data: {
          userId: linked ? params.userId : null,
          analysisId: linked ? params.analysisId || null : null,
          mealId: linked ? params.mealId || null : null,
          itemId: linked ? params.itemId || null : null,
          originalName: before.name,
          correctedName: after.name || null,
          originalPortionG: this.num(before.weight),
          correctedPortionG: this.num(after.weight),
          originalCalories: this.num(before.calories),
          correctedCalories: this.num(after.calories),
          originalProtein: this.num(before.protein),
          correctedProtein: this.num(after.protein),
          originalCarbs: this.num(before.carbs),
          correctedCarbs: this.num(after.carbs),
          originalFat: this.num(before.fat),
          correctedFat: this.num(after.fat),
          correctionType,
          foodCategory: params.foodCategory || null,
        },
      });
    } catch (e: any) {
      this.logger.warn(`[AnalysisCorrection] could not record correction: ${e?.message}`);
    }
  }

  /**
   * Diff a whole item list.
   *
   * Items are matched by id. Position is used ONLY when the caller supplied no
   * ids at all, never as a per-item fallback: `editMealItems` gives a brand-new
   * item a synthetic id (`meal-item-<idx>`) that matches nothing, so a per-item
   * positional fallback would pair that new item with whatever happened to sit at
   * the same index and record a correction that never happened — "model said
   * apple, user said cheese". False labels are worse than missing ones in a
   * training set, so an unmatched item is skipped.
   */
  async recordBatch(params: {
    userId: string;
    before: (CorrectionSnapshot & { id?: string })[];
    after: (CorrectionSnapshot & { id?: string })[];
    analysisId?: string | null;
    mealId?: string | null;
  }): Promise<void> {
    try {
      const { before, after } = params;
      const byId = new Map(before.filter((b) => b.id).map((b) => [b.id as string, b]));
      const positionalOnly = byId.size === 0;
      // Resolve consent once for the whole batch instead of once per item.
      const linked = await this.isLinkageAllowed(params.userId);

      await Promise.all(
        after.map(async (afterItem, idx) => {
          const beforeItem = positionalOnly
            ? before[idx]
            : afterItem.id
              ? byId.get(afterItem.id)
              : undefined;
          // A newly added item has no "before" — that is an addition, not a
          // correction of a model prediction, so there is nothing to learn from.
          if (!beforeItem) return;
          await this.record({
            userId: params.userId,
            before: beforeItem,
            after: afterItem,
            analysisId: params.analysisId,
            mealId: params.mealId,
            itemId: afterItem.id || beforeItem.id || null,
            linked,
          });
        }),
      );
    } catch (e: any) {
      this.logger.warn(`[AnalysisCorrection] batch capture failed: ${e?.message}`);
    }
  }
}

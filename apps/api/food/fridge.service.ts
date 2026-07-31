import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import OpenAI from 'openai';
import { PrismaService } from '../prisma.service';
import { RedisService } from '../redis/redis.service';
import { MealsService } from '../meals/meals.service';

export type SupportedLocale = 'en' | 'ru' | 'kk' | 'fr' | 'de' | 'es';

export interface FridgeIngredient {
  /** Localized display name of the detected product. */
  name: string;
  /** Rough grouping so the UI can bucket chips. */
  category?: 'protein' | 'vegetable' | 'fruit' | 'dairy' | 'grain' | 'condiment' | 'drink' | 'other';
  /** Free-form quantity hint if visible, e.g. "half", "1 pack", "a few". */
  quantityHint?: string;
}

export interface FridgeRecipe {
  title: string;
  /** Which of the user's available ingredients this recipe uses. */
  usesIngredients: string[];
  /** Common staples the user may still need to buy. */
  alsoNeed: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timeMinutes?: number;
  steps: string[];
}

/**
 * FridgeService — "photograph your fridge → cook from what you have".
 *
 * Two cheap OpenAI calls:
 *  1. scanFridge(image)  → a plain INVENTORY of visible products (no nutrition math →
 *     short output → fast & cheap, unlike full meal analysis which is output-token bound).
 *  2. getRecipes(items)  → dishes cookable from those items, personalized by the user's
 *     goal / calorie target / diet preferences, with allergens excluded (server-enforced).
 *
 * Mirrors VisionService's hardened OpenAI client (identity encoding to dodge the
 * node-fetch gzip "Premature close" bug; SDK retries off, we retry in-loop).
 */
@Injectable()
export class FridgeService {
  private readonly logger = new Logger(FridgeService.name);
  private readonly openai: OpenAI;
  private readonly model = process.env.VISION_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  private readonly MAX_RETRIES = parseInt(process.env.VISION_MAX_RETRIES || '2', 10);
  private readonly RETRY_DELAY_MS = 500;
  private readonly timeoutMs = parseInt(process.env.VISION_API_TIMEOUT_MS || '90000', 10);

  /** How many past scans a free user can browse. Pro sees the full archive. */
  private readonly FREE_HISTORY_ITEMS = parseInt(process.env.FREE_FRIDGE_HISTORY_ITEMS || '5', 10);
  /** Recipe cache TTL — same ingredients + same diet context → same answer. */
  private readonly RECIPE_CACHE_TTL_S = parseInt(process.env.FRIDGE_RECIPE_CACHE_TTL_S || '86400', 10);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly mealsService: MealsService,
  ) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      this.logger.error('[FridgeService] OPENAI_API_KEY is not configured!');
    }
    this.openai = new OpenAI({
      apiKey,
      timeout: this.timeoutMs,
      maxRetries: 0,
      defaultHeaders: { 'Accept-Encoding': 'identity' },
    });
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isRetryableError(error: any): boolean {
    if (!error) return false;
    const blob = `${error.message || ''} ${error.cause?.message || ''}`.toLowerCase();
    const name = (error.name || '').toLowerCase();
    return (
      blob.includes('timeout') || blob.includes('timed out') || blob.includes('network') ||
      blob.includes('econnreset') || blob.includes('premature close') || blob.includes('socket hang up') ||
      blob.includes('connection error') || blob.includes('fetch failed') || blob.includes('aborted') ||
      name === 'fetcherror' || name === 'apiconnectionerror' || (error.status >= 500 && error.status < 600)
    );
  }

  /** Chat completion with in-loop retry + backoff. Returns parsed JSON. */
  private async completeJson(messages: any[], maxTokens: number): Promise<any> {
    let lastError: any = null;
    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          await this.delay(this.RETRY_DELAY_MS * Math.pow(2, attempt - 1));
          this.logger.warn(`[FridgeService] retry ${attempt}/${this.MAX_RETRIES}`);
        }
        const res = await this.openai.chat.completions.create(
          {
            model: this.model,
            messages,
            max_completion_tokens: maxTokens,
            temperature: 0.3,
            response_format: { type: 'json_object' },
          },
          { timeout: this.timeoutMs },
        );
        const content = res.choices?.[0]?.message?.content;
        if (!content) throw new Error('Empty response from model');
        return JSON.parse(content);
      } catch (err: any) {
        lastError = err;
        if (attempt < this.MAX_RETRIES && this.isRetryableError(err)) continue;
        break;
      }
    }
    throw lastError || new Error('Model call failed');
  }

  private localeName(locale: SupportedLocale): string {
    return (
      {
        en: 'English', ru: 'Russian', kk: 'Kazakh', fr: 'French', de: 'German', es: 'Spanish',
      } as Record<SupportedLocale, string>
    )[locale] || 'English';
  }

  /**
   * Recognize the products visible in a fridge / pantry photo.
   *
   * The photo itself is never stored — only the recognized inventory. The
   * FridgeScan row it creates is what makes the history screen possible and
   * what DailyLimitGuard falls back to counting when Redis is unavailable.
   */
  async scanFridge(
    imageBase64: string,
    locale: SupportedLocale = 'en',
    userId?: string,
  ): Promise<{ scanId: string | null; ingredients: FridgeIngredient[] }> {
    if (!imageBase64) return { scanId: null, ingredients: [] };
    const clean = imageBase64.replace(/^data:[^;]+;base64,/, '');

    const systemPrompt = `You are a kitchen assistant. Look at a photo of the inside of a fridge or pantry and list the FOOD PRODUCTS you can see.

## OUTPUT (compact JSON only)
{"ingredients":[{"name":"...", "category":"protein|vegetable|fruit|dairy|grain|condiment|drink|other", "quantityHint":"optional short hint or null"}]}

## RULES
1. List only distinct edible products actually visible. Do NOT invent items you cannot see.
2. Group obvious duplicates (e.g. "3 eggs" → one entry name "eggs", quantityHint "about 3").
3. Ignore non-food items, packaging text, and brand logos — name the product generically (e.g. "milk", not the brand).
4. Write each "name" in ${this.localeName(locale)}.
5. Keep it to the most useful ~20 items. Output ONLY valid JSON, no prose.`;

    try {
      const parsed = await this.completeJson(
        [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'List the food products visible in this fridge/pantry photo.' },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${clean}` } },
            ],
          },
        ],
        700,
      );
      const ingredients: FridgeIngredient[] = Array.isArray(parsed?.ingredients)
        ? parsed.ingredients
            .filter((i: any) => i && typeof i.name === 'string' && i.name.trim())
            .map((i: any) => ({
              name: String(i.name).trim(),
              category: i.category,
              quantityHint: i.quantityHint || undefined,
            }))
        : [];

      let scanId: string | null = null;
      if (userId) {
        // Persist best-effort: a history write must never turn a successful scan
        // into an error the user sees.
        try {
          const scan = await this.prisma.fridgeScan.create({
            data: {
              userId,
              ingredients: ingredients as any,
              detectedCount: ingredients.length,
              editedCount: 0,
              locale,
            },
            select: { id: true },
          });
          scanId = scan.id;
        } catch (e: any) {
          this.logger.warn(`[FridgeService] could not persist scan: ${e?.message}`);
        }
      }

      return { scanId, ingredients };
    } catch (err: any) {
      this.logger.error(`[FridgeService] scanFridge failed: ${err?.message}`);
      throw err;
    }
  }

  /**
   * Suggest recipes cookable from the given ingredients, personalized & allergy-safe.
   */
  async getRecipes(params: {
    ingredients: string[];
    userId: string;
    locale?: SupportedLocale;
    /** Scan these ingredients came from, so history and recipes stay linked. */
    scanId?: string;
    /** Ask the model for a different set than the one already saved for this scan. */
    excludeTitles?: string[];
  }): Promise<{ recipes: (FridgeRecipe & { id?: string })[] }> {
    const locale = params.locale || 'en';
    const ingredients = (params.ingredients || [])
      .map((i) => String(i || '').trim())
      .filter(Boolean)
      .slice(0, 40);
    if (ingredients.length === 0) return { recipes: [] };

    // Personalization context (best-effort — recipes still work without a profile).
    const profile = await this.prisma.userProfile.findUnique({ where: { userId: params.userId } }).catch(() => null);
    const preferences = ((profile?.preferences as any) || {}) as any;
    const allergies: string[] = Array.isArray(preferences.allergies) ? preferences.allergies : [];
    const dietaryPreferences: string[] = Array.isArray(preferences.dietaryPreferences) ? preferences.dietaryPreferences : [];
    const goal = (profile?.goal as string) || 'maintain_weight';
    const dailyCalories = profile?.dailyCalories || null;

    const constraints: string[] = [];
    if (allergies.length) constraints.push(`ALLERGIES — never use, and never suggest as "alsoNeed": ${allergies.join(', ')}.`);
    if (dietaryPreferences.length) constraints.push(`Dietary preferences: ${dietaryPreferences.join(', ')}.`);
    constraints.push(`User goal: ${goal}.`);
    if (dailyCalories) constraints.push(`Daily calorie target ≈ ${dailyCalories} kcal — keep single-meal calories sensible against it.`);

    const systemPrompt = `You are a practical home-cooking assistant. Given the ingredients a user has, propose realistic dishes they can cook mostly from those ingredients.

## CONTEXT
${constraints.join('\n')}

## OUTPUT (compact JSON only)
{"recipes":[{
 "title":"...",
 "usesIngredients":["from the user's list only"],
 "alsoNeed":["common staples they'd likely still need"],
 "calories":0,"protein":0,"carbs":0,"fat":0,
 "timeMinutes":0,
 "steps":["short step","short step"]
}]}

## RULES
1. Prefer recipes that use as many of the user's ingredients as possible and need FEW extra staples.
2. Respect all constraints above — allergens must never appear anywhere.
3. calories/protein/carbs/fat are per single serving, realistic integers.
4. Give 3 recipes, 3–6 short steps each. Write ALL text in ${this.localeName(locale)}.
5. Output ONLY valid JSON, no prose.${
      params.excludeTitles?.length
        ? `\n6. Do NOT repeat any of these dishes, the user already has them: ${params.excludeTitles.join(', ')}.`
        : ''
    }`;

    // Identical ingredients + identical diet context ⇒ identical answer. Serving it
    // from cache keeps "what can I cook?" instant and off the OpenAI bill. Skipped
    // when the user explicitly asks for a different set.
    const cacheKey = params.excludeTitles?.length ? null : this.recipeCacheKey(ingredients, goal, dietaryPreferences, allergies, locale);
    if (cacheKey) {
      const cached = await this.redis.get(cacheKey).catch(() => null);
      if (cached) {
        try {
          const recipes = JSON.parse(cached) as FridgeRecipe[];
          const persisted = await this.persistRecipes(recipes, params.userId, params.scanId);
          return { recipes: persisted };
        } catch {
          /* corrupt cache entry — fall through and regenerate */
        }
      }
    }

    try {
      const parsed = await this.completeJson(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Ingredients I have: ${ingredients.join(', ')}. What can I cook?` },
        ],
        1400,
      );
      let recipes: FridgeRecipe[] = Array.isArray(parsed?.recipes) ? parsed.recipes : [];
      // Server-side allergy guard: drop any recipe that still mentions an allergen.
      if (allergies.length) {
        const allergenRe = new RegExp(allergies.map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');
        recipes = recipes.filter((r) => {
          const blob = `${r.title} ${(r.usesIngredients || []).join(' ')} ${(r.alsoNeed || []).join(' ')} ${(r.steps || []).join(' ')}`;
          return !allergenRe.test(blob);
        });
      }
      recipes = recipes.slice(0, 3).map((r) => ({
        title: String(r.title || '').trim(),
        usesIngredients: Array.isArray(r.usesIngredients) ? r.usesIngredients.map(String) : [],
        alsoNeed: Array.isArray(r.alsoNeed) ? r.alsoNeed.map(String) : [],
        calories: Math.max(0, Math.round(Number(r.calories) || 0)),
        protein: Math.max(0, Math.round(Number(r.protein) || 0)),
        carbs: Math.max(0, Math.round(Number(r.carbs) || 0)),
        fat: Math.max(0, Math.round(Number(r.fat) || 0)),
        timeMinutes: r.timeMinutes ? Math.max(0, Math.round(Number(r.timeMinutes))) : undefined,
        steps: Array.isArray(r.steps) ? r.steps.map(String).filter(Boolean) : [],
      }));

      if (cacheKey && recipes.length) {
        await this.redis.set(cacheKey, JSON.stringify(recipes), this.RECIPE_CACHE_TTL_S).catch(() => {});
      }

      const persisted = await this.persistRecipes(recipes, params.userId, params.scanId);
      return { recipes: persisted };
    } catch (err: any) {
      this.logger.error(`[FridgeService] getRecipes failed: ${err?.message}`);
      throw err;
    }
  }

  // ── Persistence & history ──────────────────────────────────────────────────

  private recipeCacheKey(
    ingredients: string[],
    goal: string,
    dietaryPreferences: string[],
    allergies: string[],
    locale: string,
  ): string {
    const material = JSON.stringify([
      [...ingredients].map((i) => i.toLowerCase()).sort(),
      goal,
      [...dietaryPreferences].sort(),
      [...allergies].sort(),
      locale,
    ]);
    return `fridge:recipes:${createHash('sha1').update(material).digest('hex')}`;
  }

  /** Save generated recipes so the user can favourite / re-open / cook them later. */
  private async persistRecipes(
    recipes: FridgeRecipe[],
    userId: string,
    scanId?: string,
  ): Promise<(FridgeRecipe & { id?: string })[]> {
    if (!recipes.length) return recipes;
    try {
      // Going back to the ingredient list and asking again (or a cache hit)
      // regenerates the same three dishes. Without this the history would fill
      // up with duplicates of the same recipe under one scan.
      let existing = new Map<string, string>();
      if (scanId) {
        const rows = await this.prisma.fridgeRecipe.findMany({
          where: { scanId, userId },
          select: { id: true, title: true },
        });
        existing = new Map(rows.map((r) => [r.title.trim().toLowerCase(), r.id]));
      }

      return await Promise.all(
        recipes.map(async (r) => {
          const known = existing.get(String(r.title || '').trim().toLowerCase());
          if (known) return { ...r, id: known };

          const row = await this.prisma.fridgeRecipe.create({
            data: {
              userId,
              scanId: scanId || null,
              title: r.title,
              usesIngredients: r.usesIngredients as any,
              alsoNeed: r.alsoNeed as any,
              calories: r.calories,
              protein: r.protein,
              carbs: r.carbs,
              fat: r.fat,
              timeMinutes: r.timeMinutes ?? null,
              steps: r.steps as any,
            },
            select: { id: true },
          });
          return { ...r, id: row.id };
        }),
      );
    } catch (e: any) {
      // History is a nice-to-have; a failed write must not cost the user the
      // recipes they just paid a scan for.
      this.logger.warn(`[FridgeService] could not persist recipes: ${e?.message}`);
      return recipes;
    }
  }

  /**
   * Record the user's edits to the detected ingredient list.
   *
   * The chips the user adds/removes on the scan screen are corrections to the
   * vision model's output — the same signal AnalysisCorrection captures for meals.
   * Storing the final list plus how much it changed costs nothing and builds a
   * labeled dataset for fridge recognition.
   */
  async recordIngredientEdits(userId: string, scanId: string, finalIngredients: string[]): Promise<void> {
    try {
      const scan = await this.prisma.fridgeScan.findFirst({
        where: { id: scanId, userId },
        select: { id: true, ingredients: true, detectedCount: true, editedCount: true },
      });
      if (!scan) return;

      // Record ONCE. On a second call `ingredients` already holds the edited
      // list, so re-diffing would compare it against itself, compute zero and
      // erase the very signal we captured the first time.
      if (scan.editedCount > 0) return;

      const detected = (Array.isArray(scan.ingredients) ? scan.ingredients : []) as unknown as FridgeIngredient[];
      const byName = new Map(
        detected.map((i) => [String(i?.name || '').trim().toLowerCase(), i]),
      );
      const finalNames = finalIngredients.map((i) => String(i || '').trim()).filter(Boolean);
      const finalSet = new Set(finalNames.map((n) => n.toLowerCase()));

      const removed = [...byName.keys()].filter((n) => !finalSet.has(n)).length;
      const added = finalNames.filter((n) => !byName.has(n.toLowerCase())).length;

      // Keep the model's category / quantity hint for items the user left alone;
      // rebuilding the list from bare names would strip them out of the history.
      const merged = finalNames.map((name) => byName.get(name.toLowerCase()) || { name });

      await this.prisma.fridgeScan.update({
        where: { id: scan.id },
        data: {
          ingredients: merged as any,
          editedCount: removed + added,
        },
      });
    } catch (e: any) {
      this.logger.warn(`[FridgeService] could not record ingredient edits: ${e?.message}`);
    }
  }

  /**
   * Scan history, newest first. Free users see only the most recent few — the cap
   * is applied HERE, on the server, so it cannot be bypassed by calling the API
   * directly.
   */
  async getHistory(userId: string, isPro: boolean, limit = 30, offset = 0) {
    const effectiveLimit = isPro ? Math.min(limit, 100) : Math.min(limit, this.FREE_HISTORY_ITEMS);
    const effectiveOffset = isPro ? offset : 0;

    const [scans, total] = await Promise.all([
      this.prisma.fridgeScan.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: effectiveLimit,
        skip: effectiveOffset,
        include: {
          recipes: {
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      this.prisma.fridgeScan.count({ where: { userId } }),
    ]);

    return {
      scans,
      total,
      // The client uses this to show "N older scans — upgrade to see them".
      lockedCount: isPro ? 0 : Math.max(0, total - scans.length),
      isPro,
    };
  }

  async getScan(userId: string, scanId: string) {
    const scan = await this.prisma.fridgeScan.findFirst({
      where: { id: scanId, userId },
      include: { recipes: { orderBy: { createdAt: 'asc' } } },
    });
    if (!scan) throw new NotFoundException('Scan not found');
    return scan;
  }

  async deleteScan(userId: string, scanId: string) {
    const scan = await this.prisma.fridgeScan.findFirst({ where: { id: scanId, userId }, select: { id: true } });
    if (!scan) throw new NotFoundException('Scan not found');
    await this.prisma.fridgeScan.delete({ where: { id: scan.id } });
    return { success: true };
  }

  async getFavorites(userId: string, isPro: boolean) {
    const freeLimit = parseInt(process.env.FREE_FRIDGE_FAVORITES || '3', 10);
    const [recipes, total] = await Promise.all([
      this.prisma.fridgeRecipe.findMany({
        where: { userId, isFavorite: true },
        orderBy: { createdAt: 'desc' },
        take: isPro ? 200 : freeLimit,
      }),
      this.prisma.fridgeRecipe.count({ where: { userId, isFavorite: true } }),
    ]);
    return { recipes, total, lockedCount: isPro ? 0 : Math.max(0, total - recipes.length), isPro };
  }

  async toggleFavorite(userId: string, recipeId: string, isPro: boolean) {
    const recipe = await this.prisma.fridgeRecipe.findFirst({
      where: { id: recipeId, userId },
      select: { id: true, isFavorite: true },
    });
    if (!recipe) throw new NotFoundException('Recipe not found');

    // Only adding is capped — a free user can always un-favourite.
    if (!recipe.isFavorite && !isPro) {
      const freeLimit = parseInt(process.env.FREE_FRIDGE_FAVORITES || '3', 10);
      const current = await this.prisma.fridgeRecipe.count({ where: { userId, isFavorite: true } });
      if (current >= freeLimit) {
        return { id: recipe.id, isFavorite: false, limitReached: true, limit: freeLimit };
      }
    }

    const updated = await this.prisma.fridgeRecipe.update({
      where: { id: recipe.id },
      data: { isFavorite: !recipe.isFavorite },
      select: { id: true, isFavorite: true },
    });
    return { ...updated, limitReached: false };
  }

  /**
   * "I cooked this" → log the recipe to the diary as a meal.
   *
   * This is what connects the fridge feature back to the tracker: until now a
   * recipe was a dead end, and anything the user actually cooked had to be
   * re-photographed or typed in by hand.
   */
  async markCooked(userId: string, recipeId: string, mealType?: string) {
    const recipe = await this.prisma.fridgeRecipe.findFirst({ where: { id: recipeId, userId } });
    if (!recipe) throw new NotFoundException('Recipe not found');

    const meal = await this.mealsService.createMeal(userId, {
      name: recipe.title,
      type: (mealType || 'MEAL').toUpperCase(),
      items: [
        {
          name: recipe.title,
          calories: recipe.calories,
          protein: recipe.protein,
          fat: recipe.fat,
          carbs: recipe.carbs,
          weight: 0,
        },
      ],
    } as any);

    const updated = await this.prisma.fridgeRecipe.update({
      where: { id: recipe.id },
      data: { cookedCount: { increment: 1 }, lastCookedAt: new Date() },
      select: { id: true, cookedCount: true, lastCookedAt: true },
    });

    return { ...updated, meal };
  }
}

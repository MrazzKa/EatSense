import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma.service';

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

  constructor(private readonly prisma: PrismaService) {
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
   */
  async scanFridge(imageBase64: string, locale: SupportedLocale = 'en'): Promise<{ ingredients: FridgeIngredient[] }> {
    if (!imageBase64) return { ingredients: [] };
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
      return { ingredients };
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
  }): Promise<{ recipes: FridgeRecipe[] }> {
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
5. Output ONLY valid JSON, no prose.`;

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
      return { recipes };
    } catch (err: any) {
      this.logger.error(`[FridgeService] getRecipes failed: ${err?.message}`);
      throw err;
    }
  }
}

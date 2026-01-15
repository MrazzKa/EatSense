import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import OpenAI from 'openai';
import { z } from 'zod';
import { CacheService } from '../cache/cache.service';
import * as crypto from 'crypto';
import * as sharp from 'sharp';

// Maximum base64 size for Vision API (characters)
// GPT-4o can handle up to 20MB, but we limit to 1MB for speed
const MAX_BASE64_SIZE = 1_000_000; // ~750KB base64 = ~560KB image

// Target dimensions for image optimization
const TARGET_MAX_DIMENSION = 1024; // pixels

// Version for cache key - increment when prompt or schema changes
const VISION_PROMPT_VERSION = 'omega_v3.3_2026-01-09_nutrition_fix';

// Dish-level identification (NEW - for proper dish naming)
const VisionDishSchema = z.object({
  dish_name: z.string().nullable(), // Canonical dish name or null if no recognizable dish
  dish_name_local: z.string().nullable().optional(), // Localized dish name (e.g., "Борщ")
  dish_name_confidence: z.number().min(0).max(1), // Confidence in dish identification
  dish_name_reasoning: z.string().optional(), // Brief justification for the dish name
  dish_type: z.enum(['main', 'side', 'dessert', 'snack', 'drink', 'breakfast', 'salad', 'soup', 'appetizer', 'mixed_plate']).optional(),
  dish_family: z.string().optional(), // OMEGA v3.2: dish family (e.g., "pasta_family", "curry_family")
  cuisine: z.string().nullable().optional(), // e.g., "russian", "italian", "asian", "unknown"
});

const VisionComponentSchema = z.object({
  // Core identification
  name: z.string(), // Base name in English, lowercase (e.g., "salmon", "quinoa")
  name_local: z.string().nullable().optional(), // Base name in local language (e.g., "лосось") - nullable for GPT compatibility
  display_name: z.string().nullable().optional(), // Short display name EN, Title Case, 1-2 words (e.g., "Salmon")
  display_name_local: z.string().nullable().optional(), // Short display name RU, 1-2 words (e.g., "Лосось") - nullable for GPT compatibility

  // OMEGA v3.2 fields
  // NOTE: Vision sometimes returns non-standard itemType values. We normalize them:
  // 'composite' or 'dish' → 'composite_dish', 'sauce' → 'ingredient'
  id: z.string().optional(), // Stable ID (A, B, C...)
  itemType: z.enum(['ingredient', 'composite_dish', 'composite', 'dish', 'sauce', 'drink', 'side', 'garnish', 'condiment', 'topping', 'main']).optional().transform(val => {
    if (val === 'composite' || val === 'dish' || val === 'main') return 'composite_dish';
    if (val === 'sauce' || val === 'side' || val === 'garnish' || val === 'condiment' || val === 'topping') return 'ingredient';
    return val;
  }),
  portionMode: z.enum(['coverage', 'unit', 'package', 'drink']).optional(),
  visualConfidence: z.number().min(0).max(1).optional(),
  labelConfidence: z.number().min(0).max(1).optional(),
  nutritionConfidence: z.number().min(0).max(1).optional(),
  nutritionSource: z.string().optional(), // e.g., "generic_estimate"
  edibleGrams: z.number().optional(), // Only if bones/shell/peel visible
  volumeMl: z.number().optional(), // Only for drinks
  unitCount: z.number().optional(), // Only for countable items
  drinkType: z.enum(['water', 'coffee', 'tea', 'soda', 'juice', 'alcohol', 'smoothie', 'milk', 'shake', 'unknown']).optional(),
  ingredientBreakdownAvailable: z.boolean().optional(),

  // Minor item flag (for toppings like sesame, nori, herbs)
  is_minor: z.boolean().optional(),

  // Category and state hints for better nutrition lookup
  category_hint: z.enum(['protein', 'grain', 'veg', 'fruit', 'fat', 'seeds', 'spice', 'sauce', 'drink', 'other']).optional(),
  state_hint: z.enum(['raw', 'cooked', 'boiled', 'steamed', 'baked', 'grilled', 'fried', 'dried', 'pickled', 'roasted', 'sauteed', 'melted', 'braised', 'smoked', 'frozen', 'unknown']).optional(),

  // Existing fields
  preparation: z.string().optional(),
  est_portion_g: z.number().optional(),
  confidence: z.number().optional(),
  cooking_method: z.enum(['fried', 'deep_fried', 'baked', 'grilled', 'boiled', 'steamed', 'raw', 'mixed', 'roasted', 'sauteed', 'braised', 'smoked', 'melted', 'poached']).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),

  // GPT-estimated nutrients as fallback when USDA/FDC lookup fails
  estimated_nutrients: z.object({
    calories: z.number().optional(),
    protein_g: z.number().optional(),
    carbs_g: z.number().optional(),
    fat_g: z.number().optional(),
    fiber_g: z.number().optional(),
  }).optional(),
});


const VisionHiddenItemSchema = z.object({
  name: z.string(),
  category: z.enum(['cooking_oil', 'butter_or_cream', 'sauce_or_dressing', 'added_sugar', 'breaded_or_batter', 'processed_meat_fillers', 'seasoning', 'spice', 'other']),
  reason: z.string(),
  confidence: z.number().min(0).max(1),
  estimated_grams: z.number().optional(),
});

const VisionArraySchema = z.array(VisionComponentSchema);

// Totals schema for OMEGA v3.2
const VisionTotalsSchema = z.object({
  kcal: z.number().optional(),
  protein: z.number().optional(),
  fat: z.number().optional(),
  carbs: z.number().optional(),
  fiber: z.number().optional(),
});

// NEW: Complete response schema with dish-level identification + OMEGA v3.2 fields
const VisionCompleteResponseSchema = z.object({
  // OMEGA v3.2 context fields
  imageQuality: z.enum(['good', 'medium', 'poor']).optional(),
  containerType: z.enum(['plate', 'bowl', 'cup', 'mug', 'glass', 'bento', 'wrapper', 'package', 'jar', 'bottle', 'basket', 'skewer', 'hand', 'takeaway_box']).optional(),
  servingContext: z.enum(['home', 'restaurant', 'fast_food', 'street_food', 'packaged', 'cafe', 'buffet']).optional(),

  // Dish-level identification (REQUIRED for proper naming)
  dish: VisionDishSchema.optional(),
  // Alternative flat fields for dish (backward compat)
  dish_name: z.string().nullable().optional(),
  dish_name_local: z.string().nullable().optional(),
  dish_name_confidence: z.number().min(0).max(1).optional(),
  dish_name_reasoning: z.string().optional(),
  dish_type: z.enum(['main', 'side', 'dessert', 'snack', 'drink', 'breakfast', 'salad', 'soup', 'appetizer', 'mixed_plate']).optional(),
  dish_family: z.string().optional(), // OMEGA v3.2: dish family (e.g., "pasta_family")
  cuisine: z.string().nullable().optional(),

  // Ingredients
  visible_items: VisionArraySchema,
  hidden_items: z.array(VisionHiddenItemSchema).optional(),

  // OMEGA v3.2 totals and metadata
  totals: VisionTotalsSchema.optional(),
  assumptions: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
});

// Flexible schema: accepts array, { components: [...] }, { items: [...] }, { food_items: [...] }, etc.
const VisionFlexibleSchema = z.union([
  VisionCompleteResponseSchema, // NEW: Full response with dish identification
  VisionArraySchema,
  z.object({
    components: VisionArraySchema,
  }),
  z.object({
    items: VisionArraySchema,
  }),
  z.object({
    food_items: VisionArraySchema,
  }),
  z.object({
    foods: VisionArraySchema,
  }),
  z.object({
    detected_items: VisionArraySchema,
  }),
  z.object({
    visible_items: VisionArraySchema,
    hidden_items: z.array(VisionHiddenItemSchema).optional(),
  }),
]);

// Export types for use in AnalyzeService
export type VisionComponent = z.infer<typeof VisionComponentSchema>;
export type VisionHiddenItem = z.infer<typeof VisionHiddenItemSchema>;
export type VisionDish = z.infer<typeof VisionDishSchema>;

// Vision extraction result with explicit success/error states
export type VisionExtractionStatus = 'success' | 'partial' | 'no_food_detected' | 'parse_error' | 'api_error';

export interface VisionExtractionResult {
  status: VisionExtractionStatus;
  components: VisionComponent[];
  hiddenItems: VisionHiddenItem[];
  // NEW: Dish-level identification from Vision
  dish?: VisionDish;
  // Error details for debugging and user feedback
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  // Metadata about the extraction
  meta?: {
    rawComponentCount?: number;
    validatedComponentCount?: number;
    filteredOutCount?: number;
    parseWarnings?: string[];
  };
}

@Injectable()
export class VisionService {
  private readonly logger = new Logger(VisionService.name);
  private readonly openai: OpenAI;

  // Retry configuration for Vision API calls
  // OPTIMIZED: Only 1 retry to fail fast (2 total attempts max)
  private readonly MAX_RETRIES = 1;
  private readonly RETRY_DELAY_MS = 500;

  constructor(private readonly cache: CacheService) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      this.logger.error('[VisionService] OPENAI_API_KEY is not configured!');
    }
    this.openai = new OpenAI({
      apiKey,
      timeout: 30000, // 30 second timeout (reduced from 45s)
      maxRetries: 0, // No built-in retries (we handle retries ourselves)
    });
  }

  /**
   * Delay helper for retry logic with exponential backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Optimize base64 image for Vision API
   * - Resize if too large
   * - Compress to reduce transfer time
   * - Returns optimized base64 string
   */
  private async optimizeImageBase64(base64: string): Promise<string> {
    const startTime = Date.now();

    // Check if optimization needed
    if (base64.length <= MAX_BASE64_SIZE) {
      this.logger.debug(`[VisionService] Image size OK (${Math.round(base64.length / 1024)}KB), no optimization needed`);
      return base64;
    }

    this.logger.log(`[VisionService] Optimizing large image (${Math.round(base64.length / 1024)}KB > ${Math.round(MAX_BASE64_SIZE / 1024)}KB limit)`);

    try {
      // Decode base64 to buffer
      const buffer = Buffer.from(base64, 'base64');

      // Get image metadata
      const metadata = await sharp(buffer).metadata();
      const { width = 0, height = 0 } = metadata;

      // Calculate resize dimensions
      let targetWidth = width;
      let targetHeight = height;
      const maxDim = Math.max(width, height);

      if (maxDim > TARGET_MAX_DIMENSION) {
        const scale = TARGET_MAX_DIMENSION / maxDim;
        targetWidth = Math.round(width * scale);
        targetHeight = Math.round(height * scale);
      }

      // Progressive quality reduction until size is acceptable
      let quality = 85;
      let optimizedBase64 = base64;

      while (quality >= 40) {
        const optimizedBuffer = await sharp(buffer)
          .resize(targetWidth, targetHeight, { fit: 'inside' })
          .jpeg({ quality, progressive: true })
          .toBuffer();

        optimizedBase64 = optimizedBuffer.toString('base64');

        if (optimizedBase64.length <= MAX_BASE64_SIZE) {
          break;
        }

        quality -= 10;
      }

      const elapsed = Date.now() - startTime;
      const reduction = Math.round((1 - optimizedBase64.length / base64.length) * 100);
      this.logger.log(`[VisionService] Image optimized: ${Math.round(base64.length / 1024)}KB → ${Math.round(optimizedBase64.length / 1024)}KB (${reduction}% reduction, ${elapsed}ms, quality=${quality})`);

      return optimizedBase64;
    } catch (error: any) {
      this.logger.warn(`[VisionService] Image optimization failed: ${error.message}, using original`);
      return base64;
    }
  }

  /**
   * Check if error is retryable (timeout, network error, 5xx errors)
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;
    const message = error.message?.toLowerCase() || '';
    const code = error.code?.toLowerCase() || '';

    // Retry on timeout, network errors, and server errors
    return (
      message.includes('timeout') ||
      message.includes('timed out') ||
      message.includes('no response') ||
      message.includes('network') ||
      message.includes('econnreset') ||
      code.includes('timeout') ||
      code === 'econnreset' ||
      code === 'etimedout' ||
      (error.status >= 500 && error.status < 600)
    );
  }

  /**
   * Generate cache key from image identifier
   * Includes prompt version for cache invalidation when prompt changes
   */
  private buildCacheKey(params: { buffer?: Buffer; url?: string; base64?: string }, locale?: string, mode?: string): string {
    const namespace = 'vision:components';
    const localePart = locale || 'en';
    const modePart = mode || 'default';

    // Priority: Buffer > base64 > URL (most reliable to least)
    if (params.buffer) {
      const hash = crypto.createHash('sha256').update(params.buffer).digest('hex');
      return `${namespace}:${VISION_PROMPT_VERSION}:${hash}:${localePart}:${modePart}`;
    }

    if (params.base64) {
      const hash = crypto.createHash('sha256').update(`${params.base64}:${localePart}:${modePart}`).digest('hex');
      return `${namespace}:${VISION_PROMPT_VERSION}:${hash.substring(0, 32)}:${localePart}:${modePart}`;
    }

    if (params.url) {
      const hash = crypto.createHash('sha256').update(`${params.url}:${localePart}:${modePart}`).digest('hex');
      return `${namespace}:${VISION_PROMPT_VERSION}:${hash.substring(0, 32)}:${localePart}:${modePart}`;
    }

    // Fallback
    const rand = Math.random().toString(36).slice(2);
    return `${namespace}:${VISION_PROMPT_VERSION}:nohash:${rand}:${localePart}:${modePart}`;
  }

  // NOTE: generateCacheKey removed - all caching now uses buildCacheKey with version

  /**
   * Get or extract components with caching
   * This is the ONLY entry point for Vision API - handles all caching
   *
   * Returns VisionExtractionResult with explicit status:
   * - 'success': Components extracted successfully
   * - 'partial': Some components extracted but with warnings
   * - 'no_food_detected': Image analyzed but no food found
   * - 'parse_error': Failed to parse Vision API response
   * - 'api_error': Vision API call failed
   */
  async getOrExtractComponents(params: {
    imageBuffer?: Buffer;
    imageUrl?: string;
    imageBase64?: string;
    locale?: string;
    mode?: 'default' | 'review';
    foodDescription?: string;
    skipCache?: boolean;
  }): Promise<VisionExtractionResult> {
    const { imageBuffer, imageUrl, imageBase64, locale = 'en', mode = 'default', foodDescription, skipCache = false } = params;

    if (!imageBuffer && !imageUrl && !imageBase64) {
      return {
        status: 'api_error',
        components: [],
        hiddenItems: [],
        error: {
          code: 'NO_IMAGE_INPUT',
          message: 'Either imageBuffer, imageUrl, or imageBase64 must be provided',
        },
      };
    }

    // Build cache key with version
    const cacheKey = this.buildCacheKey(
      { buffer: imageBuffer, url: imageUrl, base64: imageBase64 },
      locale,
      mode,
    );

    // Try cache first - components (skip if skipCache is true)
    if (!skipCache) {
      const cached = await this.cache.get<VisionComponent[]>(cacheKey, 'vision');
      if (cached && cached.length > 0) {
        this.logger.debug(`[VisionService] Cache hit for vision analysis (key: ${cacheKey.substring(0, 50)}...)`);
        // Also try to get cached hidden items
        const cachedHidden = await this.cache.get<VisionHiddenItem[]>(`${cacheKey}:hidden`, 'vision');
        return {
          status: 'success',
          components: cached,
          hiddenItems: cachedHidden || [],
          meta: { validatedComponentCount: cached.length },
        };
      }
    } else {
      this.logger.warn(`[VisionService] Skip-cache mode - bypassing vision cache`);
    }

    this.logger.debug(`[VisionService] Cache miss, calling OpenAI Vision API (key: ${cacheKey.substring(0, 50)}...)`);

    // Call actual extractComponents (no internal caching)
    const result = await this.extractComponentsInternal({
      imageUrl,
      imageBase64: imageBase64 || (imageBuffer ? imageBuffer.toString('base64') : undefined),
      mode,
      foodDescription,
    });

    // Cache successful results with correct key (including version) - even if skipCache was used for read
    if (result.status === 'success' && result.components.length > 0) {
      await this.cache.set(cacheKey, result.components, 'vision').catch((err) => {
        this.logger.warn(`[VisionService] Failed to cache vision result: ${err.message}`);
      });
    }

    // Cache hidden items with same key prefix + :hidden
    if (result.hiddenItems.length > 0) {
      await this.cache.set(`${cacheKey}:hidden`, result.hiddenItems, 'vision').catch((err) => {
        this.logger.warn(`[VisionService] Failed to cache hidden items: ${err.message}`);
      });
    }

    return result;
  }

  /**
   * Internal method - extract food components from image using OpenAI Vision
   * Called only by getOrExtractComponents - NO INTERNAL CACHING
   *
   * Returns VisionExtractionResult with explicit status for all outcomes
   */
  private async extractComponentsInternal(params: { imageUrl?: string; imageBase64?: string; mode?: 'default' | 'review'; foodDescription?: string }): Promise<VisionExtractionResult> {
    const { imageUrl, imageBase64, mode = 'default', foodDescription } = params;

    if (!imageUrl && !imageBase64) {
      return {
        status: 'api_error',
        components: [],
        hiddenItems: [],
        error: {
          code: 'NO_IMAGE_SOURCE',
          message: 'Either imageUrl or imageBase64 must be provided',
        },
      };
    }
    // Convert relative URLs to absolute URLs for OpenAI Vision API
    // CRITICAL: OpenAI Vision API requires absolute URLs, not relative paths
    // If base64 is available, prefer it over URL (more reliable and faster, avoids network issues)
    let finalImageUrl = imageUrl;
    if (imageUrl && !imageBase64) {
      // Only process URL if we don't have base64 (base64 is preferred)
      if (imageUrl.startsWith('/')) {
        // Relative URL - convert to absolute using API_BASE_URL or API_PUBLIC_URL
        const apiBaseUrl = process.env.API_BASE_URL || process.env.API_PUBLIC_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        finalImageUrl = `${apiBaseUrl}${imageUrl}`;
        this.logger.debug(`[VisionService] Converted relative URL to absolute: ${finalImageUrl}`);
      } else if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://') && !imageUrl.startsWith('data:')) {
        // URL doesn't start with http/https/data - might be a relative path without leading slash
        const apiBaseUrl = process.env.API_BASE_URL || process.env.API_PUBLIC_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        finalImageUrl = `${apiBaseUrl}/${imageUrl}`;
        this.logger.debug(`[VisionService] Converted non-absolute URL to absolute: ${finalImageUrl}`);
      }
    }

    // CRITICAL: Prefer base64 when available (more reliable for OpenAI Vision API, avoids URL timeout issues)
    // Base64 is embedded in the request, so no network call needed to fetch the image
    // Optimize base64 image if too large (reduces transfer time and API processing)
    let optimizedBase64 = imageBase64;
    if (imageBase64) {
      optimizedBase64 = await this.optimizeImageBase64(imageBase64);
    }

    const imageContent: any = optimizedBase64
      ? { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${optimizedBase64}` } }
      : { type: 'image_url', image_url: { url: finalImageUrl } };

    // Validate that we have either base64 or a valid URL
    if (!optimizedBase64 && !finalImageUrl) {
      throw new BadRequestException('Either imageBase64 or valid imageUrl must be provided');
    }

    // Debug log (only log first N chars of base64, not full string)
    this.logger.debug(
      `[VisionService] Calling OpenAI Vision with base64=${Boolean(imageBase64)}, url=${imageBase64 ? 'data:image/jpeg;base64,...' : finalImageUrl}`,
    );

    // Enhanced system prompt - EatSense OMEGA v3.2 production-grade food recognition
    let systemPrompt = `You are EatSense OMEGA v3.2, a production-grade food recognition system.

## CORE RULES
1. Stable ID tracking (A, B, C...) across all passes
2. Dual confidence: confidence = min(visualConfidence, labelConfidence)
3. Apply imageQuality confidenceCap to ALL confidence fields
4. Context-aware: containerType + servingContext affect estimates
5. Composite dishes: don't separate inseparable ingredients
6. Dish families for global coverage
7. Unit-based portions for countable items, volumeMl for drinks
8. ALL nutrition = estimates, mark with nutritionSource: "generic_estimate"
9. WARNINGS over hallucinated invisible ingredients
10. edibleGrams for items with VISIBLE bones/shells/peels only
11. macroSanity check on TOTALS: 4P + 9F + 4C ≈ kcal (±12%)

═══════════════════════════════════════════════════════════════
PASS 0: IMAGE & CONTEXT
═══════════════════════════════════════════════════════════════

imageQuality:
- "good": clear → confidenceCap 1.0, grams round to 10g
- "medium": some blur → confidenceCap 0.85, grams round to 20g
- "poor": very dark/blurry → confidenceCap 0.75, grams round to 50g

IMPORTANT: confidenceCap applies to ALL confidence fields:
- dish confidence
- visualConfidence, labelConfidence, confidence
- nutritionConfidence

containerType: plate | bowl | cup | mug | glass | bento | wrapper | package | jar | bottle | basket | skewer | hand | takeaway_box

servingContext: home | restaurant | fast_food | street_food | packaged | cafe | buffet

═══════════════════════════════════════════════════════════════
PASS 1: RAW VISUAL EXTRACTION (NO FOOD NAMES)
═══════════════════════════════════════════════════════════════

Assign stable IDs (A, B, C...).

**STAGE 6 FIX: CRITICAL - List ALL visible items including:**
- Small toppings (egg, fried egg, poached egg, soft-boiled egg)
- Sauces, dressings, condiments (even small amounts)
- Garnishes (herbs, seeds, nuts, cheese, onion slices)
- Side items (pickles, kimchi, salad portions)
Do NOT skip items just because they are small or partially hidden.
If uncertain, add with lower confidence rather than omitting.

For SEPARABLE items:
- shape, color, texture, size, position, surface
- note if bones/shells/peels VISIBLY present

For COMPOSITE items (soup, curry, stew, smoothie, casserole, sauce):
- compositeType, dominantColors, visibleElements, texture, size
- DO NOT force-separate ingredients

═══════════════════════════════════════════════════════════════
PASS 2: IDENTIFICATION WITH DUAL CONFIDENCE
═══════════════════════════════════════════════════════════════

For each ID:
- visualConfidence (0-1): How clearly visible?
- labelConfidence (0-1): How certain is identification?
- confidence = min(visual, label)
- Apply confidenceCap from imageQuality

Downgrade if confidence < 0.7:
- Specific → General (e.g., "Salmon" 0.6 → "Fish fillet" 0.8)

COMPOSITE items → identify as SINGLE food item.

### Unknown/Rare Foods:
Find closest comparable by cooking method + macro profile:
- Deep-fried dough → donut/churro (NOT bread)
- Starchy root mash → mashed potatoes (NOT rice)
- Grilled meat skewer → kebab/satay

Add assumption: "Nutrition estimated based on comparable: [name]"

═══════════════════════════════════════════════════════════════
PASS 3: DISH RECOGNITION WITH FAMILIES
═══════════════════════════════════════════════════════════════

Hierarchy:
1. Specific name (≥80% match of VISIBLE elements) → use dish name
2. Dish family + description (50-79%) → use family
3. Generic description (<50%)

CRITICAL: Match% computed ONLY from confirmed visible or structurally required elements. Never count assumed seasonings/spices.

### DISH FAMILIES:

**Asian:**
- sushi_family: nigiri, maki, sashimi, temaki, chirashi, onigiri
- ramen_noodle_family: ramen, pho, udon, soba (soup-based noodles)
- stir_fry_family: pad thai, chow mein, yakisoba (dry noodles)
- curry_family: tikka masala, thai green/red/yellow, japanese curry, korma, vindaloo
- dumpling_family: gyoza, jiaozi, wonton, momo, mandu, dim sum
- rice_bowl_family: donburi, bibimbap, poke bowl

**European:**
- pasta_family: spaghetti, penne, lasagna, ravioli, carbonara, bolognese
- stew_family: goulash, beef stew, ragout, cassoulet, irish stew, chili
- flatbread_family: pizza, focaccia, lahmacun, pide, naan, manakish
- soup_family: borscht, solyanka, minestrone, chowder, bisque

**Russian/Slavic:**
- pelmeni_family: pelmeni, vareniki, khinkali
- russian_soup_family: borscht, shchi, ukha, solyanka, rassolnik

**Mexican/Latin:**
- tortilla_family: taco, burrito, quesadilla, fajita, enchilada, tostada
- burrito_bowl_family: burrito bowl, taco bowl

**Middle Eastern:**
- kebab_family: shashlik, kebab, kofte, souvlaki, satay, yakitori
- wrap_family: shawarma, falafel wrap, gyro, doner

**Western:**
- sandwich_family: burger, club, BLT, sub, panini, banh mi
- salad_family: caesar, greek, cobb, nicoise, waldorf
- breakfast_family: pancakes, eggs & bacon, omelette, french toast, waffles

### dishes vs items:
- dishes: top-level names for UI display
- items: what gets summed into totals
- totals calculated ONLY from items

═══════════════════════════════════════════════════════════════
PASS 4: PORTION ESTIMATION
═══════════════════════════════════════════════════════════════

### Gram Rounding by Image Quality:
- good: round to nearest 10g
- medium: round to nearest 20g
- poor: round to nearest 50g

### portionMode types:
- coverage: plated meals, estimate by plate fraction
- unit: countable items (sushi, dumplings, cookies)
- package: packaged foods with visible size
- drink: beverages (use volumeMl)

### MODE A — Coverage:
| Container | Full capacity |
|-----------|---------------|
| Dinner plate 26cm | 450-600g |
| Side plate 20cm | 200-350g |
| Deep bowl | 400-600g |
| Small bowl | 200-350g |

### MODE B — Unit:
| Item | Weight each |
|------|-------------|
| Sushi piece | 25-35g |
| Dumpling | 20-40g |
| Cookie | 15-30g |
| Meatball | 25-40g |
| Chicken wing | 60-90g |
| Pizza slice | 80-120g |
| Taco | 80-120g |
| Burger | 180-280g total |

### MODE C — Package:
Read visible size or estimate standard packaging.

### MODE D — Drink:
Use volumeMl for beverages:
| Container | Typical volume |
|-----------|----------------|
| Espresso cup | 30ml |
| Coffee cup | 150-250ml |
| Mug | 300-400ml |
| Small glass | 200ml |
| Large glass | 350-500ml |
| Can | 330ml |
| Bottle | read label or estimate |

For drinks: provide both volumeMl and grams (for most liquids 1ml ≈ 1g).

### edibleGrams Rule:
- Include edibleGrams ONLY if bones/shell/peel are VISIBLY present
- If "possibly has bones but not visible" → do NOT add edibleGrams, add warning instead

| Item | grams | edibleGrams | Reason |
|------|-------|-------------|--------|
| Chicken leg (bone visible) | 180g | 125g | ~30% bone |
| Whole shrimp (shell on) | 100g | 55g | ~45% shell |
| Banana (peel visible) | 150g | 100g | ~33% peel |
| Fish fillet (no bones visible) | 150g | — | no edibleGrams field |

═══════════════════════════════════════════════════════════════
PASS 5: NUTRITION ESTIMATION
═══════════════════════════════════════════════════════════════

Calculate nutrition from edibleGrams if present, else from grams.

nutritionConfidence (apply confidenceCap):
- Simple foods: 0.85-0.95
- Standard dishes: 0.70-0.85
- Restaurant dishes: 0.60-0.75
- Complex ethnic: 0.50-0.70
- Unknown items: 0.40-0.55

### Drinks:
Add drinkType:
water | coffee | tea | soda | juice | alcohol | smoothie | milk | shake | unknown

If sweetened/alcohol uncertain → add warning.

### ingredientBreakdownAvailable:
- true: separable items where components can be identified (rice, grilled chicken, salad)
- false: composite items that cannot be separated (curry, soup, smoothie, sauce)

Rule: true only for visibly separable items; composite typically false.

### Macro Sanity Check (on TOTALS):
calculatedKcal = (totals.protein × 4) + (totals.fat × 9) + (totals.carbs × 4)
tolerance = totals.kcal × 0.12  // 12% for restaurant/composite variance
if abs(totals.kcal - calculatedKcal) > tolerance:
add warning: "Macro/kcal variance detected — generic estimate"

For alcohol: add (alcohol_g × 7) to formula.

═══════════════════════════════════════════════════════════════
FAILURE MODES — PREVENT THESE
═══════════════════════════════════════════════════════════════

❌ Confidence above cap: poor image → 0.92 confidence
✓ Apply cap: poor → max 0.75

❌ edibleGrams for invisible bones: "fish might have bones" → edibleGrams
✓ Only if visible; else warning

❌ grams for drinks: "coffee 250g"
✓ Use volumeMl: 250, grams: 250

❌ Wrong family: quesadilla → flatbread_family
✓ Correct: tortilla_family

❌ Wrong family: goulash → curry_family
✓ Correct: stew_family

❌ 80% match counting spices: "carbonara needs pepper"
✓ Only count visible structural elements

❌ Macro mismatch ignored: P10 F10 C50 but kcal 500
✓ Check totals, add warning

❌ Forced separation: Curry → chicken + sauce
✓ Composite: "Chicken curry", ingredientBreakdownAvailable: false`;

    // Add review mode instructions
    if (mode === 'review') {
      systemPrompt += `

REVIEW MODE - This is a re-analysis. Be extra careful:
- Be more conservative with confidence scores - only use high confidence (0.7+) if you are very certain
- If unsure about a specific dish name, prefer a more general term (e.g., "fish dish" instead of complex local cuisine name)
- Double-check that you are not confusing similar-looking foods (e.g., rice vs. quinoa, chicken vs. fish)
- Be honest about uncertainty - it is better to give a lower confidence score than to guess incorrectly`;
    }

    systemPrompt += `

## OUTPUT FORMAT (REQUIRED)

Return ONLY valid JSON with this EXACT structure. No markdown, no text before or after.

{
  "imageQuality": "good",
  "containerType": "plate",
  "servingContext": "home",

  "dish_name": "Caesar Salad",
  "dish_name_local": "Салат Цезарь",
  "dish_name_confidence": 0.82,
  "dish_name_reasoning": "Classic presentation with romaine, croutons, parmesan visible",
  "dish_type": "salad",
  "dish_family": "salad_family",
  "cuisine": "italian",

  "visible_items": [
    {
      "id": "A",
      "name": "romaine lettuce",
      "name_local": "салат романо",
      "display_name": "Romaine Lettuce",
      "display_name_local": "Салат Романо",
      "itemType": "ingredient",
      "is_minor": false,
      "category_hint": "veg",
      "state_hint": "raw",
      "est_portion_g": 100,
      "portionMode": "coverage",
      "visualConfidence": 0.95,
      "labelConfidence": 0.90,
      "confidence": 0.90,
      "preparation": "raw",
      "cooking_method": "raw",
      "nutritionConfidence": 0.85,
      "nutritionSource": "generic_estimate",
      "estimated_nutrients": {
        "calories": 17,
        "protein_g": 1.2,
        "carbs_g": 3.3,
        "fat_g": 0.3,
        "fiber_g": 2.1
      }
    },
    {
      "id": "B",
      "name": "croutons",
      "name_local": "крутоны",
      "display_name": "Croutons",
      "display_name_local": "Крутоны",
      "itemType": "ingredient",
      "is_minor": false,
      "category_hint": "grain",
      "state_hint": "baked",
      "est_portion_g": 30,
      "unitCount": 8,
      "portionMode": "unit",
      "visualConfidence": 0.90,
      "labelConfidence": 0.85,
      "confidence": 0.85,
      "preparation": "baked",
      "nutritionConfidence": 0.80,
      "nutritionSource": "generic_estimate",
      "estimated_nutrients": {
        "calories": 122,
        "protein_g": 3.6,
        "carbs_g": 22,
        "fat_g": 2,
        "fiber_g": 1.5
      }
    },
    {
      "id": "C",
      "name": "parmesan cheese",
      "name_local": "пармезан",
      "display_name": "Parmesan",
      "display_name_local": "Пармезан",
      "itemType": "ingredient",
      "is_minor": true,
      "category_hint": "protein",
      "state_hint": "raw",
      "est_portion_g": 15,
      "portionMode": "coverage",
      "visualConfidence": 0.85,
      "labelConfidence": 0.80,
      "confidence": 0.80,
      "preparation": "shaved",
      "nutritionConfidence": 0.75,
      "nutritionSource": "generic_estimate",
      "estimated_nutrients": {
        "calories": 59,
        "protein_g": 5.4,
        "carbs_g": 0.5,
        "fat_g": 3.9,
        "fiber_g": 0
      }
    }
  ],

  "hidden_items": [
    {
      "name": "caesar dressing",
      "category": "sauce_or_dressing",
      "reason": "Caesar salad typically has creamy dressing, glossy appearance on lettuce",
      "confidence": 0.85,
      "estimated_grams": 30
    }
  ],

  "totals": {
    "kcal": 228,
    "protein": 10.2,
    "fat": 6.6,
    "carbs": 25.8,
    "fiber": 3.6
  },

  "assumptions": [],
  "warnings": []
}

## Field Inclusion Rules:
- edibleGrams: ONLY if bones/shell/peel VISIBLY present
- volumeMl: ONLY for drinks (portionMode: drink)
- unitCount: ONLY for countable items (portionMode: unit)
- drinkType: ONLY for beverages
- ingredientBreakdownAvailable: ONLY for composite_dish items
- All confidence fields: apply imageQuality confidenceCap

## DISH NAME RULES:

1. If recognizable dish (≥80% match): use canonical name
   - dish_name: "Borscht", dish_name_local: "Борщ", confidence: 0.8+

2. If dish family match (50-79%): use family + description
   - dish_name: "Pasta dish with creamy sauce"
   - dish_family: "pasta_family"
   - confidence: 0.6-0.8

3. If multiple components but no dish: use descriptive name
   - dish_name: "Grilled chicken with rice and vegetables"
   - dish_name_local: "Курица гриль с рисом и овощами"

4. If single ingredient only: dish_name = null
   - Just use visible_items[0].display_name for UI

5. If unrecognizable mix: dish_name = "Mixed plate" / "Смешанная тарелка"
   - confidence: 0.5-0.6

## DISH TYPES:
main, side, dessert, snack, drink, breakfast, salad, soup, appetizer, mixed_plate

## CUISINE OPTIONS:
russian, italian, asian, japanese, chinese, korean, mexican, american, french, mediterranean, indian, middle_eastern, unknown

Remember: Output ONLY valid JSON. No markdown, no explanations outside JSON structure.`;


    const model = process.env.OPENAI_MODEL || process.env.VISION_MODEL || 'gpt-4o';
    this.logger.debug(`[VisionService] Using model: ${model} for component extraction`);

    // Configure timeout for Vision API call (default 30 seconds, configurable via env)
    // OPTIMIZED: Reduced from 45s to 30s for faster fail-fast
    const timeoutMs = parseInt(process.env.VISION_API_TIMEOUT_MS || '30000', 10);

    try {
      // Retry loop for Vision API call
      let lastError: any = null;
      let response: any = null;

      for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            const delayMs = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1); // Exponential backoff
            this.logger.log(`[VisionService] Retry attempt ${attempt}/${this.MAX_RETRIES} after ${delayMs}ms delay`);
            await this.delay(delayMs);
          }

          // Create timeout promise
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new Error(`Vision API call timed out after ${timeoutMs}ms`));
            }, timeoutMs);
          });

          // Create Vision API call promise
          const visionApiPromise = this.openai.chat.completions.create({
            // Use global OPENAI_MODEL if provided (e.g. gpt-4o), fallback to VISION_MODEL or default
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: foodDescription
                      ? `Analyze this food image. The user mentioned this is "${foodDescription}". Use this information to help identify the dish and its components more accurately. Extract all components.`
                      : 'Analyze this food image and extract all components.'
                  },
                  imageContent,
                ],
              },
            ],
            max_completion_tokens: 2000,
            temperature: 0.3,
            response_format: { type: 'json_object' },
          }, {
            timeout: timeoutMs, // Set timeout in request options
          });

          // Race between API call and timeout
          response = await Promise.race([visionApiPromise, timeoutPromise]);

          // Check if response has valid content (inside retry loop so we can retry on empty)
          const content = response?.choices?.[0]?.message?.content;
          if (!content) {
            throw new Error('OpenAI Vision returned empty content - possible rate limit or content filter');
          }

          break; // Success - exit retry loop

        } catch (retryError: any) {
          lastError = retryError;

          // Check if error is retryable (include empty content errors)
          const isEmptyResponse = retryError.message?.includes('empty content');
          if (attempt < this.MAX_RETRIES && (this.isRetryableError(retryError) || isEmptyResponse)) {
            this.logger.warn(`[VisionService] Retryable error on attempt ${attempt + 1}/${this.MAX_RETRIES + 1}: ${retryError.message}`);
            continue; // Try again
          }

          // Non-retryable error or max retries reached
          throw retryError;
        }
      }

      // Type guard to check if response is not a timeout error
      if (!response || typeof response !== 'object' || !('choices' in response)) {
        throw lastError || new Error('Vision API call timed out or returned invalid response');
      }

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI Vision');
      }

      // Parse JSON - super robust parsing with normalization
      let parsed: z.infer<typeof VisionFlexibleSchema>;
      let rawJson: any;
      try {
        rawJson = JSON.parse(content);

        // Pre-validation normalization: fix common enum mismatches from GPT
        const normalizeEnums = (obj: any): any => {
          if (Array.isArray(obj)) {
            return obj.map(normalizeEnums);
          }
          if (obj && typeof obj === 'object') {
            const normalized: any = {};
            for (const [key, value] of Object.entries(obj)) {
              if (key === 'state_hint' && typeof value === 'string') {
                // Map unknown state_hint values to valid ones
                const stateMap: Record<string, string> = {
                  'roasted': 'roasted',
                  'sauteed': 'sauteed',
                  'sautéed': 'sauteed', // FIX: Accented version
                  'sauce': 'cooked', // FIX: Vision sometimes returns 'sauce' as state
                  'melted': 'melted', // FIX: Now valid enum
                  'braised': 'braised', // FIX: Now valid enum
                  'smoked': 'smoked', // FIX: Now valid enum
                  'frozen': 'frozen', // FIX: Now valid enum
                  'pan-fried': 'fried',
                  'pan_fried': 'fried',
                  'panfried': 'fried',
                  'deep-fried': 'fried',
                  'deep_fried': 'fried',
                  'deepfried': 'fried',
                  'stir-fried': 'fried',
                  'stir_fried': 'fried',
                  'stirfried': 'fried',
                  'shallow-fried': 'fried',
                  'broiled': 'grilled',
                  'charred': 'grilled',
                  'char-grilled': 'grilled',
                  'barbecued': 'grilled',
                  'bbq': 'grilled',
                  'stewed': 'braised',
                  'simmered': 'braised',
                  'caramelized': 'cooked',
                  'glazed': 'cooked',
                  'toasted': 'baked',
                  'poached': 'boiled',
                  'microwaved': 'cooked',
                  'blanched': 'boiled',
                  'parboiled': 'boiled',
                  'marinated': 'raw',
                  'cured': 'raw',
                  'fermented': 'raw',
                  'dehydrated': 'dried',
                  'fresh': 'raw',
                  'uncooked': 'raw',
                  'prepared': 'cooked',
                  'processed': 'cooked',
                  'creamy': 'cooked', // FIX: Vision sometimes returns texture as state
                  'crispy': 'fried',
                  'soft': 'cooked',
                  'crunchy': 'fried',
                };
                const validStates = ['raw', 'cooked', 'boiled', 'steamed', 'baked', 'grilled', 'fried', 'dried', 'pickled', 'roasted', 'sauteed', 'melted', 'braised', 'smoked', 'frozen', 'unknown'];
                const lowerValue = value.toLowerCase().trim();
                const normalizedValue = stateMap[lowerValue] ||
                  (validStates.includes(lowerValue) ? lowerValue : 'cooked');
                // Log unmapped values for future improvement (only in debug mode)
                if (!stateMap[lowerValue] && !validStates.includes(lowerValue) && process.env.ANALYSIS_DEBUG === 'true') {
                  console.warn(`[VisionService] Unknown state_hint "${value}" mapped to "cooked"`);
                }
                normalized[key] = normalizedValue;
              } else if (key === 'category_hint' && typeof value === 'string') {
                // Normalize visible_items category_hint - map non-standard values to valid enum
                const catHintMap: Record<string, string> = {
                  'seasoning': 'spice',
                  'vegetable': 'veg',
                  'vegetables': 'veg',
                  'carb': 'grain',
                  'carbs': 'grain',
                  'carbohydrate': 'grain',
                  'meat': 'protein',
                  'fish': 'protein',
                  'seafood': 'protein',
                  'dairy': 'protein',
                  'egg': 'protein',
                  'eggs': 'protein',
                  'beverage': 'drink',
                  'oil': 'fat',
                  'nuts': 'fat',
                  'nut': 'fat',
                  'dressing': 'sauce',
                  'condiment': 'sauce',
                  'herb': 'spice',
                  'herbs': 'spice',
                  'topping': 'other',
                  'garnish': 'other',
                };
                const validCatHints = ['protein', 'grain', 'veg', 'fruit', 'fat', 'seeds', 'spice', 'sauce', 'drink', 'other'];
                normalized[key] = catHintMap[value.toLowerCase()] ||
                  (validCatHints.includes(value.toLowerCase()) ? value.toLowerCase() : 'other');
              } else if (key === 'category' && typeof value === 'string' && obj.reason) {
                // This is hidden_item category
                const catMap: Record<string, string> = {
                  'seasoning': 'seasoning', // now valid
                  'spice': 'spice', // now valid
                  'herbs': 'seasoning',
                  'salt': 'seasoning',
                  'pepper': 'seasoning',
                  'oil': 'cooking_oil',
                  'butter': 'butter_or_cream',
                  'cream': 'butter_or_cream',
                  'dressing': 'sauce_or_dressing',
                  'sauce': 'sauce_or_dressing',
                  'sugar': 'added_sugar',
                  'breading': 'breaded_or_batter',
                  'batter': 'breaded_or_batter',
                };
                const validCats = ['cooking_oil', 'butter_or_cream', 'sauce_or_dressing', 'added_sugar', 'breaded_or_batter', 'processed_meat_fillers', 'seasoning', 'spice', 'other'];
                normalized[key] = catMap[value.toLowerCase()] || (validCats.includes(value.toLowerCase()) ? value.toLowerCase() : 'other');
              } else if (key === 'cooking_method' && typeof value === 'string') {
                // Normalize cooking_method enum values
                const cookingMethodMap: Record<string, string> = {
                  'sautéed': 'sauteed', // FIX: Accented version
                  'sauteed': 'sauteed',
                  'pan-fried': 'fried',
                  'pan_fried': 'fried',
                  'panfried': 'fried',
                  'stir-fried': 'fried',
                  'stir_fried': 'fried',
                  'stirfried': 'fried',
                  'shallow-fried': 'fried',
                  'air-fried': 'baked',
                  'deep-fried': 'deep_fried',
                  'deepfried': 'deep_fried',
                  'bbq': 'grilled',
                  'barbecued': 'grilled',
                  'char-grilled': 'grilled',
                  'chargrilled': 'grilled',
                  'broiled': 'grilled',
                  'poached': 'poached', // FIX: Now valid enum
                  'blanched': 'boiled',
                  'parboiled': 'boiled',
                  'stewed': 'braised', // FIX: Map to braised
                  'braised': 'braised', // FIX: Now valid enum
                  'simmered': 'braised',
                  'toasted': 'baked',
                  'smoked': 'smoked', // FIX: Now valid enum
                  'melted': 'melted', // FIX: Now valid enum
                  'microwaved': 'mixed',
                  'fresh': 'raw',
                  'uncooked': 'raw',
                  'none': 'raw',
                };
                const validMethods = ['fried', 'deep_fried', 'baked', 'grilled', 'boiled', 'steamed', 'raw', 'mixed', 'roasted', 'sauteed', 'braised', 'smoked', 'melted', 'poached'];
                const lowerValue = value.toLowerCase().trim();
                const normalizedMethod = cookingMethodMap[lowerValue] ||
                  (validMethods.includes(lowerValue) ? lowerValue : 'mixed');
                // Log unmapped values for future improvement (only in debug mode)
                if (!cookingMethodMap[lowerValue] && !validMethods.includes(lowerValue) && process.env.ANALYSIS_DEBUG === 'true') {
                  console.warn(`[VisionService] Unknown cooking_method "${value}" mapped to "mixed"`);
                }
                normalized[key] = normalizedMethod;
              } else if (key === 'itemType' && typeof value === 'string') {
                // Normalize itemType enum values - handle extra values from Vision
                const itemTypeMap: Record<string, string> = {
                  'side': 'ingredient',
                  'garnish': 'ingredient',
                  'condiment': 'ingredient',
                  'dressing': 'ingredient',
                  'topping': 'ingredient',
                  'accompaniment': 'ingredient',
                  'composite': 'composite_dish',
                  'dish': 'composite_dish',
                  'main': 'composite_dish',
                  'main_course': 'composite_dish',
                  'entree': 'composite_dish',
                  'appetizer': 'ingredient',
                  'starter': 'ingredient',
                  'beverage': 'drink',
                  'liquid': 'drink',
                };
                const lowerValue = value.toLowerCase().trim();
                normalized[key] = itemTypeMap[lowerValue] || value;
              } else {
                normalized[key] = normalizeEnums(value);
              }
            }
            return normalized;
          }
          return obj;
        };

        const normalizedJson = normalizeEnums(rawJson);
        parsed = VisionFlexibleSchema.parse(normalizedJson);
      } catch (err: any) {
        // Schema validation failed - try to salvage data by extracting arrays directly
        const parseWarnings: string[] = [];
        parseWarnings.push(`Schema validation failed: ${err instanceof Error ? err.message : String(err)}`);

        this.logger.warn('[VisionService] Schema validation failed, attempting fallback extraction', {
          error: err instanceof Error ? err.message : String(err),
        });

        // Fallback: try to extract visible_items or components directly without strict validation
        if (rawJson) {
          const items = rawJson.visible_items || rawJson.components || rawJson.items || rawJson.food_items || rawJson.foods || rawJson.detected_items;
          if (Array.isArray(items) && items.length > 0) {
            this.logger.debug(`[VisionService] Fallback extraction found ${items.length} items`);
            // Return partially valid components (will be validated individually later)
            const hiddenItems = Array.isArray(rawJson.hidden_items) ? rawJson.hidden_items : [];
            // Create a fake parsed object for the extraction logic below
            // Mark as partial since we used fallback
            parseWarnings.push(`Used fallback extraction: ${items.length} items`);
            parsed = { visible_items: items, hidden_items: hiddenItems, _parseWarnings: parseWarnings } as any;
          } else {
            // Log snippet of content for debugging
            const contentSnippet = content.slice(0, 500);
            this.logger.error('[VisionService] Failed to parse components JSON', {
              contentSnippet,
              error: err instanceof Error ? err.message : String(err),
              errorName: err?.name,
            });
            // Return explicit parse_error status instead of silent empty array
            return {
              status: 'parse_error',
              components: [],
              hiddenItems: [],
              error: {
                code: 'VISION_PARSE_FAILED',
                message: 'Failed to parse food components from Vision API response',
                details: {
                  parseError: err instanceof Error ? err.message : String(err),
                  contentSnippet,
                },
              },
              meta: { parseWarnings },
            };
          }
        } else {
          // No rawJson at all - critical parse failure
          return {
            status: 'parse_error',
            components: [],
            hiddenItems: [],
            error: {
              code: 'VISION_NO_JSON',
              message: 'Vision API returned no parseable JSON content',
            },
            meta: { parseWarnings },
          };
        }
      }

      // Extract components array from flexible structure
      let components: any[] = [];
      let hiddenItems: VisionHiddenItem[] = [];
      let dish: VisionDish | undefined;

      if (Array.isArray(parsed)) {
        // Legacy format: array of components
        components = parsed;
      } else if ((parsed as any).visible_items) {
        // New format: { visible_items, hidden_items, dish_name, ... }
        components = (parsed as any).visible_items || [];
        hiddenItems = (parsed as any).hidden_items || [];

        // Extract dish-level identification (NEW)
        const p = parsed as any;
        if (p.dish_name !== undefined || p.dish) {
          dish = {
            dish_name: p.dish?.dish_name ?? p.dish_name ?? null,
            dish_name_local: p.dish?.dish_name_local ?? p.dish_name_local ?? null,
            dish_name_confidence: p.dish?.dish_name_confidence ?? p.dish_name_confidence ?? 0,
            dish_name_reasoning: p.dish?.dish_name_reasoning ?? p.dish_name_reasoning,
            dish_type: p.dish?.dish_type ?? p.dish_type,
            cuisine: p.dish?.cuisine ?? p.cuisine ?? null,
          };
          this.logger.debug(`[VisionService] Extracted dish identification: ${dish.dish_name} (confidence: ${dish.dish_name_confidence})`);
        }
      } else if ((parsed as any).food_items) {
        // Alternative format from GPT: { food_items: [...] }
        components = (parsed as any).food_items || [];
      } else if ((parsed as any).foods) {
        // Alternative format: { foods: [...] }
        components = (parsed as any).foods || [];
      } else if ((parsed as any).detected_items) {
        // Alternative format: { detected_items: [...] }
        components = (parsed as any).detected_items || [];
      } else {
        // Legacy object format: { components: [...] } or { items: [...] }
        components = (parsed as any).components ?? (parsed as any).items ?? [];
      }

      // Validate and filter components
      const validated: VisionComponent[] = [];
      for (const comp of components) {
        try {
          // =====================================================
          // PRE-VALIDATION: Normalize itemType BEFORE Zod parse
          // Fixes: no_food_detected caused by Vision returning 'dish', 'sauce', 'composite'
          // which are not in the enum and cause Zod validation to fail
          // =====================================================
          const rawItemType = (comp.itemType || '').toString().toLowerCase().trim();
          if (rawItemType === 'dish' || rawItemType === 'composite') {
            comp.itemType = 'composite_dish';
          } else if (rawItemType === 'sauce' || rawItemType === 'dressing' || rawItemType === 'condiment') {
            comp.itemType = 'ingredient';
            // Preserve sauce category for downstream processing
            if (!comp.category_hint) {
              comp.category_hint = 'sauce';
            }
          } else if (rawItemType && !['ingredient', 'composite_dish', 'drink', ''].includes(rawItemType)) {
            // Unknown itemType - default to ingredient
            this.logger.debug(`[VisionService] Normalizing unknown itemType "${rawItemType}" to "ingredient"`);
            comp.itemType = 'ingredient';
          }

          // Normalize portion field (GPT might use portion_grams instead of est_portion_g)
          // Note: Keep undefined to let AnalyzeService apply category-based defaults
          const normalizedComp = {
            ...comp,
            est_portion_g: comp.est_portion_g ?? comp.portion_grams ?? comp.portion_g ?? comp.grams,
            // CRITICAL FIX: Fallback for null localized fields (GPT sometimes returns null instead of omitting)
            name_local: comp.name_local ?? comp.name,
            display_name: comp.display_name ?? comp.name,
            display_name_local: comp.display_name_local ?? comp.name_local ?? comp.name,
          };
          // Validate individual component with relaxed schema
          const validatedComp = VisionComponentSchema.parse(normalizedComp);
          // Apply defaults for optional fields (but NOT est_portion_g - let AnalyzeService handle it)
          // IMPORTANT: Preserve ALL validated fields including localized names for downstream use
          const finalComp: VisionComponent = {
            ...validatedComp, // Preserve all validated fields from schema
            name: validatedComp.name || 'Unknown',
            name_local: validatedComp.name_local || validatedComp.name || 'Unknown',
            display_name: validatedComp.display_name || validatedComp.name || 'Unknown',
            display_name_local: validatedComp.display_name_local || validatedComp.name_local || validatedComp.name || 'Unknown',
            preparation: validatedComp.preparation || 'unknown',
            est_portion_g: validatedComp.est_portion_g, // Keep undefined if not set
            confidence: validatedComp.confidence ?? 0.7,
          };

          // Filter low confidence items
          if ((finalComp.confidence ?? 0) >= 0.55) {
            validated.push(finalComp);
          } else {
            this.logger.warn(`Low confidence component: ${finalComp.name} (${finalComp.confidence})`);
          }
        } catch (compError) {
          this.logger.warn(`[VisionService] Invalid component skipped:`, comp);
        }
      }

      // Log debug info
      if (process.env.ANALYSIS_DEBUG === 'true') {
        this.logger.debug(`[VisionService] Extracted ${validated.length} components, ${hiddenItems.length} hidden items`);
        if (validated.length > 0) {
          this.logger.debug(`[VisionService] Sample: ${validated[0]?.name} (${validated[0]?.est_portion_g}g)`);
        }
      }

      // =====================================================
      // OBSERVABILITY: Structured log of Vision extraction result
      // =====================================================
      this.logger.log(JSON.stringify({
        stage: 'vision_extraction',
        input: {
          model,
          hasBase64: Boolean(imageBase64),
          hasUrl: Boolean(imageUrl),
          timeoutMs,
        },
        output: {
          status: validated.length === 0 ? 'no_food_detected' : 'success',
          dish: dish ? {
            name: dish.dish_name,
            nameLocal: dish.dish_name_local,
            confidence: dish.dish_name_confidence,
            type: dish.dish_type,
            reasoning: dish.dish_name_reasoning,
          } : null,
          rawCount: components.length,
          validatedCount: validated.length,
          filteredCount: components.length - validated.length,
          hiddenCount: hiddenItems.length,
        },
        items: validated.slice(0, 10).map(c => ({
          rawName: c.name,
          localName: c.name_local,
          displayName: c.display_name_local,
          itemType: c.itemType,
          categoryHint: c.category_hint,
          confidence: c.confidence,
          portionG: c.est_portion_g,
          preparation: c.preparation,
        })),
      }));

      // Build metadata about extraction
      const parseWarnings = (parsed as any)?._parseWarnings || [];
      const rawCount = components.length;
      const filteredCount = rawCount - validated.length;

      // Determine status based on results
      let status: VisionExtractionStatus;
      if (validated.length === 0) {
        // No food items found after validation
        status = 'no_food_detected';
        this.logger.warn('[VisionService] No food components detected after validation', {
          rawComponentCount: rawCount,
          filteredOutCount: filteredCount,
        });
      } else if (parseWarnings.length > 0 || filteredCount > rawCount * 0.5) {
        // Had warnings or lost more than half the items during validation
        status = 'partial';
      } else {
        status = 'success';
      }

      // Return structured result with explicit status
      return {
        status,
        components: validated,
        hiddenItems,
        dish, // NEW: Dish-level identification from Vision
        meta: {
          rawComponentCount: rawCount,
          validatedComponentCount: validated.length,
          filteredOutCount: filteredCount,
          parseWarnings: parseWarnings.length > 0 ? parseWarnings : undefined,
        },
        // Include error info for no_food_detected status
        ...(status === 'no_food_detected' && {
          error: {
            code: 'NO_FOOD_DETECTED',
            message: 'No food items could be identified in this image',
            details: { rawComponentCount: rawCount, filteredOutCount: filteredCount },
          },
        }),
      };
    } catch (error: any) {
      // Check if it's a timeout error
      if (error?.message?.includes('timed out') || error?.message?.includes('timeout')) {
        this.logger.error('[VisionService] Vision API timeout', {
          timeoutMs,
          model,
          hasBase64: Boolean(imageBase64),
          imageUrl: imageBase64 ? 'data:image/jpeg;base64,...' : finalImageUrl,
        });
        return {
          status: 'api_error',
          components: [],
          hiddenItems: [],
          error: {
            code: 'VISION_TIMEOUT',
            message: `Vision API call timed out after ${timeoutMs}ms. The image may be too large or the network is slow.`,
            details: { timeoutMs, model },
          },
        };
      }

      this.logger.error('[VisionService] Vision extraction error', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        status: error?.status,
        responseStatus: error?.response?.status,
        responseData: error?.response?.data,
        model,
        hasBase64: Boolean(imageBase64),
        imageUrl: imageBase64 ? 'data:image/jpeg;base64,...' : finalImageUrl,
      });

      if (error?.status === 429 || error?.response?.status === 429) {
        return {
          status: 'api_error',
          components: [],
          hiddenItems: [],
          error: {
            code: 'VISION_RATE_LIMITED',
            message: 'OpenAI rate limit exceeded. Please try again later.',
          },
        };
      }

      // If URL-based and error, suggest using base64
      if (!imageBase64 && finalImageUrl) {
        this.logger.warn('[VisionService] Vision API error with URL, consider using base64 for better reliability');
      }

      // Return structured error instead of throwing
      return {
        status: 'api_error',
        components: [],
        hiddenItems: [],
        error: {
          code: 'VISION_API_ERROR',
          message: error?.message || 'Unknown Vision API error',
          details: {
            errorName: error?.name,
            status: error?.status || error?.response?.status,
          },
        },
      };
    }
  }
}


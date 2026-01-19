import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import OpenAI from 'openai';
import { z } from 'zod';
import { CacheService } from '../cache/cache.service';
import * as crypto from 'crypto';
import * as sharp from 'sharp';

// Maximum base64 size for Vision API (characters)
// FIX v2: Further reduced for faster processing
const MAX_BASE64_SIZE = 500_000; // ~375KB base64 = ~280KB image

// Target dimensions for image optimization
// OMEGA v5: Reduced to 512px for faster processing (was 768)
const TARGET_MAX_DIMENSION = 512; // pixels

// Vision API timeout (for speed optimization)
const VISION_TIMEOUT_MS = 25000; // 25 second target (was 20)

// Version for cache key - increment when prompt or schema changes
const VISION_PROMPT_VERSION = 'omega_v5.2_2026-01-19_quality_balance';

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
  // DISABLED: No retries - just use longer timeout
  private readonly MAX_RETRIES = 0;
  private readonly RETRY_DELAY_MS = 500;

  constructor(private readonly cache: CacheService) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      this.logger.error('[VisionService] OPENAI_API_KEY is not configured!');
    }
    this.openai = new OpenAI({
      apiKey,
      timeout: VISION_TIMEOUT_MS, // Use constant (25s) instead of hardcoded 90s
      maxRetries: 0, // No built-in retries
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
    // ALWAYS convert, regardless of base64 presence
    let finalImageUrl = imageUrl;
    if (imageUrl) {
      if (imageUrl.startsWith('/')) {
        const apiBaseUrl = process.env.API_PUBLIC_URL || process.env.API_BASE_URL || 'https://caloriecam-production.up.railway.app';
        finalImageUrl = `${apiBaseUrl}${imageUrl}`;
        this.logger.debug(`[VisionService] Converted relative URL to absolute: ${finalImageUrl}`);
      } else if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://') && !imageUrl.startsWith('data:')) {
        const apiBaseUrl = process.env.API_PUBLIC_URL || process.env.API_BASE_URL || 'https://caloriecam-production.up.railway.app';
        finalImageUrl = `${apiBaseUrl}/${imageUrl}`;
      }
    }

    // PREFER URL over base64 (smaller request = faster, no timeout)
    // OpenAI will fetch the image directly from our server
    let imageContent: any;

    if (finalImageUrl && finalImageUrl.startsWith('https://')) {
      this.logger.debug(`[VisionService] Using URL for Vision API: ${finalImageUrl}`);
      imageContent = { type: 'image_url', image_url: { url: finalImageUrl } };
    } else if (imageBase64) {
      const optimizedBase64 = await this.optimizeImageBase64(imageBase64);
      this.logger.debug(`[VisionService] Using base64 for Vision API (${Math.round(optimizedBase64.length / 1024)}KB)`);
      imageContent = { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${optimizedBase64}` } };
    } else {
      throw new BadRequestException('Either imageBase64 or valid imageUrl must be provided');
    }

    // Debug log (only log first N chars of base64, not full string)
    this.logger.debug(
      `[VisionService] Calling OpenAI Vision with base64=${Boolean(imageBase64)}, url=${imageBase64 ? 'data:image/jpeg;base64,...' : finalImageUrl}`,
    );

    // Enhanced system prompt - EatSense OMEGA v4.0 fast, accurate food recognition
    // Locale is passed from getOrExtractComponents params
    const locale = params.imageUrl ? 'ru' : 'en'; // Default, actual locale should be passed through

    let systemPrompt = `You are EatSense OMEGA v5.0 — fast, accurate food recognition.

## OUTPUT FORMAT
Return ONLY valid JSON:
{
  "imageQuality": "good" | "medium" | "poor",
  "dish": {
    "name": "string or null",
    "name_local": "string or null", 
    "confidence": 0.0-1.0
  },
  "visible_items": [
    {
      "id": "A",
      "name": "english name, lowercase",
      "name_local": "локализованное название",
      "display_name": "English Title",
      "display_name_local": "Локальный Заголовок",
      "est_portion_g": 100,
      "category_hint": "protein|grain|veg|fruit|fat|dairy|sauce|drink|other",
      "cooking_method": "raw|boiled|steamed|baked|grilled|fried|deep_fried|mixed",
      "confidence": 0.0-1.0,
      "estimated_nutrients": {
        "calories": 0,
        "protein_g": 0,
        "fat_g": 0,
        "carbs_g": 0
      }
    }
  ],
  "totals": { "kcal": 0, "protein": 0, "fat": 0, "carbs": 0 }
}

## CALORIE REFERENCE (per 100g) - USE THESE VALUES!
Vegetables (raw/steamed):
- Bell pepper: 26 kcal, 1g protein, 6g carbs, 0g fat
- Broccoli: 34 kcal, 3g protein, 7g carbs, 0g fat
- Tomato: 18 kcal, 1g protein, 4g carbs, 0g fat
- Cucumber: 15 kcal, 1g protein, 3g carbs, 0g fat
- Onion: 40 kcal, 1g protein, 9g carbs, 0g fat
- Carrot: 41 kcal, 1g protein, 10g carbs, 0g fat
- Zucchini: 17 kcal, 1g protein, 3g carbs, 0g fat
- Basil/herbs: 23 kcal, 3g protein, 3g carbs, 0g fat
- Olives: 115 kcal, 1g protein, 6g carbs, 11g fat
- Capers: 23 kcal, 2g protein, 5g carbs, 0g fat

Proteins:
- Chicken breast: 165 kcal, 31g protein, 0g carbs, 4g fat
- Beef: 250 kcal, 26g protein, 0g carbs, 15g fat
- Salmon: 208 kcal, 20g protein, 0g carbs, 13g fat
- Egg: 155 kcal, 13g protein, 1g carbs, 11g fat

## RULES
1. Identify ALL visible food items
2. Use CALORIE REFERENCE values above for vegetables!
3. confidence < 0.7 → use generic name ("fish" not "salmon")
4. DO NOT hallucinate invisible ingredients
5. Composite dishes (soup, curry) = SINGLE item with itemType: "composite_dish"

## PORTION REFERENCE
- Palm-sized meat = 100g
- Fist-sized rice/pasta = 150g
- Cup = 200ml, Glass = 250ml
- Round to nearest 10g

## COOKING ADJUSTMENTS
- fried: +20% cal, +30% fat
- deep_fried: +35% cal, +50% fat
- grilled/baked: +5% cal

## QUALITY CAPS
- good: confidence up to 1.0
- medium: max 0.85
- poor: max 0.75

## LOCALIZATION (locale: ${locale})
- ru: "лосось", "рис", "курица", "борщ"
- kk: "балық", "күріш", "тауық"
- en: default English names

## DISH NAMING
1. Recognizable dish (≥80% match): use canonical name
2. Unclear dish: use descriptive name like "Grilled chicken with rice"
3. Single item: dish.name = null, use visible_items[0].display_name

Remember: Output ONLY valid JSON. No markdown, no text outside JSON.`;

    // Add review mode instructions
    if (mode === 'review') {
      systemPrompt += `

REVIEW MODE - Be extra careful:
- Lower confidence for uncertain items
- Prefer general names over specific guesses
- Be honest about uncertainty`;
    }

    // FIX 2026-01-19: Use gpt-4o-mini by default for faster responses (~8-10s vs 15-20s)
    // Can be overridden via VISION_MODEL env var to 'gpt-4o' if quality issues arise
    const model = process.env.VISION_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.logger.debug(`[VisionService] Using model: ${model} for component extraction`);

    // Configure timeout for Vision API call (default 90 seconds, configurable via env)
    // UPDATED: Increased to 90s for reliability with URL-based requests
    const timeoutMs = parseInt(process.env.VISION_API_TIMEOUT_MS || '90000', 10);

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
            max_completion_tokens: 1200, // OMEGA v5.2: Balanced for quality (was 1000)
            temperature: 0.1, // OMEGA v4: Lower for consistency
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


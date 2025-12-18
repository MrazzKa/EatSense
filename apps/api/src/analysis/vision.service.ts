import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import OpenAI from 'openai';
import { z } from 'zod';
import { CacheService } from '../cache/cache.service';
import * as crypto from 'crypto';

const VisionComponentSchema = z.object({
  name: z.string(),
  preparation: z.string().optional(),
  est_portion_g: z.number().optional(),
  confidence: z.number().optional(),
  cooking_method: z.enum(['fried', 'deep_fried', 'baked', 'grilled', 'boiled', 'steamed', 'raw', 'mixed']).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const VisionHiddenItemSchema = z.object({
  name: z.string(),
  category: z.enum(['cooking_oil', 'butter_or_cream', 'sauce_or_dressing', 'added_sugar', 'breaded_or_batter', 'processed_meat_fillers', 'other']),
  reason: z.string(),
  confidence: z.number().min(0).max(1),
  estimated_grams: z.number().optional(),
});

const VisionArraySchema = z.array(VisionComponentSchema);

// Flexible schema: accepts array, { components: [...] }, or { items: [...] }
const VisionFlexibleSchema = z.union([
  VisionArraySchema,
  z.object({
    components: VisionArraySchema,
  }),
  z.object({
    items: VisionArraySchema,
  }),
  z.object({
    visible_items: VisionArraySchema,
    hidden_items: z.array(VisionHiddenItemSchema).optional(),
  }),
]);

// Export type for use in AnalyzeService
export type VisionComponent = z.infer<typeof VisionComponentSchema>;
export type VisionHiddenItem = z.infer<typeof VisionHiddenItemSchema>;

@Injectable()
export class VisionService {
  private readonly logger = new Logger(VisionService.name);
  private readonly openai: OpenAI;

  constructor(private readonly cache: CacheService) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Generate cache key from image identifier
   * P2: Cache Vision API results to reduce API calls
   * 
   * Improved: Uses SHA-256 hash of image buffer/base64 for better cache hits
   * on identical images regardless of URL changes
   */
  private buildCacheKey(params: { buffer?: Buffer; url?: string; base64?: string }, locale?: string, mode?: string): string {
    const namespace = 'vision:components';
    const localePart = locale || 'en';
    const modePart = mode || 'default';
    
    // Priority: Buffer > base64 > URL (most reliable to least)
    if (params.buffer) {
      const hash = crypto.createHash('sha256').update(params.buffer).digest('hex');
      return `${namespace}:${hash}:${localePart}:${modePart}`;
    }
    
    if (params.base64) {
      const hash = crypto.createHash('sha256').update(`${params.base64}:${localePart}:${modePart}`).digest('hex');
      return `${namespace}:${hash.substring(0, 32)}:${localePart}:${modePart}`;
    }
    
    if (params.url) {
      const hash = crypto.createHash('sha256').update(`${params.url}:${localePart}:${modePart}`).digest('hex');
      return `${namespace}:${hash.substring(0, 32)}:${localePart}:${modePart}`;
    }
    
    // Fallback
    const rand = Math.random().toString(36).slice(2);
    return `${namespace}:nohash:${rand}:${localePart}:${modePart}`;
  }

  /**
   * Legacy method for backward compatibility
   */
  private generateCacheKey(imageUrl?: string, imageBase64?: string, mode?: string): string {
    return this.buildCacheKey({ url: imageUrl, base64: imageBase64 }, undefined, mode);
  }

  /**
   * Get or extract components with caching
   * P2: Optimized wrapper that checks cache before calling Vision API
   */
  async getOrExtractComponents(params: {
    imageBuffer?: Buffer;
    imageUrl?: string;
    imageBase64?: string;
    locale?: string;
    mode?: 'default' | 'review';
    foodDescription?: string;
  }): Promise<VisionComponent[]> {
    const { imageBuffer, imageUrl, imageBase64, locale = 'en', mode = 'default', foodDescription } = params;

    if (!imageBuffer && !imageUrl && !imageBase64) {
      throw new Error('Either imageBuffer, imageUrl, or imageBase64 must be provided');
    }

    // Build cache key
    const cacheKey = this.buildCacheKey(
      { buffer: imageBuffer, url: imageUrl, base64: imageBase64 },
      locale,
      mode,
    );

    // Try cache first
    const cached = await this.cache.get<VisionComponent[]>(cacheKey, 'vision');
    if (cached) {
      this.logger.debug(`[VisionService] Cache hit for vision analysis (key: ${cacheKey.substring(0, 40)}...)`);
      return cached;
    }

    this.logger.debug(`[VisionService] Cache miss, calling OpenAI Vision API (key: ${cacheKey.substring(0, 40)}...)`);

    // Call actual extractComponents
    const components = await this.extractComponents({
      imageUrl,
      imageBase64: imageBase64 || (imageBuffer ? imageBuffer.toString('base64') : undefined),
      mode,
      foodDescription,
    });

    // Cache successful results (7 days default via CacheService)
    if (components.length > 0) {
      await this.cache.set(cacheKey, components, 'vision').catch((err) => {
        this.logger.warn(`[VisionService] Failed to cache vision result: ${err.message}`);
      });
    }

    return components;
  }

  /**
   * Extract food components from image using OpenAI Vision
   * P2: Optimized with caching to reduce API calls
   */
  async extractComponents(params: { imageUrl?: string; imageBase64?: string; mode?: 'default' | 'review'; foodDescription?: string }): Promise<VisionComponent[]> {
    const { imageUrl, imageBase64, mode = 'default', foodDescription } = params;

    if (!imageUrl && !imageBase64) {
      throw new Error('Either imageUrl or imageBase64 must be provided');
    }

    // P2: Check cache first
    const cacheKey = this.generateCacheKey(imageUrl, imageBase64, mode);
    const cached = await this.cache.get<VisionComponent[]>(cacheKey, 'vision');
    if (cached) {
      this.logger.debug(`[VisionService] Cache hit for vision analysis (key: ${cacheKey.substring(0, 20)}...)`);
      return cached;
    }

    this.logger.debug(`[VisionService] Cache miss, calling OpenAI Vision API (key: ${cacheKey.substring(0, 20)}...)`);

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
    const imageContent: any = imageBase64
      ? { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
      : { type: 'image_url', image_url: { url: finalImageUrl } };

    // Validate that we have either base64 or a valid URL
    if (!imageBase64 && !finalImageUrl) {
      throw new BadRequestException('Either imageBase64 or valid imageUrl must be provided');
    }

    // Debug log (only log first N chars of base64, not full string)
    this.logger.debug(
      `[VisionService] Calling OpenAI Vision with base64=${Boolean(imageBase64)}, url=${imageBase64 ? 'data:image/jpeg;base64,...' : finalImageUrl}`,
    );

    // Enhanced system prompt based on world-class nutritionist approach
    let systemPrompt = `You are a world-class food nutritionist with 25 years of clinical experience analyzing meals for patients with diabetes, heart disease, and obesity. Your analyses directly impact patient health outcomes. Accuracy is CRITICAL.

## YOUR ANALYSIS PROCESS

For each image, follow this EXACT mental process:

### STEP 1: SCENE SCAN
First, identify what IS and IS NOT food:
- ✅ FOOD: Anything edible that will be consumed
- ❌ NOT FOOD: Plates, bowls, cups, cutlery, napkins, packaging, containers, hands, background items

### STEP 2: FOOD IDENTIFICATION (for each food item)

Ask yourself these questions IN ORDER:

**A) SHAPE ANALYSIS:**
- Is it ROUND/FLAT? → Likely: cutlet, patty, pancake, cookie
- Is it CYLINDRICAL/LONG? → Likely: sausage, hot dog, carrot, banana
- Is it IRREGULAR/CHUNKY? → Likely: meat piece, vegetable chunk, stew
- Is it LAYERED? → Likely: sandwich, lasagna, cake
- Is it PILED/MOUNDED? → Likely: rice, mashed potato, salad

**B) COLOR ANALYSIS:**
- WHITE/CREAM: rice, potato, chicken breast, fish, dairy
- BROWN/GOLDEN: cooked meat, bread, fried foods
- RED/PINK: raw meat, tomato, beets, berries
- GREEN: vegetables, salad, herbs
- ORANGE: carrot, sweet potato, salmon, orange
- DARK BROWN/BLACK: chocolate, burnt, soy sauce

**C) TEXTURE ANALYSIS:**
- SMOOTH: puree, sauce, cream, soup
- FIBROUS: meat, fish, celery
- GRAINY: rice, couscous, quinoa
- FLAKY: fish, pastry, pie crust
- CRISPY/CRUNCHY: fried coating, chips, crackers
- GLOSSY/SHINY: sauce, dressing, oil, glaze

**D) COOKING METHOD EVIDENCE:**
- CHAR MARKS/GRILL LINES → Grilled
- GOLDEN CRISPY COATING → Fried or baked
- PALE/SOFT → Boiled or steamed
- DARK SEAR → Pan-fried or roasted
- RAW COLOR/TEXTURE → Raw/uncooked

### STEP 3: PORTION ESTIMATION

Use these VISUAL REFERENCES:
- Your PALM (without fingers) = 100g cooked meat/fish
- Your FIST = 150g cooked rice/pasta/potato
- Your THUMB = 15g butter/cheese/sauce
- Your CUPPED HAND = 40g nuts/snacks
- TENNIS BALL = 130g fruit
- GOLF BALL = 30g dense food (meatball, falafel)
- DECK OF CARDS = 85g meat

**CRITICAL MINIMUMS** (visible food is NEVER smaller than):
- Any piece of meat: 40g minimum
- Any fish portion: 50g minimum
- Vegetables on plate: 25g minimum
- Rice/pasta/potato serving: 40g minimum
- Sauce (if visible): 10g minimum
- Bread slice: 25g minimum

### STEP 4: COMPOUND FOOD DETECTION

If food has ANY of these, include them in the name:
- Coating → "breaded chicken" not just "chicken"
- Sauce → "pasta with tomato sauce" not just "pasta"
- Glaze → "glazed donut" not just "donut"
- Topping → "pizza with pepperoni" not just "pizza"
- Dressing → "salad with ranch dressing" not just "salad"
- Chocolate → "chocolate-covered strawberry" not just "strawberry"
- Cheese → "cheeseburger" not just "burger"
- Cream → "coffee with cream" not just "coffee"

### STEP 5: CALORIE SANITY CHECK

Before outputting, verify calories make sense:

| Food Type | kcal per 100g | If outside range → FLAG |
|-----------|---------------|-------------------------|
| Vegetables | 15-50 | Suspicious |
| Fruits | 30-90 | Suspicious |
| Cooked grains | 100-150 | Suspicious |
| Lean meat | 100-180 | Suspicious |
| Fatty meat | 200-350 | Suspicious |
| Fish | 80-200 | Suspicious |
| Bread | 240-300 | Suspicious |
| Cheese | 250-450 | Suspicious |
| Fried foods | 200-400 | Suspicious |
| Sweets/desserts | 300-550 | Suspicious |
| Drinks (non-alcohol) | 0-60 | Suspicious |
| Water/black coffee/tea | 0-5 | Must be near 0 |

## COMMON MISTAKES TO AVOID

### Shape Confusion:
| WRONG | RIGHT | How to tell |
|-------|-------|-------------|
| "sausage" for a cutlet | "beef cutlet" | Cutlets are FLAT and ROUND, sausages are CYLINDRICAL |
| "meatball" for a cutlet | "chicken cutlet" | Meatballs are SPHERICAL, cutlets are FLAT |
| "bread" for a pancake | "pancake" | Pancakes are thinner, often stacked, softer |

### Calorie Confusion:
| WRONG | RIGHT |
|-------|-------|
| Mashed potato 350 kcal/100g | Mashed potato 90-110 kcal/100g (even with butter) |
| Water 50 kcal | Water 0 kcal |
| Black coffee 100 kcal | Black coffee 2 kcal |
| Fresh strawberry 150 kcal/100g | Fresh strawberry 32 kcal/100g |
| Chocolate strawberry 32 kcal/100g | Chocolate strawberry 200-250 kcal/100g |

### Non-Food Inclusion:
| NEVER INCLUDE |
|---------------|
| "plastic container" - has no calories, is not food |
| "paper napkin" - is not food |
| "ceramic plate" - is not food |
| "metal fork" - is not food |
| "cardboard box" - is not food |

## OUTPUT FORMAT

Return ONLY this JSON structure. No markdown, no explanations outside JSON:

{
  "analysis_reasoning": {
    "scene_description": "Brief description of what you see",
    "food_items_detected": ["list", "of", "foods"],
    "non_food_items_ignored": ["list", "of", "ignored", "items"]
  },
  "food_items": [
    {
      "name": "specific food name in lowercase",
      "name_local": "название на русском (if locale=ru)",
      "portion_grams": 150,
      "confidence": 0.92,
      "identification_reasoning": "Why I identified this as X: shape is..., color is..., texture is...",
      "cooking_method": "grilled|fried|baked|boiled|steamed|raw|roasted|sauteed|mixed",
      "visible_additions": ["butter", "sauce", "cheese"],
      "estimated_nutrients": {
        "calories": 180,
        "protein_g": 25.0,
        "carbs_g": 0.5,
        "fat_g": 8.0,
        "fiber_g": 0.0
      },
      "calorie_sanity_check": {
        "kcal_per_100g": 120,
        "expected_range": "100-180 for lean meat",
        "is_reasonable": true
      }
    }
  ],
  "hidden_ingredients": [
    {
      "name": "cooking oil",
      "category": "cooking_fat",
      "reasoning": "Fried food typically absorbs 5-15% oil by weight",
      "estimated_grams": 15,
      "confidence": 0.75
    }
  ],
  "meal_summary": {
    "total_items": 3,
    "total_calories": 450,
    "total_protein_g": 35.0,
    "total_carbs_g": 40.0,
    "total_fat_g": 15.0,
    "meal_type": "lunch",
    "healthiness_rating": "balanced"
  },
  "flags": {
    "needs_user_review": false,
    "low_confidence_items": [],
    "unusual_combinations": []
  }
}

CRITICAL RULES:
1. Return ONLY valid JSON with this exact structure - no markdown, no additional keys, no explanations
2. For VISIBLE components: name (English, lowercase), preparation method, estimated portion in grams, confidence (0-1), cooking_method, tags, notes
3. Include sauces, oils, dressings as separate VISIBLE items when clearly visible
4. Names must be specific, in lowercase, and concise (max 3-4 words). Example: "grilled chicken breast" not "GRILLED CHICKEN BREAST" or "perfectly grilled premium chicken breast fillet"
5. Preparation methods: raw, boiled, steamed, baked, grilled, fried, roasted, sauteed, unknown
6. Cooking methods: fried, deep_fried, baked, grilled, boiled, steamed, raw, mixed
7. Tags: use tags like "salad_with_dressing", "sweet_dessert", "breaded", "creamy_sauce", "visible_oil", "sugary_drink", "processed_meat" to help identify hidden ingredients
8. Estimate realistic portion sizes based on visual appearance (use typical serving sizes)
9. Confidence should reflect certainty of identification (0.55+ for visible items)
10. IMPORTANT: Identify foods accurately - if you see fish (salmon, tuna, etc.), name it as fish, NOT sausage or processed meat
11. If you see grains (rice, quinoa, barley, etc.), name them correctly, NOT as bread or pasta unless clearly visible
12. Main protein should be identified first and most accurately (e.g., "pan-fried salmon fillet", "grilled chicken breast")
13. Vegetables should be identified by type when visible (e.g., "steamed broccoli", "roasted carrots")
14. NEVER use ALL CAPS or excessive descriptive words - keep names simple and natural
15. HIDDEN INGREDIENTS: Identify likely hidden ingredients that add calories but may not be clearly visible:
    - Cooking oil/butter used for frying or roasting (if food looks fried but oil not clearly visible)
    - Creamy sauces and salad dressings (if salad looks glossy or creamy but dressing not visible)
    - Added sugar or syrup (if dessert/drink looks sweet but sugar not visible)
    - Hidden fats in processed meats
    - Batter or breading soaked with oil
16. For each hidden ingredient, provide: name (short, human readable), category (cooking_oil, butter_or_cream, sauce_or_dressing, added_sugar, breaded_or_batter, processed_meat_fillers, other), reason (why present), confidence (0.0-1.0), estimated_grams (approximate)
17. Do NOT double count: hidden ingredients represent "extra" calories (oil, sugar, etc.), not the main components themselves`;

    // Add review mode instructions
    if (mode === 'review') {
      systemPrompt += `

REVIEW MODE - This is a re-analysis. Be extra careful:
- Be more conservative with confidence scores - only use high confidence (0.7+) if you're very certain
- If you're unsure about a specific dish name, prefer a more general term (e.g., "fish dish" instead of a complex local cuisine name)
- Double-check that you're not confusing similar-looking foods (e.g., rice vs. quinoa, chicken vs. fish)
- Be honest about uncertainty - it's better to give a lower confidence score than to guess incorrectly`;
    }

    systemPrompt += `

REQUIRED OUTPUT FORMAT - Return ONLY valid JSON with this exact structure:

PREFERRED FORMAT (with hidden ingredients):
{
  "visible_items": [
    {
      "name": "grilled chicken breast",
      "preparation": "grilled",
      "est_portion_g": 180,
      "confidence": 0.87,
      "cooking_method": "grilled",
      "tags": ["lean_protein"],
      "notes": "boneless skinless chicken"
    },
    {
      "name": "green salad",
      "preparation": "raw",
      "est_portion_g": 100,
      "confidence": 0.85,
      "cooking_method": "raw",
      "tags": ["salad_with_dressing"],
      "notes": "glossy look suggests dressing"
    }
  ],
  "hidden_items": [
    {
      "name": "olive oil for salad dressing",
      "category": "sauce_or_dressing",
      "reason": "green salad with glossy look and no visible low-fat dressing",
      "confidence": 0.8,
      "estimated_grams": 10
    }
  ]
}

LEGACY FORMAT (backward compatible):
[{"name": "grilled chicken breast", "preparation": "grilled", "est_portion_g": 180, "confidence": 0.87}]

OR:
{"components": [{"name": "grilled chicken breast", "preparation": "grilled", "est_portion_g": 180, "confidence": 0.87}]}

No markdown, no additional keys, no text before or after JSON.`;

    const model = process.env.OPENAI_MODEL || process.env.VISION_MODEL || 'gpt-5.1';
    this.logger.debug(`[VisionService] Using model: ${model} for component extraction`);
    
    // Configure timeout for Vision API call (default 60 seconds, configurable via env)
    const timeoutMs = parseInt(process.env.VISION_API_TIMEOUT_MS || '60000', 10);
    
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Vision API call timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      // Create Vision API call promise
      const visionApiPromise = this.openai.chat.completions.create({
        // Use global OPENAI_MODEL if provided (e.g. gpt-5.1), fallback to VISION_MODEL or default
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
      const response = await Promise.race([visionApiPromise, timeoutPromise]);

      // Type guard to check if response is not a timeout error
      if (!response || typeof response !== 'object' || !('choices' in response)) {
        throw new Error('Vision API call timed out or returned invalid response');
      }

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI Vision');
      }

      // Parse JSON - super robust parsing
      let parsed: z.infer<typeof VisionFlexibleSchema>;
      try {
        const json = JSON.parse(content);
        parsed = VisionFlexibleSchema.parse(json);
      } catch (err: any) {
        // Log snippet of content for debugging
        const contentSnippet = content.slice(0, 500);
        this.logger.error('[VisionService] Failed to parse components JSON', {
          contentSnippet,
          error: err instanceof Error ? err.message : String(err),
          errorName: err?.name,
        });
        return [];
      }

      // Extract components array from flexible structure
      let components: any[] = [];
      let hiddenItems: VisionHiddenItem[] = [];

      if (Array.isArray(parsed)) {
        // Legacy format: array of components
        components = parsed;
      } else if ((parsed as any).visible_items) {
        // New format: { visible_items, hidden_items }
        components = (parsed as any).visible_items || [];
        hiddenItems = (parsed as any).hidden_items || [];
      } else {
        // Legacy object format: { components: [...] } or { items: [...] }
        components = (parsed as any).components ?? (parsed as any).items ?? [];
      }

      // Validate and filter components
      const validated: VisionComponent[] = [];
      for (const comp of components) {
        try {
          // Validate individual component with relaxed schema
          const validatedComp = VisionComponentSchema.parse(comp);
          // Apply defaults for optional fields
          const finalComp: VisionComponent = {
            name: validatedComp.name || 'Unknown',
            preparation: validatedComp.preparation || 'unknown',
            est_portion_g: validatedComp.est_portion_g || 100,
            confidence: validatedComp.confidence ?? 0.7,
            cooking_method: validatedComp.cooking_method,
            tags: validatedComp.tags,
            notes: validatedComp.notes,
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

      // Store hidden items - we'll need to pass them to AnalyzeService
      // For now, attach them as a property on each component that might need them
      // Or store in a separate cache entry
      // Since we can't change return type easily, we'll store hidden items separately
      // and AnalyzeService will need to extract them from the raw response
      
      // Cache hidden items separately if needed
      if (hiddenItems.length > 0) {
        const hiddenCacheKey = `${cacheKey}:hidden`;
        await this.cache.set(hiddenCacheKey, hiddenItems, 'vision').catch((err) => {
          this.logger.warn(`[VisionService] Failed to cache hidden items: ${err.message}`);
        });
      }

      // P2: Cache successful results
      if (validated.length > 0) {
        await this.cache.set(cacheKey, validated, 'vision').catch((err) => {
          this.logger.warn(`[VisionService] Failed to cache vision result: ${err.message}`);
        });
      }

      return validated;
    } catch (error: any) {
      // Check if it's a timeout error
      if (error?.message?.includes('timed out') || error?.message?.includes('timeout')) {
        this.logger.error('[VisionService] Vision API timeout', {
          timeoutMs,
          model,
          hasBase64: Boolean(imageBase64),
          imageUrl: imageBase64 ? 'data:image/jpeg;base64,...' : finalImageUrl,
        });
        throw new Error(`Vision API call timed out after ${timeoutMs}ms. The image may be too large or the network is slow.`);
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
        throw new Error('OpenAI rate limit exceeded. Please try again later.');
      }

      // If URL-based and error, suggest using base64
      if (!imageBase64 && finalImageUrl) {
        this.logger.warn('[VisionService] Vision API error with URL, consider using base64 for better reliability');
      }

      throw error;
    }
  }
}


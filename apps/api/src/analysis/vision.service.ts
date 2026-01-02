import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import OpenAI from 'openai';
import { z } from 'zod';
import { CacheService } from '../cache/cache.service';
import * as crypto from 'crypto';

// Version for cache key - increment when prompt or schema changes
const VISION_PROMPT_VERSION = 'v5_2025-12-31';

const VisionComponentSchema = z.object({
  // Core identification
  name: z.string(), // Base name in English, lowercase (e.g., "salmon", "quinoa")
  name_local: z.string().optional(), // Base name in local language (e.g., "лосось")
  display_name: z.string().optional(), // Short display name EN, Title Case, 1-2 words (e.g., "Salmon")
  display_name_local: z.string().optional(), // Short display name RU, 1-2 words (e.g., "Лосось")

  // Minor item flag (for toppings like sesame, nori, herbs)
  is_minor: z.boolean().optional(),

  // Category and state hints for better nutrition lookup
  category_hint: z.enum(['protein', 'grain', 'veg', 'fruit', 'fat', 'seeds', 'spice', 'sauce', 'drink', 'other']).optional(),
  state_hint: z.enum(['raw', 'cooked', 'boiled', 'steamed', 'baked', 'grilled', 'fried', 'dried', 'pickled', 'roasted', 'sauteed', 'unknown']).optional(),

  // Existing fields
  preparation: z.string().optional(),
  est_portion_g: z.number().optional(),
  confidence: z.number().optional(),
  cooking_method: z.enum(['fried', 'deep_fried', 'baked', 'grilled', 'boiled', 'steamed', 'raw', 'mixed', 'roasted', 'sauteed']).optional(),
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

// Flexible schema: accepts array, { components: [...] }, { items: [...] }, { food_items: [...] }, etc.
const VisionFlexibleSchema = z.union([
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
   */
  async getOrExtractComponents(params: {
    imageBuffer?: Buffer;
    imageUrl?: string;
    imageBase64?: string;
    locale?: string;
    mode?: 'default' | 'review';
    foodDescription?: string;
  }): Promise<{ components: VisionComponent[]; hiddenItems: VisionHiddenItem[] }> {
    const { imageBuffer, imageUrl, imageBase64, locale = 'en', mode = 'default', foodDescription } = params;

    if (!imageBuffer && !imageUrl && !imageBase64) {
      throw new Error('Either imageBuffer, imageUrl, or imageBase64 must be provided');
    }

    // Build cache key with version
    const cacheKey = this.buildCacheKey(
      { buffer: imageBuffer, url: imageUrl, base64: imageBase64 },
      locale,
      mode,
    );

    // Try cache first - components
    const cached = await this.cache.get<VisionComponent[]>(cacheKey, 'vision');
    if (cached) {
      this.logger.debug(`[VisionService] Cache hit for vision analysis (key: ${cacheKey.substring(0, 50)}...)`);
      // Also try to get cached hidden items
      const cachedHidden = await this.cache.get<VisionHiddenItem[]>(`${cacheKey}:hidden`, 'vision');
      return { components: cached, hiddenItems: cachedHidden || [] };
    }

    this.logger.debug(`[VisionService] Cache miss, calling OpenAI Vision API (key: ${cacheKey.substring(0, 50)}...)`);

    // Call actual extractComponents (no internal caching)
    const { components, hiddenItems } = await this.extractComponentsInternal({
      imageUrl,
      imageBase64: imageBase64 || (imageBuffer ? imageBuffer.toString('base64') : undefined),
      mode,
      foodDescription,
    });

    // Cache successful results with correct key (including version)
    if (components.length > 0) {
      await this.cache.set(cacheKey, components, 'vision').catch((err) => {
        this.logger.warn(`[VisionService] Failed to cache vision result: ${err.message}`);
      });
    }

    // Cache hidden items with same key prefix + :hidden
    if (hiddenItems.length > 0) {
      await this.cache.set(`${cacheKey}:hidden`, hiddenItems, 'vision').catch((err) => {
        this.logger.warn(`[VisionService] Failed to cache hidden items: ${err.message}`);
      });
    }

    return { components, hiddenItems };
  }

  /**
   * Internal method - extract food components from image using OpenAI Vision
   * Called only by getOrExtractComponents - NO INTERNAL CACHING
   */
  private async extractComponentsInternal(params: { imageUrl?: string; imageBase64?: string; mode?: 'default' | 'review'; foodDescription?: string }): Promise<{ components: VisionComponent[]; hiddenItems: VisionHiddenItem[] }> {
    const { imageUrl, imageBase64, mode = 'default', foodDescription } = params;

    if (!imageUrl && !imageBase64) {
      throw new Error('Either imageUrl or imageBase64 must be provided');
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

### STEP 6: CRITICAL GRAIN IDENTIFICATION

RICE vs RICE PRODUCTS - VERY IMPORTANT:
| Visual Appearance | Correct English Name | Correct Russian Name | WRONG Name | kcal/100g |
|-------------------|---------------------|----------------------|------------|-----------|
| White fluffy separate grains | "boiled rice" | "рис отварной" | "rice flour" / "рисовая мука" | 130 |
| White powder, fine texture | "rice flour" | "рисовая мука" | "boiled rice" | 350 |
| Sticky clumped grains | "steamed rice" | "рис на пару" | "rice flour" | 130 |
| Fried with vegetables | "fried rice" | "жареный рис" | "rice flour" | 160 |
| Brown/tan grains | "brown rice" | "бурый рис" | "rice flour" | 111 |

**CRITICAL**: NEVER call visible rice grains "rice flour" (рисовая мука) - flour is a POWDER used for baking, not a cooked side dish!
If you see individual grains on a plate → it is COOKED RICE (рис отварной), NOT flour!

### STEP 7: DISH NAMING

When creating dish names, use this format:
- For plates with multiple components: "Plate with [main protein], [side], and [vegetables]"
- Russian: "Тарелка с [белок], [гарнир] и [овощи]"
- Examples:
  - "Plate with chicken breast, rice and vegetables" / "Тарелка с куриной грудкой, рисом и овощами"
  - "Grilled salmon with quinoa and broccoli" / "Лосось на гриле с киноа и брокколи"
  - "Balanced plate with beef, potatoes and salad" / "Сбалансированная тарелка с говядиной, картофелем и салатом"

For balanced/healthy plates you may use: "ПП тарелка" (Russian) or "Healthy plate" (English)

## COMMON MISTAKES TO AVOID

### Shape Confusion:
| WRONG | RIGHT | How to tell |
|-------|-------|-------------|
| "sausage" for a cutlet | "beef cutlet" | Cutlets are FLAT and ROUND, sausages are CYLINDRICAL |
| "meatball" for a cutlet | "chicken cutlet" | Meatballs are SPHERICAL, cutlets are FLAT |
| "bread" for a pancake | "pancake" | Pancakes are thinner, often stacked, softer |

### Grain Confusion (CRITICAL):
| WRONG | RIGHT | How to tell |
|-------|-------|-------------|
| "rice flour" for cooked rice | "boiled rice" / "рис отварной" | Flour is POWDER, rice is visible GRAINS |
| "рисовая мука" for рис | "рис отварной" | Мука - порошок для выпечки, рис - зёрна |
| "wheat flour" for pasta | "pasta" / "макароны" | Pasta is shaped, flour is powder |

### Calorie Confusion:
| WRONG | RIGHT |
|-------|-------|
| Mashed potato 350 kcal/100g | Mashed potato 90-110 kcal/100g (even with butter) |
| Boiled rice 350 kcal/100g | Boiled rice 130 kcal/100g |
| Rice flour dish 130 kcal/100g | Rice flour 350 kcal/100g (but flour is rarely served as-is) |
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
  "visible_items": [
    {
      "name": "salmon",
      "name_local": "лосось",
      "display_name": "Salmon",
      "display_name_local": "Лосось",
      "is_minor": false,
      "category_hint": "protein",
      "state_hint": "grilled",
      "est_portion_g": 150,
      "confidence": 0.92,
      "preparation": "grilled",
      "cooking_method": "grilled",
      "tags": ["lean_protein"],
      "notes": "fillet with skin",
      "estimated_nutrients": {
        "calories": 280,
        "protein_g": 35.0,
        "carbs_g": 0,
        "fat_g": 15.0,
        "fiber_g": 0
      }
    },
    {
      "name": "sesame seeds",
      "name_local": "кунжут",
      "display_name": "Sesame",
      "display_name_local": "Кунжут",
      "is_minor": true,
      "category_hint": "seeds",
      "state_hint": "dried",
      "est_portion_g": 5,
      "confidence": 0.85,
      "notes": "sprinkled on top"
    }
  ],
  "hidden_items": [
    {
      "name": "cooking oil",
      "category": "cooking_oil",
      "reason": "Grilled fish typically brushed with oil",
      "estimated_grams": 10,
      "confidence": 0.70
    }
  ]
}

CRITICAL NAMING RULES:
1. "name" = base ingredient in English, lowercase, NO cooking method (e.g., "salmon", NOT "grilled salmon fillet")
2. "name_local" = same but in Russian if locale=ru (e.g., "лосось", NOT "лосось на гриле")
3. "display_name" = 1-2 words, English, Title Case for UI (e.g., "Salmon", "Cherry Tomato")
4. "display_name_local" = 1-2 words, Russian, Title Case (e.g., "Лосось", "Помидор черри")
5. Put cooking info in "preparation" or "state_hint", NOT in name fields

MINOR ITEMS (is_minor=true):
- Sesame seeds: 2-8g (NOT 50g!)
- Nori seaweed: 1-3g (NOT 25g!)
- Fresh herbs/greens: 2-10g
- Spices/seasonings: 0-3g
- These items NEVER get the standard 40-50g minimum

CATEGORY HINTS:
- protein: meat, fish, eggs, tofu
- grain: rice, quinoa, pasta, bread
- veg: vegetables
- fruit: fruits
- fat: avocado, nuts, butter
- seeds: sesame, chia, flax
- spice: herbs, seasonings
- sauce: dressings, condiments
- drink: beverages
- other: unknown

STATE HINTS:
- raw: uncooked
- cooked: general cooked (default for most hot dishes)
- boiled: boiled in water
- steamed: steamed
- grilled: char-grilled
- fried: pan-fried or deep-fried
- dried: dehydrated (for nori, dried herbs)

PORTION RULES:
1. Use realistic portions based on visual size
2. Protein (meat/fish): typical 100-180g
3. Grains (cooked): typical 100-150g
4. Vegetables: typical 50-100g
5. Fats (avocado): typical 50-80g
6. Seeds/toppings: 2-8g (very small!)
7. Nori: 1-3g (one sheet is ~2.5g)

HIDDEN INGREDIENTS - same as before, identify likely hidden calories:
- Cooking oil for frying/grilling
- Dressings if salad looks glossy
- DO NOT double count with visible items`;

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

    const model = process.env.OPENAI_MODEL || process.env.VISION_MODEL || 'gpt-4o';
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
      const response = await Promise.race([visionApiPromise, timeoutPromise]);

      // Type guard to check if response is not a timeout error
      if (!response || typeof response !== 'object' || !('choices' in response)) {
        throw new Error('Vision API call timed out or returned invalid response');
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
                  'roasted': 'roasted', // now valid
                  'sauteed': 'sauteed', // now valid
                  'pan-fried': 'fried',
                  'deep-fried': 'fried',
                  'broiled': 'grilled',
                  'smoked': 'cooked',
                  'braised': 'cooked',
                  'poached': 'boiled',
                  'microwaved': 'cooked',
                  'blanched': 'boiled',
                  'marinated': 'raw',
                  'cured': 'raw',
                  'fermented': 'raw',
                  'dehydrated': 'dried',
                };
                normalized[key] = stateMap[value.toLowerCase()] ||
                  (['raw', 'cooked', 'boiled', 'steamed', 'baked', 'grilled', 'fried', 'dried', 'pickled', 'roasted', 'sauteed', 'unknown'].includes(value.toLowerCase()) ? value.toLowerCase() : 'cooked');
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
            parsed = { visible_items: items, hidden_items: hiddenItems } as any;
          } else {
            // Log snippet of content for debugging
            const contentSnippet = content.slice(0, 500);
            this.logger.error('[VisionService] Failed to parse components JSON', {
              contentSnippet,
              error: err instanceof Error ? err.message : String(err),
              errorName: err?.name,
            });
            return { components: [], hiddenItems: [] };
          }
        } else {
          return { components: [], hiddenItems: [] };
        }
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
          // Normalize portion field (GPT might use portion_grams instead of est_portion_g)
          // Note: Keep undefined to let AnalyzeService apply category-based defaults
          const normalizedComp = {
            ...comp,
            est_portion_g: comp.est_portion_g ?? comp.portion_grams ?? comp.portion_g ?? comp.grams,
          };
          // Validate individual component with relaxed schema
          const validatedComp = VisionComponentSchema.parse(normalizedComp);
          // Apply defaults for optional fields (but NOT est_portion_g - let AnalyzeService handle it)
          const finalComp: VisionComponent = {
            name: validatedComp.name || 'Unknown',
            preparation: validatedComp.preparation || 'unknown',
            est_portion_g: validatedComp.est_portion_g, // Keep undefined if not set
            confidence: validatedComp.confidence ?? 0.7,
            cooking_method: validatedComp.cooking_method,
            tags: validatedComp.tags,
            notes: validatedComp.notes,
            estimated_nutrients: validatedComp.estimated_nutrients,
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

      // Return both components and hidden items (caching is done by caller)
      return { components: validated, hiddenItems };
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


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
  }): Promise<VisionComponent[]> {
    const { imageBuffer, imageUrl, imageBase64, locale = 'en', mode = 'default' } = params;

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
  async extractComponents(params: { imageUrl?: string; imageBase64?: string; mode?: 'default' | 'review' }): Promise<VisionComponent[]> {
    const { imageUrl, imageBase64, mode = 'default' } = params;

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

    // Base system prompt
    let systemPrompt = `You are a professional nutritionist and food analyst. Analyze food images and extract all visible food components AND identify likely hidden ingredients.

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
              { type: 'text', text: 'Analyze this food image and extract all components.' },
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


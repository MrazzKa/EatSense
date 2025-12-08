import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { z } from 'zod';
import { CacheService } from '../cache/cache.service';
import * as crypto from 'crypto';

const VisionComponentSchema = z.object({
  name: z.string(),
  preparation: z.string().optional(),
  est_portion_g: z.number().optional(),
  confidence: z.number().optional(),
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
]);

// Export type for use in AnalyzeService
export type VisionComponent = z.infer<typeof VisionComponentSchema>;

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
   */
  private generateCacheKey(imageUrl?: string, imageBase64?: string, mode?: string): string {
    const identifier = imageUrl || imageBase64 || '';
    const hash = crypto.createHash('sha256').update(`${identifier}:${mode || 'default'}`).digest('hex');
    return `vision:${hash.substring(0, 16)}`;
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

    const imageContent: any = imageUrl
      ? { type: 'image_url', image_url: { url: imageUrl } }
      : { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } };

    // Base system prompt
    let systemPrompt = `You are a professional nutritionist and food analyst. Analyze food images and extract all visible food components.

CRITICAL RULES:
1. Return ONLY valid JSON with this exact structure - no markdown, no additional keys, no explanations
2. Each component must have: name (English, lowercase), preparation method, estimated portion in grams, confidence (0-1)
3. Include sauces, oils, dressings as separate items when visible
4. Names must be specific, in lowercase, and concise (max 3-4 words). Example: "grilled chicken breast" not "GRILLED CHICKEN BREAST" or "perfectly grilled premium chicken breast fillet"
5. Preparation methods: raw, boiled, steamed, baked, grilled, fried, roasted, sauteed, unknown
6. Estimate realistic portion sizes based on visual appearance (use typical serving sizes)
7. Confidence should reflect certainty of identification (0.55+ for visible items)
8. IMPORTANT: Identify foods accurately - if you see fish (salmon, tuna, etc.), name it as fish, NOT sausage or processed meat
9. If you see grains (rice, quinoa, barley, etc.), name them correctly, NOT as bread or pasta unless clearly visible
10. Main protein should be identified first and most accurately (e.g., "pan-fried salmon fillet", "grilled chicken breast")
11. Vegetables should be identified by type when visible (e.g., "steamed broccoli", "roasted carrots")
12. NEVER use ALL CAPS or excessive descriptive words - keep names simple and natural`;

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
[{"name": "grilled chicken breast", "preparation": "grilled", "est_portion_g": 180, "confidence": 0.87}, {"name": "olive oil", "preparation": "raw", "est_portion_g": 15, "confidence": 0.65}]

OR as object:
{"components": [{"name": "grilled chicken breast", "preparation": "grilled", "est_portion_g": 180, "confidence": 0.87}]}

No markdown, no additional keys, no text before or after JSON.`;

    const model = process.env.OPENAI_MODEL || process.env.VISION_MODEL || 'gpt-5.1';
    this.logger.debug(`[VisionService] Using model: ${model} for component extraction`);
    
    try {
      const response = await this.openai.chat.completions.create({
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
      });

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
      const components = Array.isArray(parsed)
        ? parsed
        : (parsed as any).components ?? (parsed as any).items ?? [];

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

      // P2: Cache successful results
      if (validated.length > 0) {
        await this.cache.set(cacheKey, validated, 'vision').catch((err) => {
          this.logger.warn(`[VisionService] Failed to cache vision result: ${err.message}`);
        });
      }

      return validated;
    } catch (error: any) {
      this.logger.error('[VisionService] Vision extraction error', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        status: error?.status,
        responseStatus: error?.response?.status,
        responseData: error?.response?.data,
        model,
      });
      
      if (error?.status === 429 || error?.response?.status === 429) {
        throw new Error('OpenAI rate limit exceeded. Please try again later.');
      }

      throw error;
    }
  }
}


import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { CacheService } from '../cache/cache.service';
import {
  AnalyzedItem,
  AnalysisTotals,
  HealthScore,
  HealthFeedbackItem,
  HealthFeedbackType,
} from './analysis.types';

interface GenerateFeedbackParams {
  dishName: string;
  items: AnalyzedItem[];
  totals: AnalysisTotals;
  healthScore: HealthScore;
  userGoal?: string;
  locale: 'en' | 'ru' | 'kk';
  analysisId?: string;
}

/**
 * AI-powered health feedback generation service.
 * Generates personalized, contextual feedback for meal health scores using OpenAI.
 * 
 * STEP 3: Added to provide more diverse and personalized comments
 * compared to deterministic buildHealthFeedback().
 * 
 * Features:
 * - Generates 3-5 personalized feedback items per meal
 * - Uses actual numbers from analysis (not fabricated)
 * - Cached for 24 hours by (analysisId, locale)
 * - Falls back to deterministic feedback on AI failure
 */
@Injectable()
export class HealthFeedbackAiService {
  private readonly logger = new Logger(HealthFeedbackAiService.name);
  private readonly openai: OpenAI;
  private readonly CACHE_TTL_HOURS = 24;

  constructor(private readonly cacheService: CacheService) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Generate personalized AI feedback for a meal's health score.
   * Returns cached result if available.
   */
  async generateFeedback(params: GenerateFeedbackParams): Promise<HealthFeedbackItem[]> {
    const { dishName, items, totals, healthScore, userGoal, locale, analysisId } = params;

    // Check cache first
    if (analysisId) {
      const cacheKey = this.buildCacheKey(analysisId, locale);
      const cached = await this.cacheService.get<HealthFeedbackItem[]>(cacheKey, 'health_feedback_ai');
      if (cached) {
        this.logger.debug(`[HealthFeedbackAi] Cache hit for ${analysisId}:${locale}`);
        return cached;
      }
    }

    try {
      const feedback = await this.callOpenAI(params);
      
      // Cache the result
      if (analysisId && feedback.length > 0) {
        const cacheKey = this.buildCacheKey(analysisId, locale);
        await this.cacheService.set(cacheKey, feedback, 'health_feedback_ai', this.CACHE_TTL_HOURS * 3600);
      }

      return feedback;
    } catch (error: any) {
      this.logger.error(`[HealthFeedbackAi] OpenAI call failed: ${error.message}`);
      // Return empty array - caller should fall back to deterministic feedback
      return [];
    }
  }

  private buildCacheKey(analysisId: string, locale: string): string {
    return `health_feedback_ai:v1:${analysisId}:${locale}`;
  }

  private async callOpenAI(params: GenerateFeedbackParams): Promise<HealthFeedbackItem[]> {
    const { dishName, items, totals, healthScore, userGoal, locale } = params;

    // Build ingredient list
    const ingredientsList = items
      .map(i => `${i.name} (${i.portion_g}g, ${i.nutrients?.calories || 0} kcal)`)
      .join(', ');

    // Build factors description
    const factors = healthScore.factors;
    const factorsDesc = [
      `Protein: ${factors.protein}/100`,
      `Fiber: ${factors.fiber}/100`,
      `Saturated fat: ${factors.saturatedFat}/100 (higher = less sat fat)`,
      `Sugars: ${factors.sugars}/100 (higher = less sugar)`,
      `Energy density: ${factors.energyDensity}/100 (higher = less calorie-dense)`,
    ].join(', ');

    const systemPrompt = this.buildSystemPrompt(locale);
    const userPrompt = this.buildUserPrompt({
      dishName,
      ingredientsList,
      totals,
      healthScore,
      factorsDesc,
      userGoal,
      locale,
    });

    const response = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    return this.parseResponse(content);
  }

  private buildSystemPrompt(locale: 'en' | 'ru' | 'kk'): string {
    const langName = locale === 'ru' ? 'Russian' : locale === 'kk' ? 'Kazakh' : 'English';
    
    return `You are a nutrition expert assistant. Your task is to provide personalized, actionable feedback about a meal's nutritional quality.

RULES:
1. Generate 3-5 feedback items based on the meal analysis
2. Be SPECIFIC to THIS dish - mention actual ingredients and numbers
3. Do NOT invent nutrition numbers - only reference what's provided
4. If the score is high (70+), include at least one positive/celebration item
5. If the score is low (<50), focus on constructive suggestions, not criticism
6. Each item should be 1-2 sentences max
7. Use ${langName} language for all messages
8. Format response as JSON: {"feedback": [{"type": "positive"|"warning", "code": "string", "message": "string"}]}

CODES TO USE:
- positive: overall_excellent, overall_good, high_protein, high_fiber, low_sugar, balanced_macros, good_portions
- warning: low_protein, low_fiber, high_sugar, high_saturated_fat, high_energy_density, portion_warning, add_vegetables`;
  }

  private buildUserPrompt(params: {
    dishName: string;
    ingredientsList: string;
    totals: AnalysisTotals;
    healthScore: HealthScore;
    factorsDesc: string;
    userGoal?: string;
    locale: 'en' | 'ru' | 'kk';
  }): string {
    const { dishName, ingredientsList, totals, healthScore, factorsDesc, userGoal, locale } = params;
    
    const langHint = locale === 'ru' ? 'Respond in Russian.' : 
                     locale === 'kk' ? 'Respond in Kazakh.' : 
                     'Respond in English.';

    return `Analyze this meal and provide personalized feedback.

MEAL: ${dishName}
INGREDIENTS: ${ingredientsList}
TOTAL NUTRIENTS: ${Math.round(totals.calories)} kcal, ${Math.round(totals.protein)}g protein, ${Math.round(totals.carbs)}g carbs, ${Math.round(totals.fat)}g fat, ${Math.round(totals.fiber || 0)}g fiber
HEALTH SCORE: ${healthScore.total}/100 (${healthScore.level})
FACTORS: ${factorsDesc}
USER GOAL: ${userGoal || 'general health'}

${langHint}

Provide 3-5 feedback items in JSON format.`;
  }

  private parseResponse(content: string): HealthFeedbackItem[] {
    try {
      const parsed = JSON.parse(content);
      const feedbackArray = parsed.feedback || parsed.items || [];

      if (!Array.isArray(feedbackArray)) {
        this.logger.warn('[HealthFeedbackAi] Invalid response format, expected array');
        return [];
      }

      return feedbackArray
        .filter((item: any) => item && item.type && item.message)
        .map((item: any) => ({
          type: (item.type === 'positive' ? 'positive' : 'warning') as HealthFeedbackType,
          code: item.code || 'ai_generated',
          message: String(item.message).slice(0, 300), // Limit message length
        }))
        .slice(0, 6); // Max 6 items
    } catch (error: any) {
      this.logger.error(`[HealthFeedbackAi] Failed to parse response: ${error.message}`);
      return [];
    }
  }

  /**
   * Check if AI feedback generation is enabled via environment variable
   */
  isEnabled(): boolean {
    return process.env.HEALTH_FEEDBACK_AI_ENABLED === 'true';
  }
}

import { Controller, Get, Req, UseGuards, Query } from '@nestjs/common';
import { SuggestionsService, type SuggestedFoodItem } from './suggestions.service';
import { SuggestionsV2Service } from './suggestions-v2.service';
import { SuggestedFoodV2Response, SupportedLocale } from './suggestions.types';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma.service';

const CONTENT_LOCALES: readonly SupportedLocale[] = ['en', 'ru', 'kk'];

/**
 * Map any app locale (en/ru/kk/fr/de/es, possibly region-tagged like "fr-CH")
 * to a locale that has suggestion content. Content exists for en/ru/kk only,
 * so everything else falls back to English. Returns null for empty input.
 */
export function resolveSuggestionLocale(raw: unknown): SupportedLocale | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const base = raw.trim().toLowerCase().split(/[-_]/)[0];
  return (CONTENT_LOCALES as readonly string[]).includes(base) ? (base as SupportedLocale) : 'en';
}

@Controller('suggestions')
@UseGuards(JwtAuthGuard)
export class SuggestionsController {
  constructor(
    private readonly suggestionsService: SuggestionsService,
    private readonly suggestionsV2Service: SuggestionsV2Service,
    private readonly prisma: PrismaService,
  ) { }

  /**
   * V1 endpoint (legacy) - returns flat array of suggestions
   */
  @Get('foods')
  async getSuggestedFoods(
    @Req() req: any,
    @Query('locale') localeParam?: string,
  ): Promise<SuggestedFoodItem[]> {
    const userId = req.user.id;
    // P2.4: Get locale from query param, user profile, or default to 'en'
    const locale = await this.resolveLocale(userId, localeParam);
    return this.suggestionsService.getSuggestedFoodsForUser(userId, locale);
  }

  /**
   * V2 endpoint - returns structured response with real personalization
   * No static fallbacks, real stats and health scoring.
   * Timeout 8s: return 200 + { status: 'error', ... } instead of 500.
   */
  @Get('foods/v2')
  async getSuggestedFoodsV2(
    @Req() req: any,
    @Query('locale') localeParam?: string,
  ): Promise<SuggestedFoodV2Response> {
    const userId = req.user.id;
    const locale = await this.resolveLocale(userId, localeParam);

    const SUGGESTIONS_V2_TIMEOUT_MS = 20000; // Increased from 8s to 20s to reduce timeout warnings
    const errorPayload: SuggestedFoodV2Response = {
      status: 'error',
      locale,
      summary: locale === 'ru' ? 'Рекомендации временно недоступны. Попробуйте позже.' : 'Suggestions temporarily unavailable. Try again later.',
      health: { level: 'average', score: 50, reasons: [] },
      stats: { daysWithMeals: 0, mealsCount: 0, avgCalories: 0, avgProteinG: 0, avgFatG: 0, avgCarbsG: 0, avgFiberG: 0, macroPercents: { protein: 0, fat: 0, carbs: 0 } },
      sections: [],
    };

    try {
      const result = await Promise.race([
        this.suggestionsV2Service.getSuggestionsV2(userId, locale),
        new Promise<SuggestedFoodV2Response>((_, reject) =>
          setTimeout(() => reject(new Error('Suggestions V2 timeout')), SUGGESTIONS_V2_TIMEOUT_MS)
        ),
      ]);
      return result;
    } catch (e) {
      return errorPayload;
    }
  }

  /** Query param first, then the profile language, then English. */
  private async resolveLocale(userId: string, localeParam?: string): Promise<SupportedLocale> {
    const fromParam = resolveSuggestionLocale(localeParam);
    if (fromParam) return fromParam;
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { preferences: true },
    });
    const preferences = (userProfile?.preferences as any) || {};
    return resolveSuggestionLocale(preferences.language) ?? 'en';
  }
}

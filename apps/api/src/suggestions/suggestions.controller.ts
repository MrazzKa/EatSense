import { Controller, Get, Req, UseGuards, Query } from '@nestjs/common';
import { SuggestionsService, type SuggestedFoodItem } from './suggestions.service';
import { SuggestionsV2Service } from './suggestions-v2.service';
import { SuggestedFoodV2Response, SupportedLocale } from './suggestions.types';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma.service';

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
    let locale: 'en' | 'ru' | 'kk' = 'en';
    if (localeParam && ['en', 'ru', 'kk'].includes(localeParam)) {
      locale = localeParam as 'en' | 'ru' | 'kk';
    } else {
      const userProfile = await this.prisma.userProfile.findUnique({
        where: { userId },
      });
      const preferences = (userProfile?.preferences as any) || {};
      locale = (preferences.language || 'en') as 'en' | 'ru' | 'kk';
    }
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
    let locale: SupportedLocale = 'en';
    if (localeParam && ['en', 'ru', 'kk'].includes(localeParam)) {
      locale = localeParam as SupportedLocale;
    } else {
      const userProfile = await this.prisma.userProfile.findUnique({
        where: { userId },
      });
      const preferences = (userProfile?.preferences as any) || {};
      locale = (preferences.language || 'en') as SupportedLocale;
    }

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
}

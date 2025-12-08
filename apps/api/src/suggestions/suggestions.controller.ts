import { Controller, Get, Req, UseGuards, Query } from '@nestjs/common';
import { SuggestionsService, type SuggestedFoodItem } from './suggestions.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma.service';

@Controller('suggestions')
@UseGuards(JwtAuthGuard)
export class SuggestionsController {
  constructor(
    private readonly suggestionsService: SuggestionsService,
    private readonly prisma: PrismaService,
  ) {}

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
}


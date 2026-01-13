import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Headers } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OptionalAuthGuard } from '../../auth/guards/optional-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { DietsService } from './diets.service';
import { DietRecommendationsService } from './diet-recommendations.service';
import { DietType, DietDifficulty } from '@prisma/client';

// DTOs for checklist and symptoms
interface UpdateChecklistDto {
    checklist: Record<string, boolean>; // { "veggies_5": true, "protein": false }
}

interface UpdateSymptomsDto {
    symptoms: Record<string, number>; // { "energy": 4, "bloating": 2 } — 1-5 scale
}

@Controller('diets')
export class DietsController {
    constructor(
        private dietsService: DietsService,
        private recommendationsService: DietRecommendationsService,
    ) { }

    /**
     * Get list of diets
     */
    @Get()
    @UseGuards(OptionalAuthGuard)
    async getAll(
        @Query('type') type?: DietType,
        @Query('difficulty') difficulty?: DietDifficulty,
        @Query('category') category?: string,
        @Query('uiGroup') uiGroup?: string,
        @Query('suitableFor') suitableFor?: string,
        @Query('featured') featured?: string,
        @Query('search') search?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
        @Headers('accept-language') acceptLanguage?: string,
    ) {
        const locale = this.parseLocale(acceptLanguage);

        // Normalize enum values to match Prisma enum (uppercase)
        const normalizedType = type?.toUpperCase() as DietType | undefined;
        const normalizedDifficulty = difficulty?.toUpperCase() as DietDifficulty | undefined;

        return this.dietsService.findAll({
            type: normalizedType,
            difficulty: normalizedDifficulty,
            category,
            uiGroup,
            suitableFor,
            isFeatured: featured === 'true',
            search,
            limit: limit ? parseInt(limit) : 20,
            offset: offset ? parseInt(offset) : 0,
        }, locale);
    }

    /**
     * Get featured diets
     */
    @Get('featured')
    async getFeatured(@Headers('accept-language') acceptLanguage?: string) {
        const locale = this.parseLocale(acceptLanguage);
        return this.dietsService.getFeatured(locale);
    }

    /**
     * Get AI recommendations
     */
    @Get('recommendations')
    @UseGuards(JwtAuthGuard)
    async getRecommendations(
        @CurrentUser() user: any,
        @Headers('accept-language') acceptLanguage?: string,
    ) {
        const locale = this.parseLocale(acceptLanguage);
        return this.recommendationsService.getRecommendations(user.id, locale);
    }

    /**
     * Get active diet
     */
    @Get('active')
    @UseGuards(JwtAuthGuard)
    async getActiveDiet(
        @CurrentUser() user: any,
        @Headers('accept-language') acceptLanguage?: string,
    ) {
        const locale = this.parseLocale(acceptLanguage);
        return this.dietsService.getActiveDiet(user.id, locale);
    }

    /**
     * Get today's tracker state (checklist + symptoms + progress + streak)
     */
    @Get('active/today')
    @UseGuards(JwtAuthGuard)
    async getTodayTracker(
        @CurrentUser() user: any,
        @Headers('accept-language') acceptLanguage?: string,
    ) {
        const locale = this.parseLocale(acceptLanguage);
        return this.dietsService.getTodayTracker(user.id, locale);
    }

    /**
     * Update today's checklist state
     */
    @Patch('active/checklist')
    @UseGuards(JwtAuthGuard)
    async updateChecklist(
        @CurrentUser() user: any,
        @Body() dto: UpdateChecklistDto,
    ) {
        return this.dietsService.updateChecklist(user.id, dto.checklist);
    }

    /**
     * Update today's symptoms (for medical diets)
     */
    @Patch('active/symptoms')
    @UseGuards(JwtAuthGuard)
    async updateSymptoms(
        @CurrentUser() user: any,
        @Body() dto: UpdateSymptomsDto,
    ) {
        return this.dietsService.updateSymptoms(user.id, dto.symptoms);
    }

    /**
     * Mark celebration as shown for today
     */
    @Patch('active/mark-celebration-shown')
    @UseGuards(JwtAuthGuard)
    async markCelebrationShown(@CurrentUser() user: any) {
        return this.dietsService.markCelebrationShown(user.id);
    }

    /**
     * Get today's plan (legacy, redirects to active/today)
     */
    @Get('today')
    @UseGuards(JwtAuthGuard)
    async getTodayPlan(
        @CurrentUser() user: any,
        @Headers('accept-language') acceptLanguage?: string,
    ) {
        const locale = this.parseLocale(acceptLanguage);
        return this.dietsService.getTodayPlan(user.id, locale);
    }

    /**
     * Get diet history
     */
    @Get('history')
    @UseGuards(JwtAuthGuard)
    async getHistory(
        @CurrentUser() user: any,
        @Headers('accept-language') acceptLanguage?: string,
    ) {
        const locale = this.parseLocale(acceptLanguage);
        return this.dietsService.getUserDietHistory(user.id, locale);
    }

    /**
     * Get diet by ID/slug
     */
    @Get(':idOrSlug')
    async getOne(
        @Param('idOrSlug') idOrSlug: string,
        @Headers('accept-language') acceptLanguage?: string,
    ) {
        const locale = this.parseLocale(acceptLanguage);
        return this.dietsService.findOne(idOrSlug, locale);
    }

    /**
     * Get full meal plan
     */
    @Get(':id/meal-plan')
    async getMealPlan(
        @Param('id') id: string,
        @Headers('accept-language') acceptLanguage?: string,
    ) {
        const locale = this.parseLocale(acceptLanguage);
        return this.dietsService.getFullMealPlan(id, locale);
    }

    /**
     * Get day's meal plan
     */
    @Get(':id/meal-plan/day/:dayNumber')
    async getDayMealPlan(
        @Param('id') id: string,
        @Param('dayNumber') dayNumber: string,
        @Headers('accept-language') acceptLanguage?: string,
    ) {
        const locale = this.parseLocale(acceptLanguage);
        return this.dietsService.getMealPlanForDay(id, parseInt(dayNumber), locale);
    }

    /**
     * Start diet
     */
    @Post(':id/start')
    @UseGuards(JwtAuthGuard)
    async startDiet(
        @CurrentUser() user: any,
        @Param('id') dietId: string,
        @Body() dto: { customCalories?: number; targetWeight?: number },
    ) {
        return this.dietsService.startDiet(user.id, dietId, dto);
    }

    /**
     * Log meal
     */
    @Post('log-meal')
    @UseGuards(JwtAuthGuard)
    async logMeal(
        @CurrentUser() user: any,
        @Body() dto: { mealType: string },
    ) {
        return this.dietsService.logMeal(user.id, dto.mealType);
    }

    /**
     * Pause diet
     */
    @Post('pause')
    @UseGuards(JwtAuthGuard)
    async pauseDiet(@CurrentUser() user: any) {
        return this.dietsService.pauseDiet(user.id);
    }

    /**
     * Resume diet
     */
    @Post('resume')
    @UseGuards(JwtAuthGuard)
    async resumeDiet(@CurrentUser() user: any) {
        return this.dietsService.resumeDiet(user.id);
    }

    /**
     * Abandon diet
     */
    @Post('abandon')
    @UseGuards(JwtAuthGuard)
    async abandonDiet(@CurrentUser() user: any) {
        return this.dietsService.abandonDiet(user.id);
    }

    private parseLocale(acceptLanguage?: string): string {
        if (!acceptLanguage) return 'en';
        const primary = acceptLanguage.split(',')[0]?.split('-')[0]?.toLowerCase();
        return ['en', 'ru', 'kk'].includes(primary) ? primary : 'en';
    }
}

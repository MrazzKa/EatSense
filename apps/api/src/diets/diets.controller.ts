import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Headers, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OptionalAuthGuard } from '../../auth/guards/optional-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { DietsService } from './diets.service';
import { DietRecommendationsService } from './diet-recommendations.service';
import { DietType, DietDifficulty } from '@prisma/client';

// DTOs for checklist and symptoms
interface UpdateChecklistDto {
    checklist?: Record<string, boolean>; // { "veggies_5": true, "protein": false }
    [key: string]: any; // Allow flat object format
}

interface UpdateSymptomsDto {
    symptoms: Record<string, number>; // { "energy": 4, "bloating": 2 } — 1-5 scale
}

interface StartDietDto {
    customCalories?: number;
    targetWeight?: number;
}

@Controller('diets')
export class DietsController {
    private readonly logger = new Logger(DietsController.name);

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
        @Query('slugs') slugs?: string, // PATCH 04: Optional slugs filter for lazy loading
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
        @Headers('accept-language') acceptLanguage?: string,
    ) {
        const locale = this.parseLocale(acceptLanguage);

        // PATCH 04: If slugs provided, fetch only those specific diets
        if (slugs) {
            const slugArray = slugs.split(',').map(s => s.trim()).filter(Boolean);
            if (slugArray.length > 0) {
                return this.dietsService.findBySlugs(slugArray, locale);
            }
        }

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
        // Validate user
        if (!user?.id) {
            this.logger.error('[updateChecklist] No user ID in request');
            throw new UnauthorizedException('Invalid user session');
        }

        // Validate DTO exists
        if (!dto) {
            throw new BadRequestException('Request body is required');
        }

        // Handle both formats: { checklist: {...} } and direct {...}
        let checklist: Record<string, boolean>;

        if (dto.checklist && typeof dto.checklist === 'object') {
            checklist = dto.checklist;
        } else if (typeof dto === 'object') {
            // Client might be sending flat object - try to use it directly
            const { checklist: _, ...rest } = dto as any;
            if (Object.keys(rest).length > 0 && Object.values(rest).every(v => typeof v === 'boolean')) {
                checklist = rest;
            } else {
                throw new BadRequestException('Invalid request: checklist object is required. Expected format: { checklist: { item1: true, item2: false } }');
            }
        } else {
            throw new BadRequestException('Invalid request format');
        }

        // Validate checklist is not empty
        if (Object.keys(checklist).length === 0) {
            throw new BadRequestException('Checklist cannot be empty');
        }

        return this.dietsService.updateChecklist(user.id, checklist);
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
     * Mark today as complete (advances day counter, updates streak)
     */
    @Post('active/complete-day')
    @UseGuards(JwtAuthGuard)
    async completeDay(@CurrentUser() user: any) {
        return this.dietsService.completeDay(user.id);
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
    @Post(':idOrSlug/start')
    @UseGuards(JwtAuthGuard)
    async startDiet(
        @CurrentUser() user: any,
        @Param('idOrSlug') idOrSlug: string,
        @Body() dto?: StartDietDto,
    ) {
        // Validate user
        if (!user?.id) {
            throw new UnauthorizedException('Invalid user session');
        }

        // Validate diet ID/slug
        if (!idOrSlug || idOrSlug.trim().length === 0) {
            throw new BadRequestException('Diet ID or slug is required');
        }

        return this.dietsService.startDiet(user.id, idOrSlug.trim(), dto);
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

    // ==================== PROGRAM SUGGESTIONS ====================

    /**
     * Suggest a new program (or vote for existing)
     */
    @Post('suggest')
    @UseGuards(JwtAuthGuard)
    async suggestProgram(
        @CurrentUser() user: any,
        @Body() dto: { name: string; description?: string; type: 'diet' | 'lifestyle' },
    ) {
        if (!dto.name?.trim()) {
            throw new BadRequestException('Name is required');
        }
        return this.dietsService.createSuggestion(user.id, {
            name: dto.name.trim(),
            description: dto.description?.trim(),
            type: dto.type || 'lifestyle',
        });
    }

    /**
     * Get top suggestions (public)
     */
    @Get('suggestions')
    async getSuggestions(
        @Query('type') type?: 'diet' | 'lifestyle',
        @Query('limit') limit?: string,
    ) {
        return this.dietsService.getSuggestions(type, parseInt(limit || '20', 10));
    }

    private parseLocale(acceptLanguage?: string): string {
        if (!acceptLanguage) return 'en';
        const primary = acceptLanguage.split(',')[0]?.split('-')[0]?.toLowerCase();
        return ['en', 'ru', 'kk'].includes(primary) ? primary : 'en';
    }
}

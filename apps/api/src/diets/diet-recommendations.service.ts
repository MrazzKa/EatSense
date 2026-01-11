import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class DietRecommendationsService {
    private readonly logger = new Logger(DietRecommendationsService.name);
    private readonly openai: OpenAI;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
    ) {
        this.openai = new OpenAI({
            apiKey: this.configService.get('OPENAI_API_KEY'),
        });
    }

    /**
     * Get AI recommendations for user
     */
    async getRecommendations(userId: string, locale: string = 'en') {
        this.logger.log(`Getting diet recommendations for user ${userId}`);

        const userContext = await this.buildUserContext(userId);
        const availableDiets = await this.prisma.dietProgram.findMany({
            where: { isActive: true },
            select: {
                id: true,
                slug: true,
                name: true,
                type: true,
                difficulty: true,
                suitableFor: true,
                notSuitableFor: true,
                macroSplit: true,
            },
        });

        const recommendations = await this.getAIRecommendations(userContext, availableDiets, locale);

        const recommendedDiets = await this.prisma.dietProgram.findMany({
            where: { slug: { in: recommendations.map(r => r.slug) } },
        });

        return recommendations.map(rec => {
            const diet = recommendedDiets.find(d => d.slug === rec.slug);
            if (!diet) return null;

            return {
                diet: this.localizeDiet(diet, locale),
                matchScore: rec.matchScore,
                reason: rec.reason,
                personalizedTips: rec.tips,
            };
        }).filter(Boolean);
    }

    private async buildUserContext(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { userProfile: true },
        });

        // Calculate 14 days ago
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        // Use MealLog which has nutrition fields directly
        const mealLogs = await this.prisma.mealLog.findMany({
            where: { userId, createdAt: { gte: fourteenDaysAgo } },
        });

        const totalMeals = mealLogs.length || 1;
        const avgNutrition = mealLogs.reduce(
            (acc, log) => ({
                calories: acc.calories + (log.calories || 0),
                protein: acc.protein + (log.protein || 0),
                carbs: acc.carbs + (log.carbs || 0),
                fat: acc.fat + (log.fat || 0),
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );

        return {
            profile: user?.userProfile || {},
            recentNutrition: {
                avgCalories: Math.round(avgNutrition.calories / totalMeals),
                avgProtein: Math.round(avgNutrition.protein / totalMeals),
                avgCarbs: Math.round(avgNutrition.carbs / totalMeals),
                avgFat: Math.round(avgNutrition.fat / totalMeals),
            },
        };
    }

    private async getAIRecommendations(context: any, availableDiets: any[], locale: string) {
        const prompt = `You are a professional nutritionist. Analyze user profile and recommend suitable diets.

USER PROFILE:
- Goal: ${context.profile?.goal || 'not specified'}
- Age: ${context.profile?.age || 'not specified'}
- Gender: ${context.profile?.gender || 'not specified'}
- Activity Level: ${context.profile?.activityLevel || 'moderate'}
- Weight: ${context.profile?.weight || 'not specified'} kg
- Target Weight: ${context.profile?.targetWeight || 'not specified'} kg

RECENT EATING (14-day average):
- Daily Calories: ${context.recentNutrition.avgCalories} kcal
- Protein: ${context.recentNutrition.avgProtein}g
- Carbs: ${context.recentNutrition.avgCarbs}g
- Fat: ${context.recentNutrition.avgFat}g

AVAILABLE DIETS:
${availableDiets.map(d => `- ${d.slug}: ${d.type}, suitable: ${d.suitableFor?.join(', ')}`).join('\n')}

Select top 3 diets. Response language: ${locale === 'ru' ? 'Russian' : 'English'}

OUTPUT (strict JSON):
{"recommendations":[{"slug":"diet-slug","matchScore":85,"reason":"Why suitable","tips":["Tip1","Tip2"]}]}`;

        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' },
                temperature: 0.7,
            });

            const content = response.choices[0]?.message?.content;
            if (!content) throw new Error('Empty response');

            const parsed = JSON.parse(content);
            return parsed.recommendations || [];
        } catch (error) {
            this.logger.error('AI recommendations failed:', error);
            return this.getFallbackRecommendations(context, availableDiets);
        }
    }

    private getFallbackRecommendations(context: any, diets: any[]) {
        const goal = context.profile?.goal;
        let filtered = diets;

        if (goal === 'lose') {
            filtered = diets.filter(d => d.suitableFor?.includes('weight_loss'));
        } else if (goal === 'gain') {
            filtered = diets.filter(d => d.suitableFor?.includes('weight_gain'));
        }

        return filtered.slice(0, 3).map((d, i) => ({
            slug: d.slug,
            matchScore: 80 - i * 10,
            reason: 'Recommended based on your goals',
            tips: [],
        }));
    }

    private localizeDiet(diet: any, locale: string) {
        const getLocalized = (json: any) => {
            if (typeof json === 'string') return json;
            if (!json) return '';
            return json[locale] || json['en'] || Object.values(json)[0] || '';
        };

        return {
            ...diet,
            name: getLocalized(diet.name),
            description: getLocalized(diet.description),
            shortDescription: getLocalized(diet.shortDescription),
        };
    }
}

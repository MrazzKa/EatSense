import { Injectable, BadRequestException, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma.service';
import { FoodAnalyzerService } from './food-analyzer/food-analyzer.service';
import { RedisService } from '../redis/redis.service';
import { calculateHealthScore } from './food-health-score.util';
import { normalizeFoodName } from '../src/analysis/text-utils';
import { AnalysisData, AnalyzedItem } from '../src/analysis/analysis.types';

@Injectable()
export class FoodService {
  private readonly logger = new Logger(FoodService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly foodAnalyzer: FoodAnalyzerService,
    @InjectQueue('food-analysis') private readonly analysisQueue: Queue,
    private readonly redisService: RedisService,
  ) {}

  async analyzeImage(file: any, userId: string, locale?: 'en' | 'ru' | 'kk') {
    try {
      if (!file) {
        throw new BadRequestException('No image file provided');
      }

      // Validate file type
      if (!file.mimetype || !file.mimetype.startsWith('image/')) {
        throw new BadRequestException('File must be an image');
      }

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new BadRequestException('File size must be less than 10MB');
      }

      // Validate and prepare buffer
      let imageBuffer: Buffer;
      if (file.buffer && Buffer.isBuffer(file.buffer)) {
        imageBuffer = file.buffer;
      } else if (file.buffer) {
        // Convert to buffer if it's not already
        imageBuffer = Buffer.from(file.buffer);
      } else {
        throw new BadRequestException('File buffer is missing. Please check multer configuration.');
      }

      if (imageBuffer.length === 0) {
        throw new BadRequestException('File buffer is empty');
      }

      // Create analysis record
      const analysis = await this.prisma.analysis.create({
        data: {
          userId,
          type: 'IMAGE',
          status: 'PENDING',
          metadata: {
            filename: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            locale: locale ?? null,
          },
        },
      });

      // Convert buffer to base64 for Bull queue serialization
      // Bull queues serialize to JSON, which doesn't support Buffer directly
      const imageBufferBase64 = imageBuffer.toString('base64');

      // Add to queue for processing
      await this.analysisQueue.add('analyze-image', {
        analysisId: analysis.id,
        imageBufferBase64: imageBufferBase64,
        userId,
        locale: locale ?? null,
      });

      // Increment daily limit counter after successful analysis creation
      await this.incrementDailyLimit(userId, 'food');

      return {
        analysisId: analysis.id,
        status: 'PENDING',
        message: 'Analysis started. Results will be available shortly.',
      };
    } catch (error: any) {
      this.logger.error('[FoodService] analyzeImage error', {
        message: error.message,
        stack: error.stack,
        status: error.status,
        userId,
        fileName: file?.originalname,
        fileSize: file?.size,
      });

      // Re-throw BadRequestException as-is
      if (error instanceof BadRequestException) {
        throw error;
      }

      // For other errors, throw InternalServerErrorException
      throw new InternalServerErrorException('FOOD_ANALYZE_FAILED');
    }
  }

  private async incrementDailyLimit(userId: string, resource: 'food' | 'chat') {
    try {
      const today = new Date().toISOString().split('T')[0];
      const key = `daily:${resource}:${userId}:${today}`;
      
      const currentCountStr = await this.redisService.get(key);
      const currentCount = currentCountStr ? parseInt(currentCountStr) : 0;
      
      const resetTime = new Date();
      resetTime.setHours(24, 0, 0, 0);
      const ttl = Math.floor((resetTime.getTime() - Date.now()) / 1000);
      
      await this.redisService.set(key, (currentCount + 1).toString(), ttl > 0 ? ttl : 86400);
    } catch (error) {
      console.error('Error incrementing daily limit:', error);
      // Don't throw - limit increment failure shouldn't block analysis
    }
  }

  async analyzeText(description: string, userId: string, locale?: 'en' | 'ru' | 'kk') {
    if (!description || description.trim().length === 0) {
      throw new BadRequestException('Description cannot be empty');
    }

    // Create analysis record
    const analysis = await this.prisma.analysis.create({
      data: {
        userId,
        type: 'TEXT',
        status: 'PENDING',
        metadata: {
          description: description.trim(),
          locale: locale ?? null,
        },
      },
    });

    // Add to queue for processing
    await this.analysisQueue.add('analyze-text', {
      analysisId: analysis.id,
      description: description.trim(),
      userId,
      locale: locale ?? null,
    });

    // Increment daily limit counter after successful analysis creation
    await this.incrementDailyLimit(userId, 'food');

    return {
      analysisId: analysis.id,
      status: 'PENDING',
      message: 'Analysis started. Results will be available shortly.',
    };
  }

  async getAnalysis(analysisId: string, userId: string) {
    const analysis = await this.prisma.analysis.findFirst({
      where: {
        id: analysisId,
        userId,
      },
      include: {
        results: true,
      },
    });

    if (!analysis) {
      throw new BadRequestException('Analysis not found');
    }

    return analysis;
  }

  async getAnalysisStatus(analysisId: string, userId: string) {
    const analysis = await this.prisma.analysis.findFirst({
      where: {
        id: analysisId,
        userId,
      },
    });

    if (!analysis) {
      throw new BadRequestException('Analysis not found');
    }

    return {
      status: analysis.status.toLowerCase(),
      analysisId: analysis.id,
    };
  }

  async getAnalysisResult(analysisId: string, userId: string) {
    const analysis = await this.prisma.analysis.findFirst({
      where: {
        id: analysisId,
        userId,
      },
      include: {
        results: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!analysis) {
      throw new BadRequestException('Analysis not found');
    }

    if (analysis.status !== 'COMPLETED') {
      throw new BadRequestException(`Analysis is ${analysis.status}, not completed`);
    }

    if (!analysis.results || analysis.results.length === 0) {
      throw new BadRequestException('Analysis result not found');
    }

    const resultData = analysis.results[0].data as unknown as AnalysisData;
    
    // Map AnalysisData to frontend format
    const mapped = this.mapAnalysisResult(resultData);
    
    // Include imageUrl from analysis result if available
    const rawData = analysis.results[0].data as any;
    if (rawData && rawData.imageUrl) {
      (mapped as any).imageUrl = rawData.imageUrl;
    }
    
    return mapped;
  }

  /**
   * Map AnalysisData to frontend format
   */
  private mapAnalysisResult(raw: AnalysisData | any) {
    // Normalize items to AnalyzedItem[] to be robust to legacy shapes
    const rawItems: any[] = Array.isArray(raw?.items) ? raw.items : [];
    const items: AnalyzedItem[] = rawItems.map((item: any) => {
      // New shape: already AnalyzedItem with nutrients
      if (item && item.nutrients) {
        return item as AnalyzedItem;
      }
      // Legacy shape: { label, kcal, protein, carbs, fat, gramsMean }
      const calories = item?.kcal ?? item?.calories ?? 0;
      const protein = item?.protein ?? 0;
      const carbs = item?.carbs ?? 0;
      const fat = item?.fat ?? 0;
      const weight = item?.gramsMean ?? item?.weight ?? 100;

      return {
        name: normalizeFoodName(item?.label || item?.name || 'Unknown Food'),
        label: item?.label,
        portion_g: weight,
        nutrients: {
          calories,
          protein,
          carbs,
          fat,
          fiber: 0,
          sugars: 0,
          satFat: 0,
          energyDensity: 0,
        },
        source: 'fdc',
      };
    });

    const ingredients = items.map((item: AnalyzedItem) => {
      const n = item.nutrients;
      // Use localized name if available, fallback to label or original name
      const displayName = item.name || item.label || item.originalName || 'Unknown Food';
      return {
        name: displayName,
        calories: n.calories ?? 0,
        protein: n.protein ?? 0,
        carbs: n.carbs ?? 0,
        fat: n.fat ?? 0,
        fiber: n.fiber ?? 0,
        sugars: n.sugars ?? 0,
        satFat: n.satFat ?? 0,
        weight: item.portion_g ?? 100,
        hasNutrition: item.hasNutrition !== false, // Default to true if not set
      };
    });

    // Calculate totals from ingredients (more reliable than resultData.total)
    const totalCalories = ingredients.reduce((sum: number, ing: any) => sum + (ing.calories || 0), 0);
    const totalProtein = ingredients.reduce((sum: number, ing: any) => sum + (ing.protein || 0), 0);
    const totalCarbs = ingredients.reduce((sum: number, ing: any) => sum + (ing.carbs || 0), 0);
    const totalFat = ingredients.reduce((sum: number, ing: any) => sum + (ing.fat || 0), 0);

    // Extract Health Score (new pipeline provides this)
    let healthScore = raw.healthScore;

    if (!healthScore) {
      const fallbackScore = calculateHealthScore({
        calories: totalCalories,
        protein: totalProtein,
        carbs: totalCarbs,
        fat: totalFat,
        items: ingredients.map((ing) => ({
          label: ing.name,
          kcal: ing.calories,
          protein: ing.protein,
          carbs: ing.carbs,
          fat: ing.fat,
        })),
      });
      healthScore = {
        score: fallbackScore.score,
        grade: fallbackScore.grade,
        factors: {
          macroBalance: {
            label: 'Macro balance',
            score: fallbackScore.factors.macroBalance,
            weight: 0.35,
          },
          calorieDensity: {
            label: 'Calorie density',
            score: fallbackScore.factors.calorieDensity,
            weight: 0.25,
          },
          proteinQuality: {
            label: 'Protein quality',
            score: fallbackScore.factors.proteinQuality,
            weight: 0.25,
          },
          processingLevel: {
            label: 'Processing level',
            score: fallbackScore.factors.processingLevel,
            weight: 0.15,
          },
        },
        // Keep only human-readable messages for API clients
        feedback: fallbackScore.feedback.map((f) => f.message),
      };
    }

    // AutoSave is handled in processor, not in AnalysisData
    const autoSave = null;

    // BUG 8: Get locale from analysis data for localization
    const locale = raw.locale || 'en';
    const withWord = locale === 'ru' ? 'с' : locale === 'kk' ? 'менен' : 'with';
    const andMore = locale === 'ru' ? 'и другое' : locale === 'kk' ? 'және басқалары' : 'and more';

    // Prefer localized dish name if available, otherwise fall back to original / derived
    const dishName =
      raw.dishNameLocalized ||
      raw.originalDishName ||
      ((): string => {
        const names = items.map(i => i.name).filter(Boolean);
        if (names.length === 0) return 'Food Analysis';
        if (names.length === 1) {
          const name = names[0];
          return name.length > 60 ? name.substring(0, 57) + '...' : name;
        }
        if (names.length === 2) {
          const combined = `${names[0]} ${withWord} ${names[1]}`;
          return combined.length > 60 ? `${names[0]} ${andMore}` : combined;
        }
        return `${names[0]} ${andMore}`;
      })();

    const result: any = {
      dishName,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      ingredients,
      healthScore,
      autoSave,
      imageUrl: raw.imageUrl || null, // Include imageUrl from analysis result
      analysisFlags: {
        isSuspicious: raw.isSuspicious || false,
        needsReview: raw.needsReview || false,
      },
    };
    return result;
  }

  /**
   * Get raw analysis data (for debug endpoint)
   */
  async getRawAnalysis(analysisId: string, userId: string) {
    const analysis = await this.prisma.analysis.findFirst({
      where: {
        id: analysisId,
        userId,
      },
      include: {
        results: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!analysis) {
      throw new BadRequestException('Analysis not found');
    }

    if (!analysis.results || analysis.results.length === 0) {
      throw new BadRequestException('Analysis result not found');
    }

    // Return raw data as-is (includes debug if ANALYSIS_DEBUG was enabled)
    return analysis.results[0].data;
  }

  async getUserAnalyses(userId: string, limit: number = 10, offset: number = 0) {
    const analyses = await this.prisma.analysis.findMany({
      where: { userId },
      include: {
        results: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await this.prisma.analysis.count({
      where: { userId },
    });

    return {
      analyses,
      total,
      limit,
      offset,
    };
  }
}

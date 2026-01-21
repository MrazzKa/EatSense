import { Injectable, BadRequestException, Logger, InternalServerErrorException, ForbiddenException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma.service';
// NOTE: FoodAnalyzerService removed - was dead code (injected but never called)
// All food analysis now uses AnalyzeService (with VisionService + NutritionOrchestrator)
import { RedisService } from '../redis/redis.service';
import { calculateHealthScore } from './food-health-score.util';
import { normalizeFoodName } from '../src/analysis/text-utils';
import { AnalysisData, AnalyzedItem, AnalysisTotals, HealthScore, Nutrients } from '../src/analysis/analysis.types';
import { AnalyzeService } from '../src/analysis/analyze.service';
import { ReanalyzeDto, ManualReanalyzeDto, ReanalyzeRequestDto } from './dto';
import { ManualReanalyzeDto as NewManualReanalyzeDto } from './dto/manual-reanalyze.dto';

@Injectable()
export class FoodService {
  private readonly logger = new Logger(FoodService.name);

  constructor(
    private readonly prisma: PrismaService,
    // FoodAnalyzerService removed - dead code
    @InjectQueue('food-analysis') private readonly analysisQueue: Queue,
    private readonly redisService: RedisService,
    private readonly analyzeService: AnalyzeService,
  ) { }

  async analyzeImage(file: any, userId: string, locale?: 'en' | 'ru' | 'kk', foodDescription?: string, skipCache?: boolean) {
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

      // PART 3.1: Get user language from profile if locale not provided
      let effectiveLocale: 'en' | 'ru' | 'kk' = locale || 'en';
      if (!locale) {
        try {
          const userProfile = await this.prisma.userProfile.findUnique({
            where: { userId },
            select: { preferences: true },
          });
          const userLanguage = (userProfile?.preferences as any)?.language;
          if (userLanguage && ['en', 'ru', 'kk'].includes(userLanguage)) {
            effectiveLocale = userLanguage as 'en' | 'ru' | 'kk';
          }
        } catch (error) {
          // If profile fetch fails, use default 'en'
          this.logger.warn(`[FoodService] Failed to get user language from profile for userId ${userId}, using default 'en'`);
        }
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
            locale: effectiveLocale,
            foodDescription: foodDescription || undefined, // Store food description in metadata
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
        locale: effectiveLocale,
        foodDescription: foodDescription || undefined, // Pass food description to processor
        skipCache: skipCache || false, // Pass skip-cache flag to processor
      });

      // Add to queue for processing
      await this.analysisQueue.add('analyze-image', {
        analysisId: analysis.id,
        imageBufferBase64: imageBufferBase64,
        userId,
        locale: effectiveLocale,
        foodDescription: foodDescription || undefined, // Pass food description to processor
        skipCache: skipCache || false, // Pass skip-cache flag to processor
      });

      // Daily limit is now incremented in the processor after successful analysis
      // await this.incrementDailyLimit(userId, 'food');

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

  async analyzeText(description: string, userId: string, locale?: 'en' | 'ru' | 'kk', skipCache?: boolean) {
    if (!description || description.trim().length === 0) {
      throw new BadRequestException('Description cannot be empty');
    }

    // PART 3.1: Get user language from profile if locale not provided
    let effectiveLocale: 'en' | 'ru' | 'kk' = locale || 'en';
    if (!locale) {
      try {
        const userProfile = await this.prisma.userProfile.findUnique({
          where: { userId },
          select: { preferences: true },
        });
        const userLanguage = (userProfile?.preferences as any)?.language;
        if (userLanguage && ['en', 'ru', 'kk'].includes(userLanguage)) {
          effectiveLocale = userLanguage as 'en' | 'ru' | 'kk';
        }
      } catch (error) {
        // If profile fetch fails, use default 'en'
        this.logger.warn(`[FoodService] Failed to get user language from profile for userId ${userId}, using default 'en'`);
      }
    }

    // Create analysis record
    const analysis = await this.prisma.analysis.create({
      data: {
        userId,
        type: 'TEXT',
        status: 'PENDING',
        metadata: {
          textQuery: description.trim(), // Use textQuery for reanalyze compatibility
          locale: effectiveLocale,
        },
      },
    });

    // Add to queue for processing
    await this.analysisQueue.add('analyze-text', {
      analysisId: analysis.id,
      description: description.trim(),
      userId,
      locale: effectiveLocale,
      skipCache: skipCache || false, // Pass skip-cache flag to processor
    });

    // Add to queue for processing
    await this.analysisQueue.add('analyze-text', {
      analysisId: analysis.id,
      description: description.trim(),
      userId,
      locale: effectiveLocale,
      skipCache: skipCache || false, // Pass skip-cache flag to processor
    });

    // Daily limit is now incremented in the processor after successful analysis
    // await this.incrementDailyLimit(userId, 'food');

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

    const status = analysis.status.toLowerCase();

    if (status === 'completed' || status === 'success') { // Handle 'completed' or legacy 'success'
      return this.getAnalysisResult(analysisId, userId);
    }

    return {
      status,
      analysisId: analysis.id,
    };
  }

  async getActiveAnalyses(userId: string) {
    const analyses = await this.prisma.analysis.findMany({
      where: {
        userId,
        status: {
          in: ['PENDING', 'PROCESSING'],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        status: true,
        type: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return analyses.map((analysis) => ({
      analysisId: analysis.id,
      status: analysis.status.toLowerCase(),
      type: analysis.type,
      imageUri: (analysis.metadata as any)?.imageUrl || (analysis.metadata as any)?.imageUri || null,
      createdAt: analysis.createdAt,
      updatedAt: analysis.updatedAt,
    }));
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

    // Return status and data even if not completed (for polling)
    const hasResults = analysis.results && analysis.results.length > 0;
    const resultData = hasResults ? (analysis.results[0].data as unknown as AnalysisData) : null;

    // Map AnalysisData to frontend format if result exists
    const mapped = resultData ? this.mapAnalysisResult(resultData) : null;

    // Include imageUrl from analysis result if available
    if (hasResults && mapped) {
      const rawData = analysis.results[0].data as any;
      if (rawData && rawData.imageUrl) {
        (mapped as any).imageUrl = rawData.imageUrl;
      }
    }

    // Return status-aware response
    return {
      status: analysis.status,
      analysisId: analysis.id,
      data: mapped,
      error: analysis.error || null,
    };
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

      // Generate id for legacy items
      const crypto = require('crypto');
      return {
        id: item?.id || crypto.randomUUID(),
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
      } as AnalyzedItem;
    });

    const ingredients = items.map((item: AnalyzedItem) => {
      const n = item.nutrients;
      // Use localized name (item.name is already localized), fallback to label or original name
      const displayName = item.name || item.label || item.originalName || 'Unknown Food';
      return {
        id: item.id,
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
        // New additive fields for transparency
        category: item.category,
        source: item.sourceInfo || {
          name: item.isFallback ? 'vision' : 'provider',
          nutrients: item.isFallback ? 'vision' : 'provider',
          providerId: item.provider,
        },
        confidence: {
          vision: item.confidence,
          provider: item.fdcScore,
        },
        flags: {
          isSuspicious: item.isSuspicious || false,
          isFallback: item.isFallback || false,
          needsReview: item.isSuspicious || false,
        },
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
        const names = items.map((i) => i.name).filter(Boolean);
        if (!names.length) return 'Food Analysis';
        if (names.length === 1) {
          const first = names[0];
          return first.length > 60 ? first.slice(0, 57) + '…' : first;
        }
        // STEP 1 FIX: No "and more" - use comma-joined top 3
        if (names.length === 2) {
          const combined = `${names[0]} ${withWord} ${names[1]}`;
          return combined.length > 60 ? names.slice(0, 2).join(', ') : combined;
        }
        // 3+ items: comma-joined top 3
        return names.slice(0, 3).join(', ');
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

  /**
   * Re-analyze an existing analysis after manual ingredient edits
   * Recalculates totals, HealthScore, and flags (isSuspicious, needsReview)
   */
  async reanalyzeFromManual(analysisId: string, dto: ReanalyzeDto, userId: string) {
    // 1. Verify analysis belongs to this user
    const analysis = await this.prisma.analysis.findFirst({
      where: {
        id: analysisId,
        userId,
      },
      include: {
        results: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!analysis) {
      throw new ForbiddenException('Analysis not found or access denied');
    }

    // 2. Convert DTO items to AnalyzedItem format
    const items: AnalyzedItem[] = dto.items.map((item) => {
      const nutrients: Nutrients = {
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        fiber: item.fiber || 0,
        sugars: item.sugars || 0,
        satFat: item.satFat || 0,
        energyDensity: 0, // Will be recalculated
      };

      return {
        id: item.id,
        name: item.name,
        originalName: item.name,
        portion_g: item.portion_g,
        nutrients,
        source: 'manual',
        locale: 'en', // TODO: Get from analysis metadata or user profile
      };
    });

    // 3. Build AnalysisTotals from items (same logic as AnalyzeService)
    const total: AnalysisTotals = items.reduce(
      (acc, item) => {
        acc.portion_g += item.portion_g;
        acc.calories += item.nutrients.calories;
        acc.protein += item.nutrients.protein;
        acc.carbs += item.nutrients.carbs;
        acc.fat += item.nutrients.fat;
        acc.fiber += item.nutrients.fiber;
        acc.sugars += item.nutrients.sugars;
        acc.satFat += item.nutrients.satFat;
        return acc;
      },
      {
        portion_g: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugars: 0,
        satFat: 0,
        energyDensity: 0,
      },
    );

    // Recalculate energyDensity as calories per 100g
    if (total.portion_g > 0) {
      total.energyDensity = Math.round((total.calories / total.portion_g) * 100 * 10) / 10;
    }

    // 4. Get locale from existing analysis metadata (before using it)
    const metadata = analysis.metadata as any;
    const locale = metadata?.locale || 'en';

    // 5. Compute HealthScore using AnalyzeService (reuse existing logic)
    const healthScore = this.analyzeService.computeHealthScore(total, total.portion_g, items, locale as 'en' | 'ru' | 'kk');

    // 6. Run sanity check
    const debug: any = {};
    const sanity = this.analyzeService.runSanityCheck({ items, total, healthScore, debug });

    // 7. Compute flags
    const hasSeriousIssues = sanity.some(
      (i: any) => i.type === 'macro_kcal_mismatch' || i.type === 'suspicious_energy_density',
    );
    const isSuspicious = hasSeriousIssues;

    const allMacrosZero = total.calories === 0 && total.protein === 0 && total.carbs === 0 && total.fat === 0;
    const hasItemsButNoData = items.length > 0 && allMacrosZero;
    const anyItemHasWeightAndZeroMacros = items.some(item =>
      item.portion_g > 0 &&
      item.nutrients.calories === 0 &&
      item.nutrients.protein === 0 &&
      item.nutrients.carbs === 0 &&
      item.nutrients.fat === 0
    );
    const needsReview = hasItemsButNoData || anyItemHasWeightAndZeroMacros;

    // 8. Build dish name (reuse logic from AnalyzeService)
    const originalDishName = this.analyzeService.buildDishNameEn(items);

    // Localize dish name if needed
    let dishNameLocalized = originalDishName;
    if (locale !== 'en') {
      try {
        // Access foodLocalization via AnalyzeService (it's private, but we can use a workaround)
        // TODO: Consider making foodLocalization accessible or adding a public method
        const foodLocalization = (this.analyzeService as any).foodLocalization;
        if (foodLocalization && typeof foodLocalization.localizeName === 'function') {
          dishNameLocalized = await foodLocalization.localizeName(originalDishName, locale);
        }
      } catch (error) {
        this.logger.warn('[FoodService] Failed to localize dish name', error);
      }
    }

    // 9. Update AnalysisResult in DB
    const updatedAnalysisData: AnalysisData = {
      items,
      total,
      healthScore,
      locale: locale as 'en' | 'ru' | 'kk',
      dishNameLocalized: dishNameLocalized || originalDishName,
      originalDishName,
      isSuspicious,
      needsReview,
    };

    if (analysis.results && analysis.results.length > 0) {
      // Update existing result
      await this.prisma.analysisResult.update({
        where: { id: analysis.results[0].id },
        data: { data: updatedAnalysisData as any },
      });
    } else {
      // Create new result
      await this.prisma.analysisResult.create({
        data: {
          analysisId: analysis.id,
          data: updatedAnalysisData as any,
        },
      });
    }

    // 10. Return updated data in frontend-compatible format
    return this.mapAnalysisResult(updatedAnalysisData);
  }

  /**
   * Re-analyze from original input (image/text) - full re-run
   */
  async reanalyzeFromOriginalInput(
    analysisId: string,
    dto: ReanalyzeRequestDto,
    userId: string,
  ): Promise<any> {
    // 1. Verify analysis belongs to this user
    const analysis = await this.prisma.analysis.findFirst({
      where: {
        id: analysisId,
        userId,
      },
      include: {
        results: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!analysis) {
      throw new ForbiddenException('Analysis not found or access denied');
    }

    // 2. Get original input from analysis metadata
    const metadata = analysis.metadata as any;
    const imageUrl = metadata?.imageUrl;
    const textQuery = metadata?.textQuery;
    const locale = metadata?.locale || 'en';
    const region = metadata?.region;

    if (!imageUrl && !textQuery) {
      throw new BadRequestException('Original analysis input (image or text) not found');
    }

    // 3. Re-run analysis using AnalyzeService
    let newAnalysisData: AnalysisData;
    const mode = dto.mode || 'review';

    if (imageUrl) {
      this.logger.log(`[FoodService] Re-analyzing image from original URL for analysis ${analysisId}`);
      newAnalysisData = await this.analyzeService.analyzeImage({
        imageUrl,
        locale: locale as 'en' | 'ru' | 'kk',
        mode,
      });
    } else if (textQuery) {
      this.logger.log(`[FoodService] Re-analyzing text from original query for analysis ${analysisId}`);
      newAnalysisData = await this.analyzeService.analyzeText(
        textQuery,
        locale as 'en' | 'ru' | 'kk',
      );
    } else {
      throw new BadRequestException('No valid input found for re-analysis');
    }

    // 4. Mark as reanalysis (if needed, add to metadata)
    // Note: reanalysisOf and source are not part of AnalysisData type
    // They can be stored in metadata if needed

    // 5. Update AnalysisResult in DB
    if (analysis.results && analysis.results.length > 0) {
      // Update existing result
      await this.prisma.analysisResult.update({
        where: { id: analysis.results[0].id },
        data: { data: newAnalysisData as any },
      });
    } else {
      // Create new result
      await this.prisma.analysisResult.create({
        data: {
          analysisId: analysis.id,
          data: newAnalysisData as any,
        },
      });
    }

    // 6. Return updated data in frontend-compatible format
    return this.mapAnalysisResult(newAnalysisData);
  }

  /**
   * Re-analyze with manually edited component names and portions
   * Uses AnalyzeService.reanalyzeWithManualComponents to recalculate nutrients
   */
  async reanalyzeWithManualComponents(
    dto: ManualReanalyzeDto & { analysisId: string },
    userId: string,
  ): Promise<any> {
    this.logger.log(`[FoodService] reanalyzeWithManualComponents() called for analysisId=${dto.analysisId}, userId=${userId}`);

    // 1. Verify analysis belongs to this user
    const analysis = await this.prisma.analysis.findFirst({
      where: {
        id: dto.analysisId,
        userId,
      },
    });

    if (!analysis) {
      throw new ForbiddenException('Analysis not found or access denied');
    }

    try {
      // 2. Call AnalyzeService to reanalyze with manual components
      const newAnalysisData = await this.analyzeService.reanalyzeWithManualComponents(
        {
          analysisId: dto.analysisId,
          components: dto.components,
          locale: dto.locale,
          region: dto.region,
        },
        userId,
      );

      // 3. Update AnalysisResult in DB
      const existingResult = await this.prisma.analysisResult.findFirst({
        where: { analysisId: dto.analysisId },
        orderBy: { createdAt: 'desc' },
      });

      if (existingResult) {
        await this.prisma.analysisResult.update({
          where: { id: existingResult.id },
          data: { data: newAnalysisData as any },
        });
      } else {
        await this.prisma.analysisResult.create({
          data: {
            analysisId: dto.analysisId,
            data: newAnalysisData as any,
          },
        });
      }

      // 4. Update Meal and MealItem if they exist
      await this.updateMealFromAnalysisResult(dto.analysisId, newAnalysisData);

      // 5. Return updated data in frontend-compatible format
      return this.mapAnalysisResult(newAnalysisData);
    } catch (error: any) {
      this.logger.error(
        `[FoodService] reanalyzeWithManualComponents() failed for analysisId=${dto.analysisId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * Manual reanalyze: обновление items на основе пользовательских правок
   * и пересчёт totals + HealthScore + feedback.
   */
  async manualReanalyze(
    analysisId: string,
    userId: string,
    dto: NewManualReanalyzeDto,
  ): Promise<any> {
    // 1. Находим анализ и проверяем владельца
    const analysis = await this.prisma.analysis.findFirst({
      where: {
        id: analysisId,
        userId,
      },
      include: {
        results: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!analysis) {
      throw new ForbiddenException('Analysis not found or access denied');
    }

    if (!analysis.results.length) {
      throw new BadRequestException('Analysis results not found');
    }

    const lastResult = analysis.results[0];
    const previousData = (lastResult.data || {}) as unknown as AnalysisData;
    const previousItems = previousData.items || [];

    // 2. Собираем карту по id, а также по индексу для fallback
    const itemsById = new Map<string, AnalyzedItem>();
    previousItems.forEach((item, index) => {
      if (item.id) {
        itemsById.set(item.id, item);
      } else {
        // индекс в качестве псевдо-id
        itemsById.set(String(index), item);
      }
    });

    // 3. Строим новый список items с учётом dto
    const updatedItems: AnalyzedItem[] = dto.items.map((incoming, index) => {
      const key = incoming.id || String(index);
      const original = itemsById.get(key);

      if (!original) {
        // Если не нашли исходный — создаём новый элемент
        const portion = incoming.portion_g;
        return {
          id: incoming.id || `manual-${index}`,
          name: incoming.name,
          originalName: incoming.name,
          portion_g: portion,
          nutrients: {
            calories: incoming.calories ?? 0,
            protein: incoming.protein_g ?? 0,
            carbs: incoming.carbs_g ?? 0,
            fat: incoming.fat_g ?? 0,
            fiber: 0,
            sugars: 0,
            satFat: 0,
            energyDensity: incoming.calories && portion > 0 ? (incoming.calories / portion) * 100 : 0,
          },
          source: 'manual' as AnalyzedItem['source'],
        };
      }

      // Если исходный есть, скейлим КБЖУ пропорционально новой порции
      const newPortion = incoming.portion_g;
      const oldPortion = original.portion_g || newPortion || 1;
      const factor = oldPortion > 0 ? newPortion / oldPortion : 1;

      return {
        ...original,
        id: original.id || incoming.id || `manual-${index}`,
        name: incoming.name,
        originalName: incoming.name,
        portion_g: newPortion,
        nutrients: {
          calories: incoming.calories ?? original.nutrients.calories * factor,
          protein: incoming.protein_g ?? original.nutrients.protein * factor,
          fat: incoming.fat_g ?? original.nutrients.fat * factor,
          carbs: incoming.carbs_g ?? original.nutrients.carbs * factor,
          fiber: original.nutrients.fiber * factor,
          sugars: original.nutrients.sugars * factor,
          satFat: original.nutrients.satFat * factor,
          energyDensity: incoming.calories && newPortion > 0
            ? (incoming.calories / newPortion) * 100
            : (original.nutrients.energyDensity || 0),
        },
        source: 'manual' as AnalyzedItem['source'],
      };
    });

    // 4. Пересчитываем totals + healthScore + feedback
    const { totals, healthScore, feedback } =
      await this.recalculateAnalysisFromItems(updatedItems, analysis);

    const metadata = (analysis.metadata || {}) as any;
    const locale = metadata.locale || 'en';

    const newData: AnalysisData = {
      ...previousData,
      items: updatedItems,
      total: totals,
      healthScore,
      locale: locale as 'en' | 'ru' | 'kk',
    };

    // 5. Создаём новый AnalysisResult
    const newResult = await this.prisma.analysisResult.create({
      data: {
        analysisId: analysis.id,
        data: newData as any,
      },
    });

    // 6. Обновляем Meal если есть
    await this.updateMealFromAnalysisResult(analysisId, newData);

    this.logger.log(
      `[manualReanalyze] Analysis ${analysisId} updated manually by user ${userId}`,
    );

    // 7. Возвращаем в формате для фронта
    return this.mapAnalysisResult(newData);
  }

  /**
   * Reanalyze без изменения items:
   * перезапускает расчёт totals + HealthScore + feedback по текущим items.
   */
  async reanalyze(analysisId: string, userId: string): Promise<any> {
    const analysis = await this.prisma.analysis.findFirst({
      where: {
        id: analysisId,
        userId,
      },
      include: {
        results: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!analysis) {
      throw new ForbiddenException('Analysis not found or access denied');
    }

    if (!analysis.results.length) {
      throw new BadRequestException('Analysis results not found');
    }

    const lastResult = analysis.results[0];
    const previousData = (lastResult.data || {}) as unknown as AnalysisData;
    const items = previousData.items || [];

    // Пересчитываем totals + healthScore + feedback
    const { totals, healthScore, feedback } =
      await this.recalculateAnalysisFromItems(items, analysis);

    const metadata = (analysis.metadata || {}) as any;
    const locale = metadata.locale || 'en';

    const newData: AnalysisData = {
      ...previousData,
      total: totals,
      healthScore,
      locale: locale as 'en' | 'ru' | 'kk',
    };

    // Создаём новый AnalysisResult
    const newResult = await this.prisma.analysisResult.create({
      data: {
        analysisId: analysis.id,
        data: newData as any,
      },
    });

    // Обновляем Meal если есть
    await this.updateMealFromAnalysisResult(analysisId, newData);

    this.logger.log(
      `[reanalyze] Analysis ${analysisId} reanalyzed for user ${userId}`,
    );

    return this.mapAnalysisResult(newData);
  }

  /**
   * Вспомогательный метод пересчёта totals + HealthScore + feedback
   * по списку items.
   */
  private async recalculateAnalysisFromItems(
    items: AnalyzedItem[],
    analysis: { metadata?: any },
  ): Promise<{
    totals: AnalysisTotals;
    healthScore: HealthScore;
    feedback: any;
  }> {
    // 1. totals
    const totals: AnalysisTotals = items.reduce(
      (acc, item) => {
        acc.portion_g += item.portion_g || 0;
        acc.calories += item.nutrients?.calories || 0;
        acc.protein += item.nutrients?.protein || 0;
        acc.fat += item.nutrients?.fat || 0;
        acc.carbs += item.nutrients?.carbs || 0;
        acc.fiber += item.nutrients?.fiber || 0;
        acc.sugars += item.nutrients?.sugars || 0;
        acc.satFat += item.nutrients?.satFat || 0;
        return acc;
      },
      {
        portion_g: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugars: 0,
        satFat: 0,
        energyDensity: 0,
      } as AnalysisTotals,
    );

    // Recalculate energyDensity
    if (totals.portion_g > 0) {
      totals.energyDensity = (totals.calories / totals.portion_g) * 100;
    }

    // 2. locale можно взять из metadata анализа
    const metadata = (analysis.metadata || {}) as any;
    const locale = metadata.locale || 'en';

    // 3. HealthScore + feedback — используем AnalyzeService
    const healthScore = this.analyzeService.computeHealthScore(
      totals,
      totals.portion_g,
      items,
      locale as 'en' | 'ru' | 'kk',
    );

    // Feedback уже включен в healthScore
    const feedback = healthScore.feedback || [];

    return { totals, healthScore, feedback };
  }

  /**
   * Helper method: Update Meal and MealItem from AnalysisResult
   */
  private async updateMealFromAnalysisResult(analysisId: string, result: AnalysisData) {
    try {
      // Find meal by analysisId - check if Meal has analysisId field or use metadata
      // Since Meal doesn't have direct analysisId, we'll search by userId and recent meals
      // This is a fallback - ideally Meal should have analysisId field
      const analysis = await this.prisma.analysis.findUnique({
        where: { id: analysisId },
      });

      if (!analysis) {
        this.logger.debug(`[FoodService] Analysis not found for analysisId=${analysisId}, skipping meal update`);
        return;
      }

      // Try to find meal by userId and recent date (within last 24 hours)
      const recentDate = new Date();
      recentDate.setHours(recentDate.getHours() - 24);

      const meal = await this.prisma.meal.findFirst({
        where: {
          userId: analysis.userId,
          createdAt: {
            gte: recentDate,
          },
        },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!meal) {
        this.logger.debug(`[FoodService] No Meal found for analysisId=${analysisId}, skipping meal update`);
        return;
      }

      if (!meal) {
        this.logger.debug(`[FoodService] No Meal found for analysisId=${analysisId}, skipping meal update`);
        return;
      }

      const items = result.items || [];
      const mealName = result.dishNameLocalized || result.originalDishName || meal.name;

      // Delete old items and create new ones
      await this.prisma.mealItem.deleteMany({
        where: { mealId: meal.id },
      });

      await this.prisma.meal.update({
        where: { id: meal.id },
        data: {
          name: mealName,
          healthScore: result.healthScore?.score ?? null,
          healthGrade: result.healthScore?.grade ?? null,
          healthInsights: result.healthScore ? (result.healthScore as any) : null,
          imageUri: result.imageUrl || result.imageUri || meal.imageUri, // Preserve image URL
          items: {
            create: items.map((item: AnalyzedItem) => ({
              name: item.name,
              calories: item.nutrients.calories,
              protein: item.nutrients.protein,
              carbs: item.nutrients.carbs,
              fat: item.nutrients.fat,
              weight: item.portion_g,
            })),
          },
        },
      });

      this.logger.log(`[FoodService] Updated Meal ${meal.id} from analysis result`);
    } catch (error: any) {
      this.logger.warn(
        `[FoodService] Failed to update Meal from analysis result for analysisId=${analysisId}`,
        error instanceof Error ? error.message : String(error),
      );
      // Don't throw - meal update failure shouldn't block reanalysis
    }
  }

  /**
   * Save analysis correction for feedback loop
   */
  async saveCorrection(userId: string, correction: any) {
    try {
      const correctionData = {
        userId,
        analysisId: correction.analysisId || null,
        mealId: correction.mealId || null,
        itemId: correction.itemId || null,
        originalName: correction.originalName || '',
        correctedName: correction.correctedName || null,
        originalPortionG: correction.originalPortionG || null,
        correctedPortionG: correction.correctedPortionG || null,
        originalCalories: correction.originalCalories || null,
        correctedCalories: correction.correctedCalories || null,
        originalProtein: correction.originalProtein || null,
        correctedProtein: correction.correctedProtein || null,
        originalCarbs: correction.originalCarbs || null,
        correctedCarbs: correction.correctedCarbs || null,
        originalFat: correction.originalFat || null,
        correctedFat: correction.correctedFat || null,
        correctionType: correction.correctionType || 'nutrients',
        foodCategory: correction.foodCategory || null,
      };

      const saved = await this.prisma.analysisCorrection.create({
        data: correctionData,
      });

      this.logger.debug(`[FoodService] Correction saved: ${saved.id} for user ${userId}`);
      return saved;
    } catch (error) {
      this.logger.error(`[FoodService] Failed to save correction: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to save correction');
    }
  }
}

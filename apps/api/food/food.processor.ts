import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../prisma.service';
// NOTE: FoodAnalyzerService removed - was dead code (injected but never called)
// All food analysis now uses AnalyzeService (with VisionService + NutritionOrchestrator)
import { AnalyzeService } from '../src/analysis/analyze.service';
import { MealsService } from '../meals/meals.service';
import { MediaService } from '../media/media.service';
import * as sharp from 'sharp';

@Processor('food-analysis')
export class FoodProcessor {
  private readonly logger = new Logger(FoodProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    // FoodAnalyzerService removed - dead code
    private readonly analyzeService: AnalyzeService,
    private readonly mealsService: MealsService,
    private readonly mediaService: MediaService,
  ) { }

  @Process('analyze-image')
  async handleImageAnalysis(job: Job) {
    const { analysisId, imageBufferBase64, userId: jobUserId, locale, foodDescription, skipCache } = job.data;

    // Pipeline metrics tracking
    const metrics = {
      startTime: Date.now(),
      decodeTime: 0,
      sharpTime: 0,
      mediaUploadTime: 0,
      analyzeTime: 0,
      autoSaveTime: 0,
      totalTime: 0,
    };

    // Получаем userId из анализа, так как он точно правильный
    const analysis = await this.prisma.analysis.findUnique({
      where: { id: analysisId },
      select: { userId: true },
    });
    const userId = analysis?.userId || jobUserId;

    this.logger.log(`[FoodProcessor] Starting analysis ${analysisId}`, {
      userId,
      locale,
      hasFoodDescription: Boolean(foodDescription),
      skipCache,
      base64Length: imageBufferBase64?.length || 0,
    });

    try {
      // Update status to processing
      await this.prisma.analysis.update({
        where: { id: analysisId },
        data: { status: 'PROCESSING' },
      });

      // Decode base64 back to Buffer
      if (!imageBufferBase64) {
        throw new Error('Invalid image buffer: base64 string is missing');
      }

      const decodeStart = Date.now();
      let imageBuffer: Buffer;
      try {
        imageBuffer = Buffer.from(imageBufferBase64, 'base64');
        metrics.decodeTime = Date.now() - decodeStart;
        this.logger.debug(`[FoodProcessor] Decoded buffer: ${imageBuffer.length} bytes in ${metrics.decodeTime}ms`);
      } catch (decodeError: any) {
        this.logger.error(`[FoodProcessor] Failed to decode base64:`, decodeError);
        throw new Error(`Failed to decode base64 image buffer: ${decodeError.message}`);
      }

      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error('Invalid image buffer: decoded buffer is empty');
      }

      // Convert image to JPEG format that OpenAI supports
      // Sharp will handle any input format and convert to JPEG
      const sharpStart = Date.now();
      let processedBuffer: Buffer;
      try {
        // Process image - convert to JPEG suitable for Vision API
        // Note: Sharp does not preserve EXIF metadata when converting to JPEG by default
        processedBuffer = await sharp(imageBuffer)
          .jpeg({ quality: 90, mozjpeg: true })
          .toBuffer();

        metrics.sharpTime = Date.now() - sharpStart;

        if (!processedBuffer || processedBuffer.length === 0) {
          throw new Error('Image processing resulted in empty buffer');
        }
        this.logger.debug(`[FoodProcessor] Sharp processing: ${imageBuffer.length} → ${processedBuffer.length} bytes in ${metrics.sharpTime}ms`);
      } catch (sharpError: any) {
        this.logger.error('Image processing error:', sharpError);
        metrics.sharpTime = Date.now() - sharpStart;
        // If sharp fails, try using original buffer if it's valid
        if (imageBuffer && imageBuffer.length > 0) {
          processedBuffer = imageBuffer;
        } else {
          throw new Error(`Image processing failed: ${sharpError.message || 'Unknown error'}`);
        }
      }

      // Save image to Media and get public URL
      const mediaStart = Date.now();
      let imageUrl: string | null = null;
      try {
        const mockFile = {
          buffer: processedBuffer,
          originalname: `analysis-${analysisId}.jpg`,
          mimetype: 'image/jpeg',
          size: processedBuffer.length,
        };
        const mediaResult = await this.mediaService.uploadFile(mockFile, userId);
        imageUrl = mediaResult.url;
        metrics.mediaUploadTime = Date.now() - mediaStart;
        this.logger.debug(`[FoodProcessor] Media upload: ${metrics.mediaUploadTime}ms`);

        // Update analysis metadata with imageUrl for future reanalysis
        const existingAnalysis = await this.prisma.analysis.findUnique({ where: { id: analysisId } });
        const existingMetadata = (existingAnalysis?.metadata as any) || {};
        await this.prisma.analysis.update({
          where: { id: analysisId },
          data: {
            metadata: {
              ...existingMetadata,
              imageUrl,
            },
          },
        });
      } catch (mediaError: any) {
        this.logger.warn(`[FoodProcessor] Failed to save image to media:`, mediaError.message);
        // Continue without imageUrl - analysis can still proceed
      }

      // Convert buffer to base64 for new analysis service
      const imageBase64 = processedBuffer.toString('base64');

      // Use new AnalyzeService with USDA + RAG
      // Note: analyzeImage accepts imageBase64, but VisionService.getOrExtractComponents
      // can also accept imageBuffer directly for better caching
      const analyzeStart = Date.now();
      const analysisResult = await this.analyzeService.analyzeImage({
        imageBase64,
        imageUrl, // Pass imageUrl if available for better cache key generation
        locale,
        foodDescription: foodDescription || undefined, // Pass food description if provided
        skipCache: skipCache || false, // Pass skip-cache flag for debugging
      });
      metrics.analyzeTime = Date.now() - analyzeStart;

      // Check if analysis returned an error state (api_error, parse_error, no_food_detected)
      const visionStatus = (analysisResult.debug as any)?.visionStatus;
      const visionError = (analysisResult.debug as any)?.visionError;
      const isVisionError = visionStatus === 'api_error' || visionStatus === 'parse_error';
      const isNoFoodDetected = visionStatus === 'no_food_detected';

      // Transform to old format for compatibility
      const result: any = {
        items: (analysisResult.items && Array.isArray(analysisResult.items) ? analysisResult.items : []).map(item => ({
          label: item.name,
          kcal: item.nutrients.calories,
          protein: item.nutrients.protein,
          fat: item.nutrients.fat,
          carbs: item.nutrients.carbs,
          gramsMean: item.portion_g,
        })),
        total: analysisResult.total,
        healthScore: analysisResult.healthScore,
        // Include vision status info for debugging/display
        visionStatus: visionStatus || 'success',
        visionError: visionError || null,
      };

      // Automatically save to meals (Recently)
      try {
        const items = analysisResult.items || [];
        if (items.length > 0 && userId && userId !== 'test-user' && userId !== 'temp-user') {
          // Проверяем, существует ли пользователь
          const user = await this.prisma.user.findUnique({ where: { id: userId } });
          if (user) {
            // STAGE 1 FIX: Use dishNameLocalized for meal name, NOT first ingredient
            // Priority: dishNameLocalized > originalDishName > first item name > fallback
            const dishName = analysisResult.dishNameLocalized ||
              analysisResult.originalDishName ||
              items[0]?.name ||
              'Analyzed Meal';

            console.log(`[FoodProcessor] Autosave meal name: "${dishName}" (source: ${analysisResult.dishNameLocalized ? 'dishNameLocalized' :
                analysisResult.originalDishName ? 'originalDishName' :
                  items[0]?.name ? 'firstItem' : 'fallback'
              })`);
            // Фильтруем и валидируем items перед сохранением
            // Relaxed validation: accept items with any nutrition data or reasonable portion
            const validItems = items
              .map(item => {
                const calories = item.nutrients?.calories ?? 0;
                const protein = item.nutrients?.protein ?? 0;
                const fat = item.nutrients?.fat ?? 0;
                const carbs = item.nutrients?.carbs ?? 0;
                const weight = item.portion_g ?? 100;

                return {
                  name: item.name || 'Unknown Food',
                  calories: Math.max(0, Math.round(calories)),
                  protein: Math.max(0, Math.round(protein * 10) / 10),
                  fat: Math.max(0, Math.round(fat * 10) / 10),
                  carbs: Math.max(0, Math.round(carbs * 10) / 10),
                  weight: Math.max(1, Math.round(weight)),
                };
              })
              .filter(item => {
                // Accept if: has valid name AND (has calories OR has macros OR has reasonable portion)
                const hasValidName = item.name && item.name !== 'Unknown Food';
                const hasNutrition = item.calories > 0 || item.protein > 0 || item.fat > 0 || item.carbs > 0;
                const hasReasonablePortion = item.weight >= 10; // At least 10g

                const accepted = hasValidName && (hasNutrition || hasReasonablePortion);

                // FIX #7: Log why specific items are rejected
                if (!accepted) {
                  this.logger.debug('[FoodProcessor] Item rejected from autosave:', {
                    name: item.name,
                    reason: !hasValidName
                      ? 'invalid_name'
                      : !hasNutrition && !hasReasonablePortion
                        ? 'no_nutrition_and_tiny_portion'
                        : 'unknown',
                    calories: item.calories,
                    protein: item.protein,
                    fat: item.fat,
                    carbs: item.carbs,
                    weight: item.weight,
                  });
                }

                return accepted;
              });

            // Task 14: Log WARN when auto-save filtering removes all items
            if (validItems.length === 0 && items.length > 0) {
              this.logger.warn('[FoodProcessor] Auto-save skipped: all items filtered out during validation', {
                analysisId,
                userId,
                originalItemCount: items.length,
                originalItems: items.map(item => ({
                  name: item.name,
                  calories: item.nutrients?.calories,
                  protein: item.nutrients?.protein,
                  fat: item.nutrients?.fat,
                  carbs: item.nutrients?.carbs,
                  portion_g: item.portion_g,
                  source: item.source,
                })),
                reason: 'Items did not pass validation (missing name, no nutrition data, or portion < 10g)',
                needsReview: true,
              });

              result.autoSave = {
                skipped: true,
                reason: 'no_valid_items',
                needsReview: true,
              };
            } else if (validItems.length > 0) {
              const autoSaveStart = Date.now();
              const meal = await this.mealsService.createMeal(userId, {
                name: dishName,
                type: 'MEAL',
                consumedAt: new Date().toISOString(), // Set current date/time for the meal
                items: validItems,
                healthScore: analysisResult.healthScore,
                imageUri: imageUrl || null, // Include imageUrl when auto-saving meal
              });
              metrics.autoSaveTime = Date.now() - autoSaveStart;
              this.logger.log(`[FoodProcessor] Auto-saved analysis ${analysisId} to meals (mealId: ${meal.id}, ${metrics.autoSaveTime}ms)`);

              // =====================================================
              // OBSERVABILITY: Structured log of autosave mapping
              // =====================================================
              this.logger.log(JSON.stringify({
                stage: 'autosave',
                analysisId,
                userId,
                mealId: meal.id,
                mealName: dishName,
                dishNameLocalized: analysisResult.dishNameLocalized,
                originalDishName: analysisResult.originalDishName,
                dishNameSource: (analysisResult as any).dishNameSource,
                itemCount: validItems.length,
                filteredOut: items.length - validItems.length,
                items: validItems.slice(0, 10).map(i => ({
                  name: i.name,
                  kcal: i.calories,
                  protein: i.protein,
                  carbs: i.carbs,
                  fat: i.fat,
                  weight: i.weight,
                })),
                imageUrl: imageUrl || null,
              }));

              result.autoSave = {
                mealId: meal.id,
                savedAt: new Date().toISOString(),
              };
            } else {
              this.logger.debug(`[FoodProcessor] Skipping auto-save: no items to save for analysis ${analysisId}`);
            }
          } else {
            console.log(`Skipping auto-save: user ${userId} not found`);
          }
        } else {
          // Improved logging: distinguish between different skip reasons
          const skipReason = !userId
            ? 'userId_is_null'
            : userId === 'test-user' || userId === 'temp-user'
              ? `test_user_${userId}`
              : (analysisResult.items || []).length === 0
                ? 'no_items_from_analysis'
                : 'unknown';
          this.logger.debug(`[FoodProcessor] Skipping auto-save for analysis ${analysisId}:`, {
            reason: skipReason,
            userId: userId || 'null',
            itemCount: (analysisResult.items || []).length,
            visionStatus: (analysisResult.debug as any)?.visionStatus,
          });
        }
      } catch (mealError: any) {
        this.logger.error(`[FoodProcessor] Failed to auto-save analysis ${analysisId} to meals:`, mealError.message);
        this.logger.error(`[FoodProcessor] Error stack:`, mealError.stack);
        // Don't fail the analysis if meal save fails
      }

      // Save results (with optional auto-save metadata)
      // Include imageUrl in result data for future reanalysis
      // CRITICAL: ALWAYS save an AnalysisResult, even for failed/empty analyses
      const resultDataWithImage = {
        ...result,
        imageUrl: imageUrl || null,
        // Include error info for client display
        analysisError: isVisionError ? {
          code: visionError?.code || 'UNKNOWN_ERROR',
          message: visionError?.message || 'Analysis failed',
          status: visionStatus,
        } : null,
      };
      await this.prisma.analysisResult.create({
        data: {
          analysisId,
          data: resultDataWithImage as any,
        },
      });

      // Determine final status based on vision result and items
      // Priority: api_error → FAILED, parse_error → FAILED, no_food → NEEDS_REVIEW, no items → NEEDS_REVIEW, else → COMPLETED
      let finalStatus: string;
      let errorMessage: string | null = null;

      if (isVisionError) {
        // Vision API or parsing failed - mark as FAILED
        finalStatus = 'FAILED';
        errorMessage = visionError?.message || 'Failed to analyze image. Please try again.';
        this.logger.error(`[FoodProcessor] Analysis ${analysisId} marked as FAILED: ${visionStatus}`, {
          visionError,
          analysisId,
        });
      } else if (isNoFoodDetected) {
        // Vision worked but no food detected - mark as NEEDS_REVIEW (user can retry with different image)
        finalStatus = 'NEEDS_REVIEW';
        errorMessage = 'No food items could be identified in this image. Please try with a clearer photo.';
        this.logger.warn(`[FoodProcessor] Analysis ${analysisId} marked as NEEDS_REVIEW: no food detected`);
      } else {
        // Normal case: check if we have valid items
        const hasValidItems = (analysisResult.items || []).length > 0;
        if (hasValidItems) {
          finalStatus = 'COMPLETED';
        } else {
          finalStatus = 'NEEDS_REVIEW';
          errorMessage = 'No food items could be identified in this image. Please try again with a clearer photo.';
          this.logger.warn(`[FoodProcessor] Analysis ${analysisId} marked as NEEDS_REVIEW: no items after processing`);
        }
      }

      await this.prisma.analysis.update({
        where: { id: analysisId },
        data: {
          status: finalStatus,
          error: errorMessage,
        },
      });

      // Increment user stats for photo analysis
      if (userId && userId !== 'test-user' && userId !== 'temp-user') {
        try {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayStr = today.toISOString().split('T')[0];

          const existingStats = await this.prisma.userStats.findUnique({
            where: { userId },
          });

          if (existingStats) {
            const lastAnalysisDate = existingStats.lastAnalysisDate
              ? new Date(existingStats.lastAnalysisDate).toISOString().split('T')[0]
              : null;

            await this.prisma.userStats.update({
              where: { userId },
              data: {
                totalPhotosAnalyzed: { increment: 1 },
                todayPhotosAnalyzed: lastAnalysisDate === todayStr
                  ? { increment: 1 }
                  : 1,
                lastAnalysisDate: new Date(),
              },
            });
          } else {
            await this.prisma.userStats.create({
              data: {
                userId,
                totalPhotosAnalyzed: 1,
                todayPhotosAnalyzed: 1,
                lastAnalysisDate: new Date(),
              },
            });
          }
        } catch (statsError: any) {
          this.logger.warn(`[FoodProcessor] Failed to update user stats for ${userId}:`, statsError.message);
          // Don't fail the analysis if stats update fails
        }
      }

      // Calculate total time and log metrics
      metrics.totalTime = Date.now() - metrics.startTime;
      this.logger.log(`[FoodProcessor] Analysis ${analysisId} completed`, {
        analysisId,
        userId,
        metrics: {
          totalMs: metrics.totalTime,
          decodeMs: metrics.decodeTime,
          sharpMs: metrics.sharpTime,
          mediaUploadMs: metrics.mediaUploadTime,
          analyzeMs: metrics.analyzeTime,
          autoSaveMs: metrics.autoSaveTime,
        },
        result: {
          status: visionStatus || 'success',
          itemCount: (analysisResult.items || []).length,
          autoSaved: Boolean(result.autoSave?.mealId),
        },
      });
    } catch (error: any) {
      this.logger.error(`[FoodProcessor] Image analysis failed for analysis ${analysisId}:`, {
        message: error.message,
        stack: error.stack,
        name: error.name,
        status: error?.status,
        responseData: error?.response?.data,
      });

      // Update status to failed
      try {
        await this.prisma.analysis.update({
          where: { id: analysisId },
          data: {
            status: 'FAILED',
            error: error.message || 'Unknown error',
          },
        });
      } catch (updateError: any) {
        this.logger.error(`[FoodProcessor] Failed to update analysis status:`, updateError.message);
      }
    }
  }

  @Process('analyze-text')
  async handleTextAnalysis(job: Job) {
    const { analysisId, description, userId, locale, skipCache } = job.data;

    if (!analysisId) {
      this.logger.error('[FoodProcessor] handleTextAnalysis: missing analysisId in job data');
      throw new Error('Analysis ID is required for text analysis');
    }

    if (!description || !description.trim()) {
      this.logger.error(`[FoodProcessor] handleTextAnalysis: missing or empty description for analysis ${analysisId}`);
      await this.prisma.analysis.update({
        where: { id: analysisId },
        data: {
          status: 'FAILED',
          error: 'Description is required',
        },
      });
      return;
    }

    this.logger.log(`[FoodProcessor] Starting text analysis for analysis ${analysisId}, description length: ${description.length}`);

    try {
      // Update status to processing
      await this.prisma.analysis.update({
        where: { id: analysisId },
        data: { status: 'PROCESSING' },
      });

      this.logger.debug(`[FoodProcessor] Text analysis ${analysisId} status updated to PROCESSING`);

      // Use new AnalyzeService for text analysis
      const analysisResult = await this.analyzeService.analyzeText(description, locale, skipCache);

      this.logger.log(`[FoodProcessor] Text analysis ${analysisId} completed, items count: ${analysisResult.items?.length || 0}`);

      // Transform to old format for compatibility
      const result: any = {
        items: (analysisResult.items && Array.isArray(analysisResult.items) ? analysisResult.items : []).map(item => ({
          label: item.name,
          kcal: item.nutrients.calories,
          protein: item.nutrients.protein,
          fat: item.nutrients.fat,
          carbs: item.nutrients.carbs,
          gramsMean: item.portion_g,
        })),
        total: analysisResult.total,
        healthScore: analysisResult.healthScore,
      };

      // Auto-save text analyses as well
      try {
        const items = analysisResult.items || [];
        if (items.length > 0 && userId && userId !== 'test-user' && userId !== 'temp-user') {
          const user = await this.prisma.user.findUnique({ where: { id: userId } });
          if (user) {
            const dishName = items[0]?.name || 'Analyzed Meal';
            // Фильтруем и валидируем items перед сохранением
            // Relaxed validation: accept items with any nutrition data or reasonable portion
            const validItems = items
              .map(item => {
                const calories = item.nutrients?.calories ?? 0;
                const protein = item.nutrients?.protein ?? 0;
                const fat = item.nutrients?.fat ?? 0;
                const carbs = item.nutrients?.carbs ?? 0;
                const weight = item.portion_g ?? 100;

                return {
                  name: item.name || 'Unknown Food',
                  calories: Math.max(0, Math.round(calories)),
                  protein: Math.max(0, Math.round(protein * 10) / 10),
                  fat: Math.max(0, Math.round(fat * 10) / 10),
                  carbs: Math.max(0, Math.round(carbs * 10) / 10),
                  weight: Math.max(1, Math.round(weight)),
                };
              })
              .filter(item => {
                // Accept if: has valid name AND (has calories OR has macros OR has reasonable portion)
                const hasValidName = item.name && item.name !== 'Unknown Food';
                const hasNutrition = item.calories > 0 || item.protein > 0 || item.fat > 0 || item.carbs > 0;
                const hasReasonablePortion = item.weight >= 10; // At least 10g

                return hasValidName && (hasNutrition || hasReasonablePortion);
              });

            if (validItems.length > 0) {
              const meal = await this.mealsService.createMeal(userId, {
                name: dishName,
                type: 'MEAL',
                items: validItems,
                healthScore: analysisResult.healthScore,
                imageUri: null, // Text analysis has no image
              });
              result.autoSave = {
                mealId: meal.id,
                savedAt: new Date().toISOString(),
              };
              console.log(`Automatically saved text analysis ${analysisId} to meals`);
            } else {
              console.log(`Skipping auto-save text analysis: no valid items for analysis ${analysisId}`);
            }
          }
        }
      } catch (mealError: any) {
        this.logger.error(`[FoodProcessor] Failed to auto-save text analysis ${analysisId} to meals:`, mealError.message);
      }

      // Save results
      await this.prisma.analysisResult.create({
        data: {
          analysisId,
          data: result as any,
        },
      });

      // Update status to completed
      await this.prisma.analysis.update({
        where: { id: analysisId },
        data: { status: 'COMPLETED' },
      });

      console.log(`Text analysis completed for analysis ${analysisId}`);
    } catch (error: any) {
      this.logger.error(`[FoodProcessor] Text analysis failed for analysis ${analysisId}:`, error);

      // Update status to failed
      await this.prisma.analysis.update({
        where: { id: analysisId },
        data: {
          status: 'FAILED',
          error: error.message,
        },
      });
    }
  }
}

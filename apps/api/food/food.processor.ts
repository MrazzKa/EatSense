import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../prisma.service';
import { FoodAnalyzerService } from './food-analyzer/food-analyzer.service';
import { AnalyzeService } from '../src/analysis/analyze.service';
import { MealsService } from '../meals/meals.service';
import { MediaService } from '../media/media.service';
import * as sharp from 'sharp';

@Processor('food-analysis')
export class FoodProcessor {
  private readonly logger = new Logger(FoodProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly foodAnalyzer: FoodAnalyzerService,
    private readonly analyzeService: AnalyzeService,
    private readonly mealsService: MealsService,
    private readonly mediaService: MediaService,
  ) {}

  @Process('analyze-image')
  async handleImageAnalysis(job: Job) {
    const { analysisId, imageBufferBase64, userId: jobUserId, locale, foodDescription } = job.data;
    
    // Получаем userId из анализа, так как он точно правильный
    const analysis = await this.prisma.analysis.findUnique({
      where: { id: analysisId },
      select: { userId: true },
    });
    const userId = analysis?.userId || jobUserId;

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

      console.log(`[FoodProcessor] Processing analysis ${analysisId}, base64 length: ${imageBufferBase64.length}`);

      let imageBuffer: Buffer;
      try {
        imageBuffer = Buffer.from(imageBufferBase64, 'base64');
        console.log(`[FoodProcessor] Decoded buffer size: ${imageBuffer.length} bytes`);
      } catch (decodeError: any) {
        this.logger.error(`[FoodProcessor] Failed to decode base64:`, decodeError);
        throw new Error(`Failed to decode base64 image buffer: ${decodeError.message}`);
      }

      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error('Invalid image buffer: decoded buffer is empty');
      }

      // Convert image to JPEG format that OpenAI supports
      // Sharp will handle any input format and convert to JPEG
      let processedBuffer: Buffer;
      try {
        // Process image - convert to JPEG suitable for Vision API
        // Note: Sharp does not preserve EXIF metadata when converting to JPEG by default
        processedBuffer = await sharp(imageBuffer)
          .jpeg({ quality: 90, mozjpeg: true })
          .toBuffer();
        
        if (!processedBuffer || processedBuffer.length === 0) {
          throw new Error('Image processing resulted in empty buffer');
        }
      } catch (sharpError: any) {
        this.logger.error('Image processing error:', sharpError);
        // If sharp fails, try using original buffer if it's valid
        if (imageBuffer && imageBuffer.length > 0) {
          processedBuffer = imageBuffer;
        } else {
          throw new Error(`Image processing failed: ${sharpError.message || 'Unknown error'}`);
        }
      }

      // Save image to Media and get public URL
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
        console.log(`[FoodProcessor] Image saved to media, URL: ${imageUrl}`);
      } catch (mediaError: any) {
        this.logger.warn(`[FoodProcessor] Failed to save image to media:`, mediaError.message);
        // Continue without imageUrl - analysis can still proceed
      }

      // Convert buffer to base64 for new analysis service
      const imageBase64 = processedBuffer.toString('base64');
      
      // Use new AnalyzeService with USDA + RAG
      // Note: analyzeImage accepts imageBase64, but VisionService.getOrExtractComponents
      // can also accept imageBuffer directly for better caching
      const analysisResult = await this.analyzeService.analyzeImage({
        imageBase64,
        imageUrl, // Pass imageUrl if available for better cache key generation
        locale,
        foodDescription: foodDescription || undefined, // Pass food description if provided
      });

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

      // Automatically save to meals (Recently)
      try {
        const items = analysisResult.items || [];
        if (items.length > 0 && userId && userId !== 'test-user' && userId !== 'temp-user') {
          // Проверяем, существует ли пользователь
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
              const meal = await this.mealsService.createMeal(userId, {
                name: dishName,
                type: 'MEAL',
                consumedAt: new Date().toISOString(), // Set current date/time for the meal
                items: validItems,
                healthScore: analysisResult.healthScore,
                imageUri: imageUrl || null, // Include imageUrl when auto-saving meal
              });
              this.logger.log(`[FoodProcessor] Auto-saved analysis ${analysisId} to meals (mealId: ${meal.id})`);
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
          console.log(`Skipping auto-save: invalid userId (${userId}) or no items`);
        }
      } catch (mealError: any) {
        this.logger.error(`[FoodProcessor] Failed to auto-save analysis ${analysisId} to meals:`, mealError.message);
        this.logger.error(`[FoodProcessor] Error stack:`, mealError.stack);
        // Don't fail the analysis if meal save fails
      }

      // Save results (with optional auto-save metadata)
      // Include imageUrl in result data for future reanalysis
      const resultDataWithImage = {
        ...result,
        imageUrl: imageUrl || null,
      };
      await this.prisma.analysisResult.create({
        data: {
          analysisId,
          data: resultDataWithImage as any,
        },
      });

      // Update status to completed
      await this.prisma.analysis.update({
        where: { id: analysisId },
        data: { status: 'COMPLETED' },
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

      console.log(`[FoodProcessor] Image analysis completed for analysis ${analysisId}`);
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
    const { analysisId, description, userId, locale } = job.data;

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
      const analysisResult = await this.analyzeService.analyzeText(description, locale);
      
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

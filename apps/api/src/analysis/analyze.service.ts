import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { HybridService } from '../fdc/hybrid/hybrid.service';
import { VisionService, VisionComponent } from './vision.service';
import { PortionService } from './portion.service';
import { CacheService } from '../cache/cache.service';
import { normalizeFoodName } from './text-utils';
import {
  AnalysisData,
  AnalyzedItem,
  AnalysisTotals,
  Nutrients,
  HealthScore,
  AnalysisDebug,
  AnalysisSanityIssue,
} from './analysis.types';
import { FoodLocalizationService } from './food-localization.service';
import * as crypto from 'crypto';

type HealthWeights = {
  protein: number;
  fiber: number;
  satFat: number;
  sugar: number;
  energyDensity: number;
};

/**
 * Main service for analyzing food images and text descriptions.
 * Orchestrates Vision extraction, FDC matching, portion estimation, and HealthScore calculation.
 * 
 * TODO: Future enhancement - barcode-based product lookup:
 * - When a barcode is detected in an image or provided by user, use OpenFoodFactsService
 *   to look up product data directly, bypassing vision/FDC matching for known products.
 * - This would provide more accurate nutrition data for packaged foods.
 */
@Injectable()
export class AnalyzeService {
  private readonly logger = new Logger(AnalyzeService.name);
  // Versioned cache key to avoid conflicts with legacy cached shapes
  private readonly ANALYSIS_CACHE_VERSION = 'v5';

  constructor(
    private readonly prisma: PrismaService,
    private readonly hybrid: HybridService,
    private readonly vision: VisionService,
    private readonly portion: PortionService,
    private readonly cache: CacheService,
    private readonly foodLocalization: FoodLocalizationService,
  ) {}

  /**
   * Helper: Estimate portion in grams
   * Priority: Vision > FDC serving > default 150g
   * Clamps to reasonable range: 10g - 800g
   */
  private estimatePortionInGrams(
    component: VisionComponent,
    fdcServingSizeG: number | null,
    debug?: AnalysisDebug,
  ): number {
    const originalEstimate = component.est_portion_g && component.est_portion_g > 0
      ? component.est_portion_g
      : fdcServingSizeG && fdcServingSizeG > 0
      ? fdcServingSizeG
      : 150;

    // Мягкие пределы: минимум 10 г, максимум 800 г
    let portion = originalEstimate;
    if (portion < 10) portion = 10;
    if (portion > 800) portion = 800;

    // Log clamping in debug mode
    if (process.env.ANALYSIS_DEBUG === 'true' && debug && portion !== originalEstimate) {
      debug.components = debug.components || [];
      debug.components.push({
        type: 'portion_clamped',
        componentName: component.name,
        originalPortionG: originalEstimate,
        finalPortionG: portion,
      });
    }

    return portion;
  }

  /**
   * Helper: Round number to 1 decimal or integer
   */
  private round(value: number, decimals: number = 1): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }

  /**
   * Analyze image and return normalized nutrition data
   */
  async analyzeImage(params: { imageUrl?: string; imageBase64?: string; locale?: 'en' | 'ru' | 'kk' }): Promise<AnalysisData> {
    const isDebugMode = process.env.ANALYSIS_DEBUG === 'true';
    const locale = (params.locale as 'en' | 'ru' | 'kk' | undefined) || 'en';
    
    // Check cache
    const imageHash = this.hashImage(params);
    const cacheKey = `${this.ANALYSIS_CACHE_VERSION}:${imageHash}`;
    const cached = await this.cache.get<AnalysisData>(cacheKey, 'analysis');
    if (cached) {
      this.logger.debug('Cache hit for image analysis');
      return cached;
    }

    // Extract components via Vision
    const visionComponents = await this.vision.extractComponents({ imageUrl: params.imageUrl, imageBase64: params.imageBase64 });
    
    // Initialize debug object
    const debug: AnalysisDebug = {
      componentsRaw: visionComponents,
      components: [],
      timestamp: new Date().toISOString(),
      model: process.env.OPENAI_MODEL || process.env.VISION_MODEL || 'gpt-5.1',
    };

    // Analyze each component
    const items: AnalyzedItem[] = [];

    for (const component of visionComponents) {
      try {
        const query = `${component.name} ${component.preparation || ''}`.trim();
        
        // Detect if component is likely a drink based on name
        const componentNameLower = component.name.toLowerCase();
        const drinkKeywords = [
          'coffee', 'latte', 'cappuccino', 'espresso', 'mocha',
          'tea', 'chai', 'matcha',
          'juice', 'smoothie', 'shake',
          'soda', 'cola', 'fanta', 'sprite', 'pepsi',
          'energy drink', 'red bull',
          'water', 'sparkling water',
          'milk', 'almond milk', 'soy milk',
          'beer', 'wine', 'cocktail', 'drink', 'beverage',
          'кофе', 'чай', 'сок', 'газировка', 'напиток', 'молоко',
        ];
        const isDrinkComponent = drinkKeywords.some(keyword => componentNameLower.includes(keyword));
        const expectedCategory: 'drink' | 'solid' | 'unknown' = isDrinkComponent ? 'drink' : 'unknown';
        
        const matches = await this.hybrid.findByText(query, 5, 0.7, expectedCategory);

        if (!matches || matches.length === 0) {
          debug.components.push({ type: 'no_match', vision: component });
          if (process.env.ANALYSIS_DEBUG === 'true' && isDrinkComponent) {
            this.logger.debug('[AnalyzeService] No FDC matches for drink component', {
              componentName: component.name,
              query,
            });
          }
          // Q4: Fallback при отсутствии FDC
          await this.addVisionFallback(component, items, debug, locale);
          continue;
        }

        // Select best match only (already sorted by score, with penalties applied)
        const bestMatch = matches[0];
        
        // Filter weak matches
        if (bestMatch.score < 0.7) {
          debug.components.push({ type: 'low_score', vision: component, bestMatch, score: bestMatch.score });
          if (process.env.ANALYSIS_DEBUG === 'true' && isDrinkComponent) {
            this.logger.debug('[AnalyzeService] Low score match for drink component', {
              componentName: component.name,
              bestMatchDescription: bestMatch.description,
              score: bestMatch.score,
            });
          }
          // Q4: Fallback при отсутствии FDC
          await this.addVisionFallback(component, items, debug, locale);
          continue;
        }

        // Check text overlap between component name and food description
        // For beverages, require stronger overlap (at least 2 words or beverage keyword match)
        const desc = (bestMatch.description || '').toLowerCase();
        const componentWords = component.name.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        let hasOverlap: boolean;
        
        if (isDrinkComponent) {
          // For drinks: require at least 2 overlapping words OR beverage keyword match
          const beverageKeywords = ['coffee', 'tea', 'juice', 'soda', 'milk', 'drink', 'beverage', 'кофе', 'чай', 'сок'];
          const hasBeverageKeyword = beverageKeywords.some(kw => 
            componentNameLower.includes(kw) && desc.includes(kw)
          );
          const overlappingWords = componentWords.filter(w => desc.includes(w));
          hasOverlap = hasBeverageKeyword || overlappingWords.length >= 2;
        } else {
          // For solids: single word overlap is enough (existing behavior)
          hasOverlap = componentWords.some(w => desc.includes(w));
        }
        
        if (!hasOverlap) {
          debug.components.push({ type: 'no_overlap', vision: component, bestMatch });
          if (process.env.ANALYSIS_DEBUG === 'true' && isDrinkComponent) {
            this.logger.debug('[AnalyzeService] No text overlap for drink component', {
              componentName: component.name,
              bestMatchDescription: bestMatch.description,
            });
          }
          // Q4: Fallback при отсутствии FDC
          await this.addVisionFallback(component, items, debug, locale);
          continue;
        }

        const food = await this.prisma.food.findUnique({
          where: { fdcId: bestMatch.fdcId },
          include: {
            portions: true,
            nutrients: {
              include: {
                nutrient: true,
              },
            },
            label: true,
          },
        });

        if (!food) {
          debug.components.push({ type: 'no_match', vision: component, reason: 'food_not_found' });
          continue;
        }

        // Get normalized nutrients (per 100g)
        const normalized = await this.hybrid.getFoodNormalized(bestMatch.fdcId);
        
        // Get FDC serving size (if available)
        const fdcServingSizeG = food.portions?.[0]?.gramWeight || null;
        
        // Estimate portion (with clamping)
        const portionG = this.estimatePortionInGrams(component, fdcServingSizeG, debug);

        // Calculate nutrients for portion (FDC data is per 100g)
        const nutrients = this.calculateNutrientsForPortion(
          normalized,
          portionG,
        );

        // BUG 4 & 5: Debug logging for FDC match and zero calories
        if (process.env.ANALYSIS_DEBUG === 'true' || nutrients.calories === 0) {
          this.logger.debug('[AnalyzeService] FDC match for component', {
            componentName: component.name,
            fdcId: bestMatch.fdcId,
            fdcDescription: bestMatch.description,
            normalizedNutrients: normalized.nutrients,
            portionG: portionG,
            calculatedCalories: nutrients.calories,
            calculatedProtein: nutrients.protein,
            calculatedCarbs: nutrients.carbs,
            calculatedFat: nutrients.fat,
          });
        }

        // Build clean base name from FDC description or vision name
        const baseName = this.buildBaseFoodName(component.name, bestMatch.description || food.description);
        const originalNameEn = normalizeFoodName(baseName);
        const localizedName = await this.foodLocalization.localizeName(originalNameEn, locale);

        // Check if item has valid nutrition data
        const hasNutrition = nutrients.calories > 0 || nutrients.protein > 0 || nutrients.carbs > 0 || nutrients.fat > 0;
        
        // Determine if this is a drink based on name (already detected earlier, but check again for consistency)
        const nameLower = (originalNameEn || component.name || '').toLowerCase();
        const drinkKeywords = [
          'coffee', 'latte', 'cappuccino', 'espresso', 'mocha',
          'tea', 'chai', 'matcha',
          'juice', 'smoothie', 'shake',
          'soda', 'cola', 'fanta', 'sprite', 'pepsi',
          'energy drink', 'red bull',
          'water', 'sparkling water',
          'milk', 'almond milk', 'soy milk',
          'beer', 'wine', 'cocktail', 'drink', 'beverage',
          'кофе', 'чай', 'сок', 'газировка', 'напиток', 'молоко',
        ];
        const isDrink = drinkKeywords.some(keyword => nameLower.includes(keyword));
        
        // For drinks, adjust portion if needed (default volumes)
        let finalPortionG = portionG;
        if (isDrink && portionG < 50) {
          // Default volumes for drinks
          if (nameLower.includes('coffee') || nameLower.includes('tea') || nameLower.includes('кофе') || nameLower.includes('чай')) {
            finalPortionG = 200; // 200ml for coffee/tea
          } else if (nameLower.includes('juice') || nameLower.includes('soda') || nameLower.includes('cola') || nameLower.includes('сок') || nameLower.includes('газировка')) {
            finalPortionG = 250; // 250ml for juice/soda
          } else {
            finalPortionG = 250; // Default 250ml
          }
          // Recalculate nutrients with adjusted portion
          const adjustedNutrients = this.calculateNutrientsForPortion(normalized, finalPortionG);
          nutrients.calories = adjustedNutrients.calories;
          nutrients.protein = adjustedNutrients.protein;
          nutrients.carbs = adjustedNutrients.carbs;
          nutrients.fat = adjustedNutrients.fat;
        }
        
        // Create AnalyzedItem with localized and original names
        const item: AnalyzedItem & { baseName?: string; displayNameLocalized?: string } = {
          name: localizedName || originalNameEn,
          originalName: originalNameEn,
          baseName: baseName, // Clean canonical English name
          displayNameLocalized: locale !== 'en' ? localizedName : undefined, // Localized name if not English
          label: component.name,
          portion_g: finalPortionG,
          nutrients,
          source: 'fdc',
          fdcId: bestMatch.fdcId,
          fdcScore: bestMatch.score,
          dataType: food.dataType,
          locale,
          hasNutrition,
        };

        items.push(item);
        debug.components.push({ type: 'matched', vision: component, bestMatch, score: bestMatch.score });
      } catch (error: any) {
        this.logger.error(`Error analyzing component ${component.name}:`, error.message);
        debug.components.push({ type: 'no_match', vision: component, error: error.message });
        // Q4: Fallback при отсутствии FDC
        await this.addVisionFallback(component, items, debug, locale);
      }
    }

    // Calculate totals
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
        acc.energyDensity += item.nutrients.energyDensity;
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
      total.energyDensity = this.round((total.calories / total.portion_g) * 100, 1);
    }

    const healthScore = this.computeHealthScore(total, total.portion_g, items);

    // Q1: Run sanity check
    const sanity = this.runSanityCheck({ items, total, healthScore, debug });
    if (debug) {
      debug.sanity = sanity;
    }
    
    // Q3: Mark suspicious analyses
    const hasSeriousIssues = sanity.some(
      (i) => i.type === 'macro_kcal_mismatch' || i.type === 'suspicious_energy_density',
    );
    const isSuspicious = hasSeriousIssues;

    // Q4: Check for all-zero macros (needsReview flag)
    const allMacrosZero = total.calories === 0 && total.protein === 0 && total.carbs === 0 && total.fat === 0;
    const hasItemsButNoData = items.length > 0 && allMacrosZero;
    
    // Check for any item with weight > 0 but all macros zero
    const anyItemHasWeightAndZeroMacros = items.some(item =>
      item.portion_g > 0 &&
      item.nutrients.calories === 0 &&
      item.nutrients.protein === 0 &&
      item.nutrients.carbs === 0 &&
      item.nutrients.fat === 0
    );
    
    let needsReview = hasItemsButNoData || anyItemHasWeightAndZeroMacros;

    // Log sanity issues in debug mode
    if (process.env.ANALYSIS_DEBUG === 'true' && sanity.length > 0) {
      this.logger.warn('[AnalysisSanity] Issues detected', {
        issues: sanity,
        total: total,
      });
    }

    // Debug instrumentation for zero-calorie analyses
    if (total.calories === 0 && items.length > 0) {
      this.logger.warn('[AnalyzeService] Zero-calorie analysis detected', {
        componentCount: visionComponents.length,
        itemCount: items.length,
        needsReview,
        sampleComponents: visionComponents.slice(0, 5).map((c) => ({
          name: c.name,
          preparation: c.preparation,
          est_portion_g: c.est_portion_g,
          confidence: c.confidence,
        })),
        sampleItems: items.slice(0, 5).map((it) => ({
          name: it.name,
          portion_g: it.portion_g,
          nutrients: it.nutrients,
        })),
      });
    }

    // Task 3: Check if ALL items have 0 calories and log ERROR with full details
    const allItemsZeroCalories = items.length > 0 && items.every(item => (item.nutrients?.calories || 0) === 0);
    if (allItemsZeroCalories) {
      this.logger.error('[AnalyzeService] All items have zero calories - analysis needs review', {
        imageHash,
        cacheKey,
        itemCount: items.length,
        componentCount: visionComponents.length,
        items: items.map(item => ({
          name: item.name,
          portion_g: item.portion_g,
          calories: item.nutrients?.calories,
          protein: item.nutrients?.protein,
          fat: item.nutrients?.fat,
          carbs: item.nutrients?.carbs,
          source: item.source,
          fdcId: item.fdcId,
          dataType: item.dataType,
        })),
        total: {
          calories: total.calories,
          protein: total.protein,
          fat: total.fat,
          carbs: total.carbs,
        },
        visionComponents: visionComponents.slice(0, 10).map(c => ({
          name: c.name,
          preparation: c.preparation,
          est_portion_g: c.est_portion_g,
          confidence: c.confidence,
        })),
      });
      
      // Mark as needsReview if all items have zero calories
      needsReview = true;
    }

    // Log final analysis in debug mode or for first N analyses
    if (isDebugMode) {
      this.logger.log('[AnalysisDebug] Final analysis', {
        totals: total,
        items: items.map((i) => ({
          name: i.name,
          originalName: i.originalName,
          portion_g: i.portion_g,
          calories: i.nutrients.calories,
          protein: i.nutrients.protein,
          carbs: i.nutrients.carbs,
          fat: i.nutrients.fat,
        })),
      });
    }

    // Build English base dish name from items and localize it
    const originalDishName = this.buildDishNameEn(items);
    const dishNameLocalized = await this.foodLocalization.localizeName(originalDishName, locale);

    const result: AnalysisData = {
      items,
      total,
      healthScore,
      debug: isDebugMode ? debug : undefined,
      locale,
      dishNameLocalized: dishNameLocalized || originalDishName,
      originalDishName,
      isSuspicious,
      needsReview,
    };

    // Cache for 24 hours
    await this.cache.set(cacheKey, result, 'analysis');

    return result;
  }

  /**
   * Analyze text description
   */
  async analyzeText(text: string, locale?: 'en' | 'ru' | 'kk'): Promise<AnalysisData> {
    const isDebugMode = process.env.ANALYSIS_DEBUG === 'true';
    // Normalize locale
    const normalizedLocale: 'en' | 'ru' | 'kk' =
      (locale as any) || 'en';
    
    // Simple parsing: split by commas, newlines, etc.
    const components: VisionComponent[] = text
      .split(/[,;\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(name => ({
        name,
        preparation: 'unknown',
        est_portion_g: 100,
        confidence: 0.7,
      }));

    const debug: AnalysisDebug = {
      componentsRaw: components,
      components: [],
      timestamp: new Date().toISOString(),
      model: 'text-input',
    };

    const items: AnalyzedItem[] = [];

    for (const component of components) {
      try {
        const query = component.name;
        
        // Detect if component is likely a drink (same logic as image analysis)
        const componentNameLower = component.name.toLowerCase();
        const drinkKeywords = [
          'coffee', 'latte', 'cappuccino', 'espresso', 'mocha',
          'tea', 'chai', 'matcha',
          'juice', 'smoothie', 'shake',
          'soda', 'cola', 'fanta', 'sprite', 'pepsi',
          'energy drink', 'red bull',
          'water', 'sparkling water',
          'milk', 'almond milk', 'soy milk',
          'beer', 'wine', 'cocktail', 'drink', 'beverage',
          'кофе', 'чай', 'сок', 'газировка', 'напиток', 'молоко',
        ];
        const isDrinkComponent = drinkKeywords.some(keyword => componentNameLower.includes(keyword));
        const expectedCategory: 'drink' | 'solid' | 'unknown' = isDrinkComponent ? 'drink' : 'unknown';
        
        const matches = await this.hybrid.findByText(query, 5, 0.7, expectedCategory);

        if (!matches || matches.length === 0) {
          debug.components.push({ type: 'no_match', vision: component });
          await this.addVisionFallback(component, items, debug, normalizedLocale);
          continue;
        }

        const bestMatch = matches[0];
        
        if (bestMatch.score < 0.7) {
          debug.components.push({ type: 'low_score', vision: component, bestMatch, score: bestMatch.score });
          await this.addVisionFallback(component, items, debug, normalizedLocale);
          continue;
        }

        // Check text overlap (same logic as image analysis)
        const desc = (bestMatch.description || '').toLowerCase();
        const componentWords = component.name.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        let hasOverlap: boolean;
        
        if (isDrinkComponent) {
          const beverageKeywords = ['coffee', 'tea', 'juice', 'soda', 'milk', 'drink', 'beverage', 'кофе', 'чай', 'сок'];
          const hasBeverageKeyword = beverageKeywords.some(kw => 
            componentNameLower.includes(kw) && desc.includes(kw)
          );
          const overlappingWords = componentWords.filter(w => desc.includes(w));
          hasOverlap = hasBeverageKeyword || overlappingWords.length >= 2;
        } else {
          hasOverlap = componentWords.some(w => desc.includes(w));
        }
        
        if (!hasOverlap) {
          debug.components.push({ type: 'no_overlap', vision: component, bestMatch });
          await this.addVisionFallback(component, items, debug, normalizedLocale);
          continue;
        }

        const food = await this.prisma.food.findUnique({
          where: { fdcId: bestMatch.fdcId },
          include: {
            portions: true,
            nutrients: {
              include: {
                nutrient: true,
              },
            },
            label: true,
          },
        });

        if (!food) {
          debug.components.push({ type: 'no_match', vision: component, reason: 'food_not_found' });
          await this.addVisionFallback(component, items, debug, normalizedLocale);
          continue;
        }

        const normalized = await this.hybrid.getFoodNormalized(bestMatch.fdcId);
        const fdcServingSizeG = food.portions?.[0]?.gramWeight || null;
        const portionG = this.estimatePortionInGrams(component, fdcServingSizeG, debug);
        const nutrients = this.calculateNutrientsForPortion(normalized, portionG);

        const originalNameEn = normalizeFoodName(bestMatch.description || food.description || component.name);
        const localizedName = await this.foodLocalization.localizeName(originalNameEn, locale);

        const item: AnalyzedItem = {
          name: localizedName || originalNameEn,
          originalName: originalNameEn,
          label: component.name,
          portion_g: portionG,
          nutrients,
          source: 'fdc',
          fdcId: bestMatch.fdcId,
          fdcScore: bestMatch.score,
          dataType: food.dataType,
          locale: normalizedLocale,
        };

        items.push(item);
        debug.components.push({ type: 'matched', vision: component, bestMatch, score: bestMatch.score });
      } catch (error: any) {
        this.logger.error(`Error analyzing text component ${component.name}:`, error.message);
        debug.components.push({ type: 'no_match', vision: component, error: error.message });
        await this.addVisionFallback(component, items, debug, normalizedLocale);
      }
    }

    // Calculate totals
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
        acc.energyDensity += item.nutrients.energyDensity;
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

    if (total.portion_g > 0) {
      total.energyDensity = this.round((total.calories / total.portion_g) * 100, 1);
    }

    const healthScore = this.computeHealthScore(total, total.portion_g, items);

    // Q1: Run sanity check
    const sanity = this.runSanityCheck({ items, total, healthScore, debug });
    if (debug) {
      debug.sanity = sanity;
    }
    
    // Q3: Mark suspicious analyses
    const hasSeriousIssues = sanity.some(
      (i) => i.type === 'macro_kcal_mismatch' || i.type === 'suspicious_energy_density',
    );
    const isSuspicious = hasSeriousIssues;

    // Q4: Check for all-zero macros (needsReview flag)
    const allMacrosZero = total.calories === 0 && total.protein === 0 && total.carbs === 0 && total.fat === 0;
    const hasItemsButNoData = items.length > 0 && allMacrosZero;
    
    // Check for any item with weight > 0 but all macros zero
    const anyItemHasWeightAndZeroMacros = items.some(item =>
      item.portion_g > 0 &&
      item.nutrients.calories === 0 &&
      item.nutrients.protein === 0 &&
      item.nutrients.carbs === 0 &&
      item.nutrients.fat === 0
    );
    
    const needsReview = hasItemsButNoData || anyItemHasWeightAndZeroMacros;

    // Log sanity issues in debug mode
    if (process.env.ANALYSIS_DEBUG === 'true' && sanity.length > 0) {
      this.logger.warn('[AnalysisSanity] Issues detected', {
        issues: sanity,
        total: total,
      });
    }

    // Build English base dish name from original names
    const originalDishName = this.buildDishNameEn(items);
    const dishNameLocalized = await this.foodLocalization.localizeName(originalDishName, normalizedLocale);

    return {
      items,
      total,
      healthScore,
      debug: isDebugMode ? debug : undefined,
      locale: normalizedLocale,
      dishNameLocalized: dishNameLocalized || originalDishName,
      originalDishName,
      isSuspicious,
      needsReview,
    };
  }

  /**
   * Calculate nutrients for a specific portion size
   * FDC data is per 100g, so we scale by portionG / 100
   */
  private calculateNutrientsForPortion(
    normalized: any,
    portionG: number,
  ): Nutrients {
    // FDC nutrients are always per 100g
    const scale = portionG / 100;
    const base = normalized.nutrients || {};

    // Extract saturated fat from various possible fields
    const satFat = base.satFat ?? base.saturatedFat ?? base.saturated_fat ?? base.saturated ?? 0;

    // Calculate energy density (kcal per 100g)
    const energyDensity = base.calories || 0;

    // Task 2.1: Log if base calories are 0 before scaling
    const baseCalories = base.calories || 0;
    if (baseCalories === 0 && portionG > 0) {
      this.logger.warn('[AnalyzeService] Zero calories from FDC', {
        fdcId: normalized.fdcId,
        description: normalized.description,
        rawNutrients: base,
        portionG,
        baseCalories,
        hasProtein: (base.protein || 0) > 0,
        hasFat: (base.fat || 0) > 0,
        hasCarbs: (base.carbs || 0) > 0,
        dataType: normalized.dataType,
      });
    }

    let calculatedCalories = Math.round(baseCalories * scale);
    
    // Fallback: if calories is 0 but macros exist, calculate from macros
    if (!calculatedCalories && (base.protein || base.carbs || base.fat)) {
      const protein = (base.protein || 0) * scale;
      const carbs = (base.carbs || 0) * scale;
      const fat = (base.fat || 0) * scale;
      const fromMacros = protein * 4 + carbs * 4 + fat * 9;
      calculatedCalories = Math.max(1, Math.round(fromMacros));
    }

    const protein = this.round((base.protein || 0) * scale, 1);
    const carbs = this.round((base.carbs || 0) * scale, 1);
    const fat = this.round((base.fat || 0) * scale, 1);

    return {
      calories: calculatedCalories,
      protein,
      carbs,
      fat,
      fiber: this.round((base.fiber || 0) * scale, 1),
      sugars: this.round((base.sugars || 0) * scale, 1),
      satFat: this.round(satFat * scale, 1),
      energyDensity: this.round(energyDensity, 1),
    };
  }

  /**
   * Q4: Add vision fallback item when FDC match fails
   */
  private async addVisionFallback(
    component: VisionComponent,
    items: AnalyzedItem[],
    debug: AnalysisDebug,
    locale: 'en' | 'ru' | 'kk' = 'en',
  ): Promise<void> {
    // Если Vision уверен (confidence >= 0.7) и имя не слишком общее
    if (!component.confidence || component.confidence < 0.7) {
      return;
    }

    const genericNames = ['food', 'meal', 'dish', 'item', 'ingredient', 'something'];
    const isGeneric = genericNames.some((g) => component.name.toLowerCase().includes(g));
    if (isGeneric) {
      return;
    }

    const fallbackPortion = this.estimatePortionInGrams(component, null, debug);

    const fallbackNutrients: Nutrients = {
      calories: Math.round(fallbackPortion * 1.2), // условно 1.2 ккал/г — "средне"
      protein: this.round(fallbackPortion * 0.04, 1), // ~4 г белка на 100г
      carbs: this.round(fallbackPortion * 0.15, 1), // ~15 г углеводов на 100г
      fat: this.round(fallbackPortion * 0.06, 1), // ~6 г жиров на 100г
      fiber: 0,
      sugars: 0,
      satFat: 0,
      energyDensity: 120, // 120 ккал/100г
    };

        const baseName = this.buildBaseFoodName(component.name);
        const originalNameEn = normalizeFoodName(baseName);
        const localizedName = await this.foodLocalization.localizeName(originalNameEn, locale);

        const fallbackItem: AnalyzedItem & { baseName?: string; displayNameLocalized?: string } = {
          name: localizedName || originalNameEn,
          originalName: originalNameEn,
          baseName: baseName,
          displayNameLocalized: locale !== 'en' ? localizedName : undefined,
          label: component.name,
          portion_g: fallbackPortion,
          nutrients: fallbackNutrients,
          source: 'vision_fallback',
          locale,
          hasNutrition: true, // Fallback always has estimated nutrition
        };

    items.push(fallbackItem);
    debug.components = debug.components || [];
    debug.components.push({
      type: 'vision_fallback',
      vision: component,
      message: 'Added fallback item due to FDC match failure',
    });
  }

  /**
   * Q1: Run sanity check on analysis data
   * Public method for re-analysis use cases
   */
  runSanityCheck(input: {
    items: AnalyzedItem[];
    total: AnalysisTotals;
    healthScore?: HealthScore | null;
    debug?: AnalysisDebug;
  }): AnalysisSanityIssue[] {
    const { items, total } = input;
    const issues: AnalysisSanityIssue[] = [];

    items.forEach((item, index) => {
      const { portion_g, nutrients } = item;
      const { calories, protein, carbs, fat } = nutrients;

      // 1) Порция слишком маленькая или слишком большая
      if (portion_g > 0 && portion_g < 5) {
        issues.push({
          type: 'portion_too_small',
          level: 'warning',
          message: `Portion ${portion_g}g looks too small for a meal component`,
          itemIndex: index,
          itemName: item.name,
        });
      }

      if (portion_g > 0 && portion_g > 800) {
        issues.push({
          type: 'portion_too_large',
          level: 'warning',
          message: `Portion ${portion_g}g looks too large for a single component`,
          itemIndex: index,
          itemName: item.name,
        });
      }

      // 2) Калории на грамм
      if (portion_g > 0 && calories > 0) {
        const kcalPerGram = calories / portion_g;
        // Типичный диапазон ~0.2–4.5 ккал/г (очень грубо)
        if (kcalPerGram < 0.1 || kcalPerGram > 7) {
          issues.push({
            type: 'calories_per_gram_out_of_range',
            level: 'warning',
            message: `kcal/g=${kcalPerGram.toFixed(2)} is outside expected range`,
            itemIndex: index,
            itemName: item.name,
          });
        }
      }

      // 3) Связь калорий и макросов (4/4/9 правило)
      if (protein >= 0 && carbs >= 0 && fat >= 0 && calories > 0) {
        const kcalFromMacros = protein * 4 + carbs * 4 + fat * 9;
        const diff = Math.abs(kcalFromMacros - calories);

        if (diff > Math.max(50, calories * 0.25)) {
          issues.push({
            type: 'macro_kcal_mismatch',
            level: 'warning',
            message: `Calories ${calories} vs macros-derived ${Math.round(
              kcalFromMacros,
            )} differ too much`,
            itemIndex: index,
            itemName: item.name,
          });
        }
      }

      // 4) Нулевая калорийность при ненулевой порции
      if (portion_g > 0 && calories === 0) {
        issues.push({
          type: 'zero_calories_nonzero_portion',
          level: 'warning',
          message: `Portion ${portion_g}g has 0 kcal`,
          itemIndex: index,
          itemName: item.name,
        });
      }
    });

    // 5) Sanity по totals
    if (total.portion_g > 0 && total.calories > 0) {
      const kcalPerGramTotal = total.calories / total.portion_g;
      if (kcalPerGramTotal < 0.1 || kcalPerGramTotal > 7) {
        issues.push({
          type: 'suspicious_energy_density',
          level: 'warning',
          message: `Total kcal/g=${kcalPerGramTotal.toFixed(2)} looks suspicious`,
        });
      }
    }

    return issues;
  }

  /**
   * Build a clean, human-readable base food name from raw vision name and FDC description.
   * Prefers generic, non-branded descriptions when available.
   */
  private buildBaseFoodName(rawName: string, fdcDescription?: string): string {
    const desc = (fdcDescription || '').toLowerCase();
    const raw = (rawName || '').toLowerCase();

    // Prefer generic, non-branded description if it looks clean
    if (desc && !desc.includes('yogurt') && !desc.includes('yoghurt') && !desc.includes('ice cream')) {
      // Strip brand stuff like ", company name" if present
      const cleaned = desc.replace(/\s*,\s*[^,]+$/i, '').trim();
      if (cleaned.length > 0 && cleaned.length <= 60) {
        return cleaned;
      }
    }

    // Fallback to raw vision name
    return raw || desc || 'food';
  }

  /**
   * Build a concise English dish name from analyzed items (using baseName when available).
   * Picks 1-3 main items (ignoring small portions like sauces).
   * Public method for re-analysis use cases
   */
  buildDishNameEn(items: AnalyzedItem[]): string {
    // Filter out very small items (likely sauces, dressings) - threshold: < 20g
    const mainItems = items.filter(item => item.portion_g >= 20);
    const itemsToUse = mainItems.length > 0 ? mainItems : items;

    const names = itemsToUse
      .map(i => {
        // Use baseName if available (from buildBaseFoodName), otherwise originalName or name
        return (i as any).baseName || i.originalName || i.name || '';
      })
      .map(n => n.trim())
      .filter(Boolean);

    if (!names.length) return 'Meal';

    const unique = Array.from(new Set(names));
    if (unique.length === 1) return unique[0];
    if (unique.length === 2) return `${unique[0]} + ${unique[1]}`;
    // For 3+, show first two + "and more"
    return `${unique[0]} + ${unique[1]} and more`;
  }

  private hashImage(params: { imageUrl?: string; imageBase64?: string }): string {
    const str = params.imageUrl || params.imageBase64 || '';
    return crypto.createHash('sha256').update(str).digest('hex').substring(0, 16);
  }

  /**
   * Check if analysis represents a drink based on item names
   */
  private isDrinkAnalysis(items: AnalyzedItem[]): boolean {
    const drinkKeywords = [
      'coffee', 'latte', 'cappuccino', 'espresso', 'mocha',
      'tea', 'chai', 'matcha',
      'juice', 'smoothie', 'shake',
      'soda', 'cola', 'fanta', 'sprite', 'pepsi',
      'energy drink', 'red bull',
      'water', 'sparkling water',
      'milk', 'almond milk', 'soy milk',
      'beer', 'wine', 'cocktail', 'drink', 'beverage',
      'кофе', 'чай', 'сок', 'газировка', 'напиток', 'молоко',
    ];
    
    const itemNames = items.map(item => 
      (item.name || item.originalName || item.label || '').toLowerCase()
    ).join(' ');
    
    return drinkKeywords.some(keyword => itemNames.includes(keyword));
  }

  /**
   * Compute health score from totals and items
   * Public method for re-analysis use cases
   */
  computeHealthScore(total: AnalysisTotals, totalPortion: number, items?: AnalyzedItem[]): HealthScore {
    const weights = this.getHealthWeights();
    const portionWeight = totalPortion || 250; // fallback 250g meal
    const isDrink = items ? this.isDrinkAnalysis(items) : false;
    
    const proteinScore = this.positiveScore(total.protein, 30);
    const fiberScore = this.positiveScore(total.fiber || 0, 10);
    
    // Task 2: Fallback estimates when specific data is missing but parent macro exists
    // Use fallback only when satFat is 0 or missing but fat > 0
    const estimatedSatFat = total.satFat > 0 
      ? total.satFat 
      : (total.fat > 0 ? total.fat * 0.35 : 0); // ~35% of fat is typically saturated
      
    // Use fallback only when sugars is 0 or missing but carbs > 0
    const estimatedSugars = total.sugars > 0 
      ? total.sugars 
      : (total.carbs > 0 ? total.carbs * 0.1 : 0); // ~10% of carbs as sugars fallback
    
    // For drinks, use stricter thresholds for sugar
    const sugarThreshold = isDrink ? 10 : 15;
    const satFatThreshold = isDrink ? 5 : 8;
    
    const satFatScore = this.negativeScore(estimatedSatFat, satFatThreshold);
    const sugarScore = this.negativeScore(estimatedSugars, sugarThreshold);
    
    // For drinks, use volume-based energy density (ml instead of grams)
    // Default drink volume: 250ml for coffee/tea, 330ml for soda
    const effectivePortion = isDrink ? (portionWeight || 250) : portionWeight;
    const energyDensity = effectivePortion ? total.calories / effectivePortion : total.calories / 250;
    const energyDensityThreshold = isDrink ? 2 : 4; // Drinks should have lower energy density
    const energyDensityScore = this.negativeScore(energyDensity, energyDensityThreshold);

    const factorMap = {
      protein: { label: 'Protein', score: proteinScore, weight: weights.protein },
      fiber: { label: 'Fiber', score: fiberScore, weight: weights.fiber },
      satFat: { label: 'Saturated fat', score: satFatScore, weight: weights.satFat },
      sugar: { label: 'Sugar', score: sugarScore, weight: weights.sugar },
      energyDensity: { label: 'Energy density', score: energyDensityScore, weight: weights.energyDensity },
    } as const;

    const totalWeight = Object.values(weights).reduce((acc: number, weight: number) => acc + weight, 0) || 1;
    const factorEntries = Object.values(factorMap) as Array<{ label: string; score: number; weight: number }>;
    const weightedScore = factorEntries.reduce((acc: number, factor) => acc + factor.score * (factor.weight || 0), 0) /
      totalWeight;
    let score = Math.round(Math.max(0, Math.min(100, weightedScore)));
    let grade = this.deriveGrade(score);

    // UX-oriented heuristics: protect obviously "okay" foods from getting unfairly low scores
    // These are UX overrides, not strict nutrition science

    // Heuristic A: Very light & "clean" foods (small fruits, plain vegetables, clear soups)
    // Condition: low calories, low sugar, low sat fat, reasonable energy density
    if (
      total.calories <= 80 &&
      sugarScore >= 80 &&
      satFatScore >= 80 &&
      energyDensityScore >= 80
    ) {
      score = Math.max(score, 80);
      grade = this.deriveGrade(score);
      if (process.env.ANALYSIS_DEBUG === 'true') {
        this.logger.debug('[HealthScore] Applied Heuristic A (light clean food)', {
          originalScore: weightedScore,
          adjustedScore: score,
          calories: total.calories,
        });
      }
    }

    // Heuristic B: Plain coffee/tea (very low calories, minimal sugar/fat)
    // Condition: drink analysis, very low calories, minimal sugar and sat fat
    if (
      isDrink &&
      total.calories <= 30 &&
      total.sugars <= 3 &&
      total.satFat <= 1
    ) {
      score = Math.max(score, 85);
      grade = this.deriveGrade(score);
      if (process.env.ANALYSIS_DEBUG === 'true') {
        this.logger.debug('[HealthScore] Applied Heuristic B (plain coffee/tea)', {
          originalScore: weightedScore,
          adjustedScore: score,
          calories: total.calories,
          sugars: total.sugars,
          satFat: total.satFat,
        });
      }
    }

    const feedbackObjects = this.buildFeedback(factorMap);

    return {
      score,
      grade,
      factors: factorMap,
      // Expose only human-readable messages; internal structure is kept in debug if needed
      feedback: feedbackObjects.map((f) => f.message),
    };
  }

  private getHealthWeights(): HealthWeights {
    const fallback: HealthWeights = {
      protein: 0.25,
      fiber: 0.2,
      satFat: 0.2,
      sugar: 0.2,
      energyDensity: 0.15,
    };
    try {
      const parsed = JSON.parse(process.env.HEALTH_SCORE_WEIGHTS || '{}') as Partial<HealthWeights>;
      return { ...fallback, ...parsed };
    } catch (error) {
      return fallback;
    }
  }

  private positiveScore(value: number, target: number) {
    if (target <= 0) return 0;
    const ratio = Math.min(1.5, value / target);
    return Math.max(0, Math.min(100, Math.round(ratio * 100)));
  }

  private negativeScore(value: number, threshold: number) {
    if (threshold <= 0) return 100;
    if (value <= threshold) {
      return 100;
    }
    const ratio = Math.min(2, (value - threshold) / threshold);
    return Math.max(0, Math.round(100 - ratio * 100));
  }

  private deriveGrade(score: number) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private buildFeedback(
    factors: Record<string, { label: string; score: number; weight: number }>,
  ): Array<{ key: string; label: string; action: 'celebrate' | 'increase' | 'reduce' | 'monitor'; message: string }> {
    const entries: Array<{ key: string; label: string; action: 'celebrate' | 'increase' | 'reduce' | 'monitor'; message: string }> = [];
    const penaltyKeys = ['satFat', 'sugar', 'energyDensity'];

    Object.entries(factors).forEach(([key, factor]) => {
      const label = factor.label || key;
      const labelLower = label.toLowerCase();

      if (penaltyKeys.includes(key)) {
        if (factor.score < 70) {
          entries.push({
            key,
            label,
            action: 'reduce',
            message: `Reduce ${labelLower} to improve overall score.`,
          });
        } else if (factor.score < 85) {
          entries.push({
            key,
            label,
            action: 'monitor',
            message: `Keep an eye on ${labelLower} to stay on track.`,
          });
        }
      } else if (factor.score < 70) {
        entries.push({
          key,
          label,
          action: 'increase',
          message: `Increase ${labelLower} to improve overall score.`,
        });
      }
    });

    if (entries.length === 0) {
      entries.push({
        key: 'overall',
        label: 'Overall balance',
        action: 'celebrate',
        message: 'Great job! This meal looks well balanced.',
      });
    }

    return entries;
  }
}


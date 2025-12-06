import { Injectable, Logger } from '@nestjs/common';
import {
  INutritionProvider,
  NutritionProviderId,
  NutritionLookupContext,
  NutritionProviderResult,
} from './nutrition-provider.interface';

/**
 * FAO/WHO Nutrient Reference Values Provider (scaffold)
 * 
 * This provider is NOT for food composition data, but for reference intake values
 * (recommended daily allowances, upper limits, etc.) by age, gender, and life stage.
 * 
 * These values can be used to:
 * - Improve HealthScore calculation (compare user intake vs. recommendations)
 * - Provide personalized nutrition advice
 * - Generate reports with context (e.g., "You're getting 120% of recommended protein")
 * 
 * Data sources:
 * - FAO/WHO Human Vitamin and Mineral Requirements (PDF in repo)
 * - Codex Alimentarius nutrient reference values
 * - National dietary guidelines (USDA, EFSA, etc.)
 * 
 * TODO: Implement when:
 * - Need for personalized recommendations is prioritized
 * - PDF parsing or structured data source is available
 * - Integration with user profile (age, gender, activity level) is ready
 */
@Injectable()
export class FaoWhoReferenceProvider implements INutritionProvider {
  readonly id: NutritionProviderId = 'fao_who_ref';
  private readonly logger = new Logger(FaoWhoReferenceProvider.name);

  async isAvailable(_context: NutritionLookupContext): Promise<boolean> {
    // This provider is for reference values, not food composition
    // It should NOT be used in the nutrition lookup flow
    return false;
  }

  getPriority(_context: NutritionLookupContext): number {
    return 0; // Should not be used in normal lookup
  }

  async findByText(
    _query: string,
    _context: NutritionLookupContext,
  ): Promise<NutritionProviderResult | null> {
    // This provider is NOT for food lookup
    // It's for reference intake values (RDA, UL, etc.)
    // Should be used separately, e.g., in HealthScore calculation or reporting
    this.logger.warn(
      '[FaoWhoReferenceProvider] findByText called - this provider is for reference values, not food lookup',
    );
    return null;
  }

  async getByBarcode(
    _barcode: string,
    _context: NutritionLookupContext,
  ): Promise<NutritionProviderResult | null> {
    return null;
  }

  /**
   * Get recommended daily intake for a nutrient
   * 
   * TODO: Implement when reference data is available
   * 
   * @param nutrient - Nutrient name (e.g., 'protein', 'vitamin_c', 'calcium')
   * @param age - Age in years
   * @param gender - 'male' | 'female' | 'pregnant' | 'lactating'
   * @param lifeStage - Optional life stage (e.g., 'infant', 'child', 'adult', 'elderly')
   * @returns Recommended daily intake in appropriate units (g, mg, mcg, etc.)
   */
  async getRecommendedIntake(
    nutrient: string,
    age: number,
    gender: string,
    lifeStage?: string,
  ): Promise<number | null> {
    // TODO: Parse FAO/WHO PDF or use structured data source
    // Return recommended daily intake for the given nutrient
    this.logger.debug(
      `[FaoWhoReferenceProvider] getRecommendedIntake not implemented: nutrient=${nutrient}, age=${age}, gender=${gender}`,
    );
    return null;
  }

  /**
   * Get upper limit (UL) for a nutrient
   * 
   * TODO: Implement when reference data is available
   */
  async getUpperLimit(
    nutrient: string,
    age: number,
    gender: string,
  ): Promise<number | null> {
    // TODO: Return upper safe limit for nutrient
    return null;
  }
}


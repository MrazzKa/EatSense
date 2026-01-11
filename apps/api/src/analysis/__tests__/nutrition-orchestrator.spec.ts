/**
 * Unit tests for NutritionOrchestrator
 * STEP 7: Tests for category-based filtering and oil validation
 */

import { NutritionOrchestrator } from '../providers/nutrition-orchestrator.service';
import { NutritionLookupContext, NutritionProviderResult } from '../providers/nutrition-provider.interface';

// Mock the dependencies
const mockCacheService = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
};

const mockLocalFoodService = {
  findByName: jest.fn().mockResolvedValue(null),
};

const mockPrismaService = {
  localFood: {
    findFirst: jest.fn().mockResolvedValue(null),
  },
};

describe('NutritionOrchestrator', () => {
  let orchestrator: NutritionOrchestrator;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create orchestrator with mocked dependencies
    orchestrator = new NutritionOrchestrator(
      mockCacheService as any,
      mockLocalFoodService as any,
      mockPrismaService as any,
      [], // providers array - we'll test individual methods directly
    );
  });

  describe('validateResult - category mismatch filtering', () => {
    it('should reject oil match for vegetable query', () => {
      const oilResult: NutritionProviderResult = {
        food: {
          providerId: 'usda',
          providerFoodId: '12345',
          displayName: 'Oil, corn',
          originalQuery: 'corn cooked',
          category: 'solid',
          per100g: {
            calories: 884,
            protein: 0,
            carbs: 0,
            fat: 100,
          },
        },
        confidence: 0.8,
      };

      const context: NutritionLookupContext = {
        locale: 'en',
        categoryHint: 'veg',
        originalQuery: 'corn cooked',
        mode: 'ingredient',
      };

      // Access private method through reflection for testing
      const validateResult = (orchestrator as any).validateResult.bind(orchestrator);
      const result = validateResult(oilResult, context);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('category_mismatch');
    });

    it('should accept oil match when query contains oil', () => {
      const oilResult: NutritionProviderResult = {
        food: {
          providerId: 'usda',
          providerFoodId: '12345',
          displayName: 'Olive oil',
          originalQuery: 'olive oil',
          category: 'solid',
          per100g: {
            calories: 884,
            protein: 0,
            carbs: 0,
            fat: 100,
          },
        },
        confidence: 0.9,
      };

      const context: NutritionLookupContext = {
        locale: 'en',
        categoryHint: 'fat',
        originalQuery: 'olive oil',
        mode: 'ingredient',
      };

      const validateResult = (orchestrator as any).validateResult.bind(orchestrator);
      const result = validateResult(oilResult, context);

      expect(result.isValid).toBe(true);
    });

    it('should reject meal match for vegetable query', () => {
      const mealResult: NutritionProviderResult = {
        food: {
          providerId: 'usda',
          providerFoodId: '67890',
          displayName: 'Beef and broccoli frozen meal',
          originalQuery: 'broccoli',
          category: 'solid',
          per100g: {
            calories: 120,
            protein: 8,
            carbs: 10,
            fat: 5,
          },
        },
        confidence: 0.7,
      };

      const context: NutritionLookupContext = {
        locale: 'en',
        categoryHint: 'veg',
        originalQuery: 'broccoli',
        mode: 'ingredient',
      };

      const validateResult = (orchestrator as any).validateResult.bind(orchestrator);
      const result = validateResult(mealResult, context);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('category_mismatch');
    });
  });

  describe('validateProductSpecificCalories - oil validation', () => {
    it('should reject oil with invalid calories (too low)', () => {
      const validateProductSpecificCalories = (orchestrator as any).validateProductSpecificCalories.bind(orchestrator);
      
      const result = validateProductSpecificCalories('olive oil', 50);
      
      expect(result).not.toBeNull();
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('oil_fat_kcal_invalid');
    });

    it('should accept oil with valid calories (800-900)', () => {
      const validateProductSpecificCalories = (orchestrator as any).validateProductSpecificCalories.bind(orchestrator);
      
      const result = validateProductSpecificCalories('olive oil', 884);
      
      // Valid oil should return null (no specific validation issue)
      expect(result).toBeNull();
    });

    it('should reject butter with invalid calories (too low)', () => {
      const validateProductSpecificCalories = (orchestrator as any).validateProductSpecificCalories.bind(orchestrator);
      
      const result = validateProductSpecificCalories('сливочное масло', 100);
      
      expect(result).not.toBeNull();
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('oil_fat_kcal_invalid');
    });

    it('should accept butter with valid calories (717)', () => {
      const validateProductSpecificCalories = (orchestrator as any).validateProductSpecificCalories.bind(orchestrator);
      
      const result = validateProductSpecificCalories('butter', 717);
      
      expect(result).toBeNull();
    });
  });

  describe('validateProductSpecificCalories - corn validation', () => {
    it('should mark cooked corn with oil-range calories as suspicious', () => {
      const validateProductSpecificCalories = (orchestrator as any).validateProductSpecificCalories.bind(orchestrator);
      
      // Corn should be 86-100 kcal/100g when cooked, not 884 (oil)
      const result = validateProductSpecificCalories('corn cooked', 884);
      
      // Oil check should catch this first
      expect(result).not.toBeNull();
    });

    it('should accept cooked corn with valid calories', () => {
      const validateProductSpecificCalories = (orchestrator as any).validateProductSpecificCalories.bind(orchestrator);
      
      const result = validateProductSpecificCalories('corn cooked', 96);
      
      expect(result).toBeNull();
    });
  });

  describe('validateProductSpecificCalories - vegetable validation', () => {
    it('should flag spinach with unrealistic calories', () => {
      const validateProductSpecificCalories = (orchestrator as any).validateProductSpecificCalories.bind(orchestrator);
      
      const result = validateProductSpecificCalories('spinach', 5);
      
      expect(result).not.toBeNull();
      expect(result.isSuspicious).toBe(true);
    });

    it('should accept spinach with valid calories (23)', () => {
      const validateProductSpecificCalories = (orchestrator as any).validateProductSpecificCalories.bind(orchestrator);
      
      const result = validateProductSpecificCalories('шпинат', 23);
      
      expect(result).toBeNull();
    });
  });
});

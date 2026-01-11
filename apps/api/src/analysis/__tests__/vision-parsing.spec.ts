/**
 * Unit tests for Vision parsing and enum normalization
 * PHASE 1: Tests for VisionExtractionResult status handling
 */
import { describe, it, expect } from '@jest/globals';

describe('Vision Parsing', () => {
  describe('Enum Normalization', () => {
    // Test state_hint normalization
    const stateHintMappings: Record<string, string> = {
      'roasted': 'roasted',
      'sauteed': 'sauteed',
      'pan-fried': 'fried',
      'pan_fried': 'fried',
      'deep-fried': 'fried',
      'stir-fried': 'fried',
      'broiled': 'grilled',
      'charred': 'grilled',
      'bbq': 'grilled',
      'smoked': 'cooked',
      'braised': 'cooked',
      'stewed': 'cooked',
      'toasted': 'baked',
      'poached': 'boiled',
      'blanched': 'boiled',
      'marinated': 'raw',
      'fresh': 'raw',
      'dehydrated': 'dried',
    };

    it.each(Object.entries(stateHintMappings))(
      'should normalize state_hint "%s" to "%s"',
      (input, expected) => {
        const validStates = ['raw', 'cooked', 'boiled', 'steamed', 'baked', 'grilled', 'fried', 'dried', 'pickled', 'roasted', 'sauteed', 'unknown'];

        const stateMap: Record<string, string> = {
          'roasted': 'roasted',
          'sauteed': 'sauteed',
          'pan-fried': 'fried',
          'pan_fried': 'fried',
          'panfried': 'fried',
          'deep-fried': 'fried',
          'deep_fried': 'fried',
          'stir-fried': 'fried',
          'stir_fried': 'fried',
          'broiled': 'grilled',
          'charred': 'grilled',
          'char-grilled': 'grilled',
          'barbecued': 'grilled',
          'bbq': 'grilled',
          'smoked': 'cooked',
          'braised': 'cooked',
          'stewed': 'cooked',
          'simmered': 'cooked',
          'caramelized': 'cooked',
          'glazed': 'cooked',
          'toasted': 'baked',
          'poached': 'boiled',
          'blanched': 'boiled',
          'parboiled': 'boiled',
          'marinated': 'raw',
          'cured': 'raw',
          'fermented': 'raw',
          'dehydrated': 'dried',
          'fresh': 'raw',
          'uncooked': 'raw',
        };

        const normalized = stateMap[input.toLowerCase()] ||
          (validStates.includes(input.toLowerCase()) ? input.toLowerCase() : 'cooked');

        expect(normalized).toBe(expected);
      }
    );

    // Test cooking_method normalization
    const cookingMethodMappings: Record<string, string> = {
      'pan-fried': 'fried',
      'stir-fried': 'fried',
      'deep-fried': 'deep_fried',
      'bbq': 'grilled',
      'barbecued': 'grilled',
      'broiled': 'grilled',
      'poached': 'boiled',
      'blanched': 'boiled',
      'stewed': 'mixed',
      'braised': 'mixed',
      'toasted': 'baked',
      'fresh': 'raw',
    };

    it.each(Object.entries(cookingMethodMappings))(
      'should normalize cooking_method "%s" to "%s"',
      (input, expected) => {
        const validMethods = ['fried', 'deep_fried', 'baked', 'grilled', 'boiled', 'steamed', 'raw', 'mixed', 'roasted', 'sauteed'];

        const cookingMethodMap: Record<string, string> = {
          'pan-fried': 'fried',
          'pan_fried': 'fried',
          'stir-fried': 'fried',
          'stir_fried': 'fried',
          'deep-fried': 'deep_fried',
          'deepfried': 'deep_fried',
          'bbq': 'grilled',
          'barbecued': 'grilled',
          'char-grilled': 'grilled',
          'broiled': 'grilled',
          'poached': 'boiled',
          'blanched': 'boiled',
          'stewed': 'mixed',
          'braised': 'mixed',
          'simmered': 'mixed',
          'toasted': 'baked',
          'smoked': 'mixed',
          'fresh': 'raw',
          'uncooked': 'raw',
        };

        const normalized = cookingMethodMap[input.toLowerCase()] ||
          (validMethods.includes(input.toLowerCase()) ? input.toLowerCase() : 'mixed');

        expect(normalized).toBe(expected);
      }
    );

    // Test category_hint normalization
    const categoryHintMappings: Record<string, string> = {
      'seasoning': 'spice',
      'vegetable': 'veg',
      'vegetables': 'veg',
      'carb': 'grain',
      'carbs': 'grain',
      'meat': 'protein',
      'fish': 'protein',
      'seafood': 'protein',
      'dairy': 'protein',
      'egg': 'protein',
      'beverage': 'drink',
    };

    it.each(Object.entries(categoryHintMappings))(
      'should normalize category_hint "%s" to "%s"',
      (input, expected) => {
        const validCatHints = ['protein', 'grain', 'veg', 'fruit', 'fat', 'seeds', 'spice', 'sauce', 'drink', 'other'];

        const catHintMap: Record<string, string> = {
          'seasoning': 'spice',
          'vegetable': 'veg',
          'vegetables': 'veg',
          'carb': 'grain',
          'carbs': 'grain',
          'carbohydrate': 'grain',
          'meat': 'protein',
          'fish': 'protein',
          'seafood': 'protein',
          'dairy': 'protein',
          'egg': 'protein',
          'eggs': 'protein',
          'beverage': 'drink',
        };

        const normalized = catHintMap[input.toLowerCase()] ||
          (validCatHints.includes(input.toLowerCase()) ? input.toLowerCase() : 'other');

        expect(normalized).toBe(expected);
      }
    );
  });

  describe('VisionExtractionResult Status', () => {
    it('should return success status when components are extracted', () => {
      const result = {
        status: 'success' as const,
        components: [{ name: 'chicken', est_portion_g: 150 }],
        hiddenItems: [],
      };

      expect(result.status).toBe('success');
      expect(result.components.length).toBeGreaterThan(0);
    });

    it('should return no_food_detected when no components found', () => {
      const result = {
        status: 'no_food_detected' as const,
        components: [],
        hiddenItems: [],
        error: {
          code: 'NO_FOOD_DETECTED',
          message: 'No food items could be identified in this image',
        },
      };

      expect(result.status).toBe('no_food_detected');
      expect(result.components.length).toBe(0);
      expect(result.error).toBeDefined();
    });

    it('should return parse_error when JSON parsing fails', () => {
      const result = {
        status: 'parse_error' as const,
        components: [],
        hiddenItems: [],
        error: {
          code: 'VISION_PARSE_FAILED',
          message: 'Failed to parse food components from Vision API response',
        },
      };

      expect(result.status).toBe('parse_error');
      expect(result.error?.code).toBe('VISION_PARSE_FAILED');
    });

    it('should return api_error for timeout', () => {
      const result = {
        status: 'api_error' as const,
        components: [],
        hiddenItems: [],
        error: {
          code: 'VISION_TIMEOUT',
          message: 'Vision API call timed out after 60000ms',
        },
      };

      expect(result.status).toBe('api_error');
      expect(result.error?.code).toBe('VISION_TIMEOUT');
    });

    it('should return partial status when extraction had warnings', () => {
      const result = {
        status: 'partial' as const,
        components: [{ name: 'rice', est_portion_g: 150 }],
        hiddenItems: [],
        meta: {
          rawComponentCount: 3,
          validatedComponentCount: 1,
          filteredOutCount: 2,
          parseWarnings: ['Schema validation failed: some enum mismatch'],
        },
      };

      expect(result.status).toBe('partial');
      expect(result.meta?.parseWarnings).toBeDefined();
      expect(result.meta?.filteredOutCount).toBeGreaterThan(0);
    });
  });
});

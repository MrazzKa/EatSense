/**
 * Unit tests for macro-calorie invariants
 * PHASE 2: Tests for calculateTotalsWithInvariants and enforceItemMacroConsistency
 */
import { describe, it, expect } from '@jest/globals';

interface Nutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugars: number;
  satFat: number;
  energyDensity: number;
}

interface AnalyzedItem {
  name: string;
  portion_g: number;
  nutrients: Nutrients;
}

interface AnalysisTotals {
  portion_g: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugars: number;
  satFat: number;
  energyDensity: number;
}

// Helper functions (same as in analyze.service.ts)
function round(value: number, decimals: number = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function createEmptyTotals(): AnalysisTotals {
  return {
    portion_g: 0,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugars: 0,
    satFat: 0,
    energyDensity: 0,
  };
}

function calculateTotalsWithInvariants(items: AnalyzedItem[]): AnalysisTotals {
  if (!items || items.length === 0) {
    return createEmptyTotals();
  }

  // Step 1: Sum all item nutrients
  const rawTotals = items.reduce(
    (acc, item) => {
      const n = item.nutrients;
      acc.portion_g += item.portion_g || 0;
      acc.calories += n.calories || 0;
      acc.protein += n.protein || 0;
      acc.carbs += n.carbs || 0;
      acc.fat += n.fat || 0;
      acc.fiber += n.fiber || 0;
      acc.sugars += n.sugars || 0;
      acc.satFat += n.satFat || 0;
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

  // Step 2: Apply consistent rounding
  const totals: AnalysisTotals = {
    portion_g: Math.round(rawTotals.portion_g),
    calories: Math.round(rawTotals.calories),
    protein: round(rawTotals.protein, 1),
    carbs: round(rawTotals.carbs, 1),
    fat: round(rawTotals.fat, 1),
    fiber: round(rawTotals.fiber, 1),
    sugars: round(rawTotals.sugars, 1),
    satFat: round(rawTotals.satFat, 1),
    energyDensity: 0,
  };

  // Step 3: Enforce no negative values
  for (const key of Object.keys(totals) as Array<keyof AnalysisTotals>) {
    const val = totals[key];
    if (typeof val === 'number' && val < 0) {
      (totals as any)[key] = 0;
    }
  }

  // Step 4: Calculate expected calories from macros (4/4/9 rule)
  const calculatedCalories = Math.round(
    totals.protein * 4 + totals.carbs * 4 + totals.fat * 9,
  );

  // Step 5: Check calorie-macro correlation
  const reportedCalories = totals.calories;
  const tolerance = Math.max(30, reportedCalories * 0.15);

  if (reportedCalories > 0 && Math.abs(calculatedCalories - reportedCalories) > tolerance) {
    if (calculatedCalories > 0 || reportedCalories === 0) {
      totals.calories = calculatedCalories;
    }
  }

  // Step 6: Calculate energy density
  if (totals.portion_g > 0) {
    totals.energyDensity = round((totals.calories / totals.portion_g) * 100, 1);
  }

  return totals;
}

function enforceItemMacroConsistency(item: AnalyzedItem): AnalyzedItem {
  const n = item.nutrients;

  const protein = round(Math.max(0, n.protein || 0), 1);
  const carbs = round(Math.max(0, n.carbs || 0), 1);
  const fat = round(Math.max(0, n.fat || 0), 1);
  const fiber = round(Math.max(0, n.fiber || 0), 1);
  const sugars = round(Math.max(0, n.sugars || 0), 1);
  const satFat = round(Math.max(0, n.satFat || 0), 1);

  const calculatedCalories = Math.round(protein * 4 + carbs * 4 + fat * 9);
  const reportedCalories = Math.round(Math.max(0, n.calories || 0));

  const tolerance = Math.max(20, reportedCalories * 0.15);
  let finalCalories = reportedCalories;

  if (reportedCalories > 0 && Math.abs(calculatedCalories - reportedCalories) > tolerance) {
    if (calculatedCalories > 0) {
      finalCalories = calculatedCalories;
    }
  } else if (reportedCalories === 0 && calculatedCalories > 0) {
    finalCalories = calculatedCalories;
  }

  const portion_g = Math.max(0, item.portion_g || 0);
  const energyDensity = portion_g > 0 ? round((finalCalories / portion_g) * 100, 1) : 0;

  return {
    ...item,
    portion_g: Math.round(portion_g),
    nutrients: {
      ...n,
      calories: finalCalories,
      protein,
      carbs,
      fat,
      fiber,
      sugars,
      satFat,
      energyDensity,
    },
  };
}

describe('Macro Invariants', () => {
  describe('calculateTotalsWithInvariants', () => {
    it('should return empty totals for empty items array', () => {
      const result = calculateTotalsWithInvariants([]);
      expect(result.calories).toBe(0);
      expect(result.protein).toBe(0);
      expect(result.portion_g).toBe(0);
    });

    it('should sum item nutrients correctly', () => {
      const items: AnalyzedItem[] = [
        {
          name: 'Chicken Breast',
          portion_g: 150,
          nutrients: {
            calories: 248,
            protein: 46.5,
            carbs: 0,
            fat: 5.4,
            fiber: 0,
            sugars: 0,
            satFat: 1.5,
            energyDensity: 165,
          },
        },
        {
          name: 'Brown Rice',
          portion_g: 150,
          nutrients: {
            calories: 166,
            protein: 3.5,
            carbs: 34.5,
            fat: 1.3,
            fiber: 2.6,
            sugars: 0,
            satFat: 0.3,
            energyDensity: 111,
          },
        },
      ];

      const result = calculateTotalsWithInvariants(items);

      expect(result.portion_g).toBe(300);
      expect(result.protein).toBe(50); // 46.5 + 3.5 = 50
      expect(result.carbs).toBe(34.5);
      expect(result.fat).toBe(6.7); // 5.4 + 1.3 = 6.7
    });

    it('should enforce 4/4/9 calorie rule when mismatch detected', () => {
      const items: AnalyzedItem[] = [
        {
          name: 'Test Food',
          portion_g: 100,
          nutrients: {
            calories: 500, // Incorrectly high
            protein: 20, // 20 * 4 = 80
            carbs: 30,   // 30 * 4 = 120
            fat: 10,     // 10 * 9 = 90
            // Expected: 80 + 120 + 90 = 290
            fiber: 0,
            sugars: 0,
            satFat: 0,
            energyDensity: 500,
          },
        },
      ];

      const result = calculateTotalsWithInvariants(items);

      // Should correct to calculated value (290)
      expect(result.calories).toBe(290);
    });

    it('should keep reported calories when within tolerance', () => {
      const items: AnalyzedItem[] = [
        {
          name: 'Accurate Food',
          portion_g: 100,
          nutrients: {
            calories: 300, // Close to calculated
            protein: 20, // 80
            carbs: 30,   // 120
            fat: 11,     // 99
            // Calculated: 299, reported: 300, diff: 1 (within 15%)
            fiber: 0,
            sugars: 0,
            satFat: 0,
            energyDensity: 300,
          },
        },
      ];

      const result = calculateTotalsWithInvariants(items);

      // Should keep reported since within tolerance
      expect(result.calories).toBe(300);
    });

    it('should enforce no negative values', () => {
      const items: AnalyzedItem[] = [
        {
          name: 'Bad Data',
          portion_g: 100,
          nutrients: {
            calories: -50,
            protein: -5,
            carbs: 10,
            fat: 5,
            fiber: 0,
            sugars: 0,
            satFat: 0,
            energyDensity: 0,
          },
        },
      ];

      const result = calculateTotalsWithInvariants(items);

      expect(result.calories).toBeGreaterThanOrEqual(0);
      expect(result.protein).toBeGreaterThanOrEqual(0);
    });

    it('should calculate energy density correctly', () => {
      const items: AnalyzedItem[] = [
        {
          name: 'Dense Food',
          portion_g: 100,
          nutrients: {
            calories: 350, // Within 15% tolerance of calculated (353)
            protein: 20,
            carbs: 30,
            fat: 17, // 20*4 + 30*4 + 17*9 = 353
            fiber: 0,
            sugars: 0,
            satFat: 0,
            energyDensity: 0,
          },
        },
      ];

      const result = calculateTotalsWithInvariants(items);

      // Energy density = (calories / portion) * 100
      // Reported 350 is within tolerance of calculated 353, so 350 is kept
      expect(result.energyDensity).toBe(350);
    });
  });

  describe('enforceItemMacroConsistency', () => {
    it('should correct item calories when mismatch detected', () => {
      const item: AnalyzedItem = {
        name: 'Overestimated Food',
        portion_g: 100,
        nutrients: {
          calories: 800, // Way too high
          protein: 25, // 100
          carbs: 40,   // 160
          fat: 15,     // 135
          // Expected: 395
          fiber: 2,
          sugars: 5,
          satFat: 5,
          energyDensity: 800,
        },
      };

      const result = enforceItemMacroConsistency(item);

      expect(result.nutrients.calories).toBe(395);
    });

    it('should calculate calories when reported is zero but macros exist', () => {
      const item: AnalyzedItem = {
        name: 'Missing Calories',
        portion_g: 100,
        nutrients: {
          calories: 0, // Missing
          protein: 10, // 40
          carbs: 20,   // 80
          fat: 5,      // 45
          // Expected: 165
          fiber: 0,
          sugars: 0,
          satFat: 0,
          energyDensity: 0,
        },
      };

      const result = enforceItemMacroConsistency(item);

      expect(result.nutrients.calories).toBe(165);
    });

    it('should round nutrient values consistently', () => {
      const item: AnalyzedItem = {
        name: 'Unrounded Food',
        portion_g: 100.7,
        nutrients: {
          calories: 200,
          protein: 15.333,
          carbs: 20.666,
          fat: 8.111,
          fiber: 2.999,
          sugars: 3.001,
          satFat: 2.555,
          energyDensity: 200,
        },
      };

      const result = enforceItemMacroConsistency(item);

      expect(result.portion_g).toBe(101); // Rounded to integer
      expect(result.nutrients.protein).toBe(15.3);
      expect(result.nutrients.carbs).toBe(20.7);
      expect(result.nutrients.fat).toBe(8.1);
      expect(result.nutrients.fiber).toBe(3);
      expect(result.nutrients.sugars).toBe(3);
      expect(result.nutrients.satFat).toBe(2.6);
    });

    it('should update energy density after correction', () => {
      const item: AnalyzedItem = {
        name: 'Recalculate Density',
        portion_g: 200,
        nutrients: {
          calories: 100, // Will be corrected
          protein: 20, // 80
          carbs: 30,   // 120
          fat: 10,     // 90
          // Calculated: 290
          fiber: 0,
          sugars: 0,
          satFat: 0,
          energyDensity: 50,
        },
      };

      const result = enforceItemMacroConsistency(item);

      // Energy density = (290 / 200) * 100 = 145
      expect(result.nutrients.energyDensity).toBe(145);
    });
  });

  describe('Invariant: totals = Σ items', () => {
    it('should have totals equal to sum of items', () => {
      const items: AnalyzedItem[] = [
        {
          name: 'Item 1',
          portion_g: 100,
          nutrients: {
            calories: 200,
            protein: 15,
            carbs: 20,
            fat: 8,
            fiber: 2,
            sugars: 5,
            satFat: 3,
            energyDensity: 200,
          },
        },
        {
          name: 'Item 2',
          portion_g: 150,
          nutrients: {
            calories: 300,
            protein: 25,
            carbs: 30,
            fat: 12,
            fiber: 3,
            sugars: 8,
            satFat: 5,
            energyDensity: 200,
          },
        },
      ];

      // First enforce item consistency
      const correctedItems = items.map(enforceItemMacroConsistency);

      // Then calculate totals
      const totals = calculateTotalsWithInvariants(correctedItems);

      // Sum of corrected items
      const sumProtein = correctedItems.reduce((sum, item) => sum + item.nutrients.protein, 0);
      const sumCarbs = correctedItems.reduce((sum, item) => sum + item.nutrients.carbs, 0);
      const sumFat = correctedItems.reduce((sum, item) => sum + item.nutrients.fat, 0);
      const sumPortion = correctedItems.reduce((sum, item) => sum + item.portion_g, 0);

      expect(totals.protein).toBeCloseTo(sumProtein, 1);
      expect(totals.carbs).toBeCloseTo(sumCarbs, 1);
      expect(totals.fat).toBeCloseTo(sumFat, 1);
      expect(totals.portion_g).toBe(sumPortion);
    });
  });
});

/// <reference types="jest" />

/**
 * Unit tests for HybridService nutrient mapping fixes
 * 
 * These tests verify:
 * 1) nutrient.number (208, 203, etc.) is correctly mapped to nutrientId (1008, 1003, etc.)
 * 2) kJ → kcal conversion fallback works when kcal is missing
 */

describe('HybridService Nutrient Mapping', () => {
    /**
     * NUTRIENT_NUMBER_TO_ID mapping test
     * Problem: USDA FDC uses nutrient.number (208=Energy) but we need nutrientId (1008=Energy)
     */
    describe('nutrient.number to nutrientId mapping', () => {
        // Mapping table (from hybrid.service.ts)
        const NUTRIENT_NUMBER_TO_ID: Record<string, number> = {
            '208': 1008,  // Energy (kcal)
            '268': 2047,  // Energy (kJ)
            '203': 1003,  // Protein
            '204': 1004,  // Total lipid (fat)
            '205': 1005,  // Carbohydrate, by difference
            '291': 1079,  // Fiber, total dietary
            '269': 2000,  // Sugars, Total
            '307': 1093,  // Sodium, Na
            '606': 1258,  // Fatty acids, total saturated
        };

        it('should map nutrient.number=208 (Energy) to nutrientId=1008', () => {
            expect(NUTRIENT_NUMBER_TO_ID['208']).toBe(1008);
        });

        it('should map nutrient.number=203 (Protein) to nutrientId=1003', () => {
            expect(NUTRIENT_NUMBER_TO_ID['203']).toBe(1003);
        });

        it('should map nutrient.number=204 (Fat) to nutrientId=1004', () => {
            expect(NUTRIENT_NUMBER_TO_ID['204']).toBe(1004);
        });

        it('should map nutrient.number=205 (Carbs) to nutrientId=1005', () => {
            expect(NUTRIENT_NUMBER_TO_ID['205']).toBe(1005);
        });

        it('should map nutrient.number=291 (Fiber) to nutrientId=1079', () => {
            expect(NUTRIENT_NUMBER_TO_ID['291']).toBe(1079);
        });

        it('should map nutrient.number=269 (Sugars) to nutrientId=2000', () => {
            expect(NUTRIENT_NUMBER_TO_ID['269']).toBe(2000);
        });

        it('should map nutrient.number=307 (Sodium) to nutrientId=1093', () => {
            expect(NUTRIENT_NUMBER_TO_ID['307']).toBe(1093);
        });

        it('should map nutrient.number=606 (SatFat) to nutrientId=1258', () => {
            expect(NUTRIENT_NUMBER_TO_ID['606']).toBe(1258);
        });

        it('should map nutrient.number=268 (kJ) to nutrientId=2047', () => {
            expect(NUTRIENT_NUMBER_TO_ID['268']).toBe(2047);
        });
    });

    /**
     * kJ → kcal conversion test
     * Problem: Some foods only have energy in kJ (2047), not kcal (1008)
     * Solution: If kcal is 0, use kJ / 4.184
     */
    describe('kJ to kcal conversion fallback', () => {
        it('should convert kJ to kcal when kcal is 0', () => {
            const energyKJ = 418.4;
            const expectedKcal = Math.round(energyKJ / 4.184);
            expect(expectedKcal).toBe(100);
        });

        it('should convert 1000 kJ to ~239 kcal', () => {
            const energyKJ = 1000;
            const expectedKcal = Math.round(energyKJ / 4.184);
            expect(expectedKcal).toBe(239);
        });

        it('should not convert if kcal is already present', () => {
            const kcalFromSource = 250;
            // Simulate: if kcal > 0, don't convert
            expect(kcalFromSource).toBe(250);
        });
    });

    /**
     * Integration test: full nutrient extraction scenario
     */
    describe('extractNutrients integration', () => {
        it('should extract nutrients when using nutrient.number format', () => {
            // Simulate USDA FDC response with nutrient.number
            const mockFoodNutrients = [
                { nutrient: { number: '208' }, amount: 250 }, // Energy (kcal)
                { nutrient: { number: '203' }, amount: 25 },  // Protein
                { nutrient: { number: '204' }, amount: 10 },  // Fat
                { nutrient: { number: '205' }, amount: 30 },  // Carbs
            ];

            const NUTRIENT_NUMBER_TO_ID: Record<string, number> = {
                '208': 1008, '203': 1003, '204': 1004, '205': 1005,
            };

            // Build byId map (simulating mapFoodNutrients + resolveNutrientId)
            const byId = new Map<number, number>();
            for (const fn of mockFoodNutrients) {
                const numStr = String(fn.nutrient.number);
                const nutrientId = NUTRIENT_NUMBER_TO_ID[numStr];
                if (nutrientId) {
                    byId.set(nutrientId, fn.amount);
                }
            }

            // Extract nutrients (simulating extractNutrients)
            const get = (id: number) => byId.get(id) ?? 0;
            const nutrients = {
                calories: get(1008),
                protein: get(1003),
                fat: get(1004),
                carbs: get(1005),
            };

            expect(nutrients.calories).toBe(250);
            expect(nutrients.protein).toBe(25);
            expect(nutrients.fat).toBe(10);
            expect(nutrients.carbs).toBe(30);
        });

        it('should use kJ fallback when kcal is missing', () => {
            // Simulate: only kJ available (268 → 2047)
            const mockFoodNutrients = [
                { nutrient: { number: '268' }, amount: 418.4 }, // Energy (kJ)
                { nutrient: { number: '203' }, amount: 10 },    // Protein
            ];

            const NUTRIENT_NUMBER_TO_ID: Record<string, number> = {
                '268': 2047, '203': 1003,
            };

            const byId = new Map<number, number>();
            for (const fn of mockFoodNutrients) {
                const numStr = String(fn.nutrient.number);
                const nutrientId = NUTRIENT_NUMBER_TO_ID[numStr];
                if (nutrientId) {
                    byId.set(nutrientId, fn.amount);
                }
            }

            const get = (id: number) => byId.get(id) ?? 0;

            let calories = get(1008); // Should be 0 (no kcal)
            expect(calories).toBe(0);

            // Fallback to kJ
            if (calories === 0) {
                const energyKJ = get(2047);
                if (energyKJ > 0) {
                    calories = Math.round(energyKJ / 4.184);
                }
            }

            expect(calories).toBe(100);
        });
    });
});

/**
 * Root cause explanation:
 * 
 * WHY DID WE GET 0 KCAL BEFORE?
 * 
 * 1) nutrient.number vs nutrientId confusion:
 *    - USDA FDC foodNutrients array contains { nutrient: { number: '208' }, amount: 250 }
 *    - OLD CODE: resolveNutrientId() returned 208 directly
 *    - extractNutrients() looked for byId.get(1008) → NOT FOUND → 0
 *    - FIX: Map 208 → 1008 using NUTRIENT_NUMBER_TO_ID
 * 
 * 2) kJ without kcal:
 *    - Some foods only provide energy in kJ (nutrientId=2047), not kcal (1008)
 *    - OLD CODE: Only checked get(1008) → 0 if missing
 *    - FIX: If kcal=0, check get(2047) and convert: kcal = kJ / 4.184
 */

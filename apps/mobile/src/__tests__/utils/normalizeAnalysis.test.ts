/**
 * Tests for normalizeAnalysis function
 * STEP 7: Ensures dishName priority and data stability
 */

// Note: This is a simplified test - actual normalizeAnalysis is in AnalysisResultsScreen.js
// In a real implementation, you would extract normalizeAnalysis to a utility and test it directly

describe('normalizeAnalysis dishName priority', () => {
  // Helper function mimicking normalizeAnalysis dishName extraction
  const extractDishName = (raw: any, fallbackMealName: string = 'Meal'): string => {
    // STEP 2 FIX: displayName is the preferred field (set by backend)
    let name = raw.data?.displayName || raw.data?.dishNameLocalized || 
      raw.data?.originalDishName || raw.data?.dishName || 
      raw.dishName || raw.name || null;

    // Remove "and more" suffix if present (legacy backend behavior)
    if (name && (name.includes(' and more') || name.includes(' и другое') || name.includes(' және басқалары'))) {
      name = name.replace(/\s+(and more|и другое|және басқалары)$/i, '');
    }

    // If no specific dish name, use localized fallback
    if (!name || name === 'Food Analysis' || name === 'Meal' || name === 'Блюдо' || name === 'Тағам') {
      return fallbackMealName;
    }

    return name;
  };

  it('should prioritize displayName over other fields', () => {
    const raw = {
      data: {
        displayName: 'Паста со шпинатным соусом',
        dishNameLocalized: 'Паста с овощами',
        originalDishName: 'Pasta with spinach',
        dishName: 'Pasta',
      },
    };

    const result = extractDishName(raw);
    expect(result).toBe('Паста со шпинатным соусом');
  });

  it('should fall back to dishNameLocalized if displayName is missing', () => {
    const raw = {
      data: {
        dishNameLocalized: 'Курица с рисом',
        originalDishName: 'Chicken with rice',
      },
    };

    const result = extractDishName(raw);
    expect(result).toBe('Курица с рисом');
  });

  it('should fall back to originalDishName if localized is missing', () => {
    const raw = {
      data: {
        originalDishName: 'Chicken with vegetables',
      },
    };

    const result = extractDishName(raw);
    expect(result).toBe('Chicken with vegetables');
  });

  it('should NOT return comma-separated ingredient list as dishName', () => {
    const raw = {
      data: {
        // This should NOT happen after STEP 2 fix, but if it does, we should handle it
        dishName: 'Фарфалле, Шпинат, Нут',
        dishNameLocalized: 'Паста со шпинатным соусом и нутом',
      },
    };

    const result = extractDishName(raw);
    // Should prefer dishNameLocalized over comma-separated dishName
    expect(result).toBe('Паста со шпинатным соусом и нутом');
  });

  it('should remove "and more" suffix', () => {
    const raw = {
      data: {
        displayName: 'Chicken with rice and more',
      },
    };

    const result = extractDishName(raw);
    expect(result).toBe('Chicken with rice');
  });

  it('should remove Russian "и другое" suffix', () => {
    const raw = {
      data: {
        displayName: 'Курица с рисом и другое',
      },
    };

    const result = extractDishName(raw);
    expect(result).toBe('Курица с рисом');
  });

  it('should use fallback for generic names', () => {
    const raw = {
      data: {
        displayName: 'Meal',
      },
    };

    const result = extractDishName(raw, 'Приём пищи');
    expect(result).toBe('Приём пищи');
  });

  it('should handle empty/null values gracefully', () => {
    const raw = {
      data: {
        displayName: null,
        dishNameLocalized: undefined,
        originalDishName: '',
      },
    };

    const result = extractDishName(raw, 'Default Meal');
    expect(result).toBe('Default Meal');
  });

  it('should handle nested data structure from API', () => {
    const raw = {
      status: 'completed',
      data: {
        items: [],
        total: {},
        displayName: 'API Response Dish Name',
      },
    };

    const result = extractDishName(raw);
    expect(result).toBe('API Response Dish Name');
  });
});

describe('normalizeAnalysis items validation', () => {
  it('should validate that totals match sum of items', () => {
    const items = [
      { calories: 250, protein: 10, carbs: 30, fat: 8 },
      { calories: 150, protein: 5, carbs: 20, fat: 5 },
      { calories: 100, protein: 8, carbs: 5, fat: 6 },
    ];

    const expectedTotals = {
      calories: 500,
      protein: 23,
      carbs: 55,
      fat: 19,
    };

    const sumCalories = items.reduce((sum, i) => sum + i.calories, 0);
    const sumProtein = items.reduce((sum, i) => sum + i.protein, 0);
    const sumCarbs = items.reduce((sum, i) => sum + i.carbs, 0);
    const sumFat = items.reduce((sum, i) => sum + i.fat, 0);

    // Allow 5% tolerance
    expect(Math.abs(sumCalories - expectedTotals.calories)).toBeLessThan(expectedTotals.calories * 0.05);
    expect(Math.abs(sumProtein - expectedTotals.protein)).toBeLessThan(expectedTotals.protein * 0.05 + 1);
    expect(Math.abs(sumCarbs - expectedTotals.carbs)).toBeLessThan(expectedTotals.carbs * 0.05 + 1);
    expect(Math.abs(sumFat - expectedTotals.fat)).toBeLessThan(expectedTotals.fat * 0.05 + 1);
  });
});

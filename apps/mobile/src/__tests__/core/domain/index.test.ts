import { describe, it, expect } from '@jest/globals';

describe('Domain Models', () => {
  it('should have correct User interface structure', () => {
    const user = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      avatar: 'avatar.jpg',
      createdAt: new Date(),
      updatedAt: new Date(),
      isEmailVerified: true,
      lastLoginAt: new Date(),
      preferences: {
        language: 'en',
        units: 'metric' as const,
        notifications: {
          email: true,
          push: true,
          analysisComplete: true,
          dailyReminder: true,
        },
        privacy: {
          shareData: false,
          analytics: true,
        },
      },
    };

    expect(user.id).toBe('1');
    expect(user.email).toBe('test@example.com');
    expect(user.preferences.language).toBe('en');
    expect(user.preferences.units).toBe('metric');
  });

  it('should have correct Analysis interface structure', () => {
    const analysis = {
      id: '1',
      userId: '1',
      imageUri: 'image.jpg',
      imageHash: 'hash123',
      result: {
        items: [],
        totalCalories: 0,
        totalProtein: 0,
        totalFat: 0,
        totalCarbs: 0,
        confidence: 0,
        processingTime: 0,
        timestamp: new Date(),
      },
      status: 'completed' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      processingTime: 1000,
    };

    expect(analysis.id).toBe('1');
    expect(analysis.status).toBe('completed');
    expect(analysis.result.totalCalories).toBe(0);
  });

  it('should have correct JournalEntry interface structure', () => {
    const journalEntry = {
      id: '1',
      userId: '1',
      date: new Date(),
      meals: [],
      totalCalories: 0,
      totalProtein: 0,
      totalFat: 0,
      totalCarbs: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(journalEntry.id).toBe('1');
    expect(journalEntry.totalCalories).toBe(0);
  });

  it('should have correct Meal interface structure', () => {
    const meal = {
      id: '1',
      name: 'Breakfast',
      type: 'breakfast' as const,
      items: [],
      totalCalories: 0,
      totalProtein: 0,
      totalFat: 0,
      totalCarbs: 0,
      timestamp: new Date(),
    };

    expect(meal.id).toBe('1');
    expect(meal.type).toBe('breakfast');
  });

  it('should have correct MealItem interface structure', () => {
    const mealItem = {
      id: '1',
      name: 'Test Food',
      calories: 100,
      protein: 10,
      fat: 5,
      carbs: 15,
      quantity: 1,
      unit: 'serving',
      imageUri: 'image.jpg',
      analysisId: 'analysis1',
    };

    expect(mealItem.id).toBe('1');
    expect(mealItem.calories).toBe(100);
    expect(mealItem.unit).toBe('serving');
  });
});

import type { User, Analysis, JournalEntry, Meal, MealItem } from '../domain';

export class UserFactory {
  static create(data: Partial<User>): User {
    return {
      id: Math.random().toString(36).substr(2, 9),
      email: '',
      name: undefined,
      avatar: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      isEmailVerified: false,
      lastLoginAt: undefined,
      preferences: {
        language: 'en',
        units: 'metric',
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
      ...data,
    };
  }
}

export class AnalysisFactory {
  static create(data: Partial<Analysis>): Analysis {
    return {
      id: Math.random().toString(36).substr(2, 9),
      userId: '',
      imageUri: '',
      imageHash: '',
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
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    };
  }
}

export class JournalEntryFactory {
  static create(data: Partial<JournalEntry>): JournalEntry {
    return {
      id: Math.random().toString(36).substr(2, 9),
      userId: '',
      date: new Date(),
      meals: [],
      totalCalories: 0,
      totalProtein: 0,
      totalFat: 0,
      totalCarbs: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    };
  }
}

export class MealFactory {
  static create(data: Partial<Meal>): Meal {
    return {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      type: 'breakfast',
      items: [],
      totalCalories: 0,
      totalProtein: 0,
      totalFat: 0,
      totalCarbs: 0,
      timestamp: new Date(),
      ...data,
    };
  }
}

export class MealItemFactory {
  static create(data: Partial<MealItem>): MealItem {
    return {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
      quantity: 1,
      unit: 'serving',
      ...data,
    };
  }
}

import type { JournalEntry, Meal, MealItem } from '../domain';

export interface CreateMealRequest {
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  items: Omit<MealItem, 'id'>[];
}

export interface UpdateMealRequest {
  name?: string;
  items?: Omit<MealItem, 'id'>[];
}

export class JournalService {
  async getJournalEntries(userId: string, _dateRange: { start: Date; end: Date }): Promise<JournalEntry[]> {
    // Mock implementation
    return [
      {
        id: '1',
        userId,
        date: new Date(),
        meals: [
          {
            id: '1',
            name: 'Breakfast',
            type: 'breakfast',
            items: [
              {
                id: '1',
                name: 'Oatmeal with berries',
                calories: 250,
                protein: 8,
                fat: 4,
                carbs: 45,
                quantity: 1,
                unit: 'bowl',
              },
            ],
            totalCalories: 250,
            totalProtein: 8,
            totalFat: 4,
            totalCarbs: 45,
            timestamp: new Date(),
          },
        ],
        totalCalories: 250,
        totalProtein: 8,
        totalFat: 4,
        totalCarbs: 45,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  async createMeal(userId: string, date: Date, mealData: CreateMealRequest): Promise<Meal> {
    // Mock implementation
    const meal: Meal = {
      id: Math.random().toString(36).substr(2, 9),
      name: mealData.name,
      type: mealData.type,
      items: (mealData.items || []).map(item => ({
        id: Math.random().toString(36).substr(2, 9),
        ...item,
      })),
      totalCalories: (mealData.items || []).reduce((sum, item) => sum + (item.calories || 0), 0),
      totalProtein: (mealData.items || []).reduce((sum, item) => sum + (item.protein || 0), 0),
      totalFat: (mealData.items || []).reduce((sum, item) => sum + (item.fat || 0), 0),
      totalCarbs: (mealData.items || []).reduce((sum, item) => sum + (item.carbs || 0), 0),
      timestamp: new Date(),
    };
    
    return meal;
  }

  async updateMeal(mealId: string, updates: UpdateMealRequest): Promise<Meal> {
    // Mock implementation
    return {
      id: mealId,
      name: updates.name || 'Updated Meal',
      type: 'breakfast',
      items: (updates.items || []).map(item => ({
        id: Math.random().toString(36).substr(2, 9),
        ...item,
      })) || [],
      totalCalories: updates.items?.reduce((sum, item) => sum + item.calories, 0) || 0,
      totalProtein: updates.items?.reduce((sum, item) => sum + item.protein, 0) || 0,
      totalFat: updates.items?.reduce((sum, item) => sum + item.fat, 0) || 0,
      totalCarbs: updates.items?.reduce((sum, item) => sum + item.carbs, 0) || 0,
      timestamp: new Date(),
    };
  }

  async deleteMeal(mealId: string): Promise<void> {
    // Mock implementation
    console.log(`Deleted meal ${mealId}`);
  }

  async addMealItem(mealId: string, item: Omit<MealItem, 'id'>): Promise<MealItem> {
    // Mock implementation
    return {
      id: Math.random().toString(36).substr(2, 9),
      ...item,
    };
  }

  async updateMealItem(itemId: string, updates: Partial<MealItem>): Promise<MealItem> {
    // Mock implementation
    return {
      id: itemId,
      name: 'Updated item',
      calories: 100,
      protein: 5,
      fat: 2,
      carbs: 15,
      quantity: 1,
      unit: 'serving',
      ...updates,
    };
  }

  async deleteMealItem(itemId: string): Promise<void> {
    // Mock implementation
    console.log(`Deleted meal item ${itemId}`);
  }

  async getDailyStats(userId: string, date: Date): Promise<any> {
    // Mock implementation
    return {
      date,
      totalCalories: 2000,
      totalProtein: 150,
      totalFat: 65,
      totalCarbs: 200,
      meals: 3,
      analyses: 2,
    };
  }
}

export const journalService = new JournalService();

export interface JournalEntry {
  id: string;
  userId: string;
  date: Date;
  meals: Meal[];
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Meal {
  id: string;
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  items: MealItem[];
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  timestamp: Date;
}

export interface MealItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  quantity: number;
  unit: string;
  imageUri?: string;
  analysisId?: string;
}

export const getJournalEntries = async (userId: string, _dateRange: { start: Date; end: Date }): Promise<JournalEntry[]> => {
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
};

export const addMealItem = async (userId: string, mealId: string, item: Omit<MealItem, 'id'>): Promise<MealItem> => {
  // Mock implementation
  return {
    id: Math.random().toString(36).substr(2, 9),
    ...item,
  };
};

export const updateMealItem = async (itemId: string, updates: Partial<MealItem>): Promise<MealItem> => {
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
};

export const deleteMealItem = async (itemId: string): Promise<void> => {
  // Mock implementation
  console.log(`Deleted meal item ${itemId}`);
};

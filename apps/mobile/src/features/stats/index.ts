export interface UserStats {
  userId: string;
  period: 'week' | 'month' | 'year';
  totalAnalyses: number;
  totalCalories: number;
  averageCaloriesPerDay: number;
  mostAnalyzedFoods: Array<{
    name: string;
    count: number;
    calories: number;
  }>;
  nutritionBreakdown: {
    protein: number;
    fat: number;
    carbs: number;
  };
  goals: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    unlockedAt: Date;
    icon: string;
  }>;
}

export interface WeightEntry {
  id: string;
  userId: string;
  weight: number;
  date: Date;
  notes?: string;
}

export const getUserStats = async (userId: string, period: 'week' | 'month' | 'year'): Promise<UserStats> => {
  // Mock implementation
  return {
    userId,
    period,
    totalAnalyses: 45,
    totalCalories: 6750,
    averageCaloriesPerDay: 2250,
    mostAnalyzedFoods: [
      { name: 'Chicken Breast', count: 8, calories: 1320 },
      { name: 'Rice', count: 6, calories: 900 },
      { name: 'Salad', count: 5, calories: 300 },
    ],
    nutritionBreakdown: {
      protein: 120,
      fat: 65,
      carbs: 200,
    },
    goals: {
      calories: 2000,
      protein: 150,
      fat: 65,
      carbs: 200,
    },
    achievements: [
      {
        id: '1',
        name: 'First Analysis',
        description: 'Completed your first food analysis',
        unlockedAt: new Date('2024-01-01'),
        icon: 'trophy',
      },
      {
        id: '2',
        name: 'Week Warrior',
        description: 'Analyzed food for 7 consecutive days',
        unlockedAt: new Date('2024-01-08'),
        icon: 'calendar',
      },
    ],
  };
};

export const addWeightEntry = async (userId: string, weight: number, date: Date, notes?: string): Promise<WeightEntry> => {
  // Mock implementation
  return {
    id: Math.random().toString(36).substr(2, 9),
    userId,
    weight,
    date,
    notes,
  };
};

export const getWeightHistory = async (userId: string, days: number = 30): Promise<WeightEntry[]> => {
  // Mock implementation
  const entries: WeightEntry[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    entries.push({
      id: Math.random().toString(36).substr(2, 9),
      userId,
      weight: 70 + Math.random() * 5, // Random weight between 70-75
      date,
    });
  }
  
  return entries;
};

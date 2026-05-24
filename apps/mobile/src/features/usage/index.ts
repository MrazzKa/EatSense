export interface UsageLimit {
  userId: string;
  dailyLimit: number;
  usedToday: number;
  remainingToday: number;
  resetTime: Date;
  isPremium: boolean;
}

export interface UsageHistory {
  date: Date;
  analyses: number;
  calories: number;
  foods: string[];
}

export const getUsageLimit = async (userId: string): Promise<UsageLimit> => {
  // Mock implementation
  return {
    userId,
    dailyLimit: 10,
    usedToday: 3,
    remainingToday: 7,
    resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    isPremium: false,
  };
};

export const getUsageHistory = async (userId: string, days: number = 7): Promise<UsageHistory[]> => {
  // Mock implementation
  const history: UsageHistory[] = [];
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    history.push({
      date,
      analyses: Math.floor(Math.random() * 10),
      calories: Math.floor(Math.random() * 2000) + 1000,
      foods: ['Chicken', 'Rice', 'Salad', 'Apple'].slice(0, Math.floor(Math.random() * 4) + 1),
    });
  }
  
  return history.reverse();
};

export const checkUsageLimit = async (userId: string): Promise<boolean> => {
  const limit = await getUsageLimit(userId);
  return limit.remainingToday > 0;
};

export const incrementUsage = async (userId: string): Promise<void> => {
  // Mock implementation
  console.log(`Incremented usage for user ${userId}`);
};

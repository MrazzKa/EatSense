import type { User, UserPreferences } from '../domain';

export interface UpdateUserRequest {
  name?: string;
  avatar?: string;
  preferences?: Partial<UserPreferences>;
}

export class UserService {
  async getUser(userId: string): Promise<User | null> {
    // Mock implementation
    return {
      id: userId,
      email: 'user@example.com',
      name: 'John Doe',
      avatar: 'https://example.com/avatar.jpg',
      createdAt: new Date(),
      updatedAt: new Date(),
      isEmailVerified: true,
      lastLoginAt: new Date(),
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
    };
  }

  async updateUser(userId: string, updates: UpdateUserRequest): Promise<User> {
    // Mock implementation
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    const mergedPreferences = updates.preferences 
      ? { ...user.preferences, ...updates.preferences }
      : user.preferences;
    
    // Ensure language is always defined
    if (!mergedPreferences.language) {
      mergedPreferences.language = user.preferences.language;
    }
    
    return {
      ...user,
      ...updates,
      preferences: mergedPreferences as UserPreferences,
      updatedAt: new Date(),
    };
  }

  async deleteUser(userId: string): Promise<void> {
    // Mock implementation
    console.log(`Deleted user ${userId}`);
  }

  async getUserStats(userId: string): Promise<any> {
    // Mock implementation
    console.log('Fetching user stats for', userId);
    return {
      totalAnalyses: 45,
      totalCalories: 6750,
      averageCaloriesPerDay: 2250,
      mostAnalyzedFoods: [
        { name: 'Chicken Breast', count: 8, calories: 1320 },
        { name: 'Rice', count: 6, calories: 900 },
        { name: 'Salad', count: 5, calories: 300 },
      ],
    };
  }

  async exportUserData(userId: string): Promise<any> {
    // Mock implementation
    return {
      user: await this.getUser(userId),
      analyses: [],
      journalEntries: [],
      stats: await this.getUserStats(userId),
    };
  }
}

export const userService = new UserService();

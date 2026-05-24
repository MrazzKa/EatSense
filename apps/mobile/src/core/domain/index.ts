export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
  isEmailVerified: boolean;
  lastLoginAt?: Date;
  preferences: UserPreferences;
}

export interface UserPreferences {
  language: string;
  units: 'metric' | 'imperial';
  notifications: {
    email: boolean;
    push: boolean;
    analysisComplete: boolean;
    dailyReminder: boolean;
  };
  privacy: {
    shareData: boolean;
    analytics: boolean;
  };
}

export interface Analysis {
  id: string;
  userId: string;
  imageUri: string;
  imageHash: string;
  result: AnalysisResult;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  processingTime?: number;
  error?: string;
}

export interface AnalysisResult {
  items: AnalysisItem[];
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  confidence: number;
  processingTime: number;
  timestamp: Date;
}

export interface AnalysisItem {
  label: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  gramsMean?: number;
  confidence: number;
  ingredients?: string[];
}

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

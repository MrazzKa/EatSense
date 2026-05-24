export interface User {
  id: string;
  email: string;
  profile?: UserProfile;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  name?: string;
  age?: number;
  weight?: number;
  height?: number;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  activityLevel?: 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'ACTIVE' | 'VERY_ACTIVE';
  goal?: 'WEIGHT_LOSS' | 'WEIGHT_GAIN' | 'MAINTENANCE';
}

export interface Analysis {
  id: string;
  userId: string;
  type: 'IMAGE' | 'TEXT';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  metadata?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  results?: AnalysisResult[];
}

export interface AnalysisResult {
  id: string;
  analysisId: string;
  data: AnalysisData;
  createdAt: Date;
}

export interface AnalysisData {
  items: AnalysisItem[];
}

export interface AnalysisItem {
  label: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  gramsMean?: number;
}

export interface Meal {
  id: string;
  userId: string;
  name: string;
  type: string;
  consumedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  items: MealItem[];
}

export interface MealItem {
  id: string;
  mealId: string;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  weight?: number;
}

export interface Media {
  id: string;
  userId: string;
  filename: string;
  mimetype: string;
  size: number;
  data: Buffer;
  createdAt: Date;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
}
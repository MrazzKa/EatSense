export interface AppSnapshot {
  version: string;
  timestamp: Date;
  user: UserSnapshot;
  settings: SettingsSnapshot;
  data: DataSnapshot;
}

export interface UserSnapshot {
  id: string;
  email: string;
  profile: UserProfile;
  preferences: UserPreferences;
}

export interface UserProfile {
  name: string;
  age: number;
  weight: number;
  height: number;
  gender: string;
  activityLevel: string;
  goal: string;
}

export interface UserPreferences {
  theme: string;
  language: string;
  units: string;
  notifications: boolean;
  autoSave: boolean;
}

export interface SettingsSnapshot {
  api: ApiSettings;
  cache: CacheSettings;
  security: SecuritySettings;
}

export interface ApiSettings {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
}

export interface CacheSettings {
  ttl: number;
  maxSize: number;
  strategy: string;
}

export interface SecuritySettings {
  encryption: boolean;
  biometric: boolean;
  sessionTimeout: number;
}

export interface DataSnapshot {
  analyses: AnalysisSnapshot[];
  meals: MealSnapshot[];
  media: MediaSnapshot[];
  statistics: StatisticsSnapshot;
}

export interface AnalysisSnapshot {
  id: string;
  type: string;
  status: string;
  result: any;
  timestamp: Date;
}

export interface MealSnapshot {
  id: string;
  name: string;
  type: string;
  items: any[];
  timestamp: Date;
}

export interface MediaSnapshot {
  id: string;
  filename: string;
  type: string;
  size: number;
  timestamp: Date;
}

export interface StatisticsSnapshot {
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  averageCalories: number;
  goalProgress: number;
}
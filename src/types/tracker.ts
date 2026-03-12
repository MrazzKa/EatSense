export type HabitFrequency = 'daily' | 'weekdays' | 'custom';

export interface Habit {
  id: string;
  emoji: string;
  name: string;
  frequency: HabitFrequency;
  customDays?: number[]; // 0=Mon, 1=Tue, ..., 6=Sun
  createdAt: string;
  order: number;
}

export interface HabitCompletion {
  habitId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
}

export type ShoppingCategory = 'protein' | 'veg' | 'dairy' | 'fat' | 'grain' | 'other';

export interface ShoppingItem {
  id: string;
  name: string;
  category: ShoppingCategory;
  emoji?: string;
  bought: boolean;
  createdAt: string;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  date: string; // YYYY-MM-DD
  reminder?: string; // ISO datetime for notification
  createdAt: string;
}

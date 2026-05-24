import { HabitFrequency } from '../types/tracker';

export interface PresetHabit {
  emoji: string;
  nameKey: string; // i18n key under tracker.presets.*
  defaultName: string; // fallback
  frequency: HabitFrequency;
}

export const PRESET_HABITS: PresetHabit[] = [
  { emoji: '💧', nameKey: 'tracker.presets.drinkWater', defaultName: 'Drink water', frequency: 'daily' },
  { emoji: '🏃', nameKey: 'tracker.presets.exercise', defaultName: 'Exercise', frequency: 'daily' },
  { emoji: '🧘', nameKey: 'tracker.presets.meditate', defaultName: 'Meditate', frequency: 'daily' },
  { emoji: '📖', nameKey: 'tracker.presets.read', defaultName: 'Read', frequency: 'daily' },
  { emoji: '💊', nameKey: 'tracker.presets.vitamins', defaultName: 'Take vitamins', frequency: 'daily' },
  { emoji: '🥗', nameKey: 'tracker.presets.eatHealthy', defaultName: 'Eat healthy', frequency: 'daily' },
  { emoji: '😴', nameKey: 'tracker.presets.sleepEarly', defaultName: 'Sleep early', frequency: 'daily' },
  { emoji: '🚶', nameKey: 'tracker.presets.walk', defaultName: '10k steps', frequency: 'daily' },
  { emoji: '🧹', nameKey: 'tracker.presets.cleanUp', defaultName: 'Clean up', frequency: 'daily' },
  { emoji: '🦷', nameKey: 'tracker.presets.floss', defaultName: 'Floss', frequency: 'daily' },
  { emoji: '📝', nameKey: 'tracker.presets.journal', defaultName: 'Journal', frequency: 'daily' },
  { emoji: '🙏', nameKey: 'tracker.presets.gratitude', defaultName: 'Gratitude', frequency: 'daily' },
  { emoji: '🍎', nameKey: 'tracker.presets.eatFruit', defaultName: 'Eat fruit', frequency: 'daily' },
  { emoji: '☀️', nameKey: 'tracker.presets.morningRoutine', defaultName: 'Morning routine', frequency: 'daily' },
  { emoji: '🌙', nameKey: 'tracker.presets.eveningRoutine', defaultName: 'Evening routine', frequency: 'daily' },
  { emoji: '📵', nameKey: 'tracker.presets.noPhone', defaultName: 'No phone before bed', frequency: 'daily' },
  { emoji: '🏋️', nameKey: 'tracker.presets.gym', defaultName: 'Go to gym', frequency: 'daily' },
  { emoji: '🥤', nameKey: 'tracker.presets.noSugar', defaultName: 'No sugar drinks', frequency: 'daily' },
  { emoji: '🧴', nameKey: 'tracker.presets.skincare', defaultName: 'Skincare', frequency: 'daily' },
  { emoji: '🌿', nameKey: 'tracker.presets.outdoors', defaultName: 'Go outside', frequency: 'daily' },
  { emoji: '💪', nameKey: 'tracker.presets.stretching', defaultName: 'Stretch', frequency: 'daily' },
  { emoji: '🎵', nameKey: 'tracker.presets.practice', defaultName: 'Practice instrument', frequency: 'daily' },
  { emoji: '🧠', nameKey: 'tracker.presets.learn', defaultName: 'Learn something new', frequency: 'daily' },
  { emoji: '🫁', nameKey: 'tracker.presets.breathing', defaultName: 'Breathing exercise', frequency: 'daily' },
  { emoji: '🥜', nameKey: 'tracker.presets.healthySnack', defaultName: 'Healthy snack', frequency: 'daily' },
  { emoji: '👨‍👩‍👧', nameKey: 'tracker.presets.familyTime', defaultName: 'Family time', frequency: 'daily' },
  { emoji: '🚰', nameKey: 'tracker.presets.noAlcohol', defaultName: 'No alcohol', frequency: 'daily' },
  { emoji: '📱', nameKey: 'tracker.presets.screenLimit', defaultName: 'Screen time limit', frequency: 'daily' },
  { emoji: '🛏️', nameKey: 'tracker.presets.makeBed', defaultName: 'Make bed', frequency: 'daily' },
];

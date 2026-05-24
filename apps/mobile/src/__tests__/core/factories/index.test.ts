import { describe, it, expect } from '@jest/globals';
import {
  UserFactory,
  AnalysisFactory,
  JournalEntryFactory,
  MealFactory,
  MealItemFactory,
} from '../../../core/factories';

describe('Factories', () => {
  describe('UserFactory', () => {
    it('should create user with default values', () => {
      const user = UserFactory.create({});
      expect(user.id).toBeDefined();
      expect(user.email).toBe('');
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
      expect(user.isEmailVerified).toBe(false);
      expect(user.preferences.language).toBe('en');
      expect(user.preferences.units).toBe('metric');
    });

    it('should create user with custom values', () => {
      const user = UserFactory.create({
        email: 'test@example.com',
        name: 'Test User',
        isEmailVerified: true,
      });
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.isEmailVerified).toBe(true);
    });
  });

  describe('AnalysisFactory', () => {
    it('should create analysis with default values', () => {
      const analysis = AnalysisFactory.create({});
      expect(analysis.id).toBeDefined();
      expect(analysis.userId).toBe('');
      expect(analysis.imageUri).toBe('');
      expect(analysis.imageHash).toBe('');
      expect(analysis.status).toBe('pending');
      expect(analysis.createdAt).toBeInstanceOf(Date);
      expect(analysis.updatedAt).toBeInstanceOf(Date);
      expect(analysis.result.items).toEqual([]);
    });

    it('should create analysis with custom values', () => {
      const analysis = AnalysisFactory.create({
        userId: 'user1',
        imageUri: 'image.jpg',
        status: 'completed',
      });
      expect(analysis.userId).toBe('user1');
      expect(analysis.imageUri).toBe('image.jpg');
      expect(analysis.status).toBe('completed');
    });
  });

  describe('JournalEntryFactory', () => {
    it('should create journal entry with default values', () => {
      const entry = JournalEntryFactory.create({});
      expect(entry.id).toBeDefined();
      expect(entry.userId).toBe('');
      expect(entry.date).toBeInstanceOf(Date);
      expect(entry.meals).toEqual([]);
      expect(entry.totalCalories).toBe(0);
      expect(entry.totalProtein).toBe(0);
      expect(entry.totalFat).toBe(0);
      expect(entry.totalCarbs).toBe(0);
    });

    it('should create journal entry with custom values', () => {
      const entry = JournalEntryFactory.create({
        userId: 'user1',
        totalCalories: 2000,
      });
      expect(entry.userId).toBe('user1');
      expect(entry.totalCalories).toBe(2000);
    });
  });

  describe('MealFactory', () => {
    it('should create meal with default values', () => {
      const meal = MealFactory.create({});
      expect(meal.id).toBeDefined();
      expect(meal.name).toBe('');
      expect(meal.type).toBe('breakfast');
      expect(meal.items).toEqual([]);
      expect(meal.totalCalories).toBe(0);
      expect(meal.timestamp).toBeInstanceOf(Date);
    });

    it('should create meal with custom values', () => {
      const meal = MealFactory.create({
        name: 'Lunch',
        type: 'lunch',
        totalCalories: 500,
      });
      expect(meal.name).toBe('Lunch');
      expect(meal.type).toBe('lunch');
      expect(meal.totalCalories).toBe(500);
    });
  });

  describe('MealItemFactory', () => {
    it('should create meal item with default values', () => {
      const item = MealItemFactory.create({});
      expect(item.id).toBeDefined();
      expect(item.name).toBe('');
      expect(item.calories).toBe(0);
      expect(item.protein).toBe(0);
      expect(item.fat).toBe(0);
      expect(item.carbs).toBe(0);
      expect(item.quantity).toBe(1);
      expect(item.unit).toBe('serving');
    });

    it('should create meal item with custom values', () => {
      const item = MealItemFactory.create({
        name: 'Chicken Breast',
        calories: 200,
        protein: 30,
        fat: 5,
        carbs: 0,
        quantity: 2,
        unit: 'piece',
      });
      expect(item.name).toBe('Chicken Breast');
      expect(item.calories).toBe(200);
      expect(item.protein).toBe(30);
      expect(item.fat).toBe(5);
      expect(item.carbs).toBe(0);
      expect(item.quantity).toBe(2);
      expect(item.unit).toBe('piece');
    });
  });
});

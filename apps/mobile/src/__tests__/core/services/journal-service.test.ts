import { describe, it, expect, jest } from '@jest/globals';
import { JournalService } from '../../../core/services/journal-service';

describe('JournalService', () => {
  let journalService: JournalService;

  beforeEach(() => {
    journalService = new JournalService();
  });

  it('should get journal entries', async () => {
    const result = await journalService.getJournalEntries('user1', {
      start: new Date('2024-01-01'),
      end: new Date('2024-01-31'),
    });

    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe('user1');
    expect(result[0].meals).toHaveLength(1);
    expect(result[0].meals[0].name).toBe('Breakfast');
  });

  it('should create meal', async () => {
    const result = await journalService.createMeal('user1', new Date(), {
      name: 'Lunch',
      type: 'lunch',
      items: [
        {
          name: 'Sandwich',
          calories: 300,
          protein: 15,
          fat: 10,
          carbs: 30,
          quantity: 1,
          unit: 'sandwich',
        },
      ],
    });

    expect(result.name).toBe('Lunch');
    expect(result.type).toBe('lunch');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('Sandwich');
  });

  it('should update meal', async () => {
    const result = await journalService.updateMeal('meal1', {
      name: 'Updated Meal',
      items: [
        {
          name: 'Updated Item',
          calories: 200,
          protein: 10,
          fat: 5,
          carbs: 20,
          quantity: 1,
          unit: 'serving',
        },
      ],
    });

    expect(result.name).toBe('Updated Meal');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('Updated Item');
  });

  it('should delete meal', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    await journalService.deleteMeal('meal1');
    
    expect(consoleSpy).toHaveBeenCalledWith('Deleted meal meal1');
    
    consoleSpy.mockRestore();
  });

  it('should add meal item', async () => {
    const result = await journalService.addMealItem('meal1', {
      name: 'New Item',
      calories: 150,
      protein: 8,
      fat: 3,
      carbs: 25,
      quantity: 1,
      unit: 'serving',
    });

    expect(result.name).toBe('New Item');
    expect(result.calories).toBe(150);
  });

  it('should update meal item', async () => {
    const result = await journalService.updateMealItem('item1', {
      name: 'Updated Item',
      calories: 200,
    });

    expect(result.name).toBe('Updated Item');
    expect(result.calories).toBe(200);
  });

  it('should delete meal item', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    await journalService.deleteMealItem('item1');
    
    expect(consoleSpy).toHaveBeenCalledWith('Deleted meal item item1');
    
    consoleSpy.mockRestore();
  });

  it('should get daily stats', async () => {
    const result = await journalService.getDailyStats('user1', new Date());
    expect(result).toBeDefined();
    expect(result.totalCalories).toBe(2000);
    expect(result.totalProtein).toBe(150);
    expect(result.totalFat).toBe(65);
    expect(result.totalCarbs).toBe(200);
  });
});

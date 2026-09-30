import { mealTypeForNow, scaleFacts } from '../../screens/BarcodeScanScreen';

/**
 * A label states everything per 100 g and a person eats some other amount, so
 * every figure that reaches the diary went through this multiplication. Getting
 * it wrong is invisible: the numbers still look like numbers.
 */

describe('scaleFacts', () => {
  const nutella = { calories: 539, protein: 6.3, carbs: 57.5, fat: 30.9 };

  it('leaves a 100 g portion alone', () => {
    expect(scaleFacts(nutella, 100)).toEqual(nutella);
  });

  it('scales a declared serving', () => {
    // 15 g is the serving Ferrero prints on the jar.
    expect(scaleFacts(nutella, 15)).toEqual({
      calories: 81,
      protein: 0.9,
      carbs: 8.6,
      fat: 4.6,
    });
  });

  it('scales past 100 g as readily as below it', () => {
    expect(scaleFacts(nutella, 250).calories).toBe(1348);
  });

  it('keeps calories whole and macros to a tenth', () => {
    const scaled = scaleFacts({ calories: 111, protein: 1.11, carbs: 2.22, fat: 3.33 }, 77);
    expect(Number.isInteger(scaled.calories)).toBe(true);
    // A gram to two decimals is false precision on a crowd-sourced label.
    for (const macro of [scaled.protein, scaled.carbs, scaled.fat]) {
      expect(macro).toBe(Math.round(macro * 10) / 10);
    }
  });

  it('returns zeros for a zero portion rather than NaN', () => {
    expect(scaleFacts(nutella, 0)).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });
});

describe('mealTypeForNow', () => {
  it('picks the meal the clock suggests', () => {
    expect(mealTypeForNow(7)).toBe('BREAKFAST');
    expect(mealTypeForNow(13)).toBe('LUNCH');
    expect(mealTypeForNow(19)).toBe('DINNER');
    expect(mealTypeForNow(23)).toBe('SNACK');
  });

  it('switches on the boundary hours, not inside them', () => {
    expect(mealTypeForNow(10)).toBe('BREAKFAST');
    expect(mealTypeForNow(11)).toBe('LUNCH');
    expect(mealTypeForNow(15)).toBe('LUNCH');
    expect(mealTypeForNow(16)).toBe('DINNER');
    expect(mealTypeForNow(20)).toBe('DINNER');
    expect(mealTypeForNow(21)).toBe('SNACK');
  });

  it('never guesses breakfast in the middle of the afternoon', () => {
    for (let hour = 11; hour < 24; hour++) {
      expect(mealTypeForNow(hour)).not.toBe('BREAKFAST');
    }
  });
});

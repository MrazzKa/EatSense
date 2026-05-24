import { validateEmail, validatePassword, validatePhone, validateUrl, validateDate, validateAge, validateWeight, validateHeight, validateCalories, validateMacros, validatePortion, validateForm } from '../../utils/validationUtils';

describe('validationUtils', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      const result = validatePassword('Password123!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject weak passwords', () => {
      const result = validatePassword('weak');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validatePhone', () => {
    it('should validate phone numbers', () => {
      expect(validatePhone('+1234567890')).toBe(true);
      expect(validatePhone('(123) 456-7890')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhone('123')).toBe(false);
      expect(validatePhone('abc')).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('should validate URLs', () => {
      expect(validateUrl('https://example.com')).toBe(true);
      expect(validateUrl('http://localhost:3000')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validateUrl('not-a-url')).toBe(false);
      expect(validateUrl('ftp://example.com')).toBe(false);
    });
  });

  describe('validateDate', () => {
    it('should validate dates', () => {
      expect(validateDate('2024-01-01')).toBe(true);
      expect(validateDate('2024-12-31')).toBe(true);
    });

    it('should reject invalid dates', () => {
      expect(validateDate('invalid-date')).toBe(false);
      expect(validateDate('2024-13-01')).toBe(false);
    });
  });

  describe('validateAge', () => {
    it('should validate ages', () => {
      expect(validateAge(25)).toBe(true);
      expect(validateAge(0)).toBe(true);
      expect(validateAge(150)).toBe(true);
    });

    it('should reject invalid ages', () => {
      expect(validateAge(-1)).toBe(false);
      expect(validateAge(151)).toBe(false);
    });
  });

  describe('validateWeight', () => {
    it('should validate weights', () => {
      expect(validateWeight(70)).toBe(true);
      expect(validateWeight(0.1)).toBe(true);
      expect(validateWeight(1000)).toBe(true);
    });

    it('should reject invalid weights', () => {
      expect(validateWeight(-1)).toBe(false);
      expect(validateWeight(1001)).toBe(false);
    });
  });

  describe('validateHeight', () => {
    it('should validate heights', () => {
      expect(validateHeight(175)).toBe(true);
      expect(validateHeight(1)).toBe(true);
      expect(validateHeight(300)).toBe(true);
    });

    it('should reject invalid heights', () => {
      expect(validateHeight(-1)).toBe(false);
      expect(validateHeight(301)).toBe(false);
    });
  });

  describe('validateCalories', () => {
    it('should validate calories', () => {
      expect(validateCalories(0)).toBe(true);
      expect(validateCalories(500)).toBe(true);
      expect(validateCalories(10000)).toBe(true);
    });

    it('should reject invalid calories', () => {
      expect(validateCalories(-1)).toBe(false);
      expect(validateCalories(10001)).toBe(false);
    });
  });

  describe('validateMacros', () => {
    it('should validate macros', () => {
      expect(validateMacros({ protein: 50, fat: 30, carbs: 100 })).toBe(true);
      expect(validateMacros({ protein: 0, fat: 0, carbs: 0 })).toBe(true);
    });

    it('should reject invalid macros', () => {
      expect(validateMacros({ protein: -1, fat: 30, carbs: 100 })).toBe(false);
      expect(validateMacros({ protein: 1001, fat: 30, carbs: 100 })).toBe(false);
    });
  });

  describe('validatePortion', () => {
    it('should validate portions', () => {
      expect(validatePortion(1)).toBe(true);
      expect(validatePortion(100)).toBe(true);
      expect(validatePortion(10000)).toBe(true);
    });

    it('should reject invalid portions', () => {
      expect(validatePortion(0)).toBe(false);
      expect(validatePortion(10001)).toBe(false);
    });
  });

  describe('validateForm', () => {
    it('should validate forms', () => {
      const data = {
        email: 'test@example.com',
        password: 'Password123!',
        age: 25,
      };
      
      const rules = {
        email: { required: true, type: 'email' },
        password: { required: true, type: 'password' },
        age: { required: true, type: 'number', min: 0, max: 150 },
      };
      
      const result = validateForm(data, rules);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should reject invalid forms', () => {
      const data = {
        email: 'invalid-email',
        password: 'weak',
        age: -1,
      };
      
      const rules = {
        email: { required: true, type: 'email' },
        password: { required: true, type: 'password' },
        age: { required: true, type: 'number', min: 0, max: 150 },
      };
      
      const result = validateForm(data, rules);
      expect(result.isValid).toBe(false);
      expect(Object.keys(result.errors).length).toBeGreaterThan(0);
    });
  });
});
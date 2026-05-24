import { capitalize, capitalizeWords, truncate, slugify } from '../../utils/stringUtils';

describe('stringUtils', () => {
  describe('capitalize', () => {
    it('should capitalize the first letter of a string', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('world')).toBe('World');
      expect(capitalize('HELLO')).toBe('Hello');
    });

    it('should handle empty strings', () => {
      expect(capitalize('')).toBe('');
    });

    it('should handle single character strings', () => {
      expect(capitalize('a')).toBe('A');
      expect(capitalize('A')).toBe('A');
    });
  });

  describe('capitalizeWords', () => {
    it('should capitalize the first letter of each word', () => {
      expect(capitalizeWords('hello world')).toBe('Hello World');
      expect(capitalizeWords('hello world test')).toBe('Hello World Test');
    });

    it('should handle empty strings', () => {
      expect(capitalizeWords('')).toBe('');
    });

    it('should handle single words', () => {
      expect(capitalizeWords('hello')).toBe('Hello');
    });
  });

  describe('truncate', () => {
    it('should truncate strings longer than the specified length', () => {
      expect(truncate('hello world', 5)).toBe('hello...');
      expect(truncate('hello world', 10)).toBe('hello worl...');
    });

    it('should not truncate strings shorter than the specified length', () => {
      expect(truncate('hello', 10)).toBe('hello');
    });

    it('should handle empty strings', () => {
      expect(truncate('', 5)).toBe('');
    });
  });

  describe('slugify', () => {
    it('should convert strings to URL-friendly slugs', () => {
      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('Hello, World!')).toBe('hello-world');
      expect(slugify('Hello World Test')).toBe('hello-world-test');
    });

    it('should handle empty strings', () => {
      expect(slugify('')).toBe('');
    });

    it('should handle strings with special characters', () => {
      expect(slugify('Hello@World#Test')).toBe('hello-world-test');
    });
  });
});
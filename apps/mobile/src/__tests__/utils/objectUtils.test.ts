import { pick, omit, deepClone, deepMerge, isEmpty, has, get, set, unset, keys, values, entries, invert } from '../../utils/objectUtils';

describe('objectUtils', () => {
  describe('pick', () => {
    it('should pick specified keys from object', () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 });
    });

    it('should handle missing keys', () => {
      const obj = { a: 1, b: 2 };
      expect(pick(obj, ['a', 'c'])).toEqual({ a: 1 });
    });
  });

  describe('omit', () => {
    it('should omit specified keys from object', () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(omit(obj, ['a', 'c'])).toEqual({ b: 2 });
    });
  });

  describe('deepClone', () => {
    it('should create deep clone of object', () => {
      const obj = { a: { b: { c: 1 } } };
      const cloned = deepClone(obj);
      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
      expect(cloned.a).not.toBe(obj.a);
    });

    it('should handle arrays', () => {
      const obj = { a: [1, 2, 3] };
      const cloned = deepClone(obj);
      expect(cloned).toEqual(obj);
      expect(cloned.a).not.toBe(obj.a);
    });
  });

  describe('deepMerge', () => {
    it('should deep merge objects', () => {
      const target = { a: { b: 1, c: 2 } };
      const source = { a: { b: 3, d: 4 } };
      expect(deepMerge(target, source)).toEqual({ a: { b: 3, c: 2, d: 4 } });
    });
  });

  describe('isEmpty', () => {
    it('should check if object is empty', () => {
      expect(isEmpty({})).toBe(true);
      expect(isEmpty({ a: 1 })).toBe(false);
      expect(isEmpty([])).toBe(true);
      expect(isEmpty([1])).toBe(false);
      expect(isEmpty('')).toBe(true);
      expect(isEmpty('a')).toBe(false);
    });
  });

  describe('has', () => {
    it('should check if object has nested property', () => {
      const obj = { a: { b: { c: 1 } } };
      expect(has(obj, 'a.b.c')).toBe(true);
      expect(has(obj, 'a.b.d')).toBe(false);
      expect(has(obj, 'a.d')).toBe(false);
    });
  });

  describe('get', () => {
    it('should get nested property value', () => {
      const obj = { a: { b: { c: 1 } } };
      expect(get(obj, 'a.b.c')).toBe(1);
      expect(get(obj, 'a.b.d')).toBeUndefined();
      expect(get(obj, 'a.b.d', 'default')).toBe('default');
    });
  });

  describe('set', () => {
    it('should set nested property value', () => {
      const obj = { a: { b: 1 } };
      set(obj, 'a.c', 2);
      expect(obj.a.c).toBe(2);
    });
  });

  describe('unset', () => {
    it('should unset nested property', () => {
      const obj = { a: { b: 1, c: 2 } };
      expect(unset(obj, 'a.b')).toBe(true);
      expect(obj.a.b).toBeUndefined();
      expect(obj.a.c).toBe(2);
    });
  });

  describe('keys', () => {
    it('should get object keys', () => {
      expect(keys({ a: 1, b: 2 })).toEqual(['a', 'b']);
    });
  });

  describe('values', () => {
    it('should get object values', () => {
      expect(values({ a: 1, b: 2 })).toEqual([1, 2]);
    });
  });

  describe('entries', () => {
    it('should get object entries', () => {
      expect(entries({ a: 1, b: 2 })).toEqual([['a', 1], ['b', 2]]);
    });
  });

  describe('invert', () => {
    it('should invert object keys and values', () => {
      expect(invert({ a: 1, b: 2 })).toEqual({ '1': 'a', '2': 'b' });
    });
  });
});

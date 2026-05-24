import { chunk, unique, uniqueBy, groupBy, sortBy, sortByDesc, shuffle, sample, flatten, intersection, difference, union, partition } from '../../utils/arrayUtils';

describe('arrayUtils', () => {
  describe('chunk', () => {
    it('should split array into chunks of specified size', () => {
      expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
      expect(chunk([1, 2, 3, 4, 5], 3)).toEqual([[1, 2, 3], [4, 5]]);
    });

    it('should handle empty arrays', () => {
      expect(chunk([], 2)).toEqual([]);
    });
  });

  describe('unique', () => {
    it('should remove duplicate values', () => {
      expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
      expect(unique(['a', 'b', 'b', 'c'])).toEqual(['a', 'b', 'c']);
    });

    it('should handle empty arrays', () => {
      expect(unique([])).toEqual([]);
    });
  });

  describe('uniqueBy', () => {
    it('should remove duplicates based on key function', () => {
      const items = [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
        { id: 1, name: 'c' },
      ];
      expect(uniqueBy(items, item => item.id)).toEqual([
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ]);
    });
  });

  describe('groupBy', () => {
    it('should group items by key function', () => {
      const items = [
        { category: 'a', value: 1 },
        { category: 'b', value: 2 },
        { category: 'a', value: 3 },
      ];
      const groups = groupBy(items, item => item.category);
      expect(groups.get('a')).toEqual([
        { category: 'a', value: 1 },
        { category: 'a', value: 3 },
      ]);
      expect(groups.get('b')).toEqual([
        { category: 'b', value: 2 },
      ]);
    });
  });

  describe('sortBy', () => {
    it('should sort array by key function', () => {
      const items = [
        { value: 3 },
        { value: 1 },
        { value: 2 },
      ];
      expect(sortBy(items, item => item.value)).toEqual([
        { value: 1 },
        { value: 2 },
        { value: 3 },
      ]);
    });
  });

  describe('sortByDesc', () => {
    it('should sort array in descending order by key function', () => {
      const items = [
        { value: 1 },
        { value: 3 },
        { value: 2 },
      ];
      expect(sortByDesc(items, item => item.value)).toEqual([
        { value: 3 },
        { value: 2 },
        { value: 1 },
      ]);
    });
  });

  describe('shuffle', () => {
    it('should shuffle array', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = shuffle(original);
      expect(shuffled).toHaveLength(original.length);
      expect(shuffled).toEqual(expect.arrayContaining(original));
    });
  });

  describe('sample', () => {
    it('should return random sample from array', () => {
      const array = [1, 2, 3, 4, 5];
      const sample1 = sample(array, 2);
      const sample2 = sample(array, 2);
      expect(sample1).toHaveLength(2);
      expect(sample2).toHaveLength(2);
    });
  });

  describe('flatten', () => {
    it('should flatten array of arrays', () => {
      expect(flatten([[1, 2], [3, 4], [5]])).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('intersection', () => {
    it('should return intersection of two arrays', () => {
      expect(intersection([1, 2, 3], [2, 3, 4])).toEqual([2, 3]);
    });
  });

  describe('difference', () => {
    it('should return difference of two arrays', () => {
      expect(difference([1, 2, 3], [2, 3, 4])).toEqual([1]);
    });
  });

  describe('union', () => {
    it('should return union of two arrays', () => {
      expect(union([1, 2, 3], [2, 3, 4])).toEqual([1, 2, 3, 4]);
    });
  });

  describe('partition', () => {
    it('should partition array based on predicate', () => {
      const [even, odd] = partition([1, 2, 3, 4, 5], n => n % 2 === 0);
      expect(even).toEqual([2, 4]);
      expect(odd).toEqual([1, 3, 5]);
    });
  });
});

import { delay, timeout, retry, race, all, allSettled, any, map, mapSeries, filter, reduce, find, some, every, forEach, parallel, series, waterfall } from '../../utils/asyncUtils';

describe('asyncUtils', () => {
  describe('delay', () => {
    it('should delay execution', async () => {
      const start = Date.now();
      await delay(100);
      const end = Date.now();
      expect(end - start).toBeGreaterThanOrEqual(100);
    });
  });

  describe('timeout', () => {
    it('should timeout slow operations', async () => {
      const slowFn = () => new Promise(resolve => setTimeout(resolve, 200));
      
      await expect(timeout(slowFn(), 100)).rejects.toThrow('Operation timed out');
    });
  });

  describe('retry', () => {
    it('should retry on failure', async () => {
      let attemptCount = 0;
      const failingFn = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Failed');
        }
        return 'success';
      };

      const result = await retry(failingFn, 3, 10);
      expect(result).toBe('success');
      expect(attemptCount).toBe(3);
    });
  });

  describe('race', () => {
    it('should return first resolved promise', async () => {
      const promises = [
        delay(100).then(() => 'slow'),
        delay(50).then(() => 'fast'),
      ];
      
      const result = await race(promises);
      expect(result).toBe('fast');
    });
  });

  describe('all', () => {
    it('should wait for all promises', async () => {
      const promises = [
        delay(50).then(() => 1),
        delay(100).then(() => 2),
      ];
      
      const result = await all(promises);
      expect(result).toEqual([1, 2]);
    });
  });

  describe('allSettled', () => {
    it('should wait for all promises to settle', async () => {
      const promises = [
        Promise.resolve(1),
        Promise.reject(new Error('Failed')),
      ];
      
      const result = await allSettled(promises);
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('fulfilled');
      expect(result[1].status).toBe('rejected');
    });
  });

  describe('any', () => {
    it('should return first fulfilled promise', async () => {
      const promises = [
        Promise.reject(new Error('Failed')),
        delay(50).then(() => 'success'),
      ];
      
      const result = await any(promises);
      expect(result).toBe('success');
    });
  });

  describe('map', () => {
    it('should map array with async function', async () => {
      const array = [1, 2, 3];
      const result = await map(array, async (n) => n * 2);
      expect(result).toEqual([2, 4, 6]);
    });
  });

  describe('mapSeries', () => {
    it('should map array serially', async () => {
      const array = [1, 2, 3];
      const result = await mapSeries(array, async (n) => n * 2);
      expect(result).toEqual([2, 4, 6]);
    });
  });

  describe('filter', () => {
    it('should filter array with async function', async () => {
      const array = [1, 2, 3, 4, 5];
      const result = await filter(array, async (n) => n % 2 === 0);
      expect(result).toEqual([2, 4]);
    });
  });

  describe('reduce', () => {
    it('should reduce array with async function', async () => {
      const array = [1, 2, 3, 4, 5];
      const result = await reduce(array, async (acc, n) => acc + n, 0);
      expect(result).toBe(15);
    });
  });

  describe('find', () => {
    it('should find first matching element', async () => {
      const array = [1, 2, 3, 4, 5];
      const result = await find(array, async (n) => n > 3);
      expect(result).toBe(4);
    });
  });

  describe('some', () => {
    it('should check if any element matches', async () => {
      const array = [1, 2, 3, 4, 5];
      const result = await some(array, async (n) => n > 3);
      expect(result).toBe(true);
    });
  });

  describe('every', () => {
    it('should check if all elements match', async () => {
      const array = [1, 2, 3, 4, 5];
      const result = await every(array, async (n) => n > 0);
      expect(result).toBe(true);
    });
  });

  describe('forEach', () => {
    it('should iterate over array', async () => {
      const array = [1, 2, 3];
      const result: number[] = [];
      await forEach(array, async (n) => {
        result.push(n);
      });
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('parallel', () => {
    it('should execute functions in parallel', async () => {
      const functions = [
        () => delay(50).then(() => 1),
        () => delay(100).then(() => 2),
      ];
      
      const result = await parallel(functions);
      expect(result).toEqual([1, 2]);
    });
  });

  describe('series', () => {
    it('should execute functions in series', async () => {
      const functions = [
        () => delay(50).then(() => 1),
        () => delay(100).then(() => 2),
      ];
      
      const result = await series(functions);
      expect(result).toEqual([1, 2]);
    });
  });

  describe('waterfall', () => {
    it('should execute functions in waterfall', async () => {
      const functions = [
        (result: any) => delay(50).then(() => ({ ...result, a: 1 })),
        (result: any) => delay(100).then(() => ({ ...result, b: 2 })),
      ];
      
      const result = await waterfall(functions);
      expect(result).toEqual({ a: 1, b: 2 });
    });
  });
});

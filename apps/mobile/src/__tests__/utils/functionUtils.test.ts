import { debounce, throttle, once, memoize, retry, timeout, sleep, random, clamp, lerp } from '../../utils/functionUtils';

describe('functionUtils', () => {
  describe('debounce', () => {
    it('should debounce function calls', async () => {
      let callCount = 0;
      const debouncedFn = debounce(() => {
        callCount++;
      }, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(callCount).toBe(0);

      await new Promise(resolve => setTimeout(resolve, 150));
      expect(callCount).toBe(1);
    });
  });

  describe('throttle', () => {
    it('should throttle function calls', async () => {
      let callCount = 0;
      const throttledFn = throttle(() => {
        callCount++;
      }, 100);

      throttledFn();
      throttledFn();
      throttledFn();

      expect(callCount).toBe(1);

      await new Promise(resolve => setTimeout(resolve, 150));
      throttledFn();
      expect(callCount).toBe(2);
    });
  });

  describe('once', () => {
    it('should call function only once', () => {
      let callCount = 0;
      const onceFn = once(() => {
        callCount++;
        return 'result';
      });

      expect(onceFn()).toBe('result');
      expect(onceFn()).toBe('result');
      expect(callCount).toBe(1);
    });
  });

  describe('memoize', () => {
    it('should memoize function results', () => {
      let callCount = 0;
      const memoizedFn = memoize((n: number) => {
        callCount++;
        return n * 2;
      });

      expect(memoizedFn(5)).toBe(10);
      expect(memoizedFn(5)).toBe(10);
      expect(callCount).toBe(1);
    });
  });

  describe('retry', () => {
    it('should retry function on failure', async () => {
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

  describe('timeout', () => {
    it('should timeout slow operations', async () => {
      const slowFn = () => new Promise(resolve => setTimeout(resolve, 200));
      
      await expect(timeout(slowFn(), 100)).rejects.toThrow('Operation timed out');
    });
  });

  describe('sleep', () => {
    it('should sleep for specified duration', async () => {
      const start = Date.now();
      await sleep(100);
      const end = Date.now();
      expect(end - start).toBeGreaterThanOrEqual(100);
    });
  });

  describe('random', () => {
    it('should generate random numbers in range', () => {
      const result = random(1, 10);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(10);
    });
  });

  describe('clamp', () => {
    it('should clamp values to range', () => {
      expect(clamp(5, 1, 10)).toBe(5);
      expect(clamp(0, 1, 10)).toBe(1);
      expect(clamp(15, 1, 10)).toBe(10);
    });
  });

  describe('lerp', () => {
    it('should interpolate between values', () => {
      expect(lerp(0, 10, 0.5)).toBe(5);
      expect(lerp(0, 10, 0)).toBe(0);
      expect(lerp(0, 10, 1)).toBe(10);
    });
  });
});

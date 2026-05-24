import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { debounce, throttle, debounceAsync } from '../../../core/debounce';

describe('Debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should debounce function calls', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn('arg1');
    debouncedFn('arg2');
    debouncedFn('arg3');

    expect(mockFn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('arg3');
  });

  it('should throttle function calls', () => {
    const mockFn = jest.fn();
    const throttledFn = throttle(mockFn, 100);

    throttledFn('arg1');
    throttledFn('arg2');
    throttledFn('arg3');

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('arg1');

    jest.advanceTimersByTime(100);
    throttledFn('arg4');
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenCalledWith('arg4');
  });

  it('should debounce async function calls', async () => {
    const mockAsyncFn = jest.fn().mockResolvedValue('result');
    const debouncedAsyncFn = debounceAsync(mockAsyncFn, 100);

    const promise1 = debouncedAsyncFn('arg1');
    const promise2 = debouncedAsyncFn('arg2');
    const promise3 = debouncedAsyncFn('arg3');

    expect(mockAsyncFn).not.toHaveBeenCalled();

    // Advance timers and wait for promises
    jest.advanceTimersByTime(100);
    
    // Wait for all promises to resolve
    const results = await Promise.all([promise1, promise2, promise3]);

    expect(mockAsyncFn).toHaveBeenCalledTimes(1);
    expect(mockAsyncFn).toHaveBeenCalledWith('arg3');
    expect(results).toEqual(['result', 'result', 'result']);
  }, 10000);
});

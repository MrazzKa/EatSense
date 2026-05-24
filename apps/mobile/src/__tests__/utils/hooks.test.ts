import { renderHook, act } from '@testing-library/react';
import { useDebounce, useThrottle, usePrevious, useToggle, useCounter, useLocalStorage, useSessionStorage, useAsync, useInterval, useTimeout, useKeyPress, useWindowSize } from '../../utils/hooks';

describe('hooks', () => {
  describe('useDebounce', () => {
    it('should debounce values', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'test', delay: 100 } }
      );

      expect(result.current).toBe('test');

      rerender({ value: 'test2', delay: 100 });
      expect(result.current).toBe('test');

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current).toBe('test2');
    });
  });

  describe('useThrottle', () => {
    it('should throttle function calls', () => {
      const mockFn = jest.fn();
      const { result } = renderHook(() => useThrottle(mockFn, 100));

      act(() => {
        result.current();
        result.current();
        result.current();
      });

      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('usePrevious', () => {
    it('should return previous value', () => {
      const { result, rerender } = renderHook(
        ({ value }) => usePrevious(value),
        { initialProps: { value: 'test' } }
      );

      expect(result.current).toBeUndefined();

      rerender({ value: 'test2' });
      expect(result.current).toBe('test');
    });
  });

  describe('useToggle', () => {
    it('should toggle boolean value', () => {
      const { result } = renderHook(() => useToggle(false));

      expect(result.current[0]).toBe(false);

      act(() => {
        result.current[1]();
      });

      expect(result.current[0]).toBe(true);
    });
  });

  describe('useCounter', () => {
    it('should manage counter state', () => {
      const { result } = renderHook(() => useCounter(0));

      expect(result.current[0]).toBe(0);

      act(() => {
        result.current[1](); // increment
      });

      expect(result.current[0]).toBe(1);

      act(() => {
        result.current[2](); // decrement
      });

      expect(result.current[0]).toBe(0);

      act(() => {
        result.current[3](); // reset
      });

      expect(result.current[0]).toBe(0);
    });
  });

  describe('useLocalStorage', () => {
    it('should manage localStorage', () => {
      const { result } = renderHook(() => useLocalStorage('test', 'initial'));

      expect(result.current[0]).toBe('initial');

      act(() => {
        result.current[1]('updated');
      });

      expect(result.current[0]).toBe('updated');
    });
  });

  describe('useSessionStorage', () => {
    it('should manage sessionStorage', () => {
      const { result } = renderHook(() => useSessionStorage('test', 'initial'));

      expect(result.current[0]).toBe('initial');

      act(() => {
        result.current[1]('updated');
      });

      expect(result.current[0]).toBe('updated');
    });
  });

  describe('useAsync', () => {
    it('should handle async operations', async () => {
      const asyncFunction = jest.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useAsync(asyncFunction, false));

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBeNull();

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBe('result');
    });
  });

  describe('useInterval', () => {
    it('should set up interval', () => {
      const mockCallback = jest.fn();
      renderHook(() => useInterval(mockCallback, 1000));

      expect(mockCallback).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('useTimeout', () => {
    it('should set up timeout', () => {
      const mockCallback = jest.fn();
      renderHook(() => useTimeout(mockCallback, 1000));

      expect(mockCallback).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('useKeyPress', () => {
    it('should handle key press events', () => {
      const mockCallback = jest.fn();
      renderHook(() => useKeyPress('Enter', mockCallback));

      expect(mockCallback).not.toHaveBeenCalled();

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        document.dispatchEvent(event);
      });

      expect(mockCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('useWindowSize', () => {
    it('should track window size', () => {
      const { result } = renderHook(() => useWindowSize());

      expect(result.current.width).toBe(window.innerWidth);
      expect(result.current.height).toBe(window.innerHeight);
    });
  });
});

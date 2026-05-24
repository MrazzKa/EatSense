import { useState, useEffect, useRef, useCallback } from 'react';
import type { RefObject } from 'react';

const hasWindow = typeof window !== 'undefined';
const hasDocument = typeof document !== 'undefined';
const getLocalStorage = (): Storage | null =>
  hasWindow && 'localStorage' in window ? window.localStorage : null;
const getSessionStorage = (): Storage | null =>
  hasWindow && 'sessionStorage' in window ? window.sessionStorage : null;

export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const useThrottle = <T extends (..._args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastRun = useRef(0);
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const throttled = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastRun.current >= delay) {
        lastRun.current = now;
        savedCallback.current(...args);
      }
    },
    [delay]
  );

  return throttled as unknown as T;
};

export const usePrevious = <T>(value: T): T | undefined => {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
};

export const useToggle = (initialValue: boolean = false): [boolean, () => void] => {
  const [value, setValue] = useState(initialValue);
  
  const toggle = useCallback(() => {
    setValue(prev => !prev);
  }, []);
  
  return [value, toggle];
};

export const useCounter = (initialValue: number = 0): [number, () => void, () => void, () => void] => {
  const [count, setCount] = useState(initialValue);
  
  const increment = useCallback(() => {
    setCount(prev => prev + 1);
  }, []);
  
  const decrement = useCallback(() => {
    setCount(prev => prev - 1);
  }, []);
  
  const reset = useCallback(() => {
    setCount(initialValue);
  }, [initialValue]);
  
  return [count, increment, decrement, reset];
};

const readStorageValue = <T>(storage: Storage | null, key: string, initialValue: T): T => {
  if (!storage) {
    return initialValue;
  }
  try {
    const item = storage.getItem(key);
    return item ? (JSON.parse(item) as T) : initialValue;
  } catch (error) {
    console.error(`Error reading storage key "${key}":`, error);
    return initialValue;
  }
};

const writeStorageValue = <T>(storage: Storage | null, key: string, value: T) => {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting storage key "${key}":`, error);
  }
};

export const useLocalStorage = <T>(key: string, initialValue: T): [T, (_value: T) => void] => {
  const storage = getLocalStorage();
  const [storedValue, setStoredValue] = useState<T>(() => readStorageValue(storage, key, initialValue));

  const setValue = useCallback(
    (value: T) => {
      setStoredValue(value);
      writeStorageValue(storage, key, value);
    },
    [key, storage]
  );

  return [storedValue, setValue];
};

export const useSessionStorage = <T>(key: string, initialValue: T): [T, (_value: T) => void] => {
  const storage = getSessionStorage();
  const [storedValue, setStoredValue] = useState<T>(() => readStorageValue(storage, key, initialValue));

  const setValue = useCallback(
    (value: T) => {
      setStoredValue(value);
      writeStorageValue(storage, key, value);
    },
    [key, storage]
  );

  return [storedValue, setValue];
};

export const useAsync = <T, E = string>(
  asyncFunction: () => Promise<T>,
  immediate: boolean = true
): {
  execute: () => Promise<void>;
  loading: boolean;
  data: T | null;
  error: E | null;
} => {
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<E | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await asyncFunction();
      setData(response);
    } catch (err) {
      setError(err as E);
    } finally {
      setLoading(false);
    }
  }, [asyncFunction]);

  useEffect(() => {
    if (immediate) {
      void execute();
    }
  }, [execute, immediate]);

  return { execute, loading, data, error };
};

export const useInterval = (callback: () => void, delay: number | null) => {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) {
      return;
    }

    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
};

export const useTimeout = (callback: () => void, delay: number | null) => {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) {
      return;
    }

    const id = setTimeout(() => savedCallback.current(), delay);
    return () => clearTimeout(id);
  }, [delay]);
};

export const useOnClickOutside = <T extends HTMLElement>(
  ref: RefObject<T>,
  handler: (_event: MouseEvent | TouchEvent) => void
) => {
  useEffect(() => {
    if (!hasDocument) {
      return undefined;
    }

    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
};

export const useKeyPress = (targetKey: string, callback: () => void) => {
  useEffect(() => {
    if (!hasWindow) {
      return undefined;
    }
    const handler = (event: KeyboardEvent) => {
      if (event.key === targetKey) {
        callback();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [targetKey, callback]);
};

export const useWindowSize = () => {
  const getSize = () => ({
    width: hasWindow ? window.innerWidth : 0,
    height: hasWindow ? window.innerHeight : 0,
  });

  const [windowSize, setWindowSize] = useState(getSize);

  useEffect(() => {
    if (!hasWindow) {
      return undefined;
    }
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};
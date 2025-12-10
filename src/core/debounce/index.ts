export const debounce = <T extends (..._args: any[]) => any>(
  func: T,
  wait: number
): ((..._args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (..._args: any[]) => any>(
  func: T,
  limit: number
): ((..._args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

export const debounceAsync = <T extends (..._args: any[]) => Promise<any>>(
  func: T,
  wait: number
): ((..._args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>) => {
  let timeout: ReturnType<typeof setTimeout>;
  let currentPromise: Promise<Awaited<ReturnType<T>>> | null = null;
  
  return (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    return new Promise((resolve, reject) => {
      clearTimeout(timeout);
      
      timeout = setTimeout(async () => {
        try {
          if (currentPromise) {
            const result = await currentPromise;
            resolve(result);
          } else {
            currentPromise = func(...args);
            const result = await currentPromise;
            currentPromise = null;
            resolve(result);
          }
        } catch (error) {
          currentPromise = null;
          reject(error);
        }
      }, wait);
    });
  };
};

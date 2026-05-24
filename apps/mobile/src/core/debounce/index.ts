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
  let pendingResolvers: Array<(_value: Awaited<ReturnType<T>>) => void> = [];
  let pendingRejectors: Array<(_error: any) => void> = [];
  let currentArgs: Parameters<T> | null = null;
  
  return (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    return new Promise((resolve, reject) => {
      clearTimeout(timeout);
      
      // Store resolve/reject functions for all pending calls
      pendingResolvers.push(resolve);
      pendingRejectors.push(reject);
      currentArgs = args;
      
      timeout = setTimeout(async () => {
        try {
          const result = await func(...currentArgs!);
          
          // Resolve all pending promises with the same result
          pendingResolvers.forEach(resolveFn => resolveFn(result));
          pendingResolvers = [];
          pendingRejectors = [];
        } catch (error) {
          // Reject all pending promises with the same error
          pendingRejectors.forEach(rejectFn => rejectFn(error));
          pendingResolvers = [];
          pendingRejectors = [];
        }
      }, wait);
    });
  };
};

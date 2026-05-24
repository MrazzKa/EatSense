export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const timeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Operation timed out'));
    }, ms);
    
    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timer));
  });
};

export const retry = async <T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await delay(delayMs);
      return retry(fn, retries - 1, delayMs * 2);
    }
    throw error;
  }
};

export const race = <T>(_promises: Promise<T>[]): Promise<T> => {
  return Promise.race(_promises);
};

export const all = <T>(_promises: Promise<T>[]): Promise<T[]> => {
  return Promise.all(_promises);
};

export const allSettled = <T>(_promises: Promise<T>[]): Promise<PromiseSettledResult<T>[]> => {
  return Promise.allSettled(_promises);
};

export const any = <T>(_promises: Promise<T>[]): Promise<T> => {
  return Promise.any(_promises);
};

export const map = async <T, U>(
  array: T[],
  fn: (_item: T, _index: number) => Promise<U>
): Promise<U[]> => {
  if (!Array.isArray(array)) {
    return [];
  }
  return Promise.all(array.map(fn));
};

export const mapSeries = async <T, U>(
  array: T[],
  fn: (_item: T, _index: number) => Promise<U>
): Promise<U[]> => {
  const results: U[] = [];
  for (let i = 0; i < array.length; i++) {
    results.push(await fn(array[i], i));
  }
  return results;
};

export const filter = async <T>(
  array: T[],
  fn: (_item: T, _index: number) => Promise<boolean>
): Promise<T[]> => {
  const results: T[] = [];
  for (let i = 0; i < array.length; i++) {
    if (await fn(array[i], i)) {
      results.push(array[i]);
    }
  }
  return results;
};

export const reduce = async <T, U>(
  array: T[],
  fn: (_acc: U, _item: T, _index: number) => Promise<U>,
  initial: U
): Promise<U> => {
  let acc = initial;
  for (let i = 0; i < array.length; i++) {
    acc = await fn(acc, array[i], i);
  }
  return acc;
};

export const find = async <T>(
  array: T[],
  fn: (_item: T, _index: number) => Promise<boolean>
): Promise<T | undefined> => {
  for (let i = 0; i < array.length; i++) {
    if (await fn(array[i], i)) {
      return array[i];
    }
  }
  return undefined;
};

export const some = async <T>(
  array: T[],
  fn: (_item: T, _index: number) => Promise<boolean>
): Promise<boolean> => {
  for (let i = 0; i < array.length; i++) {
    if (await fn(array[i], i)) {
      return true;
    }
  }
  return false;
};

export const every = async <T>(
  array: T[],
  fn: (_item: T, _index: number) => Promise<boolean>
): Promise<boolean> => {
  for (let i = 0; i < array.length; i++) {
    if (!(await fn(array[i], i))) {
      return false;
    }
  }
  return true;
};

export const forEach = async <T>(
  array: T[],
  fn: (_item: T, _index: number) => Promise<void>
): Promise<void> => {
  for (let i = 0; i < array.length; i++) {
    await fn(array[i], i);
  }
};

export const parallel = async <T>(
  functions: (() => Promise<T>)[]
): Promise<T[]> => {
  if (!Array.isArray(functions)) {
    return [];
  }
  return Promise.all(functions.map(fn => fn && typeof fn === 'function' ? fn() : Promise.resolve(null as T)));
};

export const series = async <T>(
  functions: (() => Promise<T>)[]
): Promise<T[]> => {
  const results: T[] = [];
  for (const fn of functions) {
    results.push(await fn());
  }
  return results;
};

export const waterfall = async <T>(
  functions: ((_result: T) => Promise<T>)[]
): Promise<T> => {
  let currentResult: T = {} as T;
  for (const fn of functions) {
    currentResult = await fn(currentResult);
  }
  return currentResult;
};
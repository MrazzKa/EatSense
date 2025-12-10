export const chunk = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

export const unique = <T>(array: T[]): T[] => {
  return [...new Set(array)];
};

export const uniqueBy = <T, K>(array: T[], key: (_item: T) => K): T[] => {
  const seen = new Set<K>();
  return array.filter(item => {
    const k = key(item);
    if (seen.has(k)) {
      return false;
    }
    seen.add(k);
    return true;
  });
};

export const groupBy = <T, K>(array: T[], key: (_item: T) => K): Map<K, T[]> => {
  const groups = new Map<K, T[]>();
  for (const item of array) {
    const k = key(item);
    if (!groups.has(k)) {
      groups.set(k, []);
    }
    groups.get(k)!.push(item);
  }
  return groups;
};

export const sortBy = <T>(array: T[], key: (_item: T) => any): T[] => {
  return [...array].sort((a, b) => {
    const aVal = key(a);
    const bVal = key(b);
    if (aVal < bVal) return -1;
    if (aVal > bVal) return 1;
    return 0;
  });
};

export const sortByDesc = <T>(array: T[], key: (_item: T) => any): T[] => {
  return [...array].sort((a, b) => {
    const aVal = key(a);
    const bVal = key(b);
    if (aVal > bVal) return -1;
    if (aVal < bVal) return 1;
    return 0;
  });
};

export const shuffle = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const sample = <T>(array: T[], n: number = 1): T[] => {
  const shuffled = shuffle(array);
  return shuffled.slice(0, n);
};

export const flatten = <T>(array: T[][]): T[] => {
  return array.reduce((acc, val) => acc.concat(val), []);
};

export const flattenDeep = <T>(array: any[]): T[] => {
  return array.reduce((acc, val) => 
    Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val), []
  );
};

export const intersection = <T>(array1: T[], array2: T[]): T[] => {
  return array1.filter(item => array2.includes(item));
};

export const difference = <T>(array1: T[], array2: T[]): T[] => {
  return array1.filter(item => !array2.includes(item));
};

export const union = <T>(array1: T[], array2: T[]): T[] => {
  return unique([...array1, ...array2]);
};

export const partition = <T>(array: T[], predicate: (_item: T) => boolean): [T[], T[]] => {
  const pass: T[] = [];
  const fail: T[] = [];
  for (const item of array) {
    if (predicate(item)) {
      pass.push(item);
    } else {
      fail.push(item);
    }
  }
  return [pass, fail];
};
export type NutritionProviderId =
  | 'usda'
  | 'swiss'
  | 'openfoodfacts'
  | 'rag'
  | 'eurofir'
  | 'fao_who_ref';

export type NutritionCategory = 'drink' | 'solid' | 'unknown';

export interface CanonicalNutrients {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugars?: number;
  satFat?: number;
  sodium?: number;
}

export interface CanonicalFood {
  providerId: NutritionProviderId;
  providerFoodId: string; // fdcId, swiss DBID, OFF barcode и т.п.
  // Строка, максимально похожая на то, что видит пользователь
  displayName: string;
  // Оригинальное название из Vision / текста
  originalQuery: string;
  // 'drink' | 'solid' | 'unknown'
  category: NutritionCategory;
  // Нутриенты строго "на 100 г / 100 мл" в метрической системе:
  per100g: CanonicalNutrients;
  // Базовый рекомендованный размер порции (граммы или миллилитры).
  defaultPortionG?: number;
  // Любая мета-информация (JSON)
  meta?: Record<string, any>;
}

export interface NutritionLookupContext {
  locale: 'en' | 'ru' | 'kk';
  region?: 'US' | 'CH' | 'EU' | 'OTHER';
  expectedCategory?: NutritionCategory;
}

export interface NutritionProviderResult {
  food: CanonicalFood | null;
  confidence: number; // 0..1
  // признак, что провайдер считает результат "подозрительным"
  isSuspicious?: boolean;
  debug?: Record<string, any>;
}

export interface INutritionProvider {
  readonly id: NutritionProviderId;

  isAvailable(context: NutritionLookupContext): Promise<boolean> | boolean;

  getPriority(context: NutritionLookupContext): number;

  findByText(
    query: string,
    context: NutritionLookupContext,
  ): Promise<NutritionProviderResult | null>;

  getByBarcode?(
    barcode: string,
    context: NutritionLookupContext,
  ): Promise<NutritionProviderResult | null>;
}

// Legacy interfaces for backward compatibility during migration
export interface FoodMatch {
  id: string;
  name: string;
  description?: string;
  score: number;
  source: string;
  isDrink?: boolean;
  metadata?: Record<string, any>;
}

export interface FoodData {
  id: string;
  name: string;
  description?: string;
  nutrients: CanonicalNutrients;
  portionSize?: number;
  isDrink?: boolean;
  source: string;
  metadata?: Record<string, any>;
}

export interface NutritionSearchOptions {
  category?: NutritionCategory;
  region?: string | null;
  limit?: number;
}

// Legacy interface - will be removed after migration
export interface NutritionProvider {
  readonly id: string;
  isAvailable(region?: string | null): boolean;
  getPriority(region?: string | null): number;
  search(query: string, options?: NutritionSearchOptions): Promise<FoodMatch[]>;
  getById(id: string): Promise<FoodData | null>;
  getByBarcode?(barcode: string): Promise<FoodData | null>;
}

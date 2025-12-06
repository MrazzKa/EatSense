# Глубокий анализ пайплайна анализа пищи в EatSense

## Дата анализа: 2025-12-06
## Статус: Требуется рефакторинг архитектуры

---

## 1. ТЕКУЩАЯ АРХИТЕКТУРА ПАЙПЛАЙНА

### 1.1. Общий поток анализа

```
Image Upload
    ↓
FoodProcessor.handleImageAnalysis()
    ↓
AnalyzeService.analyzeImage()
    ↓
VisionService.extractComponents() [OpenAI Vision]
    ↓
Для каждого компонента:
    ├─→ HybridService.findByText() [USDA FDC поиск]
    │   ├─→ Локальная БД (PostgreSQL FTS)
    │   └─→ USDA API (fallback)
    │
    ├─→ Если найдено: getFoodNormalized() → calculateNutrientsForPortion()
    │
    └─→ Если НЕ найдено: addVisionFallback() [ЭВРИСТИКИ]
```

### 1.2. Ключевые компоненты

#### **VisionService** (`apps/api/src/analysis/vision.service.ts`)
- **Назначение**: Извлечение компонентов пищи из изображения через OpenAI Vision
- **Что возвращает**: Только структурированные данные:
  ```typescript
  {
    name: string,           // Название продукта (например, "grilled chicken breast")
    preparation: string,    // Способ приготовления (grilled, boiled, etc.)
    est_portion_g: number, // Примерный вес в граммах
    confidence: number      // Уверенность (0-1)
  }
  ```
- **КРИТИЧНО**: OpenAI Vision НЕ возвращает калории или нутриенты. Промпт явно просит только название, способ приготовления и вес.
- **Проблема**: НЕТ. OpenAI не галлюцинирует нутриенты, потому что их не просит.

#### **HybridService** (`apps/api/src/fdc/hybrid/hybrid.service.ts`)
- **Назначение**: Поиск продуктов в USDA FDC по текстовому запросу
- **Приоритеты поиска**:
  1. Локальная БД PostgreSQL (FTS - Full Text Search)
  2. USDA API (fallback если локально не найдено)
- **Типы данных**:
  - `Branded` (приоритет 4)
  - `Foundation` (приоритет 3)
  - `FNDDS` (приоритет 2)
  - `SR Legacy` (приоритет 1)
- **Проблема**: Жестко завязан на USDA. Нет поддержки других провайдеров.

#### **AnalyzeService** (`apps/api/src/analysis/analyze.service.ts`)
- **Назначение**: Оркестрация всего процесса анализа
- **Ключевые методы**:
  - `analyzeImage()` - основной метод для анализа изображений
  - `analyzeText()` - анализ текстового описания
  - `addVisionFallback()` - **КРИТИЧЕСКИЙ МЕТОД** - используется когда FDC не находит совпадение
  - `calculateNutrientsForPortion()` - пересчет нутриентов на порцию
  - `computeHealthScore()` - расчет HealthScore

#### **OpenFoodFactsService** (`apps/api/src/openfoodfacts/openfoodfacts.service.ts`)
- **Назначение**: Поиск продуктов по штрихкоду в OpenFoodFacts
- **Статус**: ✅ Реализован, но **НЕ ИНТЕГРИРОВАН** в пайплайн анализа
- **TODO в коде**: "Currently NOT integrated into the image analysis flow"

---

## 2. ПРОБЛЕМЫ И АНАЛИЗ

### 2.1. "Галлюцинации OpenAI Vision" - МИФ ИЛИ РЕАЛЬНОСТЬ?

**ВЫВОД: Это НЕ галлюцинации OpenAI, а эвристики в коде.**

#### Почему это не галлюцинации:
1. **VisionService НЕ запрашивает нутриенты**:
   - Промпт просит только: `name`, `preparation`, `est_portion_g`, `confidence`
   - Нет запроса калорий, белков, жиров, углеводов

2. **Откуда берутся неправильные значения**:
   - Когда FDC не находит совпадение, вызывается `addVisionFallback()`
   - Этот метод использует **жестко заданные эвристики**:
     ```typescript
     // Строка 1047 в analyze.service.ts
     calories: Math.round(fallbackPortion * 1.2), // 1.2 ккал/г
     protein: this.round(fallbackPortion * 0.04, 1), // 4г/100г
     carbs: this.round(fallbackPortion * 0.15, 1), // 15г/100г
     fat: this.round(fallbackPortion * 0.06, 1), // 6г/100г
     ```
   - Эти эвристики **не учитывают тип продукта** (вода, кофе, капучино)
   - Для воды есть специальная обработка (строки 1018-1043), но она срабатывает только если `isPlainWater()` вернет `true`

#### Реальные проблемы:
1. **Вода показывает 180 ккал**:
   - Если `isPlainWater()` не сработал (неправильное название от Vision)
   - Или если FDC нашел неправильное совпадение (например, "water" → "coconut water")
   - Тогда используется либо FDC данные, либо fallback эвристики

2. **Черный кофе показывает >50 ккал**:
   - FDC может найти неправильное совпадение (например, "coffee" → "coffee with cream")
   - Или fallback эвристики применяются к кофе как к обычной еде

3. **Капучино показывает ~1500 ккал**:
   - Скорее всего FDC нашел неправильное совпадение
   - Или порция оценена неправильно (например, 1000г вместо 250мл)

### 2.2. Проблема жесткой привязки к USDA

**Текущая реализация:**
- `HybridService` работает только с USDA FDC
- Нет абстракции провайдеров
- Невозможно добавить Swiss Food DB без изменения `HybridService`
- Нет региональных приоритетов

**Код подтверждает это:**
```typescript
// hybrid.service.ts, строка 26
async findByText(query: string, k = 10, minScore = 0.6, expectedCategory?: 'drink' | 'solid' | 'unknown'): Promise<any[]> {
  // Сначала локальная БД (USDA данные)
  const results = await this.textSearch(normalizedQuery, k * 2);
  // Потом USDA API
  return await this.apiFallback(normalizedQuery, k);
}
```

### 2.3. Отсутствие двухэтапного пайплайна

**Текущий пайплайн:**
1. Vision извлекает компоненты
2. Для каждого компонента ищется совпадение в FDC
3. Если найдено - используются FDC нутриенты
4. Если НЕ найдено - используются эвристики

**Проблема:** Vision используется только для распознавания, но система не разделяет этапы четко.

**Что должно быть:**
1. **Этап 1 - Распознавание**: Vision возвращает только название, категорию, вес
2. **Этап 2 - Получение нутриентов**: По названию ищутся данные в провайдерах (Swiss DB, USDA, OFF, RAG)

### 2.4. OpenFoodFacts не интегрирован

**Статус:**
- ✅ Сервис реализован (`OpenFoodFactsService`)
- ❌ НЕ используется в пайплайне анализа
- ❌ Нет поиска по названию (только по штрихкоду)
- ❌ Нет интеграции с `AnalyzeService`

**Код:**
```typescript
// openfoodfacts.service.ts, строки 8-15
/**
 * This is a scaffold for future barcode-based product lookup features.
 * Currently NOT integrated into the image analysis flow.
 * 
 * TODO: When implementing barcode scanning, use this service to:
 * - Look up products by barcode
 * - Extract nutrition data from OpenFoodFacts
 * - Merge with existing FDC matching logic if needed
 */
```

---

## 3. ДЕТАЛЬНЫЙ АНАЛИЗ КОДА

### 3.1. Метод `addVisionFallback()` - источник проблем

**Расположение:** `apps/api/src/analysis/analyze.service.ts`, строки 994-1078

**Когда вызывается:**
1. FDC не нашел совпадение (`matches.length === 0`)
2. Низкий score совпадения (`bestMatch.score < 0.7`)
3. Нет текстового overlap между Vision названием и FDC описанием
4. Ошибка при обработке компонента

**Что делает:**
```typescript
// Строки 1046-1055
fallbackNutrients = {
  calories: Math.round(fallbackPortion * 1.2), // 1.2 ккал/г
  protein: this.round(fallbackPortion * 0.04, 1), // 4г/100г
  carbs: this.round(fallbackPortion * 0.15, 1), // 15г/100г
  fat: this.round(fallbackPortion * 0.06, 1), // 6г/100г
  fiber: 0,
  sugars: 0,
  satFat: 0,
  energyDensity: 120, // 120 ккал/100г
};
```

**Проблемы:**
- Эвристики не учитывают тип продукта
- Для напитков (кофе, вода) используются те же коэффициенты, что и для твердой пищи
- Нет проверки на категорию продукта перед применением эвристик

**Специальная обработка воды:**
- Есть проверка `isPlainWater()` (строки 1018-1043)
- Если вода обнаружена, устанавливаются нулевые нутриенты
- **НО**: Если Vision вернул неправильное название (например, "beverage" вместо "water"), проверка не сработает

### 3.2. Метод `isPlainWater()` - текущая реализация

**Расположение:** `apps/api/src/analysis/analyze.service.ts`, строки 63-94

**Логика:**
```typescript
private isPlainWater(name: string): boolean {
  const nameLower = name.toLowerCase().trim();
  
  // Положительные индикаторы
  const waterKeywords = [
    'water', 'still water', 'sparkling water', 'mineral water',
    'вода', 'минеральная вода', 'газированная вода'
  ];
  
  // Отрицательные индикаторы (исключения)
  const excludeKeywords = [
    'juice', 'cola', 'soda', 'lemonade', 'sweet', 'syrup',
    'сок', 'лимонад', 'газировка', 'со вкусом', 'подслащ'
  ];
  
  const hasWaterKeyword = waterKeywords.some(kw => nameLower.includes(kw));
  const hasExcludeKeyword = excludeKeywords.some(kw => nameLower.includes(kw));
  
  return hasWaterKeyword && !hasExcludeKeyword;
}
```

**Проблемы:**
- Зависит от точности названия от Vision
- Если Vision вернул "beverage" или "drink", проверка не сработает
- Нет проверки на основе визуальных признаков

### 3.3. FDC Matching - как работает поиск

**Расположение:** `apps/api/src/fdc/hybrid/hybrid.service.ts`

**Процесс:**
1. **Локальный поиск** (строки 49-107):
   - PostgreSQL FTS (Full Text Search)
   - Поиск по `search_vector` (tsvector)
   - Если FTS недоступен, fallback на ILIKE

2. **Reranking** (строки 134-200):
   - Приоритет по `dataType` (Branded > Foundation > FNDDS > SR Legacy)
   - Проверка на dessert/yogurt vs coffee/tea
   - Применение penalties для несоответствий

3. **API Fallback** (строки 180-212):
   - Если локально не найдено, запрос к USDA API
   - Сохранение результатов в локальную БД

**Проблемы:**
- Нет проверки на региональность (всегда USDA)
- Нет fallback на другие провайдеры (Swiss DB, OFF)
- Reranking может выбрать неправильное совпадение для напитков

### 3.4. Расчет нутриентов для порции

**Метод:** `calculateNutrientsForPortion()` (строки 934-1000)

**Логика:**
```typescript
// FDC нутриенты всегда на 100г
const scale = portionG / 100;
const base = normalized.nutrients || {};

let calculatedCalories = Math.round(baseCalories * scale);
let calculatedProtein = this.round((base.protein || 0) * scale, 1);
// ... и т.д.
```

**Проблемы:**
- Если `normalized.nutrients` содержит неправильные данные (например, для неправильного FDC совпадения), они просто масштабируются
- Нет валидации данных перед расчетом
- Нет проверки на разумность результата

---

## 4. ПОДТВЕРЖДЕНИЕ ПРОБЛЕМ ИЗ СВОДКИ РУКОВОДИТЕЛЯ

### 4.1. "Вода показывает 180 ккал"

**Причины:**
1. Vision вернул название, которое не распознается как вода (`isPlainWater()` вернул `false`)
2. FDC нашел неправильное совпадение (например, "water" → "coconut water" или "flavored water")
3. Fallback эвристики применились к воде как к обычной еде

**Код подтверждает:**
- Строка 256: `await this.addVisionFallback(component, items, debug, locale);` - вызывается когда FDC не находит совпадение
- Строка 1047: `calories: Math.round(fallbackPortion * 1.2)` - если порция 150г, получится 180 ккал

### 4.2. "Черный кофе показывает >50 ккал"

**Причины:**
1. FDC нашел неправильное совпадение (например, "coffee" → "coffee with cream and sugar")
2. Fallback эвристики применились (150г * 1.2 = 180 ккал, но может быть меньше если порция меньше)

**Код подтверждает:**
- Строка 125-132: `isLikelyPlainCoffeeOrTea()` проверяет только описание FDC, но не предотвращает неправильное совпадение
- Нет специальной обработки для черного кофе в `addVisionFallback()`

### 4.3. "Капучино показывает ~1500 ккал"

**Причины:**
1. Неправильная оценка порции (например, 1000г вместо 250мл)
2. FDC нашел неправильное совпадение с высокими калориями
3. Комбинация нескольких компонентов с неправильными данными

**Код подтверждает:**
- Строка 132: `est_portion_g` от Vision может быть неправильным
- Строка 335: `estimatePortionInGrams()` использует `est_portion_g` от Vision, но с clamping (10-800г)
- Если Vision вернул 1000г для капучино, оно будет заклэмплено до 800г, но все равно даст высокие калории

---

## 5. АРХИТЕКТУРНЫЕ ПРОБЛЕМЫ

### 5.1. Отсутствие слоя провайдеров

**Текущая структура:**
```
AnalyzeService
    ↓
HybridService (только USDA)
    ├─→ PostgreSQL (USDA данные)
    └─→ USDA API
```

**Что нужно:**
```
AnalyzeService
    ↓
NutritionOrchestrator
    ├─→ SwissFoodProvider (для CH)
    ├─→ USDAProvider (для US)
    ├─→ OpenFoodFactsProvider (глобально)
    └─→ RAGProvider (fallback)
```

### 5.2. Нет региональных приоритетов

**Текущая реализация:**
- Всегда использует USDA
- Нет проверки региона пользователя
- Нет приоритизации провайдеров по региону

**Что нужно:**
- Пользователь из CH → Swiss Food DB в приоритете
- Пользователь из US → USDA в приоритете
- Глобальные провайдеры (OFF) как fallback

### 5.3. Нет четкого разделения этапов

**Текущий пайплайн:**
- Vision извлекает компоненты
- Сразу идет поиск в FDC
- Если не найдено - fallback

**Что нужно:**
- **Этап 1**: Vision только распознает (название, категория, вес)
- **Этап 2**: По названию ищутся нутриенты в провайдерах
- **Этап 3**: Валидация и применение предустановленных значений (вода, базовые напитки)

---

## 6. РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ

### 6.1. Этап 1: Исправить галлюцинации (КРИТИЧНО)

**Задачи:**
1. ✅ Улучшить `isPlainWater()` - добавить больше ключевых слов и проверок
2. ✅ Добавить предустановленные значения для базовых напитков:
   - Вода: 0 ккал
   - Черный кофе: 2-5 ккал
   - Капучино: 60-120 ккал (зависит от размера)
3. ✅ Улучшить fallback эвристики - учитывать категорию продукта
4. ✅ Добавить валидацию результатов перед возвратом

**Критерии приёмки:**
- ✅ Вода показывает 0 ккал
- ✅ Черный кофе показывает 2-5 ккал
- ✅ Капучино показывает 60-120 ккал
- ✅ Еда (курица, рис) использует данные USDA

### 6.2. Этап 2: Создать архитектуру провайдеров

**Задачи:**
1. Создать интерфейс `NutritionProvider`:
   ```typescript
   interface NutritionProvider {
     search(query: string, options?: SearchOptions): Promise<FoodMatch[]>;
     getById(id: string): Promise<FoodData | null>;
     isAvailable(region?: string): boolean;
     getByBarcode?(barcode: string): Promise<FoodData | null>;
   }
   ```

2. Создать `NutritionOrchestrator`:
   - Управляет провайдерами
   - Выбирает провайдера по региону и приоритету
   - Валидирует результаты
   - Логирует какой провайдер использован

3. Рефакторить `HybridService` → `USDAProvider`:
   - Вынести логику в отдельный провайдер
   - Реализовать интерфейс `NutritionProvider`

**Критерии приёмки:**
- ✅ Новый провайдер можно добавить без изменения `AnalyzeService`
- ✅ Есть логирование какой провайдер использован
- ✅ Система корректно выбирает провайдера по региону и приоритету

### 6.3. Этап 3: Добавить OpenFoodFacts

**Задачи:**
1. Расширить `OpenFoodFactsService`:
   - Добавить поиск по названию (не только по штрихкоду)
   - Парсинг нутриентов из OFF формата
   - Маппинг в единый формат `FoodData`

2. Создать `OpenFoodFactsProvider`:
   - Реализовать интерфейс `NutritionProvider`
   - Интегрировать с `OpenFoodFactsService`

3. Добавить в `NutritionOrchestrator`:
   - OpenFoodFacts как глобальный провайдер
   - Приоритет после региональных провайдеров

**Критерии приёмки:**
- ✅ Штрихкод возвращает данные из OpenFoodFacts
- ✅ Fallback на другие провайдеры работает если OFF не дал результата

### 6.4. Этап 4: Добавить Swiss Food DB

**Задачи:**
1. Изучить Swiss Food DB API/формат данных
2. Создать `SwissFoodProvider`:
   - Реализовать интерфейс `NutritionProvider`
   - Интеграция с Swiss Food DB

3. Добавить в `NutritionOrchestrator`:
   - Swiss Food DB для региона CH
   - Приоритет выше USDA для CH пользователей

**Критерии приёмки:**
- ✅ Пользователь с регионом CH получает данные из Swiss DB
- ✅ Пользователь с регионом US получает данные из USDA
- ✅ Выбор провайдера происходит автоматически

---

## 7. ПЛАН ВНЕДРЕНИЯ

### Фаза 1: Быстрые исправления (1-2 дня)
1. Улучшить обработку воды и базовых напитков
2. Добавить предустановленные значения
3. Улучшить fallback эвристики

### Фаза 2: Архитектура провайдеров (3-5 дней)
1. Создать интерфейс `NutritionProvider`
2. Создать `NutritionOrchestrator`
3. Рефакторить `HybridService` → `USDAProvider`
4. Интегрировать в `AnalyzeService`

### Фаза 3: OpenFoodFacts (2-3 дня)
1. Расширить `OpenFoodFactsService`
2. Создать `OpenFoodFactsProvider`
3. Интегрировать в оркестратор

### Фаза 4: Swiss Food DB (3-5 дней)
1. Изучить Swiss Food DB
2. Создать `SwissFoodProvider`
3. Интегрировать с региональной логикой

---

## 8. ВЫВОДЫ

### Подтвержденные проблемы:
1. ✅ **Вода показывает неправильные калории** - проблема в fallback эвристиках и неправильных FDC совпадениях
2. ✅ **Кофе/капучино показывают неправильные калории** - проблема в отсутствии специальной обработки напитков
3. ✅ **Жесткая привязка к USDA** - подтверждено, нет слоя провайдеров
4. ✅ **OpenFoodFacts не интегрирован** - подтверждено, только scaffold

### Не подтвержденные утверждения:
1. ❌ **"OpenAI галлюцинирует нутриенты"** - НЕВЕРНО. OpenAI не возвращает нутриенты, проблема в эвристиках кода

### Рекомендации:
1. **Немедленно**: Исправить обработку воды и базовых напитков
2. **Краткосрочно**: Создать архитектуру провайдеров
3. **Среднесрочно**: Интегрировать OpenFoodFacts и Swiss Food DB

---

## 9. ТЕХНИЧЕСКИЕ ДЕТАЛИ ДЛЯ РЕАЛИЗАЦИИ

### 9.1. Структура файлов после рефакторинга

```
apps/api/src/analysis/
    ├── analyze.service.ts (оркестрация)
    ├── vision.service.ts (без изменений)
    └── providers/
        ├── nutrition-provider.interface.ts (новый)
        ├── nutrition-orchestrator.service.ts (новый)
        ├── usda.provider.ts (рефакторинг из hybrid.service.ts)
        ├── swiss-food.provider.ts (новый)
        ├── open-food-facts.provider.ts (новый)
        └── rag.provider.ts (новый, опционально)
```

### 9.2. Интерфейс NutritionProvider

```typescript
export interface FoodMatch {
  id: string;
  name: string;
  description?: string;
  score: number;
  source: string;
  metadata?: Record<string, any>;
}

export interface FoodData {
  id: string;
  name: string;
  description?: string;
  nutrients: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugars?: number;
    satFat?: number;
  };
  portionSize?: number; // граммы
  source: string;
  metadata?: Record<string, any>;
}

export interface SearchOptions {
  category?: 'drink' | 'solid' | 'unknown';
  region?: string;
  limit?: number;
}

export interface NutritionProvider {
  /**
   * Поиск продуктов по текстовому запросу
   */
  search(query: string, options?: SearchOptions): Promise<FoodMatch[]>;
  
  /**
   * Получить данные продукта по ID
   */
  getById(id: string): Promise<FoodData | null>;
  
  /**
   * Проверить доступность провайдера для региона
   */
  isAvailable(region?: string): boolean;
  
  /**
   * Получить данные по штрихкоду (опционально)
   */
  getByBarcode?(barcode: string): Promise<FoodData | null>;
  
  /**
   * Приоритет провайдера (чем выше, тем приоритетнее)
   */
  getPriority(region?: string): number;
}
```

### 9.3. NutritionOrchestrator

```typescript
@Injectable()
export class NutritionOrchestrator {
  constructor(
    private readonly providers: NutritionProvider[],
    private readonly logger: Logger,
  ) {}
  
  async findNutrition(
    query: string,
    options: {
      region?: string;
      category?: 'drink' | 'solid' | 'unknown';
      barcode?: string;
    }
  ): Promise<FoodData | null> {
    // 1. Если есть штрихкод, попробовать провайдеры с getByBarcode
    if (options.barcode) {
      for (const provider of this.providers) {
        if (provider.getByBarcode && provider.isAvailable(options.region)) {
          const result = await provider.getByBarcode(options.barcode);
          if (result && this.validateFoodData(result)) {
            this.logger.log(`[Orchestrator] Found via barcode in ${provider.constructor.name}`);
            return result;
          }
        }
      }
    }
    
    // 2. Сортировать провайдеров по приоритету для региона
    const sortedProviders = this.providers
      .filter(p => p.isAvailable(options.region))
      .sort((a, b) => b.getPriority(options.region) - a.getPriority(options.region));
    
    // 3. Искать в каждом провайдере
    for (const provider of sortedProviders) {
      const matches = await provider.search(query, {
        category: options.category,
        region: options.region,
        limit: 5,
      });
      
      if (matches.length > 0) {
        const bestMatch = matches[0];
        const foodData = await provider.getById(bestMatch.id);
        
        if (foodData && this.validateFoodData(foodData)) {
          this.logger.log(`[Orchestrator] Found in ${provider.constructor.name}`);
          return foodData;
        }
      }
    }
    
    return null;
  }
  
  private validateFoodData(data: FoodData): boolean {
    // Валидация: калории должны быть разумными
    if (data.nutrients.calories < 0 || data.nutrients.calories > 10000) {
      return false;
    }
    // Дополнительные проверки...
    return true;
  }
}
```

---

## 10. ЗАКЛЮЧЕНИЕ

Текущая реализация имеет серьезные архитектурные проблемы, но **не использует галлюцинации OpenAI**. Проблемы в:
1. Эвристиках fallback
2. Отсутствии специальной обработки напитков
3. Жесткой привязке к USDA
4. Отсутствии слоя провайдеров

Рекомендуется поэтапное внедрение:
1. Быстрые исправления для воды и напитков
2. Создание архитектуры провайдеров
3. Интеграция OpenFoodFacts и Swiss Food DB

Это позволит создать гибкую, расширяемую систему анализа пищи с поддержкой множественных источников данных.


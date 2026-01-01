# Suggested Food / Персональные рекомендации

## Обзор

Функция "Suggested Food" анализирует историю питания пользователя за последние 7 дней и генерирует персонализированные рекомендации по продуктам на основе дефицитов макронутриентов.

---

## Архитектура

```mermaid
flowchart TD
    A[DashboardScreen] -->|loadSuggestedFoodSummary| B[ApiService.getSuggestedFoods]
    B -->|GET /suggestions/foods| C[SuggestionsController]
    C -->|getUser locale from profile| D[SuggestionsService]
    D -->|getLast7DaysStats| E[StatsService]
    D -->|getMeals with items| F[PrismaService]
    D -->|getUserProfile| F
    D -->|calculateMacroPercentages| G{Check Thresholds}
    G -->|lowProtein| H[Suggest Protein Foods]
    G -->|highFat| I[Suggest Healthy Fat Alternatives]
    G -->|lowFiber| J[Suggest Fiber Foods]
    G -->|highCarbs| K[Suggest Complex Carbs]
    G -->|balanced| L[Congratulate User]
    H --> M[Filter by Preferences/Allergies]
    I --> M
    J --> M
    K --> M
    M --> N[Return SuggestedFoodItem[&#93;]
    N -->|response| O[SuggestedFoodScreen]
    O -->|normalize| P[Display Sections by Category]
```

---

## Файлы

| Файл | Описание |
|------|----------|
| [suggestions.service.ts](file:///wsl.localhost/Ubuntu/home/mrazzka/projects/work/eatsense/apps/api/src/suggestions/suggestions.service.ts) | Основная логика рекомендаций |
| [suggestions.controller.ts](file:///wsl.localhost/Ubuntu/home/mrazzka/projects/work/eatsense/apps/api/src/suggestions/suggestions.controller.ts) | API endpoint |
| [SuggestedFoodScreen.tsx](file:///wsl.localhost/Ubuntu/home/mrazzka/projects/work/eatsense/src/screens/SuggestedFoodScreen.tsx) | UI экран |
| [DashboardScreen.js](file:///wsl.localhost/Ubuntu/home/mrazzka/projects/work/eatsense/src/screens/DashboardScreen.js) | Карточка-превью на главной |
| [apiService.js](file:///wsl.localhost/Ubuntu/home/mrazzka/projects/work/eatsense/src/services/apiService.js) | Клиентский API вызов |

---

## API Endpoint

```
GET /suggestions/foods?locale={en|ru|kk}
Authorization: Bearer {JWT}
```

**Response:**
```typescript
interface SuggestedFoodItem {
  id: string;           // e.g. "high_protein", "lower_fat", "more_fiber"
  name: string;         // Comma-separated food names
  category: 'protein' | 'fiber' | 'healthy_fat' | 'carb' | 'general';
  reason: string;       // Why this suggestion (with stats)
  tip: string;          // Actionable advice
  locale?: 'en' | 'ru' | 'kk';
}
```

---

## Логика работы (Backend)

### 1. Получение статистики за 7 дней

```typescript
// suggestions.service.ts:36-40
const stats = await this.statsService.getPersonalStats(
  userId,
  sevenDaysAgo.toISOString(),
  now.toISOString(),
);
```

### 2. Расчет средних показателей

```typescript
// suggestions.service.ts:44-53
const { totals } = stats;
const daysCount = 7;
const avgCalories = totals.calories / daysCount;
const avgProtein = totals.protein / daysCount;
const avgFat = totals.fat / daysCount;
const avgCarbs = totals.carbs / daysCount;

// Проценты от калорий
const totalMacroCalories = avgProtein * 4 + avgCarbs * 4 + avgFat * 9;
const avgProteinPerc = totalMacroCalories > 0 ? (avgProtein * 4 / totalMacroCalories) * 100 : 0;
const avgFatPerc = totalMacroCalories > 0 ? (avgFat * 9 / totalMacroCalories) * 100 : 0;
const avgCarbPerc = totalMacroCalories > 0 ? (avgCarbs * 4 / totalMacroCalories) * 100 : 0;
```

### 3. Расчет клетчатки

```typescript
// suggestions.service.ts:80-82
const avgFiberGrams = meals.reduce((sum, meal) => {
  return sum + meal.items.reduce((mealSum, item) => mealSum + ((item as any).fiber || 0), 0);
}, 0) / daysCount;
```

### 4. Персонализация по целям

```typescript
// suggestions.service.ts:115-118
const goal = userProfile?.goal || 'maintain_weight';

// Thresholds depend on goal:
const proteinThreshold = goal === 'lose_weight' ? 20 : goal === 'gain_weight' ? 25 : 18;
const fatThreshold = goal === 'lose_weight' ? 30 : 35;
const carbThreshold = goal === 'lose_weight' ? 50 : 55;
```

### 5. Генерация рекомендаций

| Условие | Категория | Рекомендация |
|---------|-----------|--------------|
| `avgProteinPerc < proteinThreshold` | `protein` | Добавить белок |
| `avgFatPerc > fatThreshold` | `healthy_fat` | Заменить на полезные жиры |
| `avgFiberGrams < 20` | `fiber` | Добавить клетчатку |
| `avgCarbPerc > carbThreshold` | `carb` | Перейти на сложные углеводы |
| Все в норме | `general` | "Рацион сбалансирован" |

### 6. Фильтрация продуктов

```typescript
// suggestions.service.ts:224-248
private filterFoodsByPreferences(
  foods: string[],
  dietaryPreferences: string[], // vegetarian, vegan, gluten_free
  allergies: string[],
  recentFoods: Set<string>,     // исключить недавно съеденное
): string[] {
  return foods
    .filter((food) => {
      // Skip if recently consumed
      if (recentFoods.has(foodLower)) return false;
      // Filter by dietary preferences
      if (dietaryPreferences.includes('vegetarian') && this.isMeat(foodLower)) return false;
      if (dietaryPreferences.includes('vegan') && (this.isMeat(foodLower) || this.isDairy(foodLower))) return false;
      if (dietaryPreferences.includes('gluten_free') && this.containsGluten(foodLower)) return false;
      // Filter by allergies
      for (const allergy of allergies) {
        if (foodLower.includes(allergy.toLowerCase())) return false;
      }
      return true;
    })
    .slice(0, 3); // Top 3
}
```

### 7. Локализованные продукты

```typescript
// suggestions.service.ts:276-293
const foods = {
  en: {
    protein: ['Greek yogurt', 'cottage cheese', 'chicken breast', 'eggs', 'salmon', 'tofu', 'lentils'],
    healthyFat: ['lean meat', 'fish', 'avocado', 'nuts', 'olive oil'],
    fiber: ['vegetables', 'fruits', 'whole grains', 'legumes', 'berries'],
    carb: ['oats', 'buckwheat', 'quinoa', 'sweet potato', 'brown rice'],
  },
  ru: {
    protein: ['греческий йогурт', 'творог', 'куриная грудка', 'яйца', 'лосось', 'тофу', 'чечевица'],
    healthyFat: ['постное мясо', 'рыба', 'авокадо', 'орехи', 'оливковое масло'],
    fiber: ['овощи', 'фрукты', 'цельнозерновые продукты', 'бобовые', 'ягоды'],
    carb: ['овсянка', 'гречка', 'киноа', 'батат', 'бурый рис'],
  },
  kk: { /* Kazakhstan locale */ },
};
```

---

## Логика работы (Frontend)

### DashboardScreen - Превью карточка

```typescript
// DashboardScreen.js:238-280
const loadSuggestedFoodSummary = async () => {
  const suggestions = await ApiService.getSuggestedFoods(currentLocale);
  if (suggestions.length > 0) {
    const first = suggestions[0];
    // Map category to localized message
    const categoryMessages = {
      protein: t('dashboard.suggestedFood.messages.lowProtein'),
      fiber: t('dashboard.suggestedFood.messages.lowFiber'),
      carbs: t('dashboard.suggestedFood.messages.lowCarbs'),
      healthy_fat: t('dashboard.suggestedFood.messages.lowHealthyFat'),
      general: t('dashboard.suggestedFood.messages.general'),
    };
    setSuggestedFoodSummary({
      reason: categoryMessages[first.category] || first.reason,
      category: first.category,
    });
  }
};
```

### SuggestedFoodScreen - Полный список

```typescript
// SuggestedFoodScreen.tsx:67-121
const normalizeBackendData = (data): SuggestedFoodSection[] => {
  // Converts flat SuggestedFoodItem[] to sections grouped by category
  const sectionsMap = new Map();
  backendItems.forEach((item) => {
    const category = item.category || 'general';
    if (!sectionsMap.has(category)) {
      sectionsMap.set(category, {
        id: category,
        title: getCategoryDisplayName(category), // localized
        subtitle: item.reason,
        items: [],
      });
    }
    section.items.push({
      id: item.id,
      title: item.name,      // food names
      description: item.tip, // actionable advice
    });
  });
  return Array.from(sectionsMap.values());
};
```

---

## Fallback данные

Если API недоступен, показываются статические локализованные рекомендации:

```typescript
// SuggestedFoodScreen.tsx:302-398
function getStaticFallbackSections(t): SuggestedFoodSection[] {
  return [
    {
      id: 'protein',
      title: t('dashboard.suggestedFood.sections.protein.title'),
      items: [
        { id: 'protein-1', title: 'Cottage Cheese', description: '...' },
        { id: 'protein-2', title: 'Chicken Breast', description: '...' },
        // ...
      ],
    },
    // + carbs, fiber, healthy_fat sections
  ];
}
```

---

## Возможные улучшения

> [!NOTE]
> Текущая реализация генерирует рекомендации на основе фиксированных порогов. Можно улучшить:

1. **AI-генерация**: Использовать GPT для генерации персональных советов на основе полной истории
2. **Время суток**: Рекомендовать разную еду утром/днем/вечером
3. **Сезонность**: Учитывать доступные продукты по сезону
4. **Рецепты**: Показывать конкретные рецепты, не просто продукты
5. **Интеграция с магазинами**: "Купить в Glovo/Kaspi"
6. **Цены**: Учитывать бюджет пользователя
7. **Микронутриенты**: Отслеживать витамины и минералы
8. **Гидратация**: Рекомендовать воду на основе активности

---

## Ключевые пороговые значения

| Параметр | lose_weight | maintain_weight | gain_weight |
|----------|-------------|-----------------|-------------|
| Protein % min | 20% | 18% | 25% |
| Fat % max | 30% | 35% | 35% |
| Carbs % max | 50% | 55% | 55% |
| Fiber min | 20g/day | 20g/day | 20g/day |

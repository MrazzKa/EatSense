# ПОЛНЫЙ ТЕХНИЧЕСКИЙ АУДИТ ПРИЛОЖЕНИЯ EATSENSE / CALORIECAM

**Дата:** 2025-12-08  
**Версия:** Production Build 63  
**Цель:** Максимально детальный анализ всех проблем и архитектуры без внесения изменений

---

## СОДЕРЖАНИЕ

1. [Общий обзор архитектуры](#1-общий-обзор-архитектуры)
2. [Анализ пайплайна анализа еды](#2-анализ-пайплайна-анализа-еды)
3. [Модальные окна и навигация](#3-модальные-окна-и-навигация)
4. [Suggested Food](#4-suggested-food)
5. [Месячные отчёты](#5-месячные-отчёты)
6. [Профиль и метаболические параметры](#6-профиль-и-метаболические-параметры)
7. [Экран анализа блюда + Health Score](#7-экран-анализа-блюда--health-score)
8. [История / Recent](#8-история--recent)
9. [Анализ логов и ошибок бэка](#9-анализ-логов-и-ошибок-бэка)
10. [Уведомления и расписание таблеток](#10-уведомления-и-расписание-таблеток)
11. [Итоговый список файлов](#11-итоговый-список-файлов)

---

## 1. ОБЩИЙ ОБЗОР АРХИТЕКТУРЫ

### Технологический стек

**Backend:**
- NestJS (TypeScript)
- Prisma ORM + PostgreSQL
- Bull (Redis) для очередей
- OpenAI Vision API
- USDA FDC API, Swiss Food DB, OpenFoodFacts (провайдеры)
- Expo Push Notifications

**Frontend:**
- React Native (Expo SDK 54)
- React Navigation
- i18n (en/ru/kk)
- ThemeContext для темной/светлой темы

### Основные модули

1. **Food Analysis** — анализ еды по фото/тексту
2. **AI Assistant** — чат-бот для вопросов о питании
3. **Meals** — история приёмов пищи
4. **Stats** — статистика и отчёты
5. **Suggestions** — рекомендации по питанию
6. **User Profiles** — профили пользователей
7. **Notifications** — push-уведомления

---

## 2. АНАЛИЗ ПАЙПЛАЙНА АНАЛИЗА ЕДЫ

### 2.1. Фронтенд — инициация анализа

**Файлы:**
- `src/screens/DashboardScreen.js` — FAB (кнопка добавления)
- `src/components/BottomSheet.tsx` — выбор способа (Camera/Gallery/Describe)
- `src/components/DescribeFoodModal.tsx` — ручной ввод текста (если есть)
- `src/screens/AnalysisResultsScreen.js` — экран результатов
- `src/services/apiService.js` — методы `analyzeImage()`, `analyzeText()`, `getAnalysisResult()`

**Проблема:** Кнопка "Describe Food" в `BottomSheet.tsx` ведет на `LabResultsModal` вместо модалки ручного ввода блюда.

**Текущий поток:**
1. Пользователь нажимает FAB → открывается `BottomSheet`
2. Выбирает "Describe Food" → должен открыться `DescribeFoodModal` или экран текстового анализа
3. Вводит описание → отправляется `POST /food/analyze-text`
4. Результат отображается в `AnalysisResultsScreen`

**Что нужно исправить:**
- Проверить, куда ведет `onDescribePress` в `BottomSheet.tsx`
- Создать отдельный экран/модалку для текстового анализа блюда (не путать с Lab Results)

### 2.2. Бэкенд — цепочка анализа

**Файлы:**
- `apps/api/food/food.controller.ts` — эндпоинты `POST /food/analyze`, `POST /food/analyze-text`
- `apps/api/food/food.service.ts` — методы `analyzeImage()`, `analyzeText()`
- `apps/api/food/food.processor.ts` — обработка в очереди Bull (`@Process('analyze-image')`)
- `apps/api/src/analysis/vision.service.ts` — `extractComponents()` (OpenAI Vision)
- `apps/api/src/analysis/analyze.service.ts` — основной сервис анализа
- `apps/api/src/analysis/providers/nutrition-orchestrator.service.ts` — выбор провайдера (USDA/Swiss/OFF)

**Текущий пайплайн:**

```
1. POST /food/analyze (image)
   ↓
2. FoodService.analyzeImage()
   - Загружает файл через MediaService
   - Создает запись Analysis (status: PENDING)
   - Добавляет задачу в Bull queue
   ↓
3. FoodProcessor.handleImageAnalysis()
   - Конвертирует изображение в base64
   - Вызывает AnalyzeService.analyzeImage()
   ↓
4. AnalyzeService.analyzeImage()
   - VisionService.extractComponents() → получает компоненты из изображения
   - Для каждого компонента:
     a. Проверка на воду/кофе/чай (isPlainWater, detectPlainCoffeeOrTea)
     b. Если напиток → канонические значения
     c. Если еда → NutritionOrchestrator.findNutrition()
   - Вычисляет totals (калории, белки, жиры, углеводы)
   - Вычисляет HealthScore (computeHealthScore())
   - Формирует feedback (buildHealthFeedback())
   - Сохраняет в AnalysisResult
   ↓
5. Автоматически создается Meal с items
```

**Проблемы производительности:**
- Провайдеры вызываются последовательно (не параллельно)
- Нет кеширования Vision-результатов по хешу изображения
- Нет оптимистичного UI (показывать Vision-результаты сразу)

**Решения:**
1. Параллельные запросы к провайдерам (`Promise.all`)
2. Кеш Vision по MD5/SHA256 хешу изображения
3. Оптимистичный UI: показывать Vision-результаты сразу, обновлять после провайдеров

### 2.3. Health Score и Feedback

**Файлы:**
- `apps/api/src/analysis/analyze.service.ts` — метод `computeHealthScore()` (строка ~1400-1500)
- `apps/api/src/analysis/analyze.service.ts` — метод `buildHealthFeedback()` (строка ~1700-1800)
- `src/components/HealthScoreCard.tsx` — отображение на фронте

**Текущая формула Health Score:**

```typescript
// Веса факторов
const weights = {
  protein: 0.25,
  fiber: 0.20,
  satFat: 0.20,
  sugars: 0.15,
  energyDensity: 0.20
};

// Нормализация каждого фактора (0-100)
const proteinScore = normalize(protein_g, min=0, max=50, reverse=false);
const fiberScore = normalize(fiber_g, min=0, max=25, reverse=false);
const satFatScore = normalize(satFat_g, min=0, max=20, reverse=true); // меньше = лучше
const sugarsScore = normalize(sugars_g, min=0, max=50, reverse=true); // меньше = лучше
const energyDensityScore = normalize(calories/portion_g, min=0, max=5, reverse=true);

// Итоговый score
healthScore = (proteinScore * weights.protein) + 
              (fiberScore * weights.fiber) + 
              (satFatScore * weights.satFat) + 
              (sugarsScore * weights.sugars) + 
              (energyDensityScore * weights.energyDensity);
```

**Проблемы:**
1. Все факторы показывают 100% — возможно, нормализация работает неправильно
2. Health Score всегда одинаковый — нужно проверить формулу
3. Feedback не локализован — всегда на английском

**Что нужно исправить:**
1. Проверить нормализацию каждого фактора
2. Убедиться, что locale передается в `buildHealthFeedback()`
3. Локализовать все тексты feedback

### 2.4. Проблемы с напитками

**Файлы:**
- `apps/api/src/analysis/analyze.service.ts` — методы `isPlainWater()` (строка ~71), `detectPlainCoffeeOrTea()` (строка ~124), `detectMilkCoffeeDrink()` (строка ~290)

**Текущая логика:**
- `isPlainWater()` — проверяет ключевые слова ("water", "вода", "минеральная вода")
- Если вода → канонические значения: 0 ккал, 0 белки/жиры/углеводы
- `detectPlainCoffeeOrTea()` — проверяет "black coffee", "tea" без добавок
- Если черный кофе/чай → канонические значения: 2-5 ккал

**Проблемы:**
- Вода все еще показывает 240 ккал (из логов)
- Напитки определяются неправильно (капучино показывает 1500 ккал)

**Что нужно исправить:**
1. Проверить порядок проверок (вода должна проверяться ДО вызова провайдеров)
2. Улучшить промпт Vision для напитков
3. Добавить жестко прописанные значения для популярных напитков (капучино, латте, эспрессо)

### 2.5. Локализация анализа

**Файлы:**
- `apps/api/src/analysis/food-localization.service.ts` — локализация названий продуктов
- `apps/api/src/analysis/analyze.service.ts` — передача locale в анализ

**Текущее состояние:**
- Locale берется из профиля пользователя или из query-параметра
- Названия продуктов локализуются через `FoodLocalizationService`
- Feedback и Health Score комментарии НЕ локализованы

**Что нужно исправить:**
1. Передавать locale в `buildHealthFeedback()`
2. Локализовать все тексты feedback (en/ru/kk)
3. Убедиться, что названия блюд локализуются правильно

### 2.6. Хранение результатов анализа

**Модель Prisma:**

```prisma
model Analysis {
  id        String   @id @default(cuid())
  userId    String
  type      String   // 'IMAGE' | 'TEXT'
  status    String   // 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  metadata  Json?    // { locale, filename, mimetype, size, imageUrl?, textQuery? }
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  results   AnalysisResult[]
  meals     Meal[]
}

model AnalysisResult {
  id         String   @id @default(cuid())
  analysisId String
  data       Json     // { items, totals, healthScore, feedback, ... }
  createdAt  DateTime @default(now())
  analysis   Analysis @relation(fields: [analysisId], references: [id])
}

model Meal {
  id         String   @id @default(cuid())
  userId     String
  name       String
  imageUri   String?  // URL изображения
  consumedAt DateTime?
  createdAt  DateTime @default(now())
  items      MealItem[]
  analysis   Analysis? @relation(fields: [analysisId], references: [id])
}

model MealItem {
  id          String   @id @default(cuid())
  mealId      String
  name        String
  calories    Float
  protein     Float
  carbs       Float
  fat         Float
  portion_g   Float
  meal        Meal     @relation(fields: [mealId], references: [id])
}
```

**Проблемы:**
- `imageUri` в `Meal` не всегда заполняется
- Нет полей для ручных правок (`userEditedName`, `userEditedPortionG`)

**Что нужно исправить:**
1. Убедиться, что `imageUri` сохраняется при создании `Meal`
2. Добавить поля для ручных правок в `AnalysisResult.data` (уже есть в типах `AnalyzedItem`)

---

## 3. МОДАЛЬНЫЕ ОКНА И НАВИГАЦИЯ

### 3.1. Базовый компонент модалки

**Файлы:**
- `src/components/common/SwipeClosableModal.tsx` — базовый компонент

**Текущее состояние:**
- Поддерживает swipe-to-close (вниз)
- Использует `presentationStyle="pageSheet"` по умолчанию
- Имеет пропсы: `enableSwipe`, `enableBackdropClose`, `swipeDirection`

**Проблема:** AI Assistant закрывается свайпом сверху вниз (нужно отключить)

**Что нужно исправить:**
- В `AiAssistant.tsx` передать `enableSwipe={false}` в `SwipeClosableModal`

### 3.2. AI Assistant

**Файлы:**
- `src/components/AiAssistant.tsx` — обертка модалки
- `src/components/RealAiAssistant.tsx` — сам чат

**Проблемы:**
1. Двойной header: наружный "AI Assistant" + внутренний "AI Nutrition Assistant"
2. Закрывается свайпом (нужно отключить)
3. Проблемы с клавиатурой (зазор между input и клавиатурой)
4. Плейсхолдер на английском при RU интерфейсе

**Что нужно исправить:**
1. Убрать один из заголовков (оставить только внутренний)
2. Отключить swipe-to-close: `enableSwipe={false}`
3. Исправить `KeyboardAvoidingView` и отступы
4. Локализовать плейсхолдер

### 3.3. Lab Results Modal

**Файлы:**
- `src/components/LabResultsModal.tsx` — модалка анализа мед. анализов
- `apps/api/ai-assistant/ai-assistant.controller.ts` — эндпоинт `POST /ai-assistant/lab-results`
- `apps/api/ai-assistant/ai-assistant.service.ts` — метод `analyzeLabResults()`

**Проблемы:**
1. Ошибка 500 при ручном вводе ("Гемоглобин - 100")
2. Заголовок на английском при RU интерфейсе
3. Raw i18n ключи видны (`aiAssistant.lab.type.auto`, `aiAssistant.lab.attachPdf`)

**Что нужно исправить:**
1. Проверить DTO `AnalyzeLabResultsDto` — что ожидается vs что приходит
2. Добавить все недостающие ключи в i18n (en/ru/kk)
3. Локализовать заголовок модалки

---

## 4. SUGGESTED FOOD

### 4.1. Фронтенд

**Файлы:**
- `src/screens/SuggestedFoodScreen.tsx` — экран рекомендаций
- `app/i18n/locales/en.json` — ключи `suggestedFood.*`
- `app/i18n/locales/ru.json` — переводы

**Проблемы:**
1. Показываются ключи `suggestedFood.title`, `suggestedFood.subtitle` вместо текста
2. Контент карточек на русском при EN интерфейсе

**Что нужно исправить:**
1. Проверить, используется ли `t('suggestedFood.title')` в `SuggestedFoodScreen.tsx`
2. Добавить недостающие ключи в `en.json` и `kk.json`
3. Убедиться, что контент карточек берется из локализованных строк, а не хардкода

### 4.2. Бэкенд

**Файлы:**
- `apps/api/src/suggestions/suggestions.service.ts` — логика подсказок
- `apps/api/src/suggestions/suggestions.controller.ts` — эндпоинт `GET /suggestions`

**Текущая логика:**
- Анализирует 7-дневную историю через `StatsService.getPersonalStats()`
- Если дефицит белка → предлагает мясо/рыбу/творог
- Если избыток жиров → предлагает постные продукты
- Если дефицит клетчатки → предлагает овощи/фрукты

**Проблемы:**
- Простая эвристика (нет персонализации)
- Нет учета аллергий/диет

**Что нужно исправить:**
1. Улучшить логику (учитывать профиль пользователя)
2. Добавить персонализацию по предпочтениям

---

## 5. МЕСЯЧНЫЕ ОТЧЕТЫ

### 5.1. Бэкенд

**Файлы:**
- `apps/api/stats/stats.service.ts` — метод `generateMonthlyReportPDF()` (строка ~386)
- `apps/api/stats/stats.controller.ts` — эндпоинт `GET /stats/monthly-report`

**Проблемы:**
1. Ошибка при загрузке отчета ("Failed to download monthly report")
2. Нет обработки случая "нет данных за месяц"
3. PDF генерируется синхронно (может быть медленно)

**Что нужно исправить:**
1. Проверить, что возвращается при отсутствии данных (должен быть 204 или понятное сообщение)
2. Добавить обработку ошибок генерации PDF
3. Рассмотреть асинхронную генерацию через Bull queue

### 5.2. Фронтенд

**Файлы:**
- `src/screens/ReportsScreen.tsx` — экран отчетов
- `src/services/apiService.js` — метод `getMonthlyReport()`

**Проблемы:**
1. Ошибка "Failed to download monthly report" не информативна
2. Нет обработки случая "нет данных"

**Что нужно исправить:**
1. Улучшить обработку ошибок (показывать конкретную причину)
2. Добавить состояние "нет данных за месяц"

---

## 6. ПРОФИЛЬ И МЕТАБОЛИЧЕСКИЕ ПАРАМЕТРЫ

### 6.1. Фронтенд

**Файлы:**
- `src/screens/ProfileScreen.js` — экран профиля
- Экран редактирования профиля (встроен в ProfileScreen или отдельный)

**Проблемы:**
1. При открытии формы редактирования профиль "подпрыгивает"
2. При сохранении ошибка "Update failed. Could not update profile"
3. Поле email пустое, но вызывает ошибку валидации

**Что нужно исправить:**
1. Исправить SafeArea и отступы в форме редактирования
2. Проверить валидацию email (должен быть опциональным или правильно валидироваться)

### 6.2. Бэкенд

**Файлы:**
- `apps/api/users/user-profiles.service.ts` — метод `updateProfile()`
- `apps/api/users/user-profiles.controller.ts` — эндпоинт `PUT /user-profile`
- `apps/api/users/dto/update-profile.dto.ts` — DTO
- `apps/api/prisma/schema.prisma` — модель `UserProfile`

**Ошибка из логов:**

```
PrismaClientValidationError: Invalid `prisma.userProfile.upsert()` invocation
email: "",
preferences: { 
  subscription: { planId: "free", therapyGoal: "preserve_muscle", billingCycle: "monthly" },
  ...
},
healthProfile: { 
  metabolic: { fatDistributionType: "visceral", ... },
  ...
},
eatingBehavior: { mealsPerDay: 3, sleepHours: 7.5, ... },
glp1Module: { isGlp1User: false, drugType: "semaglutide", ... }
```

**Проблемы:**
1. Email приходит как `""` (пустая строка), но Prisma ожидает `String` или `String?`
2. Структура `preferences`, `healthProfile`, `eatingBehavior`, `glp1Module` не совпадает с Prisma-схемой

**Что нужно исправить:**
1. Проверить модель `UserProfile` в schema.prisma — какие поля реально есть
2. Сравнить с тем, что приходит с фронта
3. Либо сделать email опциональным (`String?`), либо преобразовывать `""` → `null`
4. Привести структуру JSON-полей в соответствие со схемой

---

## 7. ЭКРАН АНАЛИЗА БЛЮДА (ANALYSIS COMPLETE)

### 7.1. Компонент результатов

**Файлы:**
- `src/screens/AnalysisResultsScreen.js` — экран результатов
- `src/components/HealthScoreCard.tsx` — карточка Health Score

**Проблемы:**
1. Текст плохо виден на темной теме
2. Health Score показывает все факторы 100%
3. Нет фото на карточке (если анализ был по фото)
4. Карточка выглядит скудно

**Что нужно исправить:**
1. Исправить цвета текста (использовать `textPrimary`, `textSecondary` из темы)
2. Проверить отображение Health Score (возможно, проблема в `HealthScoreCard.tsx`)
3. Убедиться, что фото передается и отображается
4. Улучшить дизайн карточки

### 7.2. Редактирование ингредиентов

**Файлы:**
- `src/components/EditFoodItemModal.js` — модалка редактирования
- `src/screens/AnalysisResultsScreen.js` — метод `handleSaveEdit()`

**Проблемы:**
1. При изменении названия/веса только сохраняется локально (не пересчитывается КБЖУ)
2. Нет вызова переанализа (`manualReanalyze`)

**Что нужно исправить:**
1. При сохранении редактирования вызывать `POST /food/analysis/:id/manual-reanalyze`
2. Обновлять `analysisResult` с новыми данными от бэка

### 7.3. Кнопка "Fix" (переанализ)

**Файлы:**
- `src/screens/AnalysisResultsScreen.js` — метод `handleReanalyze()` (если есть)

**Проблемы:**
1. Кнопка "Fix" не реализована или не работает
2. Нет вызова `POST /food/analysis/:id/reanalyze`

**Что нужно исправить:**
1. Добавить кнопку "Fix" рядом с "Share"
2. Реализовать `handleReanalyze()` — вызов API с `mode: 'review'`
3. Обновить `analysisResult` с новыми данными

---

## 8. ИСТОРИЯ / RECENT

### 8.1. Модель данных

**Файлы:**
- `apps/api/prisma/schema.prisma` — модель `Meal` и `MealItem`
- `apps/api/meals/meals.service.ts` — метод `getMeals()`

**Проблемы:**
1. `imageUri` в `Meal` не всегда заполняется
2. Нет фото на карточках Recent

**Что нужно исправить:**
1. Убедиться, что `imageUri` сохраняется при создании `Meal` в `FoodProcessor`
2. Проверить, что `imageUri` возвращается в `getMeals()`

### 8.2. Фронтенд — карточки Recent

**Файлы:**
- `src/screens/DashboardScreen.js` — компонент карточек Recent
- `src/utils/nutritionFormat.js` — форматирование чисел

**Проблемы:**
1. Float значения типа `68.10000000000001` вместо `68.1`
2. Нет фото на карточках
3. Карточка выглядит скудно

**Что нужно исправить:**
1. Исправить форматирование в `nutritionFormat.js` (округление до 1 знака)
2. Убедиться, что `imageUri` отображается на карточке
3. Улучшить дизайн карточки

---

## 9. АНАЛИЗ ЛОГОВ И ОШИБОК БЭКА

### 9.1. Ошибки из логов

**1. HTTP 400 PUT /notifications/preferences**

```
ERROR [AllExceptionsFilter] HTTP 400 PUT /notifications/preferences
```

**Файлы:**
- `apps/api/src/notifications/notifications.controller.ts`
- `apps/api/src/notifications/dto/update-notification-preferences.dto.ts`

**Проблема:** DTO не совпадает с тем, что приходит с фронта

**Что нужно исправить:**
1. Проверить DTO — какие поля ожидаются
2. Проверить, что отправляет фронт
3. Привести в соответствие

**2. PrismaClientValidationError при updateProfile**

```
ERROR [UserProfilesService] updateProfile() failed...
PrismaClientValidationError: Invalid `prisma.userProfile.upsert()` invocation
email: "",
preferences: { subscription: { ... }, ... },
healthProfile: { metabolic: { ... }, ... },
eatingBehavior: { ... },
glp1Module: { ... }
```

**Проблема:** Структура данных не совпадает с Prisma-схемой

**Что нужно исправить:**
1. Проверить модель `UserProfile` в schema.prisma
2. Сравнить с тем, что приходит с фронта
3. Либо изменить схему, либо изменить фронт

**3. Множественные cache=miss по stats:monthly**

```
DEBUG [CacheService] cache=miss namespace=stats:monthly key=...
```

**Проблема:** Это нормально, если данные разные для разных пользователей/периодов. Но можно оптимизировать кеширование.

---

## 10. УВЕДОМЛЕНИЯ И РАСПИСАНИЕ ТАБЛЕТОК

### 10.1. Текущее состояние

**Файлы:**
- `apps/api/prisma/schema.prisma` — модели `NotificationPreference`, `PushToken`
- `apps/api/src/notifications/notifications.service.ts` — отправка пушей
- `apps/api/src/notifications/notifications.scheduler.ts` — Cron для ежедневных напоминаний

**Что есть:**
- Базовая система уведомлений
- Ежедневные напоминания (Cron)
- Push-токены

**Чего нет:**
- Модели для лекарств/медикаментов
- Расписания приема таблеток
- Напоминаний "за 30 минут до еды"

**Что нужно сделать:**
1. Создать модель `Medication` в Prisma
2. Создать сервис `MedicationService` (CRUD)
3. Создать scheduler для напоминаний о таблетках
4. Создать экран `MedicationScheduleScreen` на фронте

---

## 11. ИТОГОВЫЙ СПИСОК ФАЙЛОВ

### Таблица проблем и файлов

| Проблема/Тема | Файлы фронта | Файлы бэка | Описание |
|---------------|--------------|------------|----------|
| **Suggested Food ключи** | `src/screens/SuggestedFoodScreen.tsx`<br>`app/i18n/locales/en.json`<br>`app/i18n/locales/ru.json`<br>`app/i18n/locales/kk.json` | `apps/api/src/suggestions/suggestions.service.ts`<br>`apps/api/src/suggestions/suggestions.controller.ts` | Показываются ключи `suggestedFood.title` вместо текста. Контент карточек на русском при EN интерфейсе. |
| **AI Assistant двойной header** | `src/components/AiAssistant.tsx`<br>`src/components/RealAiAssistant.tsx`<br>`src/components/common/SwipeClosableModal.tsx` | - | Два заголовка (наружный "AI Assistant" + внутренний "AI Nutrition Assistant"). Закрывается свайпом (нужно отключить). |
| **AI Assistant клавиатура** | `src/components/RealAiAssistant.tsx` | - | Зазор между input и клавиатурой. Плейсхолдер на английском при RU интерфейсе. |
| **Lab Results ошибка** | `src/components/LabResultsModal.tsx`<br>`app/i18n/locales/*.json` | `apps/api/ai-assistant/ai-assistant.controller.ts`<br>`apps/api/ai-assistant/ai-assistant.service.ts`<br>`apps/api/ai-assistant/dto/analyze-lab-results.dto.ts` | Ошибка 500 при ручном вводе. Raw i18n ключи видны. |
| **Describe Food ведет не туда** | `src/components/BottomSheet.tsx`<br>`src/components/DescribeFoodModal.tsx` | - | Кнопка "Describe Food" ведет на `LabResultsModal` вместо модалки текстового анализа блюда. |
| **Profile update ошибка** | `src/screens/ProfileScreen.js` | `apps/api/users/user-profiles.service.ts`<br>`apps/api/users/user-profiles.controller.ts`<br>`apps/api/users/dto/update-profile.dto.ts`<br>`apps/api/prisma/schema.prisma` | PrismaClientValidationError: email `""`, структура `preferences`/`healthProfile` не совпадает. |
| **Monthly report ошибка** | `src/screens/ReportsScreen.tsx`<br>`src/services/apiService.js` | `apps/api/stats/stats.service.ts`<br>`apps/api/stats/stats.controller.ts` | Ошибка "Failed to download monthly report". Нет обработки "нет данных". |
| **Recent без фото** | `src/screens/DashboardScreen.js` | `apps/api/meals/meals.service.ts`<br>`apps/api/food/food.processor.ts`<br>`apps/api/prisma/schema.prisma` | `imageUri` не сохраняется или не возвращается. Нет фото на карточках Recent. |
| **Float значения** | `src/utils/nutritionFormat.js`<br>`src/screens/DashboardScreen.js` | - | `68.10000000000001` вместо `68.1`. Нужно округление до 1 знака. |
| **Health Score 100%** | `src/components/HealthScoreCard.tsx`<br>`src/screens/AnalysisResultsScreen.js` | `apps/api/src/analysis/analyze.service.ts` (computeHealthScore, buildHealthFeedback) | Все факторы показывают 100%. Health Score всегда одинаковый. |
| **Health Score не локализован** | `src/components/HealthScoreCard.tsx` | `apps/api/src/analysis/analyze.service.ts` (buildHealthFeedback) | Feedback на английском. Нужна локализация (en/ru/kk). |
| **Напитки неправильно** | - | `apps/api/src/analysis/analyze.service.ts` (isPlainWater, detectPlainCoffeeOrTea, detectMilkCoffeeDrink)<br>`apps/api/src/analysis/vision.service.ts` | Вода показывает 240 ккал. Капучино показывает 1500 ккал. |
| **Нет переанализа** | `src/screens/AnalysisResultsScreen.js`<br>`src/components/EditFoodItemModal.js` | `apps/api/food/food.service.ts`<br>`apps/api/food/food.controller.ts` | При редактировании ингредиента не вызывается `manualReanalyze`. Нет кнопки "Fix". |
| **Текст на темной теме** | `src/screens/AnalysisResultsScreen.js`<br>`src/components/HealthScoreCard.tsx` | - | Текст плохо виден на темной теме. Нужно использовать `textPrimary`/`textSecondary`. |
| **Notifications 400** | `src/screens/ProfileScreen.js` (если есть настройки уведомлений) | `apps/api/src/notifications/notifications.controller.ts`<br>`apps/api/src/notifications/dto/update-notification-preferences.dto.ts` | HTTP 400 при обновлении настроек уведомлений. DTO не совпадает. |
| **Анализ медленный** | - | `apps/api/src/analysis/providers/nutrition-orchestrator.service.ts`<br>`apps/api/src/analysis/analyze.service.ts` | Провайдеры вызываются последовательно. Нет кеша Vision. Нет оптимистичного UI. |

---

## ПЛАН РАБОТ

### Приоритет P0 (критичные баги)

1. **Suggested Food ключи** — добавить недостающие ключи в i18n, исправить использование `t()`
2. **Profile update ошибка** — исправить Prisma-схему или фронт (email, структура JSON)
3. **Notifications 400** — исправить DTO
4. **Recent без фото** — сохранять `imageUri` в `Meal`
5. **Float значения** — округление в `nutritionFormat.js`
6. **Текст на темной теме** — использовать цвета из темы

### Приоритет P1 (важные фичи)

7. **AI Assistant** — убрать двойной header, отключить swipe, исправить клавиатуру
8. **Lab Results ошибка** — исправить DTO и обработку ручного ввода
9. **Describe Food** — создать отдельную модалку для текстового анализа
10. **Health Score** — исправить формулу и локализацию
11. **Напитки** — улучшить логику определения и значения
12. **Переанализ** — реализовать `manualReanalyze` и кнопку "Fix"
13. **Monthly report** — исправить генерацию и обработку ошибок

### Приоритет P2 (оптимизации)

14. **Анализ медленный** — параллельные провайдеры, кеш Vision, оптимистичный UI
15. **Suggested Food** — улучшить логику персонализации

### Приоритет P3 (новые фичи)

16. **Расписание таблеток** — полная реализация (модель, сервис, scheduler, экран)
17. **Скрытые ингредиенты** — улучшить промпт Vision и добавить эвристики
18. **Сочетаемость блюд** — база сочетаний и UI
19. **Канцерогенные товары** — база и детекция

---

## ЗАКЛЮЧЕНИЕ

Данный аудит выявил **17 основных проблем** и **3 новые фичи** для реализации. Большинство проблем связаны с:
1. Локализацией (ключи вместо текста, нелокализованные строки)
2. Несоответствием фронт ↔ бэк (DTO, Prisma-схема)
3. UX-проблемами (темная тема, модалки, клавиатура)
4. Логикой анализа (напитки, Health Score, переанализ)

**Следующий шаг:** Использовать этот документ для создания детального промпта на исправление всех проблем.


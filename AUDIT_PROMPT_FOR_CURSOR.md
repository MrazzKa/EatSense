# Детальный аудит приложения EatSense / CalorieCam

Ты — Senior Full-Stack Engineer. Нужно провести максимально детальный технический аудит проекта без внесения изменений в код.

## Структура ответа

Для каждого раздела предоставь:
1. **Текущее состояние** — как устроено по коду
2. **Точные пути файлов** — все связанные компоненты/сервисы/эндпоинты
3. **Ключевые фрагменты кода** — интерфейсы, DTO, модели Prisma, сигнатуры функций
4. **Проблемы** — несоответствия фронт ↔ бэк, баги, неоптимальности
5. **Логи и ошибки** — анализ из предоставленных логов

---

## 1. ПАЙПЛАЙН АНАЛИЗА ЕДЫ

### 1.1. Фронтенд — инициация анализа

**Найди и опиши:**
- Где вызывается анализ фото/текста (компоненты камеры, загрузки, FAB)
- Экран результатов (`AnalysisResultsScreen` или аналог)
- Как отображаются: Total Nutrition, Health Score, Ingredients, кнопка Share
- Компонент карточки Recent на Dashboard

**Файлы для анализа:**
- `src/screens/DashboardScreen.js` — FAB и Recent
- `src/screens/AnalysisResultsScreen.js` — экран результатов
- `src/components/BottomSheet.tsx` — выбор способа анализа
- `src/components/DescribeFoodModal.tsx` — ручной ввод (если есть)
- `src/services/apiService.js` — методы `analyzeImage`, `analyzeText`, `getAnalysisResult`

**Вопросы:**
- Какой путь навигации при выборе "Describe Food" в BottomSheet?
- Куда ведет кнопка "Describe Food" — правильно ли она ведет на `LabResultsModal`?

### 1.2. Бэкенд — цепочка анализа

**Найди и опиши:**
- Контроллер: `apps/api/food/food.controller.ts` — эндпоинты `POST /food/analyze`, `POST /food/analyze-text`
- Сервис: `apps/api/food/food.service.ts` — методы `analyzeImage`, `analyzeText`
- Процессор: `apps/api/food/food.processor.ts` — обработка в очереди Bull
- Vision: `apps/api/src/analysis/vision.service.ts` — `extractComponents()`
- AnalyzeService: `apps/api/src/analysis/analyze.service.ts` — `analyzeImage()`, `analyzeText()`
- NutritionOrchestrator: `apps/api/src/analysis/providers/nutrition-orchestrator.service.ts`
- HealthScore: формула в `computeHealthScore()`, веса, нормализация

**Ключевые вопросы:**
- Как задается язык (locale) для анализа? Где берется из профиля?
- Как хранятся результаты в БД (модель `Analysis`, `AnalysisResult`, `Meal`)?
- Есть ли поля для хранения исправленных ингредиентов (`userEditedName`, `userEditedPortionG`)?

**Приложи код:**
- Сигнатуры всех ключевых методов
- Интерфейсы `AnalyzedItem`, `AnalysisData`, `HealthScore`
- Модель Prisma для `Analysis` и `Meal`

### 1.3. Health Score и Feedback

**Найди:**
- Метод `computeHealthScore()` в `AnalyzeService`
- Как формируется `feedback` (текстовые комментарии)
- На каком языке возвращается feedback
- Почему иногда все факторы показывают 100%, а иногда 0%

**Приложи:**
- Полный код `computeHealthScore()` с формулами
- Код формирования `feedback` массивов
- Логику локализации feedback

### 1.4. Проблемы с напитками

**Найди:**
- Логику определения воды (`isPlainWater`)
- Логику для кофе/чая (`detectPlainCoffeeOrTea`)
- Канонические значения для напитков
- Почему напитки определяются неправильно

**Приложи код:**
- Все методы определения напитков
- Значения для воды/кофе/чая/капучино

---

## 2. МОДАЛЬНЫЕ ОКНА И НАВИГАЦИЯ

### 2.1. Базовый компонент модалки

**Найди:**
- `src/components/common/SwipeClosableModal.tsx` — базовый компонент
- Все места использования (AI Assistant, Lab Results, Edit Food, Profile, Statistics)

**Вопросы:**
- Как отключить swipe-to-close для AI Assistant?
- Почему двойной header в AI Assistant (наружный "AI Assistant" + внутренний "AI Nutrition Assistant")?

**Приложи код:**
- Полный код `SwipeClosableModal.tsx`
- Как используется в `AiAssistant.tsx` и `RealAiAssistant.tsx`

### 2.2. AI Assistant

**Найди:**
- `src/components/AiAssistant.tsx` — обертка модалки
- `src/components/RealAiAssistant.tsx` — сам чат
- Как открывается/закрывается
- Проблемы с клавиатурой и отступами

**Приложи:**
- Полный код обоих компонентов
- Как настроен `KeyboardAvoidingView` и `SafeAreaView`

### 2.3. Lab Results Modal

**Найди:**
- `src/components/LabResultsModal.tsx`
- Эндпоинт на бэке: `POST /ai-assistant/lab-results`
- DTO для приема данных
- Почему ошибка при ручном вводе

**Приложи:**
- Полный код модалки
- DTO `AnalyzeLabResultsDto`
- Метод `analyzeLabResults()` в `AiAssistantService`

---

## 3. SUGGESTED FOOD

### 3.1. Фронтенд

**Найди:**
- `src/screens/SuggestedFoodScreen.tsx` — экран
- Как отображаются `suggestedFood.title` и `suggestedFood.subtitle`
- Почему показываются ключи вместо текста

**Приложи:**
- Полный код экрана
- Как используется `t('suggestedFood.title')`

### 3.2. Бэкенд

**Найди:**
- `apps/api/src/suggestions/suggestions.service.ts` — логика подсказок
- `apps/api/src/suggestions/suggestions.controller.ts` — эндпоинт `GET /suggestions`
- Как берутся данные за 7 дней

**Приложи:**
- Полный код сервиса
- Структуру ответа API

### 3.3. i18n

**Найди:**
- `app/i18n/locales/en.json` — ключи `suggestedFood.*`
- `app/i18n/locales/ru.json` — переводы
- Почему контент карточек на русском при EN интерфейсе

**Приложи:**
- Все ключи `suggestedFood` из всех локалей

---

## 4. МЕСЯЧНЫЕ ОТЧЕТЫ

### 4.1. Бэкенд

**Найди:**
- `apps/api/stats/stats.service.ts` — метод `generateMonthlyReportPDF()`
- `apps/api/stats/stats.controller.ts` — эндпоинт `GET /stats/monthly-report`
- Как обрабатывается отсутствие данных
- Используется ли Bull-очередь для генерации

**Приложи:**
- Полный код генерации PDF
- Логику обработки ошибок

### 4.2. Фронтенд

**Найди:**
- `src/screens/ReportsScreen.tsx` — экран отчетов
- Как вызывается API
- Как обрабатываются ошибки

**Приложи:**
- Полный код экрана
- Метод загрузки отчета из `apiService.js`

---

## 5. ПРОФИЛЬ И МЕТАБОЛИЧЕСКИЕ ПАРАМЕТРЫ

### 5.1. Фронтенд

**Найди:**
- `src/screens/ProfileScreen.js` — экран профиля
- Экран редактирования профиля
- Какие поля редактируются (firstName, lastName, email, height, weight, age, goals, diets, метаболика, сон, eating behavior)

**Приложи:**
- Полный код обоих экранов
- Как отправляется запрос на обновление

### 5.2. Бэкенд

**Найди:**
- `apps/api/users/user-profiles.service.ts` — метод `updateProfile()`
- `apps/api/users/user-profiles.controller.ts` — эндпоинт `PUT /user-profile`
- `apps/api/users/dto/update-profile.dto.ts` — DTO
- Модель Prisma `UserProfile`

**Анализ ошибки из логов:**
```
PrismaClientValidationError: Invalid `prisma.userProfile.upsert()` invocation
email: "",
preferences: { subscription: { planId: "free", therapyGoal: "preserve_muscle", billingCycle: "monthly" }, ... },
healthProfile: { metabolic: { fatDistributionType: "visceral", ... }, ... },
eatingBehavior: { mealsPerDay: 3, sleepHours: 7.5, ... },
glp1Module: { isGlp1User: false, drugType: "semaglutide", ... }
```

**Вопросы:**
- Какие поля реально есть в Prisma-модели?
- Что не совпадает с тем, что приходит с фронта?
- Почему email `""` вызывает ошибку?

**Приложи:**
- Полную модель `UserProfile` из schema.prisma
- DTO `UpdateProfileDto`
- Метод `updateProfile()` с тем, что передается в `upsert()`

---

## 6. ЭКРАН АНАЛИЗА БЛЮДА (Analysis Complete)

### 6.1. Компонент результатов

**Найди:**
- `src/screens/AnalysisResultsScreen.js` — полный код
- Как отображаются: фото, Total Nutrition, Health Score, Ingredients
- Компонент `HealthScoreCard.tsx`

**Приложи:**
- Полный код экрана
- Компонент HealthScoreCard

### 6.2. Редактирование ингредиентов

**Найди:**
- `src/components/EditFoodItemModal.js` — модалка редактирования
- Что происходит при изменении названия/веса
- Есть ли вызов переанализа (`manualReanalyze`)

**Приложи:**
- Полный код модалки
- Метод `handleSaveEdit` в `AnalysisResultsScreen`

### 6.3. Локализация анализа

**Найди:**
- Где задается язык для feedback и Health Score комментариев
- Как локализуются названия блюд и ингредиентов
- `FoodLocalizationService` — как работает

**Приложи:**
- Полный код `FoodLocalizationService`
- Как передается locale в анализ

---

## 7. ИСТОРИЯ / RECENT

### 7.1. Модель данных

**Найди:**
- Модель Prisma `Meal` и `MealItem`
- Как хранится `imageUri` / `imageUrl`
- Почему нет фото на карточках

**Приложи:**
- Модель `Meal` из schema.prisma
- Как сохраняется фото при анализе

### 7.2. Фронтенд — карточки Recent

**Найди:**
- Компонент карточки Recent в `DashboardScreen.js`
- Как отображается фото
- Почему float значения типа `68.10000000000001`

**Приложи:**
- Код рендеринга карточек Recent
- Функции форматирования `formatMacro`, `formatCalories`

### 7.3. Бэкенд — API для Recent

**Найди:**
- `apps/api/meals/meals.service.ts` — метод `getMeals()`
- Что возвращается в ответе
- Есть ли `imageUri` в ответе

**Приложи:**
- Полный код метода `getMeals()`
- Структуру ответа

---

## 8. УВЕДОМЛЕНИЯ И РАСПИСАНИЕ ТАБЛЕТОК

### 8.1. Текущее состояние

**Найди:**
- Модели Prisma для уведомлений (`NotificationPreference`, `PushToken`)
- Сервисы: `NotificationsService`, `NotificationsScheduler`
- Есть ли что-то связанное с лекарствами/медикаментами

**Приложи:**
- Модели из schema.prisma
- Код сервисов уведомлений

### 8.2. Ошибка из логов

**Найди:**
- `apps/api/src/notifications/notifications.controller.ts` — эндпоинт `PUT /notifications/preferences`
- DTO `UpdateNotificationPreferencesDto`
- Что ожидается vs что приходит с фронта

**Приложи:**
- Полный код контроллера и DTO
- Анализ ошибки 400

---

## 9. АНАЛИЗ ЛОГОВ И ОШИБОК

### 9.1. Ошибки из логов

**Проанализируй:**
1. `ERROR [AllExceptionsFilter] HTTP 400 PUT /notifications/preferences` — что не так с DTO
2. `ERROR [UserProfilesService] updateProfile() failed... PrismaClientValidationError` — несоответствие схемы
3. Множественные `cache=miss` по `stats:monthly` — нормально или проблема?

**Приложи:**
- Точные места в коде, где возникают ошибки
- Что нужно исправить

---

## 10. ИТОГОВЫЙ СПИСОК ФАЙЛОВ

**Составь таблицу:**

| Проблема/Тема | Файлы фронта | Файлы бэка | Описание |
|---------------|--------------|------------|----------|
| Suggested Food ключи | `src/screens/SuggestedFoodScreen.tsx` | `apps/api/src/suggestions/*` | Показываются ключи вместо текста |
| AI Assistant двойной header | `src/components/AiAssistant.tsx`, `RealAiAssistant.tsx` | - | Два заголовка, swipe-to-close |
| Lab Results ошибка | `src/components/LabResultsModal.tsx` | `apps/api/ai-assistant/*` | Ошибка при ручном вводе |
| Profile update ошибка | `src/screens/ProfileScreen.js` | `apps/api/users/user-profiles.*` | PrismaClientValidationError |
| Monthly report ошибка | `src/screens/ReportsScreen.tsx` | `apps/api/stats/stats.*` | Не загружается PDF |
| Recent без фото | `src/screens/DashboardScreen.js` | `apps/api/meals/meals.*` | Нет изображений на карточках |
| Float значения | `src/utils/nutritionFormat.js` | - | `68.10000000000001` вместо `68.1` |
| Health Score 100% | `src/components/HealthScoreCard.tsx` | `apps/api/src/analysis/analyze.service.ts` | Всегда показывает 100% |
| Напитки неправильно | - | `apps/api/src/analysis/analyze.service.ts` | Вода/кофе определяются неверно |
| Нет переанализа | `src/screens/AnalysisResultsScreen.js` | `apps/api/food/food.service.ts` | При редактировании не пересчитывается |
| Текст на темной теме | `src/screens/AnalysisResultsScreen.js` | - | Плохо виден текст |

---

## ФОРМАТ ОТВЕТА

Для каждого раздела предоставь:

1. **Текущее состояние** (2-3 предложения)
2. **Пути файлов** (список)
3. **Ключевой код** (важные фрагменты)
4. **Проблемы** (список с описанием)
5. **Что исправить** (конкретные действия)

В конце — итоговая таблица всех файлов по проблемам.


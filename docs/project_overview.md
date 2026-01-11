# EatSense — Полное Техническое Руководство

> **Назначение**: Максимально подробная документация всего приложения EatSense для быстрой передачи контекста ИИ-ассистенту или новому разработчику.

---

## 📐 ЧАСТЬ 1: АРХИТЕКТУРА

### 1.1 Стек Технологий

| Слой | Технологии |
|------|------------|
| **Mobile** | React Native 0.75+, Expo SDK 52, Navigation 6.x |
| **State** | React Context API (`AuthContext`, `AnalysisContext`, `ThemeContext`) |
| **Backend** | NestJS 10+, Prisma ORM 5.x, PostgreSQL 15 |
| **AI/ML** | Google Cloud Vision API, OpenAI GPT-4o, FoodData Central |
| **Infra** | Railway (Deploy), Supabase (DB), Cloudflare R2 (Media) |

### 1.2 Структура Monorepo

```
eatsense/
├── apps/
│   └── api/                      # NestJS Backend
│       └── src/
│           ├── analysis/         # Food Analysis Pipeline
│           ├── suggestions/      # Smart Recommendations
│           ├── notifications/    # Push/Local Notifications
│           └── ...
├── src/                          # React Native App
│   ├── components/               # Reusable UI Components
│   ├── screens/                  # Screen Components
│   ├── contexts/                 # React Context Providers
│   ├── services/                 # API & Local Services
│   └── navigation/               # React Navigation Config
└── app/
    └── i18n/                     # Localization (ru/en/kk)
```

---

## 🔐 ЧАСТЬ 2: АВТОРИЗАЦИЯ И АУТЕНТИФИКАЦИЯ

### 2.1 Методы Входа (`AuthScreen.js`)

**Три способа входа:**

1. **Apple Sign In** (iOS only):
   - Вызов `AppleAuthentication.signInAsync()`.
   - Получение `identityToken`.
   - Отправка на `POST /auth/apple`.
   - Ответ: `{ accessToken, refreshToken, user: { id, email, isOnboardingCompleted } }`.

2. **Google Sign In**:
   - Инициализация `GoogleSignin.configure()` с Client IDs из `app.config.js`.
   - Вызов `GoogleSignin.signIn()` -> получение `idToken`.
   - Отправка на `POST /auth/google`.
   
3. **Email + OTP**:
   - Ввод email -> `POST /auth/request-otp`.
   - Ввод 6-значного кода -> `POST /auth/verify-otp`.
   - Rate Limiting: Cooldown 60 сек между повторными отправками.
   - Expiration: Код живет 5 минут.

### 2.2 Token Management (`ApiService.js`)

```js
// Storage Strategy:
// - accessToken -> AsyncStorage (auth.token)
// - refreshToken -> SecureStore (expo-secure-store) с fallback на AsyncStorage

async setToken(token, refreshToken) {
  this.token = token;
  await AsyncStorage.setItem('auth.token', token);
  await SecureStore.setItemAsync('auth.refreshToken', refreshToken);
}

// Auto-refresh при 401:
if (response.status === 401) {
  const refreshed = await this.refreshToken();
  if (refreshed) {
    // Retry original request with new token
  }
}
```

### 2.3 Auth State Machine (`AuthContext.tsx`)

```
┌─────────────────┐
│ App Start       │
└────────┬────────┘
         ▼
┌─────────────────┐
│ loadTokens()    │  <-- AsyncStorage + SecureStore
└────────┬────────┘
         ▼
    ┌────┴────┐
    │Token   │
    │Exists? │
    └────┬───┘
   Yes   │   No
    ▼    │    ▼
┌───────────────┐  ┌───────────────┐
│refreshToken() │  │ AuthScreen    │
└───────┬───────┘  └───────────────┘
        ▼
┌───────────────┐
│getUserProfile()│
└───────┬───────┘
        ▼
   ┌────┴────┐
   │Onboarding│
   │Complete? │
   └────┬────┘
  Yes   │   No
   ▼    │    ▼
┌─────────┐  ┌─────────────┐
│Dashboard│  │OnboardingScreen│
└─────────┘  └─────────────┘
```

---

## 🧭 ЧАСТЬ 3: ONBOARDING

### 3.1 Шаги Онбординга (`OnboardingScreen.js`)

| Step | Название | Данные |
|------|----------|--------|
| 1 | **Welcome** | Приветствие, список фич |
| 2 | **Gender** | `gender: 'male' | 'female'` |
| 3 | **Measurements** | `weight`, `height`, `age` (пикеры со скроллом) |
| 4 | **Activity** | `activityLevel: 'sedentary' | 'moderate' | 'active'` |
| 5 | **Goal** | `goal: 'lose' | 'maintain' | 'gain'` |
| 6 | **Plan** | Paywall (выбор подписки) |
| 7 | **Summary** | Расчет калорий/макросов |

### 3.2 Формула Расчета КБЖУ

```js
// Mifflin-St Jeor Equation:
const BMR = gender === 'male'
  ? (10 * weight) + (6.25 * height) - (5 * age) + 5
  : (10 * weight) + (6.25 * height) - (5 * age) - 161;

// Activity Multiplier:
const activityFactors = {
  sedentary: 1.2,
  moderate: 1.55,
  active: 1.725,
};

const TDEE = BMR * activityFactors[activityLevel];

// Goal Adjustment:
const goalAdjustments = {
  lose: TDEE - 500,    // Deficit 500 kcal
  maintain: TDEE,
  gain: TDEE + 300,    // Surplus 300 kcal
};

const dailyCalories = goalAdjustments[goal];

// Macro Split (standard):
const protein = (dailyCalories * 0.25) / 4;  // 25% protein
const carbs = (dailyCalories * 0.50) / 4;    // 50% carbs
const fat = (dailyCalories * 0.25) / 9;      // 25% fat
```

### 3.3 Commit Flow

```
1. Local state accumulates all answers
2. On final step:
   POST /user-profiles  (create or update)
   POST /user-profiles/complete-onboarding
3. AuthContext.refreshUser() -> sets user.isOnboardingCompleted = true
4. Navigation resets to Dashboard
```

---

## 🏠 ЧАСТЬ 4: DASHBOARD

### 4.1 Компоненты Дашборда (`DashboardScreen.js`)

| Компонент | Назначение |
|-----------|------------|
| **Calendar Bar** | Переключение дат (стрелки влево/вправо) |
| **Health Ring** | Круговой прогресс калорий (`CircularProgress`) |
| **Macros Row** | Protein / Carbs / Fat (граммы) |
| **Recent Meals** | Лента последних приемов пищи |
| **Pending Cards** | Карточки "Analyzing..." для активных анализов |
| **Recommendations** | Summary Card с советом дня |
| **AI Assistant** | Кнопка для открытия чата |
| **FAB (+)** | Floating Action Button с модалкой выбора источника |

### 4.2 Data Loading Flow

```js
useFocusEffect(() => {
  // Parallel loading:
  loadStats();              // GET /stats/dashboard
  loadRecentItems();        // GET /meals?date=...
  loadSuggestedFoodSummary(); // GET /suggestions/foods/v2
  loadUserStats();          // GET /users/stats
});
```

### 4.3 Pending Analyses Integration

```js
const pendingAnalyses = usePendingAnalyses(); // from AnalysisContext

// Render pending cards at top of feed:
{pendingAnalyses.map(analysis => (
  <PendingMealCard
    key={analysis.id}
    status={analysis.status}  // 'processing' | 'completed' | 'failed'
    localPreviewUri={analysis.localPreviewUri}
    onPress={() => navigate('AnalysisResults', { analysisId })}
    onRetry={() => retryAnalysis(analysisId)}
    onDelete={() => removePendingAnalysis(analysisId)}
  />
))}
```

### 4.4 FAB Options Modal

```
┌───────────────────────────────────┐
│           Add Meal                │
├───────────────────────────────────┤
│ 📸  Take Photo (Camera)           │
│ 🖼️  Choose from Gallery           │
│ 📝  Describe with Text            │
│ 🧪  Lab Results (experimental)    │
└───────────────────────────────────┘
```

---

## 🍎 ЧАСТЬ 5: АНАЛИЗ ЕДЫ (AI PIPELINE)

### 5.1 Capture Flow (`CameraScreen.js`, `GalleryScreen.js`)

**Camera:**
```js
// 1. Capture
const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });

// 2. Compress
const compressed = await ImageManipulator.manipulateAsync(
  photo.uri,
  [{ resize: { width: 1024 } }],
  { compress: 0.8, format: SaveFormat.JPEG }
);

// 3. Start analysis
const response = await ApiService.analyzeImage(compressed.uri, locale);
// Response: { analysisId, status: 'processing' }

// 4. Add to pending
addPendingAnalysis(response.analysisId, compressed.uri);

// 5. Navigate to Dashboard (optimistic)
navigation.navigate('Dashboard');
```

**Gallery:**
- Permissions: Проверка + запрос через `expo-image-picker`.
- Timeout handling: Если пикер не отвечает 3 сек — показываем кнопку retry.
- Compression: `resize: 1600`, `quality: 0.9` (выше для галереи).

### 5.2 Backend Analysis Pipeline (`analyze.service.ts`)

```
┌─────────────────────────────────────────────────────────────────┐
│                      ANALYSIS PIPELINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐    ┌─────────────────┐    ┌───────────────┐  │
│   │ Image Upload│───▶│ Vision Service  │───▶│ Components    │  │
│   │ (FormData)  │    │ (Google Vision) │    │ Extraction    │  │
│   └─────────────┘    └─────────────────┘    └───────┬───────┘  │
│                                                      │          │
│                                                      ▼          │
│   ┌──────────────────────────────────────────────────┴────────┐│
│   │               Beverage Detection                           ││
│   │  (water, black_coffee, tea, milk_coffee)                   ││
│   │  → If detected: use canonical values, skip providers       ││
│   └────────────────────────────┬──────────────────────────────┘│
│                                │                                │
│                                ▼                                │
│   ┌────────────────────────────┴──────────────────────────────┐│
│   │          Nutrition Orchestrator                            ││
│   │  Providers (priority order):                               ││
│   │  1. FoodData Central (USDA)                                ││
│   │  2. OpenFoodFacts                                          ││
│   │  3. Vision Fallback (GPT estimates)                        ││
│   └────────────────────────────┬──────────────────────────────┘│
│                                │                                │
│                                ▼                                │
│   ┌────────────────────────────┴──────────────────────────────┐│
│   │          Portion Estimation                                ││
│   │  Priority: Vision estimate > FDC serving > 150g default   ││
│   │  Clamping by category:                                     ││
│   │  - Minor (seeds/toppings): 1-15g                           ││
│   │  - Proteins: 30-500g                                       ││
│   │  - Grains: 50-400g                                         ││
│   │  - Vegetables: 20-400g                                     ││
│   └────────────────────────────┬──────────────────────────────┘│
│                                │                                │
│                                ▼                                │
│   ┌────────────────────────────┴──────────────────────────────┐│
│   │          Health Score Calculation                          ││
│   │  Factors: protein, fiber, saturatedFat, sugars, density   ││
│   │  Levels: poor (0-30), average (31-60), good (61-80),       ││
│   │          excellent (81-100)                                ││
│   └────────────────────────────┬──────────────────────────────┘│
│                                │                                │
│                                ▼                                │
│   ┌────────────────────────────┴──────────────────────────────┐│
│   │          Hidden Ingredients Detection                      ││
│   │  + Carcinogenic Risk Assessment                            ││
│   │  + Food Compatibility Checks                               ││
│   └────────────────────────────┬──────────────────────────────┘│
│                                │                                │
│                                ▼                                │
│                     ┌───────────────────┐                      │
│                     │ Save to Database  │                      │
│                     │ (Analysis + Meal) │                      │
│                     └───────────────────┘                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Polling Mechanism (`AnalysisContext.tsx`)

```js
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 30;
const BACKOFF_MULTIPLIER = 1.2;

const pollAnalyses = async () => {
  for (const analysis of pendingAnalyses) {
    if (analysis.status !== 'processing') continue;
    
    const result = await ApiService.getAnalysisStatus(analysis.analysisId);
    
    switch (result.status.toUpperCase()) {
      case 'COMPLETED':
        removePendingAnalysis(analysis.analysisId);
        // Trigger dashboard refresh
        break;
      case 'NEEDS_REVIEW':
        updateAnalysis(analysis.analysisId, { status: 'needs_review' });
        break;
      case 'FAILED':
        updateAnalysis(analysis.analysisId, { status: 'failed', errorMessage: '...' });
        break;
      default:
        // Still processing, increment attempts with backoff
        if (analysis.pollAttempts >= MAX_POLL_ATTEMPTS) {
          updateAnalysis(analysis.analysisId, { status: 'needs_review' });
        }
    }
  }
  
  // Schedule next poll with exponential backoff
  const nextInterval = POLL_INTERVAL_MS * Math.pow(BACKOFF_MULTIPLIER, attempts);
  setTimeout(pollAnalyses, Math.min(nextInterval, 10000));
};
```

### 5.4 Results Screen (`AnalysisResultsScreen.js`)

**Features:**
- **Image Display**: Фото блюда с gradient overlay.
- **Dish Name**: Editable (AI-generated, можно менять).
- **Totals**: Калории + БЖУ с форматированием.
- **Ingredients List**: `SwipeableIngredientItem` (свайп для удаления).
- **Edit Modal**: Изменение веса/названия через `EditFoodItemModal`.
- **Add Item**: Кнопка добавления забытого ингредиента.
- **Health Score Card**: Визуализация оценки рациона.
- **Ask AI**: Открывает чат с контекстом блюда.

### 5.5 Feedback Loop (User Corrections)

```js
// When user edits an ingredient:
const handleSaveEdit = async (updatedItem, index) => {
  // 1. Log correction for model retraining
  await ApiService.saveAnalysisCorrection({
    analysisId,
    itemId: originalItem.id,
    originalName: originalItem.name,
    correctedName: updatedItem.name,
    originalPortionG: originalItem.portion_g,
    correctedPortionG: updatedItem.portion_g,
    correctionType: 'nutrients',
    foodCategory: detectFoodCategory(updatedItem.name),
  });
  
  // 2. Recalculate totals
  const newResult = await ApiService.manualReanalyzeAnalysis(analysisId, updatedItems);
  
  // 3. Update local state
  setAnalysisResult(normalizeAnalysis(newResult));
};
```

---

## 📰 ЧАСТЬ 6: ARTICLES (СТАТЬИ)

### 6.1 Feed Screen (`ArticlesScreen.js`)

- **Featured Carousel**: Горизонтальный скролл избранных статей.
- **Feed List**: Вертикальный FlatList с пагинацией.
- **Search**: Поиск по названию и тегам.
- **Locale Filtering**: Показываем только статьи на текущем языке.

### 6.2 API Endpoints

```
GET /articles/feed?locale=ru&limit=20&offset=0
GET /articles/featured?locale=ru
GET /articles/slug/:slug?locale=ru
GET /articles/search?q=...&locale=ru
GET /articles/tag/:tag?locale=ru
```

---

## 👩‍⚕️ ЧАСТЬ 7: EXPERTS (МАРКЕТПЛЕЙС)

### 7.1 Service (`marketplaceService.js`)

```js
// Specialists
getSpecialists({ type, verified })  // GET /specialists
getSpecialist(id)                   // GET /specialists/:id

// Consultations
startConsultation(specialistId)     // POST /consultations/start/:id
getMyConsultations()                // GET /consultations/my
getConsultation(id)                 // GET /consultations/:id

// Messages
getMessages(consultationId)         // GET /messages/consultation/:id
sendMessage(consultId, content)     // POST /messages/consultation/:id
markAsRead(consultationId)          // POST /messages/consultation/:id/read
getUnreadCount()                    // GET /messages/unread-count

// Share data
shareMeals(consultId, from, to)     // POST /messages/consultation/:id/share-meals

// Reviews
createReview(consultId, rating, comment)  // POST /reviews/consultation/:id
```

### 7.2 Screens

| Screen | Назначение |
|--------|------------|
| `ExpertsScreen` | Главный экран: My Chats + категории специалистов |
| `SpecialistListScreen` | Список специалистов с фильтрами |
| `SpecialistProfileScreen` | Профиль специалиста + Start Consultation |
| `ConsultationsListScreen` | Мои консультации |
| `ChatScreen` | Чат с специалистом (WebSocket-ready) |

---

## 📊 ЧАСТЬ 8: REPORTS (ОТЧЕТЫ)

### 8.1 PDF Report Generation (`ReportsScreen.tsx`)

```js
const handleDownloadCurrentMonth = async () => {
  // 1. Request from backend
  const response = await ApiService.getMonthlyReport({ year, month, locale });
  
  // 2. Handle responses
  if (response.status === 204 || response.status === 404) {
    setNoData(true); // No meals this month
    return;
  }
  
  // 3. Convert ArrayBuffer to Base64
  const uint8Array = new Uint8Array(response.data);
  const base64Data = /* manual base64 encoding */;
  
  // 4. Save to file system
  await FileSystem.writeAsStringAsync(fileUri, base64Data, {
    encoding: FileSystem.EncodingType.Base64,
  });
  
  // 5. Save to history (AsyncStorage)
  await saveReportToHistory({ year, month, locale, fileUri, createdAt });
  
  // 6. Share
  await Sharing.shareAsync(fileUri);
};
```

### 8.2 Report History

- Хранится в `AsyncStorage` (`reports:history`).
- Retention: Последние 30 записей.
- Actions: Open (share), Delete.

---

## ⚙️ ЧАСТЬ 9: PROFILE & SETTINGS

### 9.1 Profile Screen (`ProfileScreen.js`)

**Sections:**

1. **Header**: Аватар, Имя, Email, Edit button.
2. **Personal Data**: Gender, Birthdate, Height, Weight.
3. **Goals**: Activity level, Goal type.
4. **Preferences**:
   - Theme (Light / Dark / System)
   - Language (RU / EN / KK)
   - Notifications (toggle + time picker)
5. **Health Parameters**: Advanced health settings.
6. **Subscription**: Manage plan.
7. **Support**: Help, Terms, Privacy, Delete Account.

### 9.2 Notification Settings

```js
// Save to backend
await ApiService.updateNotificationPreferences({
  mealReminders: true,
  dailyPush: true,
  dailyPushHour: 12,
  dailyPushMinute: 30,  // Minutes support added
  weeklyEmail: false,
});

// Schedule local notifications
await localNotificationService.scheduleDailyNotification(
  { title: '...', body: '...' },
  hour,
  minute
);
```

---

## 🔔 ЧАСТЬ 10: NOTIFICATIONS

### 10.1 Local Notifications (`localNotificationService.ts`)

**Categories:**
- `meal_reminder` — Напоминание о еде (завтрак/обед/ужин).
- `medication_reminder` — Напоминание о лекарствах.
- `daily_tip` — Ежедневный совет.

**Android Channels:**
- `reminders` — Importance: HIGH, vibration pattern.
- `medications` — Importance: MAX (critical).

### 10.2 Scheduling

```js
// Daily meal reminders (1/2/3 times)
scheduleMealReminders(frequency: 1 | 2 | 3);
// Times: 09:00, 13:00, 19:00

// Medication reminder
scheduleMedicationReminder(medicationName, hour, minute, medicationId);

// Cancel by category
cancelNotificationsByCategory('meal_reminder');
```

---

## 🌍 ЧАСТЬ 11: ЛОКАЛИЗАЦИЯ

### 11.1 Setup (`app/i18n/config.ts`)

- Библиотека: `i18next` + `react-i18next`.
- Локали: `en`, `ru`, `kk`.
- Fallback: `en`.
- Storage: `AsyncStorage` для persistence.

### 11.2 Usage

```jsx
const { t, language, changeLanguage } = useI18n();

// In component:
<Text>{t('dashboard.calories')}</Text>

// Change language:
await changeLanguage('ru');
await ApiService.updateUserProfile({ locale: 'ru' });
```

---

## 🔧 ЧАСТЬ 12: УТИЛИТЫ И ХЕЛПЕРЫ

### 12.1 API Service Error Handling

```js
// buildHttpError() logic:
if (status === 502 || status === 504) {
  message = 'Server temporarily unavailable. Please try again.';
  error.isNetworkError = true;
}

if (status === 401) {
  // Try refresh token, then retry
}

if (text.includes('ERR_NGROK')) {
  // Dev environment tunnel error
  errorCode = 'NGROK_XXX';
}
```

### 12.2 Media URL Resolution

```js
resolveMediaUrl(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  
  // Relative path -> absolute
  return `${this.baseURL}${url.startsWith('/') ? url : '/' + url}`;
}
```

### 12.3 Nutrition Formatting

```js
formatCalories(value) -> '1,234 kcal'
formatMacro(value)    -> '45.3g'
formatMacroInt(value) -> '45g'
```

---

## 🚀 ЧАСТЬ 13: ДЕПЛОЙ И СБОРКА

### 13.1 iOS Build

```bash
# Prebuild
npx expo prebuild --platform ios --clean

# Build
eas build --platform ios --profile production

# Submit
eas submit --platform ios --latest
```

### 13.2 Railway Pre-deploy

```bash
pnpm --filter ./apps/api run prisma:generate && \
pnpm --filter ./apps/api run prisma:migrate:deploy && \
pnpm --filter ./apps/api run prisma:seed:articles
```

### 13.3 Environment Variables

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_BASE_URL` | Backend URL |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google OAuth iOS |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Google OAuth Android |
| `DATABASE_URL` | PostgreSQL connection string |
| `GOOGLE_CLOUD_VISION_API_KEY` | Vision API key |
| `OPENAI_API_KEY` | GPT-4 for analysis |

---

## 📝 CHANGELOG

- **v1.0**: Initial documentation.
- **v2.0**: Added detailed Analysis Pipeline, Onboarding math, Auth state machine.
- **v3.0**: Added Notifications, Experts, Reports, Profile sections.

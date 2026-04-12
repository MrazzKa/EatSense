# EatSense — Roadmap: Эксперты Marketplace (MVP)

> **Назначение:** общий план между сессиями. Каждый этап автономен и заканчивается рабочей фичей.
> **Цель MVP:** пригласить 2-3 нутрициологов/диетологов для пилота. Всё бесплатно, полный цикл: регистрация эксперта → маркетплейс → чат → шаринг отчётов → отзывы.
> **Статус нотация:** ⬜ TODO · 🟨 IN PROGRESS · ✅ DONE · ⏸ PAUSED · ❌ BLOCKED
> **Последнее обновление:** 2026-04-12

---

## ⚙️ Глобальные решения (зафиксировано)

| Тема | Решение |
|---|---|
| Регистрация эксперта | Из Профиля обычного юзера → апгрейд роли (self-service, шаговая форма в приложении) |
| Точка входа | Таб "Experts" показывает маркетплейс + баннер "Вы специалист? Зарегистрируйтесь" |
| Верификация документов | Ручная, через расширенную `apps/admin/index.html` (новая вкладка "Experts") |
| Монетизация (MVP) | **Отложена.** Всё бесплатно. Поля `priceType`/`price` остаются в схеме, скрыты в UI |
| Чат-канал | Текст + фото |
| Real-time | Polling 3-5 сек на открытом экране чата. WebSocket — post-MVP |
| Шаринг отчётов | Все типы (питание, фото+КБЖУ, лаб. анализы, профиль здоровья) — по согласию клиента |
| Поиск/выдача | Список + фильтры (язык, специализация, рейтинг), карточки рекомендаций сверху |
| Геопривязка | Глобально, без |
| Юрисдикция MVP | Швейцария. Дисклеймеры уже есть в `src/legal/disclaimers.json` (expert_marketplace, data_sharing_consent) — generic, не Swiss-specific юр. текст. Для пилота достаточно |
| Языки UI | **en, ru, kk, fr, de, es** (6 языков; de и es — новые) |
| Изоляция роли | Эксперт продолжает видеть обычные функции. Кабинет эксперта — на веб-портале (не в приложении) |
| Push-уведомления | Нужны для MVP. Expo Push SDK уже настроен (`apps/api/src/notifications/`). Добавить отправку при новом сообщении |
| Завершение консультации | Эксперт нажимает "Завершить" → статус `completed` → клиент может оставить отзыв |
| Платформы | iOS (приоритет) + Android |
| Специализации | Фиксированный список (12 штук): weightManagement, sportsNutrition, clinicalNutrition, pediatricNutrition, eatingDisorders, diabetesManagement, foodAllergies, vegetarianVegan, pregnancyNutrition, geriatricNutrition, gutHealth, mentalHealthNutrition |
| Уведомление об одобрении | Push-уведомление эксперту при approve |
| Список консультаций клиента | Из таба Experts (секция "Мои консультации" сверху) |

---

## 🏗 Архитектура системы

### Что уже реализовано (бэкенд ~95%)

| Модуль | Статус | Файлы |
|--------|--------|-------|
| `experts/` (controller, service, DTOs) | ✅ Полный CRUD, фильтры, листинг, авто-создание бесплатного оффера | `apps/api/src/experts/` |
| `conversations/` | ✅ Создание, список, unread count | `apps/api/src/conversations/` |
| `messages/` | ✅ Текст, фото, share-meals, share-report | `apps/api/src/messages/` |
| `reviews/` | ✅ CRUD, рейтинг-агрегация | `apps/api/src/reviews/` |
| `safety/` | ✅ Дисклеймеры, abuse reports, blocking | `apps/api/src/safety/` |
| `notifications/` | ✅ Expo Push SDK, токены, preferences | `apps/api/src/notifications/` |
| Prisma schema + миграция | ✅ 9 моделей, индексы | `apps/api/prisma/schema.prisma` |
| `MarketplaceService` (фронт API-клиент) | ✅ Все эндпоинты обёрнуты | `src/services/marketplaceService.ts` |
| Auth (OTP + Apple + Google + Magic Link) | ✅ Продакшн-ready, `expertsRole` в ответе | `apps/api/auth/` |

### Что сделано на фронте

| Область | Статус | Описание |
|---------|--------|----------|
| Дубликаты экранов | ✅ Удалены | `SpecialistListScreen`, `SpecialistProfileScreen`, `ConsultationChatScreen` — удалены, ссылки вычищены |
| Навигация | ✅ Настроена | Route `BecomeExpert` добавлен в root Stack (`App.tsx`). Используем root stack (как все остальные табы) |
| Role context | ✅ Готов | `useIsExpert()` хук в `src/hooks/useIsExpert.ts`. `expertsRole` добавлен в `users.service.ts:getProfile` и `auth.service.ts:refreshToken` |
| i18n (6 языков) | ✅ 70+ новых ключей | Специализации, онбординг, маркетплейс, чат, reviews, шаринг данных — en, ru, kk, fr, de, es |
| Expert onboarding | ✅ Полная 6-шаговая форма | `src/screens/expert/BecomeExpertScreen.tsx` |
| Entry points | ✅ Добавлены | Баннер в `ExpertsScreen` + кнопка в `ProfileScreen` |

### Что осталось сделать

| Область | Статус | Описание |
|---------|--------|----------|
| ExpertsScreen (маркетплейс) | ✅ | Полноценный маркетплейс: поиск, фильтры, рекомендации, карточки, pagination |
| ExpertProfileScreen | ✅ | Переписан на MarketplaceService. Hero, bio, credentials, offers, reviews, CTA |
| ChatScreen (чат) | ✅ | Polling 4s, фото, read markers, menu (report/complete), disclaimer, special messages |
| ConsultationsListScreen | ✅ | Unread badge, last message preview, time, completed status, pull-to-refresh |
| Админка (верификация) | ✅ | Вкладка "Experts" в `apps/admin/index.html` + backend admin endpoints |
| Expert Portal (веб) | ✅ | Next.js 15 + Tailwind в `apps/expert-portal/` — login, dashboard, chats, client data, profile editor |
| Push при новом сообщении | ✅ | Fire-and-forget push в MessagesService.create(), NotificationsModule инжектирован |
| Шаринг отчётов | ✅ | GET /conversations/:id/client-data + report request/grant/revoke flow в ChatScreen |
| Reviews | ✅ | ReviewModal (stars + comment), "Leave a Review" кнопка в ended banner, completion validation |

### Удалённые дубликаты (Phase 1.1, done)

| Файл | Что произошло |
|------|--------------|
| `src/screens/SpecialistListScreen.tsx` | ✅ Удалён. Использовал смешанный API. Заменён ExpertsScreen |
| `src/screens/SpecialistProfileScreen.tsx` | ✅ Удалён. Старый API. Заменён ExpertProfileScreen |
| `src/screens/ConsultationChatScreen.tsx` | ✅ Удалён. Старый ApiService. Заменён ChatScreen (который уже на MarketplaceService) |
| `App.tsx` routes | ✅ Очищены: убраны SpecialistList, SpecialistProfile, ConsultationChat. Добавлен BecomeExpert |
| `ConsultationsListScreen.tsx` | ✅ Навигация `SpecialistList` → `Experts` |
| Старые методы `apiService.ts` | ✅ Удалены 10 методов (specialist + consultation). Backward-compat обёртки в marketplaceService тоже удалены |

---

## 🌐 Expert Portal (веб-кабинет эксперта)

### Решения

| Тема | Решение | Обоснование |
|------|---------|-------------|
| Технология | **Next.js** в `apps/expert-portal/` | Масштабируется, роутинг, SSR, шарит типы с API. Монорепо-friendly |
| Деплой | **Vercel**, поддомен `experts.eatsense.ch` | Чисто, профессионально, легко мигрировать на Railway позже |
| Логин | **Magic Link** (email → ссылка → клик → JWT) | Уже реализован на бэкенде. Лучший web UX — без ввода кодов |
| Дизайн | Свободный (Tailwind), но в стиле лендинга `legal-site` | Визуальная связь с брендом |
| Почему не в приложении | Руководитель попросил вынести на сайт. Логично: экспертам удобнее работать с ПК |

### Функционал портала (MVP)

1. **Логин** — ввод email → magic link → JWT в cookie/localStorage
2. **Дашборд** — статус профиля (опубликован / на модерации / отклонён), кол-во клиентов, непрочитанные
3. **Чаты** — список диалогов с клиентами, полноценная переписка (текст + фото)
4. **Данные клиента** — питание за N дней (фото + КБЖУ), лаб. анализы, профиль здоровья (только после согласия клиента)
5. **Мой профиль** — редактирование bio, специализаций, языков, документов

---

## 🚨 PHASE 0 — Срочные правки (перед маркетплейсом)

### 0.1 Bug: фото-лимиты при недоступности Redis ✅
**Что сделано (2026-04-08):** Fail-closed с DB-fallback в `daily-limit.guard.ts`. Sentinel detection `newCount <= 0` → считаем `Analysis.count()` из БД.

### 0.2 Audit: «глубокие настройки не настроены» ⬜
Research-задача. Не блокирует маркетплейс. Отложена.

### 0.3 Onboarding: больше инструкций при входе ⬜
Не блокирует маркетплейс. Отложена.

### 0.4 Видео-инструкция ⏸
Юзер запишет позже.

### 0.5 Bug: fail-open в OTP rate limiting ✅
**Что сделано (2026-04-08):** In-memory fallback в `auth.service.ts`. Per-process, не шарится между репликами — acceptable tradeoff.

---

## 🏗 PHASE 1 — Cleanup + Foundation ✅

### 1.1 Снести дубликаты экранов ✅
**Что сделано (2026-04-11):**
- Проверены все импорты через Grep: `SpecialistListScreen`, `SpecialistProfileScreen`, `ConsultationChatScreen` использовались только в `App.tsx` + друг в друге
- **Удалены файлы:**
  - `src/screens/SpecialistListScreen.tsx`
  - `src/screens/SpecialistProfileScreen.tsx`
  - `src/screens/ConsultationChatScreen.tsx` (заменён `ChatScreen.tsx`, который уже использует MarketplaceService)
- **Обновлён `App.tsx`:** убраны lazy imports и Stack.Screen для всех трёх экранов
- **Обновлён `ConsultationsListScreen.tsx`:** навигация `SpecialistList` → `Experts`
- Старые методы в `apiService.ts` (`getSpecialists`, `getSpecialist`, `requestConsultation`) оставлены пока — `ExpertProfileScreen` ещё их использует. Удалим при Phase 3.2

### 1.2 Навигация: Expert routes ✅
**Что сделано (2026-04-11):**
- Решено НЕ создавать отдельный ExpertsStackNavigator (все остальные табы используют root Stack — консистентность)
- Добавлен route `BecomeExpert` в root Stack (`App.tsx`)
- Существующие routes `ExpertProfile`, `Chat`, `ConsultationsList` уже в root Stack
- Создана директория `src/screens/expert/`

### 1.3 Role context ✅
**Что сделано (2026-04-11):**
- **`apps/api/users/users.service.ts`:** добавлен `expertsRole: true` в `select` метода `getProfile()` — теперь фронт получает роль при загрузке профиля
- **`apps/api/auth/auth.service.ts`:** добавлен `expertsRole: result.user.expertsRole` в ответ `refreshToken()` — роль доступна сразу после авто-логина
- **`src/hooks/useIsExpert.ts`:** создан хук `useIsExpert()` — возвращает `true` если `user.expertsRole === 'EXPERT'`

### 1.4 i18n: marketplace ключи для 6 языков ✅
**Что сделано (2026-04-11):**
- Добавлены **70+ новых ключей** в блок `experts` для всех 6 языков (en, ru, kk, fr, de, es)
- **Специализации:** 12 вариантов с переводами (weightManagement, sportsNutrition, clinicalNutrition, ...)
- **Онбординг эксперта:** 6 шагов (step1Title...step6Description), uploadDiploma, acceptDisclaimer, submitForReview
- **Маркетплейс:** search, filters, recommended, allExperts, noResults, freeConsultation, rating, yearsExperience, writeToExpert
- **Чат/данные:** completeConsultation, shareData, shareDataRequest, allowAccess, revokeAccess
- **Reviews:** leaveReview, reviewPlaceholder, submitReview
- **Статусы:** pendingReview, profileApproved, profileRejected, rejectionReason
- Все JSON файлы проверены (`python3 json.load`) — валидные

**Exit criteria:** ✅ Навигация работает, дубликаты удалены, role context доступен, i18n готов.

---

## 👤 PHASE 2 — Expert Onboarding (стать экспертом — в приложении) ✅

### 2.1 Backend: дополнения ✅
**Что сделано (2026-04-11):**
- Проверены все эндпоинты: `POST /experts/me/profile` корректно создаёт профиль с `isPublished=false` и апгрейдит роль на `EXPERT`
- **Добавлено авто-создание бесплатного оффера** в `experts.service.ts:createProfile()`:
  - При создании профиля автоматически создаётся `ExpertOffer` с `format: 'CHAT_CONSULTATION'`, `priceType: 'FREE'`, `isPublished: true`
  - Названия и описания на 6 языках (en, ru, kk, fr, de, es)
  - Не нужен отдельный шаг "создание услуги" в онбординге
- Credential upload работает через: `ApiService.uploadImage(uri)` → получаем `url` → `MarketplaceService.uploadCredential({ name, fileUrl, fileType })`

### 2.2 Front: шаговая форма ✅
**Что сделано (2026-04-11):**
**Файл:** `src/screens/expert/BecomeExpertScreen.tsx` (~450 строк)

**6 шагов:**
1. **Дисклеймер:** иконка + текст из `disclaimer.point1/2/3` + чекбокс `acceptDisclaimer`. Без чекбокса — кнопка Next неактивна
2. **Профиль:** displayName (обязательно), тип (nutritionist/dietitian — кнопки-переключатели), bio (минимум 50 символов, счётчик), education, experienceYears
3. **Специализации + языки:** 12 специализаций (chip multi-select), 6 языков (chip multi-select). Минимум 1 специализация и 1 язык
4. **Документы:** загрузка фото через `expo-image-picker`, превью, удаление. Опционально (можно пропустить)
5. **Превью:** карточка профиля как её увидит клиент — аватар, имя, тип, био, образование, опыт, специализации, языки, кол-во документов
6. **На модерации:** иконка "hourglass" + текст "Мы уведомим вас, когда профиль будет одобрен". Кнопка "Done" → возврат на главный экран

**Технические детали:**
- `useMemo(() => createStyles(tokens, colors), [tokens, colors])` — правильная мемоизация стилей
- `KeyboardAvoidingView` для iOS
- Step indicator (точки) с анимированной шириной активного шага
- Валидация по шагам (`canGoNext`) — кнопка Next неактивна если данные невалидны
- При Submit: `MarketplaceService.createExpertProfile()` → upload каждого документа → `refreshUser()` для обновления `expertsRole`
- Error handling с `Alert.alert`

### 2.3 Entry points ✅
**Что сделано (2026-04-11):**

**`src/screens/ExpertsScreen.tsx`:**
- Для обычных юзеров (не экспертов): баннер внизу экрана "Вы специалист?" с иконкой school + chevron → navigate('BecomeExpert')
- Для экспертов: зелёный баннер со статусом (checkmark + "Pending Review")
- Используется `useIsExpert()` хук

**`src/screens/ProfileScreen.tsx`:**
- Добавлена секция перед "Delete Account"
- Кнопка с иконкой school-outline:
  - Если `user.expertsRole !== 'EXPERT'`: "Become an Expert" → navigate('BecomeExpert')
  - Если `user.expertsRole === 'EXPERT'`: "Expert Profile" → Alert с текущим статусом (в будущем — ссылка на веб-портал)

**Exit criteria:** ✅ Юзер проходит форму → профиль создан с `isPublished=false` → виден в админке. Entry points в Experts табе и Profile.

---

## 🛒 PHASE 3 — Marketplace (для пользователя) ✅

### 3.1 Front: ExpertsScreen (полноценный) ✅
**Что сделано (2026-04-12):**
**Файл:** `src/screens/ExpertsScreen.tsx` — полностью переписан из заглушки "Coming Soon" в полноценный маркетплейс.

- **Поиск:** debounced (400ms) текстовое поле в шапке
- **Фильтры:** модалка с 12 специализациями (chip multi-select), 6 языками, кнопка Apply/Reset
- **Рекомендуемые:** горизонтальный ScrollView, отсортировано по рейтингу, компактные карточки
- **Лента:** FlatList с карточками (avatar, displayName, type, rating, experience, specialization chips, "Free Consultation")
- **Pull-to-refresh** + **бесконечная прокрутка** (offset pagination, PAGE_SIZE=20)
- **Баннер регистрации** внизу для не-экспертов → `BecomeExpert`
- Используется `MarketplaceService.getExperts(filters)`

### 3.2 Front: ExpertProfileScreen (публичный) ✅
**Что сделано (2026-04-12):**
**Файл:** `src/screens/ExpertProfileScreen.tsx` — полностью переписан на MarketplaceService.

- **Hero:** avatar (100px), displayName + verified badge, title, type (Dietitian/Nutritionist), stats row (rating, experience years, consultation count)
- **Секции:** Bio, Education, Specializations (chips), Languages (chips), Credentials (карточки с ribbon icon), Offers/Services (localized names, price), Reviews (stars, author, date, comment)
- **CTA:** full-width "Message Expert" кнопка → disclaimer modal → `MarketplaceService.startConversation()` → navigate('Chat')
- **Удалены старые методы из `apiService.ts`:** `getSpecialists`, `getSpecialist`, `registerAsSpecialist`, `requestConsultation`, `getMyConsultations`, `getConsultation`, `getMessages`, `sendMessage`, `markAsRead`, `getUnreadMessagesCount` (10 методов)
- **Удалены backward-compat обёртки из `marketplaceService.ts`:** `getSpecialists`, `getSpecialist`, `getMyConsultations`, `getConsultation`
- **Исправлены ссылки:** `ChatScreen.tsx` → `getConversation()`, `ConsultationsListScreen.tsx` → `getConversations()`
- **i18n:** добавлены 5 новых ключей (`messageExpert`, `typeDietitian`, `typeNutritionist`, `yearsExp`, `services`) × 6 языков

**Exit criteria:** ✅ пользователь видит ленту, открывает профиль, нажимает "Написать" → попадает в чат.

---

## 💬 PHASE 4 — Чат ✅

### 4.1 Backend: push при новом сообщении ✅
**Что сделано (2026-04-12):**
- **`apps/api/src/messages/messages.module.ts`:** импортирован `NotificationsModule`
- **`apps/api/src/messages/messages.service.ts`:** инжектирован `NotificationsService`
- Добавлен метод `sendMessagePush()` — fire-and-forget (не блокирует ответ):
  - Определяет получателя (client → push expert, expert → push client)
  - Формирует title = sender name, body = текст (обрезан до 100 символов) / "📷 Photo" / "New message"
  - Передаёт `data: { type: 'new_message', conversationId, messageId }` для deep link
- Ошибки push-а логируются, но не ломают отправку сообщения

### 4.2 Front: ConsultationsListScreen ✅
**Что сделано (2026-04-12):**
**Файл:** `src/screens/ConsultationsListScreen.tsx` — полностью переписан.

- **Данные:** `MarketplaceService.getConversations()` → `asClient` массив
- **Карточки:** аватар эксперта (или placeholder), имя + verified badge, превью последнего сообщения (текст/фото/meals/report), время (Today HH:MM / Yesterday / weekday / date)
- **Unread badge:** зелёный кружок с числом непрочитанных (`_count.messages`)
- **Статус:** "Completed" с иконкой checkmark-done для завершённых
- **Pull-to-refresh** через `RefreshControl`
- **Авто-обновление** при фокусе экрана (`useFocusEffect`)
- **Empty state:** иконка + текст + кнопка "Find Expert" → navigate('Experts')
- Стили через `useMemo(() => createStyles(tokens, colors), [tokens, colors])`

### 4.3 Front: ChatScreen (доработка) ✅
**Что сделано (2026-04-12):**
**Файл:** `src/screens/ChatScreen.tsx` — полностью переписан с расширениями.

- **Polling:** каждые 4 сек через `setInterval` + `useFocusEffect` (старт при фокусе, стоп при blur). Сравнивает `lastMessageId` — обновляет только при новых сообщениях. Авто-markAsRead.
- **Фото:** кнопка камеры в input bar → `expo-image-picker` → `ApiService.uploadImage()` → `sendMessage(convId, url, 'photo')`. Рендер фото в пузыре (200×200, borderRadius: 12).
- **Read markers:** галочка `checkmark-done` на своих прочитанных сообщениях (`item.isRead`).
- **Меню "...":** ActionSheet (iOS) / Alert (Android):
  - "Share Meals" → confirm → `shareMeals()` (7 дней)
  - "Complete Consultation" (только для эксперта, только если active) → confirm → `updateConversation(status: 'completed')`
  - "Report" → confirm → `createAbuseReport()`
- **Disclaimer:** `experts_chat` type проверяется при первом открытии. Cancel → goBack.
- **Специальные сообщения:** meal_share (🍽 badge), report_share (📊 badge) рендерятся с иконками.
- **isMe определение:** через `user.id` из `useAuth()` (не `conversation.clientId` — работает для обеих ролей).
- **Header:** имя собеседника (expert.displayName для клиента, client.firstName для эксперта), статус Active/Completed.
- **Ended banner:** "Consultation completed" с иконкой, скрывает input.
- **i18n:** 10 новых ключей × 6 языков (activeConsultation, sharedMeals, sharedReport, noMessages, findExpertHint, reportAbuse, reportAbuseConfirm, reportSent, report, photo)

**Exit criteria:** ✅ клиент и эксперт переписываются, видят сообщения, шлют фото, получают push. Эксперт завершает консультацию.

---

## 📊 PHASE 5 — Шаринг отчётов ✅

### 5.1 Backend ✅
**Что сделано (2026-04-12):**
- **`GET /conversations/:id/client-data`** — новый эндпоинт в `conversations.controller.ts` / `conversations.service.ts`
  - Доступен только эксперту (`conversation.isExpert`)
  - Проверяет `reportsShared === true`, иначе 403
  - Возвращает: meals (30 дней, с items/КБЖУ), labResults (20 записей, с metrics), healthProfile (age, height, weight, gender, goal, dailyCalories, preferences, healthProfile JSON)
- **`getClientData()`** метод добавлен в `MarketplaceService` на фронте
- Существующие эндпоинты (`share-meals`, `share-report`) уже работают

### 5.2 Front (в приложении) ✅
**Что сделано (2026-04-12):**
Обновлён `ChatScreen.tsx` для полного report sharing flow:

- **Меню эксперта:** "Request Data Access" → отправляет сообщение type `report_request`
- **Меню клиента:** "Revoke Data Access" (только если доступ предоставлен)
- **Рендер `report_request`:** оранжевый badge "Data Access Request" + текст запроса
  - Для клиента: кнопки **Allow / Deny** (если доступ ещё не предоставлен)
  - Если доступ уже предоставлен: зелёная галочка "Access granted"
- **Grant flow:** `handleGrantAccess()` → `updateConversation(reportsShared: true)` → автоматическое сообщение type `report_grant`
- **Revoke flow:** `handleRevokeAccess()` → `updateConversation(reportsShared: false)` → сообщение type `report_revoke`
- **System messages:** `report_grant` и `report_revoke` рендерятся как центрированные info-bubbles с иконками lock
- **i18n:** 4 новых ключа × 6 языков (requestDataAccess, dataAccessRequest, accessGranted, accessRevoked)

### 5.3 Front (в веб-портале эксперта) ⬜
- Перенесено в Phase 8 (Expert Portal). Бэкенд endpoint готов, UI будет в Next.js.

**Exit criteria:** ✅ эксперт запрашивает доступ → клиент разрешает/отказывает → эксперт видит данные (через API). Клиент может отозвать.

---

## ⭐ PHASE 6 — Reviews ✅

### 6.1 Backend ✅
**Что сделано (2026-04-12):**
- **`reviews.service.ts`:** добавлена проверка `conversation.status !== 'completed'` → 403 "Can only review completed consultations"
- Один отзыв на пару (client, expert) уже реализован (upsert по `clientId_expertId` unique index)
- Пересчёт `ExpertProfile.rating` и `reviewCount` через `expertsService.updateRating()` — уже работал

### 6.2 Front ✅
**Что сделано (2026-04-12):**
- **`src/components/common/ReviewModal.tsx`** — новый компонент (~170 строк):
  - Bottom sheet modal с backdrop
  - 5 звёзд (tap to select) + текстовая оценка (Excellent/Good/Average/Below Average/Poor)
  - Textarea для комментария (опционально, до 500 символов)
  - Кнопки Cancel/Submit
  - Вызывает `MarketplaceService.createReview(expertId, rating, comment, conversationId)`
  - Сброс состояния при закрытии
- **`ChatScreen.tsx`:** интегрирован ReviewModal
  - При `status === 'completed'` и `conversation.isClient` — кнопка "Leave a Review" (жёлтый, иконка star) в ended banner
  - Alert с благодарностью после отправки
- Отзывы уже отображаются на `ExpertProfileScreen` (Phase 3.2)
- **i18n:** 6 новых ключей × 6 языков (reviewSubmittedDesc, ratingExcellent/Good/Average/BelowAverage/Poor)

**Exit criteria:** ✅ клиент оставляет отзыв после завершённой консультации, рейтинг обновляется.

---

## 🛠 PHASE 7 — Админка верификации ✅

### 7.1 Backend: admin endpoints ✅
**Что сделано (2026-04-12):**
- **`apps/api/src/experts/experts-admin.controller.ts`** — новый контроллер:
  - `GET /admin/experts` — список с фильтром `?status=pending|approved|rejected`, includes: credentials, user info, counts (reviews, conversations)
  - `GET /admin/experts/:id` — полные детали с credentials, offers, user, reviews (5 последних), counts
  - `POST /admin/experts/:id/approve` — `isPublished=true`, `isVerified=true`, `isActive=true` + approves pending credentials + push "Profile Approved!"
  - `POST /admin/experts/:id/reject` — `isPublished=false`, `isVerified=false`, `isActive=false` + rejects pending credentials + push с optional reason
- **`apps/api/src/experts/experts.module.ts`** — зарегистрирован `ExpertsAdminController`, импортирован `NotificationsModule`
- Все endpoint'ы за `x-admin-secret` (как существующие)

### 7.2 Front: вкладка Experts в админке ✅
**Что сделано (2026-04-12):**
**Файл:** `apps/admin/index.html`

- **Таб:** кнопка "👨‍⚕️ Experts" в навигации, `switchTab()` обновлён
- **Фильтры:** All / Pending / Approved / Rejected — кнопки с active state
- **Статистика:** полоса со счётчиками (total, pending, approved)
- **Карточки экспертов:** displayName, status badge (Pending/Approved/Rejected с цветами), тип, email, опыт, bio preview, specialization chips, language chips, credentials (кол-во + статусы + "View" ссылки на файлы), rating, conversations count
- **Действия:** кнопки Approve / Reject для pending экспертов. Approve с confirm, Reject с prompt для причины
- **Empty state:** при отсутствии экспертов

**Exit criteria:** ✅ в `/admin` видна вкладка "Experts", можно просматривать, одобрять и отклонять экспертов.

---

## 🌐 PHASE 8 — Expert Portal (Next.js) ✅

### 8.1 Setup проекта ✅
**Что сделано (2026-04-12):**
- `apps/expert-portal/` — Next.js 15 (App Router) + Tailwind CSS 4
- `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`
- Тёмная тема (CSS variables), совпадает с админкой
- Build проходит успешно: 8 routes, все статические + 2 динамических
- CORS: нужно добавить `experts.eatsense.ch` в `CORS_ORIGINS` на Railway при деплое

### 8.2 Авторизация ✅
**Что сделано (2026-04-12):**
- **Login page** (`app/page.tsx`): ввод email → `POST /auth/request-magic-link` с `redirectUrl` для портала → "Check your email" screen
- **Backend:** добавлен опциональный `redirectUrl` в `RequestMagicLinkDto` и `auth.service.ts` — magic link URL становится `redirectUrl?token=xxx` вместо API URL
- **Callback** (`app/auth/callback/page.tsx`): извлекает token из URL → `GET /auth/magic-link?token=xxx` → сохраняет JWT в localStorage → redirect на /dashboard
- **Auth context** (`lib/auth-context.tsx`): `useAuth()` хук, `AuthProvider`, auto-refresh, `fetchUser` через `/users/me/profile`
- **Protected route** (`components/protected-route.tsx`): проверяет `expertsRole === 'EXPERT'`, иначе — "Not an expert" экран
- **API client** (`lib/api.ts`): `apiFetch()` с auto-refresh на 401, Bearer token injection
- Suspense boundary для `useSearchParams` (Next.js 15 requirement)

### 8.3 Дашборд ✅
**Что сделано (2026-04-12):**
**Файл:** `app/dashboard/page.tsx`
- Статус профиля: Published & Verified (зелёный) / Pending Review (жёлтый) / Rejected (красный) с info-блоками
- Статистика: Active Chats, Total Clients, Unread Messages, Rating — 4 карточки
- Quick Actions: View Chats, Edit Profile
- Данные из `GET /experts/me/profile` + `GET /conversations?role=expert`

### 8.4 Чаты ✅
**Что сделано (2026-04-12):**
**Файлы:** `app/chats/page.tsx`, `app/chats/[id]/page.tsx`

**Список чатов:**
- Карточки: аватар (инициал), имя клиента, превью сообщения, время, unread badge, data access indicator
- Форматирование времени: Today HH:MM / Yesterday / weekday / date

**Чат (переписка):**
- Polling каждые 4 сек с `setInterval`, сравнение `lastMessageId`
- Текстовые сообщения + фото (рендер img) + системные (report_grant/revoke)
- Read markers (✓✓)
- Группировка по дате
- Header: имя клиента, статус, кнопки действий
- **Request Data** — отправляет `report_request` сообщение
- **Complete** — завершает консультацию (`PATCH /conversations/:id`)
- **View Data** — ссылка на `/clients/:convId` (если доступ предоставлен)
- Completed banner при завершённой консультации

### 8.5 Данные клиента ✅
**Что сделано (2026-04-12):**
**Файл:** `app/clients/[id]/page.tsx`

- 3 вкладки: Meals / Lab Results / Health Profile
- **Meals:** карточки с фото, описанием, КБЖУ (цветовая кодировка: kcal/P/C/F), items
- **Lab Results:** таблица метрик с reference ranges, подсветка out-of-range значений красным
- **Health Profile:** сетка полей (name, age, height, weight, gender, goal, calories, preferences)
- 403/error обработка: "Client may not have granted data access yet"

### 8.6 Мой профиль ✅
**Что сделано (2026-04-12):**
**Файл:** `app/profile/page.tsx`

- Редактирование: displayName, type (nutritionist/dietitian), bio (с счётчиком символов), education, experienceYears
- **Специализации:** 12 chip-кнопок (toggle)
- **Языки:** 6 chip-кнопок (toggle)
- **Credentials:** read-only список с статусами (approved/pending/rejected) и ссылками View
- Кнопка Save → `PATCH /experts/me/profile` → success toast "Saved!"
- Загрузка новых credentials — через мобильное приложение (указано в UI)

### 8.7 Дизайн ✅
**Что сделано (2026-04-12):**
- Tailwind CSS 4 + CSS custom properties
- Dark theme (совпадает с admin panel): `--bg: #0f1117`, `--surface: #1a1d27`, `--primary: #6366f1`
- **Sidebar layout** (`components/sidebar.tsx`, `components/app-shell.tsx`): фиксированная боковая панель 240px с навигацией (Dashboard, Chats, My Profile), имя + email + Sign out
- Desktop-first, responsive (min-width constraints)
- Consistent rounded corners, spacing, color coding

**Exit criteria:** ✅ эксперт логинится через magic link, видит дашборд со статусом и статистикой, ведёт переписку с клиентами (polling), просматривает данные клиентов (meals/labs/health), редактирует профиль.

---

## 💰 PHASE 9 — Монетизация (отложено)

Отложена до завершения пилота. Возможные пути:
- **Stripe Connect** — connected accounts, application fee
- **Off-app payments** — эксперт сам берёт оплату
- Решение принимается после пилота с реальными экспертами

---

## 📐 Архитектурные правила (применяются ко всем фазам)

1. **i18n:** все строки через `useI18n()`, ключи в `app/i18n/locales/{en,ru,kk,fr,de,es}.json`
2. **Theme:** `useTheme()` + `useDesignTokens()`, никаких хардкод-цветов
3. **Стили:** `useMemo(() => createStyles(tokens), [tokens])`
4. **API (мобильный):** через `MarketplaceService` (НЕ старый `ApiService` для expert-функций)
5. **API (портал):** fetch/axios напрямую к API с JWT в headers
6. **State:** локально — `useState`/`useReducer`, глобально — Context
7. **Кэш:** in-memory + AsyncStorage с TTL
8. **Безопасность:** все expert-endpoint'ы за `JwtAuthGuard`, admin — за `x-admin-secret`
9. **Логи:** ошибки в `clientLog` (фронт) и NestJS Logger (бэк)
10. **Push:** Expo Push SDK, deep links на конкретные экраны

---

## 🧭 Порядок реализации (MVP)

| # | Фаза | Что делаем | Статус |
|---|------|-----------|--------|
| 1 | Phase 1 | Cleanup: снести дубликаты, навигация, role context, i18n | ✅ DONE |
| 2 | Phase 2 | Expert onboarding: шаговая форма в приложении | ✅ DONE |
| 3 | Phase 7 | Админка: вкладка верификации экспертов | ✅ DONE |
| 4 | Phase 3 | Маркетплейс: список экспертов + профиль | ✅ DONE |
| 5 | Phase 4 | Чат: переписка + push-уведомления | ✅ DONE |
| 6 | Phase 5 | Шаринг отчётов | ✅ DONE |
| 7 | Phase 6 | Reviews | ✅ DONE |
| 8 | Phase 8 | Expert Portal (Next.js) | ✅ DONE |

---

## 🧭 Текущий статус сессий

| Дата | Сессия | Что сделано | Следующий шаг |
|---|---|---|---|
| 2026-04-08 | discovery | План создан, найден баг лимитов в Redis (Phase 0.1) | Phase 0.1 |
| 2026-04-08 | Phase 0.1 | ✅ Фикс fail-open в DailyLimitGuard (sentinel + DB fallback) | Phase 0.5 |
| 2026-04-08 | Phase 0.5 | ✅ Фикс fail-open в auth.service (in-memory fallback) | Phase 1 |
| 2026-04-11 | planning | Полный аудит кода. Backend ~95% готов, фронт ~20%. Зафиксированы решения: Next.js портал на `experts.eatsense.ch`, magic link auth, MVP scope (Phases 1-8), всё бесплатно, 6 языков. Снести дубликаты экранов. | Phase 1.1 |
| 2026-04-11 | Phase 1 | ✅ **Cleanup + Foundation.** Удалены 3 дубликата (SpecialistList/Profile, ConsultationChat). Очищен App.tsx. Route BecomeExpert добавлен. `useIsExpert()` хук создан. `expertsRole` добавлен в getProfile + refreshToken ответы. 70+ i18n ключей для 6 языков. | Phase 2 |
| 2026-04-11 | Phase 2 | ✅ **Expert Onboarding.** BecomeExpertScreen — полная 6-шаговая форма (дисклеймер → профиль → специализации → документы → превью → на модерации). Авто-создание бесплатного оффера при регистрации. Entry points: баннер в ExpertsScreen + кнопка в ProfileScreen. | Phase 3 (маркетплейс) |
| 2026-04-12 | Phase 3 | ✅ **Marketplace.** ExpertsScreen — полный маркетплейс (поиск, фильтры, рекомендации, карточки, pagination). ExpertProfileScreen — переписан на MarketplaceService (hero, bio, credentials, offers, reviews, CTA "Message Expert"). Удалены 10 старых методов из apiService + 4 backward-compat обёртки из marketplaceService. Исправлены ссылки в ChatScreen и ConsultationsListScreen. +5 i18n ключей × 6 языков. | Phase 4 (чат) |
| 2026-04-12 | Phase 4 | ✅ **Чат.** Backend: push при новом сообщении (NotificationsService инжектирован в MessagesService, fire-and-forget). ConsultationsListScreen: переписан (unread badge, last msg preview, time, completed status, pull-to-refresh). ChatScreen: polling 4s, фото через expo-image-picker, read markers, ActionSheet меню (share meals / complete / report), disclaimer при первом открытии, special message types (meal_share, report_share). +10 i18n ключей × 6 языков. | Phase 5 (шаринг отчётов) |
| 2026-04-12 | Phase 5 | ✅ **Шаринг отчётов.** Backend: `GET /conversations/:id/client-data` (meals 30d, lab results, health profile; only if reportsShared + isExpert). Frontend: report_request/grant/revoke message flow в ChatScreen. Expert menu: "Request Data Access". Client: inline Allow/Deny buttons. System messages для grant/revoke. +4 i18n ключей × 6 языков. | Phase 6 (reviews) |
| 2026-04-12 | Phase 6 | ✅ **Reviews.** Backend: валидация `conversation.status === 'completed'`. Фронт: `ReviewModal.tsx` (bottom sheet, 5 stars, comment textarea, submit/cancel). Кнопка "Leave a Review" в ended banner ChatScreen (только для client). Рейтинг пересчитывается автоматически. +6 i18n ключей × 6 языков. | Phase 7 (админка) |
| 2026-04-12 | Phase 7 | ✅ **Админка верификации.** Backend: `ExpertsAdminController` — 4 endpoint'а (list, getById, approve, reject) за `x-admin-secret`, push-уведомления при approve/reject. Фронт: вкладка "Experts" в `apps/admin/index.html` — фильтры, карточки, статистика, approve/reject кнопки, credentials view. | Phase 8 (Expert Portal) |
| 2026-04-12 | Phase 8 | ✅ **Expert Portal.** Next.js 15 + Tailwind 4 в `apps/expert-portal/`. Magic link auth с `redirectUrl` (backend DTO обновлён). Sidebar layout (Dashboard/Chats/Profile). Dashboard: статус профиля + stats. Чаты: список + переписка с polling 4s, complete/request data. Client data viewer: meals/labs/health. Profile editor: все поля + credentials (read-only). Dark theme. Build passes. | MVP COMPLETE |

---

## 📝 Шаблон промпта для следующей сессии

```
Открой docs/plans/experts-marketplace-roadmap.md и продолжи с Phase 3 (Marketplace).
Контекст: Phase 1 (cleanup) и Phase 2 (expert onboarding) завершены. Backend готов на 95%.
Задача: переписать ExpertsScreen в полноценный маркетплейс + переписать ExpertProfileScreen на MarketplaceService.
По окончании: обнови чеклист в roadmap и допиши строку в "Текущий статус сессий".
```

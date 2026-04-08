# EatSense — Roadmap: Эксперты Marketplace + срочные правки

> **Назначение:** общий план между сессиями. Каждый этап автономен и заканчивается рабочей фичей. Сессия = 1–2 этапа.
> **Статус нотация:** ⬜ TODO · 🟨 IN PROGRESS · ✅ DONE · ⏸ PAUSED · ❌ BLOCKED
> **Последнее обновление:** 2026-04-08

---

## ⚙️ Глобальные решения (зафиксировано)

| Тема | Решение |
|---|---|
| Регистрация эксперта | Из Профиля обычного юзера → апгрейд роли (вариант B) |
| Self-service | Полный (эксперт может сам зарегистрироваться и опубликовать профиль) |
| Верификация документов | Ручная, через существующую `apps/admin/index.html` (расширим) |
| Монетизация (MVP) | Эксперт сам выбирает FREE/PAID. Без комиссии приложения. Платежи — TBD после босса. |
| Чат-канал | Текст + фото |
| Real-time | Polling (3–5 сек на открытом экране чата) |
| Шаринг отчётов | Все типы (питание, анализы, профиль, лаб.) — по согласию пользователя |
| Поиск/выдача | Список + фильтры (язык, специализация, рейтинг, цена), карточки рекомендаций сверху |
| Геопривязка | Глобально, без |
| Юрисдикция MVP | Швейцария (де-юре + комплаенс под швейцарские правила) |
| Языки UI | en, ru, kk, fr **+ de, es** (добавить новые в i18n) |
| Изоляция роли | Эксперт продолжает видеть обычные функции (трекинг питания и т.д.). Будет переключатель режимов в Профиле. *Финально подтвердить с боссом.* |
| Real-time чат | Polling 5 сек когда экран открыт. WebSocket — отдельной задачей post-MVP. |
| Заглушки expert-экранов | Подтверждено: snести и переписать. Никаких внешних ссылок на них нет. |
| Медиа (аватары, документы) | Переиспользуем существующий `apps/api/media/` |
| Уведомления | Push для новых сообщений (PushToken уже есть) |

---

## 🚨 PHASE 0 — Срочные правки (перед маркетплейсом)

### 0.1 Bug: фото-лимиты могут обходиться при недоступности Redis ✅
**Файлы:**
- `apps/api/redis/redis.service.ts:179-188` (метод `incr`)
- `apps/api/limits/daily-limit.guard.ts:77-99`

**Корень:** `RedisService.incr()` возвращает `0` при ошибке/дисконнекте → `0 > limit` всегда `false` → гард пропускает запрос (fail-open). Если Redis на Railway моргнёт — лимиты молча отключаются.

**Что сделать:**
1. В `RedisService.incr()` НЕ возвращать `0` при ошибке. Бросать исключение или возвращать `null`.
2. В `DailyLimitGuard` обработать `null/throw`:
   - При недоступном Redis — **fail-closed**: бросать `503 Service Unavailable` с понятным сообщением, ИЛИ
   - Fallback на счётчик в БД (таблица `UserStats` или новая `DailyUsage`).
3. Добавить лог-метрику `[Limits] Redis unavailable, falling back to DB` чтобы это было видно.
4. Тест-кейс: при заглушенном Redis — 3-й фото-запрос отдаёт 429 (или 503 с явным сообщением).

**Exit criteria:** ручной тест с `REDIS_URL=redis://nonexistent:6379` → 4-я фотка фри-юзера блокируется.

**✅ Что сделано (2026-04-08):**
- В `daily-limit.guard.ts` добавлена детекция сентинела `newCount <= 0` (реальный Redis INCR никогда не возвращает 0).
- При обнаружении — fail-closed с DB-fallback: считаем `Analysis.count({userId, createdAt >= startOfDay})`. Если ≥ лимита → 429. Иначе пропускаем (DB станет источником истины пока Redis не вернётся).
- Логи: `Logger.error` с явным `[DailyLimitGuard] Redis unavailable...` чтобы было видно в Railway.
- `RedisService.incr()` НЕ менялся (его контракт нужен `auth.service.ts`).
- Typecheck `tsc --noEmit` чистый.

**⚠️ Близнец-баг найден, но НЕ фиксился:** `apps/api/auth/auth.service.ts:984-988` — `ensureHourlyLimit` имеет тот же fail-open паттерн (`if (count <= 0) return`). Это OTP rate limiting. Обработать отдельной задачей (см. 0.5).

---

### 0.2 Audit: «глубокие настройки не настроены» ⬜
**Что:** руководитель сказал «глубокие настройки не настроены». Конкретики нет. Пользователь предположил «всё сразу».

**Что сделать (research-задача, ~1 час):**
1. Открыть `ProfileScreen.tsx` и составить чеклист всех «настроек» которые видны пользователю.
2. Сравнить с тем, что **реально пишется в API** (`UserProfile.healthProfile`, `preferences`, `NotificationPreference`).
3. Найти настройки, которые в UI есть, но при сабмите никуда не уходят / не сохраняются / не применяются в логике анализа.
4. Сформировать отчёт: «настройка X — visual only» / «настройка Y — пишется в БД, но не читается анализом».

**Exit criteria:** список багов «UI ↔ API ↔ logic» с указанием файлов и строк.

---

### 0.3 Onboarding: больше инструкций при входе ⬜
**Файл:** `src/screens/OnboardingScreen.tsx` (~3000 строк)

**Что сделать:**
1. Прочитать текущий онбординг, выписать все слайды.
2. Добавить 2-3 новых слайда с инструкциями по ключевым действиям:
   - Как сделать первый анализ (фото блюда).
   - Как читать результаты (КБЖУ, рекомендации).
   - Где смотреть прогресс / отчёты.
3. Каждый слайд: иконка + заголовок + 1–2 предложения + опционально кнопка «Попробовать» (deeplink на CameraScreen).
4. Локализация в 4 языка через `useI18n()`.

**Exit criteria:** новый юзер при первом запуске видит расширенный туториал; existing-юзер не видит его повторно (флаг `isOnboardingCompleted`).

---

### 0.4 Видео-инструкция (отложено) ⏸
Юзер запишет позже. Зарезервировать место в туториале (`assets/videos/tutorial-analysis.mp4`) и `expo-av` `<Video>` компонент.

---

### 0.5 Bug: тот же fail-open в OTP rate limiting ✅
**Файл:** `apps/api/auth/auth.service.ts:984-988`
```ts
private async ensureHourlyLimit(limit: number, key: string) {
  const count = await this.redisService.incr(key);
  if (count <= 0) {
    return;  // ← fail-open: при сломанном Redis OTP-лимиты отключаются
  }
  ...
}
```
**Что сделать:** заменить `return` на `throw new HttpException('Service temporarily unavailable', 503)` или fallback. Эффект: при сломанном Redis OTP-флуд в данный момент возможен (пользователь может бесконечно запрашивать OTP). Не критично как фото-лимит, но всё равно надо.

**Exit criteria:** при заглушенном Redis 11-й OTP-запрос за час блокируется (или возвращает 503).

**✅ Что сделано (2026-04-08):**
- В `auth.service.ts` добавлен `fallbackCounters: Map<string, {count, expiresAt}>` (per-process in-memory).
- `ensureHourlyLimit`: при `count <= 0` (Redis сломан) — `Logger.error` + fallback на in-memory счётчик. Лимит по-прежнему энфорсится.
- `ensureCooldown`: аналогично — раньше при сломанном Redis `setNx` возвращал false и `ttl` возвращал -1 → cooldown молча отключался. Теперь fallback на in-memory.
- Helper `incrFallbackCounter` с opportunistic cleanup при превышении 1000 записей (защита от утечки памяти).
- Compromise: per-process означает что лимит не шарится между Railway-репликами. Атакующий с N-кратным трафиком пробьёт лимит на N инстансов вместо одного. Это сильно лучше прежнего fail-open, но не идеально. Полное решение — DB-counter, отложено.
- Typecheck чистый.

---

## 🏗 PHASE 1 — Foundation для Эксперт-маркетплейса

### 1.1 Audit существующего каркаса ⬜
**Что:** сейчас в проекте есть «брошенные» заготовки, которые надо либо доточить, либо снести.

**Файлы для аудита:**
- `apps/api/prisma/schema.prisma:12-15, 42-51, 674-881` — модели Expert*, Conversation, Message, Review, Disclaimer, AbuseReport, UserBlock
- `apps/api/src/experts/{controller,service,module,dto}.ts`
- `apps/api/src/conversations/{controller,service,module}.ts`
- `apps/api/src/messages/{controller,service,module}.ts`
- `src/screens/ExpertsScreen.tsx` (заглушка «Coming soon»)
- `src/screens/ExpertProfileScreen.tsx` (462 стр)
- `src/screens/ConsultationChatScreen.tsx` (390 стр)
- `src/screens/ConsultationsListScreen.tsx`
- `src/screens/SpecialistListScreen.tsx` (дубликат ExpertsScreen?)
- `src/screens/SpecialistProfileScreen.tsx` (дубликат?)

**Решение по умолчанию:** существующие экраны = заглушки → **снести и переписать с нуля**, схему Prisma — оставить и дополнить миграциями.

**Exit criteria:** документ-отчёт «что есть / что работает / что снести».

---

### 1.2 Schema cleanup + миграция ⬜
**Что добавить/изменить в `schema.prisma`:**
- ✅ Уже есть: `UserExpertsRole`, `ExpertProfile`, `ExpertCredential`, `ExpertOffer`, `Conversation`, `Message`, `Review`, `DisclaimerAcceptance`, `AbuseReport`, `UserBlock`.
- ⬜ Добавить поля для Швейцарии: `ExpertProfile.country`, `licenseRegistry` (например, ID в SVDE/ASDD).
- ⬜ Indexing: `Message(conversationId, createdAt)` уже есть, добавить `unread count` через `Message.isRead`.
- ⬜ Опциональный `ExpertProfile.timezone` для будущих видео-консультаций.
- ⬜ `Conversation.unreadCountClient` / `unreadCountExpert` (денормализация для скорости списка).

**Migration:** одна миграция `add_experts_marketplace_v2` без drop существующих столбцов.

---

### 1.3 Role guard / middleware ⬜
**Файлы:**
- `apps/api/auth/guards/` — добавить `ExpertRoleGuard` (проверяет `user.expertsRole === 'EXPERT'` и наличие `expertProfile.isPublished`).
- Применить к expert-only endpoint'ам (`PATCH /experts/me`, `POST /experts/credentials`, ...).

---

### 1.4 Front: контекст роли ⬜
**Файлы:**
- `src/contexts/AuthContext.tsx` — добавить `expertsRole` и `expertProfile` в user-объект.
- Хук `useIsExpert()` для удобства.

**Exit criteria:** `useIsExpert()` доступен, в Profile видно «Стать экспертом» если `USER`, и «Мой профиль эксперта» если `EXPERT`.

---

## 👤 PHASE 2 — Expert Onboarding (стать экспертом)

### 2.1 Backend: «Стать экспертом» endpoint ⬜
- `POST /experts/apply` — апгрейд роли `USER → EXPERT`, создание пустого `ExpertProfile` с `isPublished=false`.
- `PATCH /experts/me` — заполнение полей (displayName, bio, type, education, experienceYears, specializations, languages).
- `POST /experts/me/credentials` — загрузка документа (multipart → MediaService → `ExpertCredential.fileUrl`, status='pending').
- `POST /experts/me/offers` — создание услуги (CHAT_CONSULTATION с FREE/PAID).
- `POST /experts/me/publish` — финальная публикация (валидируем: есть имя, bio ≥ 100 символов, минимум 1 credential, минимум 1 offer).

### 2.2 Front: Expert onboarding flow ⬜
**Новый экран:** `src/screens/expert/BecomeExpertScreen.tsx`
- Step 1: Welcome + дисклеймер о Швейцарии и проф. ответственности (`DisclaimerAcceptance` type='expert_terms').
- Step 2: Базовый профиль (имя, тип, био, опыт).
- Step 3: Специализации + языки (multi-select).
- Step 4: Загрузка документов (диплом, лицензия) → `ExpertCredential`.
- Step 5: Создание первой услуги (формат + цена).
- Step 6: «На модерации» — экран ожидания одобрения админом.

**Точка входа:** `ProfileScreen` → секция «Для специалистов» → `BecomeExpertScreen`.

### 2.3 Front: Expert dashboard (кабинет эксперта) ⬜
**Новый экран:** `src/screens/expert/ExpertDashboardScreen.tsx`
- Карточка статуса (опубликован / на модерации / отклонён).
- «Мои услуги» (CRUD ExpertOffer).
- «Мои клиенты» (список Conversation, бейдж непрочитанных).
- «Мой публичный профиль» (превью).
- «Документы» (`ExpertCredential`, повторная загрузка).

**Exit criteria:** эксперт может зарегистрироваться, заполнить профиль, загрузить документы и оказаться в статусе «pending» в админке.

---

## 🛒 PHASE 3 — Marketplace browsing (для пользователя)

### 3.1 Backend: публичные endpoints ⬜
- `GET /experts` — список с фильтрами (?type, ?language, ?specialization, ?minRating, ?priceType, ?page).
- `GET /experts/:id` — публичный профиль (только `isPublished=true && isActive=true`).
- `GET /experts/recommended` — топ-N (по рейтингу, completedConsultations, manual featured).

### 3.2 Front: Полноценный `ExpertsScreen` ⬜
**Снести** текущую заглушку, написать с нуля.
- Шапка: поиск, фильтры (модалка).
- Секция «Рекомендуем» (горизонтальный карусель).
- Лента карточек (avatar, name, type, rating, языки, цена/«бесплатно»).
- Pull-to-refresh, бесконечная прокрутка.

### 3.3 Front: `ExpertProfileScreen` (публичный) ⬜
- Hero: фото, имя, тип, рейтинг, верификация-бейдж.
- Bio, образование, опыт.
- Услуги (карточки `ExpertOffer`).
- Отзывы (`Review`, пагинация).
- CTA «Написать» → создаёт `Conversation` → переход в `ConsultationChatScreen`.

**Exit criteria:** пользователь видит ленту экспертов, открывает профиль, нажимает «Написать», попадает в чат.

---

## 💬 PHASE 4 — Чат (Conversations + Messages)

### 4.1 Backend ⬜
- `POST /conversations` — создать (или вернуть существующий по `@@unique([clientId, expertId])`).
- `GET /conversations?role=client|expert` — список с last message + unread count.
- `GET /conversations/:id/messages?cursor=...` — пагинация.
- `POST /conversations/:id/messages` — текст или фото (multipart → MediaService).
- `PATCH /conversations/:id/messages/read` — пометить прочитанным.
- `POST /conversations/:id/report` — `AbuseReport`.
- `POST /conversations/:id/block` — `UserBlock`.

### 4.2 Front: `ConsultationsListScreen` ⬜
- Список диалогов, у эксперта и юзера разные заголовки.
- Бейдж непрочитанного, аватары, превью последнего сообщения, время.

### 4.3 Front: `ConsultationChatScreen` (полноценный) ⬜
**Снести заглушку.** Базовый чат:
- `FlatList` инвертированный.
- Polling каждые 3 сек когда экран в фокусе (`useFocusEffect`).
- Текст + кнопка «прикрепить фото» → `expo-image-picker` → upload.
- Маркер прочитанного.
- Меню «...»: пожаловаться, заблокировать.
- При первом открытии чата — модалка с дисклеймером (если не принят).

### 4.4 Push-уведомления (опционально, см. вопрос #5) ⬜
- При новом message — `notifications.service.ts` шлёт push получателю.
- Deep-link на конкретный чат.

**Exit criteria:** двое юзеров (клиент + эксперт) переписываются, видят сообщения друг друга, шлют фото.

---

## 📊 PHASE 5 — Шаринг отчётов

### 5.1 Backend ⬜
- `POST /conversations/:id/share-reports` — выставляет `Conversation.reportsShared = true` (требует подтверждения клиента).
- `GET /conversations/:id/client-reports` — эксперт видит агрегированные данные клиента (питание за N дней, анализы, профиль, лаб.). Только если `reportsShared=true`.
- Спец. тип сообщения `type='report_share'` с метаданными о том, какие данные шарятся.

### 5.2 Front ⬜
- В чате: эксперт видит кнопку «Запросить доступ к отчётам».
- Клиент получает inline-сообщение «Эксперт запросил доступ» с кнопками «Разрешить / Отказать».
- При разрешении эксперт получает вкладку «Отчёты клиента» в чате.
- Клиент в любой момент может отозвать доступ.

**Exit criteria:** эксперт видит данные клиента только после явного разрешения; клиент может отозвать.

---

## ⭐ PHASE 6 — Reviews

### 6.1 Backend ⬜
- `POST /experts/:id/reviews` — после `Conversation.status='completed'`, один отзыв на пару (client, expert).
- Триггер: при создании отзыва — пересчёт `ExpertProfile.rating`, `reviewCount`.

### 6.2 Front ⬜
- В `ConsultationsListScreen` для завершённых консультаций — CTA «Оставить отзыв».
- Модалка с 1–5 звёздами + комментарий.
- Отзывы видны на `ExpertProfileScreen`.

---

## 🛠 PHASE 7 — Админ-панель верификации

### 7.1 Расширение `apps/admin/index.html` ⬜
**Файл:** `apps/admin/index.html` (existing, served from `apps/api/admin-panel.controller.ts`)

**Добавить вкладки:**
- «Эксперты на модерации» — список `ExpertProfile.isPublished=false` или с `pending` credentials.
- Просмотр документов (preview изображения / pdf).
- Кнопки «Одобрить» / «Отклонить с причиной».
- «Жалобы» — `AbuseReport` с фильтром по статусу.
- «Заблокированные пары» — `UserBlock`.

### 7.2 Backend ⬜
- `POST /admin/experts/:id/approve` (с `ADMIN_SECRET` header).
- `POST /admin/experts/:id/reject` (с reason).
- `POST /admin/credentials/:id/approve|reject`.
- `POST /admin/abuse-reports/:id/resolve`.

**Exit criteria:** ты заходишь на `/admin`, видишь expert на модерации, открываешь, одобряешь — у эксперта статус становится `verified+published`.

---

## 💰 PHASE 8 — Монетизация (отложено, ждём решения босса)

Возможные пути:
- **Stripe Connect** — эксперт регистрирует connected account, EatSense берёт application fee.
- **In-app purchase consumables** — сложно, Apple/Google не любят P2P.
- **Off-app payments** — эксперт сам берёт оплату, EatSense только сводит. Юридически проще.

**Решение принимается после Phase 6.**

---

## 📐 Архитектурные правила (применяются ко всем фазам)

1. **i18n:** все строки через `useI18n()`, добавлять ключи в `app/i18n/locales/{en,ru,kk,fr}.json`.
2. **Theme:** `useTheme()` + `useDesignTokens()`, никаких хардкод-цветов.
3. **Стили:** `useMemo(() => createStyles(tokens), [tokens])`.
4. **API:** через `ApiService` singleton, не fetch напрямую.
5. **State:** локально — `useState`/`useReducer`, глобально — Context (или Zustand-store как `ProgramProgressStore`).
6. **Кэш:** in-memory + AsyncStorage с TTL.
7. **Безопасность:** все expert-endpoint'ы за `JwtAuthGuard` + `ExpertRoleGuard` где нужно.
8. **Логи:** ошибки в `clientLog` (фронт) и nestjs Logger (бэк).

---

## 🧭 Текущий статус сессий

| Дата | Сессия | Что сделано | Следующий шаг |
|---|---|---|---|
| 2026-04-08 | discovery | План создан, найден баг лимитов в Redis (Phase 0.1) | Получить ответы на вопросы #1-6 → начать Phase 0.1 |
| 2026-04-08 | Phase 0.1 | ✅ Фикс fail-open в DailyLimitGuard (sentinel + DB fallback). Найден близнец-баг в auth.service (0.5). Подтверждено что 5 expert-экранов = мёртвый код. Решения по Швейцарии/языкам/polling/изоляции роли зафиксированы. | Деплой 0.1 → проверить логи Railway → выбрать следующий: 0.2 (audit settings), 0.3 (onboarding), 0.5 (auth twin bug), или сразу Phase 1.1 |
| 2026-04-08 | Phase 0.5 | ✅ Фикс fail-open в auth.service (`ensureHourlyLimit` + `ensureCooldown`). In-memory fallback per process. Typecheck чистый. | Деплой обоих фиксов → выбрать следующий: 0.2 (audit settings), 0.3 (onboarding), Phase 1.1 (audit expert scaffolding) |

---

## 📝 Шаблон промпта для следующей сессии

```
Открой docs/plans/experts-marketplace-roadmap.md и продолжи с этапа [НОМЕР].
Контекст: [что уже сделано, что не делать].
Задача: [конкретный suite задач из этапа].
По окончании: обнови чеклист в roadmap и допиши строку в "Текущий статус сессий".
```

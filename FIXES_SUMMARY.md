# Сводка исправлений

## Проблемы и решения

### 1. ❌ Ошибка: `The column user_profiles.avatarUrl does not exist`

**Причина:** Миграции не применяются на проде, или Prisma Client генерируется до применения миграций.

**Решение:**
1. Обновить **Pre-deploy Command** в Railway:
   ```
   pnpm --filter ./apps/api exec prisma generate --schema apps/api/prisma/schema.prisma && pnpm --filter ./apps/api run prisma:migrate:deploy
   ```
   
   **Важно:** `prisma generate` должен выполняться ПЕРЕД `prisma migrate deploy`.

2. Добавлен `avatarUrl` в `allowedFields` в `user-profiles.service.ts`

3. Исправлена логика обработки ошибок в `AuthContext.tsx` - теперь различает ошибки 500 (серверные) от 404 (профиль не найден)

### 2. ❌ Приложение кидает на онбординг после входа

**Причина:** При ошибке 500 (отсутствие колонки) `AuthContext` устанавливал `isOnboardingCompleted: false`, что заставляло показывать онбординг.

**Решение:** 
- Обновлена логика в `AuthContext.tsx` - при ошибке 500 не показывается онбординг
- После исправления миграций эта проблема должна исчезнуть

### 3. ⚠️ Вход через Google и Apple

**Текущее состояние:**
- Google OAuth настроен в `AuthScreen.js` и `app.config.js`
- Apple Sign In настроен в `AuthScreen.js` и `auth.service.ts`
- Нужно проверить переменные окружения на проде

**Необходимые переменные окружения на Railway (бэкенд):**
- `APPLE_BUNDLE_ID=ch.eatsense.app` (или `com.eatsense.app`)

**Необходимые переменные окружения в .env (фронтенд):**
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID` - основной Client ID
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` - для iOS
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` - для Android  
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` - для Web

## Что нужно сделать в Railway

### 1. Обновить Pre-deploy Command

Заменить на:
```
pnpm --filter ./apps/api exec prisma generate --schema apps/api/prisma/schema.prisma && pnpm --filter ./apps/api run prisma:migrate:deploy
```

### 2. Добавить переменную окружения (если отсутствует)

- `APPLE_BUNDLE_ID=ch.eatsense.app`

### 3. Проверить после деплоя

1. Логи должны показывать: `[Schema] ✓ user_profiles.avatarUrl column exists`
2. Эндпоинт `/user-profiles` должен работать без ошибок 500
3. Вход через Google/Apple должен работать

## Что нужно проверить локально

### 1. Запустить бэкенд

```bash
cd apps/api
# Убедиться что Docker контейнеры запущены (Postgres, Redis, MinIO)
npm run start:dev
```

### 2. Проверить .env файлы

**В корне проекта (.env):**
- `EXPO_PUBLIC_API_BASE_URL` - должен указывать на локальный бэкенд или ngrok
- `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` - должны быть заполнены

**В apps/api/.env:**
- `DATABASE_URL` - должен указывать на локальный Postgres
- `REDIS_URL` - должен указывать на локальный Redis
- `S3_ENDPOINT` - должен указывать на локальный MinIO (http://127.0.0.1:9000)
- `APPLE_BUNDLE_ID=ch.eatsense.app`

### 3. Запустить фронтенд

```bash
# Из корня проекта
pnpm start
```

### 4. Проверить вход

- OTP вход (должен работать)
- Google Sign In (должен работать если Client IDs настроены)
- Apple Sign In (должен работать на iOS устройстве)

## Файлы изменены

1. `apps/api/user-profiles/user-profiles.service.ts` - добавлен `avatarUrl` в `allowedFields`
2. `src/contexts/AuthContext.tsx` - исправлена логика обработки ошибок (различение 500/404)
3. `RAILWAY_FIX.md` - обновлена документация с правильной последовательностью команд
4. `RAILWAY_DEPLOY_FIX.md` - создана инструкция по исправлению деплоя


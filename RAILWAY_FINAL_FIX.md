# Финальное исправление Railway

## ❌ Проблема

Pre-deploy Command использует неправильный путь:
```
pnpm --filter ./apps/api exec prisma generate --schema apps/api/prisma/schema.prisma
```

Ошибка: `Could not load --schema from provided path apps/api/prisma/schema.prisma: file or directory not found`

**Причина:** Когда команда выполняется через `pnpm --filter ./apps/api exec`, она запускается в контексте `apps/api`, поэтому путь должен быть относительным от этой директории.

## ✅ Решение

### 1. Исправить Pre-deploy Command

Заменить на:
```
pnpm --filter ./apps/api run prisma:generate && pnpm --filter ./apps/api run prisma:migrate:deploy
```

**Или:**
```
pnpm --filter ./apps/api exec prisma generate --schema prisma/schema.prisma && pnpm --filter ./apps/api run prisma:migrate:deploy
```

**Почему это работает:**
- `pnpm --filter ./apps/api run prisma:generate` использует скрипт из `package.json`, который уже имеет правильный путь `prisma/schema.prisma`
- Или можно использовать `exec` с относительным путем `prisma/schema.prisma` (без `apps/api/`)

### 2. Проверить Build Command

Текущий Build Command правильный:
```
pnpm --filter ./apps/api exec prisma generate && pnpm -r build
```

Но можно упростить до:
```
pnpm -r build
```

Так как `prebuild` в `apps/api/package.json` автоматически запустит `prisma:generate`.

### 3. Google Client IDs

**НЕ нужны на бэкенде Railway!** Они нужны только на фронтенде в `.env` файле.

На бэкенде нужны только:
- `APPLE_BUNDLE_ID=ch.eatsense.app` ✅ (уже есть)

## 📋 Итоговые настройки Railway

### Build Command
```
pnpm -r build
```

### Pre-deploy Command
```
pnpm --filter ./apps/api run prisma:generate && pnpm --filter ./apps/api run prisma:migrate:deploy
```

### Start Command
```
pnpm --filter ./apps/api exec node dist/main.js
```

## 🔧 Исправление локального запуска

Проблема: Бэкенд не может подключиться к БД и Redis.

### Проверка Docker контейнеров

1. Убедитесь что Docker Desktop запущен
2. Проверьте что контейнеры запущены:
   ```bash
   docker ps
   ```
   
   Должны быть запущены:
   - `postgres` (порт 5432)
   - `redis` (порт 6379)
   - `minio` (порт 9000)

3. Если контейнеры не запущены, запустите их:
   ```bash
   cd apps/api
   docker-compose up -d
   ```

### Проверка .env файла

В `apps/api/.env` должны быть правильные значения:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/eatsense
REDIS_URL=redis://localhost:6379
S3_ENDPOINT=http://127.0.0.1:9000
```

### Запуск бэкенда

```bash
cd apps/api
npm run start:dev
```

## ✅ Проверка после исправления

1. Railway деплой должен пройти успешно
2. В логах должны быть сообщения о применении миграций
3. Локально бэкенд должен подключиться к БД и Redis


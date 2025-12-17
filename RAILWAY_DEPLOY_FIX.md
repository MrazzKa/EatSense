# Исправление деплоя на Railway

## Проблема
После деплоя возникает ошибка: `The column user_profiles.avatarUrl does not exist in the current database`

## Причина
Миграции не применяются в Pre-deploy Command, или Prisma Client генерируется до применения миграций.

## Решение

### 1. Обновить Pre-deploy Command в Railway

Заменить текущий Pre-deploy Command на:

```bash
cd apps/api && pnpm exec prisma generate --schema prisma/schema.prisma && pnpm exec prisma migrate deploy --schema prisma/schema.prisma
```

**Или если нужно запускать из корня:**

```bash
pnpm --filter ./apps/api exec prisma generate --schema apps/api/prisma/schema.prisma && pnpm --filter ./apps/api exec prisma migrate deploy --schema apps/api/prisma/schema.prisma
```

**Важно:** `prisma generate` должен выполняться ПЕРЕД `prisma migrate deploy`, чтобы Prisma Client знал о всех полях схемы.

### 2. Проверить Build Command

Build Command должен быть:
```
pnpm -r build
```

Это автоматически запустит `prebuild` в `apps/api`, который выполнит `prisma:generate`.

### 3. Проверить Start Command

Start Command должен быть:
```
pnpm --filter ./apps/api exec node dist/main.js
```

### 4. Если миграции все еще не применяются

Можно вручную применить миграцию через Railway CLI или через SQL:

```sql
-- Применить миграцию вручную
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'avatarUrl'
  ) THEN
    ALTER TABLE "user_profiles" ADD COLUMN "avatarUrl" TEXT;
  END IF;
END $$;
```

## Проверка после деплоя

1. Проверить логи Railway - должны быть сообщения:
   - `[Schema] ✓ user_profiles.avatarUrl column exists`
   - Или `[Schema] ✓ Added user_profiles."avatarUrl" column as TEXT`

2. Проверить эндпоинт `/user-profiles` - не должно быть ошибок 500

3. Проверить вход через Google/Apple - должен работать корректно


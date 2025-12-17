# Исправление ошибок с local_foods и отчетами

## ✅ Что исправлено

### 1. Создана миграция для таблицы `local_foods`

Создан файл: `apps/api/prisma/migrations/20251218000000_add_local_foods_table/migration.sql`

Эта миграция создаст таблицу `local_foods`, которая используется для быстрого поиска популярных продуктов.

### 2. Исправление локальной БД

**Проблема:** В `docker-compose.yml` пароль БД: `password`, а в `.env` указан: `FantomKill3`

**Решение:** Нужно изменить `DATABASE_URL` в `apps/api/.env`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/eatsense
```

Или изменить пароль в `docker-compose.yml` на `FantomKill3` (но лучше использовать `password` для локальной разработки).

## 🚀 Что нужно сделать

### 1. На Railway (прод)

Миграция применится автоматически при следующем деплое, так как Pre-deploy Command запускает `prisma migrate deploy`.

**Или можно применить вручную через Railway SQL:**

```sql
-- Создать таблицу local_foods
CREATE TABLE IF NOT EXISTS "local_foods" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "name_ru" TEXT,
    "name_kk" TEXT,
    "calories" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "protein" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carbs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fiber" DOUBLE PRECISION DEFAULT 0,
    "sugars" DOUBLE PRECISION DEFAULT 0,
    "sat_fat" DOUBLE PRECISION DEFAULT 0,
    "category" TEXT,
    "popularity" INTEGER NOT NULL DEFAULT 100,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "local_foods_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "local_foods_name_key" ON "local_foods"("name");
CREATE INDEX IF NOT EXISTS "local_foods_name_idx" ON "local_foods"("name");
CREATE INDEX IF NOT EXISTS "local_foods_popularity_idx" ON "local_foods"("popularity");
CREATE INDEX IF NOT EXISTS "local_foods_category_idx" ON "local_foods"("category");
```

### 2. На локалке

1. **Исправить DATABASE_URL в `apps/api/.env`:**
   ```env
   DATABASE_URL=postgresql://postgres:password@localhost:5432/eatsense
   ```

2. **Применить миграцию:**
   ```bash
   cd apps/api
   pnpm exec prisma migrate deploy
   ```

3. **Опционально: заполнить таблицу данными:**
   ```bash
   pnpm run prisma:seed:local-foods
   ```

## 📊 Отчеты

После создания таблицы `local_foods` ошибки с анализом должны исчезнуть. Отчеты должны работать корректно, так как они используют `getPersonalStats`, который не зависит от `local_foods`.

Если отчеты все еще не работают, проверьте:
1. Есть ли данные в `meal_logs` для текущего месяца
2. Логи в Railway - нет ли других ошибок при генерации PDF

## 🔍 Проверка

После применения миграции:
1. Ошибки `The table public.local_foods does not exist` должны исчезнуть
2. Анализ продуктов должен работать без ошибок
3. Отчеты должны генерироваться корректно


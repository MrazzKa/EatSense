# Быстрое исправление local_foods на Railway через SQL

## ✅ Отчеты работают независимо от local_foods

Отчеты используют только таблицу `meal_logs`, поэтому они должны работать даже без `local_foods`. Ошибки с `local_foods` влияют только на анализ продуктов (быстрый поиск популярных продуктов).

## 🚀 Быстрое исправление на Railway

### Способ 1: Через Railway SQL (самый быстрый)

1. Откройте Railway → PostgreSQL сервис
2. Перейдите в раздел **Query** или **Data**
3. Выполните SQL:

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

-- Создать индексы
CREATE UNIQUE INDEX IF NOT EXISTS "local_foods_name_key" ON "local_foods"("name");
CREATE INDEX IF NOT EXISTS "local_foods_name_idx" ON "local_foods"("name");
CREATE INDEX IF NOT EXISTS "local_foods_popularity_idx" ON "local_foods"("popularity");
CREATE INDEX IF NOT EXISTS "local_foods_category_idx" ON "local_foods"("category");
```

4. После выполнения SQL ошибки с `local_foods` исчезнут

### Способ 2: Дождаться следующего деплоя

Миграция применится автоматически при следующем коммите и деплое через Pre-deploy Command.

## 🔧 Исправление локальной БД

Проблема: БД не подключается даже после изменения DATABASE_URL.

### Проверка Docker контейнеров

1. Проверьте что контейнеры запущены:
   ```bash
   docker ps
   ```
   
   Должны быть видны:
   - `postgres` (порт 5432)
   - `redis` (порт 6379)
   - `minio` (порт 9000)

2. Если контейнеры не запущены:
   ```bash
   cd apps/api
   docker-compose up -d
   ```

3. Проверьте что БД создана:
   ```bash
   docker exec -it <postgres_container_id> psql -U postgres -l
   ```
   
   Должна быть БД `eatsense`

4. Если БД не создана, создайте её:
   ```bash
   docker exec -it <postgres_container_id> psql -U postgres -c "CREATE DATABASE eatsense;"
   ```

### Проверка DATABASE_URL

В `apps/api/.env` должно быть:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/eatsense
```

**Важно:** Пароль должен совпадать с `docker-compose.yml` (там `password`).

### Применить миграции локально

После исправления DATABASE_URL:
```bash
cd apps/api
pnpm exec prisma migrate deploy
```

## ✅ Проверка после исправления

1. **На Railway:**
   - Ошибки `The table public.local_foods does not exist` должны исчезнуть
   - Анализ продуктов должен работать без ошибок
   - Отчеты должны работать (они и так работали)

2. **На локалке:**
   - Бэкенд должен подключиться к БД
   - Redis должен подключиться
   - Приложение должно запуститься без ошибок


-- CreateTable: LocalFood
-- Локальная таблица топ-100 самых частых продуктов для быстрого поиска
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

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "local_foods_name_key" ON "local_foods"("name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "local_foods_name_idx" ON "local_foods"("name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "local_foods_popularity_idx" ON "local_foods"("popularity");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "local_foods_category_idx" ON "local_foods"("category");


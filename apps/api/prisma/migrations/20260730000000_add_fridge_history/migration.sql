-- Fridge feature v2: scan history + saved recipes.
--
-- Until now the "photograph your fridge" flow persisted NOTHING: the recognized
-- ingredients and the generated recipes lived only in React state, so closing the
-- screen threw them away. These two tables back the history screen, favourites,
-- and "I cooked this" → diary.
--
-- The photo itself is deliberately NOT stored — only the recognized inventory.
--
-- fridge_scans doubles as the DB-backed counter for DailyLimitGuard: before it
-- existed the fridge quota silently failed OPEN whenever Redis was down.
--
-- Idempotent: safe to run on a clean DB and on prod.

CREATE TABLE IF NOT EXISTS "fridge_scans" (
  "id"             TEXT         NOT NULL,
  "userId"         TEXT         NOT NULL,
  "ingredients"    JSONB        NOT NULL,
  "detected_count" INTEGER      NOT NULL DEFAULT 0,
  "edited_count"   INTEGER      NOT NULL DEFAULT 0,
  "locale"         TEXT         NOT NULL DEFAULT 'en',
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "fridge_scans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "fridge_recipes" (
  "id"               TEXT             NOT NULL,
  "userId"           TEXT             NOT NULL,
  "scan_id"          TEXT,
  "title"            TEXT             NOT NULL,
  "uses_ingredients" JSONB            NOT NULL,
  "also_need"        JSONB            NOT NULL,
  "calories"         DOUBLE PRECISION NOT NULL DEFAULT 0,
  "protein"          DOUBLE PRECISION NOT NULL DEFAULT 0,
  "carbs"            DOUBLE PRECISION NOT NULL DEFAULT 0,
  "fat"              DOUBLE PRECISION NOT NULL DEFAULT 0,
  "time_minutes"     INTEGER,
  "steps"            JSONB            NOT NULL,
  "is_favorite"      BOOLEAN          NOT NULL DEFAULT false,
  "cooked_count"     INTEGER          NOT NULL DEFAULT 0,
  "last_cooked_at"   TIMESTAMP(3),
  "created_at"       TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "fridge_recipes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "fridge_scans_userId_created_at_idx"    ON "fridge_scans" ("userId", "created_at");
CREATE INDEX IF NOT EXISTS "fridge_recipes_userId_created_at_idx"  ON "fridge_recipes" ("userId", "created_at");
CREATE INDEX IF NOT EXISTS "fridge_recipes_userId_is_favorite_idx" ON "fridge_recipes" ("userId", "is_favorite");
CREATE INDEX IF NOT EXISTS "fridge_recipes_scan_id_idx"            ON "fridge_recipes" ("scan_id");

-- Cascades keep GDPR account deletion working without extra code.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fridge_scans_userId_fkey') THEN
    ALTER TABLE "fridge_scans"
      ADD CONSTRAINT "fridge_scans_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fridge_recipes_userId_fkey') THEN
    ALTER TABLE "fridge_recipes"
      ADD CONSTRAINT "fridge_recipes_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fridge_recipes_scan_id_fkey') THEN
    ALTER TABLE "fridge_recipes"
      ADD CONSTRAINT "fridge_recipes_scan_id_fkey"
      FOREIGN KEY ("scan_id") REFERENCES "fridge_scans" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

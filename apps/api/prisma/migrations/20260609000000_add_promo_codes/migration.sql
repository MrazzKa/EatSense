-- Server-side promo codes (free-period grants). Idempotent-safe via IF NOT EXISTS.
CREATE TABLE IF NOT EXISTS "promo_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "planName" TEXT NOT NULL DEFAULT 'monthly',
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "max_redemptions" INTEGER,
    "redemption_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "promo_codes_code_key" ON "promo_codes"("code");

CREATE TABLE IF NOT EXISTS "promo_redemptions" (
    "id" TEXT NOT NULL,
    "code_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "promo_redemptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "promo_redemptions_code_id_user_id_key" ON "promo_redemptions"("code_id", "user_id");
CREATE INDEX IF NOT EXISTS "promo_redemptions_user_id_idx" ON "promo_redemptions"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'promo_redemptions_code_id_fkey'
  ) THEN
    ALTER TABLE "promo_redemptions"
      ADD CONSTRAINT "promo_redemptions_code_id_fkey"
      FOREIGN KEY ("code_id") REFERENCES "promo_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

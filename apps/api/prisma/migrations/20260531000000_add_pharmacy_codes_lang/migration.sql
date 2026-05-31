-- Pharmacy access codes + email language. All additive; no data migration.

-- 1) Language + link source on existing pharmacy connections.
ALTER TABLE "pharmacy_connections" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "pharmacy_connections" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual';

-- 2) Admin-provisioned pharmacy registry. Patients link by entering "code".
CREATE TABLE "pharmacy_access_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "pharmacy_name" TEXT NOT NULL,
    "pharmacy_email" TEXT,
    "pharmacy_address" TEXT,
    "pharmacy_phone" TEXT,
    "pharmacy_website" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pharmacy_access_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pharmacy_access_codes_code_key" ON "pharmacy_access_codes"("code");
CREATE INDEX "pharmacy_access_codes_code_idx" ON "pharmacy_access_codes"("code");

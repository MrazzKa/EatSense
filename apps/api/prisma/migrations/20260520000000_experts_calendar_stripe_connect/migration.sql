-- experts_calendar_stripe_connect: calendar/scheduling + Stripe Connect + notes/audit
-- Written idempotently (IF NOT EXISTS) because some prod data may already have partial state.

-- ============================================================
-- ExpertProfile: new columns
-- ============================================================
ALTER TABLE "expert_profiles" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "expert_profiles" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "expert_profiles" ADD COLUMN IF NOT EXISTS "timezone" TEXT;
ALTER TABLE "expert_profiles" ADD COLUMN IF NOT EXISTS "license_number" TEXT;
ALTER TABLE "expert_profiles" ADD COLUMN IF NOT EXISTS "away_until" TIMESTAMP(3);
ALTER TABLE "expert_profiles" ADD COLUMN IF NOT EXISTS "away_message" TEXT;
ALTER TABLE "expert_profiles" ADD COLUMN IF NOT EXISTS "stripe_connect_account_id" TEXT;
ALTER TABLE "expert_profiles" ADD COLUMN IF NOT EXISTS "stripe_connect_payouts_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "expert_profiles" ADD COLUMN IF NOT EXISTS "stripe_connect_charges_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "expert_profiles" ADD COLUMN IF NOT EXISTS "stripe_connect_details_submitted" BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- ScheduledConsultationStatus enum
-- ============================================================
DO $$ BEGIN
  CREATE TYPE "ScheduledConsultationStatus" AS ENUM ('SCHEDULED', 'PENDING_RESCHEDULE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- data_access_audits
-- ============================================================
CREATE TABLE IF NOT EXISTS "data_access_audits" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "expert_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "scope" TEXT,
    "context" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "data_access_audits_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "data_access_audits_client_id_created_at_idx" ON "data_access_audits"("client_id", "created_at");
CREATE INDEX IF NOT EXISTS "data_access_audits_expert_id_created_at_idx" ON "data_access_audits"("expert_id", "created_at");

DO $$ BEGIN
  ALTER TABLE "data_access_audits" ADD CONSTRAINT "data_access_audits_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "data_access_audits" ADD CONSTRAINT "data_access_audits_expert_id_fkey" FOREIGN KEY ("expert_id") REFERENCES "expert_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- expert_client_notes
-- ============================================================
CREATE TABLE IF NOT EXISTS "expert_client_notes" (
    "id" TEXT NOT NULL,
    "expert_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "expert_client_notes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "expert_client_notes_expert_id_client_id_key" ON "expert_client_notes"("expert_id", "client_id");
CREATE INDEX IF NOT EXISTS "expert_client_notes_expert_id_updated_at_idx" ON "expert_client_notes"("expert_id", "updated_at");

DO $$ BEGIN
  ALTER TABLE "expert_client_notes" ADD CONSTRAINT "expert_client_notes_expert_id_fkey" FOREIGN KEY ("expert_id") REFERENCES "expert_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "expert_client_notes" ADD CONSTRAINT "expert_client_notes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- expert_availability
-- ============================================================
CREATE TABLE IF NOT EXISTS "expert_availability" (
    "id" TEXT NOT NULL,
    "expert_id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "expert_availability_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "expert_availability_expert_id_weekday_idx" ON "expert_availability"("expert_id", "weekday");

DO $$ BEGIN
  ALTER TABLE "expert_availability" ADD CONSTRAINT "expert_availability_expert_id_fkey" FOREIGN KEY ("expert_id") REFERENCES "expert_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- availability_exceptions
-- ============================================================
CREATE TABLE IF NOT EXISTS "availability_exceptions" (
    "id" TEXT NOT NULL,
    "expert_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "kind" TEXT NOT NULL,
    "start_minute" INTEGER,
    "end_minute" INTEGER,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "availability_exceptions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "availability_exceptions_expert_id_date_idx" ON "availability_exceptions"("expert_id", "date");

DO $$ BEGIN
  ALTER TABLE "availability_exceptions" ADD CONSTRAINT "availability_exceptions_expert_id_fkey" FOREIGN KEY ("expert_id") REFERENCES "expert_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- scheduled_consultations
-- ============================================================
CREATE TABLE IF NOT EXISTS "scheduled_consultations" (
    "id" TEXT NOT NULL,
    "expert_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "conversation_id" TEXT,
    "offer_id" TEXT,
    "payment_id" TEXT,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "status" "ScheduledConsultationStatus" NOT NULL DEFAULT 'SCHEDULED',
    "initiated_by" TEXT NOT NULL,
    "cancellation_reason" TEXT,
    "cancelled_by" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "rescheduled_from_id" TEXT,
    "proposed_start_at" TIMESTAMP(3),
    "proposed_end_at" TIMESTAMP(3),
    "proposed_by" TEXT,
    "livekit_room" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "rating_prompt_sent_at" TIMESTAMP(3),
    "reminder_24h_sent_at" TIMESTAMP(3),
    "reminder_1h_sent_at" TIMESTAMP(3),
    "reminder_10m_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "scheduled_consultations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "scheduled_consultations_expert_id_start_at_idx" ON "scheduled_consultations"("expert_id", "start_at");
CREATE INDEX IF NOT EXISTS "scheduled_consultations_client_id_start_at_idx" ON "scheduled_consultations"("client_id", "start_at");
CREATE INDEX IF NOT EXISTS "scheduled_consultations_status_start_at_idx" ON "scheduled_consultations"("status", "start_at");

DO $$ BEGIN
  ALTER TABLE "scheduled_consultations" ADD CONSTRAINT "scheduled_consultations_expert_id_fkey" FOREIGN KEY ("expert_id") REFERENCES "expert_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "scheduled_consultations" ADD CONSTRAINT "scheduled_consultations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AlterTable: Add appleUserId column to users table (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'appleUserId') THEN
    ALTER TABLE "users" ADD COLUMN "appleUserId" TEXT;
  END IF;
END $$;

-- CreateIndex: Add unique constraint for appleUserId (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'users_appleUserId_key') THEN
    CREATE UNIQUE INDEX "users_appleUserId_key" ON "users"("appleUserId") WHERE "appleUserId" IS NOT NULL;
  END IF;
END $$;

-- AlterTable: Add avatarUrl column to user_profiles table (if not exists)
-- Using DO block to safely add column only if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'avatarUrl'
  ) THEN
    ALTER TABLE "user_profiles" ADD COLUMN "avatarUrl" TEXT;
    RAISE NOTICE 'Added avatarUrl column to user_profiles';
  ELSE
    RAISE NOTICE 'avatarUrl column already exists in user_profiles';
  END IF;
END $$;

-- CreateTable: MedicationSchedule (legacy model) - only if not exists
CREATE TABLE IF NOT EXISTS "medication_schedules" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT,
    "frequency" TEXT NOT NULL,
    "times" TEXT[],
    "daysOfWeek" INTEGER[],
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3),
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "reminder_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medication_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Medication (new model) - only if not exists
CREATE TABLE IF NOT EXISTS "medications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT,
    "instructions" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MedicationDose - only if not exists
CREATE TABLE IF NOT EXISTS "medication_doses" (
    "id" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "timeOfDay" TEXT NOT NULL,
    "beforeMeal" BOOLEAN NOT NULL DEFAULT false,
    "afterMeal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medication_doses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: medication_schedules indexes (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'medication_schedules_userId_is_active_idx') THEN
    CREATE INDEX "medication_schedules_userId_is_active_idx" ON "medication_schedules"("userId", "is_active");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'medication_schedules_userId_start_date_idx') THEN
    CREATE INDEX "medication_schedules_userId_start_date_idx" ON "medication_schedules"("userId", "start_date");
  END IF;
END $$;

-- CreateIndex: medications indexes (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'medications_userId_isActive_idx') THEN
    CREATE INDEX "medications_userId_isActive_idx" ON "medications"("userId", "isActive");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'medications_userId_startDate_idx') THEN
    CREATE INDEX "medications_userId_startDate_idx" ON "medications"("userId", "startDate");
  END IF;
END $$;

-- AddForeignKey: medication_schedules -> users (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'medication_schedules_userId_fkey') THEN
    ALTER TABLE "medication_schedules" ADD CONSTRAINT "medication_schedules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: medications -> users (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'medications_userId_fkey') THEN
    ALTER TABLE "medications" ADD CONSTRAINT "medications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: medication_doses -> medications (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'medication_doses_medicationId_fkey') THEN
    ALTER TABLE "medication_doses" ADD CONSTRAINT "medication_doses_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;


-- AlterTable: Add appleUserId column to users table
ALTER TABLE "users" ADD COLUMN "appleUserId" TEXT;

-- CreateIndex: Add unique constraint for appleUserId
CREATE UNIQUE INDEX "users_appleUserId_key" ON "users"("appleUserId") WHERE "appleUserId" IS NOT NULL;

-- AlterTable: Add avatarUrl column to user_profiles table
ALTER TABLE "user_profiles" ADD COLUMN "avatarUrl" TEXT;

-- CreateTable: MedicationSchedule (legacy model)
CREATE TABLE "medication_schedules" (
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

-- CreateTable: Medication (new model)
CREATE TABLE "medications" (
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

-- CreateTable: MedicationDose
CREATE TABLE "medication_doses" (
    "id" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "timeOfDay" TEXT NOT NULL,
    "beforeMeal" BOOLEAN NOT NULL DEFAULT false,
    "afterMeal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medication_doses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: medication_schedules indexes
CREATE INDEX "medication_schedules_userId_is_active_idx" ON "medication_schedules"("userId", "is_active");
CREATE INDEX "medication_schedules_userId_start_date_idx" ON "medication_schedules"("userId", "start_date");

-- CreateIndex: medications indexes
CREATE INDEX "medications_userId_isActive_idx" ON "medications"("userId", "isActive");
CREATE INDEX "medications_userId_startDate_idx" ON "medications"("userId", "startDate");

-- AddForeignKey: medication_schedules -> users
ALTER TABLE "medication_schedules" ADD CONSTRAINT "medication_schedules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: medications -> users
ALTER TABLE "medications" ADD CONSTRAINT "medications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: medication_doses -> medications
ALTER TABLE "medication_doses" ADD CONSTRAINT "medication_doses_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;


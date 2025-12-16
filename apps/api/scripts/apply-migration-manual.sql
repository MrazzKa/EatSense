-- Manual migration script to add missing columns/tables
-- Run this directly in Railway PostgreSQL if prisma migrate deploy fails

-- Add avatarUrl column to user_profiles (if not exists)
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

-- Add appleUserId column to users (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'appleUserId'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "appleUserId" TEXT;
    RAISE NOTICE 'Added appleUserId column to users';
  ELSE
    RAISE NOTICE 'appleUserId column already exists in users';
  END IF;
END $$;

-- Create unique index for appleUserId (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'users_appleUserId_key') THEN
    CREATE UNIQUE INDEX "users_appleUserId_key" ON "users"("appleUserId") WHERE "appleUserId" IS NOT NULL;
    RAISE NOTICE 'Created users_appleUserId_key index';
  ELSE
    RAISE NOTICE 'users_appleUserId_key index already exists';
  END IF;
END $$;


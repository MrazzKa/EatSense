-- Safe migration to ensure user_profiles has avatarUrl column with correct casing
-- 1) Rename legacy avatarurl -> "avatarUrl" if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'avatarurl'
  ) THEN
    ALTER TABLE "user_profiles" RENAME COLUMN avatarurl TO "avatarUrl";
  END IF;
END $$;

-- 2) Add "avatarUrl" column if it still doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'avatarUrl'
  ) THEN
    ALTER TABLE "user_profiles" ADD COLUMN "avatarUrl" TEXT;
  END IF;
END $$;



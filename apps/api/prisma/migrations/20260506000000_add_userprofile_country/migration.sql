-- Add country (ISO 3166-1 alpha-2) to user_profiles for community auto-join
ALTER TABLE "user_profiles" ADD COLUMN "country" TEXT;

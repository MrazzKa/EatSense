ALTER TABLE "expert_profiles"
ADD COLUMN IF NOT EXISTS "video_enabled" BOOLEAN NOT NULL DEFAULT true;

-- Display-only baseline member count for community groups (pilot visibility).
-- Safe on clean and prod DBs.
ALTER TABLE "community_groups"
  ADD COLUMN IF NOT EXISTS "base_member_count" INTEGER NOT NULL DEFAULT 0;

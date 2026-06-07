-- Add ROUTE to CommunityPostType enum (community running/walking/cycling routes).
-- Postgres requires ADD VALUE outside a transaction; Prisma runs each statement
-- separately so this is safe. IF NOT EXISTS makes it idempotent.
ALTER TYPE "CommunityPostType" ADD VALUE IF NOT EXISTS 'ROUTE';

-- AlterTable: Add reactionType column to community_likes
ALTER TABLE "community_likes" ADD COLUMN "reactionType" TEXT NOT NULL DEFAULT 'LIKE';

-- AlterTable
ALTER TABLE "community_memberships" ADD COLUMN "guidelinesAccepted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "community_memberships" ADD COLUMN "guidelinesVersion" INTEGER NOT NULL DEFAULT 1;

-- Update existing memberships to mark guidelines as accepted (grandfathered)
UPDATE "community_memberships" SET "guidelinesAccepted" = true;

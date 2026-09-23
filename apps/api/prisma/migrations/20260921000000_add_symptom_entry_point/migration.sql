-- Where on the body the user actually tapped.
--
-- The body map used to ask people to hit one of ~20 rectangles. It now asks them
-- to place a point on a silhouette, which is both what a person means by "it
-- hurts here" and what a specialist needs to see. The zone is still derived from
-- the point and still drives the questionnaire, so nothing downstream changes —
-- these columns only keep the precision that was being thrown away.
--
-- All three are nullable on purpose: reports written before this migration have
-- a zone and no point, and must keep working.
--
-- "view" is not redundant with the zone. Arms, shoulders and the head can be
-- marked from either silhouette, and the same x on the back is the opposite side
-- of the body from the same x on the front — without it, a mark made on the back
-- would be redrawn mirrored.
--
-- Idempotent: safe to run on a clean DB and on prod.

ALTER TABLE "symptom_entries" ADD COLUMN IF NOT EXISTS "x"    DOUBLE PRECISION;
ALTER TABLE "symptom_entries" ADD COLUMN IF NOT EXISTS "y"    DOUBLE PRECISION;
ALTER TABLE "symptom_entries" ADD COLUMN IF NOT EXISTS "view" TEXT;

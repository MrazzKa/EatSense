-- Allow ANONYMOUS analysis corrections.
--
-- The Correct button has always existed and the delta "model said X → user said Y"
-- is exactly the training/eval signal we need, but nothing ever wrote to this
-- table so the signal was discarded on every edit.
--
-- We now capture it by default WITHOUT attaching it to a person: text and numbers
-- only, no userId, which needs no consent under GDPR/FADP. The column is filled in
-- only for users who explicitly opt into the "help improve accuracy" toggle.
--
-- Idempotent: safe to run on a clean DB and on prod.

ALTER TABLE "analysis_corrections"
  ALTER COLUMN "userId" DROP NOT NULL;

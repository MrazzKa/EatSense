-- Body map ("what is bothering you"): self-reported symptoms pinned to body zones.
--
-- A report is one submission — the user marked up to a few zones on the
-- silhouette, rated each one and answered a short questionnaire. Entries are
-- normalised into their own table rather than kept as a JSON blob so that
-- "how often does this zone come up for this user" stays a plain indexed query;
-- that is the raw material for the food/symptom correlation work later.
--
-- Deliberately NOT stored here: any interpretation, score or suggested cause.
-- This is a diary, and interpreting symptoms is what turns software into a
-- regulated medical device.
--
-- Idempotent: safe to run on a clean DB and on prod.

CREATE TABLE IF NOT EXISTS "symptom_reports" (
  "id"           TEXT         NOT NULL,
  "user_id"      TEXT         NOT NULL,
  -- When the symptoms happened, per the user. Defaults to submission time but is
  -- editable: people log in the evening what hurt at lunch.
  "reported_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "note"         TEXT,
  -- Highest severity across entries, denormalised so the history list never has
  -- to load the entries.
  "max_severity" INTEGER      NOT NULL,
  -- Set when the user ticked anything on the emergency checklist.
  "red_flagged"  BOOLEAN      NOT NULL DEFAULT false,
  "red_flags"    TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  -- UI language at capture time; answers are language-independent catalogue ids,
  -- "note" is free text in this language.
  "locale"       TEXT,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "symptom_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "symptom_entries" (
  "id"         TEXT         NOT NULL,
  "report_id"  TEXT         NOT NULL,
  -- Catalogue id of the body zone, e.g. 'abdomen_epigastrium'.
  "zone_id"    TEXT         NOT NULL,
  -- 1..10, as the user set the slider.
  "severity"   INTEGER      NOT NULL,
  -- Answers keyed by question id; values are catalogue ids, never free text.
  "answers"    JSONB        NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "symptom_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "symptom_reports_user_id_reported_at_idx" ON "symptom_reports" ("user_id", "reported_at");
CREATE INDEX IF NOT EXISTS "symptom_entries_report_id_idx"           ON "symptom_entries" ("report_id");
CREATE INDEX IF NOT EXISTS "symptom_entries_zone_id_idx"             ON "symptom_entries" ("zone_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'symptom_reports_user_id_fkey') THEN
    ALTER TABLE "symptom_reports"
      ADD CONSTRAINT "symptom_reports_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'symptom_entries_report_id_fkey') THEN
    ALTER TABLE "symptom_entries"
      ADD CONSTRAINT "symptom_entries_report_id_fkey"
      FOREIGN KEY ("report_id") REFERENCES "symptom_reports" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- Video consultations: VIDEO_CONSULTATION offer format + slot duration + VideoSession model.

-- Postgres requires committing the new enum value before referencing it in a query within the same transaction.
ALTER TYPE "OfferFormat" ADD VALUE IF NOT EXISTS 'VIDEO_CONSULTATION';

ALTER TABLE "expert_offers" ADD COLUMN "slot_minutes" INTEGER;

CREATE TABLE "video_sessions" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "room_name" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "duration_sec" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "recording_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "video_sessions_room_name_key" ON "video_sessions"("room_name");
CREATE INDEX "video_sessions_conversation_id_status_idx" ON "video_sessions"("conversation_id", "status");
CREATE INDEX "video_sessions_scheduled_at_idx" ON "video_sessions"("scheduled_at");

ALTER TABLE "video_sessions" ADD CONSTRAINT "video_sessions_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

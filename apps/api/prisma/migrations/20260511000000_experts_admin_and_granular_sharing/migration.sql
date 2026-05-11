-- Admin workflow improvements: persistent rejection reason, admin notes, audit log.
-- Granular sharing: replace single reports_shared with per-category flags.

-- ============== ExpertProfile: admin fields ==============
ALTER TABLE "expert_profiles" ADD COLUMN     "rejection_reason" TEXT;
ALTER TABLE "expert_profiles" ADD COLUMN     "admin_notes" TEXT;
ALTER TABLE "expert_profiles" ADD COLUMN     "rejected_at" TIMESTAMP(3);

-- ============== Conversation: granular sharing ==============
-- New per-category flags. Keep reports_shared for backwards compat (derived: any true).
ALTER TABLE "conversations" ADD COLUMN     "share_meals" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "conversations" ADD COLUMN     "share_analyses" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "conversations" ADD COLUMN     "share_medications" BOOLEAN NOT NULL DEFAULT false;

-- Migrate existing reports_shared=true rows to all three flags.
UPDATE "conversations"
SET "share_meals" = true, "share_analyses" = true, "share_medications" = true
WHERE "reports_shared" = true;

-- ============== AdminAuditLog ==============
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "admin_identifier" TEXT,
    "payload" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_audit_logs_target_type_target_id_idx" ON "admin_audit_logs"("target_type", "target_id");
CREATE INDEX "admin_audit_logs_action_idx" ON "admin_audit_logs"("action");
CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs"("created_at");

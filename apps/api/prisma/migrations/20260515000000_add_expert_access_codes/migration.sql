CREATE TABLE "expert_access_codes" (
    "id" TEXT NOT NULL,
    "expert_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expert_access_codes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "expert_client_links" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "expert_id" TEXT NOT NULL,
    "code_id" TEXT,
    "source" TEXT NOT NULL DEFAULT 'code',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expert_client_links_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "expert_access_code_usages" (
    "id" TEXT NOT NULL,
    "code_id" TEXT NOT NULL,
    "expert_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "conversation_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expert_access_code_usages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "expert_access_codes_expert_id_key" ON "expert_access_codes"("expert_id");
CREATE UNIQUE INDEX "expert_access_codes_code_key" ON "expert_access_codes"("code");
CREATE INDEX "expert_access_codes_code_idx" ON "expert_access_codes"("code");

CREATE UNIQUE INDEX "expert_client_links_client_id_expert_id_key" ON "expert_client_links"("client_id", "expert_id");
CREATE INDEX "expert_client_links_client_id_is_active_idx" ON "expert_client_links"("client_id", "is_active");
CREATE INDEX "expert_client_links_expert_id_idx" ON "expert_client_links"("expert_id");

CREATE INDEX "expert_access_code_usages_code_id_created_at_idx" ON "expert_access_code_usages"("code_id", "created_at");
CREATE INDEX "expert_access_code_usages_expert_id_created_at_idx" ON "expert_access_code_usages"("expert_id", "created_at");
CREATE INDEX "expert_access_code_usages_client_id_created_at_idx" ON "expert_access_code_usages"("client_id", "created_at");

ALTER TABLE "expert_access_codes" ADD CONSTRAINT "expert_access_codes_expert_id_fkey" FOREIGN KEY ("expert_id") REFERENCES "expert_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expert_client_links" ADD CONSTRAINT "expert_client_links_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expert_client_links" ADD CONSTRAINT "expert_client_links_expert_id_fkey" FOREIGN KEY ("expert_id") REFERENCES "expert_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expert_client_links" ADD CONSTRAINT "expert_client_links_code_id_fkey" FOREIGN KEY ("code_id") REFERENCES "expert_access_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "expert_access_code_usages" ADD CONSTRAINT "expert_access_code_usages_code_id_fkey" FOREIGN KEY ("code_id") REFERENCES "expert_access_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expert_access_code_usages" ADD CONSTRAINT "expert_access_code_usages_expert_id_fkey" FOREIGN KEY ("expert_id") REFERENCES "expert_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expert_access_code_usages" ADD CONSTRAINT "expert_access_code_usages_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expert_access_code_usages" ADD CONSTRAINT "expert_access_code_usages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;


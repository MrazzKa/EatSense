-- CreateTable
CREATE TABLE "expert_education" (
    "id" TEXT NOT NULL,
    "expert_id" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "year" TEXT,
    "document_url" TEXT,
    "document_type" TEXT,
    "document_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expert_education_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expert_education_expert_id_idx" ON "expert_education"("expert_id");

-- AddForeignKey
ALTER TABLE "expert_education" ADD CONSTRAINT "expert_education_expert_id_fkey" FOREIGN KEY ("expert_id") REFERENCES "expert_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

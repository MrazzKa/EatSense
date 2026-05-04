ALTER TABLE "meals" ADD COLUMN "analysis_id" TEXT;

CREATE INDEX "meals_analysis_id_idx" ON "meals"("analysis_id");

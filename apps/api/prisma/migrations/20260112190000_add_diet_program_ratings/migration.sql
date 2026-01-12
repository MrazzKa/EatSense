-- CreateTable (with IF NOT EXISTS to handle existing table)
CREATE TABLE IF NOT EXISTS "diet_program_ratings" (
    "id" TEXT NOT NULL,
    "diet_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "review" TEXT,
    "weight_lost" DOUBLE PRECISION,
    "duration_weeks" INTEGER,
    "would_recommend" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diet_program_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS "diet_program_ratings_diet_id_idx" ON "diet_program_ratings"("diet_id");

-- CreateIndex (with IF NOT EXISTS)
CREATE UNIQUE INDEX IF NOT EXISTS "diet_program_ratings_diet_id_user_id_key" ON "diet_program_ratings"("diet_id", "user_id");

-- AddForeignKey (only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'diet_program_ratings_diet_id_fkey') THEN
        ALTER TABLE "diet_program_ratings" ADD CONSTRAINT "diet_program_ratings_diet_id_fkey" FOREIGN KEY ("diet_id") REFERENCES "diet_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'diet_program_ratings_user_id_fkey') THEN
        ALTER TABLE "diet_program_ratings" ADD CONSTRAINT "diet_program_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;


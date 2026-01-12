-- CreateTable
CREATE TABLE "diet_program_ratings" (
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

-- CreateIndex
CREATE INDEX "diet_program_ratings_diet_id_idx" ON "diet_program_ratings"("diet_id");

-- CreateIndex
CREATE UNIQUE INDEX "diet_program_ratings_diet_id_user_id_key" ON "diet_program_ratings"("diet_id", "user_id");

-- AddForeignKey
ALTER TABLE "diet_program_ratings" ADD CONSTRAINT "diet_program_ratings_diet_id_fkey" FOREIGN KEY ("diet_id") REFERENCES "diet_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diet_program_ratings" ADD CONSTRAINT "diet_program_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

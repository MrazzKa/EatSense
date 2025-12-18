-- CreateTable
CREATE TABLE "analysis_corrections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "analysisId" TEXT,
    "mealId" TEXT,
    "itemId" TEXT,
    "originalName" TEXT NOT NULL,
    "correctedName" TEXT,
    "originalPortionG" DOUBLE PRECISION,
    "correctedPortionG" DOUBLE PRECISION,
    "originalCalories" DOUBLE PRECISION,
    "correctedCalories" DOUBLE PRECISION,
    "originalProtein" DOUBLE PRECISION,
    "correctedProtein" DOUBLE PRECISION,
    "originalCarbs" DOUBLE PRECISION,
    "correctedCarbs" DOUBLE PRECISION,
    "originalFat" DOUBLE PRECISION,
    "correctedFat" DOUBLE PRECISION,
    "correctionType" TEXT NOT NULL,
    "foodCategory" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analysis_corrections_userId_createdAt_idx" ON "analysis_corrections"("userId", "createdAt");
CREATE INDEX "analysis_corrections_analysisId_idx" ON "analysis_corrections"("analysisId");
CREATE INDEX "analysis_corrections_mealId_idx" ON "analysis_corrections"("mealId");
CREATE INDEX "analysis_corrections_correctionType_idx" ON "analysis_corrections"("correctionType");
CREATE INDEX "analysis_corrections_foodCategory_idx" ON "analysis_corrections"("foodCategory");

-- AddForeignKey
ALTER TABLE "analysis_corrections" ADD CONSTRAINT "analysis_corrections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


/*
  Warnings:

  - You are about to drop the column `correctedCalories` on the `analysis_corrections` table. All the data in the column will be lost.
  - You are about to drop the column `correctedCarbs` on the `analysis_corrections` table. All the data in the column will be lost.
  - You are about to drop the column `correctedFat` on the `analysis_corrections` table. All the data in the column will be lost.
  - You are about to drop the column `correctedPortionG` on the `analysis_corrections` table. All the data in the column will be lost.
  - You are about to drop the column `correctedProtein` on the `analysis_corrections` table. All the data in the column will be lost.
  - You are about to drop the column `correctionType` on the `analysis_corrections` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `analysis_corrections` table. All the data in the column will be lost.
  - You are about to drop the column `foodCategory` on the `analysis_corrections` table. All the data in the column will be lost.
  - You are about to drop the column `originalCalories` on the `analysis_corrections` table. All the data in the column will be lost.
  - You are about to drop the column `originalCarbs` on the `analysis_corrections` table. All the data in the column will be lost.
  - You are about to drop the column `originalFat` on the `analysis_corrections` table. All the data in the column will be lost.
  - You are about to drop the column `originalPortionG` on the `analysis_corrections` table. All the data in the column will be lost.
  - You are about to drop the column `originalProtein` on the `analysis_corrections` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[jti]` on the table `refresh_tokens` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[appleUserId]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `correction_type` to the `analysis_corrections` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "analysis_corrections_correctionType_idx";

-- DropIndex
DROP INDEX "analysis_corrections_foodCategory_idx";

-- DropIndex
DROP INDEX "analysis_corrections_userId_createdAt_idx";

-- AlterTable
ALTER TABLE "analysis_corrections" DROP COLUMN "correctedCalories",
DROP COLUMN "correctedCarbs",
DROP COLUMN "correctedFat",
DROP COLUMN "correctedPortionG",
DROP COLUMN "correctedProtein",
DROP COLUMN "correctionType",
DROP COLUMN "createdAt",
DROP COLUMN "foodCategory",
DROP COLUMN "originalCalories",
DROP COLUMN "originalCarbs",
DROP COLUMN "originalFat",
DROP COLUMN "originalPortionG",
DROP COLUMN "originalProtein",
ADD COLUMN     "corrected_calories" DOUBLE PRECISION,
ADD COLUMN     "corrected_carbs" DOUBLE PRECISION,
ADD COLUMN     "corrected_fat" DOUBLE PRECISION,
ADD COLUMN     "corrected_portion_g" DOUBLE PRECISION,
ADD COLUMN     "corrected_protein" DOUBLE PRECISION,
ADD COLUMN     "correction_type" TEXT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "food_category" TEXT,
ADD COLUMN     "original_calories" DOUBLE PRECISION,
ADD COLUMN     "original_carbs" DOUBLE PRECISION,
ADD COLUMN     "original_fat" DOUBLE PRECISION,
ADD COLUMN     "original_portion_g" DOUBLE PRECISION,
ADD COLUMN     "original_protein" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "meal_items" ADD COLUMN     "fiber" DOUBLE PRECISION,
ADD COLUMN     "sat_fat" DOUBLE PRECISION,
ADD COLUMN     "sugars" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "analysis_corrections_userId_created_at_idx" ON "analysis_corrections"("userId", "created_at");

-- CreateIndex
CREATE INDEX "analysis_corrections_correction_type_idx" ON "analysis_corrections"("correction_type");

-- CreateIndex
CREATE INDEX "analysis_corrections_food_category_idx" ON "analysis_corrections"("food_category");

-- CreateIndex (refresh_tokens_jti_key already exists from migration 20251218000001)

-- CreateIndex (users_appleUserId_key already exists from migration 20251216000000)

-- CreateEnum
CREATE TYPE "MascotType" AS ENUM ('CAT', 'DOG', 'PANDA', 'FOX', 'ROBOT');

-- CreateTable
CREATE TABLE "user_mascots" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mascotType" "MascotType" NOT NULL,
    "name" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_mascots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_mascots_userId_key" ON "user_mascots"("userId");

-- AddForeignKey
ALTER TABLE "user_mascots" ADD CONSTRAINT "user_mascots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

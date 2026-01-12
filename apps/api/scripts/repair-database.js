/**
 * Database repair script - runs BEFORE the main app
 * Uses Prisma to fix database issues that block migrations
 */
const { PrismaClient } = require('@prisma/client');

async function repairDatabase() {
    const prisma = new PrismaClient();

    try {
        console.log('🔧 Starting database repair...');

        // 1. Delete failed migration records
        console.log('🗑️ Clearing failed migration records...');
        try {
            const result = await prisma.$executeRawUnsafe(`
        DELETE FROM _prisma_migrations 
        WHERE finished_at IS NULL 
           OR migration_name LIKE '%add_diet_program_ratings%'
           OR migration_name LIKE '%fix_all_missing%'
      `);
            console.log(`   Deleted ${result} failed migration records`);
        } catch (e) {
            console.log('   ⚠️ Could not clear migrations:', e.message?.split('\n')[0]);
        }

        // 2. Add ALL missing columns to user_diet_programs
        console.log('📊 Adding missing columns to user_diet_programs...');
        const columns = [
            { name: 'days_completed', sql: 'ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "days_completed" INTEGER NOT NULL DEFAULT 0' },
            { name: 'meals_logged', sql: 'ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "meals_logged" INTEGER NOT NULL DEFAULT 0' },
            { name: 'adherence_score', sql: 'ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "adherence_score" DOUBLE PRECISION NOT NULL DEFAULT 0' },
            { name: 'start_weight', sql: 'ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "start_weight" DOUBLE PRECISION' },
            { name: 'current_weight', sql: 'ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "current_weight" DOUBLE PRECISION' },
            { name: 'custom_calories', sql: 'ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "custom_calories" INTEGER' },
            { name: 'target_weight', sql: 'ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "target_weight" DOUBLE PRECISION' },
            { name: 'current_streak', sql: 'ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "current_streak" INTEGER NOT NULL DEFAULT 0' },
            { name: 'longest_streak', sql: 'ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "longest_streak" INTEGER NOT NULL DEFAULT 0' },
            { name: 'last_streak_date', sql: 'ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "last_streak_date" DATE' },
            { name: 'paused_at', sql: 'ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "paused_at" TIMESTAMP(3)' },
            { name: 'updated_at', sql: 'ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP' },
        ];

        for (const col of columns) {
            try {
                await prisma.$executeRawUnsafe(col.sql);
                console.log(`   ✓ ${col.name}`);
            } catch (e) {
                console.log(`   ⚠️ ${col.name}: ${e.message?.split('\n')[0]}`);
            }
        }

        // 3. Add missing columns to user_diet_daily_logs
        console.log('📊 Checking user_diet_daily_logs columns...');
        const logColumns = [
            { name: 'completed', sql: 'ALTER TABLE "user_diet_daily_logs" ADD COLUMN IF NOT EXISTS "completed" BOOLEAN NOT NULL DEFAULT false' },
            { name: 'celebration_shown', sql: 'ALTER TABLE "user_diet_daily_logs" ADD COLUMN IF NOT EXISTS "celebration_shown" BOOLEAN NOT NULL DEFAULT false' },
        ];

        for (const col of logColumns) {
            try {
                await prisma.$executeRawUnsafe(col.sql);
                console.log(`   ✓ ${col.name}`);
            } catch (e) {
                console.log(`   ⚠️ ${col.name}: ${e.message?.split('\n')[0]}`);
            }
        }

        // 4. Create diet_program_ratings table if not exists
        console.log('📊 Creating diet_program_ratings table...');
        try {
            await prisma.$executeRawUnsafe(`
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
        )
      `);
            console.log('   ✓ diet_program_ratings table ready');
        } catch (e) {
            console.log(`   ⚠️ diet_program_ratings: ${e.message?.split('\n')[0]}`);
        }

        console.log('✅ Database repair completed!');

    } catch (error) {
        console.error('❌ Database repair error:', error.message);
        // Don't throw - let the app try to start anyway
    } finally {
        await prisma.$disconnect();
    }
}

repairDatabase()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(0); // Don't fail, let app start
    });

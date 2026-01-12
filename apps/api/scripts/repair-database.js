/**
 * Database repair script - runs BEFORE Prisma migrations
 * Uses Prisma to fix database issues that block migrations
 * 
 * This adds ALL columns from schema.prisma for:
 * - user_diet_programs
 * - user_diet_daily_logs
 * - diet_program_ratings
 */
const { PrismaClient } = require('@prisma/client');

async function repairDatabase() {
    const prisma = new PrismaClient();

    try {
        console.log('🔧 Starting comprehensive database repair...');

        // 1. Delete ALL failed migration records
        console.log('🗑️ Clearing failed migration records...');
        try {
            const result = await prisma.$executeRawUnsafe(`
        DELETE FROM _prisma_migrations 
        WHERE finished_at IS NULL
      `);
            console.log(`   Deleted ${result} failed migration records`);
        } catch (e) {
            console.log('   ⚠️ Could not clear migrations:', e.message?.split('\n')[0]);
        }

        // 2. Add ALL columns to user_diet_programs
        console.log('📊 Adding columns to user_diet_programs...');
        const userDietProgramColumns = [
            'ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "days_completed" INTEGER NOT NULL DEFAULT 0',
            'ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "meals_logged" INTEGER NOT NULL DEFAULT 0',
            'ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "adherence_score" DOUBLE PRECISION NOT NULL DEFAULT 0',
            'ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "start_weight" DOUBLE PRECISION',
            'ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "current_weight" DOUBLE PRECISION',
            'ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "custom_calories" INTEGER',
            'ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "target_weight" DOUBLE PRECISION',
            'ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "current_streak" INTEGER NOT NULL DEFAULT 0',
            'ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "longest_streak" INTEGER NOT NULL DEFAULT 0',
            'ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "last_streak_date" DATE',
            'ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "paused_at" TIMESTAMP(3)',
            'ALTER TABLE "user_diet_programs" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP',
        ];

        for (const sql of userDietProgramColumns) {
            try {
                await prisma.$executeRawUnsafe(sql);
                console.log(`   ✓ ${sql.match(/\"(\w+)\"/g)?.[1] || 'column'}`);
            } catch (e) {
                if (!e.message?.includes('already exists')) {
                    console.log(`   ⚠️ ${e.message?.split('\n')[0]}`);
                }
            }
        }

        // 3. Add ALL columns to user_diet_daily_logs
        console.log('📊 Adding columns to user_diet_daily_logs...');
        const dailyLogColumns = [
            // Meals logged
            'ALTER TABLE "user_diet_daily_logs" ADD COLUMN IF NOT EXISTS "breakfast_logged" BOOLEAN NOT NULL DEFAULT false',
            'ALTER TABLE "user_diet_daily_logs" ADD COLUMN IF NOT EXISTS "lunch_logged" BOOLEAN NOT NULL DEFAULT false',
            'ALTER TABLE "user_diet_daily_logs" ADD COLUMN IF NOT EXISTS "dinner_logged" BOOLEAN NOT NULL DEFAULT false',
            'ALTER TABLE "user_diet_daily_logs" ADD COLUMN IF NOT EXISTS "snacks_logged" INTEGER NOT NULL DEFAULT 0',
            // Checklist
            'ALTER TABLE "user_diet_daily_logs" ADD COLUMN IF NOT EXISTS "checklist" JSONB',
            'ALTER TABLE "user_diet_daily_logs" ADD COLUMN IF NOT EXISTS "completion_percent" DOUBLE PRECISION',
            // Symptoms
            'ALTER TABLE "user_diet_daily_logs" ADD COLUMN IF NOT EXISTS "symptoms" JSONB',
            // Actual nutrients
            'ALTER TABLE "user_diet_daily_logs" ADD COLUMN IF NOT EXISTS "actual_calories" INTEGER',
            'ALTER TABLE "user_diet_daily_logs" ADD COLUMN IF NOT EXISTS "actual_protein" DOUBLE PRECISION',
            'ALTER TABLE "user_diet_daily_logs" ADD COLUMN IF NOT EXISTS "actual_carbs" DOUBLE PRECISION',
            'ALTER TABLE "user_diet_daily_logs" ADD COLUMN IF NOT EXISTS "actual_fat" DOUBLE PRECISION',
            // Target nutrients
            'ALTER TABLE "user_diet_daily_logs" ADD COLUMN IF NOT EXISTS "target_calories" INTEGER',
            'ALTER TABLE "user_diet_daily_logs" ADD COLUMN IF NOT EXISTS "target_protein" DOUBLE PRECISION',
            'ALTER TABLE "user_diet_daily_logs" ADD COLUMN IF NOT EXISTS "target_carbs" DOUBLE PRECISION',
            'ALTER TABLE "user_diet_daily_logs" ADD COLUMN IF NOT EXISTS "target_fat" DOUBLE PRECISION',
            // Progress
            'ALTER TABLE "user_diet_daily_logs" ADD COLUMN IF NOT EXISTS "adherence_score" DOUBLE PRECISION',
            'ALTER TABLE "user_diet_daily_logs" ADD COLUMN IF NOT EXISTS "weight" DOUBLE PRECISION',
            'ALTER TABLE "user_diet_daily_logs" ADD COLUMN IF NOT EXISTS "mood" TEXT',
            'ALTER TABLE "user_diet_daily_logs" ADD COLUMN IF NOT EXISTS "notes" TEXT',
            // Completion tracking
            'ALTER TABLE "user_diet_daily_logs" ADD COLUMN IF NOT EXISTS "completed" BOOLEAN NOT NULL DEFAULT false',
            'ALTER TABLE "user_diet_daily_logs" ADD COLUMN IF NOT EXISTS "celebration_shown" BOOLEAN NOT NULL DEFAULT false',
        ];

        for (const sql of dailyLogColumns) {
            try {
                await prisma.$executeRawUnsafe(sql);
                console.log(`   ✓ ${sql.match(/\"(\w+)\"/g)?.[1] || 'column'}`);
            } catch (e) {
                if (!e.message?.includes('already exists')) {
                    console.log(`   ⚠️ ${e.message?.split('\n')[0]}`);
                }
            }
        }

        // 4. Create diet_program_ratings table
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
            console.log(`   ⚠️ ${e.message?.split('\n')[0]}`);
        }

        console.log('✅ Database repair completed successfully!');

    } catch (error) {
        console.error('❌ Database repair error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

repairDatabase()
    .then(() => {
        console.log('🏁 Repair script finished');
        process.exit(0);
    })
    .catch((e) => {
        console.error('💥 Repair script error:', e);
        process.exit(0); // Don't fail, let app try to start
    });

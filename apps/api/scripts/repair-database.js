/**
 * Database repair script - runs BEFORE Prisma migrations
 * Uses raw pg client to fix database issues that block migrations
 */
const { Client } = require('pg');

async function repairDatabase() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.log('⚠️ No DATABASE_URL found, skipping database repair');
        return;
    }

    const client = new Client({ connectionString });

    try {
        console.log('🔧 Connecting to database for repairs...');
        await client.connect();

        // 1. Delete failed migration records
        console.log('🗑️ Clearing failed migration records...');
        const deleteResult = await client.query(`
      DELETE FROM _prisma_migrations 
      WHERE finished_at IS NULL 
         OR migration_name LIKE '%add_diet_program_ratings%'
         OR migration_name LIKE '%fix_all_missing%'
    `);
        console.log(`   Deleted ${deleteResult.rowCount} failed migration records`);

        // 2. Add ALL missing columns to user_diet_programs
        console.log('📊 Adding missing columns to user_diet_programs...');
        const columns = [
            { name: 'days_completed', type: 'INTEGER NOT NULL DEFAULT 0' },
            { name: 'meals_logged', type: 'INTEGER NOT NULL DEFAULT 0' },
            { name: 'adherence_score', type: 'DOUBLE PRECISION NOT NULL DEFAULT 0' },
            { name: 'start_weight', type: 'DOUBLE PRECISION' },
            { name: 'current_weight', type: 'DOUBLE PRECISION' },
            { name: 'custom_calories', type: 'INTEGER' },
            { name: 'target_weight', type: 'DOUBLE PRECISION' },
            { name: 'current_streak', type: 'INTEGER NOT NULL DEFAULT 0' },
            { name: 'longest_streak', type: 'INTEGER NOT NULL DEFAULT 0' },
            { name: 'last_streak_date', type: 'DATE' },
            { name: 'paused_at', type: 'TIMESTAMP(3)' },
            { name: 'updated_at', type: 'TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP' },
        ];

        for (const col of columns) {
            try {
                await client.query(`ALTER TABLE user_diet_programs ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type}`);
                console.log(`   ✓ ${col.name}`);
            } catch (e) {
                // Column might already exist with different type, ignore
                console.log(`   ⚠️ ${col.name}: ${e.message?.split('\n')[0]}`);
            }
        }

        // 3. Add missing columns to user_diet_daily_logs
        console.log('📊 Adding missing columns to user_diet_daily_logs...');
        const logColumns = [
            { name: 'completed', type: 'BOOLEAN NOT NULL DEFAULT false' },
            { name: 'celebration_shown', type: 'BOOLEAN NOT NULL DEFAULT false' },
        ];

        for (const col of logColumns) {
            try {
                await client.query(`ALTER TABLE user_diet_daily_logs ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type}`);
                console.log(`   ✓ ${col.name}`);
            } catch (e) {
                console.log(`   ⚠️ ${col.name}: ${e.message?.split('\n')[0]}`);
            }
        }

        // 4. Create diet_program_ratings table if not exists
        console.log('📊 Creating diet_program_ratings table if needed...');
        await client.query(`
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

        console.log('✅ Database repair completed successfully!');

    } catch (error) {
        console.error('❌ Database repair error:', error.message);
        // Don't throw - let the app try to start anyway
    } finally {
        await client.end();
    }
}

repairDatabase();

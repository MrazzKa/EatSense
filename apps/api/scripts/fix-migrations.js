/**
 * Script to fix failed Prisma migrations
 * Removes failed migration records from _prisma_migrations table
 * Run this before prisma migrate deploy
 */
const { PrismaClient } = require('@prisma/client');

async function fixFailedMigrations() {
    const prisma = new PrismaClient();

    try {
        console.log('🔧 Checking for failed migrations...');

        // Find failed migrations
        const failedMigrations = await prisma.$queryRaw`
      SELECT migration_name FROM _prisma_migrations 
      WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL
    `;

        if (failedMigrations.length === 0) {
            console.log('✅ No failed migrations found');
            return;
        }

        console.log(`⚠️ Found ${failedMigrations.length} failed migration(s):`, failedMigrations);

        // Delete failed migration records
        const result = await prisma.$executeRaw`
      DELETE FROM _prisma_migrations 
      WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL
    `;

        console.log(`✅ Removed ${result} failed migration record(s)`);

    } catch (error) {
        // Table might not exist on first run - that's OK
        if (error.code === 'P2010' || error.message?.includes('does not exist')) {
            console.log('ℹ️ No migration table yet - fresh database');
        } else {
            console.error('❌ Error fixing migrations:', error.message);
        }
    } finally {
        await prisma.$disconnect();
    }
}

fixFailedMigrations();

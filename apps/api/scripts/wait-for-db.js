/**
 * Wait for PostgreSQL to be reachable before running migrations/start.
 * Railway may start the API before the DB is ready; this script retries for up to 90s.
 */
const { PrismaClient } = require('@prisma/client');

const MAX_ATTEMPTS = 18;
const DELAY_MS = 5000;

async function waitForDb() {
  const prisma = new PrismaClient();
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await prisma.$connect();
      console.log(`✅ Database is reachable (attempt ${attempt}/${MAX_ATTEMPTS})`);
      await prisma.$disconnect();
      return true;
    } catch (e) {
      const msg = e.message || String(e);
      console.log(`   ⏳ Waiting for database... (${attempt}/${MAX_ATTEMPTS}) ${msg.split('\n')[0]}`);
      await prisma.$disconnect().catch(() => {});
      if (attempt === MAX_ATTEMPTS) {
        console.error('❌ Could not reach database after', MAX_ATTEMPTS, 'attempts');
        return false;
      }
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }
  return false;
}

waitForDb()
  .then((ok) => process.exit(ok ? 0 : 1))
  .catch((e) => {
    console.error('💥 wait-for-db error:', e);
    process.exit(1);
  });

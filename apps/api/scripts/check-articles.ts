import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
// Try multiple possible paths
const envPaths = [
  path.resolve(__dirname, '../.env'),
  path.resolve(process.cwd(), 'apps/api/.env'),
  path.resolve(process.cwd(), '.env'),
];

let envLoaded = false;
for (const envPath of envPaths) {
  try {
    const result = dotenv.config({ path: envPath });
    if (!result.error && process.env.DATABASE_URL) {
      console.log(`✅ Loaded .env from: ${envPath}`);
      console.log(`   DATABASE_URL: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`); // Hide password
      envLoaded = true;
      break;
    }
  } catch (error) {
    // Continue to next path
  }
}

if (!envLoaded || !process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  console.error('   Tried paths:', envPaths);
  console.error('   Current working directory:', process.cwd());
  console.error('   __dirname:', __dirname);
  console.error('\n💡 Tip: Make sure apps/api/.env exists with DATABASE_URL');
  console.error('   Example: DATABASE_URL=postgresql://postgres:password@localhost:5432/eatsense');
  process.exit(1);
}

const prisma = new PrismaClient();

async function checkArticles() {
  try {
    const locales = ['ru', 'en', 'kk'];
    const minRequired = 6;

    console.log('\n=== Articles Check ===\n');

    for (const locale of locales) {
      const total = await prisma.article.count({
        where: {
          locale,
          isActive: true,
          OR: [
            { isPublished: true },
            { isActive: true },
          ],
        },
      });

      const withImages = await prisma.article.count({
        where: {
          locale,
          isActive: true,
          OR: [
            { isPublished: true },
            { isActive: true },
          ],
          AND: [
            {
              OR: [
                { heroImageUrl: { not: null } },
                { coverUrl: { not: null } },
              ],
            },
          ],
        },
      });

      const status = total >= minRequired && withImages >= minRequired ? '✅' : '❌';
      
      console.log(`${status} ${locale.toUpperCase()}:`);
      console.log(`   Total articles: ${total} (required: ${minRequired})`);
      console.log(`   With images: ${withImages} (required: ${minRequired})`);
      
      if (total < minRequired) {
        console.log(`   ⚠️  Need ${minRequired - total} more articles`);
      }
      if (withImages < minRequired) {
        console.log(`   ⚠️  Need ${minRequired - withImages} more articles with images`);
      }
      console.log('');
    }

    console.log('====================\n');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkArticles();


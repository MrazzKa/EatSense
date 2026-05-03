/**
 * Seed country-only community groups and clean up legacy CUSTOM groups + duplicates.
 *
 * Run on Railway:
 *   npx ts-node apps/api/scripts/seed-country-groups.ts
 *
 * Idempotent — safe to run multiple times.
 */
import { PrismaClient, CommunityGroupType } from '@prisma/client';

const prisma = new PrismaClient();

interface CountrySeed {
  slug: string;
  name: string;
  country: string;
  description?: string;
}

// Curated short-list of countries. Order = display order in the app.
const COUNTRIES: CountrySeed[] = [
  { slug: 'country-kazakhstan', name: 'Kazakhstan', country: 'KZ', description: 'EatSense community in Kazakhstan' },
  { slug: 'country-russia', name: 'Russia', country: 'RU', description: 'EatSense community in Russia' },
  { slug: 'country-ukraine', name: 'Ukraine', country: 'UA', description: 'EatSense community in Ukraine' },
  { slug: 'country-uzbekistan', name: 'Uzbekistan', country: 'UZ', description: 'EatSense community in Uzbekistan' },
  { slug: 'country-germany', name: 'Germany', country: 'DE', description: 'EatSense community in Germany' },
  { slug: 'country-france', name: 'France', country: 'FR', description: 'EatSense community in France' },
  { slug: 'country-italy', name: 'Italy', country: 'IT', description: 'EatSense community in Italy' },
  { slug: 'country-spain', name: 'Spain', country: 'ES', description: 'EatSense community in Spain' },
  { slug: 'country-switzerland', name: 'Switzerland', country: 'CH', description: 'EatSense community in Switzerland' },
  { slug: 'country-uk', name: 'United Kingdom', country: 'GB', description: 'EatSense community in the UK' },
  { slug: 'country-usa', name: 'United States', country: 'US', description: 'EatSense community in the US' },
  { slug: 'country-uae', name: 'United Arab Emirates', country: 'AE', description: 'EatSense community in the UAE' },
  { slug: 'country-turkey', name: 'Turkey', country: 'TR', description: 'EatSense community in Turkey' },
];

async function main() {
  console.log('🌍 Seeding country groups…');

  // 1) Upsert country groups (idempotent on slug)
  let created = 0;
  let updated = 0;
  for (const c of COUNTRIES) {
    const existing = await prisma.communityGroup.findUnique({ where: { slug: c.slug } });
    if (existing) {
      await prisma.communityGroup.update({
        where: { slug: c.slug },
        data: {
          name: c.name,
          country: c.country,
          description: c.description,
          type: CommunityGroupType.COUNTRY,
          isSeeded: true,
        },
      });
      updated++;
    } else {
      await prisma.communityGroup.create({
        data: {
          slug: c.slug,
          name: c.name,
          country: c.country,
          description: c.description,
          type: CommunityGroupType.COUNTRY,
          isSeeded: true,
        },
      });
      created++;
    }
  }
  console.log(`   ✓ Country groups: ${created} created, ${updated} updated`);

  // 2) Find duplicate non-seeded groups by name (e.g. "Kazakhstan" twice).
  // Keep the seeded one (or the oldest if both unseeded), delete others — cascade removes memberships/posts.
  const allGroups = await prisma.communityGroup.findMany({
    orderBy: [{ isSeeded: 'desc' }, { createdAt: 'asc' }],
  });
  const byName = new Map<string, typeof allGroups>();
  for (const g of allGroups) {
    const key = g.name.trim().toLowerCase();
    const arr = byName.get(key) ?? [];
    arr.push(g);
    byName.set(key, arr);
  }

  let deletedDups = 0;
  for (const [name, group] of byName.entries()) {
    if (group.length <= 1) continue;
    // Keep the first (seeded or oldest), delete the rest
    const [keep, ...drop] = group;
    for (const g of drop) {
      await prisma.communityGroup.delete({ where: { id: g.id } });
      deletedDups++;
      console.log(`   ✗ Deleted duplicate "${name}" id=${g.id} (kept ${keep.id})`);
    }
  }
  console.log(`   ✓ Removed ${deletedDups} duplicate groups`);

  // 3) Delete all remaining CUSTOM groups created by users (city-clutter cleanup).
  // We keep only COUNTRY and CITY (legacy) seeded groups.
  const customDeleted = await prisma.communityGroup.deleteMany({
    where: { type: CommunityGroupType.CUSTOM },
  });
  console.log(`   ✓ Deleted ${customDeleted.count} CUSTOM groups`);

  // 4) Optionally drop legacy CITY groups that aren't seeded
  const cityDeleted = await prisma.communityGroup.deleteMany({
    where: { type: CommunityGroupType.CITY, isSeeded: false },
  });
  console.log(`   ✓ Deleted ${cityDeleted.count} legacy non-seeded CITY groups`);

  const total = await prisma.communityGroup.count();
  console.log(`\n✅ Done. Total groups in DB: ${total}\n`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// baseMemberCount is a display-only baseline so pilot groups don't look empty.
// Shown count = real memberships + baseMemberCount; real joins add on top.
const countries = [
  {
    name: 'Kazakhstan',
    slug: 'kazakhstan',
    country: 'KZ',
    description: 'Community for healthy eating enthusiasts in Kazakhstan',
    baseMemberCount: 84,
  },
  {
    name: 'Germany',
    slug: 'germany',
    country: 'DE',
    description: 'Community for healthy eating enthusiasts in Germany',
    baseMemberCount: 73,
  },
  {
    name: 'Switzerland',
    slug: 'switzerland',
    country: 'CH',
    description: 'Community for healthy eating enthusiasts in Switzerland',
    baseMemberCount: 96,
  },
  {
    name: 'France',
    slug: 'france',
    country: 'FR',
    description: 'Community for healthy eating enthusiasts in France',
    baseMemberCount: 68,
  },
];

async function main() {
  // 1. Remove old seeded CITY groups and their related data
  console.log('Cleaning up old CITY groups...');

  const oldCityGroups = await prisma.communityGroup.findMany({
    where: { type: 'CITY' as any, isSeeded: true },
    select: { id: true, name: true },
  });

  if (oldCityGroups.length > 0) {
    const oldGroupIds = oldCityGroups.map((g) => g.id);

    // Find all posts in these groups to clean up related data
    const oldPosts = await prisma.communityPost.findMany({
      where: { groupId: { in: oldGroupIds } },
      select: { id: true },
    });
    const oldPostIds = oldPosts.map((p) => p.id);

    if (oldPostIds.length > 0) {
      // Delete likes, comments, attendees, reports for these posts
      await prisma.communityLike.deleteMany({ where: { postId: { in: oldPostIds } } });
      await prisma.communityComment.deleteMany({ where: { postId: { in: oldPostIds } } });
      await prisma.eventAttendee.deleteMany({ where: { postId: { in: oldPostIds } } });
      await prisma.communityReport.deleteMany({ where: { postId: { in: oldPostIds } } });
      // Delete posts
      await prisma.communityPost.deleteMany({ where: { groupId: { in: oldGroupIds } } });
    }

    // Delete reports referencing comments in old groups (already deleted above)
    // Delete memberships
    await prisma.communityMembership.deleteMany({ where: { groupId: { in: oldGroupIds } } });

    // Clear cityGroupId references in user profiles
    await prisma.userProfile.updateMany({
      where: { cityGroupId: { in: oldGroupIds } },
      data: { cityGroupId: null },
    });

    // Delete the old CITY groups
    await prisma.communityGroup.deleteMany({
      where: { id: { in: oldGroupIds } },
    });

    console.log(`Removed ${oldCityGroups.length} old city groups: ${oldCityGroups.map((g) => g.name).join(', ')}`);
  } else {
    console.log('No old city groups to clean up.');
  }

  // 2. Seed new country groups
  console.log('Seeding community country groups...');

  for (const entry of countries) {
    await prisma.communityGroup.upsert({
      where: { slug: entry.slug },
      update: { baseMemberCount: entry.baseMemberCount },
      create: {
        name: entry.name,
        slug: entry.slug,
        description: entry.description,
        type: 'COUNTRY' as any,
        country: entry.country,
        isSeeded: true,
        baseMemberCount: entry.baseMemberCount,
      },
    });
  }

  console.log(`Seeded ${countries.length} country groups`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

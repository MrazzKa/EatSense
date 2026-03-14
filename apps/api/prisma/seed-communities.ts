import { PrismaClient, CommunityGroupType } from '@prisma/client';

const prisma = new PrismaClient();

const swissCities = [
  { name: 'Zürich', slug: 'zurich', city: 'Zürich', country: 'CH' },
  { name: 'Bern', slug: 'bern', city: 'Bern', country: 'CH' },
  { name: 'Basel', slug: 'basel', city: 'Basel', country: 'CH' },
  { name: 'Geneva', slug: 'geneva', city: 'Geneva', country: 'CH' },
  { name: 'Lausanne', slug: 'lausanne', city: 'Lausanne', country: 'CH' },
  { name: 'Lucerne', slug: 'lucerne', city: 'Lucerne', country: 'CH' },
  { name: 'St. Gallen', slug: 'st-gallen', city: 'St. Gallen', country: 'CH' },
  { name: 'Winterthur', slug: 'winterthur', city: 'Winterthur', country: 'CH' },
  { name: 'Lugano', slug: 'lugano', city: 'Lugano', country: 'CH' },
  { name: 'Biel/Bienne', slug: 'biel-bienne', city: 'Biel/Bienne', country: 'CH' },
];

const worldCities = [
  { name: 'London', slug: 'london', city: 'London', country: 'GB' },
  { name: 'Paris', slug: 'paris', city: 'Paris', country: 'FR' },
  { name: 'Berlin', slug: 'berlin', city: 'Berlin', country: 'DE' },
  { name: 'Munich', slug: 'munich', city: 'Munich', country: 'DE' },
  { name: 'Hamburg', slug: 'hamburg', city: 'Hamburg', country: 'DE' },
  { name: 'Amsterdam', slug: 'amsterdam', city: 'Amsterdam', country: 'NL' },
  { name: 'Vienna', slug: 'vienna', city: 'Vienna', country: 'AT' },
  { name: 'Milan', slug: 'milan', city: 'Milan', country: 'IT' },
  { name: 'Rome', slug: 'rome', city: 'Rome', country: 'IT' },
  { name: 'Madrid', slug: 'madrid', city: 'Madrid', country: 'ES' },
  { name: 'Barcelona', slug: 'barcelona', city: 'Barcelona', country: 'ES' },
  { name: 'Lisbon', slug: 'lisbon', city: 'Lisbon', country: 'PT' },
  { name: 'Prague', slug: 'prague', city: 'Prague', country: 'CZ' },
  { name: 'Warsaw', slug: 'warsaw', city: 'Warsaw', country: 'PL' },
  { name: 'Budapest', slug: 'budapest', city: 'Budapest', country: 'HU' },
  { name: 'Copenhagen', slug: 'copenhagen', city: 'Copenhagen', country: 'DK' },
  { name: 'Stockholm', slug: 'stockholm', city: 'Stockholm', country: 'SE' },
  { name: 'Oslo', slug: 'oslo', city: 'Oslo', country: 'NO' },
  { name: 'Helsinki', slug: 'helsinki', city: 'Helsinki', country: 'FI' },
  { name: 'Dublin', slug: 'dublin', city: 'Dublin', country: 'IE' },
  { name: 'Brussels', slug: 'brussels', city: 'Brussels', country: 'BE' },
  { name: 'Moscow', slug: 'moscow', city: 'Moscow', country: 'RU' },
  { name: 'Saint Petersburg', slug: 'saint-petersburg', city: 'Saint Petersburg', country: 'RU' },
  { name: 'Istanbul', slug: 'istanbul', city: 'Istanbul', country: 'TR' },
  { name: 'Dubai', slug: 'dubai', city: 'Dubai', country: 'AE' },
  { name: 'New York', slug: 'new-york', city: 'New York', country: 'US' },
  { name: 'Los Angeles', slug: 'los-angeles', city: 'Los Angeles', country: 'US' },
  { name: 'Chicago', slug: 'chicago', city: 'Chicago', country: 'US' },
  { name: 'San Francisco', slug: 'san-francisco', city: 'San Francisco', country: 'US' },
  { name: 'Toronto', slug: 'toronto', city: 'Toronto', country: 'CA' },
  { name: 'Vancouver', slug: 'vancouver', city: 'Vancouver', country: 'CA' },
  { name: 'Sydney', slug: 'sydney', city: 'Sydney', country: 'AU' },
  { name: 'Melbourne', slug: 'melbourne', city: 'Melbourne', country: 'AU' },
  { name: 'Tokyo', slug: 'tokyo', city: 'Tokyo', country: 'JP' },
  { name: 'Seoul', slug: 'seoul', city: 'Seoul', country: 'KR' },
  { name: 'Singapore', slug: 'singapore', city: 'Singapore', country: 'SG' },
  { name: 'Hong Kong', slug: 'hong-kong', city: 'Hong Kong', country: 'HK' },
  { name: 'Bangkok', slug: 'bangkok', city: 'Bangkok', country: 'TH' },
  { name: 'Mumbai', slug: 'mumbai', city: 'Mumbai', country: 'IN' },
  { name: 'Delhi', slug: 'delhi', city: 'Delhi', country: 'IN' },
  { name: 'São Paulo', slug: 'sao-paulo', city: 'São Paulo', country: 'BR' },
  { name: 'Mexico City', slug: 'mexico-city', city: 'Mexico City', country: 'MX' },
  { name: 'Buenos Aires', slug: 'buenos-aires', city: 'Buenos Aires', country: 'AR' },
  { name: 'Cairo', slug: 'cairo', city: 'Cairo', country: 'EG' },
  { name: 'Lagos', slug: 'lagos', city: 'Lagos', country: 'NG' },
  { name: 'Nairobi', slug: 'nairobi', city: 'Nairobi', country: 'KE' },
  { name: 'Cape Town', slug: 'cape-town', city: 'Cape Town', country: 'ZA' },
  { name: 'Almaty', slug: 'almaty', city: 'Almaty', country: 'KZ' },
  { name: 'Astana', slug: 'astana', city: 'Astana', country: 'KZ' },
  { name: 'Tashkent', slug: 'tashkent', city: 'Tashkent', country: 'UZ' },
];

async function main() {
  console.log('Seeding community city groups...');

  const allCities = [...swissCities, ...worldCities];

  for (const city of allCities) {
    await prisma.communityGroup.upsert({
      where: { slug: city.slug },
      update: {},
      create: {
        name: city.name,
        slug: city.slug,
        description: `Community for healthy eating enthusiasts in ${city.name}`,
        type: CommunityGroupType.CITY,
        city: city.city,
        country: city.country,
        isSeeded: true,
      },
    });
  }

  console.log(`Seeded ${allCities.length} city groups`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

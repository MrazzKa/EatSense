import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Core nutrients required for food analysis pipeline
 * 
 * IMPORTANT: These id/number mappings are from USDA FDC database:
 * - id = USDA nutrientId (used in our FoodNutrient table)
 * - number = USDA nutrient.number (legacy field, used in some API responses)
 * 
 * DO NOT change these mappings without checking USDA FDC documentation!
 */
async function main() {
  const nutrients = [
    // Core macros
    { id: 1003, number: '203', name: 'Protein', unitName: 'G', rank: 600 },
    { id: 1004, number: '204', name: 'Total lipid (fat)', unitName: 'G', rank: 800 },
    { id: 1005, number: '205', name: 'Carbohydrate, by difference', unitName: 'G', rank: 1110 },
    { id: 1008, number: '208', name: 'Energy', unitName: 'KCAL', rank: 300 },

    // Fiber (CRITICAL FIX: was incorrectly mapped to Sugars)
    { id: 1079, number: '291', name: 'Fiber, total dietary', unitName: 'G', rank: 1200 },

    // Sugars (CRITICAL FIX: was incorrectly mapped to Sodium)
    { id: 2000, number: '269', name: 'Sugars, total including NLEA', unitName: 'G', rank: 1510 },

    // Sodium (CRITICAL FIX: was missing)
    { id: 1093, number: '307', name: 'Sodium, Na', unitName: 'MG', rank: 1500 },

    // Saturated fat (was missing)
    { id: 1258, number: '606', name: 'Fatty acids, total saturated', unitName: 'G', rank: 1000 },

    // Energy alternatives (kJ fallback)
    { id: 2047, number: '957', name: 'Energy (Atwater General Factors)', unitName: 'KCAL', rank: null },
    { id: 2048, number: '958', name: 'Energy (Atwater Specific Factors)', unitName: 'KCAL', rank: null },

    // Additional useful nutrients
    { id: 1009, number: '211', name: 'Starch', unitName: 'G', rank: 1400 },
    { id: 1057, number: '262', name: 'Caffeine', unitName: 'MG', rank: 1800 },
    { id: 1018, number: '221', name: 'Alcohol, ethyl', unitName: 'G', rank: 1900 },
    { id: 1253, number: '601', name: 'Cholesterol', unitName: 'MG', rank: 950 },
    { id: 1106, number: '318', name: 'Vitamin A, IU', unitName: 'IU', rank: 2000 },
    { id: 1162, number: '401', name: 'Vitamin C, total ascorbic acid', unitName: 'MG', rank: 2100 },
  ];

  console.log('Seeding core nutrients...');

  for (const nutrient of nutrients) {
    // Use raw SQL with upsert to avoid conflicts
    const numberVal = nutrient.number ? `'${nutrient.number.replace(/'/g, "''")}'` : 'NULL';
    const rankVal = nutrient.rank !== null && nutrient.rank !== undefined ? nutrient.rank : 'NULL';

    await prisma.$executeRawUnsafe(`
      INSERT INTO nutrients (id, number, name, unit_name, rank)
      VALUES (${nutrient.id}, ${numberVal}, '${nutrient.name.replace(/'/g, "''")}', '${nutrient.unitName}', ${rankVal})
      ON CONFLICT (id) 
      DO UPDATE SET 
        number = EXCLUDED.number,
        name = EXCLUDED.name,
        unit_name = EXCLUDED.unit_name,
        rank = EXCLUDED.rank
    `);
  }

  console.log(`✓ Seeded ${nutrients.length} nutrients`);
  console.log('Core nutrients seeded: 1003 (Protein), 1004 (Fat), 1005 (Carbs), 1008 (Energy), 1079 (Fiber), 2000 (Sugars), 1093 (Sodium), 1258 (SatFat)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

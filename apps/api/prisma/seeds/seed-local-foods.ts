import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function seedLocalFoods() {
  console.log('🌱 Seeding local foods...');

  // Get the directory where this script is located
  const scriptDir = __dirname;
  const jsonPath = path.join(scriptDir, 'top-100-foods.json');
  
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ JSON file not found at: ${jsonPath}`);
    process.exit(1);
  }
  
  const foodsData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  for (const food of foodsData) {
    await prisma.localFood.upsert({
      where: { name: food.name },
      update: {
        nameEn: food.nameEn,
        nameRu: food.nameRu,
        nameKk: food.nameKk,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        fiber: food.fiber,
        sugars: food.sugars,
        satFat: food.satFat,
        category: food.category,
        popularity: food.popularity,
      },
      create: {
        name: food.name,
        nameEn: food.nameEn,
        nameRu: food.nameRu,
        nameKk: food.nameKk,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        fiber: food.fiber,
        sugars: food.sugars,
        satFat: food.satFat,
        category: food.category,
        popularity: food.popularity,
      },
    });
  }

  console.log(`✅ Seeded ${foodsData.length} local foods`);
}

seedLocalFoods()
  .catch((e) => {
    console.error('❌ Error seeding local foods:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


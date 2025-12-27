/**
 * Seed essential USDA nutrients into the Nutrient table.
 * This is required for HybridService to correctly map and save food nutrients.
 *
 * Run: npx prisma db seed
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Essential USDA Nutrient IDs
 * Source: https://fdc.nal.usda.gov/api-guide.html
 */
const ESSENTIAL_NUTRIENTS = [
    // Macronutrients
    { id: 1003, name: 'Protein', unit: 'g', rank: 600 },
    { id: 1004, name: 'Total lipid (fat)', unit: 'g', rank: 800 },
    { id: 1005, name: 'Carbohydrate, by difference', unit: 'g', rank: 1110 },
    { id: 1008, name: 'Energy', unit: 'kcal', rank: 300 },

    // Sugars and Fiber
    { id: 1079, name: 'Fiber, total dietary', unit: 'g', rank: 1200 },
    { id: 2000, name: 'Sugars, total including NLEA', unit: 'g', rank: 1510 },
    { id: 2047, name: 'Energy (Atwater General Factors)', unit: 'kcal', rank: 290 },
    { id: 2048, name: 'Energy (Atwater Specific Factors)', unit: 'kcal', rank: 295 },

    // Fats breakdown
    { id: 1253, name: 'Cholesterol', unit: 'mg', rank: 15700 },
    { id: 1257, name: 'Fatty acids, total trans', unit: 'g', rank: 15400 },
    { id: 1258, name: 'Fatty acids, total saturated', unit: 'g', rank: 9700 },

    // Minerals
    { id: 1087, name: 'Calcium, Ca', unit: 'mg', rank: 5300 },
    { id: 1089, name: 'Iron, Fe', unit: 'mg', rank: 5400 },
    { id: 1090, name: 'Magnesium, Mg', unit: 'mg', rank: 5500 },
    { id: 1091, name: 'Phosphorus, P', unit: 'mg', rank: 5600 },
    { id: 1092, name: 'Potassium, K', unit: 'mg', rank: 5700 },
    { id: 1093, name: 'Sodium, Na', unit: 'mg', rank: 5800 },
    { id: 1095, name: 'Zinc, Zn', unit: 'mg', rank: 5900 },
    { id: 1098, name: 'Copper, Cu', unit: 'mg', rank: 6000 },
    { id: 1101, name: 'Manganese, Mn', unit: 'mg', rank: 6100 },
    { id: 1103, name: 'Selenium, Se', unit: 'µg', rank: 6200 },

    // Vitamins
    { id: 1104, name: 'Vitamin A, IU', unit: 'IU', rank: 7500 },
    { id: 1106, name: 'Vitamin A, RAE', unit: 'µg', rank: 7420 },
    { id: 1107, name: 'Carotene, beta', unit: 'µg', rank: 7440 },
    { id: 1108, name: 'Carotene, alpha', unit: 'µg', rank: 7450 },
    { id: 1109, name: 'Vitamin E (alpha-tocopherol)', unit: 'mg', rank: 7905 },
    { id: 1110, name: 'Vitamin D (D2 + D3)', unit: 'µg', rank: 8710 },
    { id: 1162, name: 'Vitamin C, total ascorbic acid', unit: 'mg', rank: 6300 },
    { id: 1165, name: 'Thiamin', unit: 'mg', rank: 6400 },
    { id: 1166, name: 'Riboflavin', unit: 'mg', rank: 6500 },
    { id: 1167, name: 'Niacin', unit: 'mg', rank: 6600 },
    { id: 1170, name: 'Pantothenic acid', unit: 'mg', rank: 6700 },
    { id: 1175, name: 'Vitamin B-6', unit: 'mg', rank: 6800 },
    { id: 1176, name: 'Folate, total', unit: 'µg', rank: 6900 },
    { id: 1177, name: 'Folic acid', unit: 'µg', rank: 6925 },
    { id: 1178, name: 'Vitamin B-12', unit: 'µg', rank: 7300 },
    { id: 1183, name: 'Vitamin K (phylloquinone)', unit: 'µg', rank: 8800 },
    { id: 1184, name: 'Vitamin K (Dihydrophylloquinone)', unit: 'µg', rank: 8850 },
    { id: 1185, name: 'Vitamin K (menaquinone-4)', unit: 'µg', rank: 8900 },

    // Amino acids  
    { id: 1210, name: 'Tryptophan', unit: 'g', rank: 16300 },
    { id: 1211, name: 'Threonine', unit: 'g', rank: 16400 },
    { id: 1212, name: 'Isoleucine', unit: 'g', rank: 16500 },
    { id: 1213, name: 'Leucine', unit: 'g', rank: 16600 },
    { id: 1214, name: 'Lysine', unit: 'g', rank: 16700 },
    { id: 1215, name: 'Methionine', unit: 'g', rank: 16800 },
    { id: 1216, name: 'Cystine', unit: 'g', rank: 16900 },
    { id: 1217, name: 'Phenylalanine', unit: 'g', rank: 17000 },
    { id: 1218, name: 'Tyrosine', unit: 'g', rank: 17100 },
    { id: 1219, name: 'Valine', unit: 'g', rank: 17200 },
    { id: 1220, name: 'Arginine', unit: 'g', rank: 17300 },
    { id: 1221, name: 'Histidine', unit: 'g', rank: 17400 },
    { id: 1222, name: 'Alanine', unit: 'g', rank: 17500 },
    { id: 1223, name: 'Aspartic acid', unit: 'g', rank: 17600 },
    { id: 1224, name: 'Glutamic acid', unit: 'g', rank: 17700 },
    { id: 1225, name: 'Glycine', unit: 'g', rank: 17800 },
    { id: 1226, name: 'Proline', unit: 'g', rank: 17900 },
    { id: 1227, name: 'Serine', unit: 'g', rank: 18000 },

    // Lipids
    { id: 1235, name: 'Added sugars', unit: 'g', rank: 1540 },
    { id: 1261, name: 'Fatty acids, total monounsaturated', unit: 'g', rank: 11400 },
    { id: 1262, name: 'Fatty acids, total polyunsaturated', unit: 'g', rank: 11300 },
    { id: 1263, name: 'Fatty acids, total trans-monoenoic', unit: 'g', rank: 15410 },
    { id: 1264, name: 'Fatty acids, total trans-polyenoic', unit: 'g', rank: 15420 },

    // Other
    { id: 1002, name: 'Nitrogen', unit: 'g', rank: 500 },
    { id: 1007, name: 'Ash', unit: 'g', rank: 1000 },
    { id: 1009, name: 'Starch', unit: 'g', rank: 1100 },
    { id: 1010, name: 'Sucrose', unit: 'g', rank: 1600 },
    { id: 1011, name: 'Glucose', unit: 'g', rank: 1700 },
    { id: 1012, name: 'Fructose', unit: 'g', rank: 1800 },
    { id: 1013, name: 'Lactose', unit: 'g', rank: 1900 },
    { id: 1014, name: 'Maltose', unit: 'g', rank: 2000 },
    { id: 1050, name: 'Water', unit: 'g', rank: 100 },
    { id: 1051, name: 'Water', unit: 'g', rank: 100 },
    { id: 1062, name: 'Energy', unit: 'kJ', rank: 400 },
    { id: 1063, name: 'Sugars, total', unit: 'g', rank: 1500 },
    { id: 1075, name: 'Galactose', unit: 'g', rank: 1850 },
    { id: 1082, name: 'Fiber, soluble', unit: 'g', rank: 1240 },
    { id: 1084, name: 'Fiber, insoluble', unit: 'g', rank: 1260 },
    { id: 1085, name: 'Total fat (NLEA)', unit: 'g', rank: 850 },
    { id: 1116, name: 'Vitamin D2 (ergocalciferol)', unit: 'µg', rank: 8750 },
    { id: 1117, name: 'Vitamin D3 (cholecalciferol)', unit: 'µg', rank: 8760 },
    { id: 1120, name: 'Cryptoxanthin, beta', unit: 'µg', rank: 7460 },
    { id: 1122, name: 'Lycopene', unit: 'µg', rank: 7530 },
    { id: 1123, name: 'Lutein + zeaxanthin', unit: 'µg', rank: 7560 },
    { id: 1125, name: 'Tocopherol, beta', unit: 'mg', rank: 7920 },
    { id: 1126, name: 'Tocopherol, gamma', unit: 'mg', rank: 7940 },
    { id: 1127, name: 'Tocopherol, delta', unit: 'mg', rank: 7960 },
    { id: 1128, name: 'Tocotrienol, alpha', unit: 'mg', rank: 7980 },
    { id: 1129, name: 'Tocotrienol, beta', unit: 'mg', rank: 8000 },
    { id: 1130, name: 'Tocotrienol, gamma', unit: 'mg', rank: 8020 },
    { id: 1131, name: 'Tocotrienol, delta', unit: 'mg', rank: 8040 },
    { id: 1188, name: 'Vitamin B-12, added', unit: 'µg', rank: 7340 },
    { id: 1191, name: 'Folate, food', unit: 'µg', rank: 6950 },
    { id: 1192, name: 'Folate, DFE', unit: 'µg', rank: 7000 },
    { id: 1265, name: '10:0', unit: 'g', rank: 9800 },
    { id: 1266, name: '12:0', unit: 'g', rank: 9900 },
    { id: 1267, name: '14:0', unit: 'g', rank: 10000 },
    { id: 1268, name: '16:0', unit: 'g', rank: 10100 },
    { id: 1269, name: '18:0', unit: 'g', rank: 10200 },
    { id: 1270, name: '18:1', unit: 'g', rank: 11500 },
    { id: 1271, name: '18:2', unit: 'g', rank: 13100 },
    { id: 1272, name: '18:3', unit: 'g', rank: 13200 },
    { id: 1273, name: '20:4', unit: 'g', rank: 13600 },
    { id: 1274, name: '22:6 n-3 (DHA)', unit: 'g', rank: 14700 },
    { id: 1275, name: '22:0', unit: 'g', rank: 10500 },
    { id: 1276, name: '14:1', unit: 'g', rank: 11100 },
    { id: 1277, name: '16:1', unit: 'g', rank: 11200 },
    { id: 1278, name: '18:4', unit: 'g', rank: 13300 },
    { id: 1279, name: '20:1', unit: 'g', rank: 12200 },
    { id: 1280, name: '20:5 n-3 (EPA)', unit: 'g', rank: 14500 },
    { id: 1292, name: '4:0', unit: 'g', rank: 9500 },
    { id: 1293, name: '6:0', unit: 'g', rank: 9600 },
    { id: 1299, name: '8:0', unit: 'g', rank: 9700 },
    { id: 1300, name: '20:0', unit: 'g', rank: 10400 },
    { id: 1313, name: '24:0', unit: 'g', rank: 10600 },
    { id: 1314, name: '24:1 c', unit: 'g', rank: 12100 },
    { id: 1315, name: '20:2 n-6 c,c', unit: 'g', rank: 13400 },
    { id: 1316, name: '16:1 c', unit: 'g', rank: 11250 },
    { id: 1317, name: '18:1 c', unit: 'g', rank: 11600 },
    { id: 1321, name: '18:2 n-6 c,c', unit: 'g', rank: 13150 },
    { id: 1323, name: '15:0', unit: 'g', rank: 10050 },
    { id: 1325, name: '17:0', unit: 'g', rank: 10150 },
    { id: 1333, name: '20:3', unit: 'g', rank: 13500 },
];

async function seedNutrients() {
    console.log('🌱 Seeding essential USDA nutrients...');

    let created = 0;
    let skipped = 0;

    for (const nutrient of ESSENTIAL_NUTRIENTS) {
        try {
            await prisma.nutrient.upsert({
                where: { id: nutrient.id },
                update: {
                    name: nutrient.name,
                    unitName: nutrient.unit,
                    rank: nutrient.rank,
                },
                create: {
                    id: nutrient.id,
                    name: nutrient.name,
                    unitName: nutrient.unit,
                    rank: nutrient.rank,
                },
            });
            created++;
        } catch (error) {
            console.error(`Failed to upsert nutrient ${nutrient.id}:`, error);
            skipped++;
        }
    }

    console.log(`✅ Nutrients seeded: ${created} created/updated, ${skipped} skipped`);
    console.log(`📊 Total nutrients in DB: ${await prisma.nutrient.count()}`);
}

export { seedNutrients };

// Run if called directly
if (require.main === module) {
    seedNutrients()
        .catch((e) => {
            console.error(e);
            process.exit(1);
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}

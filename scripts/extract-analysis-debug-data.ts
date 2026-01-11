/**
 * Скрипт для извлечения всех debug данных анализа
 * 
 * Использование:
 *   npx ts-node scripts/extract-analysis-debug-data.ts <analysisId> [outputFile]
 * 
 * Пример:
 *   npx ts-node scripts/extract-analysis-debug-data.ts cmk9g66ly0005vhpxqpjegsea case-a-data.json
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface AnalysisDebugData {
  // 1. POST /food/analyze response
  analyzeResponse: {
    analysisId: string;
    status: string;
    message: string;
  };

  // 2. GET /food/analysis/:id/status response (when completed)
  statusResponse: {
    status: string;
    analysisId: string;
  };

  // 3. GET /food/analysis/:id/result response
  resultResponse: any;

  // 4. GET /meals response (meal by id)
  mealResponse: any;

  // 5. Vision raw JSON (from debug.componentsRaw)
  visionRawJson: any;

  // 6. Nutrition debug records (from logs or debug.components)
  nutritionDebugRecords: any[];

  // 7. Configs/versions
  configs: {
    timeouts: {
      vision: string;
      usda: string;
      openfoodfacts: string;
    };
    suspiciousRules: any;
    portionTable: any;
  };
}

async function extractAnalysisData(analysisId: string): Promise<AnalysisDebugData> {
  console.log(`[Extract] Starting extraction for analysisId: ${analysisId}`);

  // 1. Get Analysis record
  const analysis = await prisma.analysis.findUnique({
    where: { id: analysisId },
    include: {
      results: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!analysis) {
    throw new Error(`Analysis ${analysisId} not found`);
  }

  const result = analysis.results[0];
  if (!result) {
    throw new Error(`AnalysisResult for ${analysisId} not found`);
  }

  const resultData = result.data as any;

  // 2. Get Meal if exists
  const mealId = resultData?.autoSave?.mealId;
  let mealResponse = null;
  if (mealId) {
    const meal = await prisma.meal.findUnique({
      where: { id: mealId },
      include: {
        items: true,
      },
    });

    if (meal) {
      // Format as GET /meals response
      const totals = meal.items.reduce(
        (acc, item) => {
          acc.calories += item.calories || 0;
          acc.protein += item.protein || 0;
          acc.carbs += item.carbs || 0;
          acc.fat += item.fat || 0;
          return acc;
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      mealResponse = {
        ...meal,
        imageUrl: meal.imageUri || null,
        totalCalories: totals.calories,
        totalProtein: totals.protein,
        totalCarbs: totals.carbs,
        totalFat: totals.fat,
        ingredients: meal.items.map(item => ({
          id: item.id,
          name: item.name || 'Unknown',
          calories: item.calories || 0,
          protein: item.protein || 0,
          carbs: item.carbs || 0,
          fat: item.fat || 0,
          weight: item.weight || 0,
          hasNutrition: true,
        })),
      };
    }
  }

  // 3. Extract Vision raw JSON from debug
  const visionRawJson = resultData?.debug?.componentsRaw || null;

  // 4. Extract Nutrition debug records from debug.components
  const nutritionDebugRecords: any[] = [];
  if (resultData?.debug?.components) {
    for (const component of resultData.debug.components) {
      if (component.type === 'matched' && component.provider) {
        nutritionDebugRecords.push({
          query: component.vision?.name || 'unknown',
          visionComponent: component.vision,
          provider: component.provider,
          providerResult: component.providerResult || null,
          confidence: component.confidence,
          flags: {
            suspicious: component.suspicious || false,
            fallbackToVision: component.fallback || false,
            mismatchCalories: component.mismatchCalories || false,
          },
        });
      }
    }
  }

  // 5. Build analyze response (POST /food/analyze format)
  const analyzeResponse = {
    analysisId: analysis.id,
    status: 'PENDING',
    message: 'Analysis started. Results will be available shortly.',
  };

  // 6. Build status response (GET /food/analysis/:id/status format)
  const statusResponse = {
    status: analysis.status.toLowerCase(),
    analysisId: analysis.id,
  };

  // 7. Build result response (GET /food/analysis/:id/result format)
  // This is already in resultData, but we need to format it properly
  // The resultData contains AnalysisData format, which needs to be mapped to frontend format
  // For now, return raw resultData - it contains all the data
  const resultResponse = {
    status: analysis.status,
    analysisId: analysis.id,
    data: resultData,
    error: analysis.error || null,
  };

  // 8. Configs
  const configs = {
    timeouts: {
      vision: process.env.VISION_API_TIMEOUT_MS || '120000',
      usda: 'unknown', // Not explicitly set in code
      openfoodfacts: '8000', // Hardcoded in open-food-facts.provider.ts:112
    },
    suspiciousRules: {
      note: 'Rules are in nutrition-orchestrator.service.ts:104-382 and analysis-validator.service.ts:76-180',
      location: 'apps/api/src/analysis/providers/nutrition-orchestrator.service.ts',
    },
    portionTable: {
      note: 'Table is in Vision prompt (vision.service.ts:494-530)',
      location: 'apps/api/src/analysis/vision.service.ts',
    },
  };

  return {
    analyzeResponse,
    statusResponse,
    resultResponse,
    mealResponse,
    visionRawJson,
    nutritionDebugRecords,
    configs,
  };
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: npx ts-node scripts/extract-analysis-debug-data.ts <analysisId> [outputFile]');
    process.exit(1);
  }

  const analysisId = args[0];
  const outputFile = args[1] || `analysis-debug-${analysisId}.json`;

  try {
    console.log(`[Extract] Extracting data for analysisId: ${analysisId}`);
    const data = await extractAnalysisData(analysisId);
    
    const outputPath = path.resolve(outputFile);
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    
    console.log(`[Extract] Data extracted successfully to: ${outputPath}`);
    console.log(`[Extract] Summary:`);
    console.log(`  - Analysis ID: ${data.analyzeResponse.analysisId}`);
    console.log(`  - Status: ${data.statusResponse.status}`);
    console.log(`  - Items count: ${data.resultResponse?.data?.items?.length || 0}`);
    console.log(`  - Meal ID: ${data.mealResponse?.id || 'N/A'}`);
    console.log(`  - Vision raw JSON: ${data.visionRawJson ? 'Available' : 'Not available'}`);
    console.log(`  - Nutrition debug records: ${data.nutritionDebugRecords.length}`);
  } catch (error: any) {
    console.error(`[Extract] Error:`, error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

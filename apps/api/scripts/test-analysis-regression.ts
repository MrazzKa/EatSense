/**
 * STEP 9: Analysis Regression Test Script
 * Tests key pipeline quality metrics
 * 
 * Usage: npx ts-node scripts/test-analysis-regression.ts [analysisId1] [analysisId2]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RegressionTestResult {
    analysisId: string;
    tests: {
        name: string;
        passed: boolean;
        details?: string;
    }[];
}

async function testAnalysis(analysisId: string): Promise<RegressionTestResult> {
    const tests: RegressionTestResult['tests'] = [];

    const analysis = await prisma.analysis.findUnique({
        where: { id: analysisId },
        include: { results: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    if (!analysis || !analysis.results[0]) {
        return { analysisId, tests: [{ name: 'analysis_exists', passed: false, details: 'Not found' }] };
    }

    const data = analysis.results[0].data as any;

    // Test 1: dishName no "and more"
    const dishName = data.dishNameLocalized || data.originalDishName || data.dishName || '';
    const hasAndMore = /and more|и другое|және басқалары/i.test(dishName);
    tests.push({
        name: 'dishName_no_and_more',
        passed: !hasAndMore,
        details: hasAndMore ? `Contains "and more": ${dishName}` : `OK: ${dishName}`,
    });

    // Test 2: Weights have provenance (check debug data if available)
    const debug = data.debug as any;
    const hasWeightProvenance = debug?.components?.some((c: any) => c.type === 'weight_provenance');
    tests.push({
        name: 'weight_provenance_tracked',
        passed: !!hasWeightProvenance || !debug, // Pass if debug not enabled
        details: hasWeightProvenance ? 'Provenance tracked' : 'No debug data or missing provenance',
    });

    // Test 3: HealthScore has factorsDetailed
    const healthScore = data.healthScore;
    const hasFactorsDetailed = !!healthScore?.factorsDetailed;
    tests.push({
        name: 'healthscore_factors_detailed',
        passed: hasFactorsDetailed,
        details: hasFactorsDetailed ? 'Has factorsDetailed' : 'Missing factorsDetailed',
    });

    // Test 4: No sugars=50 without isUnknown flag
    const sugarsFactor = healthScore?.factorsDetailed?.sugars;
    const isSugarsSafe = !sugarsFactor || sugarsFactor.value !== 50 || sugarsFactor.isUnknown === true;
    tests.push({
        name: 'healthscore_sugars_not_hardcoded_50',
        passed: isSugarsSafe,
        details: isSugarsSafe ? 'OK' : 'sugars=50 without isUnknown flag',
    });

    // Test 5: Items have source info
    const items = data.items || [];
    const allItemsHaveSource = items.every((item: any) => item.source || item.provider || item.sourceInfo);
    tests.push({
        name: 'items_have_source',
        passed: allItemsHaveSource || items.length === 0,
        details: allItemsHaveSource ? `${items.length} items with source` : 'Some items missing source',
    });

    // Test 6: Total calories > 0 for non-empty analyses
    const totalCalories = data.total?.calories || 0;
    tests.push({
        name: 'total_calories_positive',
        passed: items.length === 0 || totalCalories > 0,
        details: `Total: ${totalCalories} kcal`,
    });

    return { analysisId, tests };
}

async function main() {
    const analysisIds = process.argv.slice(2);

    if (analysisIds.length === 0) {
        console.log('Usage: npx ts-node scripts/test-analysis-regression.ts [analysisId1] [analysisId2]');
        console.log('\nRunning with last 2 completed analyses...');

        const recentAnalyses = await prisma.analysis.findMany({
            where: { status: 'COMPLETED' },
            orderBy: { createdAt: 'desc' },
            take: 2,
            select: { id: true },
        });

        if (recentAnalyses.length === 0) {
            console.log('No completed analyses found.');
            process.exit(0);
        }

        analysisIds.push(...recentAnalyses.map(a => a.id));
    }

    console.log('\n=== REGRESSION TESTS ===\n');

    let allPassed = true;

    for (const analysisId of analysisIds) {
        const result = await testAnalysis(analysisId);
        console.log(`Analysis: ${result.analysisId}`);

        for (const test of result.tests) {
            const status = test.passed ? '✓' : '✗';
            console.log(`  ${status} ${test.name}: ${test.details || ''}`);
            if (!test.passed) allPassed = false;
        }
        console.log('');
    }

    console.log(allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED');
    process.exit(allPassed ? 0 : 1);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

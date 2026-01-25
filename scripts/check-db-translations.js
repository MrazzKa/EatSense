/**
 * Check translations for Diet Programs and Lifestyle Programs from database
 * Checks all required locales: en, ru, kk, fr
 * 
 * For Diet Programs: checks name, subtitle, description, shortDescription, 
 *   tips, howItWorks, sampleDay, notFor, dailyTracker
 * 
 * For Lifestyle Programs: checks name, subtitle, description, shortDescription,
 *   rules.mantra, rules.philosophy, rules.tagline, rules.dailyInspiration,
 *   rules.sampleDay, dailyTracker
 * 
 * Requires: Database connection (Prisma)
 * 
 * Usage:
 *   cd apps/api
 *   node ../../scripts/check-db-translations.js
 * 
 * Or from root:
 *   pnpm run i18n:check-db
 * 
 * To seed data in Railway:
 *   cd apps/api
 *   DATABASE_URL=<railway_db_url> ts-node -r tsconfig-paths/register prisma/seeds/seed-diets.ts
 *   DATABASE_URL=<railway_db_url> ts-node -r tsconfig-paths/register prisma/seeds/seed-lifestyles.ts
 * 
 * Verbose mode (shows detailed field-by-field checking):
 *   VERBOSE=true pnpm run i18n:check-db
 */

// FIX: Use correct path to Prisma client
// Script can be run from root (pnpm run i18n:check-db) or from apps/api
const path = require('path');
const fs = require('fs');

let PrismaClient;
let prisma;

// Try multiple paths to find Prisma client
const possiblePaths = [
    path.join(__dirname, '../apps/api/node_modules/@prisma/client'), // From root
    path.join(__dirname, '../../apps/api/node_modules/@prisma/client'), // From scripts/
    path.join(process.cwd(), 'node_modules/@prisma/client'), // From apps/api
    '@prisma/client', // Global require
];

for (const prismaPath of possiblePaths) {
    try {
        if (prismaPath === '@prisma/client') {
            PrismaClient = require(prismaPath).PrismaClient;
        } else if (fs.existsSync(prismaPath)) {
            PrismaClient = require(prismaPath).PrismaClient;
        }
        if (PrismaClient) {
            prisma = new PrismaClient();
            break;
        }
    } catch (e) {
        // Try next path
        continue;
    }
}

if (!prisma) {
    console.error('❌ Cannot find PrismaClient. Make sure you:');
    console.error('   1. Have @prisma/client installed in apps/api');
    console.error('   2. Run: cd apps/api && pnpm install');
    console.error('   3. Then run: pnpm run i18n:check-db (from root)');
    console.error('   Or: cd apps/api && node ../../scripts/check-db-translations.js');
    process.exit(1);
}

const REQUIRED_LOCALES = ['en', 'ru', 'kk', 'fr'];

// Enable verbose mode via VERBOSE env var
const VERBOSE = process.env.VERBOSE === 'true';

// Helper: Check if JSON field has all required locales
function checkJsonField(field, fieldName, programId, programSlug, stats = null) {
    const issues = [];
    
    if (!field) {
        if (stats) {
            stats.optionalFieldsSkipped = (stats.optionalFieldsSkipped || 0) + 1;
        }
        return issues; // Optional field
    }
    
    if (typeof field === 'string') {
        // String value - should be JSON object with translations
        issues.push({
            type: 'string_instead_of_json',
            field: fieldName,
            programId,
            programSlug,
            message: `Field "${fieldName}" is a string instead of JSON object with translations`,
        });
        return issues;
    }
    
    if (typeof field !== 'object' || Array.isArray(field)) {
        if (stats) {
            stats.nonTranslationFields = (stats.nonTranslationFields || 0) + 1;
        }
        return issues; // Not a translation object
    }
    
    // Track which locales are present
    const presentLocales = [];
    const missingLocales = [];
    
    // Check each required locale
    REQUIRED_LOCALES.forEach(locale => {
        if (!field[locale] || field[locale] === '') {
            missingLocales.push(locale);
            issues.push({
                type: 'missing_locale',
                field: fieldName,
                locale,
                programId,
                programSlug,
                message: `Missing translation for "${fieldName}" in locale "${locale}"`,
            });
        } else if (typeof field[locale] === 'string' && field[locale].trim() === '') {
            missingLocales.push(locale);
            issues.push({
                type: 'empty_translation',
                field: fieldName,
                locale,
                programId,
                programSlug,
                message: `Empty translation for "${fieldName}" in locale "${locale}"`,
            });
        } else {
            presentLocales.push(locale);
        }
    });
    
    if (stats) {
        stats.fieldsChecked = (stats.fieldsChecked || 0) + 1;
        if (presentLocales.length === REQUIRED_LOCALES.length) {
            stats.fieldsComplete = (stats.fieldsComplete || 0) + 1;
        }
        if (missingLocales.length > 0) {
            stats.fieldsIncomplete = (stats.fieldsIncomplete || 0) + 1;
        }
    }
    
    if (VERBOSE && presentLocales.length === REQUIRED_LOCALES.length) {
        console.log(`   ✓ ${fieldName}: all locales present`);
    }
    
    return issues;
}

// Check a single diet program (non-lifestyle)
function checkDietProgram(diet, stats = null) {
    const issues = [];
    
    // Check all translatable fields
    // name is REQUIRED, others are optional
    const requiredFields = ['name'];
    const optionalFields = [
        'subtitle',
        'description',
        'shortDescription',
        'tips',
        'howItWorks',
        'sampleDay',
        'notFor',
    ];
    
    if (VERBOSE) {
        console.log(`\n   Checking diet: ${diet.slug}`);
    }
    
    // Check required fields (must exist and have all locales)
    requiredFields.forEach(fieldName => {
        if (!diet[fieldName]) {
            issues.push({
                type: 'missing_required_field',
                field: fieldName,
                programId: diet.id,
                programSlug: diet.slug,
                message: `Required field "${fieldName}" is missing`,
            });
        } else {
            const fieldIssues = checkJsonField(
                diet[fieldName],
                fieldName,
                diet.id,
                diet.slug,
                stats
            );
            issues.push(...fieldIssues);
        }
    });
    
    // Check optional fields (if they exist, must have all locales)
    optionalFields.forEach(fieldName => {
        const fieldIssues = checkJsonField(
            diet[fieldName],
            fieldName,
            diet.id,
            diet.slug,
            stats
        );
        issues.push(...fieldIssues);
    });
    
    // Check dailyTracker (array of objects with label field)
    if (diet.dailyTracker && Array.isArray(diet.dailyTracker)) {
        if (stats) {
            stats.dailyTrackersChecked = (stats.dailyTrackersChecked || 0) + diet.dailyTracker.length;
        }
        diet.dailyTracker.forEach((item, index) => {
            if (item.label) {
                const labelIssues = checkJsonField(
                    item.label,
                    `dailyTracker[${index}].label`,
                    diet.id,
                    diet.slug,
                    stats
                );
                issues.push(...labelIssues);
            }
        });
    }
    
    return issues;
}

// Check a single lifestyle program
function checkLifestyleProgram(lifestyle, stats = null) {
    const issues = [];
    
    // Check standard translatable fields
    // name is REQUIRED, others are optional
    const requiredFields = ['name'];
    const optionalFields = [
        'subtitle',
        'description',
        'shortDescription',
    ];
    
    if (VERBOSE) {
        console.log(`\n   Checking lifestyle: ${lifestyle.slug}`);
    }
    
    // Check required fields (must exist and have all locales)
    requiredFields.forEach(fieldName => {
        if (!lifestyle[fieldName]) {
            issues.push({
                type: 'missing_required_field',
                field: fieldName,
                programId: lifestyle.id,
                programSlug: lifestyle.slug,
                message: `Required field "${fieldName}" is missing`,
            });
        } else {
            const fieldIssues = checkJsonField(
                lifestyle[fieldName],
                fieldName,
                lifestyle.id,
                lifestyle.slug,
                stats
            );
            issues.push(...fieldIssues);
        }
    });
    
    // Check optional fields (if they exist, must have all locales)
    optionalFields.forEach(fieldName => {
        const fieldIssues = checkJsonField(
            lifestyle[fieldName],
            fieldName,
            lifestyle.id,
            lifestyle.slug,
            stats
        );
        issues.push(...fieldIssues);
    });
    
    // Check rules object (contains lifestyle-specific fields)
    if (lifestyle.rules && typeof lifestyle.rules === 'object') {
        const rules = lifestyle.rules;
        
        // Check mantra
        if (rules.mantra) {
            const mantraIssues = checkJsonField(
                rules.mantra,
                'rules.mantra',
                lifestyle.id,
                lifestyle.slug,
                stats
            );
            issues.push(...mantraIssues);
        }
        
        // Check philosophy
        if (rules.philosophy) {
            const philosophyIssues = checkJsonField(
                rules.philosophy,
                'rules.philosophy',
                lifestyle.id,
                lifestyle.slug,
                stats
            );
            issues.push(...philosophyIssues);
        }
        
        // Check tagline
        if (rules.tagline) {
            const taglineIssues = checkJsonField(
                rules.tagline,
                'rules.tagline',
                lifestyle.id,
                lifestyle.slug,
                stats
            );
            issues.push(...taglineIssues);
        }
        
        // Check dailyInspiration (object with arrays for each locale: { en: [...], ru: [...], kk: [...], fr: [...] })
        if (rules.dailyInspiration && typeof rules.dailyInspiration === 'object' && !Array.isArray(rules.dailyInspiration)) {
            REQUIRED_LOCALES.forEach(locale => {
                if (!rules.dailyInspiration[locale] || !Array.isArray(rules.dailyInspiration[locale]) || rules.dailyInspiration[locale].length === 0) {
                    issues.push({
                        type: 'missing_locale',
                        field: 'rules.dailyInspiration',
                        locale,
                        programId: lifestyle.id,
                        programSlug: lifestyle.slug,
                        message: `Missing or empty dailyInspiration array for locale "${locale}"`,
                    });
                }
            });
        }
        
        // Check sampleDay (object with morning, midday, evening, each being localized: { morning: { en: "...", ru: "..." }, ... })
        if (rules.sampleDay && typeof rules.sampleDay === 'object') {
            const sampleDayParts = ['morning', 'midday', 'evening'];
            sampleDayParts.forEach(part => {
                if (rules.sampleDay[part]) {
                    const partIssues = checkJsonField(
                        rules.sampleDay[part],
                        `rules.sampleDay.${part}`,
                        lifestyle.id,
                        lifestyle.slug,
                        stats
                    );
                    issues.push(...partIssues);
                }
            });
        }
    }
    
    // Check dailyTracker (array of objects with label field)
    if (lifestyle.dailyTracker && Array.isArray(lifestyle.dailyTracker)) {
        if (stats) {
            stats.dailyTrackersChecked = (stats.dailyTrackersChecked || 0) + lifestyle.dailyTracker.length;
        }
        lifestyle.dailyTracker.forEach((item, index) => {
            if (item.label) {
                const labelIssues = checkJsonField(
                    item.label,
                    `dailyTracker[${index}].label`,
                    lifestyle.id,
                    lifestyle.slug,
                    stats
                );
                issues.push(...labelIssues);
            }
        });
    }
    
    return issues;
}

async function checkPrograms(programs, checkFunction, programType) {
    const allIssues = [];
    const issuesByLocale = {
        en: [],
        ru: [],
        kk: [],
        fr: [],
    };
    
    // Statistics for detailed reporting
    const stats = {
        fieldsChecked: 0,
        fieldsComplete: 0,
        fieldsIncomplete: 0,
        optionalFieldsSkipped: 0,
        nonTranslationFields: 0,
        dailyTrackersChecked: 0,
    };
    
    programs.forEach(program => {
        const issues = checkFunction(program, stats);
        allIssues.push(...issues);
        
        // Group by locale
        issues.forEach(issue => {
            if (issue.locale && issuesByLocale[issue.locale]) {
                issuesByLocale[issue.locale].push(issue);
            }
        });
    });
    
    // Print detailed statistics if verbose or if there are issues
    if (VERBOSE || allIssues.length > 0) {
        console.log(`\n   📈 Statistics:`);
        console.log(`      Fields checked: ${stats.fieldsChecked}`);
        console.log(`      Fields with all locales: ${stats.fieldsComplete}`);
        console.log(`      Fields missing locales: ${stats.fieldsIncomplete}`);
        console.log(`      Optional fields skipped: ${stats.optionalFieldsSkipped}`);
        console.log(`      Daily trackers checked: ${stats.dailyTrackersChecked}`);
    }
    
    // Report by locale
    REQUIRED_LOCALES.forEach(locale => {
        const localeIssues = issuesByLocale[locale];
        if (localeIssues.length > 0) {
            console.log(`❌ ${locale.toUpperCase()}: ${localeIssues.length} issues\n`);
            
            // Group by program
            const byProgram = {};
            localeIssues.forEach(issue => {
                const key = issue.programSlug || issue.programId;
                if (!byProgram[key]) {
                    byProgram[key] = [];
                }
                byProgram[key].push(issue);
            });
            
            Object.entries(byProgram).forEach(([programKey, programIssues]) => {
                console.log(`   📋 Program: ${programKey}`);
                programIssues.forEach(issue => {
                    console.log(`      - ${issue.message}`);
                });
                console.log('');
            });
        } else {
            console.log(`✅ ${locale.toUpperCase()}: All translations present\n`);
        }
    });
    
    return { allIssues, issuesByLocale, stats };
}

async function main() {
    console.log('🔍 Checking Diet Programs and Lifestyle Programs translations in database...\n');
    console.log('='.repeat(60) + '\n');
    
try {
    // FIX: Check if database is available first
    await prisma.$connect();
    
    // Fetch all active diet programs (non-lifestyle)
    const diets = await prisma.dietProgram.findMany({
            where: { isActive: true, type: { not: 'LIFESTYLE' } },
            select: {
                id: true,
                slug: true,
                name: true,
                subtitle: true,
                description: true,
                shortDescription: true,
                tips: true,
                howItWorks: true,
                sampleDay: true,
                notFor: true,
                dailyTracker: true,
                type: true,
            },
        });
    
    // Fetch all active lifestyle programs
    const lifestyles = await prisma.dietProgram.findMany({
            where: { isActive: true, type: 'LIFESTYLE' },
            select: {
                id: true,
                slug: true,
                name: true,
                subtitle: true,
                description: true,
                shortDescription: true,
                rules: true,
                dailyTracker: true,
                type: true,
            },
        });
        
    console.log(`🍎 DIET PROGRAMS\n`);
    console.log(`📊 Found ${diets.length} active diet programs\n`);
    
    const dietResults = await checkPrograms(diets, checkDietProgram, 'diet');
    
    console.log('\n' + '='.repeat(60) + '\n');
    console.log(`🌿 LIFESTYLE PROGRAMS\n`);
    console.log(`📊 Found ${lifestyles.length} active lifestyle programs\n`);
    
    const lifestyleResults = await checkPrograms(lifestyles, checkLifestyleProgram, 'lifestyle');
    
    // Combined summary
    console.log('='.repeat(60));
    console.log('\n📊 Summary:\n');
    console.log(`   Diet Programs checked: ${diets.length}`);
    console.log(`   Diet Programs issues: ${dietResults.allIssues.length}`);
    if (VERBOSE || dietResults.stats) {
        console.log(`   Diet fields checked: ${dietResults.stats.fieldsChecked}`);
        console.log(`   Diet fields complete: ${dietResults.stats.fieldsComplete}`);
    }
    console.log(`   Lifestyle Programs checked: ${lifestyles.length}`);
    console.log(`   Lifestyle Programs issues: ${lifestyleResults.allIssues.length}`);
    if (VERBOSE || lifestyleResults.stats) {
        console.log(`   Lifestyle fields checked: ${lifestyleResults.stats.fieldsChecked}`);
        console.log(`   Lifestyle fields complete: ${lifestyleResults.stats.fieldsComplete}`);
    }
    console.log(`   Total issues found: ${dietResults.allIssues.length + lifestyleResults.allIssues.length}`);
    
    const allIssues = [...dietResults.allIssues, ...lifestyleResults.allIssues];
    const byType = {};
    allIssues.forEach(issue => {
        byType[issue.type] = (byType[issue.type] || 0) + 1;
    });
    
    if (Object.keys(byType).length > 0) {
        console.log('\n   Issues by type:');
        Object.entries(byType).forEach(([type, count]) => {
            console.log(`      - ${type}: ${count}`);
        });
    }
    
    if (allIssues.length === 0) {
        console.log('\n✅ All diet programs and lifestyle programs have complete translations!');
    } else {
        console.log('\n❌ Translation issues found in database!');
        process.exit(1);
    }
        
} catch (error) {
    if (error.code === 'P1001' || error.message?.includes('Can\'t reach database')) {
        console.error('❌ Cannot connect to database. Please make sure:');
        console.error('   1. Database server is running');
        console.error('   2. DATABASE_URL is set correctly in apps/api/.env');
        console.error('   3. You have network access to the database');
        console.error('\n   This check requires a running database connection.');
        console.error('   You can skip this check if the database is not available.\n');
    } else {
        console.error('❌ Error checking database translations:', error);
    }
    process.exit(1);
} finally {
    try {
        await prisma.$disconnect();
    } catch (e) {
        // Ignore disconnect errors
    }
}
}

main();

/**
 * Comprehensive translation checker for Nutrition section
 * Checks all diets and lifestyle programs for:
 * 1. Missing translations (en, ru, kk, fr)
 * 2. Translation keys instead of actual text
 * 3. Empty or null values
 * 4. Proper localization structure
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to check if value looks like a translation key
function looksLikeKey(value) {
    if (typeof value !== 'string') return false;
    // Pattern: contains dots and lowercase/underscores (typical i18n key format)
    return /^[a-z_][a-z0-9_.]*\.[a-z0-9_.]+$/i.test(value) && value.includes('.');
}

// Helper to get localized value from JSON
function getLocalizedValue(json, locale) {
    if (json === null || json === undefined) return null;
    if (typeof json === 'string') return json;
    if (typeof json === 'object') {
        return json[locale] || json['en'] || json['ru'] || json['kk'] || json['fr'] || Object.values(json)[0] || null;
    }
    return null;
}

// Check if value is empty or null
function isEmpty(value) {
    return value === null || value === undefined || value === '' || (typeof value === 'string' && value.trim() === '');
}

async function checkDiets() {
    console.log('🍎 Checking Diet Programs translations...\n');

    const diets = await prisma.dietProgram.findMany({
        where: { isActive: true },
        select: {
            id: true,
            slug: true,
            name: true,
            subtitle: true,
            description: true,
            shortDescription: true,
            type: true,
        },
        orderBy: { slug: 'asc' },
    });

    console.log(`📊 Found ${diets.length} active diets\n`);

    const locales = ['en', 'ru', 'kk', 'fr'];
    const issues = [];

    for (const diet of diets) {
        const dietIssues = {
            id: diet.id,
            slug: diet.slug,
            type: diet.type,
            missing: [],
            keyLike: [],
            empty: [],
        };

        // Check name
        for (const locale of locales) {
            const value = getLocalizedValue(diet.name, locale);
            if (isEmpty(value)) {
                dietIssues.missing.push(`name.${locale}`);
            } else if (looksLikeKey(value)) {
                dietIssues.keyLike.push({ field: 'name', locale, value });
            }
        }

        // Check subtitle
        if (diet.subtitle) {
            for (const locale of locales) {
                const value = getLocalizedValue(diet.subtitle, locale);
                if (isEmpty(value)) {
                    dietIssues.missing.push(`subtitle.${locale}`);
                } else if (looksLikeKey(value)) {
                    dietIssues.keyLike.push({ field: 'subtitle', locale, value });
                }
            }
        }

        // Check shortDescription
        if (diet.shortDescription) {
            for (const locale of locales) {
                const value = getLocalizedValue(diet.shortDescription, locale);
                if (isEmpty(value)) {
                    dietIssues.missing.push(`shortDescription.${locale}`);
                } else if (looksLikeKey(value)) {
                    dietIssues.keyLike.push({ field: 'shortDescription', locale, value });
                }
            }
        }

        // Check description
        if (diet.description) {
            for (const locale of locales) {
                const value = getLocalizedValue(diet.description, locale);
                if (isEmpty(value)) {
                    dietIssues.missing.push(`description.${locale}`);
                } else if (looksLikeKey(value)) {
                    dietIssues.keyLike.push({ field: 'description', locale, value });
                }
            }
        }

        if (dietIssues.missing.length > 0 || dietIssues.keyLike.length > 0 || dietIssues.empty.length > 0) {
            issues.push(dietIssues);
        }
    }

    if (issues.length === 0) {
        console.log('✅ All diets have proper translations!\n');
    } else {
        console.log(`❌ Found issues in ${issues.length} diets:\n`);
        issues.forEach((issue) => {
            console.log(`📋 ${issue.slug} (${issue.type}):`);
            if (issue.missing.length > 0) {
                console.log(`   ❌ Missing: ${issue.missing.join(', ')}`);
            }
            if (issue.keyLike.length > 0) {
                console.log(`   🚨 Key-like values:`);
                issue.keyLike.forEach(({ field, locale, value }) => {
                    console.log(`      - ${field}.${locale}: "${value}"`);
                });
            }
            console.log('');
        });
    }

    return issues;
}

async function checkLifestyles() {
    console.log('🌿 Checking Lifestyle Programs translations...\n');

    const lifestyles = await prisma.dietProgram.findMany({
        where: { isActive: true, type: 'LIFESTYLE' },
        select: {
            id: true,
            slug: true,
            name: true,
            subtitle: true,
            description: true,
            shortDescription: true,
            rules: true, // Contains mantra, philosophy, embrace, minimize, etc.
        },
        orderBy: { slug: 'asc' },
    });

    console.log(`📊 Found ${lifestyles.length} active lifestyle programs\n`);

    const locales = ['en', 'ru', 'kk', 'fr'];
    const issues = [];

    for (const lifestyle of lifestyles) {
        const lifestyleIssues = {
            id: lifestyle.id,
            slug: lifestyle.slug,
            missing: [],
            keyLike: [],
            empty: [],
        };

        // Check name
        for (const locale of locales) {
            const value = getLocalizedValue(lifestyle.name, locale);
            if (isEmpty(value)) {
                lifestyleIssues.missing.push(`name.${locale}`);
            } else if (looksLikeKey(value)) {
                lifestyleIssues.keyLike.push({ field: 'name', locale, value });
            }
        }

        // Check subtitle
        if (lifestyle.subtitle) {
            for (const locale of locales) {
                const value = getLocalizedValue(lifestyle.subtitle, locale);
                if (isEmpty(value)) {
                    lifestyleIssues.missing.push(`subtitle.${locale}`);
                } else if (looksLikeKey(value)) {
                    lifestyleIssues.keyLike.push({ field: 'subtitle', locale, value });
                }
            }
        }

        // Check shortDescription
        if (lifestyle.shortDescription) {
            for (const locale of locales) {
                const value = getLocalizedValue(lifestyle.shortDescription, locale);
                if (isEmpty(value)) {
                    lifestyleIssues.missing.push(`shortDescription.${locale}`);
                } else if (looksLikeKey(value)) {
                    lifestyleIssues.keyLike.push({ field: 'shortDescription', locale, value });
                }
            }
        }

        // Check rules (mantra, philosophy, etc.)
        if (lifestyle.rules && typeof lifestyle.rules === 'object') {
            const rules = lifestyle.rules;
            
            // Check mantra
            if (rules.mantra) {
                for (const locale of locales) {
                    const value = getLocalizedValue(rules.mantra, locale);
                    if (isEmpty(value)) {
                        lifestyleIssues.missing.push(`rules.mantra.${locale}`);
                    } else if (looksLikeKey(value)) {
                        lifestyleIssues.keyLike.push({ field: 'rules.mantra', locale, value });
                    }
                }
            }

            // Check philosophy
            if (rules.philosophy) {
                for (const locale of locales) {
                    const value = getLocalizedValue(rules.philosophy, locale);
                    if (isEmpty(value)) {
                        lifestyleIssues.missing.push(`rules.philosophy.${locale}`);
                    } else if (looksLikeKey(value)) {
                        lifestyleIssues.keyLike.push({ field: 'rules.philosophy', locale, value });
                    }
                }
            }

            // Check embrace (array of strings, not localized)
            if (rules.embrace && !Array.isArray(rules.embrace)) {
                lifestyleIssues.missing.push('rules.embrace (should be array)');
            }

            // Check minimize (array of strings, not localized)
            if (rules.minimize && !Array.isArray(rules.minimize)) {
                lifestyleIssues.missing.push('rules.minimize (should be array)');
            }
        }

        if (lifestyleIssues.missing.length > 0 || lifestyleIssues.keyLike.length > 0 || lifestyleIssues.empty.length > 0) {
            issues.push(lifestyleIssues);
        }
    }

    if (issues.length === 0) {
        console.log('✅ All lifestyle programs have proper translations!\n');
    } else {
        console.log(`❌ Found issues in ${issues.length} lifestyle programs:\n`);
        issues.forEach((issue) => {
            console.log(`📋 ${issue.slug}:`);
            if (issue.missing.length > 0) {
                console.log(`   ❌ Missing: ${issue.missing.join(', ')}`);
            }
            if (issue.keyLike.length > 0) {
                console.log(`   🚨 Key-like values:`);
                issue.keyLike.forEach(({ field, locale, value }) => {
                    console.log(`      - ${field}.${locale}: "${value}"`);
                });
            }
            console.log('');
        });
    }

    return issues;
}

async function main() {
    console.log('🔍 Comprehensive Nutrition Section Translation Checker\n');
    console.log('='.repeat(60) + '\n');

    try {
        const dietIssues = await checkDiets();
        const lifestyleIssues = await checkLifestyles();

        console.log('='.repeat(60));
        console.log('\n📊 Summary:\n');
        console.log(`   Diet Programs Issues: ${dietIssues.length}`);
        console.log(`   Lifestyle Programs Issues: ${lifestyleIssues.length}\n`);

        const totalIssues = dietIssues.length + lifestyleIssues.length;

        if (totalIssues === 0) {
            console.log('✅ All translations in Nutrition section are complete!');
        } else {
            console.log(`❌ Found ${totalIssues} programs with translation issues!`);
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Error checking translations:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();

/**
 * Test script to manually verify translation checking for specific programs
 * This helps verify that the check-db-translations.js script is working correctly
 */

const path = require('path');
const fs = require('fs');

let PrismaClient;
let prisma;

// Try multiple paths to find Prisma client
const possiblePaths = [
    path.join(__dirname, '../apps/api/node_modules/@prisma/client'),
    path.join(__dirname, '../../apps/api/node_modules/@prisma/client'),
    path.join(process.cwd(), 'node_modules/@prisma/client'),
    '@prisma/client',
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
    } catch {
        continue;
    }
}

if (!prisma) {
    console.error('❌ Cannot find PrismaClient');
    process.exit(1);
}

const REQUIRED_LOCALES = ['en', 'ru', 'kk', 'fr'];

async function inspectProgram(slug, type = 'diet') {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Inspecting ${type}: ${slug}`);
    console.log('='.repeat(60));
    
    const where = type === 'diet' 
        ? { slug, isActive: true, type: { not: 'LIFESTYLE' } }
        : { slug, isActive: true, type: 'LIFESTYLE' };
    
    const program = await prisma.dietProgram.findFirst({
        where,
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
            rules: true,
            type: true,
        },
    });
    
    if (!program) {
        console.log(`❌ Program not found: ${slug}`);
        return;
    }
    
    console.log(`\n📋 Program: ${program.slug} (${program.type})`);
    console.log(`   ID: ${program.id}\n`);
    
    // Check name (required)
    console.log('🔍 NAME (required):');
    if (program.name) {
        REQUIRED_LOCALES.forEach(locale => {
            const value = program.name[locale];
            const status = value && value.trim() ? '✅' : '❌';
            console.log(`   ${status} ${locale}: ${value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : 'MISSING'}`);
        });
    } else {
        console.log('   ❌ MISSING');
    }
    
    // Check subtitle
    if (program.subtitle) {
        console.log('\n🔍 SUBTITLE:');
        REQUIRED_LOCALES.forEach(locale => {
            const value = program.subtitle[locale];
            const status = value && value.trim() ? '✅' : '❌';
            console.log(`   ${status} ${locale}: ${value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : 'MISSING'}`);
        });
    }
    
    // Check description
    if (program.description) {
        console.log('\n🔍 DESCRIPTION:');
        REQUIRED_LOCALES.forEach(locale => {
            const value = program.description[locale];
            const status = value && value.trim() ? '✅' : '❌';
            console.log(`   ${status} ${locale}: ${value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : 'MISSING'}`);
        });
    }
    
    // Check shortDescription
    if (program.shortDescription) {
        console.log('\n🔍 SHORT DESCRIPTION:');
        REQUIRED_LOCALES.forEach(locale => {
            const value = program.shortDescription[locale];
            const status = value && value.trim() ? '✅' : '❌';
            console.log(`   ${status} ${locale}: ${value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : 'MISSING'}`);
        });
    }
    
    // For diets: check tips, howItWorks, sampleDay, notFor
    if (type === 'diet') {
        if (program.tips) {
            console.log('\n🔍 TIPS:');
            REQUIRED_LOCALES.forEach(locale => {
                const value = program.tips[locale];
                const status = value && Array.isArray(value) && value.length > 0 ? '✅' : '❌';
                console.log(`   ${status} ${locale}: ${value ? (Array.isArray(value) ? `${value.length} items` : 'NOT ARRAY') : 'MISSING'}`);
            });
        }
        
        if (program.howItWorks) {
            console.log('\n🔍 HOW IT WORKS:');
            REQUIRED_LOCALES.forEach(locale => {
                const value = program.howItWorks[locale];
                const status = value && Array.isArray(value) && value.length > 0 ? '✅' : '❌';
                console.log(`   ${status} ${locale}: ${value ? (Array.isArray(value) ? `${value.length} items` : 'NOT ARRAY') : 'MISSING'}`);
            });
        }
        
        if (program.sampleDay) {
            console.log('\n🔍 SAMPLE DAY:');
            REQUIRED_LOCALES.forEach(locale => {
                const value = program.sampleDay[locale];
                const status = value && value.trim() ? '✅' : '❌';
                console.log(`   ${status} ${locale}: ${value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : 'MISSING'}`);
            });
        }
        
        if (program.notFor) {
            console.log('\n🔍 NOT FOR:');
            REQUIRED_LOCALES.forEach(locale => {
                const value = program.notFor[locale];
                const status = value && Array.isArray(value) && value.length > 0 ? '✅' : '❌';
                console.log(`   ${status} ${locale}: ${value ? (Array.isArray(value) ? `${value.length} items` : 'NOT ARRAY') : 'MISSING'}`);
            });
        }
    }
    
    // For lifestyles: check rules
    if (type === 'lifestyle' && program.rules) {
        console.log('\n🔍 RULES:');
        
        if (program.rules.mantra) {
            console.log('   MANTRA:');
            REQUIRED_LOCALES.forEach(locale => {
                const value = program.rules.mantra[locale];
                const status = value && value.trim() ? '✅' : '❌';
                console.log(`      ${status} ${locale}: ${value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : 'MISSING'}`);
            });
        }
        
        if (program.rules.philosophy) {
            console.log('   PHILOSOPHY:');
            REQUIRED_LOCALES.forEach(locale => {
                const value = program.rules.philosophy[locale];
                const status = value && value.trim() ? '✅' : '❌';
                console.log(`      ${status} ${locale}: ${value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : 'MISSING'}`);
            });
        }
        
        if (program.rules.dailyInspiration) {
            console.log('   DAILY INSPIRATION:');
            REQUIRED_LOCALES.forEach(locale => {
                const value = program.rules.dailyInspiration[locale];
                const status = value && Array.isArray(value) && value.length > 0 ? '✅' : '❌';
                console.log(`      ${status} ${locale}: ${value ? (Array.isArray(value) ? `${value.length} items` : 'NOT ARRAY') : 'MISSING'}`);
            });
        }
        
        if (program.rules.sampleDay) {
            console.log('   SAMPLE DAY:');
            ['morning', 'midday', 'evening'].forEach(part => {
                if (program.rules.sampleDay[part]) {
                    console.log(`      ${part.toUpperCase()}:`);
                    REQUIRED_LOCALES.forEach(locale => {
                        const value = program.rules.sampleDay[part][locale];
                        const status = value && value.trim() ? '✅' : '❌';
                        console.log(`         ${status} ${locale}: ${value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : 'MISSING'}`);
                    });
                }
            });
        }
    }
    
    // Check dailyTracker
    if (program.dailyTracker && Array.isArray(program.dailyTracker)) {
        console.log(`\n🔍 DAILY TRACKER (${program.dailyTracker.length} items):`);
        program.dailyTracker.forEach((item, index) => {
            if (item.label) {
                console.log(`   Item ${index + 1} (${item.key || 'no key'}):`);
                REQUIRED_LOCALES.forEach(locale => {
                    const value = item.label[locale];
                    const status = value && value.trim() ? '✅' : '❌';
                    console.log(`      ${status} ${locale}: ${value || 'MISSING'}`);
                });
            }
        });
    }
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node test-translation-check.js <slug1> [slug2] ... [--type diet|lifestyle]');
        console.log('\nExample:');
        console.log('  node test-translation-check.js mediterranean_diet --type diet');
        console.log('  node test-translation-check.js that_girl --type lifestyle');
        process.exit(1);
    }
    
    try {
        await prisma.$connect();
        
        let type = 'diet';
        const slugs = [];
        
        for (let i = 0; i < args.length; i++) {
            if (args[i] === '--type' && i + 1 < args.length) {
                type = args[i + 1];
                i++;
            } else {
                slugs.push(args[i]);
            }
        }
        
        if (slugs.length === 0) {
            console.log('❌ No slugs provided');
            process.exit(1);
        }
        
        for (const slug of slugs) {
            await inspectProgram(slug, type);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();

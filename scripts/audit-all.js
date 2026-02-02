const fs = require('fs');
const path = require('path');

const SEED_FILE = path.join(__dirname, '../apps/api/prisma/seeds/seed-diets.ts');

function auditDiets() {
    console.log('--- Deep Auditing Diet Seeds (All Fields) ---');
    let content = fs.readFileSync(SEED_FILE, 'utf8');

    // Strip imports and setup code
    content = content.replace(/import .*?;/g, '');
    content = content.replace(/const prisma = .*?;/g, '');
    content = content.replace(/as any/g, '');

    // Isolate 'const diets' block
    const dietsStart = content.indexOf('const diets = [');
    if (dietsStart === -1) {
        console.error('Could not find "const diets = ["');
        return;
    }

    // Clean up end of file
    const functionStart = content.indexOf('async function seedDiets');
    if (functionStart !== -1) {
        content = content.substring(0, functionStart);
    }

    content += '\nmodule.exports = { diets, mediterraneanMeals: typeof mediterraneanMeals !== "undefined" ? mediterraneanMeals : [] };';

    const tempFile = path.join(__dirname, 'temp-diets-audit-deep.js');
    fs.writeFileSync(tempFile, content);

    try {
        const { diets } = require(tempFile);
        console.log(`Loaded ${diets.length} diets/lifestyles.`);

        let errors = 0;
        let warnings = 0;

        diets.forEach((diet, idx) => {
            const slug = diet.slug;

            // 1. Basic Fields
            checkLocalized(diet.name, slug, 'name');
            checkLocalized(diet.description, slug, 'description');
            checkLocalized(diet.shortDescription, slug, 'shortDescription');
            checkLocalized(diet.sampleDay, slug, 'sampleDay');

            // 2. Arrays with content (howItWorks, tips)
            ['howItWorks', 'tips'].forEach(field => {
                if (diet[field]) {
                    if (Array.isArray(diet[field])) {
                        // It's not localized, it's just an array? Usually these are localized objects { en: [], ru: [] } in this file.
                        // Wait, looking at file, howItWorks IS a localized object { en: [...], ru: [...] }
                        checkLocalizedArray(diet[field], slug, field);
                    } else {
                        checkLocalizedArray(diet[field], slug, field);
                    }
                }
            });

            // 3. notFor (Can be object or null)
            if (diet.notFor) {
                // In seed-diets.ts, notFor is often a localized object { en: [...], ru: [...] }
                // But sometimes it might be null or just a flat array (though previous file view shows localized).
                // Let's check if it has keys 'en'.
                if (diet.notFor.en) {
                    checkLocalizedArray(diet.notFor, slug, 'notFor');
                } else if (Array.isArray(diet.notFor)) {
                    // If it's a flat array, we can't really audit localization unless we expect it to be localized.
                    // Assuming schema requires localization if it's text.
                }
            }

            // 4. Daily Tracker Labels
            if (diet.dailyTracker) {
                diet.dailyTracker.forEach(item => {
                    if (typeof item.label === 'object') {
                        checkLocalized(item.label, `${slug}.tracker.${item.key}`, 'label');
                    }
                });
            }
        });

        console.log('--- Audit Complete ---');
        console.log(`Errors (Missing): ${errors}`);
        console.log(`Warnings (Length Mismatch): ${warnings}`);

        function checkLocalized(obj, context, fieldName) {
            if (!obj) return;
            const keys = Object.keys(obj);
            // If it handles English, it should handle others
            if (obj.en) {
                ['ru', 'kk', 'fr'].forEach(lang => {
                    if (!obj[lang]) {
                        console.log(`❌ [${context}] Missing ${fieldName}.${lang}`);
                        errors++;
                    }
                });
            }
        }

        function checkLocalizedArray(obj, context, fieldName) {
            if (!obj || !obj.en) return;
            const mainLen = obj.en.length;

            ['ru', 'kk', 'fr'].forEach(lang => {
                if (!obj[lang]) {
                    console.log(`❌ [${context}] Missing ${fieldName}.${lang} (Array)`);
                    errors++;
                } else {
                    if (obj[lang].length !== mainLen) {
                        console.log(`⚠️ [${context}] ${fieldName}.${lang} length mismatch: EN=${mainLen}, ${lang.toUpperCase()}=${obj[lang].length}`);
                        warnings++;
                    }
                }
            });
        }

    } catch (e) {
        console.error('Error parsing temp file:', e);
    } finally {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
}

auditDiets();

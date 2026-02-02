const fs = require('fs');
const path = require('path');

const SEED_FILE = path.join(__dirname, '../apps/api/prisma/seeds/seed-diets.ts');

function auditDiets() {
    console.log('--- Auditing Diet Seeds ---');
    let content = fs.readFileSync(SEED_FILE, 'utf8');

    // Strip imports
    content = content.replace(/import .*?;/g, '');
    content = content.replace(/const prisma = .*?;/g, '');

    // Strip types like 'as any'
    content = content.replace(/as any/g, '');

    // Isolate 'const diets' block
    // Assumes 'const diets = [' starts the block and the next 'const ' or 'async function' ends it
    const dietsStart = content.indexOf('const diets = [');
    if (dietsStart === -1) {
        console.error('Could not find "const diets = ["');
        return;
    }

    // Find the end. It's likely followed by 'const mediterraneanMeals' or 'async function'
    // Or we can just try to find the closing '];' before the next variable declaration

    // Hacky but effective: find next 'const ' or 'async ' after diet start+100
    // Actually, let's just use the whole file content but remove the function call at the end.
    // And remove the `async function seedDiets` block.

    const functionStart = content.indexOf('async function seedDiets');
    if (functionStart !== -1) {
        content = content.substring(0, functionStart);
    }

    // Now we essentially have the variable declarations.
    // We need to export diets.
    content += '\nmodule.exports = { diets, mediterraneanMeals: typeof mediterraneanMeals !== "undefined" ? mediterraneanMeals : [] };';

    // Write to temp file
    const tempFile = path.join(__dirname, 'temp-diets-audit.js');
    fs.writeFileSync(tempFile, content);

    try {
        const { diets } = require(tempFile);
        console.log(`Loaded ${diets.length} diets.`);

        let errors = 0;

        diets.forEach((diet, idx) => {
            const slug = diet.slug;

            // Check Name
            checkLocalized(diet.name, slug, 'name');
            checkLocalized(diet.description, slug, 'description');
            checkLocalized(diet.shortDescription, slug, 'shortDescription');

            // Check arrays
            ['howItWorks', 'tips'].forEach(field => {
                if (diet[field]) {
                    const mainLen = diet[field].en?.length || 0;
                    ['ru', 'kk', 'fr'].forEach(lang => {
                        if (!diet[field][lang]) {
                            console.log(`❌ [${slug}] Missing ${field}.${lang}`);
                            errors++;
                        } else if (diet[field][lang].length !== mainLen) {
                            console.log(`⚠️ [${slug}] ${field}.${lang} length mismatch (safe?): EN=${mainLen}, ${lang.toUpperCase()}=${diet[field][lang].length}`);
                            // Could be an error or just different segmentation
                        }
                    });
                }
            });

            // Daily Tracker
            if (diet.dailyTracker) {
                diet.dailyTracker.forEach(item => {
                    if (typeof item.label === 'object') {
                        checkLocalized(item.label, `${slug}.tracker.${item.key}`, 'label');
                    }
                });
            }
        });

        if (errors === 0) {
            console.log('✅ Audit Passed (Structure-wise). Visual check needed for warnings.');
        }

    } catch (e) {
        console.error('Error parsing temp file:', e);
    } finally {
        // Cleanup
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
}

function checkLocalized(obj, context, fieldName) {
    if (!obj) return;
    ['ru', 'kk', 'fr'].forEach(lang => {
        if (!obj[lang]) {
            console.log(`❌ [${context}] Missing ${fieldName}.${lang}`);
        }
    });
}

auditDiets();

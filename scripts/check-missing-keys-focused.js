
const fs = require('fs');
const path = require('path');

// Configuration
const LOCALES_DIR = path.join(__dirname, '../app/i18n/locales');
const SOURCE_LOCALE = 'en';
const TARGET_LOCALES = ['ru', 'kk', 'fr'];

// Sections to focus on (Top-level keys in JSON)
const EXCLUDED_KEYS = ['featureFlags', 'paywall'];

// Helper to get nested keys
function getKeys(obj, prefix = '') {
    let keys = [];
    for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            keys = keys.concat(getKeys(obj[key], prefix + key + '.'));
        } else {
            keys.push(prefix + key);
        }
    }
    return keys;
}

// Helper to get value by dot notation
function getValue(obj, path) {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

function run() {
    const argLocale = process.argv[2];
    const activeTargets = argLocale ? [argLocale] : TARGET_LOCALES;

    console.log(`Checking missing translations for: ${activeTargets.join(', ')}...`);

    const sourcePath = path.join(LOCALES_DIR, `${SOURCE_LOCALE}.json`);
    if (!fs.existsSync(sourcePath)) {
        console.error(`Source locale file not found: ${sourcePath}`);
        process.exit(1);
    }
    const sourceData = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

    const sourceKeys = {};

    Object.keys(sourceData).forEach(key => {
        if (EXCLUDED_KEYS.includes(key)) return;
        if (typeof sourceData[key] === 'object' && sourceData[key] !== null) {
            sourceKeys[key] = getKeys(sourceData[key], `${key}.`);
        } else {
            if (!sourceKeys['root']) sourceKeys['root'] = [];
            sourceKeys['root'].push(key);
        }
    });

    activeTargets.forEach(targetLocale => {
        const targetPath = path.join(LOCALES_DIR, `${targetLocale}.json`);
        if (!fs.existsSync(targetPath)) return;

        try {
            const targetData = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
            const missingconf = [];

            Object.keys(sourceKeys).forEach(section => {
                const missingInSection = [];
                sourceKeys[section].forEach(key => {
                    let val;
                    if (section === 'root') {
                        val = targetData[key];
                    } else {
                        val = getValue(targetData, key);
                    }

                    if (val === undefined || val === '') {
                        missingInSection.push(key);
                    }
                });

                if (missingInSection.length > 0) {
                    missingconf.push({ section, count: missingInSection.length, keys: missingInSection });
                }
            });

            if (missingconf.length > 0) {
                const outputPath = `missing_${targetLocale}.json`;
                fs.writeFileSync(outputPath, JSON.stringify(missingconf, null, 2));
                console.log(`[${targetLocale}] Missing translations written to ${outputPath}`);
            } else {
                const outputPath = `missing_${targetLocale}.json`;
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                console.log(`[${targetLocale}] All clear.`);
            }

        } catch (e) {
            console.error(`Error parsing ${targetLocale}: ${e.message}`);
        }
    });
    console.log('Done.');
}

run();

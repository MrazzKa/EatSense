const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../app/i18n/locales');
const TARGET_LANGS = ['ru', 'kk', 'fr'];
const MASTER_LANG = 'en';

function flattenKeys(obj, prefix = '') {
    let keys = {};
    for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            Object.assign(keys, flattenKeys(obj[key], prefix + key + '.'));
        } else {
            keys[prefix + key] = true;
        }
    }
    return keys;
}

function auditLocales() {
    console.log('--- Auditing Translation Files (RU, KK, FR vs EN) ---');

    // Load Master (EN)
    const enPath = path.join(LOCALES_DIR, 'en.json');
    if (!fs.existsSync(enPath)) {
        console.error('❌ Master locale (en.json) not found!');
        return;
    }

    const enContent = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const enKeys = flattenKeys(enContent);
    const totalKeys = Object.keys(enKeys).length;
    console.log(`Loaded EN (Master): ${totalKeys} keys`);

    let totalErrors = 0;

    TARGET_LANGS.forEach(lang => {
        const targetPath = path.join(LOCALES_DIR, `${lang}.json`);
        if (!fs.existsSync(targetPath)) {
            console.error(`❌ Locale ${lang}.json not found!`);
            return;
        }

        const targetContent = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
        const targetKeys = flattenKeys(targetContent);

        let missingCount = 0;
        const missingKeys = [];

        Object.keys(enKeys).forEach(key => {
            if (!targetKeys[key]) {
                missingKeys.push(key);
                missingCount++;
            }
        });

        if (missingCount > 0) {
            console.log(`\n❌ [${lang.toUpperCase()}] Missing ${missingCount} keys:`);
            missingKeys.forEach(k => console.log(`   - ${k}`));
            totalErrors += missingCount;
        } else {
            console.log(`\n✅ [${lang.toUpperCase()}] Complete`);
        }
    });

    console.log('\n--- Audit Complete ---');
    if (totalErrors > 0) {
        console.log(`Total Missing Keys: ${totalErrors}`);
    } else {
        console.log('All targeted locales are complete!');
    }
}

auditLocales();

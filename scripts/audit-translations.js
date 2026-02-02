const fs = require('fs');
const path = require('path');

// --- Configuration ---
const LOCALES_DIR = path.join(__dirname, '../app/i18n/locales');
const SRC_DIR = path.join(__dirname, '../src');
const MASTER_LOCALE = 'en';
const TARGET_LOCALES = ['ru', 'kk', 'fr']; // Add others if needed

// --- Helper Functions ---

// Flatten a JSON object to dot.notation keys
function flattenKeys(obj, prefix = '') {
    let keys = [];
    for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            keys = keys.concat(flattenKeys(obj[key], prefix + key + '.'));
        } else {
            keys.push(prefix + key);
        }
    }
    return keys;
}

// Load JSON file safely
function loadLocale(locale) {
    try {
        const filePath = path.join(LOCALES_DIR, `${locale}.json`);
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (e) {
        console.error(`Error loading locale ${locale}:`, e.message);
        return {};
    }
}

// Recursively find files in directory
function walkDir(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            walkDir(filePath, fileList);
        } else {
            if (/\.(js|jsx|ts|tsx)$/.test(file)) {
                fileList.push(filePath);
            }
        }
    });
    return fileList;
}

// Scan file for t('key') patterns
function scanFileForKeys(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    // Matches: t('key'), t("key"), i18n.t('key'), safeT('key')
    // Note: This is a basic regex and might miss complex dynamic keys or capture false positives.
    const regex = /\b(?:t|safeT|i18n\.t)\(\s*['"]([a-zA-Z0-9_.]+)['"]/g;
    const keys = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
        keys.push(match[1]);
    }
    return keys;
}

// --- Main Execution ---

console.log('--- Starting Translation Audit ---\n');

// 1. Load Master Locale (EN)
console.log(`Loading master locale: ${MASTER_LOCALE}`);
const masterJson = loadLocale(MASTER_LOCALE);
const masterKeys = new Set(flattenKeys(masterJson));
console.log(`Found ${masterKeys.size} keys in master locale.`);

// 2. Compare Target Locales
console.log('\n--- Comparing Target Locales ---');
TARGET_LOCALES.forEach(locale => {
    const targetJson = loadLocale(locale);
    const targetKeys = new Set(flattenKeys(targetJson));

    const missingInTarget = [...masterKeys].filter(k => !targetKeys.has(k));

    if (missingInTarget.length > 0) {
        console.log(`\n❌ [${locale.toUpperCase()}] Missing ${missingInTarget.length} keys:`);
        missingInTarget.forEach(k => console.log(`  - ${k}`));
    } else {
        console.log(`\n✅ [${locale.toUpperCase()}] All keys from master present.`);
    }

    // Optional: Check for keys in target that are NOT in master (orphaned?)
    const extraInTarget = [...targetKeys].filter(k => !masterKeys.has(k));
    if (extraInTarget.length > 0) {
        console.log(`   (Note: ${locale.toUpperCase()} has ${extraInTarget.length} extra keys not in master)`);
    }
});

// 3. Scan Codebase
console.log('\n--- Scanning Codebase for Usages ---');
const files = walkDir(SRC_DIR);
const usedKeys = new Set();
files.forEach(f => {
    const keys = scanFileForKeys(f);
    keys.forEach(k => usedKeys.add(k));
});

console.log(`Scanned ${files.length} files. Found ${usedKeys.size} unique used keys.`);

const missingInMaster = [...usedKeys].filter(k => !masterKeys.has(k));

if (missingInMaster.length > 0) {
    console.log(`\n❌ Found ${missingInMaster.length} keys used in code but MISSING in ${MASTER_LOCALE}.json:`);
    missingInMaster.forEach(k => console.log(`  - ${k}`));
} else {
    console.log(`\n✅ All keys found in code exist in ${MASTER_LOCALE}.json.`);
}

console.log('\n--- Audit Complete ---');

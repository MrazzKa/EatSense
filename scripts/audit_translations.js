const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOCALES_DIR = path.join(__dirname, '../app/i18n/locales');
const SRC_DIR = path.join(__dirname, '../src');

// Helpers
function getKeys(obj, prefix = '') {
    return Object.keys(obj).reduce((acc, key) => {
        const value = obj[key];
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            acc.push(...getKeys(value, fullKey));
        } else {
            acc.push(fullKey);
        }
        return acc;
    }, []);
}

function getValue(obj, key) {
    return key.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);
}

// 1. untranslated values
function checkUntranslated(locales, enContent) {
    console.log('\n--- 1. Checking for potentially untranslated values (same as English) ---');
    const ignoreList = ['EatSense', 'OK', 'Email', 'ID', 'v1.0', 'All', 'Auto', 'Snack'];

    Object.keys(locales).forEach(lang => {
        if (lang === 'en') return;
        const content = locales[lang];
        const enKeys = getKeys(enContent);
        const suspicious = [];

        enKeys.forEach(k => {
            const enVal = getValue(enContent, k);
            const locVal = getValue(content, k);

            if (typeof enVal === 'string' && typeof locVal === 'string') {
                if (enVal === locVal && enVal.length > 3 && !ignoreList.includes(enVal)) {
                    suspicious.push({ key: k, value: enVal });
                }
            }
        });

        if (suspicious.length > 0) {
            console.log(`\nLocale: ${lang} (${suspicious.length} matches)`);
            suspicious.slice(0, 10).forEach(item => console.log(`  - ${item.key}: "${item.value}"`));
            if (suspicious.length > 10) console.log(`  ... and ${suspicious.length - 10} more.`);
        }
    });
}

// 2. Unused keys
function checkUnused(enContent) {
    console.log('\n--- 2. Checking for unused translation keys ---');
    const keys = getKeys(enContent);
    const unused = [];

    // Very naive check: grep each key
    // This is slow but effective for verified accuracy
    // Optimisation: Read all source files into memory once? 
    // For large projects, better to use 'grep'. 

    // Let's rely on grep command for speed
    try {
        console.log(`Scanning ${keys.length} keys against src/...`);
        const allSource = execSync(`grep -r "" "${SRC_DIR}" --include=*.{js,ts,tsx,jsx}`).toString();

        keys.forEach(key => {
            // Check if key exists in source. 
            // We look for 'key' or "key" or `key`
            // Also handle dynamic keys? Difficult. We stick to exact matches.
            if (!allSource.includes(key) && !key.startsWith("diets_") && !key.startsWith("lifestyles_")) {
                // Excluding diets_ and lifestyles_ because they might be constructed dynamically 
                // although we *just* flattened them so they should be explicit? 
                // Actually, DietCard used `t('diets_type_' + type)`, so dynamic usage is real.
                unused.push(key);
            }
        });
    } catch {
        console.log("Could not run fast grep check.");
    }

    if (unused.length > 0) {
        console.log(`Found ${unused.length} potentially unused keys:`);
        unused.slice(0, 20).forEach(k => console.log(`  - ${k}`));
        if (unused.length > 20) console.log(`  ... ${unused.length - 20} more`);
    } else {
        console.log("No unused keys found (excluding dynamic prefixes).");
    }
}

// 3. Hardcoded strings (Naive)
function checkHardcoded() {
    console.log('\n--- 3. Scanning for hardcoded JSX strings (Experimental) ---');
    // Look for <Text>Something</Text> where Something is not {variable}
    try {
        const output = execSync(`grep -rP "<Text>[\\w\\s]+</Text>" "${SRC_DIR}" --include=*.{js,tsx,jsx}`).toString();
        const lines = output.split('\n').filter(x => x.trim());
        if (lines.length > 0) {
            console.log(`Found ${lines.length} potential hardcoded strings in <Text>:`);
            lines.slice(0, 10).forEach(l => console.log(`  ${l.trim().substring(0, 100)}...`));
        } else {
            console.log("No obvious hardcoded <Text> nodes found.");
        }
    } catch {
        // grep might fail if no matches
        console.log("No hardcoded strings found (or grep failed).");
    }
}

function main() {
    const enContent = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'en.json'), 'utf8'));
    const locales = {};
    fs.readdirSync(LOCALES_DIR).forEach(f => {
        if (f.endsWith('.json')) {
            locales[f.split('.')[0]] = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, f), 'utf8'));
        }
    });

    checkUntranslated(locales, enContent);
    checkUnused(enContent);
    checkHardcoded();
}

main();

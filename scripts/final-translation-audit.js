const fs = require('fs');
const path = require('path');
const glob = require('glob'); // Expecting users might not have glob installed, so I will implement a simple recursive walker.

const SRC_DIR = path.join(__dirname, '../src');
const LOCALES_DIR = path.join(__dirname, '../app/i18n/locales');
const LANGUAGES = ['en', 'ru', 'kk', 'fr'];

// --- Helpers ---

// Recursive file walker
function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else {
            callback(path.join(dir, f));
        }
    });
}

// Flatten object keys: { a: { b: 1 } } -> { 'a.b': 1 }
function flattenKeys(obj, prefix = '') {
    let keys = {};
    for (let key in obj) {
        let newKey = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            Object.assign(keys, flattenKeys(obj[key], newKey));
        } else {
            keys[newKey] = obj[key];
        }
    }
    return keys;
}

// --- Main Audit ---

function audit() {
    console.log('🚀 Starting Final Comprehensive Translation Audit...\n');

    // 1. Load Locales
    console.log('1. Loading Locale Files...');
    const locales = {};
    const flatLocales = {};

    LANGUAGES.forEach(lang => {
        try {
            const p = path.join(LOCALES_DIR, `${lang}.json`);
            locales[lang] = JSON.parse(fs.readFileSync(p, 'utf8'));
            flatLocales[lang] = flattenKeys(locales[lang]);
            console.log(`   ✅ Loaded ${lang} (${Object.keys(flatLocales[lang]).length} keys)`);
        } catch (e) {
            console.error(`   ❌ Failed to load ${lang}:`, e.message);
        }
    });

    // 2. Cross-Language Consistency (Base: EN)
    console.log('\n2. Checking Consistency across Languages (vs EN)...');
    const enKeys = Object.keys(flatLocales['en'] || {});
    LANGUAGES.filter(l => l !== 'en').forEach(lang => {
        const targetKeys = flatLocales[lang] || {};
        const missing = enKeys.filter(k => !targetKeys.hasOwnProperty(k));
        if (missing.length > 0) {
            console.log(`   ⚠️  ${lang.toUpperCase()} missing ${missing.length} keys vs EN`);
            // Show first 5 for brevity
            missing.slice(0, 5).forEach(k => console.log(`      - ${k}`));
            if (missing.length > 5) console.log(`      ... and ${missing.length - 5} more`);
        } else {
            console.log(`   ✅ ${lang.toUpperCase()} is complete relative to EN`);
        }
    });

    // 3. Scan Code for Key Usage
    console.log('\n3. Scanning Codebase for Key Usage...');
    const usedKeys = new Set();
    const hardcodedCandidates = [];

    // Regex for t('key') or t("key")
    const keyRegex = /\bt\(['"]([a-zA-Z0-9_.]+)['"](?:,\s*['"]?.*['"]?)?\)/g;

    // Regex for potential hardcoded text: <Text>Something</Text> or <Label>Something</Label>
    // Exclude imports, styles, numbers, empty, single chars
    const jsxTextRegex = />\s*([^<>{}\n]+)\s*</g;

    // Walker
    walkDir(SRC_DIR, (filePath) => {
        if (!filePath.match(/\.(js|ts|tsx|jsx)$/)) return;

        const content = fs.readFileSync(filePath, 'utf8');
        const filename = path.basename(filePath);

        // Extract t('keys')
        let match;
        while ((match = keyRegex.exec(content)) !== null) {
            usedKeys.add(match[1]);
        }

        // Check hardcoded
        while ((match = jsxTextRegex.exec(content)) !== null) {
            const text = match[1].trim();
            // Filter noise
            if (
                text.length < 2 ||
                !isNaN(Number(text)) ||
                text.includes('tokens.') ||
                ['null', 'undefined', 'true', 'false'].includes(text)
            ) continue;

            // Heuristic: valid text usually has letters
            if (!/[a-zA-Z]/.test(text)) continue;

            hardcodedCandidates.push({ file: filename, text, line: '?' });
        }
    });

    console.log(`   Found ${usedKeys.size} unique translation keys used in code.`);

    // 4. Validate Used Keys against EN
    console.log('\n4. Validating Used Keys in EN...');
    let missingInEn = 0;
    usedKeys.forEach(k => {
        // Skip dynamic keys containing ${} if regex caught them (basic regex mostly catches literals, but just in case)
        if (k.includes('${') || k.includes('+')) return;

        if (!flatLocales['en'][k]) {
            console.log(`   ❌ Key used in code but missing in EN: "${k}"`);
            missingInEn++;
        }
    });
    if (missingInEn === 0) console.log('   ✅ All static keys used in code exist in EN.');

    // 5. Report Potential Hardcoded Strings
    console.log('\n5. Potential Hardcoded Strings (Top 20 candidates)...');
    // Group by text to avoid dups
    const uniqueHardcoded = {};
    hardcodedCandidates.forEach(c => {
        if (!uniqueHardcoded[c.text]) uniqueHardcoded[c.text] = [];
        uniqueHardcoded[c.text].push(c.file);
    });

    const sortedHardcoded = Object.entries(uniqueHardcoded).slice(0, 20);
    if (sortedHardcoded.length === 0) {
        console.log('   ✅ No obvious hardcoded strings found.');
    } else {
        sortedHardcoded.forEach(([text, files]) => {
            // Only show if it doesn't look like a value displayed from props (e.g. no known variable patterns)
            // This is heuristic only.
            console.log(`   ⚠️  "${text}" in [${files.slice(0, 2).join(', ')}${files.length > 2 ? '...' : ''}]`);
        });
        console.log(`   (and ${Object.keys(uniqueHardcoded).length - sortedHardcoded.length} more potential candidates)`);
    }

    console.log('\nAudit Complete.');
}

audit();

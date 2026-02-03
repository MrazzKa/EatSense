const fs = require('fs');
const path = require('path');

// Configuration
const LOCALE_DIR = path.join(__dirname, '../app/i18n/locales');
const MASTER_LANG = 'en';
const TARGET_LANGS = ['ru', 'kk', 'fr']; // Russian, Kazakh, French

// Helper to flatten object keys (e.g. { a: { b: 1 } } -> "a.b")
function flattenKeys(obj, prefix = '') {
    let keys = [];
    for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            keys = keys.concat(flattenKeys(obj[key], prefix + key + '.'));
        } else {
            keys.push(prefix + key);
        }
    }
    return keys;
}

// Helper to get value by dot info path
function getValue(obj, path) {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

function runAudit() {
    console.log('Starting Translation Audit...');
    console.log(`Locales Directory: ${LOCALE_DIR}`);

    // 1. Load Master Language (EN)
    const masterPath = path.join(LOCALE_DIR, `${MASTER_LANG}.json`);
    if (!fs.existsSync(masterPath)) {
        console.error(`CRITICAL: Master locale file not found at ${masterPath}`);
        process.exit(1);
    }

    const masterContent = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
    const masterKeys = new Set(flattenKeys(masterContent));
    console.log(`Loaded Master (${MASTER_LANG}): ${masterKeys.size} keys`);

    const results = {};

    // 2. Check Target Languages
    TARGET_LANGS.forEach(lang => {
        const langPath = path.join(LOCALE_DIR, `${lang}.json`);
        results[lang] = {
            missing: [],
            extra: [],
            empty: []
        };

        if (!fs.existsSync(langPath)) {
            console.error(`WARNING: Locale file for '${lang}' not found at ${langPath}`);
            return;
        }

        try {
            const content = JSON.parse(fs.readFileSync(langPath, 'utf8'));
            const keys = new Set(flattenKeys(content));

            console.log(`Loaded ${lang}: ${keys.size} keys`);

            // Check for missing keys (present in EN, missing in LANG)
            masterKeys.forEach(key => {
                if (!keys.has(key)) {
                    results[lang].missing.push(key);
                }
            });

            // Check for extra keys (present in LANG, missing in EN)
            keys.forEach(key => {
                if (!masterKeys.has(key)) {
                    results[lang].extra.push(key);
                } else {
                    // Check for empty values
                    const val = getValue(content, key);
                    if (typeof val === 'string' && val.trim() === '') {
                        results[lang].empty.push(key);
                    }
                }
            });

        } catch (e) {
            console.error(`Error parsing ${lang}.json: ${e.message}`);
        }
    });

    // 3. Output Report
    console.log('\n=== AUDIT REPORT ===');

    TARGET_LANGS.forEach(lang => {
        const stats = results[lang];
        if (!stats) return;

        console.log(`\n[${lang.toUpperCase()}]`);

        if (stats.missing.length === 0 && stats.extra.length === 0 && stats.empty.length === 0) {
            console.log('✅ Perfect match with Master!');
        } else {
            if (stats.missing.length > 0) {
                console.log(`❌ Missing Keys (${stats.missing.length}):`);
                stats.missing.slice(0, 20).forEach(k => console.log(`  - ${k}`));
                if (stats.missing.length > 20) console.log(`  ... and ${stats.missing.length - 20} more`);
            }

            if (stats.empty.length > 0) {
                console.log(`⚠️ Empty Values (${stats.empty.length}):`);
                stats.empty.slice(0, 10).forEach(k => console.log(`  - ${k}`));
            }

            if (stats.extra.length > 0) {
                console.log(`ℹ️ Extra/Orphaned Keys (${stats.extra.length}):`);
                stats.extra.slice(0, 10).forEach(k => console.log(`  - ${k}`));
            }
        }
    });

    // Save full JSON report for the user to send back
    const reportPath = path.join(__dirname, 'translation_audit_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\nDetailed JSON report saved to: ${reportPath}`);
}

runAudit();

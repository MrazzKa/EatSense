
const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../app/i18n/locales');
const TARGETS = ['ru', 'kk', 'fr'];
const WHITELIST = ['cm', 'kg', 'g', 'mg', 'kcal', 'ml', 'l', 'calories', 'analyses', 'monitor', 'reduce'];

const sourcePath = path.join(LOCALES_DIR, 'en.json');
if (!fs.existsSync(sourcePath)) {
    console.error('Source en.json not found at ' + sourcePath);
    process.exit(1);
}
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

// Recursive verify function
function verify(sourceObj, targetObj, prefix = '', issues = []) {
    if (typeof sourceObj !== typeof targetObj) {
        issues.push({ k: prefix, type: 'TYPE_MISMATCH', v: `Exp: ${typeof sourceObj}, Got: ${typeof targetObj}` });
        return;
    }

    if (typeof sourceObj === 'object' && sourceObj !== null) {
        for (const key in sourceObj) {
            const p = prefix ? `${prefix}.${key}` : key;
            if (targetObj[key] === undefined) {
                issues.push({ k: p, type: 'MISSING' });
            } else {
                verify(sourceObj[key], targetObj[key], p, issues);
            }
        }
        return;
    }

    // It's a primitive (likely string)
    const sourceVal = String(sourceObj);
    const targetVal = String(targetObj);

    if (targetVal === '') {
        issues.push({ k: prefix, type: 'EMPTY' });
        return;
    }

    // Suspicious Check
    if (!WHITELIST.includes(targetVal.toLowerCase())) {
        const keyPart = prefix.split('.').pop();
        if (targetVal === prefix || targetVal === keyPart) {
            issues.push({ k: prefix, type: 'SUSPICIOUS', v: targetVal });
        }
    }

    // Placeholder Check ({{...}})
    if (prefix.includes('shareMessage')) {
        console.log(`DEBUG: Checking ${prefix}. Source: "${sourceVal}", Target: "${targetVal}"`);
    }

    const sourcePlaceholders = (sourceVal.match(/\{\{([^}]+)\}\}/g) || []).sort();
    const targetPlaceholders = (targetVal.match(/\{\{([^}]+)\}\}/g) || []).sort();

    if (JSON.stringify(sourcePlaceholders) !== JSON.stringify(targetPlaceholders)) {
        issues.push({ k: prefix, type: 'PLACEHOLDER_MISMATCH', v: `Exp: ${sourcePlaceholders.join(',')}, Got: ${targetPlaceholders.join(',')}` });
    }
}

let err = false;
console.log('Checking translation quality (Deep Scan)...');

TARGETS.forEach(lang => {
    const p = path.join(LOCALES_DIR, `${lang}.json`);
    if (!fs.existsSync(p)) return;
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    const issues = [];

    verify(source, data, '', issues);

    if (issues.length) {
        err = true;
        console.log(`\n[${lang}] Issues found:`);
        issues.forEach(i => console.log(`  ${i.type} ${i.k} ${i.v ? '(' + i.v + ')' : ''}`));
        fs.writeFileSync(`quality_report_${lang}.json`, JSON.stringify(issues, null, 2));
    } else {
        console.log(`\n[${lang}] Clean.`);
        if (fs.existsSync(`quality_report_${lang}.json`)) fs.unlinkSync(`quality_report_${lang}.json`);
    }
});

if (err) process.exit(1);
console.log('\nAll good.');

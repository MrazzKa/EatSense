const fs = require('fs');
const path = require('path');

// Adjusted paths for this project structure
const srcDir = path.join(__dirname, '../src');
const appDir = path.join(__dirname, '../app'); // Also scan app dir just in case
const enJsonPath = path.join(__dirname, '../app/i18n/locales/en.json');

const usedKeys = new Set();

// Patterns to find keys
const patterns = [
    /t\(['"`]([^'"`]+)['"`]/g,           // t('key')
    /t\(['"`]([^'"`]+)['"`],/g,          // t('key', 'default')
    /\{t\(['"`]([^'"`]+)['"`]\)/g,       // {t('key')}
    /safeT\(['"`]([^'"`]+)['"`]/g,       // safeT('key') - seen in code
    /translate\(['"`]([^'"`]+)['"`]/g,   // translate('key')
];

function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');

    patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            usedKeys.add(match[1]);
        }
    });
}

function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory() && !file.includes('node_modules')) {
            scanDirectory(filePath);
        } else if (file.match(/\.(js|jsx|ts|tsx)$/)) {
            scanFile(filePath);
        }
    });
}

console.log('Scanning directories...');
scanDirectory(srcDir);
scanDirectory(appDir);

// Load existing translations
let enKeys = [];
try {
    const enJson = JSON.parse(fs.readFileSync(enJsonPath, 'utf8'));

    function getKeys(obj, prefix = '') {
        let keys = [];
        for (const key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                keys = keys.concat(getKeys(obj[key], prefix + key + '.'));
            } else {
                keys.push(prefix + key);
            }
        }
        return keys;
    }

    enKeys = getKeys(enJson);
} catch (e) {
    console.error('Error reading en.json:', e.message);
}

// Find missing
const missing = [...usedKeys].filter(k => !enKeys.includes(k));

console.log('=== MISSING KEYS (Used in code but not in en.json) ===');
console.log(missing.sort().join('\n'));

console.log('\n=== STATS ===');
console.log('Total used keys found:', usedKeys.size);
console.log('Total keys in en.json:', enKeys.length);
console.log('Missing keys:', missing.length);

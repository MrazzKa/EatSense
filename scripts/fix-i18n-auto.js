const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'app', 'i18n', 'locales');
const EXTRACTED_KEYS_PATH = path.join(__dirname, '..', 'app', 'i18n', 'extracted-keys.json');

// Helper to recursively flatten keys
const flattenKeys = (obj, prefix = '') => {
    return Object.keys(obj).reduce((acc, key) => {
        const value = obj[key];
        const nextKey = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            acc.push(...flattenKeys(value, nextKey));
        } else {
            acc.push(nextKey);
        }
        return acc;
    }, []);
};

// Helper to set value at path
function set(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!current[key] || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }
    current[keys[keys.length - 1]] = value;
}

// Helper to unset value at path and cleanup empty parents
function unset(obj, path) {
    const keys = path.split('.');
    let current = obj;
    const stack = [];

    // Navigate to the property
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!current[key]) return; // Path doesn't exist
        stack.push({ obj: current, key });
        current = current[key];
    }

    // Delete the leaf property
    const leafKey = keys[keys.length - 1];
    delete current[leafKey];

    // cleanup empty parents
    for (let i = stack.length - 1; i >= 0; i--) {
        const { obj: parent, key } = stack[i];
        if (Object.keys(parent[key]).length === 0) {
            delete parent[key];
        } else {
            break; // Stop if parent is not empty
        }
    }
}

function get(obj, path) {
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
        if (!current) return undefined;
        current = current[key];
    }
    return current;
}

const main = () => {
    console.log('Starting i18n synchronization...');

    // 1. Load EN source
    const enPath = path.join(LOCALES_DIR, 'en.json');
    if (!fs.existsSync(enPath)) {
        console.error('Error: en.json not found!');
        process.exit(1);
    }
    const enContent = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const enKeys = flattenKeys(enContent);

    // 2. Load extracted keys report if available (to add missing keys to EN first)
    if (fs.existsSync(EXTRACTED_KEYS_PATH)) {
        const extracted = JSON.parse(fs.readFileSync(EXTRACTED_KEYS_PATH, 'utf8'));
        const missingInEn = extracted.missingInEn || [];

        if (missingInEn.length > 0) {
            console.log(`Adding ${missingInEn.length} missing extracted keys to en.json...`);
            missingInEn.forEach(key => {
                const existingValue = get(enContent, key);
                if (existingValue && typeof existingValue === 'object') {
                    console.log(`  Skipping ${key}: conflicts with existing object structure in en.json`);
                    return;
                }

                const parts = key.split('.');
                const lastPart = parts[parts.length - 1];
                const defaultValue = lastPart.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                set(enContent, key, defaultValue);
                enKeys.push(key); // Add to local list for subsequent syncs
            });
            fs.writeFileSync(enPath, JSON.stringify(enContent, null, 2));
            console.log('Updated en.json with extracted keys.');
        }
    }

    // 3. Sync all other locales
    const files = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json') && f !== 'en.json');

    for (const file of files) {
        const filePath = path.join(LOCALES_DIR, file);
        const localeName = path.parse(file).name;
        console.log(`\nProcessing ${localeName}...`);

        let localeContent;
        try {
            localeContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch {
            console.error(`Error reading ${file}, skipping.`);
            continue;
        }

        const localeKeys = flattenKeys(localeContent);

        // Find missing keys (in EN but not in Locale)
        const missingKeys = enKeys.filter(k => !localeKeys.includes(k));

        // Find extra keys (in Locale but not in EN)
        const extraKeys = localeKeys.filter(k => !enKeys.includes(k));

        if (missingKeys.length === 0 && extraKeys.length === 0) {
            console.log(`  Already in sync.`);
            continue;
        }

        // Remove extra keys (do this FIRST to avoid deleting newly added structured keys if they conflict with old string keys)
        if (extraKeys.length > 0) {
            console.log(`  Removing ${extraKeys.length} extra keys...`);
            extraKeys.forEach(key => {
                unset(localeContent, key);
            });
        }

        // Add missing keys
        if (missingKeys.length > 0) {
            console.log(`  Adding ${missingKeys.length} missing keys...`);
            missingKeys.forEach(key => {
                const enValue = get(enContent, key);
                set(localeContent, key, `[MISSING] ${enValue}`);
            });
        }

        // Save file
        fs.writeFileSync(filePath, JSON.stringify(localeContent, null, 2));
        console.log(`  Updated ${file}`);
    }

    console.log('\nSynchronization complete.');
};

main();

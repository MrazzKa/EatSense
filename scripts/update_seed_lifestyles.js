
const fs = require('fs');
const path = require('path');

// Configuration
// Use process.cwd() assuming we run from project root
const localesDir = path.join(process.cwd(), 'app/i18n/locales');
const seedFile = path.join(process.cwd(), 'apps/api/prisma/seeds/seed-lifestyles.ts');

const languages = ['en', 'ru', 'kk', 'fr'];
const locales = {};

// Load translation files
languages.forEach(lang => {
    try {
        const content = fs.readFileSync(path.join(localesDir, `${lang}.json`), 'utf8');
        locales[lang] = JSON.parse(content);
    } catch (e) {
        console.error(`Failed to load ${lang}.json`, e);
    }
});

let seedContent = '';
try {
    seedContent = fs.readFileSync(seedFile, 'utf8');
} catch (e) {
    console.error(`Failed to load seed file at ${seedFile}`, e);
    process.exit(1);
}

// Function to find value in nested object
function getValue(obj, pathParts) {
    let current = obj;
    for (const part of pathParts) {
        if (current === undefined || current === null) return undefined;
        current = current[part];
    }
    return current;
}

// Helper to find translation for a key
function findTranslation(keyChain) {
    const result = {};
    let found = false;

    // Try exact match first
    for (const lang of languages) {
        if (!locales[lang]) continue;
        const val = getValue(locales[lang], keyChain);
        if (val) {
            result[lang] = val;
            found = true;
        }
    }

    if (found) return result;

    // Try replacing hyphens with underscores in the slug (3rd part usually)
    // keyChain: programs, diet/lifestyle, slug, field
    if (keyChain.length >= 3) {
        const slugIndex = 2; // 0=programs, 1=type, 2=slug
        const originalSlug = keyChain[slugIndex];
        const underscoreSlug = originalSlug.replace(/-/g, '_');

        if (originalSlug !== underscoreSlug) {
            const underscoreKeyChain = [...keyChain];
            underscoreKeyChain[slugIndex] = underscoreSlug;

            let foundUnderscore = false;
            for (const lang of languages) {
                if (!locales[lang]) continue;
                const val = getValue(locales[lang], underscoreKeyChain);
                if (val) {
                    result[lang] = val;
                    foundUnderscore = true;
                }
            }
            if (foundUnderscore) return result;
        }
    }

    return null;
}

// Replacer for standard fields (name, description, shortDescription, subtitle)
// Added 'subtitle' to regex
const fieldRegex = /(name|description|shortDescription|subtitle):\s*'([^']+)'/g;

let updatedContent = seedContent.replace(fieldRegex, (match, field, keyString) => {
    if (!keyString.startsWith('programs.')) return match;

    const keyParts = keyString.split('.');
    const translations = findTranslation(keyParts);

    if (translations) {
        const entries = languages.map(lang => {
            const val = translations[lang] || translations['en'];
            const safeVal = val ? val.replace(/'/g, "\\'") : '';
            return `${lang}: '${safeVal}'`;
        });

        return `${field}: { ${entries.join(', ')} }`;
    } else {
        console.warn(`Translation not found for key: ${keyString}`);
        return match;
    }
});

// Replacer for dailyTracker labels
const labelRegex = /label:\s*'([^']+)'/g;
updatedContent = updatedContent.replace(labelRegex, (match, keyString) => {
    if (!keyString.startsWith('programs.')) return match;
    const keyParts = keyString.split('.');
    const translations = findTranslation(keyParts);

    if (translations) {
        const entries = languages.map(lang => {
            const val = translations[lang] || translations['en'];
            const safeVal = val ? val.replace(/'/g, "\\'") : '';
            return `${lang}: '${safeVal}'`;
        });
        return `label: { ${entries.join(', ')} }`;
    } else {
        console.warn(`Translation not found for label key: ${keyString}`);
        return match;
    }
});

// Write result
fs.writeFileSync(seedFile, updatedContent, 'utf8');
console.log('Successfully updated seed-lifestyles.ts');

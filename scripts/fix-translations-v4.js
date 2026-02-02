const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../app/i18n/locales');
// Only processing FR
const TARGET_LOCALES = ['fr'];

// Helper to load JSON
function loadLocale(locale) {
    try {
        return JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, `${locale}.json`), 'utf8'));
    } catch (e) {
        return {};
    }
}

// Helper to save JSON
function saveLocale(locale, data) {
    fs.writeFileSync(path.join(LOCALES_DIR, `${locale}.json`), JSON.stringify(data, null, 2), 'utf8');
}

// Deep merge
function deepMerge(target, source) {
    for (const key in source) {
        if (source[key] instanceof Object && !Array.isArray(source[key])) {
            if (target[key] !== undefined && (!(target[key] instanceof Object) || Array.isArray(target[key]))) {
                target[key] = {};
            }
            if (!target[key]) target[key] = {};
            deepMerge(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    }
    return target;
}

const FIXES = {
    fr: {
        dietPrograms: {
            categories: {
                all: "Tout",
                hollywood: "Hollywood",
                athletes: "Athlètes",
                historical: "Historique"
            },
            difficulty: {
                easy: "Facile",
                medium: "Moyen",
                hard: "Difficile"
            }
        }
    }
};

console.log("--- Starting Translation Fix V4 ---");

TARGET_LOCALES.forEach(locale => {
    console.log(`Processing ${locale}...`);
    let data = loadLocale(locale);

    if (FIXES[locale]) {
        deepMerge(data, FIXES[locale]);
    }

    saveLocale(locale, data);
});

console.log("--- Fixes (V4) Applied ---");

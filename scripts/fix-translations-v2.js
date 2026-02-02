const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../app/i18n/locales');
const TARGET_LOCALES = ['en', 'ru', 'kk', 'fr'];

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
    console.log(`✅ Saved ${locale}.json`);
}

// Better deep merge that replaces primitives with objects if needed
function deepMerge(target, source) {
    for (const key in source) {
        // If source key is object (and not array/null)
        if (source[key] instanceof Object && !Array.isArray(source[key])) {
            // If target has this key but it is NOT an object (e.g. string conflict), overwrite it
            if (target[key] !== undefined && (!(target[key] instanceof Object) || Array.isArray(target[key]))) {
                console.warn(`⚠️ Overwriting primitive/array at ${key} with object`);
                target[key] = {};
            }
            // If target doesn't have key, init it
            if (!target[key]) {
                target[key] = {};
            }
            // Recurse
            deepMerge(target[key], source[key]);
        } else {
            // Source is primitive or array, just overwrite
            target[key] = source[key];
        }
    }
    return target;
}

// Cleanup function to remove numerical keys from objects (artifacts of bad merge)
function cleanNumericalKeys(obj) {
    if (obj instanceof Object && !Array.isArray(obj)) {
        // Check if object has "0", "1", ... keys AND other keys
        const keys = Object.keys(obj);
        const numKeys = keys.filter(k => /^\d+$/.test(k));

        // If we have numerical keys, delete them
        if (numKeys.length > 0) {
            console.log(`Cleaning ${numKeys.length} numerical keys from object...`);
            numKeys.forEach(k => delete obj[k]);
        }

        // Recurse
        for (const key in obj) {
            cleanNumericalKeys(obj[key]);
        }
    }
}

const FIXES = {
    en: {
        experts: {
            dietitian: { title: "Dietitian" },
            nutritionist: { title: "Nutritionist" }
        },
        reports: {
            error: {
                generic: "Error generating report",
                noDirectory: "Download not available in Expo Go.",
                network: "Network error.",
                openFailed: "Failed to open report file."
            }
        },
        profile: {
            health: {
                chronotype: { early: "Early Bird", mid: "Intermediate", late: "Night Owl" },
                drugType: { semaglutide: "Semaglutide", tirzepatide: "Tirzepatide", liraglutide: "Liraglutide" }
            }
        }
    },
    ru: {
        experts: {
            dietitian: { title: "Диетолог" },
            nutritionist: { title: "Нутрициолог" }
        },
        reports: {
            error: {
                generic: "Ошибка генерации отчета",
                noDirectory: "Скачивание недоступно в Expo Go.",
                network: "Ошибка сети.",
                openFailed: "Не удалось открыть отчет."
            }
        },
        profile: {
            health: {
                chronotype: { early: "Жаворонок", mid: "Голубь", late: "Сова" },
                drugType: { semaglutide: "Семаглутид", tirzepatide: "Тирзепатид", liraglutide: "Лираглутид" }
            }
        },
        dashboard: { activeDiet: { streak_count: "" } } // Fallback
    },
    kk: {
        experts: {
            dietitian: { title: "Диетолог" },
            nutritionist: { title: "Нутрициолог" }
        },
        reports: {
            error: {
                generic: "Есеп жасау қатесі",
                noDirectory: "Expo Go-да жүктеу қолжетімсіз.",
                network: "Желі қатесі.",
                openFailed: "Есепті ашу мүмкін емес."
            }
        },
        profile: {
            health: {
                chronotype: { early: "Ерте тұратын", mid: "Орташа", late: "Кеш ұйықтайтын" },
                drugType: { semaglutide: "Семаглутид", tirzepatide: "Тирзепатид", liraglutide: "Лираглутид" }
            }
        },
        dashboard: { activeDiet: { streak_count: "" } }
    },
    fr: {
        experts: {
            dietitian: { title: "Diététicien" },
            nutritionist: { title: "Nutritionniste" }
        },
        reports: {
            error: {
                generic: "Erreur de rapport",
                noDirectory: "Téléchargement indisponible.",
                network: "Erreur réseau.",
                openFailed: "Échec de l'ouverture."
            }
        },
        profile: {
            health: {
                chronotype: { early: "Lève-tôt", mid: "Intermédiaire", late: "Couche-tard" },
                drugType: { semaglutide: "Sémaglutide", tirzepatide: "Tirzépatide", liraglutide: "Liraglutide" }
            }
        },
        dashboard: { activeDiet: { streak_count: "" } }
    }
};

console.log("--- Starting Translation Fix V2 ---");

TARGET_LOCALES.forEach(locale => {
    console.log(`Processing ${locale}...`);
    let data = loadLocale(locale);

    // 1. Clean numerical keys (artifacts)
    cleanNumericalKeys(data);

    // 2. Apply complex fixes
    if (FIXES[locale]) {
        deepMerge(data, FIXES[locale]);
    }

    saveLocale(locale, data);
});

console.log("--- Fixes (V2) Applied ---");

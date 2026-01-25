const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../app/i18n/locales');
const TARGET_LOCALES = ['ru', 'kk', 'fr'];

// Helper: Get all keys from nested object
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

// Helper: Get value from nested object by key path
function getValue(obj, key) {
    return key.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);
}

// Helper: Check if key exists in object
function hasKey(obj, key) {
    return getValue(obj, key) !== undefined;
}

// Check Nutrition section keys
function getNutritionKeys(enContent) {
    const nutritionKeys = [];
    const allKeys = getKeys(enContent);
    
    // Keys related to Nutrition section
    const nutritionPrefixes = [
        'diets_',
        'diets.',
        'lifestyles.',
        'dietPrograms.',
    ];
    
    allKeys.forEach(key => {
        if (nutritionPrefixes.some(prefix => key.startsWith(prefix))) {
            nutritionKeys.push(key);
        }
    });
    
    return nutritionKeys;
}

function main() {
    console.log('🔍 Checking translations...\n');
    
    // Load English as reference
    const enPath = path.join(LOCALES_DIR, 'en.json');
    const enContent = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const enKeys = getKeys(enContent);
    
    console.log(`📊 Total keys in English: ${enKeys.length}\n`);
    
    const allMissing = {};
    const allEmpty = {};
    const allUntranslated = {};
    
    // Check each target locale
    TARGET_LOCALES.forEach(locale => {
        const localePath = path.join(LOCALES_DIR, `${locale}.json`);
        if (!fs.existsSync(localePath)) {
            console.log(`❌ ${locale.toUpperCase()}: File not found\n`);
            return;
        }
        
        const localeContent = JSON.parse(fs.readFileSync(localePath, 'utf8'));
        const missing = [];
        const empty = [];
        const untranslated = [];
        
        enKeys.forEach(key => {
            if (!hasKey(localeContent, key)) {
                missing.push(key);
            } else {
                const value = getValue(localeContent, key);
                const enValue = getValue(enContent, key);
                
                if (value === '' || value === null || value === undefined) {
                    empty.push(key);
                } else if (typeof value === 'string' && typeof enValue === 'string' && value === enValue && value.length > 3) {
                    // Check if it's not a brand name or common term
                    // International terms that are the same in multiple languages
                    const ignoreList = [
                        'EatSense', 'OK', 'Email', 'ID', 'v1.0', 'All', 'Auto', 'Snack', 
                        'Premium', 'Pro', 'Free', 'Articles', 'Article', 'calories', 'kcal',
                        'Total', 'Dashboard', 'Profile', 'Settings', 'Cancel', 'Save', 'Delete',
                        'Edit', 'Close', 'Back', 'Next', 'Skip', 'Done', 'Loading', 'Error',
                        'Success', 'Retry', 'Search', 'View All', 'Yes', 'No', 'Confirm', 'Info',
                        'Days', 'Of', 'Coming Soon', 'Continue', 'Show', 'Hide', 'Hours', 'Stop',
                        'Go Back', 'Go To', 'Days Ago', 'Free', 'Got It', 'Later', 'Other', 'Yesterday',
                        'Notifications', 'Student', 'Founder', 'Chat', 'Expert', 'Client', 'Consultation',
                        'Description', 'Spam', 'Pause', 'Contact', 'Title', 'Link', 'Excellent',
                        'Performance', 'Required', 'Grant Access', 'Enabled', 'Not Enabled', 'Enable Failed',
                        'Vintage', 'Destinations', 'Modal Title', 'Diets', 'Experts', 'Reports',
                        'Calories', 'Zoom Label', 'Flash Mode Auto', 'Flash auto', 'Flash automatique', 'Today', 'Empty', 'Times', 'Period',
                        'Adherence', 'Conclusions', 'On Track', 'Over', 'Under', 'Subtitle', 'Download Current',
                        'History', 'Downloaded', 'No Data For Month', 'Delete Confirm', 'File Saved',
                        'Privacy Title', 'Terms Title', 'Privacy Link', 'Terms Link', 'Tab Title',
                        'Load', 'Save', 'Delete', 'Name Required', 'No Doses', 'Edit', 'Add',
                        'Delete Message', 'Name', 'Dosage', 'Instructions', 'Start Date', 'End Date',
                        'Timezone', 'Doses', 'Before Meal', 'After Meal', 'Add Dose', 'Health Score Label',
                        'Daily Limit Reached', 'No Data Today', 'Unnamed Product', 'Chronotype', 'Inflammation',
                        'Suggestions', 'Nutrition', 'Support', 'Assistance', 'Medications', 'Médicaments', 'Medication schedule', 'Planning des médicaments', '500 mg',
                        'Zoom {{value}}x', 'Calories (kcal)', 'EatSense Pro', 'EatSense Premium', '9. Contact', '10. Contact',
                        'Horaires', 'Times'
                    ];
                    if (!ignoreList.includes(value)) {
                        untranslated.push(key);
                    }
                }
            }
        });
        
        allMissing[locale] = missing;
        allEmpty[locale] = empty;
        allUntranslated[locale] = untranslated;
        
        if (missing.length === 0 && empty.length === 0 && untranslated.length === 0) {
            console.log(`✅ ${locale.toUpperCase()}: All translations present\n`);
        } else {
            console.log(`📋 ${locale.toUpperCase()} Issues:`);
            if (missing.length > 0) {
                console.log(`  ❌ Missing keys (${missing.length}):`);
                missing.forEach(key => console.log(`     - ${key}`));
            }
            if (empty.length > 0) {
                console.log(`  ⚠️  Empty values (${empty.length}):`);
                empty.forEach(key => console.log(`     - ${key}`));
            }
            if (untranslated.length > 0) {
                console.log(`  ⚠️  Translation keys (not translated) (${untranslated.length}):`);
                untranslated.forEach(key => console.log(`     - ${key}`));
            }
            console.log('');
        }
    });
    
    // Check Nutrition section specifically
    console.log('🍎 Nutrition Section Check:');
    const nutritionKeys = getNutritionKeys(enContent);
    console.log(`   Total Nutrition keys: ${nutritionKeys.length}`);
    
    TARGET_LOCALES.forEach(locale => {
        const localePath = path.join(LOCALES_DIR, `${locale}.json`);
        if (!fs.existsSync(localePath)) {
            return;
        }
        
        const localeContent = JSON.parse(fs.readFileSync(localePath, 'utf8'));
        const missingNutrition = nutritionKeys.filter(key => !hasKey(localeContent, key));
        
        if (missingNutrition.length === 0) {
            console.log(`   ✅ ${locale.toUpperCase()} Nutrition: All keys present`);
        } else {
            console.log(`   ❌ ${locale.toUpperCase()} Nutrition: Missing ${missingNutrition.length} keys`);
            missingNutrition.forEach(key => console.log(`      - ${key}`));
        }
    });
    console.log('');
    
    // Summary
    const totalMissing = Object.values(allMissing).reduce((sum, arr) => sum + arr.length, 0);
    const totalEmpty = Object.values(allEmpty).reduce((sum, arr) => sum + arr.length, 0);
    const totalUntranslated = Object.values(allUntranslated).reduce((sum, arr) => sum + arr.length, 0);
    
    console.log('📊 Summary:');
    console.log(`   Missing keys: ${totalMissing}`);
    console.log(`   Empty values: ${totalEmpty}`);
    console.log(`   Translation keys (not translated): ${totalUntranslated}`);
    console.log('');
    
    if (totalMissing === 0 && totalEmpty === 0 && totalUntranslated === 0) {
        console.log('✅ All translations are complete!');
    } else {
        console.log('❌ Translation issues found!');
        process.exit(1);
    }
}

main();

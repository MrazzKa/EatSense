const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../app/i18n/locales');
const files = fs.readdirSync(localesDir);

// 1. Update en.json
const enPath = path.join(localesDir, 'en.json');
const enContent = JSON.parse(fs.readFileSync(enPath, 'utf8'));

let enModified = false;
if (!enContent['diets_disclaimers_medical_short']) {
    enContent['diets_disclaimers_medical_short'] = 'Medical';
    enModified = true;
}

if (enModified) {
    fs.writeFileSync(enPath, JSON.stringify(enContent, null, 2));
    console.log('Updated en.json with missing keys.');
}

// 2. Process all files
files.forEach(file => {
    if (!file.endsWith('.json')) return;
    const filePath = path.join(localesDir, file);
    try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        let modified = false;

        // Remove diets_categories_*
        Object.keys(content).forEach(key => {
            if (key.startsWith('diets_categories_')) {
                delete content[key];
                modified = true;
            }
        });

        // Fix KK specific nesting
        if (file === 'kk.json') {
            // Check lifestyles.filters_age_label
            if (content['lifestyles.filters_age_label'] && typeof content['lifestyles.filters_age_label'] === 'object') {
                const obj = content['lifestyles.filters_age_label'];
                if (obj.label) content['lifestyles.filters_age_label'] = obj.label;
                // If there are other subkeys, map them if needed, but en.json doesn't seem to have age subkeys except label.
            }

            // Check lifestyles.filters_target_label
            if (content['lifestyles.filters_target_label'] && typeof content['lifestyles.filters_target_label'] === 'object') {
                const obj = content['lifestyles.filters_target_label'];

                if (obj.label) content['lifestyles.filters_target_label'] = obj.label;
                if (obj.all) content['lifestyles.filters_target_all'] = obj.all;
                if (obj.male) content['lifestyles.filters_target_male'] = obj.male;
                if (obj.female) content['lifestyles.filters_target_female'] = obj.female;

                // If the original was an object, we've now promoted its children. 
                // If we didn't replace the key with a string (because no .label), we might be in trouble.
                // usage in en.json is: "lifestyles.filters_target_label": "Target:",
                if (typeof content['lifestyles.filters_target_label'] === 'object') {
                    // Fallback if no label property found
                    content['lifestyles.filters_target_label'] = "Target:";
                }
                modified = true;
            }
        }

        if (modified) {
            fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
            console.log(`Cleaned ${file}`);
        }

    } catch (e) {
        console.error(`Error processing ${file}:`, e);
    }
});

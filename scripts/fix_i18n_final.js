const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../app/i18n/locales');
const files = fs.readdirSync(localesDir);

const mappings = {
    'diets_categories_weightLoss': 'diets_type_weight_loss',
    'diets_categories_health': 'diets_type_health',
    'diets_categories_performance': 'diets_type_sports',
    'diets_categories_medical': 'diets_type_medical',
};

const defaults = {
    'lifestyles.filters_target_all': 'All',
    'lifestyles.filters_target_male': 'Men',
    'lifestyles.filters_target_female': 'Women',
    'diets_status_active': 'Active',
    'diets_status_completed': 'Completed',
    'dashboard.mealTypes.snack': 'Snack'
};

files.forEach(file => {
    if (!file.endsWith('.json')) return;
    if (file === 'en.json') return;

    const filePath = path.join(localesDir, file);
    try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        let modified = false;

        // 1. Rename Keys
        for (const [oldKey, newKey] of Object.entries(mappings)) {
            if (content[oldKey]) {
                content[newKey] = content[oldKey];
                delete content[oldKey];
                modified = true;
            }
        }

        // 2. Flatten lifestyles.filters
        if (content.lifestyles && content.lifestyles.filters) {
            if (content.lifestyles.filters.target) {
                content['lifestyles.filters_target_label'] = content.lifestyles.filters.target;
            }
            if (content.lifestyles.filters.age) {
                content['lifestyles.filters_age_label'] = content.lifestyles.filters.age;
            }
            delete content.lifestyles.filters;
            modified = true;
        }

        // 3. Add Missing Keys
        for (const [key, value] of Object.entries(defaults)) {
            // Handle nested keys checks for dashboard.mealTypes.snack
            if (key === 'dashboard.mealTypes.snack') {
                if (content.dashboard && content.dashboard.mealTypes && !content.dashboard.mealTypes.snack) {
                    content.dashboard.mealTypes.snack = value;
                    modified = true;
                }
            } else {
                if (!content[key]) {
                    content[key] = value;
                    modified = true;
                }
            }
        }

        // 4. Special check for diets_lifestyle_label
        if (!content['diets_lifestyle_label']) {
            content['diets_lifestyle_label'] = content['diets_tabs_lifestyle'] || 'Lifestyle';
            modified = true;
        }

        if (modified) {
            // Sort keys for better diffs/readability (optional but good practice)
            // const sortedContent = Object.keys(content).sort().reduce((acc, key) => {
            //   acc[key] = content[key];
            //   return acc;
            // }, {});
            // Actually, keeping original order generally, but appending new keys. 
            // Just writing content back is fine.

            fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
            console.log(`Updated ${file}`);
        } else {
            console.log(`No changes for ${file}`);
        }

    } catch (e) {
        console.error(`Error processing ${file}:`, e);
    }
});

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../app/i18n/locales');
const files = fs.readdirSync(localesDir);

function flattenObject(obj, prefix = '') {
    const result = {};
    for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            const nested = flattenObject(obj[key], prefix + key + '_');
            Object.assign(result, nested);
        } else {
            result[prefix + key] = obj[key];
        }
    }
    return result;
}

files.forEach(file => {
    if (!file.endsWith('.json')) return;
    if (file === 'en.json') return; // Skip en.json as it is the reference

    const filePath = path.join(localesDir, file);
    try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (content.diets && typeof content.diets === 'object') {
            console.log(`Processing ${file}...`);
            const flattenedDiets = flattenObject(content.diets, 'diets_');

            // Merge flattened keys into root
            Object.assign(content, flattenedDiets);

            // Remove the nested diets object
            delete content.diets;

            fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
            console.log(`Updated ${file}`);
        } else {
            console.log(`Skipping ${file} (no nested diets object)`);
        }
    } catch (e) {
        console.error(`Error processing ${file}:`, e);
    }
});

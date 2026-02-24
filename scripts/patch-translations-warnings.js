const fs = require('fs');
const path = require('path');

const localesPath = path.join(__dirname, '..', 'app', 'i18n', 'locales');

// helper function to deeply set a value
function set(obj, path, value) {
    const keys = path.split('.');
    let curr = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!curr[k] || typeof curr[k] !== 'object') curr[k] = {};
        curr = curr[k];
    }
    curr[keys[keys.length - 1]] = value;
}

const kk = {
    "diets.tags.old_money": "Old Money",
    "programs.lifestyle.hot_girl_walk.name": "Hot Girl Walk"
};

const fr = {
    "common.normal": "Normal",
    "onboarding.healthConditions.hypertension": "Hypertension",
    "onboarding.healthConditions.allergies": "Allergies",
    "onboarding.obstacleTypes.stress": "Stress",
    "profile.bmiNormal": "Normal",
    "profile.health.drugType.liraglutide": "Liraglutide",
    "profile.health.focus.microbiome": "Microbiome",
    "diets.filters.sports": "Sports",
    "diets.tags.brunch": "Brunch",
    "diets.tags.discipline": "Discipline",
    "diets.tags.disco": "Disco",
    "diets.tags.flexible": "Flexible",
    "diets.tags.gatsby": "Gatsby",
    "diets.tags.glamour": "Glamour",
    "diets.tags.hollywood": "Hollywood",
    "diets.tags.kazakh": "Kazakh",
    "diets.tags.macros": "Macros",
    "diets.tags.simple": "Simple",
    "diets.tags.social": "Social",
    "diets.tags.sports": "Sports",
    "dietPrograms.categories.hollywood": "Hollywood",
    "medications.notes": "Notes",
    "medications.photo": "Photo",
    "analysisResults.portions": "Portions",
    "diets_sports": "Sports",
    "programs.lifestyle.soft_life.name": "Soft Life",
    "programs.lifestyle.mob_wife.name": "Mob Wife",
    "programs.lifestyle.summer_shred.name": "Summer Shred",
    "programs.lifestyle.hot_girl_walk.name": "Hot Girl Walk"
};

const dicts = { kk, fr };

for (const locale of ['kk', 'fr']) {
    const filePath = path.join(localesPath, `${locale}.json`);
    let data;
    try {
        data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) { continue; }

    let updatedCount = 0;
    for (const [key, value] of Object.entries(dicts[locale])) {
        if (value) {
            set(data, key, value);
            updatedCount++;
        }
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Translated ${updatedCount} warnings in ${locale}.json`);
}

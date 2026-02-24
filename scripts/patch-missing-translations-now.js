const fs = require('fs');
const path = require('path');

const localesPath = path.join(__dirname, '..', 'app', 'i18n', 'locales');
const enPath = path.join(localesPath, 'en.json');
const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// Helper to get nested value
function get(obj, path) {
    const keys = path.split('.');
    let curr = obj;
    for (const k of keys) {
        if (!curr) return undefined;
        curr = curr[k];
    }
    return curr;
}

// Helper to set nested value
function set(obj, pathStr, value) {
    const keys = pathStr.split('.');
    let curr = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!curr[k] || typeof curr[k] !== 'object') curr[k] = {};
        curr = curr[k];
    }
    curr[keys[keys.length - 1]] = value;
}

const ruTranslations = {
    'terms.sections.acceptance.title': '1. Принятие условий',
    'terms.sections.acceptance.content': 'При доступе к нашему сервису или его использовании вы соглашаетесь соблюдать эти условия. Если вы не согласны с какой-либо частью условий, вы не имеете права использовать сервис.',
    'terms.sections.changes.title': '8. Изменения условий',
    'terms.sections.changes.content': 'Мы оставляем за собой право в любое время по нашему собственному усмотрению изменять или заменять данные условия. Продолжение использования приложения после изменений означает согласие с новыми условиями.',
    'terms.sections.contact.title': '9. Связь с нами',
    'terms.sections.contact.content': 'Если у вас есть вопросы относительно этих Условий, пожалуйста, свяжитесь с нами по адресу: legal@eatsense.ch или по почте Rue Vignier 8, 1205.',
    'terms.sections.description.title': '2. Описание сервиса',
    'terms.sections.description.content': 'EatSense предоставляет инструменты для отслеживания питания, анализа продуктов и персонализированных рекомендаций по питанию с использованием искусственного интеллекта.',
    'terms.sections.intellectual.title': '6. Интеллектуальная собственность',
    'terms.sections.intellectual.content': 'Весь контент, функции и функциональность EatSense принадлежат нам и защищены законами об авторском праве и другими законами об интеллектуальной собственности.',
    'terms.sections.limitation.title': '7. Ограничение ответственности',
    'terms.sections.limitation.content': 'EatSense предоставляется «как есть» без гарантий. Мы не несем ответственности за любой ущерб в результате использования приложения.',
    'terms.sections.prohibited.title': '5. Запрещенное использование',
    'terms.sections.prohibited.content': 'Вы не можете использовать сервис для любых незаконных целей, для причинения вреда другим или нарушения каких-либо законов или правил.',
    'terms.sections.registration.title': '3. Регистрация аккаунта',
    'terms.sections.registration.content': 'Вы несете ответственность за сохранение конфиденциальности учетных данных вашего аккаунта. Вы соглашаетесь немедленно уведомить нас о любом несанкционированном использовании вашего аккаунта.',
    'terms.sections.userContent.title': '4. Пользовательский контент',
    'terms.sections.userContent.content': 'Вы сохраняете право собственности на контент, который вы загружаете. Загружая контент, вы предоставляете нам лицензию на его использование для предоставления сервиса и улучшения приложения.'
};

const missingRu = [
    'terms.sections.acceptance.content', 'terms.sections.acceptance.title',
    'terms.sections.changes.content', 'terms.sections.changes.title',
    'terms.sections.contact.content', 'terms.sections.contact.title',
    'terms.sections.description.content', 'terms.sections.description.title',
    'terms.sections.intellectual.content', 'terms.sections.intellectual.title',
    'terms.sections.limitation.content', 'terms.sections.limitation.title',
    'terms.sections.prohibited.content', 'terms.sections.prohibited.title',
    'terms.sections.registration.content', 'terms.sections.registration.title',
    'terms.sections.userContent.content', 'terms.sections.userContent.title'
];

const missingKkExtra = [
    'errors.limitReachedTitle', 'errors.limitReachedMessage',
    'tooltip.bmi.title', 'tooltip.bmi.body',
    'tooltip.whr.title', 'tooltip.whr.body',
    'tooltip.glp1.title', 'tooltip.glp1.body',
    'tooltip.kcal.title', 'tooltip.kcal.body',
    'tooltip.bmr.title', 'tooltip.bmr.body',
    'onboarding.name', 'onboarding.nameSubtitle', 'onboarding.namePlaceholder', 'onboarding.formulaExplanation',
    'dashboard.suggestedFood.trustText', 'analysis.trustText', 'analysis.disclaimer', 'analysis.viewSources',
    'diets.tags.bulk',
    'medications.takePhoto', 'medications.chooseFromGallery', 'medications.cameraPermissionDenied'
];

const missingFrExtra = [...missingKkExtra, 'subscription.freePlanBaseline'];

const applyMissing = (locale, keys) => {
    const fPath = path.join(localesPath, `${locale}.json`);
    const data = JSON.parse(fs.readFileSync(fPath, 'utf8'));
    let added = 0;

    for (const key of keys) {
        if (get(data, key) === undefined) {
            let val = get(enData, key);

            if (locale === 'ru' && ruTranslations[key]) {
                val = ruTranslations[key];
            }

            if (val !== undefined) {
                set(data, key, val);
                added++;
            } else {
                console.log(`Warning: Key ${key} not found in en.json!`);
            }
        }
    }

    fs.writeFileSync(fPath, JSON.stringify(data, null, 2));
    console.log(`Added ${added} missing keys to ${locale}.json`);
};

applyMissing('ru', missingRu);
applyMissing('kk', [...missingRu, ...missingKkExtra]);
applyMissing('fr', [...missingRu, ...missingFrExtra]);

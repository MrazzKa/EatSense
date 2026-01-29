const fs = require('fs');
const path = require('path');

const ruPath = path.join('app', 'i18n', 'locales', 'ru.json');
const ru = JSON.parse(fs.readFileSync(ruPath, 'utf8'));

// Add missing profile keys
if (!ru.profile) ru.profile = {};
ru.profile.unitsMetric = 'Метрическая';
ru.profile.autoSave = 'Автосохранение в галерею';
ru.profile.planPremium = 'Премиум';

// Add missing errorBoundary keys
if (!ru.errorBoundary) ru.errorBoundary = {};
ru.errorBoundary.crashed = 'Приложение остановилось';
ru.errorBoundary.debugMessage = 'Экран отладки. Сбор трассировки стека.';

fs.writeFileSync(ruPath, JSON.stringify(ru, null, 2));
console.log('RU translations updated');

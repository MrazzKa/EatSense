const fs = require('fs');
const path = require('path');

const enPath = path.join('app', 'i18n', 'locales', 'en.json');
const ruPath = path.join('app', 'i18n', 'locales', 'ru.json');
const kkPath = path.join('app', 'i18n', 'locales', 'kk.json');
const frPath = path.join('app', 'i18n', 'locales', 'fr.json');

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ru = JSON.parse(fs.readFileSync(ruPath, 'utf8'));
const kk = JSON.parse(fs.readFileSync(kkPath, 'utf8'));
const fr = JSON.parse(fs.readFileSync(frPath, 'utf8'));

function flattenKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(flattenKeys(obj[key], prefix + key + '.'));
    } else {
      keys.push(prefix + key);
    }
  }
  return keys;
}

const enKeys = flattenKeys(en);
const ruKeys = new Set(flattenKeys(ru));
const kkKeys = new Set(flattenKeys(kk));
const frKeys = new Set(flattenKeys(fr));

const missingRu = enKeys.filter(key => !ruKeys.has(key));
const missingKk = enKeys.filter(key => !kkKeys.has(key));
const missingFr = enKeys.filter(key => !frKeys.has(key));

console.log('--- Missing in RU ---');
console.log(JSON.stringify(missingRu, null, 2));

console.log('--- Missing in KK ---');
console.log(JSON.stringify(missingKk, null, 2));

console.log('--- Missing in FR ---');
console.log(JSON.stringify(missingFr, null, 2));

#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'app', 'i18n', 'locales');

const deepMerge = (target, source) => {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) {
        target[key] = {};
      }
      deepMerge(target[key], source[key]);
    } else if (!Object.prototype.hasOwnProperty.call(target, key)) {
      target[key] = source[key];
    }
  }
  return target;
};

const removeExtraKeys = (target, source) => {
  const result = {};
  for (const key in target) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (target[key] && typeof target[key] === 'object' && !Array.isArray(target[key]) &&
          source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = removeExtraKeys(target[key], source[key]);
      } else {
        result[key] = target[key];
      }
    }
  }
  return result;
};

const main = () => {
  const enPath = path.join(LOCALES_DIR, 'en.json');
  const enContent = JSON.parse(fs.readFileSync(enPath, 'utf8'));

  const entries = fs.readdirSync(LOCALES_DIR).filter((file) => file.endsWith('.json') && file !== 'en.json');

  for (const file of entries) {
    const localePath = path.join(LOCALES_DIR, file);
    const locale = path.basename(file, '.json');
    const localeContent = JSON.parse(fs.readFileSync(localePath, 'utf8'));

    // Merge missing keys from en.json
    const merged = deepMerge(JSON.parse(JSON.stringify(localeContent)), enContent);
    
    // Remove extra keys not in en.json
    const cleaned = removeExtraKeys(merged, enContent);

    // Write back
    fs.writeFileSync(localePath, JSON.stringify(cleaned, null, 2) + '\n', 'utf8');
    console.log(`✓ Synced ${locale}.json`);
  }

  console.log('All locales synced with en.json');
};

main();


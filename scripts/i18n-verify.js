#!/usr/bin/env node
 

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'app', 'i18n', 'locales');

const flattenKeys = (obj, prefix = '') => {
  return Object.keys(obj).reduce((acc, key) => {
    const value = obj[key];
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      acc.push(...flattenKeys(value, nextKey));
    } else {
      acc.push(nextKey);
    }
    return acc;
  }, []);
};

const readLocales = () => {
  const entries = fs.readdirSync(LOCALES_DIR).filter((file) => file.endsWith('.json'));
  return entries.reduce((acc, file) => {
    const locale = path.basename(file, '.json');
    const contents = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, file), 'utf8'));
    acc[locale] = flattenKeys(contents).sort();
    return acc;
  }, {});
};

const main = () => {
  const locales = readLocales();
  const base = locales.en || [];

  const results = Object.entries(locales).map(([locale, keys]) => {
    const missing = base.filter((key) => !keys.includes(key));
    const extra = keys.filter((key) => !base.includes(key));
    return { locale, missing, extra };
  });

  let hasErrors = false;
  for (const { locale, missing, extra } of results) {
    if (locale === 'en') continue;
    if (missing.length || extra.length) {
      hasErrors = true;
      console.log(`Locale: ${locale}`);
      if (missing.length) {
        console.log(`  Missing keys (${missing.length}):`);
        missing.forEach((key) => console.log(`    - ${key}`));
      }
      if (extra.length) {
        console.log(`  Extra keys (${extra.length}):`);
        extra.forEach((key) => console.log(`    - ${key}`));
      }
    }
  }

  if (!hasErrors) {
    console.log('[i18n:verify] All locales are in sync with en.json');
    process.exit(0);
  } else {
    console.log('[i18n:verify] Some locales are missing keys. See details above.');
    process.exit(1);
  }
};

main();


#!/usr/bin/env node
 

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SOURCE_DIRS = [path.join(PROJECT_ROOT, 'src'), path.join(PROJECT_ROOT, 'App.js')];
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'app', 'i18n', 'extracted-keys.json');
const EN_LOCALE_PATH = path.join(PROJECT_ROOT, 'app', 'i18n', 'locales', 'en.json');

const KEY_REGEX = /(?:^|[^\w])t\(\s*(["'`])([^"'`]+)\1/g;
const VALID_KEY_REGEX = /^[A-Za-z0-9_.:-]+$/;

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

const walkFiles = (entry, files = []) => {
  if (!fs.existsSync(entry)) return files;
  const stats = fs.statSync(entry);
  if (stats.isDirectory()) {
    for (const item of fs.readdirSync(entry)) {
      walkFiles(path.join(entry, item), files);
    }
  } else if (stats.isFile()) {
    const ext = path.extname(entry);
    if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
      files.push(entry);
    }
  }
  return files;
};

const collectKeysFromSource = () => {
  const files = SOURCE_DIRS.flatMap((entry) => walkFiles(entry, []));
  const keys = new Set();

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    let match;
    while ((match = KEY_REGEX.exec(content)) !== null) {
      const key = match[2];
      if (key && VALID_KEY_REGEX.test(key)) {
        keys.add(key);
      }
    }
  }

  return Array.from(keys).sort();
};

const main = () => {
  const extractedKeys = collectKeysFromSource();
  const enStrings = JSON.parse(fs.readFileSync(EN_LOCALE_PATH, 'utf8'));
  const localeKeys = flattenKeys(enStrings).sort();

  const missingInEn = extractedKeys.filter((key) => !localeKeys.includes(key));
  const unusedKeys = localeKeys.filter((key) => !extractedKeys.includes(key));

  const payload = {
    generatedAt: new Date().toISOString(),
    totalExtracted: extractedKeys.length,
    totalLocaleKeys: localeKeys.length,
    missingInEn,
    unusedKeys,
    extractedKeys,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2));

  console.log('[i18n:extract] Completed');
  console.log(`→ Extracted keys: ${extractedKeys.length}`);
  console.log(`→ Missing in en.json: ${missingInEn.length}`);
  console.log(`→ Unused keys: ${unusedKeys.length}`);
  console.log(`→ Report written to ${path.relative(PROJECT_ROOT, OUTPUT_FILE)}`);
};

main();


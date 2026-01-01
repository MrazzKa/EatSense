const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../app/i18n/locales');
const EN_PATH = path.join(LOCALES_DIR, 'en.json');

const syncStructure = (target, source) => {
  const result = {};
  // Sort keys to maintain order
  const sourceKeys = Object.keys(source).sort();

  sourceKeys.forEach(key => {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
      // Nested object
      if (targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
        result[key] = syncStructure(targetValue, sourceValue);
      } else {
        // Missing or type mismatch, copy source structure
        result[key] = JSON.parse(JSON.stringify(sourceValue));
      }
    } else {
      // Primitive value (string, number, boolean, array)
      if (targetValue !== undefined) {
        result[key] = targetValue;
      } else {
        result[key] = sourceValue;
      }
    }
  });
  return result;
};

const main = () => {
  if (!fs.existsSync(EN_PATH)) {
    console.error('en.json not found!');
    process.exit(1);
  }

  const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
  const files = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json') && f !== 'en.json');

  console.log(`Found ${files.length} locale files to sync with en.json...`);

  files.forEach(file => {
    const filePath = path.join(LOCALES_DIR, file);
    try {
      const localeData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const synced = syncStructure(localeData, en);

      fs.writeFileSync(filePath, JSON.stringify(synced, null, 2));
      console.log(`✅ Synced ${file}`);
    } catch (e) {
      console.error(`❌ Failed to sync ${file}:`, e.message);
    }
  });
};

main();

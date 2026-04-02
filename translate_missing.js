const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config({ path: path.join(__dirname, 'apps/api/.env') });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY_MINI || process.env.OPENAI_API_KEY,
});

const localesDir = path.join(__dirname, 'app/i18n/locales');
const enPath = path.join(localesDir, 'en.json');
const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));

const targetLocales = ['es', 'de', 'fr', 'kk', 'ru'];
const langNames = {
  es: 'Spanish',
  de: 'German',
  fr: 'French',
  kk: 'Kazakh',
  ru: 'Russian'
};

// Flatten object to dot notation
function flattenObj(obj, parent = '', res = {}) {
  for (let key in obj) {
    let propName = parent ? parent + '.' + key : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      flattenObj(obj[key], propName, res);
    } else {
      res[propName] = obj[key];
    }
  }
  return res;
}

// Unflatten dot notation back to object
function unflattenObj(data) {
  let result = {};
  for (let i in data) {
    let keys = i.split('.');
    keys.reduce((r, e, j) => {
      return r[e] || (r[e] = isNaN(Number(keys[j + 1])) ? (keys.length - 1 === j ? data[i] : {}) : []);
    }, result);
  }
  return result;
}

const enFlat = flattenObj(enData);

async function translateBatch(keys, values, langName) {
  const prompt = `Translate the following UI texts to ${langName}. Preserve UI formatting, placeholders (like {{count}} or {{name}}), and tone.
Return ONLY a valid JSON object mapping the exact original English string to the translated string.
If a string is already in the target language or is a brand name, leave it as is. Do not include markdown codeblocks around the output.

Input strings:
${JSON.stringify(values, null, 2)}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const translatedDict = JSON.parse(response.choices[0].message.content);
    return keys.map(k => translatedDict[enFlat[k]] || translatedDict[k] || "[MISSING_TRANSLATION]");
  } catch (error) {
    console.error(`Translation error: ${error.message}`);
    // fallback
    return keys.map(() => "[ERROR]");
  }
}

async function run() {
  for (const locale of targetLocales) {
    console.log(`\nProcessing ${locale}.json...`);
    const filePath = path.join(localesDir, `${locale}.json`);
    
    let targetData = {};
    if (fs.existsSync(filePath)) {
      try {
        targetData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) {
        console.error(`Error parsing ${locale}.json: ${e.message}`);
      }
    }
    
    const targetFlat = flattenObj(targetData);
    const missingKeys = [];
    const missingValues = [];
    
    // Find missing or [MISSING] tags
    for (const key in enFlat) {
      const val = targetFlat[key];
      if (val === undefined || val === null || (typeof val === 'string' && val.includes('[MISSING]'))) {
        missingKeys.push(key);
        missingValues.push(enFlat[key]);
      }
    }
    
    console.log(`Found ${missingKeys.length} missing strings for ${locale}.`);
    
    if (missingKeys.length === 0) continue;

    // Process in batches of 50 to avoid context limits
    const batchSize = 50;
    for (let i = 0; i < missingKeys.length; i += batchSize) {
      const keysBatch = missingKeys.slice(i, i + batchSize);
      const valuesBatch = missingValues.slice(i, i + batchSize);
      
      console.log(`Translating batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(missingKeys.length/batchSize)}...`);
      const transValues = await translateBatch(keysBatch, valuesBatch, langNames[locale]);
      
      for (let j = 0; j < keysBatch.length; j++) {
        if (transValues[j] !== "[ERROR]" && transValues[j] !== "[MISSING_TRANSLATION]") {
           targetFlat[keysBatch[j]] = transValues[j];
        }
      }
    }
    
    // Write back sorted and unflattened
    const finalData = unflattenObj(targetFlat);
    
    fs.writeFileSync(filePath, JSON.stringify(finalData, null, 2) + '\n', 'utf8');
    console.log(`Updated ${locale}.json!`);
  }
}

run().catch(console.error);

#!/usr/bin/env node
/**
 * Add fr to all { en, ru, kk } objects in seed-diets and seed-lifestyles.
 * Uses en as fallback for fr. Run from repo root.
 */
const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let s = fs.readFileSync(filePath, 'utf8');
  let n = 0;

  function esc(x) {
    return String(x).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  // 1. label: { en: '...', ru: '...', kk: '...' } without fr
  const labelRe = /\blabel:\s*\{\s*en:\s*'((?:[^'\\]|\\.)*)',\s*ru:\s*'((?:[^'\\]|\\.)*)',\s*kk:\s*'((?:[^'\\]|\\.)*)'\s*\}/g;
  s = s.replace(labelRe, (m, en, ru, kk) => {
    if (m.includes('fr:')) return m;
    n++;
    return `label: { en: '${esc(en)}', ru: '${esc(ru)}', kk: '${esc(kk)}', fr: '${esc(en)}' }`;
  });

  // 2. name, subtitle, description, shortDescription (single-line)
  const simpleRe = /\b(name|subtitle|description|shortDescription):\s*\{\s*en:\s*'((?:[^'\\]|\\.)*)',\s*ru:\s*'((?:[^'\\]|\\.)*)',\s*kk:\s*'((?:[^'\\]|\\.)*)'\s*\}/g;
  s = s.replace(simpleRe, (m, key, en, ru, kk) => {
    if (m.includes('fr:')) return m;
    n++;
    return `${key}: { en: '${esc(en)}', ru: '${esc(ru)}', kk: '${esc(kk)}', fr: '${esc(en)}' }`;
  });

  fs.writeFileSync(filePath, s);
  return n;
}

const root = path.join(__dirname, '..');
const diets = path.join(root, 'apps/api/prisma/seeds/seed-diets.ts');
const lifestyles = path.join(root, 'apps/api/prisma/seeds/seed-lifestyles.ts');

let a = processFile(diets);
let b = processFile(lifestyles);
console.log('add-fr-seeds-bulk: updated', a, 'in seed-diets,', b, 'in seed-lifestyles');

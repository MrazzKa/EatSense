#!/usr/bin/env node
/**
 * merge-diets-content.js
 * 
 * Reads content/diets.json and generates a mapping of enriched English content
 * for each diet that can be merged into seed-diets.ts.
 * 
 * Output: a JSON file with enriched howItWorks.en and dailyTracker items for each diet.
 */

const fs = require('fs');
const path = require('path');

const dietsJsonPath = path.join(__dirname, '..', 'content', 'diets.json');
const outputPath = path.join(__dirname, '..', 'content', 'diets-enriched.json');

const diets = JSON.parse(fs.readFileSync(dietsJsonPath, 'utf8'));

const NAME_TO_SLUG = {
    'Mediterranean Diet': 'mediterranean',
    'DASH Diet': 'dash',
    'MIND Diet': 'mind',
    'Flexitarian Diet': 'flexitarian',
    'Nordic Diet': 'nordic',
    'Balanced Plate Method': 'plate-method',
    '14:10 Eating Window': 'if-14-10',
    'Intermittent Fasting 16:8': 'if-16-8',
    'Keto Diet': 'keto',
    'Low-FODMAP (Gut)': 'low-fodmap',
    'Gluten-Free': 'gluten-free',
    'Low-Carb Diet': 'low-carb',
    'High-Protein Cut': 'high-protein-cut',
    'Whole30 (Inspired)': 'whole30-inspired',
    'Flexible Dieting (IIFYM)': 'iifym',
    'Clean Eating (Simple)': 'clean-eating',
    'Paleo': 'paleo',
    'Lean Bulk': 'lean_bulk',  // In seed-lifestyles.ts
    'Summer Fresh': 'summer-detox',
    'Winter Warmth': 'winter-warmth',
    'Autumn Harvest': 'autumn-harvest',
};

function parseHowItWorks(items) {
    // howItWorks array contains mixed content:
    //   - Regular bullet points (how the diet works)
    //   - "Daily Tracker Checklist (6 items)" separator
    //   - 6 tracker items after the separator
    // Split these into two arrays.

    const trackerSeparatorIndex = items.findIndex(item =>
        item.toLowerCase().includes('daily tracker checklist')
    );

    if (trackerSeparatorIndex === -1) {
        return { howItWorks: items, trackerItems: [] };
    }

    const howItWorks = items.slice(0, trackerSeparatorIndex);
    const trackerItems = items.slice(trackerSeparatorIndex + 1);

    return { howItWorks, trackerItems };
}

function parseAvoidList(items) {
    // avoidList contains food items to avoid + scientific sources mixed in
    // Sources start with lines like "Scientific Sources & References"
    const sourceSepIndex = items.findIndex(item =>
        item.toLowerCase().includes('scientific sources')
    );

    if (sourceSepIndex === -1) {
        return { avoidItems: items, sources: [] };
    }

    const avoidItems = items.slice(0, sourceSepIndex);
    const sources = items.slice(sourceSepIndex + 1);

    return { avoidItems, sources };
}

function trackerItemToKey(label) {
    // Convert a tracker label to a snake_case key
    return label
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .substring(0, 30);
}

const enriched = {};

for (const diet of diets) {
    const slug = NAME_TO_SLUG[diet.name];
    if (!slug) {
        console.warn(`No slug mapping for diet: ${diet.name}`);
        continue;
    }

    const { howItWorks, trackerItems } = parseHowItWorks(diet.howItWorks || []);
    const { avoidItems, sources } = parseAvoidList(diet.avoidList || []);

    enriched[slug] = {
        name: diet.name,
        subtitle: diet.subtitle,
        about: diet.about || [],
        howItWorks_en: howItWorks,
        dailyTracker_en: trackerItems.map((label, i) => ({
            key: trackerItemToKey(label),
            label_en: label,
        })),
        avoidItems_en: avoidItems,
        sources: sources,
        macroSplit: diet.macroSplit || '',
        previewDays: diet.previewDays || {},
    };
}

fs.writeFileSync(outputPath, JSON.stringify(enriched, null, 2));
console.log(`Wrote enriched data for ${Object.keys(enriched).length} diets to ${outputPath}`);

// Also print a summary
for (const [slug, data] of Object.entries(enriched)) {
    console.log(`  ${slug}: ${data.howItWorks_en.length} howItWorks bullets, ${data.dailyTracker_en.length} tracker items, ${data.avoidItems_en.length} avoid items, ${data.about.length} about paragraphs`);
}

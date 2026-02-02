const fs = require('fs');
const path = require('path');

const SEED_FILE = path.join(__dirname, '../apps/api/prisma/seeds/seed-diets.ts');

function extractTags() {
    console.log('--- Extracting Unique Tags ---');
    let content = fs.readFileSync(SEED_FILE, 'utf8');

    // Strip imports/setup to avoid execution issues if we were running it,
    // but here we will just regex for tags arrays because running the file requires TS setup.
    // Actually, regexing `tags: [...]` is safer given the file structure.

    // Pattern: tags: ['tag1', 'tag2', ...],
    const tagPattern = /tags:\s*\[(.*?)\]/g;
    let match;
    const allTags = new Set();

    while ((match = tagPattern.exec(content)) !== null) {
        // match[1] is "'tag1', 'tag2'"
        const inner = match[1];
        const tags = inner.split(',').map(t => t.trim().replace(/['"]/g, '')).filter(Boolean);
        tags.forEach(t => allTags.add(t));
    }

    console.log(`Found ${allTags.size} unique tags:`);
    const sortedTags = Array.from(allTags).sort();
    sortedTags.forEach(t => console.log(`- ${t}`));
}

extractTags();

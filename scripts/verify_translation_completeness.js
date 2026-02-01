const fs = require('fs');
const path = require('path');

const seedDietsPath = path.join(process.cwd(), 'apps/api/prisma/seeds/seed-diets.ts');
const seedLifestylesPath = path.join(process.cwd(), 'apps/api/prisma/seeds/seed-lifestyles.ts');

const LANGUAGES = ['en', 'ru', 'kk', 'fr'];

function checkFile(filePath) {
    console.log(`Checking ${path.basename(filePath)}...`);
    const content = fs.readFileSync(filePath, 'utf8');

    // Naive parsing to find localized objects
    // Pattern: key: { en: '...', ru: '...', ... }
    // We look for the start of an object and check its keys

    // We'll verify specific fields we expect to be localized:
    // name, description, shortDescription, subtitle, howItWorks (array), tips (array), label (in dailyTracker)

    let issues = [];

    // Regex to capture localized objects:  key: \s*\{([^}]+)\}
    // This is tricky with nested braces or multiline.
    // Let's use a simpler approach: finding the field name and then checking the content block.

    // Approach: Find "name: {" and inspect content until "},"

    const relevantFields = ['name', 'description', 'shortDescription', 'subtitle', 'label'];

    // Helper to extract content inside matched braces for a field
    // unique regex for each field type to be safer

    relevantFields.forEach(field => {
        // Regex to find: field: { ... }
        // Capture the content inside the braces
        const regex = new RegExp(`${field}:\\s*\\{([\\s\\S]*?)\\}`, 'g');
        let match;
        while ((match = regex.exec(content)) !== null) {
            const objectContent = match[1];
            // Check if all languages are present
            LANGUAGES.forEach(lang => {
                if (!objectContent.includes(`${lang}:`)) {
                    // Get context (line number approximation)
                    const linesBefore = content.substring(0, match.index).split('\n').length;
                    issues.push(`Line ${linesBefore}: Field '${field}' missing translation for '${lang}'`);
                } else {
                    // Check for strict empty strings: lang: '' or lang: "" or lang: "" , or lang: '',
                    // We look for : followed by optional whitespace then empty quotes
                    const emptyRegex = new RegExp(`${lang}:\\s*(?:''|"")`);
                    if (emptyRegex.test(objectContent)) {
                        const linesBefore = content.substring(0, match.index).split('\n').length;
                        issues.push(`Line ${linesBefore}: Field '${field}' has empty translation for '${lang}'`);
                    }
                }
            });
        }
    });

    // Special handling for howItWorks and tips (arrays of strings)
    // format: howItWorks: { en: [...], ru: [...], ... }
    const arrayFields = ['howItWorks', 'tips'];
    arrayFields.forEach(field => {
        const regex = new RegExp(`${field}:\\s*\\{([\\s\\S]*?)\\n\\s*\\},`, 'g');
        let match;
        while ((match = regex.exec(content)) !== null) {
            const objectContent = match[1];
            LANGUAGES.forEach(lang => {
                if (!objectContent.includes(`${lang}:`)) {
                    const linesBefore = content.substring(0, match.index).split('\n').length;
                    issues.push(`Line ${linesBefore}: Array Field '${field}' missing translation for '${lang}'`);
                }
            });
        }
    });

    if (issues.length === 0) {
        console.log(`✅ ${path.basename(filePath)} passed all checks.`);
    } else {
        console.log(`❌ ${path.basename(filePath)} has issues:`);
        issues.forEach(issue => console.log(`  - ${issue}`));
    }
    console.log('---');
}

checkFile(seedDietsPath);
checkFile(seedLifestylesPath);


const fs = require('fs');
const content = fs.readFileSync('app/i18n/locales/ru.json', 'utf8');
const lines = content.split('\n');

lines.forEach((line, i) => {
    if (line.includes('"referral":')) {
        console.log(`referral found at line ${i + 1}`);
    }
});

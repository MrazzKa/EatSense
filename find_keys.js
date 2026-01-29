
const fs = require('fs');
const content = fs.readFileSync('app/i18n/locales/ru.json', 'utf8');
const lines = content.split('\n');

const targets = ['"referral"', '"shareMessage"'];

targets.forEach(t => {
    lines.forEach((line, i) => {
        if (line.includes(t)) {
            console.log(`${t} found at line ${i + 1}: ${line.trim()}`);
        }
    });
});

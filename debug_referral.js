
const fs = require('fs');


const locales = ['en', 'ru'];

locales.forEach(lang => {
    const p = `app/i18n/locales/${lang}.json`;
    if (fs.existsSync(p)) {
        console.log(`\n--- ${lang} ---`);
        try {
            const data = JSON.parse(fs.readFileSync(p, 'utf8'));
            const referral = data.referral;
            if (!referral) {
                console.log('referral: MISSING');
            } else {
                console.log('referral:', JSON.stringify(referral, null, 2));
            }
        } catch (e) {
            console.log('Error parsing:', e.message);
        }
    } else {
        console.log(`${lang}: File NOT FOUND`);
    }
});

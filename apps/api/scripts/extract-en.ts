import { diets } from '../prisma/seeds/seed-diets';
import { lifestylePrograms } from '../prisma/seeds/seed-lifestyles';
import * as fs from 'fs';

const extracted: any = { diets: {}, lifestyles: {} };

for (const diet of diets) {
    extracted.diets[diet.slug] = {
        name: diet.name?.en,
        description: diet.description?.en,
        shortDescription: diet.shortDescription?.en,
        howItWorks: diet.howItWorks?.en,
        dailyTracker: diet.dailyTracker?.map((t: any) => ({ key: t.key, label: t.label?.en })),
        tips: diet.tips?.en,
        notFor: diet.notFor?.en,
        sampleDay: diet.sampleDay?.en,
    };
}

for (const p of lifestylePrograms) {
    extracted.lifestyles[p.slug] = {
        name: p.name?.en,
        subtitle: p.subtitle?.en,
        description: p.description?.en,
        shortDescription: p.shortDescription?.en,
        dailyTracker: p.dailyTracker?.map((t: any) => ({ key: t.key, label: t.label?.en })),
        rules: p.rules, // Might be dynamic in seeding, but let's just extract what's statically there
        // Actually, seed-lifestyles.ts has `subtitle` etc. Let's check:
    };
}

fs.writeFileSync('extracted-en.json', JSON.stringify(extracted, null, 2));
console.log('Extraction complete.');

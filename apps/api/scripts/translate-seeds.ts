import { Project, SyntaxKind, ObjectLiteralExpression, PropertyAssignment } from 'ts-morph';
import translate from 'google-translate-api-x';

// Keep track of total API calls for rate limiting display
let apiCalls = 0;

async function translateText(text: string, to: string): Promise<string> {
    if (!text || text.trim() === '') return text;
    try {
        apiCalls++;
        const res = await translate(text, { to });

        // Dynamic delay to protect against rate limits (usually ~1 per second is safe)
        await new Promise(r => setTimeout(r, 1000));

        let out = res.text;
        // Escape backticks and $ for safe insertion into template literals
        out = out.replace(/`/g, '\\`').replace(/\$/g, '\\$');
        return out;
    } catch (e: any) {
        console.error(`\n[!] Translation error for "${text.substring(0, 30)}...":`, e.message);

        // Add a backoff if rate limited
        if (e.name === 'TooManyRequestsError' || e.message.includes('429')) {
            console.log('Got rate limited. Waiting 10 seconds before continuing...');
            await new Promise(r => setTimeout(r, 10000));
        }

        // Escape safely to fallback
        return text.replace(/`/g, '\\`').replace(/\$/g, '\\$');
    }
}

async function processObject(obj: ObjectLiteralExpression) {
    const enProp = obj.getProperty('en') as PropertyAssignment;
    if (!enProp) return;

    const enInit = enProp.getInitializer();
    const hasDe = obj.getProperty('de');
    const hasEs = obj.getProperty('es');

    if (hasDe && hasEs) return; // Already translated

    // Handle single strings
    if (enInit?.isKind(SyntaxKind.StringLiteral) || enInit?.isKind(SyntaxKind.NoSubstitutionTemplateLiteral)) {
        const enText = enInit.getLiteralText();

        if (!hasDe) {
            process.stdout.write(`Translating string to DE (${apiCalls})... `);
            const deText = await translateText(enText, 'de');
            obj.addPropertyAssignment({ name: 'de', initializer: `\`${deText}\`` });
            console.log('Done ✅');
        }
        if (!hasEs) {
            process.stdout.write(`Translating string to ES (${apiCalls})... `);
            const esText = await translateText(enText, 'es');
            obj.addPropertyAssignment({ name: 'es', initializer: `\`${esText}\`` });
            console.log('Done ✅');
        }
    }
    // Handle string arrays
    else if (enInit?.isKind(SyntaxKind.ArrayLiteralExpression)) {
        const elements = enInit.getElements();
        const enStrings = elements.map(el => {
            if (el.isKind(SyntaxKind.StringLiteral) || el.isKind(SyntaxKind.NoSubstitutionTemplateLiteral)) {
                return el.getLiteralText();
            }
            return '';
        }).filter(Boolean);

        if (!hasDe) {
            console.log(`Translating Array of ${enStrings.length} items to DE...`);
            const deArray = [];
            for (const str of enStrings) {
                deArray.push(`\`${await translateText(str, 'de')}\``);
            }
            obj.addPropertyAssignment({ name: 'de', initializer: `[\n${deArray.join(',\n')}\n]` });
        }

        if (!hasEs) {
            console.log(`Translating Array of ${enStrings.length} items to ES...`);
            const esArray = [];
            for (const str of enStrings) {
                esArray.push(`\`${await translateText(str, 'es')}\``);
            }
            obj.addPropertyAssignment({ name: 'es', initializer: `[\n${esArray.join(',\n')}\n]` });
        }
    }
}

async function run() {
    const project = new Project();

    // Add the specific files directly instead of relying on tsconfig
    project.addSourceFilesAtPaths(__dirname + '/../prisma/seeds/seed-diets.ts');
    project.addSourceFilesAtPaths(__dirname + '/../prisma/seeds/seed-lifestyles.ts');

    const files = [
        project.getSourceFileOrThrow(__dirname + '/../prisma/seeds/seed-diets.ts'),
        project.getSourceFileOrThrow(__dirname + '/../prisma/seeds/seed-lifestyles.ts')
    ];

    for (const file of files) {
        console.log(`\n========================================`);
        console.log(`Processing ${file.getBaseName()}...`);
        console.log(`========================================\n`);

        const objects = file.getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression);
        const localizedObjects = objects.filter(obj => obj.getProperty('en'));

        console.log(`Found ${localizedObjects.length} localized objects in ${file.getBaseName()}`);

        for (let i = 0; i < localizedObjects.length; i++) {
            const obj = localizedObjects[i];
            await processObject(obj);

            // Save periodically to not lose progress if rate limited / crashed
            if (i > 0 && i % 5 === 0) {
                console.log(`\n--- Saving progress (${i}/${localizedObjects.length}) ---\n`);
                await file.save();
            }
        }
        await file.save();
        console.log(`\n✅ Finished ${file.getBaseName()}`);
    }
}

console.log("Starting automated translation process...");
run().catch(console.error);

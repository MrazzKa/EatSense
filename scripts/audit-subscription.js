const fs = require('fs');
const path = require('path');

const SUBSCRIPTION_SCREEN_PATH = path.join(__dirname, '../src/screens/SubscriptionScreen.js');

function auditSubscriptionScreen() {
    const content = fs.readFileSync(SUBSCRIPTION_SCREEN_PATH, 'utf8');
    const lines = content.split('\n');

    console.log('--- Analyzing SubscriptionScreen.js for Hardcoded Strings ---');

    // Regex to find 'String' or "String" inside JSX or meaningful places, 
    // excluding imports, console.logs, etc.
    // This is a heuristic check.

    lines.forEach((line, index) => {
        const lineNum = index + 1;
        const trimmed = line.trim();

        // Skip comments, imports, console logs
        if (trimmed.startsWith('//') || trimmed.startsWith('import') || trimmed.startsWith('console.log') || trimmed.startsWith('console.error')) return;

        // Look for string literals that might be user facing
        // Pattern: >Text< or 'Text' inside t() default value

        // Check for t('key', 'Default Value') pattern
        const tMatch = /t\(['"][\w.]+['"],\s*['"]([^'"]+)['"]\)/.exec(line);
        if (tMatch) {
            console.log(`[Line ${lineNum}] Found default value in t(): "${tMatch[1]}"`);
        }

        // Check for hardcoded strings in JSX Text not wrapped in curlies or t()
        // e.g. <Text>Hardcoded</Text>
        // Very rough regex
        const jsxTextMatch = />([^<{]+)</.exec(line);
        if (jsxTextMatch) {
            const text = jsxTextMatch[1].trim();
            if (text && !text.includes('tokens.') && text.length > 1) {
                console.log(`[Line ${lineNum}] Potential hardcoded JSX text: "${text}"`);
            }
        }
    });
}

auditSubscriptionScreen();

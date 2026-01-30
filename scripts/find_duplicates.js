const fs = require('fs');


const filePath = process.argv[2] || 'app/i18n/locales/en.json';
console.log(`Checking ${filePath} for duplicate keys...`);

const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

const stack = [{ keys: new Set(), name: 'root' }];
let lineNum = 0;

for (const line of lines) {
    lineNum++;
    const trimmed = line.trim();

    if (!trimmed) continue;
    if (trimmed.startsWith('//')) continue; // comments

    // Heuristic: Count opening and closing braces to track depth
    // This is fragile for multi-line strings or braces in strings, but okay for this JSON.

    // Find "key":
    // We assume standard formatting: "key": { or "key": "value"
    const keyMatch = trimmed.match(/^"([^"]+)":/);

    if (keyMatch) {
        const key = keyMatch[1];
        const currentScope = stack[stack.length - 1];

        if (currentScope.keys.has(key)) {
            console.log(`Found duplicate key "${key}" at line ${lineNum} in scope "${currentScope.name}"`);
        } else {
            currentScope.keys.add(key);
        }

        if (trimmed.includes('{') && !trimmed.includes('}')) {
            // Opening new scope named 'key'
            stack.push({ keys: new Set(), name: key });
        } else if (trimmed.includes('{') && trimmed.includes('}')) {
            // One-liner object, ignore scope push/pop or handle it?
            // For en.json usually formatted multi-line.
        }
    } else if (trimmed.includes('{')) {
        // Just an opening brace (e.g. inside array or root?)
        stack.push({ keys: new Set(), name: 'anonymous' });
    }

    // Handle closing braces
    // If line is ONLY closing brace or closing brace comma
    if (trimmed.match(/^},?$/)) {
        if (stack.length > 1) stack.pop();
    }
}
console.log('Done.');

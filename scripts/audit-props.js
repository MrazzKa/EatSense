const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');

// Recursive file walker
function walkDir(dir, callback) {
    if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach(f => {
            let dirPath = path.join(dir, f);
            let isDirectory = fs.statSync(dirPath).isDirectory();
            if (isDirectory) {
                walkDir(dirPath, callback);
            } else {
                callback(path.join(dir, f));
            }
        });
    }
}

function auditProps() {
    console.log('🚀 Starting Audit for Hardcoded Props (title, label, placeholder)...\n');

    // Regex to find: prop="Some Text"
    // We want to avoid prop={...} or prop={t(...)}
    // Matches: word followed by =" then anything except " then "
    // Capture group 1: prop name
    // Capture group 2: value
    const propRegex = /\b(title|label|placeholder|headerTitle|buttonText|submitLabel|cancelLabel)\s*=\s*["']([^"']{2,})["']/g;

    let totalIssues = 0;

    walkDir(SRC_DIR, (filePath) => {
        if (!filePath.match(/\.(js|ts|tsx)$/)) return;

        const content = fs.readFileSync(filePath, 'utf8');
        const filename = path.basename(filePath);

        let match;
        while ((match = propRegex.exec(content)) !== null) {
            const prop = match[1];
            const value = match[2];

            // Filters for False Positives
            if (
                // UUIDs / Keys / IDs
                value.match(/^[a-f0-9-]{10,}$/) ||
                // Color codes
                value.startsWith('#') ||
                // File paths or URLs
                value.includes('/') ||
                // Technical internal values
                ['transparent', 'padding', 'center', 'absolute', 'relative', 'never', 'always'].includes(value) ||
                // Date formats
                value.includes('YYYY') ||
                // Empty or short
                value.trim().length < 2
            ) continue;

            const lineNum = content.substring(0, match.index).split('\n').length;
            console.log(`[${filename}:${lineNum}] ${prop}="${value}"`);
            totalIssues++;
        }
    });

    if (totalIssues === 0) {
        console.log('\n✅ No suspicious hardcoded props found.');
    } else {
        console.log(`\n⚠️  Found ${totalIssues} potential hardcoded strings in props.`);
    }
}

auditProps();

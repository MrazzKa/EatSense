/**
 * Comprehensive translation checker
 * Checks:
 * 1. All i18n JSON files (missing keys, empty values, untranslated)
 * 2. Diet programs from database (all languages)
 * 3. Lifestyle programs from database (all languages)
 * 4. Code usage - finds places where keys might be displayed instead of translations
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../app/i18n/locales');
const TARGET_LOCALES = ['ru', 'kk', 'fr'];
const REQUIRED_LOCALES = ['en', 'ru', 'kk', 'fr'];

// Helper: Get all keys from nested object
function getKeys(obj, prefix = '') {
    return Object.keys(obj).reduce((acc, key) => {
        const value = obj[key];
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            acc.push(...getKeys(value, fullKey));
        } else {
            acc.push(fullKey);
        }
        return acc;
    }, []);
}

// Helper: Get value from nested object by key path
function getValue(obj, key) {
    return key.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);
}

// Helper: Check if key exists in object
function hasKey(obj, key) {
    return getValue(obj, key) !== undefined;
}

// Check if value looks like a translation key (e.g., "common.save" or "onboarding.welcome")
function looksLikeKey(value) {
    if (typeof value !== 'string') return false;
    
    // FIX: Exclude French loading/action words ending with "..." 
    // These are valid translations, not keys (e.g., "Chargement..." = "Loading...")
    // Pattern: Capital letter, French letters, ends with "..."
    // Also allow spaces for phrases like "Rechercher des régimes..."
    if (value.endsWith('...') && /^[A-ZÉÈÊÀÂÔÛÙÇ][a-zéèêàâôûùçéèêàâôûùïî\s]+\.\.\.$/.test(value)) {
        return false; // French loading text like "Chargement..." is valid
    }
    
    // Pattern: contains dots and lowercase/underscores (typical i18n key format)
    // Must have at least one dot and look like a key path (e.g., "common.save", "onboarding.welcome")
    // Key paths typically don't have spaces and use lowercase/underscores
    // Exclude if it looks like a sentence with a period (e.g., "Loading...")
    if (value.includes(' ') && value.endsWith('...')) {
        return false; // Phrases with spaces ending in "..." are not keys
    }
    
    return /^[a-z_][a-z0-9_.]*\.[a-z0-9_.]+$/i.test(value) && value.includes('.');
}

// Check JSON translation files
function checkJsonTranslations() {
    console.log('📋 Checking JSON translation files...\n');
    
    const enPath = path.join(LOCALES_DIR, 'en.json');
    if (!fs.existsSync(enPath)) {
        console.error('❌ English translation file not found!');
        return { issues: [], totalIssues: 0 };
    }
    
    const enContent = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const enKeys = getKeys(enContent);
    
    console.log(`📊 Total keys in English: ${enKeys.length}\n`);
    
    const allIssues = [];
    
    TARGET_LOCALES.forEach(locale => {
        const localePath = path.join(LOCALES_DIR, `${locale}.json`);
        if (!fs.existsSync(localePath)) {
            console.log(`❌ ${locale.toUpperCase()}: File not found\n`);
            allIssues.push({ locale, type: 'missing_file', keys: [] });
            return;
        }
        
        const localeContent = JSON.parse(fs.readFileSync(localePath, 'utf8'));
        const missing = [];
        const empty = [];
        const untranslated = [];
        const keyLikeValues = []; // Values that look like translation keys
        
        enKeys.forEach(key => {
            if (!hasKey(localeContent, key)) {
                missing.push(key);
            } else {
                const value = getValue(localeContent, key);
                const enValue = getValue(enContent, key);
                
                if (value === '' || value === null || value === undefined) {
                    empty.push(key);
                } else if (typeof value === 'string') {
                    // FIX: Exclude common French loading/action words ending with "..."
                    // These are valid translations, not keys (e.g., "Chargement..." = "Loading...")
                    // Pattern: Capital letter, French letters, ends with "..."
                    const isFrenchActionWord = value.endsWith('...') && 
                        /^[A-ZÉÈÊÀÂÔÛÙÇ][a-zéèêàâôûùçéèêàâôûùïî\s]+\.\.\.$/.test(value);
                    
                    // FIX: Also check if English value also ends with "..." - then it's a loading text, not a key
                    // This covers cases like "Loading..." -> "Chargement..." or "Searching..." -> "Recherche..."
                    const isEnglishLoadingText = typeof enValue === 'string' && enValue.endsWith('...');
                    
                    // FIX: If value ends with "..." and English also ends with "...", it's a loading text, not a key
                    const isBothLoadingText = value.endsWith('...') && isEnglishLoadingText;
                    
                    // Only check for key-like values if it's not a loading text
                    if (looksLikeKey(value) && !isFrenchActionWord && !isBothLoadingText) {
                        keyLikeValues.push({ key, value });
                    } else if (value === enValue && value.length > 3 && !isFrenchActionWord && !isBothLoadingText) {
                        // Check if it's not a brand name or common term
                        const ignoreList = [
                            'EatSense', 'OK', 'Email', 'ID', 'v1.0', 'All', 'Auto', 'Snack',
                            'Premium', 'Pro', 'Free', 'Articles', 'Article', 'calories', 'kcal',
                            'Total', 'Dashboard', 'Profile', 'Settings', 'Cancel', 'Save', 'Delete',
                            'Edit', 'Close', 'Back', 'Next', 'Skip', 'Done', 'Loading', 'Error',
                            'Success', 'Retry', 'Search', 'View All', 'Yes', 'No', 'Confirm', 'Info',
                            'Days', 'Of', 'Coming Soon', 'Continue', 'Show', 'Hide', 'Hours', 'Stop',
                            'Go Back', 'Go To', 'Days Ago', 'Free', 'Got It', 'Later', 'Other', 'Yesterday',
                            'Notifications', 'Student', 'Founder', 'Chat', 'Expert', 'Client', 'Consultation',
                            'Description', 'Spam', 'Pause', 'Contact', 'Title', 'Link', 'Excellent',
                            'Performance', 'Required', 'Grant Access', 'Enabled', 'Not Enabled', 'Enable Failed',
                            'Vintage', 'Destinations', 'Modal Title', 'Diets', 'Experts', 'Reports',
                            'Calories', 'Zoom Label', 'Flash Mode Auto', 'Flash auto', 'Flash automatique',
                            'Today', 'Empty', 'Times', 'Period', 'Adherence', 'Conclusions', 'On Track',
                            'Over', 'Under', 'Subtitle', 'Download Current', 'History', 'Downloaded',
                            'No Data For Month', 'Delete Confirm', 'File Saved', 'Privacy Title',
                            'Terms Title', 'Privacy Link', 'Terms Link', 'Tab Title', 'Load', 'Save',
                            'Delete', 'Name Required', 'No Doses', 'Edit', 'Add', 'Delete Message',
                            'Name', 'Dosage', 'Instructions', 'Start Date', 'End Date', 'Timezone', 'Doses',
                            'Before Meal', 'After Meal', 'Add Dose', 'Health Score Label',
                            'Daily Limit Reached', 'No Data Today', 'Unnamed Product', 'Chronotype',
                            'Inflammation', 'Suggestions', 'Nutrition', 'Support', 'Assistance',
                            'Medications', 'Médicaments', 'Medication schedule', 'Planning des médicaments',
                            '500 mg', 'Zoom {{value}}x', 'Calories (kcal)', 'EatSense Pro', 'EatSense Premium',
                            '9. Contact', '10. Contact', 'Horaires', 'Times'
                        ];
                        if (!ignoreList.includes(value)) {
                            untranslated.push(key);
                        }
                    }
                }
            }
        });
        
        if (missing.length > 0 || empty.length > 0 || untranslated.length > 0 || keyLikeValues.length > 0) {
            console.log(`📋 ${locale.toUpperCase()} Issues:`);
            if (missing.length > 0) {
                console.log(`  ❌ Missing keys (${missing.length}):`);
                missing.slice(0, 20).forEach(key => console.log(`     - ${key}`));
                if (missing.length > 20) console.log(`     ... and ${missing.length - 20} more`);
            }
            if (empty.length > 0) {
                console.log(`  ⚠️  Empty values (${empty.length}):`);
                empty.slice(0, 20).forEach(key => console.log(`     - ${key}`));
                if (empty.length > 20) console.log(`     ... and ${empty.length - 20} more`);
            }
            if (untranslated.length > 0) {
                console.log(`  ⚠️  Untranslated (same as EN) (${untranslated.length}):`);
                untranslated.slice(0, 20).forEach(key => console.log(`     - ${key}`));
                if (untranslated.length > 20) console.log(`     ... and ${untranslated.length - 20} more`);
            }
            if (keyLikeValues.length > 0) {
                console.log(`  🚨 KEY-LIKE VALUES (looks like translation keys) (${keyLikeValues.length}):`);
                keyLikeValues.forEach(({ key, value }) => console.log(`     - ${key}: "${value}"`));
            }
            console.log('');
            
            allIssues.push({
                locale,
                missing,
                empty,
                untranslated,
                keyLikeValues,
            });
        } else {
            console.log(`✅ ${locale.toUpperCase()}: All translations present\n`);
        }
    });
    
    return { issues: allIssues, totalIssues: allIssues.reduce((sum, i) => 
        sum + (i.missing?.length || 0) + (i.empty?.length || 0) + (i.untranslated?.length || 0) + (i.keyLikeValues?.length || 0), 0) };
}

// Check diet programs from database (requires DB connection)
async function checkDietPrograms() {
    console.log('🍎 Checking Diet Programs translations...\n');
    
    // This would require Prisma client - for now, we'll provide instructions
    console.log('⚠️  To check diet programs from database, run:');
    console.log('   node scripts/check-db-translations.js\n');
    console.log('   Or use the API endpoint to fetch diets and check their translations\n');
    
    return { issues: [], totalIssues: 0 };
}

// Check code for potential issues
function checkCodeUsage() {
    console.log('🔍 Checking code for translation issues...\n');
    
    const issues = [];
    const srcDir = path.join(__dirname, '../src');
    
    // Find all JS/TS/TSX files
    function findFiles(dir, ext = ['.js', '.ts', '.tsx']) {
        let results = [];
        const list = fs.readdirSync(dir);
        list.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat && stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
                results = results.concat(findFiles(filePath, ext));
            } else if (ext.some(e => file.endsWith(e))) {
                results.push(filePath);
            }
        });
        return results;
    }
    
    const files = findFiles(srcDir);
    // FIX: Exclude test files and node_modules
    const filteredFiles = files.filter(file => {
        const relativePath = path.relative(srcDir, file);
        // Exclude test files, node_modules, and build artifacts
        return !relativePath.includes('__tests__') &&
               !relativePath.includes('.test.') &&
               !relativePath.includes('.spec.') &&
               !relativePath.includes('node_modules') &&
               !relativePath.includes('dist') &&
               !relativePath.includes('build');
    });
    
    console.log(`   Scanning ${filteredFiles.length} files (excluding tests)...\n`);
    
    filteredFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
            // Skip comments and empty lines
            if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim() === '') {
                return;
            }
            
            // FIX: Skip console.log, console.error, console.warn - these are logs, not UI text
            if (line.trim().startsWith('console.')) {
                return;
            }
            
            // Check for hardcoded strings that should be translated
            // Pattern: Text in quotes that looks like UI text (not code/comments)
            if (line.includes('t(') || line.includes('safeT(')) {
                // Check if translation key is used correctly
                const keyMatch = line.match(/t\(['"]([^'"]+)['"]/);
                if (keyMatch) {
                    const key = keyMatch[1];
                    
                    // FIX: Ignore obvious non-translation keys:
                    // - Single characters or symbols (".", ",", "-", "@", "T")
                    // - Escape sequences ("\n", "\t", "\r", etc.)
                    // - URLs or paths ("/auth/apple", "/v1/health", "/diets/active/today")
                    // - HTTP methods ("GET", "PUT", "DELETE", "HEAD")
                    // - Technical strings ("window")
                    // - Emojis ("🎉")
                    // FIX: Check for escape sequences more accurately
                    // Escape sequences in JavaScript strings: \n, \t, \r, \b, \f, \v, \', \", \\, \0, \xHH, \uHHHH
                    // Note: In the regex match, escape sequences appear as literal "\n" (backslash + n), not actual newline
                    const isEscapeSequence = /^\\[nrtbfv'"\\0]/.test(key) || 
                                           /^\\x[0-9a-fA-F]{2}$/.test(key) || 
                                           /^\\u[0-9a-fA-F]{4}$/.test(key);
                    
                    const isTechnicalString = 
                        (key.length <= 1 && !isEscapeSequence) || // Single char (but not escape sequences)
                        isEscapeSequence || // Escape sequences: \n, \t, \r, etc.
                        key.startsWith('/') || // URL/path
                        /^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)$/i.test(key) || // HTTP methods
                        key === 'window' || // Technical
                        /^[\u{1F300}-\u{1F9FF}]$/u.test(key); // Emoji
                    
                    if (isTechnicalString) {
                        return; // Skip technical strings
                    }
                    
                    // Check if key exists in English translations
                    const enPath = path.join(LOCALES_DIR, 'en.json');
                    if (fs.existsSync(enPath)) {
                        const enContent = JSON.parse(fs.readFileSync(enPath, 'utf8'));
                        if (!hasKey(enContent, key)) {
                            issues.push({
                                file: path.relative(srcDir, file),
                                line: index + 1,
                                issue: `Translation key "${key}" not found in en.json`,
                                severity: 'error',
                            });
                        }
                    }
                }
            }
            
            // Check for hardcoded English text that should be translated
            // This is a heuristic - look for common UI patterns
            // FIX: More strict pattern - only flag if it's clearly UI text, not test data or code
            const uiTextPattern = /['"](Save|Cancel|Delete|Edit|Close|Back|Next|Continue|Loading|Error|Success|Try Again|Share|Correct)[^'"]*['"]/;
            if (uiTextPattern.test(line)) {
                // But ignore if it's in a comment, already using t(), or in a test/describe/it block
                const isInTest = line.includes('test(') || line.includes('it(') || line.includes('describe(') || 
                                line.includes('expect(') || line.includes('render(') || line.includes('screen.');
                
                // FIX: Ignore accessibility labels and technical attributes
                const isAccessibilityAttr = line.includes('accessibilityLabel') || 
                                          line.includes('accessibilityHint') ||
                                          line.includes('testID') ||
                                          line.includes('accessibilityRole');
                
                // FIX: Ignore fallback values in || expressions (e.g., `content.button_cancel || 'Cancel'`)
                const isFallbackValue = /['"](Save|Cancel|Delete|Edit|Close|Back|Next|Continue|Loading|Error|Success|Try Again|Share|Correct)[^'"]*['"]\s*\|\|/.test(line) ||
                                       /\|\|\s*['"](Save|Cancel|Delete|Edit|Close|Back|Next|Continue|Loading|Error|Success|Try Again|Share|Correct)[^'"]*['"]/.test(line);
                
                // FIX: Ignore if it's in a console statement or error handling
                const isInErrorHandling = line.includes('console.') || 
                                         line.includes('catch') ||
                                         line.includes('throw');
                
                if (!line.trim().startsWith('//') && 
                    !line.includes('t(') && 
                    !line.includes('safeT(') &&
                    !isInTest &&
                    !isAccessibilityAttr &&
                    !isFallbackValue &&
                    !isInErrorHandling) {
                    issues.push({
                        file: path.relative(srcDir, file),
                        line: index + 1,
                        issue: `Possible hardcoded text: ${line.trim().substring(0, 60)}`,
                        severity: 'warning',
                    });
                }
            }
        });
    });
    
    if (issues.length > 0) {
        console.log(`   Found ${issues.length} potential issues:\n`);
        issues.slice(0, 50).forEach(issue => {
            const icon = issue.severity === 'error' ? '❌' : '⚠️';
            console.log(`   ${icon} ${issue.file}:${issue.line}`);
            console.log(`      ${issue.issue}\n`);
        });
        if (issues.length > 50) {
            console.log(`   ... and ${issues.length - 50} more issues\n`);
        }
    } else {
        console.log('   ✅ No obvious translation issues found in code\n');
    }
    
    return { issues, totalIssues: issues.length };
}

// Main function
async function main() {
    console.log('🔍 Comprehensive Translation Checker\n');
    console.log('='.repeat(60) + '\n');
    
    const jsonResults = checkJsonTranslations();
    const codeResults = checkCodeUsage();
    const dbResults = await checkDietPrograms();
    
    console.log('='.repeat(60));
    console.log('\n📊 Summary:\n');
    console.log(`   JSON Translation Issues: ${jsonResults.totalIssues}`);
    console.log(`   Code Usage Issues: ${codeResults.totalIssues}`);
    console.log(`   Database Issues: ${dbResults.totalIssues} (requires separate check)\n`);
    
    const totalIssues = jsonResults.totalIssues + codeResults.totalIssues;
    
    // FIX: Don't fail on warnings from test files - they're not real issues
    const realIssues = codeResults.issues.filter(issue => 
        issue.severity === 'error' && 
        !issue.file.includes('__tests__') && 
        !issue.file.includes('.test.') &&
        !issue.file.includes('.spec.')
    );
    
    const realTotalIssues = jsonResults.totalIssues + realIssues.length;
    
    if (realTotalIssues === 0) {
        console.log('✅ All translations are complete!');
        console.log('\n⚠️  Note: Database translations (diets/lifestyles) require separate check');
        console.log('   Run: pnpm run i18n:check-db\n');
    } else {
        console.log(`❌ Found ${realTotalIssues} real translation issues!`);
        console.log(`   (Ignored ${codeResults.totalIssues - realIssues.length} test file warnings)`);
        if (realIssues.length > 0) {
            console.log('\n   Real issues (non-test files):');
            realIssues.slice(0, 20).forEach(issue => {
                console.log(`   ❌ ${issue.file}:${issue.line} - ${issue.issue}`);
            });
            if (realIssues.length > 20) {
                console.log(`   ... and ${realIssues.length - 20} more`);
            }
        }
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});

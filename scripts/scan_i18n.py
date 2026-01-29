import os
import re
import json
import sys

# Configuration
PROJECT_ROOT = os.getcwd() # Assumes script is run from project root
SRC_DIR = os.path.join(PROJECT_ROOT, 'src')
LOCALES_DIR = os.path.join(PROJECT_ROOT, 'app', 'i18n', 'locales')
LANGUAGES = ['ru', 'en', 'kk', 'fr']

# Target areas for specific reporting
TARGET_AREAS = {
    'Onboarding': ['OnboardingScreen.js'],
    'Nutrition': ['DietsScreen.js', 'LifestyleDetailScreen.tsx', 'DietProgramDetailScreen.tsx'],
    'Dashboard': ['src/screens/DashboardScreen.js', 'src/components/dashboard/**/*.js', 'src/components/UsageSummary.tsx', 'src/components/ProfileModal.tsx'],
    'Analysis': ['src/screens/AnalysisResultsScreen.js', 'src/components/AnalysisFlow.tsx', 'src/components/AnalysisResults.tsx', 'src/components/AnalysisComponent.tsx'],
    'Gallery': ['src/screens/GalleryScreen.js'],
    'Profile': ['src/screens/ProfileScreen.js', 'src/screens/ExpertProfileScreen.js'],
    'Auth': ['src/components/AuthScreen.js', 'src/components/IncidentNotificationScreen.tsx'],
    'Common': ['src/components/ErrorBoundary.tsx', 'src/components/GracefulDegradationWrapper.tsx']
}

# Regex patterns
# Matches t('key.path') or t("key.path") with optional second parameter (fallback)
# Also matches t('key.path', 'fallback') or t('key.path', {params})
T_FUNCTION_PATTERN = re.compile(r't\(\s*[\'"]([a-zA-Z0-9_.]+)[\'"]\s*(?:,\s*[^)]+)?\)')
# Matches <Text>Some text</Text>, filtering out obvious code/variables later
JSX_TEXT_PATTERN = re.compile(r'>([^<{}]+)<')
# Matches specific props that often contain text
PROPS_PATTERN = re.compile(r'\b(title|label|placeholder|message|header)\s*=\s*["\']([^"\']{2,})["\']')

def load_locales():
    locales = {}
    for lang in LANGUAGES:
        path = os.path.join(LOCALES_DIR, f'{lang}.json')
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                try:
                    locales[lang] = json.load(f)
                except json.JSONDecodeError as e:
                    print(f"Error parsing {lang}.json: {e}")
                    locales[lang] = {}
        else:
            print(f"Warning: {lang}.json not found at {path}")
            locales[lang] = {}
    return locales

def get_nested_value(data, key_path):
    keys = key_path.split('.')
    curr = data
    for k in keys:
        if isinstance(curr, dict) and k in curr:
            curr = curr[k]
        else:
            return None
    return curr

def is_hardcoded_suspicious(text):
    text = text.strip()
    # Ignore empty, numbers, symbols only
    if not text or text.isdigit() or len(text) < 2:
        return False
    
    # Ignore specific code patterns commonly mistaken for JSX text
    code_indicators = [
        'Promise', 'void', 'return', 'import', 'export', 
        '||', '&&', '==', '!=', '=>', '):', '({', 
        '.includes(', '.map(', '.filter(', '.join(',
        'const ', 'let ', 'var ', 'function', 'class ',
        '(url: string', 'Record', 'Partial', 'Pick', 
        'Omit', '<T>'
    ]
    if any(indicator in text for indicator in code_indicators):
        return False

    # Ignore potential code artifacts (no spaces, camelCase) - heuristic
    if ' ' not in text and not text[0].isupper():
        return False
        
    return True

def scan_files():
    used_keys = set()
    hardcoded_issues = []
    
    for root, dirs, files in os.walk(SRC_DIR):
        # Skip test directories
        if '__tests__' in root or 'test' in root or 'tests' in root:
            continue
            
        for file in files:
            if file.endswith(('.js', '.jsx', '.ts', '.tsx')):
                # Skip test files
                if '.test.' in file or '.spec.' in file:
                    continue

                path = os.path.join(root, file)
                rel_path = os.path.relpath(path, PROJECT_ROOT)
                
                with open(path, 'r', encoding='utf-8') as f:
                    try:
                        content = f.read()
                        
                        # 1. Find translation keys
                        matches = T_FUNCTION_PATTERN.findall(content)
                        for match in matches:
                            # Ignore variable interpolation or obviously non-key strings
                            if '${' in match or len(match) < 2:
                                continue
                            # Ignore known technical false positives
                            if match in ['.', 'T', 'window', 'screen', 'api', 'cache', 'xss', 'b', 'a']:
                                continue
                                
                            used_keys.add((match, rel_path))
                        
                        # Find i18n.t('key') occurrences (if not using regex above which matches t('...'))
                        # The regex t\(... matches i18n.t(... because it looks for t(
                        # But wait, regex is r't\(\s*[\'"]...
                        # So it matches "t('key')" but NOT "i18n.t('key')" unless "t" is the function name.
                        # Actually regex is `t\(` so it expects `t` to be the start of the word or preceded by something?
                        # The regex `r't\(\s*...` matches `t('...` literal.
                        # It will match `i18n.t('...'` IF `t` is what it matches.
                        # But standard regex `t\(` matches `t` followed by `(`.
                        # If the text is `i18n.t('key')`, `t\(` matches the `t(` part.
                        # So yes, it catches `i18n.t`.
                        
                            
                        # 2. Find hardcoded text in JSX
                        lines = content.split('\n')
                        for i, line in enumerate(lines):
                            # Skip comments
                            if '//' in line and line.strip().startswith('//'): continue
                            
                            # JSX Text
                            jsx_matches = JSX_TEXT_PATTERN.findall(line)
                            for text in jsx_matches:
                                if is_hardcoded_suspicious(text):
                                    hardcoded_issues.append({
                                        'type': 'JSX Text',
                                        'file': rel_path,
                                        'line': i + 1,
                                        'text': text.strip()
                                    })
                                    
                            # Props
                            prop_matches = PROPS_PATTERN.findall(line)
                            for prop, text in prop_matches:
                                if is_hardcoded_suspicious(text) and not text.startswith('http'):
                                    hardcoded_issues.append({
                                        'type': f'Prop ({prop})',
                                        'file': rel_path,
                                        'line': i + 1,
                                        'text': text.strip()
                                    })
                                    
                    except Exception as e:
                        print(f"Error scanning {rel_path}: {e}")
                        
    return used_keys, hardcoded_issues

def main():
    print("Loading locales...")
    locales = load_locales()
    
    print(f"Scanning source files in {SRC_DIR}...")
    used_keys, hardcoded_issues = scan_files()
    
    # 1. Check Missing Keys
    print("\n" + "="*50)
    print("MISSING TRANSLATION KEYS")
    print("="*50)
    
    missing_report = {lang: [] for lang in LANGUAGES}
    
    for key, source_file in used_keys:
        for lang in LANGUAGES:
            val = get_nested_value(locales[lang], key)
            if not val:
                missing_report[lang].append((key, source_file))
                
    for lang in LANGUAGES:
        if missing_report[lang]:
            print(f"\n[{lang.upper()}] Missing {len(missing_report[lang])} keys:")
            # Sort by file for easier fixing
            sorted_missing = sorted(missing_report[lang], key=lambda x: x[1])
            for k, f in sorted_missing:
                # Highlight if it's in target areas
                prefix = ">>> " if any(t in f for t in TARGET_AREAS['Onboarding'] + TARGET_AREAS['Nutrition']) else "    "
                print(f"{prefix}{f}: {k}")
                
    # 2. Check Hardcoded Strings
    print("\n" + "="*50)
    print("POTENTIAL HARDCODED STRINGS")
    print("="*50)
    
    # Group by area
    onboarding_issues = []
    nutrition_issues = []
    other_issues = []
    
    for issue in hardcoded_issues:
        f = issue['file']
        if any(t in f for t in TARGET_AREAS['Onboarding']):
            onboarding_issues.append(issue)
        elif any(t in f for t in TARGET_AREAS['Nutrition']):
            nutrition_issues.append(issue)
        else:
            other_issues.append(issue)
            
    def print_issues(issues, title):
        if not issues: return
        print(f"\n--- {title} ---")
        for i in issues:
            print(f"{i['file']}:{i['line']} [{i['type']}] \"{i['text']}\"")

    print_issues(onboarding_issues, "ONBOARDING (CRITICAL)")
    print_issues(nutrition_issues, "NUTRITION / DIETS (CRITICAL)")
    # Limit 'other' output to avoid spamming the logs if there are too many
    if len(other_issues) > 20:
        print(f"\n--- OTHER FILES ({len(other_issues)} issues found, showing first 20) ---")
        for i in other_issues[:20]:
            print(f"{i['file']}:{i['line']} [{i['type']}] \"{i['text']}\"")
    else:
        print_issues(other_issues, "OTHER FILES")

if __name__ == "__main__":
    main()

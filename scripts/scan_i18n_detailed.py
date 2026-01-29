#!/usr/bin/env python3
"""
Детальная проверка переводов для онбординга и раздела Питания
Проверяет все ключи переводов в критических областях приложения

Использование:
    python3 scripts/scan_i18n_detailed.py

Или:
    cd /path/to/project
    python3 scripts/scan_i18n_detailed.py

Скрипт проверяет:
- Онбординг (все слайды)
- Раздел Питания - Диеты (все экраны, карточки, категории)
- Раздел Питания - Стили жизни (все компоненты)
- Раздел Питания - Трекер программ
- Paywall (ограничения)

Проверяет переводы для: ru, en, kk, fr
"""

import os
import re
import json
import sys
import glob
from collections import defaultdict

# Configuration
PROJECT_ROOT = os.getcwd()
SRC_DIR = os.path.join(PROJECT_ROOT, 'src')
LOCALES_DIR = os.path.join(PROJECT_ROOT, 'app', 'i18n', 'locales')
LANGUAGES = ['ru', 'en', 'kk', 'fr']

# Расширенные области для детальной проверки
TARGET_AREAS = {
    'Onboarding': {
        'files': [
            'src/screens/OnboardingScreen.js',
        ],
        'components': [
            'src/components/HealthDisclaimer.jsx',
            'src/components/LegalDocumentView.tsx',
        ],
        'keys': [
            'onboarding.',
            'subscription.',
            'error.',
        ]
    },
    'Nutrition_Diets': {
        'files': [
            'src/screens/DietsScreen.js',
            'src/screens/DietProgramDetailScreen.tsx',
            'src/screens/DietProgramProgressScreen.tsx',
            'src/screens/DietProgramsListScreen.tsx',
        ],
        'components': [
            'src/components/programs/DietsTabContent.tsx',
            'src/components/programs/SuggestProgramCard.tsx',
            'src/components/HistoricalDietsCarousel.tsx',
        ],
        'keys': [
            'diets.',
            'dietPrograms.',
            'diets_',
            'errors.startProgram',
            'errors.stopProgram',
            'errors.pauseProgram',
            'errors.completeDay',
        ]
    },
    'Nutrition_Lifestyles': {
        'files': [
            'src/screens/LifestyleDetailScreen.tsx',
        ],
        'components': [
            'src/features/lifestyles/components/LifestyleDetailScreen.tsx',
            'src/features/lifestyles/components/LifestyleTabContent.tsx',
            'src/features/lifestyles/components/LifestyleCard.tsx',
            'src/features/lifestyles/components/CategoryChips.tsx',
            'src/features/lifestyles/components/DisclaimerBanner.tsx',
            'src/features/lifestyles/components/TrendingCarousel.tsx',
        ],
        'keys': [
            'lifestyles.',
            'dietPrograms.',
            'errors.',
        ]
    },
    'Nutrition_Tracker': {
        'files': [
            'src/screens/DietProgramProgressScreen.tsx',
        ],
        'components': [
            'src/components/dashboard/ActiveDietWidget.js',
        ],
        'keys': [
            'dietPrograms.',
            'diets.tracker.',
            'dashboard.activeDiet.',
        ]
    },
    'Paywall': {
        'files': [],
        'components': [
            'src/components/PaywallModal.tsx',
        ],
        'keys': [
            'paywall.',
            'limits.',
        ]
    }
}

# Regex patterns
T_FUNCTION_PATTERN = re.compile(r't\(\s*[\'"]([a-zA-Z0-9_.]+)[\'"]\s*(?:,\s*[^)]+)?\)')
JSX_TEXT_PATTERN = re.compile(r'>([^<{}]+)<')
PROPS_PATTERN = re.compile(r'\b(title|label|placeholder|message|header|subtitle|description|hint)\s*=\s*["\']([^"\']{2,})["\']')

def load_locales():
    """Загружает все файлы локализации"""
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
    """Получает значение по вложенному пути ключа"""
    # Проверяем плоские ключи (например, diets_title)
    if key_path in data:
        return data[key_path]
    
    # Проверяем вложенные ключи (например, diets.title)
    keys = key_path.split('.')
    curr = data
    for k in keys:
        if isinstance(curr, dict) and k in curr:
            curr = curr[k]
        else:
            return None
    return curr

def is_hardcoded_suspicious(text):
    """Проверяет, является ли текст подозрительным хардкодом"""
    text = text.strip()
    if not text or text.isdigit() or len(text) < 2:
        return False
    
    code_indicators = [
        'Promise', 'void', 'return', 'import', 'export', 
        '||', '&&', '==', '!=', '=>', '):', '({', 
        '.includes(', '.map(', '.filter(', '.join(',
        'const ', 'let ', 'var ', 'function', 'class ',
        '(url: string', 'Record', 'Partial', 'Pick', 
        'Omit', '<T>', 'DELETE', 'HEAD', 'GET', 'PUT',
        'Performance', 'Error'
    ]
    if any(indicator in text for indicator in code_indicators):
        return False

    if ' ' not in text and not text[0].isupper():
        return False
        
    return True

def scan_target_files():
    """Сканирует только целевые файлы для онбординга и Питания"""
    used_keys = defaultdict(set)  # {area: set of (key, file)}
    hardcoded_issues = defaultdict(list)  # {area: list of issues}
    
    # Собираем все файлы для сканирования
    files_to_scan = set()
    for area, config in TARGET_AREAS.items():
        for file_path in config['files']:
            full_path = os.path.join(PROJECT_ROOT, file_path)
            if os.path.exists(full_path):
                files_to_scan.add((full_path, area))
            else:
                # Попробуем найти файл по имени
                filename = os.path.basename(file_path)
                matches = glob.glob(os.path.join(PROJECT_ROOT, '**', filename), recursive=True)
                for match in matches:
                    if os.path.isfile(match):
                        files_to_scan.add((match, area))
        
        for component_path in config['components']:
            # Поддержка wildcards
            if '**' in component_path:
                pattern = component_path.replace('**', '*')
                matches = glob.glob(os.path.join(PROJECT_ROOT, pattern), recursive=True)
                for match in matches:
                    if os.path.isfile(match):
                        files_to_scan.add((match, area))
            else:
                full_path = os.path.join(PROJECT_ROOT, component_path)
                if os.path.exists(full_path):
                    files_to_scan.add((full_path, area))
                else:
                    # Попробуем найти файл по имени
                    filename = os.path.basename(component_path)
                    matches = glob.glob(os.path.join(PROJECT_ROOT, '**', filename), recursive=True)
                    for match in matches:
                        if os.path.isfile(match):
                            files_to_scan.add((match, area))
    
    # Сканируем файлы
    for file_path, area in files_to_scan:
        rel_path = os.path.relpath(file_path, PROJECT_ROOT)
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
                # Находим ключи переводов
                matches = T_FUNCTION_PATTERN.findall(content)
                for match in matches:
                    if '${' in match or len(match) < 2:
                        continue
                    if match in ['.', 'T', 'window', 'screen', 'api', 'cache', 'xss', 'b', 'a']:
                        continue
                    
                    # Добавляем все ключи из целевых файлов
                    used_keys[area].add((match, rel_path))
                
                # Находим хардкод
                lines = content.split('\n')
                for i, line in enumerate(lines):
                    if '//' in line and line.strip().startswith('//'):
                        continue
                    
                    jsx_matches = JSX_TEXT_PATTERN.findall(line)
                    for text in jsx_matches:
                        if is_hardcoded_suspicious(text):
                            hardcoded_issues[area].append({
                                'type': 'JSX Text',
                                'file': rel_path,
                                'line': i + 1,
                                'text': text.strip()
                            })
                    
                    prop_matches = PROPS_PATTERN.findall(line)
                    for prop, text in prop_matches:
                        if is_hardcoded_suspicious(text) and not text.startswith('http'):
                            hardcoded_issues[area].append({
                                'type': f'Prop ({prop})',
                                'file': rel_path,
                                'line': i + 1,
                                'text': text.strip()
                            })
                            
        except Exception as e:
            print(f"Error scanning {rel_path}: {e}")
    
    return used_keys, hardcoded_issues

def main():
    print("="*70)
    print("ДЕТАЛЬНАЯ ПРОВЕРКА ПЕРЕВОДОВ")
    print("Онбординг и раздел Питания")
    print("="*70)
    
    print("\nЗагрузка файлов локализации...")
    locales = load_locales()
    
    print("Сканирование целевых файлов...")
    used_keys, hardcoded_issues = scan_target_files()
    
    # Выводим результаты по областям
    area_names = {
        'Onboarding': '🎯 ОНБОРДИНГ (все слайды)',
        'Nutrition_Diets': '🍽️ РАЗДЕЛ ПИТАНИЯ - Диеты',
        'Nutrition_Lifestyles': '🌟 РАЗДЕЛ ПИТАНИЯ - Стили жизни',
        'Nutrition_Tracker': '📊 РАЗДЕЛ ПИТАНИЯ - Трекер программ',
        'Paywall': '💳 Paywall (ограничения)',
    }
    
    # Статистика по найденным файлам
    print("\nНайдено файлов для проверки:")
    for area, keys_set in used_keys.items():
        files_in_area = set(file for _, file in keys_set)
        unique_keys = set(key for key, _ in keys_set)
        print(f"  {area_names.get(area, area)}: {len(files_in_area)} файлов, {len(unique_keys)} уникальных ключей")
    
    # Проверка недостающих ключей по областям
    print("\n" + "="*70)
    print("НЕДОСТАЮЩИЕ КЛЮЧИ ПЕРЕВОДОВ")
    print("="*70)
    
    missing_by_area = defaultdict(lambda: defaultdict(list))  # {area: {lang: [(key, file)]}}
    
    for area, keys_set in used_keys.items():
        for key, source_file in keys_set:
            for lang in LANGUAGES:
                val = get_nested_value(locales[lang], key)
                if not val:
                    missing_by_area[area][lang].append((key, source_file))
    
    total_missing = {lang: 0 for lang in LANGUAGES}
    
    for area in ['Onboarding', 'Nutrition_Diets', 'Nutrition_Lifestyles', 'Nutrition_Tracker', 'Paywall']:
        if area not in missing_by_area:
            continue
            
        print(f"\n{area_names.get(area, area)}")
        print("-" * 70)
        
        for lang in LANGUAGES:
            missing_list = missing_by_area[area][lang]
            if missing_list:
                total_missing[lang] += len(missing_list)
                print(f"\n[{lang.upper()}] Недостает {len(missing_list)} ключей:")
                # Группируем по файлам
                by_file = defaultdict(list)
                for key, file in missing_list:
                    by_file[file].append(key)
                
                for file, keys in sorted(by_file.items()):
                    print(f"  📄 {file}:")
                    for key in sorted(set(keys)):
                        print(f"     - {key}")
    
    # Итоговая статистика
    print("\n" + "="*70)
    print("ИТОГОВАЯ СТАТИСТИКА")
    print("="*70)
    for lang in LANGUAGES:
        print(f"[{lang.upper()}] Всего недостает: {total_missing[lang]} ключей")
    
    # Проверка хардкода
    print("\n" + "="*70)
    print("ПОТЕНЦИАЛЬНЫЙ ХАРДКОД")
    print("="*70)
    
    for area in ['Onboarding', 'Nutrition_Diets', 'Nutrition_Lifestyles', 'Nutrition_Tracker', 'Paywall']:
        issues = hardcoded_issues.get(area, [])
        if issues:
            print(f"\n{area_names.get(area, area)}:")
            for issue in issues[:10]:  # Показываем первые 10
                print(f"  {issue['file']}:{issue['line']} [{issue['type']}] \"{issue['text'][:50]}...\"")
            if len(issues) > 10:
                print(f"  ... и еще {len(issues) - 10} проблем")
    
    print("\n" + "="*70)
    print("ПРОВЕРКА ЗАВЕРШЕНА")
    print("="*70)

if __name__ == "__main__":
    main()

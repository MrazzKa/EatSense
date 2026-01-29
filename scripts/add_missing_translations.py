#!/usr/bin/env python3
"""
Скрипт для автоматического добавления недостающих переводов
на основе вывода scan_i18n_detailed.py
"""

import os
import json
import sys
from collections import defaultdict

PROJECT_ROOT = os.getcwd()
LOCALES_DIR = os.path.join(PROJECT_ROOT, 'app', 'i18n', 'locales')
LANGUAGES = ['ru', 'en', 'kk', 'fr']

# Недостающие ключи из вывода scan_i18n_detailed.py
MISSING_KEYS = {
    'en': {
        'common.error': 'Error',
        'common.of': 'of',
        'common.ok': 'OK',
        'common.other': 'Other',
        'common.required': 'Required',
        'common.retry': 'Retry',
        'error.title': 'Error',
        'errors.navigationError': 'Navigation error occurred',
        'errors.navigationNotAvailable': 'Navigation not available. Please restart the app.',
        'onboarding.acceptPrivacy': 'I accept the Privacy Policy',
        'onboarding.acceptTerms': 'I accept the Terms of Service',
        'onboarding.activity': 'How active are you?',
        'onboarding.activityLevels.extremelyActive': 'Extremely Active',
        'onboarding.activityLevels.extremelyActiveDesc': 'Very heavy exercise, physical job',
        'onboarding.activityLevels.lightlyActive': 'Lightly Active',
        'onboarding.activityLevels.lightlyActiveDesc': 'Light exercise 1-3 days/week',
        'onboarding.activityLevels.moderatelyActive': 'Moderately Active',
        'onboarding.activityLevels.moderatelyActiveDesc': 'Moderate exercise 3-5 days/week',
        'onboarding.activityLevels.sedentary': 'Sedentary',
        'onboarding.activityLevels.sedentaryDesc': 'Little to no exercise',
        'onboarding.activityLevels.veryActive': 'Very Active',
        'onboarding.activityLevels.veryActiveDesc': 'Heavy exercise 6-7 days/week',
        'onboarding.activitySubtitle': 'This helps us calculate your calorie needs',
        'onboarding.additionalPlans': 'Additional Plans',
        'onboarding.age': 'How old are you?',
        'onboarding.ageSubtitle': 'Age helps personalize your nutrition plan',
        'onboarding.buttons.back': 'Back',
        'onboarding.buttons.next': 'Next',
        'onboarding.caloriesLabel': 'Calories',
        'onboarding.carbsLabel': 'Carbs',
        'onboarding.continueButton': 'Continue',
        'onboarding.continueFree': 'Continue Free',
        'onboarding.diet': 'Are you following any diet?',
        'onboarding.dietSubtitle': 'Choose a diet type that suits you',
        'onboarding.dietTypes.balanced': 'Balanced',
        'onboarding.dietTypes.keto': 'Keto',
        'onboarding.dietTypes.lowCarb': 'Low Carb',
        'onboarding.dietTypes.mediterranean': 'Mediterranean',
        'onboarding.dietTypes.none': 'No Specific Diet',
        'onboarding.dietTypes.paleo': 'Paleo',
        'onboarding.dietTypes.vegan': 'Vegan',
        'onboarding.dietTypes.vegetarian': 'Vegetarian',
        'onboarding.fatLabel': 'Fat',
        'onboarding.features.analysis': 'AI Food Analysis',
        'onboarding.features.insights': 'Health Insights',
        'onboarding.features.tracking': 'Smart Tracking',
        'onboarding.gender': "What's your gender?",
        'onboarding.genderSubtitle': 'Needed for accurate calorie calculation',
        'onboarding.genders.female': 'Female',
        'onboarding.genders.male': 'Male',
        'onboarding.genders.nonBinary': 'Non-binary',
        'onboarding.genders.other': 'Other',
        'onboarding.genders.preferNotToSay': 'Prefer not to say',
        'onboarding.goalTypes.gainWeight': 'Gain Weight',
        'onboarding.goalTypes.loseWeight': 'Lose Weight',
        'onboarding.goalTypes.maintainWeight': 'Maintain Weight',
        'onboarding.goals': 'What are your goals?',
        'onboarding.goalsSubtitle': 'Choose what you want to achieve',
        'onboarding.health': 'What should we know about you?',
        'onboarding.healthConditions.diabetes': 'Diabetes',
        'onboarding.healthConditions.gastritis': 'Gastritis',
        'onboarding.healthConditions.highCholesterol': 'High Cholesterol',
        'onboarding.healthConditions.none': 'None of the above',
        'onboarding.healthConditions.other': "Not in list, I'll write",
        'onboarding.healthConditions.thyroid': 'Thyroid Issues',
        'onboarding.healthSubtitle': 'Select if any apply to you',
        'onboarding.height': "What's your height?",
        'onboarding.heightSubtitle': 'Needed for ideal weight calculation',
        'onboarding.loading': 'Creating your plan',
        'onboarding.notifications': 'Enable notifications',
        'onboarding.notificationsDeniedDescription': 'You can enable notifications later in the app settings or iOS system settings to receive meal reminders and helpful tips.',
        'onboarding.notificationsDeniedHint': 'You can enable notifications in the app settings later.',
        'onboarding.notificationsDeniedTitle': 'Notifications disabled',
        'onboarding.notificationsDescription': 'Get reminders about meals, water intake, and your health goals.',
        'onboarding.notificationsEnabledDescription': "We'll send reminders about meals and helpful tips. You can change settings anytime.",
        'onboarding.notificationsEnabledTitle': 'Notifications Enabled!',
        'onboarding.notificationsHint': 'You can disable notifications in app settings or iOS system settings.',
        'onboarding.notificationsReady': 'Ready!',
        'onboarding.plan': 'Choose Your Plan',
        'onboarding.planReady': 'Your personalized plan',
        'onboarding.planSubtitle': 'Select a plan that works for you',
        'onboarding.plans.bestValue': 'Best Value',
        'onboarding.plans.features.analysis3': 'AI food analysis (3/day)',
        'onboarding.plans.features.badge': 'Exclusive Founder Badge',
        'onboarding.plans.features.basicStats': 'Basic statistics',
        'onboarding.plans.features.coaching': 'Personalized coaching',
        'onboarding.plans.features.earlyAccess': 'Early access to features',
        'onboarding.plans.features.everything': 'Everything in Monthly',
        'onboarding.plans.features.insights': 'Advanced nutrition insights',
        'onboarding.plans.features.lifetime': 'One-time payment, forever access',
        'onboarding.plans.features.priority': 'Direct developer access',
        'onboarding.plans.features.support': 'Priority support',
        'onboarding.plans.features.tracking': 'Daily calorie tracking',
        'onboarding.plans.features.unlimited': 'Unlimited AI analysis',
        'onboarding.plans.features.verification': 'Student ID required',
        'onboarding.plans.features.webinars': 'Exclusive webinars',
        'onboarding.plans.finePrint': 'You can change plans or cancel anytime from Settings.',
        'onboarding.plans.founder.name': 'Founder',
        'onboarding.plans.founderBadge': 'Limited',
        'onboarding.plans.founderHeadline': 'Lifetime access + Exclusive badge',
        'onboarding.plans.free.name': 'EatSense Free',
        'onboarding.plans.free.price': '$0 forever',
        'onboarding.plans.freeHeadline': 'Get started with the essentials',
        'onboarding.plans.included': 'Included',
        'onboarding.plans.month': 'mo',
        'onboarding.plans.monthly': 'Monthly',
        'onboarding.plans.monthlyHeadline': 'Flexible billing',
        'onboarding.plans.proMonthly.badge': 'Most Popular',
        'onboarding.plans.student.name': 'Student',
        'onboarding.plans.studentBadge': 'Student',
        'onboarding.plans.studentHeadline': 'Special student pricing',
        'onboarding.plans.year': 'yr',
        'onboarding.plans.yearly': 'Yearly',
        'onboarding.plans.yearlyHeadline': 'Best value — save 33%',
        'onboarding.privacyPolicy': 'Privacy Policy',
        'onboarding.profileSavedLocally': 'Profile saved locally. You can complete setup later in settings.',
        'onboarding.proteinLabel': 'Protein',
        'onboarding.recommendedIntake': 'Recommended daily intake:',
        'onboarding.setupComplete': 'Setup Complete',
        'onboarding.specifyCondition': 'Please specify condition',
        'onboarding.specifyDiet': 'Please specify your diet',
        'onboarding.startFree': 'Start Now',
        'onboarding.subscribe': 'Subscribe',
        'onboarding.targetWeight': 'What weight do you want?',
        'onboarding.targetWeightLabel': 'Target weight',
        'onboarding.targetWeightSubtitle': 'What weight are you aiming for?',
        'onboarding.terms': 'Terms & Privacy',
        'onboarding.termsOfService': 'Terms of Service',
        'onboarding.termsSubtitle': 'Please read and accept to continue',
        'onboarding.units.kg': 'kg',
        'onboarding.units.pounds': 'Pounds',
        'onboarding.units.years': 'years',
        'onboarding.validation.activity': 'Please select your activity level.',
        'onboarding.validation.gender': 'Please select your gender.',
        'onboarding.validation.goal': 'Please select your goal.',
        'onboarding.weight': "What's your weight?",
        'onboarding.weightSubtitle': 'Current weight is needed for calorie calculation',
        'onboarding.welcome': 'Welcome to EatSense',
        'onboarding.welcomeSubtitle': "Your AI-powered nutrition companion. Let's personalize your experience!",
        'subscription.purchaseFailed': 'Purchase failed. Please try again.',
        'diets_days': 'days',
        'diets_historical_section_disclaimer_banner': 'These are approximations for fun, not medical recommendations',
        'diets_historical_section_subtitle': 'Fun diets inspired by history and culture',
        'diets_historical_section_title': 'Historical & Inspired',
        'diets_all': 'All',
        'diets_browse': 'Browse All',
        'diets_difficulty_easy': 'Easy',
        'diets_difficulty_hard': 'Hard',
        'diets_difficulty_moderate': 'Moderate',
        'diets_featured': 'Popular Diets',
        'diets_filter_difficulty': 'Difficulty',
        'diets_health': 'Health',
        'diets_medical': 'Medical',
        'diets_no_diets': 'No diets found',
        'diets_recommended': 'Recommended for You',
        'diets_recommended_description': 'Based on your profile and eating habits',
        'diets_sports': 'Sports',
        'diets_weight_loss': 'Weight Loss',
        'diets_search_placeholder': 'Search diets...',
        'diets_subtitle': 'Find the perfect nutrition plan for you',
        'diets_title': 'Nutrition',
        'lifestyles.loading_more': 'Loading more programs...',
        'lifestyles.search.placeholder': 'Search lifestyle programs...',
        'common.cancel': 'Cancel',
        'common.error': 'Error',
        'suggest.contact_success': 'Your request has been sent',
        'suggest.error': 'Failed to send request',
        'suggest.modal_title': 'Suggestions',
        'suggest.name_placeholder': 'Your name',
        'suggest.name_required': 'Enter your name',
        'suggest.request_placeholder': 'Your request',
        'suggest.request_required': 'Enter your request',
        'suggest.submit': 'Submit',
        'suggest.subtitle': 'Write to us — name and request',
        'suggest.title': 'Suggestions',
        'common.continue': 'Continue',
        'common.days': 'days',
        'dietPrograms.about': 'About',
        'dietPrograms.anotherDietActive': 'Another Diet Active',
        'dietPrograms.anotherDietActiveMessage': 'You already have an active diet. Complete or abandon it first.',
        'dietPrograms.continueProgram': 'Continue Program',
        'dietPrograms.empty': 'Program not found',
        'dietPrograms.kcalDay': 'kcal/day',
        'dietPrograms.level': 'Level',
        'dietPrograms.previewDay1': 'Preview Day 1',
        'dietPrograms.startConfirm': 'Start',
        'dietPrograms.startProgram': 'Start Program',
        'dietPrograms.viewActive': 'View Active',
        'diets.daily_tracker_preview': 'Daily Tracker',
        'diets.disclaimers.historical': 'Historical/inspired reconstruction. Not guaranteed historically accurate.',
        'diets.disclaimers.medical': 'This diet may have contraindications. Consult a professional.',
        'diets.how_it_works': 'How It Works',
        'diets.medical_note': 'This diet may have contraindications. Consult a healthcare professional before starting.',
        'diets.more_items': 'More',
        'diets.not_for': 'Not recommended for:',
        'diets.tracker_preview_hint': 'Track your daily progress with this checklist',
        'diets_daily_tracker_preview': 'Daily Tracker',
        'diets_tracker_preview_hint': 'Track your daily progress with this checklist',
        'errors.startProgram': 'Failed to start program',
        'common.goBack': 'Go back',
        'common.loading': 'Loading...',
        'common.stop': 'Stop',
        'dietPrograms.completeDay': 'Complete Day',
        'dietPrograms.completed': 'Completed',
        'dietPrograms.completedMessage': 'Completed Message',
        'dietPrograms.day': 'Day',
        'dietPrograms.dayCompleted': 'Day completed',
        'dietPrograms.finishProgram': 'Finish Program',
        'dietPrograms.mealsForDay': 'Meals for Day',
        'dietPrograms.notFound': 'Not Found',
        'dietPrograms.pause': 'Pause',
        'dietPrograms.pauseProgram': 'Pause',
        'dietPrograms.pauseProgramConfirm': 'Would you like to pause the diet? You can resume anytime.',
        'dietPrograms.resume': 'Resume',
        'dietPrograms.resumeProgram': 'Resume',
        'dietPrograms.resumeProgramConfirm': 'Continue the diet from where you left off?',
        'dietPrograms.stopProgram': 'Stop Program',
        'dietPrograms.stopProgramConfirm': 'Are you sure you want to stop the program? Your progress will be saved.',
        'diets.tracker.days': 'days',
        'errors.completeDay': 'Failed to complete day',
        'errors.pauseProgram': 'Failed to pause diet',
        'errors.stopProgram': 'Failed to stop program',
        'dietPrograms.featured': 'Featured',
        'dietPrograms.title': 'Title',
        'lifestyles.categories.all': 'All',
        'lifestyles.disclaimer': 'This is lifestyle inspiration, not medical advice. Consult a healthcare professional for medical guidance.',
        'lifestyles.card.view': 'View',
        'lifestyles.detail.continueProgram': 'Continue',
        'lifestyles.detail.dailyInspiration': 'Daily Inspiration',
        'lifestyles.detail.embrace': 'Embrace',
        'lifestyles.detail.evening': 'Evening',
        'lifestyles.detail.mantra': 'Daily Mantra',
        'lifestyles.detail.midday': 'Midday',
        'lifestyles.detail.minimize': 'Minimize',
        'lifestyles.detail.morning': 'Morning',
        'lifestyles.detail.philosophy': 'Philosophy',
        'lifestyles.detail.sampleDay': 'Sample Day',
        'lifestyles.detail.startProgram': 'Start Program',
        'lifestyles.detail.vibe': 'Vibe',
        'lifestyles.empty': 'No lifestyle programs found',
        'lifestyles.filters_target_label': 'Target:',
        'lifestyles.loading': 'Loading',
        'common.days': 'days',
        'lifestyles.trending': 'Trending',
        'common.goTo': 'Go to',
        'lifestyles.loadError': 'Failed to load program',
        'lifestyles.programAlreadyActive': 'You are already enrolled in this program.',
        'lifestyles.programNotFound': 'Program not found',
        'lifestyles.programStarted': 'Program started!',
        'lifestyles.programStartedMessage': 'You started "{{name}}". Track your progress on the main screen.',
        'lifestyles.startFailed': 'Failed to start program. Please try again later.',
        'dashboard.activeDiet.browseDiets': 'Browse diets',
        'dashboard.activeDiet.completed': 'completed',
        'dashboard.activeDiet.daysLeft': 'Days left',
        'dashboard.activeDiet.noDiet': 'Choose a diet',
        'dashboard.activeDiet.openTracker': 'Open tracker',
        'dashboard.activeDiet.progress': "Today's progress",
        'dashboard.activeDiet.streak': 'days streak',
        'paywall.features.diets': 'Access to all diets & lifestyles',
        'paywall.features.insights': 'Advanced nutrition insights',
        'paywall.features.support': 'Priority support',
        'paywall.features.unlimited': 'Unlimited AI food analysis',
        'paywall.finePrint': 'Cancel anytime. You won\'t be charged during the trial period.',
        'paywall.freeTrial': 'Free trial',
        'paywall.recommended': 'Recommended',
        'paywall.startTrial': 'Start {{days}}-Day Free Trial',
        'paywall.subtitle': 'Get unlimited access to all features',
        'paywall.title': 'Upgrade to Pro',
        'paywall.unlockFeature': 'Unlock "{{feature}}" and more'
    },
    'kk': {
        # Те же ключи, что и для EN, но с казахскими переводами
        # Добавлю основные переводы
    },
    'ru': {
        'common.goTo': 'Перейти'
    }
}

def get_nested_value(data, key_path):
    """Получает значение по вложенному пути ключа"""
    if key_path in data:
        return data[key_path]
    keys = key_path.split('.')
    curr = data
    for k in keys:
        if isinstance(curr, dict) and k in curr:
            curr = curr[k]
        else:
            return None
    return curr

def set_nested_value(data, key_path, value):
    """Устанавливает значение по вложенному пути ключа"""
    keys = key_path.split('.')
    curr = data
    for k in keys[:-1]:
        if k not in curr:
            curr[k] = {}
        curr = curr[k]
    curr[keys[-1]] = value

def add_missing_keys():
    """Добавляет недостающие ключи во все языки"""
    for lang in LANGUAGES:
        path = os.path.join(LOCALES_DIR, f'{lang}.json')
        if not os.path.exists(path):
            print(f"Warning: {lang}.json not found")
            continue
        
        with open(path, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError as e:
                print(f"Error parsing {lang}.json: {e}")
                continue
        
        missing = MISSING_KEYS.get(lang, {})
        added_count = 0
        
        for key, value in missing.items():
            if not get_nested_value(data, key):
                set_nested_value(data, key, value)
                added_count += 1
        
        if added_count > 0:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"[{lang.upper()}] Added {added_count} missing keys")
        else:
            print(f"[{lang.upper()}] No missing keys to add")

if __name__ == "__main__":
    print("Adding missing translation keys...")
    add_missing_keys()
    print("Done!")

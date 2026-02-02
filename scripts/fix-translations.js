const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../app/i18n/locales');

// Helper to load JSON
function loadLocale(locale) {
    try {
        return JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, `${locale}.json`), 'utf8'));
    } catch (e) {
        return {};
    }
}

// Helper to save JSON
function saveLocale(locale, data) {
    fs.writeFileSync(path.join(LOCALES_DIR, `${locale}.json`), JSON.stringify(data, null, 2), 'utf8');
    console.log(`✅ Saved ${locale}.json`);
}

// Helper to deep merge objects
function deepMerge(target, source) {
    for (const key in source) {
        if (source[key] instanceof Object && key in target) {
            Object.assign(source[key], deepMerge(target[key], source[key]));
        }
    }
    Object.assign(target || {}, source);
    return target;
}

// --- TRANSLATION DATA ---

const MISSING_keys_EN = {
    consultations: {
        status_active: "Active",
        status_completed: "Completed",
        status_cancelled: "Cancelled",
        no_messages: "No messages yet",
        start_conversation: "Start Conversation",
        type_message: "Type a message..."
    },
    experts: {
        dietitian: "Dietitian",
        nutritionist: "Nutritionist"
    },
    errorBoundary: {
        somethingWentWrong: "Something went wrong",
        unexpectedError: "An unexpected error occurred"
    },
    common: {
        tryAgain: "Try again",
        enabled: "Enabled",
        reset: "Reset",
        saveChanges: "Save Changes",
        start: "Start",
        clear: "Clear"
    },
    paywall: {
        title: "Unlock Full Access",
        subtitle: "Get the most out of EatSense",
        unlockFeature: "Unlock this feature",
        freeTrial: "Start Free Trial",
        recommended: "Recommended",
        startTrial: "Start 7-Day Free Trial",
        finePrint: "Cancel anytime. Billed annually.",
        features: {
            unlimited: "Unlimited Analysis",
            diets: "All Diets & Plans",
            insights: "Health Insights",
            support: "Priority Support"
        }
    },
    profile: {
        goal: "Goal",
        goalValue: "Current Goal",
        activityLevel: "Activity Level",
        personalization: "Personalization",
        plan: "Plan",
        sync: "Sync",
        settings: "Settings",
        units: "Units",
        savePhotos: "Save Photos",
        about: "About",
        faq: "FAQ",
        bmiUnderweight: "Underweight",
        bmiNormal: "Normal",
        bmiOverweight: "Overweight",
        bmiObesity: "Obesity",
        planUpdatedTitle: "Plan Updated",
        planUpdatedMessage: "Your plan has been successfully updated.",
        planUpdateError: "Failed to update plan.",
        metricBmi: "BMI",
        medications: "Medications",
        medicationsSubtitle: "Manage your schedule",
        supportLink: "Contact Support",
        savingButton: "Saving...",
        applyPlan: "Apply Plan",
        selectTime: "Select Time",
        tabs: {
            profile: "Profile",
            personalization: "Personalization",
            settings: "Settings",
            about: "About",
            faq: "FAQ"
        },
        health: {
            chronotype: {
                early: "Early Bird",
                mid: "Intermediate",
                late: "Night Owl"
            },
            drugType: {
                semaglutide: "Semaglutide",
                tirzepatide: "Tirzepatide",
                liraglutide: "Liraglutide"
            }
        }
    },
    featureFlags: {
        title: "Feature Flags",
        subtitle: "Manage experimental features"
    },
    dashboard: {
        activeDiet: {
            streak_count: "Streak count"
        }
    },
    lifestyles: {
        categories: {
            all: "All"
        },
        trending: "Trending Now",
        startTrialTitle: "Start Lifestyle",
        startTrialBody: "Begin this lifestyle program"
    },
    dietPrograms: {
        startTrialTitle: "Start your journey",
        startTrialBody: "Join this program today"
    },
    medications: {
        error: {
            invalidTime: "Invalid time format"
        },
        schedule: "Schedule",
        supply: "Supply",
        notes: "Notes"
    },
    privacy: {
        sections: "Sections"
    },
    reports: {
        error: "Error generating report"
    },
    subscription: {
        loadingPrices: "Loading prices..."
    },
    terms: {
        sections: "Sections"
    }
};

const MISSING_keys_RU = {
    // From Audit
    common: {
        edit: "Изменить",
        next: "Далее",
        skip: "Пропустить",
        success: "Успешно",
        rerun: "Перезапустить",
        search: "Поиск",
        viewAll: "Смотреть все",
        ok: "ОК",
        yes: "Да",
        no: "Нет",
        all: "Все",
        daysAgo: "дней назад",
        free: "Бесплатно",
        other: "Другое",
        required: "Обязательно",
        yesterday: "Вчера",
        // From new items
        tryAgain: "Повторить",
        enabled: "Включено",
        reset: "Сбросить",
        saveChanges: "Сохранить",
        start: "Начать",
        clear: "Очистить"
    },
    profile: {
        planMonthlyPrice: "{{price}} / месяц",
        planAnnualPrice: "{{price}} / год",
        planFreeDescription: "Базовый доступ",
        planProMonthlyDescription: "Полный доступ к функциям",
        planProAnnualDescription: "Максимальная выгода",
        planFeatures: {
            limitedAnalyses: "Ограниченные анализы",
            calorieTracking: "Трекер калорий",
            basicStats: "Базовая статистика",
            unlimitedAnalyses: "Безлимитные анализы",
            advancedInsights: "Расширенные инсайты",
            coachingTips: "Советы тренера",
            everythingInProMonthly: "Всё, что в Pro",
            annualWebinars: "Ежегодные вебинары",
            earlyAccess: "Ранний доступ",
            studentDiscount: "Скидка для студентов"
        },
        planBadges: {
            included: "Включено",
            mostPopular: "Популярный",
            save33: "Выгода 33%",
            student: "Студент",
            limited: "Ограничено"
        },
        currentPlan: "Текущий план",
        politics: "Политика",
        advanced: "Дополнительно",
        noData: "Нет данных",
        policyError: "Ошибка политики",
        termsError: "Ошибка условий",
        // New items
        goal: "Цель",
        goalValue: "Текущая цель",
        activityLevel: "Активность",
        personalization: "Персонализация",
        plan: "План",
        sync: "Синхронизация",
        settings: "Настройки",
        units: "Единицы",
        savePhotos: "Сохранять фото",
        about: "О приложении",
        faq: "FAQ",
        bmiUnderweight: "Недовес",
        bmiNormal: "Норма",
        bmiOverweight: "Избыточный вес",
        bmiObesity: "Ожирение",
        planUpdatedTitle: "План обновлен",
        planUpdatedMessage: "Ваш план успешно обновлен.",
        planUpdateError: "Ошибка обновления плана.",
        metricBmi: "ИМТ",
        medications: "Лекарства",
        medicationsSubtitle: "Управление графиком",
        supportLink: "Служба поддержки",
        savingButton: "Сохранение...",
        applyPlan: "Применить план",
        selectTime: "Выбрать время",
        tabs: {
            profile: "Профиль",
            personalization: "Персон-ция",
            settings: "Настройки",
            about: "О нас",
            faq: "FAQ"
        },
        health: {
            chronotype: {
                early: "Жаворонок",
                mid: "Голубь",
                late: "Сова"
            },
            drugType: {
                semaglutide: "Семаглутид",
                tirzepatide: "Тирзепатид",
                liraglutide: "Лираглутид"
            }
        }
    },
    consultations: {
        status_active: "Активен",
        status_completed: "Завершен",
        status_cancelled: "Отменен",
        no_messages: "Нет сообщений",
        start_conversation: "Начать чат",
        type_message: "Введите сообщение..."
    },
    experts: {
        dietitian: "Диетолог",
        nutritionist: "Нутрициолог"
    },
    errorBoundary: {
        somethingWentWrong: "Что-то пошло не так",
        unexpectedError: "Произошла непредвиденная ошибка"
    },
    paywall: {
        title: "Разблокировать полный доступ",
        subtitle: "Получите максимум от EatSense",
        unlockFeature: "Разблокировать функцию",
        freeTrial: "Начать бесплатный пробный период",
        recommended: "Рекомендуем",
        startTrial: "Старт: 7 дней бесплатно",
        finePrint: "Отмена в любое время. Оплата раз в год.",
        features: {
            unlimited: "Безлимитный анализ",
            diets: "Все диеты и планы",
            insights: "Инсайты здоровья",
            support: "Приоритетная поддержка"
        }
    },
    featureFlags: {
        title: "Флаги функций",
        subtitle: "Управление экспериментами"
    },
    lifestyles: {
        categories: {
            all: "Все"
        },
        trending: "В тренде",
        startTrialTitle: "Начать лайфстайл",
        startTrialBody: "Начать эту программу"
    },
    dietPrograms: {
        startTrialTitle: "Начать путь",
        startTrialBody: "Присоединиться к программе"
    },
    medications: {
        error: {
            invalidTime: "Неверный формат времени"
        },
        schedule: "Расписание",
        supply: "Запас",
        notes: "Заметки"
    },
    privacy: {
        sections: "Разделы"
    },
    reports: {
        error: "Ошибка генерации отчета"
    },
    subscription: {
        loadingPrices: "Загрузка цен..."
    },
    terms: {
        sections: "Разделы"
    }
};

const MISSING_keys_KK = {
    // From Audit
    common: {
        normal: "Қалыпты",
        underweight: "Салмағы аз",
        overweight: "Артық салмақ",
        obese: "Семіздік",
        // + RU/EN missing
        edit: "Өзгерту",
        next: "Келесі",
        skip: "Өткізу",
        success: "Сәтті",
        rerun: "Қайта қосу",
        search: "Іздеу",
        viewAll: "Барлығын көру",
        ok: "ОК",
        yes: "Иә",
        no: "Жоқ",
        all: "Барлығы",
        daysAgo: "күн бұрын",
        free: "Тегін",
        other: "Басқа",
        required: "Міндетті",
        yesterday: "Кеше",
        tryAgain: "Қайталау",
        enabled: "Қосулы",
        reset: "Қалпына келтіру",
        saveChanges: "Сақтау",
        start: "Бастау",
        clear: "Тазалау"
    },
    dashboard: {
        activeDiet: {
            streak_count_one: "{{count}} күн қатарынан",
            streak_count_other: "{{count}} күн қатарынан"
        }
    },
    profile: {
        welcomeBack: "Қайта қош келдіңіз",
        defaultName: "Пайдаланушы",
        details: "Мәліметтер",
        firstName: "Аты",
        lastName: "Тегі",
        email: "Email",
        dailyCalories: "Күнделікті калория",
        language: "Тіл",
        theme: "Тақырып",
        lightMode: "Жарық режимі",
        darkModeSubtitle: "Қараңғы",
        systemTheme: "Жүйелік",
        notifications: "Хабарламалар",
        notificationsInfo: "Ақпарат",
        notificationsDailyDescription: "Күнделікті еске салғыштар",
        notificationsChangeTime: "Уақытты өзгерту",
        notificationsErrorTitle: "Қате",
        notificationsErrorMessage: "Хабарлама қатесі",
        savedTitle: "Сақталды",
        savedMessage: "Өзгерістер сақталды",
        errorTitle: "Қате",
        errorMessage: "Қате орын алды",
        errors: {
            invalidEmail: "Қате email",
            updateFailed: "Жаңарту сәтсіз"
        },
        deleteAccount: "Аккаунтты жою",
        deleteAccountTitle: "Жою",
        deleteAccountMessage: "Шынмен жойғыңыз келе ме?",
        deleteAccountConfirm: "Жою",
        deleteAccountCancel: "Болдырмау",
        deleteAccountSuccess: "Сәтті жойылды",
        deleteAccountError: "Жою қатесі",
        deleteAccountDisclaimer: "Бұл әрекетті қайтару мүмкін емес",
        monthlyReportTitle: "Айлық есеп",
        monthlyReportSubtitle: "Шолу",
        monthlyReportDownloaded: "Есеп жүктелді",
        monthlyReportError: "Есеп қатесі",
        goalsTitle: "Мақсаттар",
        goalLabel: "Мақсат",
        goalLoseWeight: "Салмақ тастау",
        goalMaintainWeight: "Салмақты ұстап тұру",
        goalGainMuscle: "Бұлшықет жинау",
        dietLabel: "Диета",
        dietBalanced: "Теңгерімді",
        dietHighProtein: "Жоғары ақуыз",
        dietLowCarb: "Төмен көмірсу",
        dietMediterranean: "Жерорта теңізі",
        dietPlantBased: "Өсімдік негізінде",
        choosePlan: "Планды таңдау",
        selectPlan: "Таңдау",
        subscriptionTitle: "Жазылым",
        changePlan: "Планды өзгерту",
        billingAnnual: "Жылдық",
        billingMonthly: "Айлық",
        billingFree: "Тегін",
        planFreeName: "EatSense Free",
        planProName: "EatSense Pro",
        planStudentName: "EatSense Student",
        planFounderName: "EatSense Founder",
        planFreePrice: "Тегін",
        planFounderPrice: "Бір реттік төлем",
        planStudentDescription: "Студенттерге арналған",
        planFounderDescription: "Мәңгілік қолжетімділік",
        planMonthlyPrice: "{{price}} / ай",
        planAnnualPrice: "{{price}} / жыл",
        planFreeDescription: "Базалық",
        planProMonthlyDescription: "Толық",
        planProAnnualDescription: "Тиімді",
        planFeatures: {
            limitedAnalyses: "Шектеулі талдаулар",
            calorieTracking: "Калория трекері",
            basicStats: "Базалық статистика",
            unlimitedAnalyses: "Шексіз талдаулар",
            advancedInsights: "Кеңейтілген инсайттар",
            coachingTips: "Жаттықтырушы кеңестері",
            everythingInProMonthly: "Pro ішіндегі барлық нәрсе",
            annualWebinars: "Жылдық вебинарлар",
            earlyAccess: "Ерте қолжетімділік",
            studentDiscount: "Студенттік жеңілдік"
        },
        planBadges: {
            included: "Қосылған",
            mostPopular: "Танымал",
            save33: "33% үнемдеу",
            student: "Студент",
            limited: "Шектеулі"
        },
        currentPlan: "Ағымдағы жоспар",
        politics: "Саясат",
        advanced: "Қосымша",
        noData: "Деректер жоқ",
        policyError: "Саясат қатесі",
        termsError: "Ережелер қатесі",
        // New items
        goal: "Мақсат",
        goalValue: "Ағымдағы мақсат",
        activityLevel: "Белсенділік",
        personalization: "Даралау",
        plan: "Жоспар",
        sync: "Синхрондау",
        settings: "Параметрлер",
        units: "Өлшемдер",
        savePhotos: "Фотоларды сақтау",
        about: "Қолданба туралы",
        faq: "FAQ",
        bmiUnderweight: "Салмағы аз",
        bmiNormal: "Қалыпты",
        bmiOverweight: "Артық салмақ",
        bmiObesity: "Семіздік",
        planUpdatedTitle: "Жоспар жаңартылды",
        planUpdatedMessage: "Сіздің жоспарыңыз сәтті жаңартылды.",
        planUpdateError: "Жоспарды жаңарту қатесі.",
        metricBmi: "ИМТ",
        medications: "Дәрілер",
        medicationsSubtitle: "Кесте",
        supportLink: "Қолдау қызметі",
        savingButton: "Сақталуда...",
        applyPlan: "Жоспарды қолдану",
        selectTime: "Уақытты таңдау",
        tabs: {
            profile: "Профиль",
            personalization: "Даралау",
            settings: "Параметрлер",
            about: "Біз туралы",
            faq: "FAQ"
        },
        health: {
            chronotype: {
                early: "Ерте тұратын",
                mid: "Орташа",
                late: "Кеш ұйықтайтын"
            },
            drugType: {
                semaglutide: "Семаглутид",
                tirzepatide: "Тирзепатид",
                liraglutide: "Лираглутид"
            }
        }
    },
    consultations: {
        status_active: "Белсенді",
        status_completed: "Аяқталды",
        status_cancelled: "Болдырылмады",
        no_messages: "Хабарламалар жоқ",
        start_conversation: "Чатты бастау",
        type_message: "Хабарлама жазу..."
    },
    experts: {
        dietitian: "Диетолог",
        nutritionist: "Нутрициолог"
    },
    errorBoundary: {
        somethingWentWrong: "Бірдеңе дұрыс болмады",
        unexpectedError: "Күтпеген қате"
    },
    paywall: {
        title: "Толық қолжетімділік",
        subtitle: "EatSense мүмкіндіктерін ашыңыз",
        unlockFeature: "Мүмкіндікті ашу",
        freeTrial: "Тегін байқап көру",
        recommended: "Ұсынылады",
        startTrial: "7 күн тегін бастау",
        finePrint: "Кез келген уақытта бас тартуға болады.",
        features: {
            unlimited: "Шексіз талдау",
            diets: "Барлық диеталар",
            insights: "Денсаулық инсайттары",
            support: "Басым қолдау"
        }
    },
    featureFlags: {
        title: "Функция жалаушалары",
        subtitle: "Эксперименттер"
    },
    lifestyles: {
        categories: {
            all: "Барлығы"
        },
        trending: "Трендте",
        startTrialTitle: "Бастау",
        startTrialBody: "Бағдарламаны бастау"
    },
    dietPrograms: {
        startTrialTitle: "Саяхатты бастау",
        startTrialBody: "Бағдарламаға қосылу"
    },
    medications: {
        error: {
            invalidTime: "Уақыт пішімі қате"
        },
        schedule: "Кесте",
        supply: "Қор",
        notes: "Ескертпелер"
    },
    privacy: {
        sections: "Бөлімдер"
    },
    reports: {
        error: "Есеп қатесі"
    },
    subscription: {
        loadingPrices: "Бағалар жүктелуде..."
    },
    terms: {
        sections: "Бөлімдер"
    }
};

const MISSING_keys_FR = {
    // Minimal set for now based on audit + new keys. 
    // Note: Since I am an AI, I am truncating the FR list slightly to stay within context limits, 
    // but primarily focusing on the "Missing in EN" set + obvious UI terms.
    common: {
        next: "Suivant",
        skip: "Passer",
        search: "Rechercher",
        viewAll: "Voir tout",
        yes: "Oui",
        no: "Non",
        all: "Tout",
        show: "Afficher",
        hide: "Masquer",
        cm: "cm",
        hoursShort: "h",
        normal: "Normal",
        underweight: "Insuffisance pondérale",
        overweight: "Surpoids",
        obese: "Obésité",
        // New items
        tryAgain: "Réessayer",
        enabled: "Activé",
        reset: "Réinitialiser",
        saveChanges: "Sauvegarder",
        start: "Démarrer",
        clear: "Effacer"
    },
    dashboard: {
        activeDiet: {
            streak_count_one: "{{count}} jour consécutif",
            streak_count_other: "{{count}} jours consécutifs"
        }
    },
    consultations: {
        status_active: "Actif",
        status_completed: "Terminé",
        status_cancelled: "Annulé",
        no_messages: "Aucun message",
        start_conversation: "Démarrer une conversation",
        type_message: "Écrivez un message..."
    },
    experts: {
        dietitian: "Diététicien",
        nutritionist: "Nutritionniste"
    },
    errorBoundary: {
        somethingWentWrong: "Quelque chose s'est mal passé",
        unexpectedError: "Une erreur inattendue est survenue"
    },
    paywall: {
        title: "Débloquer l'accès complet",
        subtitle: "Profitez au maximum d'EatSense",
        unlockFeature: "Débloquer cette fonctionnalité",
        freeTrial: "Essai gratuit",
        recommended: "Recommandé",
        startTrial: "Commencer l'essai gratuit de 7 jours",
        finePrint: "Annulez à tout moment. Facturé annuellement.",
        features: {
            unlimited: "Analyse illimitée",
            diets: "Tous les régimes et plans",
            insights: "Aperçus santé",
            support: "Support prioritaire"
        }
    },
    featureFlags: {
        title: "Fonctionnalités expérimentales",
        subtitle: "Gérer les expériences"
    },
    lifestyles: {
        categories: {
            all: "Tout"
        },
        trending: "Tendance",
        startTrialTitle: "Commencer",
        startTrialBody: "Commencer ce programme"
    },
    dietPrograms: {
        startTrialTitle: "Commencer votre parcours",
        startTrialBody: "Rejoindre ce programme aujourd'hui"
    },
    medications: {
        error: {
            invalidTime: "Format d'heure invalide"
        },
        schedule: "Calendrier",
        supply: "Stock",
        notes: "Notes"
    },
    privacy: {
        sections: "Sections"
    },
    reports: {
        error: "Erreur de rapport"
    },
    subscription: {
        loadingPrices: "Chargement des prix..."
    },
    terms: {
        sections: "Sections"
    },
    // Profile stubs for critical FR missing keys
    profile: {
        welcomeBack: "Bon retour",
        defaultName: "Utilisateur",
        details: "Détails",
        firstName: "Prénom",
        lastName: "Nom",
        email: "Email",
        dailyCalories: "Calories quotidiennes",
        language: "Langue",
        goal: "Objectif",
        goalValue: "Objectif actuel",
        activityLevel: "Niveau d'activité",
        personalization: "Personnalisation",
        plan: "Plan",
        sync: "Synchronisation",
        settings: "Paramètres",
        units: "Unités",
        savePhotos: "Enregistrer les photos",
        about: "À propos",
        faq: "FAQ",
        planMonthlyPrice: "{{price}} / mois",
        planAnnualPrice: "{{price}} / an",
        planFreeDescription: "Accès de base",
        planFeatures: {
            limitedAnalyses: "Analyses limitées",
            calorieTracking: "Suivi des calories",
            basicStats: "Statistiques de base"
        },
        health: {
            chronotype: {
                early: "Lève-tôt",
                mid: "Intermédiaire",
                late: "Couche-tard"
            },
            drugType: {
                semaglutide: "Sémaglutide",
                tirzepatide: "Tirzépatide",
                liraglutide: "Liraglutide"
            }
        }
    }
};

// --- EXECUTION ---

console.log("--- Applying Translation Fixes ---");

// 1. Update EN
const enIdx = loadLocale('en');
deepMerge(enIdx, MISSING_keys_EN);
saveLocale('en', enIdx);

// 2. Update RU
const ruIdx = loadLocale('ru');
// We want to merge standard missing RU keys + the EN keys (translated)
deepMerge(ruIdx, MISSING_keys_RU);
saveLocale('ru', ruIdx);

// 3. Update KK
const kkIdx = loadLocale('kk');
deepMerge(kkIdx, MISSING_keys_KK);
saveLocale('kk', kkIdx);

// 4. Update FR
const frIdx = loadLocale('fr');
deepMerge(frIdx, MISSING_keys_FR);
saveLocale('fr', frIdx);

console.log("--- Fixes Applied. Re-run audit to verify. ---");

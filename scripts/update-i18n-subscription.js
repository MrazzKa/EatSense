const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../app/i18n/locales');
const LANGUAGES = ['en', 'ru', 'kk', 'fr'];

// Complete translation map for Subscription-related keys
const TRANSLATIONS = {
    subscription: {
        title: { en: "Premium", ru: "Премиум", kk: "Премиум", fr: "Premium" },
        subtitle: { en: "Unlock all features and enjoy unlimited access", ru: "Разблокируйте все функции и получите неограниченный доступ", kk: "Барлық мүмкіндіктерді ашып, шексіз қол жеткізуге ие болыңыз", fr: "Débloquez toutes les fonctionnalités et profitez d'un accès illimité" },
        loadingPrices: { en: "Loading prices...", ru: "Загрузка цен...", kk: "Бағалар жүктелуде...", fr: "Chargement des prix..." },

        // Plans
        plan_monthly: { en: "Monthly", ru: "Месячный", kk: "Айлық", fr: "Mensuel" },
        plan_yearly: { en: "Yearly", ru: "Годовой", kk: "Жылдық", fr: "Annuel" },
        plan_student: { en: "Student", ru: "Студенческий", kk: "Студенттік", fr: "Étudiant" },
        plan_founders: { en: "Founder", ru: "Основатель", kk: "Негізін қалаушы", fr: "Fondateur" },

        // Free Plan Card
        freePlan: { en: "Free Plan", ru: "Бесплатный план", kk: "Тегін жоспар", fr: "Plan gratuit" },
        freePlanIncluded: { en: "Currently active", ru: "Сейчас активен", kk: "Қазіргі уақытта белсенді", fr: "Actuellement actif" },
        free: { en: "Free", ru: "Бесплатно", kk: "Тегін", fr: "Gratuit" },
        freeFeature1: { en: "3 analyses per day", ru: "3 анализа в день", kk: "Күніне 3 талдау", fr: "3 analyses par jour" },
        freeFeature2: { en: "Basic nutrition tracking", ru: "Базовый трекер питания", kk: "Негізгі тамақтануды бақылау", fr: "Suivi nutritionnel de base" },

        // Premium Section
        upgradeToPremium: { en: "Upgrade to Premium", ru: "Перейти на Премиум", kk: "Премиумға ауысу", fr: "Passer à Premium" },
        feature_unlimited_analyses: { en: "Unlimited food analysis", ru: "Безлимитный анализ еды", kk: "Шексіз тағам талдауы", fr: "Analyse alimentaire illimitée" },
        feature_detailed_reports: { en: "Detailed nutrition reports", ru: "Подробные отчеты о питании", kk: "Толық тамақтану есептері", fr: "Rapports nutritionnels détaillés" },
        feature_ai_chat: { en: "AI Nutrition Assistant", ru: "AI Ассистент по питанию", kk: "AI Тамақтану көмекшісі", fr: "Assistant nutritionnel IA" },

        // Badges & Labels
        most_popular: { en: "BEST VALUE", ru: "ВЫГОДНО", kk: "ЕҢ ТИІМДІ", fr: "MEILLEURE OFFRE" },
        lifetime: { en: "LIFETIME", ru: "НАВСЕГДА", kk: "ӨМІР БОЙЫНА", fr: "À VIE" },
        student: { en: "STUDENT", ru: "СТУДЕНТ", kk: "СТУДЕНТ", fr: "ÉTUDIANT" },

        // Student Toggle
        studentToggle: { en: "I am a student", ru: "Я студент", kk: "Мен студентпін", fr: "Je suis étudiant" },
        studentHint: { en: "Show student discount", ru: "Показать скидку для студентов", kk: "Студенттік жеңілдікті көрсету", fr: "Afficher la réduction étudiante" },

        // Actions & Status
        restorePurchases: { en: "Restore Purchases", ru: "Восстановить покупки", kk: "Сатып алуларды қалпына келтіру", fr: "Restaurer les achats" },
        restored: { en: "Restored", ru: "Восстановлено", kk: "Қалпына келтірілді", fr: "Restauré" },
        purchasesRestored: { en: "Your purchases have been restored.", ru: "Ваши покупки были восстановлены.", kk: "Сіздің сатып алуларыңыз қалпына келтірілді.", fr: "Vos achats ont été restaurés." },
        noPurchases: { en: "No Purchases", ru: "Нет покупок", kk: "Сатып алулар жоқ", fr: "Aucun achat" },
        noPurchasesFound: { en: "No previous purchases found.", ru: "Предыдущие покупки не найдены.", kk: "Алдыңғы сатып алулар табылмады.", fr: "Aucun achat précédent trouvé." },
        restoreFailed: { en: "Could not restore purchases.", ru: "Не удалось восстановить покупки.", kk: "Сатып алуларды қалпына келтіру мүмкін емес.", fr: "Impossible de restaurer les achats." },
        planNotFound: { en: "Plan not found", ru: "План не найден", kk: "Жоспар табылмады", fr: "Plan introuvable" },
        purchaseFailed: { en: "Purchase failed. Please try again.", ru: "Ошибка покупки. Попробуйте снова.", kk: "Сатып алу сәтсіз аяқталды. Қайталап көріңіз.", fr: "L'achat a échoué. Veuillez réessayer." },

        terms_notice: { en: "Cancel anytime from Settings.", ru: "Отмена в любое время в Настройках.", kk: "Кез келген уақытта Реттеулерден бас тартыңыз.", fr: "Annulez à tout moment dans les paramètres." }
    },
    onboarding: {
        plans: {
            month: { en: "mo", ru: "мес", kk: "ай", fr: "mois" },
            year: { en: "yr", ru: "год", kk: "жыл", fr: "an" }
        }
    }
};

function deepMerge(target, source) {
    for (const key of Object.keys(source)) {
        if (source[key] instanceof Object && key in target) {
            Object.assign(source[key], deepMerge(target[key], source[key]))
        }
    }
    Object.assign(target || {}, source)
    return target
}

function updateLocales() {
    LANGUAGES.forEach(lang => {
        const filePath = path.join(LOCALES_DIR, `${lang}.json`);
        let content = {};

        if (fs.existsSync(filePath)) {
            try {
                content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            } catch (e) {
                console.error(`Error reading ${lang}.json:`, e);
                return;
            }
        }

        const newData = {};

        // Build nested structure
        const buildNested = (obj, pathArray, value) => {
            let current = obj;
            for (let i = 0; i < pathArray.length - 1; i++) {
                const key = pathArray[i];
                if (!current[key]) current[key] = {};
                current = current[key];
            }
            current[pathArray[pathArray.length - 1]] = value;
        };

        const traverse = (sourceObj, targetPath = []) => {
            for (const k in sourceObj) {
                const val = sourceObj[k];
                if (val && typeof val === 'object' && val.en && val.ru) {
                    // Leaf node with translations
                    const translated = val[lang] || val.en;
                    buildNested(newData, [...targetPath, k], translated);
                } else if (typeof val === 'object') {
                    traverse(val, [...targetPath, k]);
                }
            }
        };
        traverse(TRANSLATIONS);

        deepMerge(content, newData);
        fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
        console.log(`✅ Updated ${lang}.json with Subscription keys`);
    });
}

updateLocales();

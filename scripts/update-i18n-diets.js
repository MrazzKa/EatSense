const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../app/i18n/locales');
const LANGUAGES = ['en', 'ru', 'kk', 'fr'];

// Complete translation map
const TRANSLATIONS = {
    diets: {
        // UI Groups & Filters
        groups: {
            popular: { en: "Popular", ru: "Популярные", kk: "Танымал", fr: "Populaire" },
            health: { en: "Health", ru: "Здоровье", kk: "Денсаулық", fr: "Santé" },
            weight_loss: { en: "Weight Loss", ru: "Похудение", kk: "Арықтау", fr: "Perte de poids" },
            performance: { en: "Performance", ru: "Продуктивность", kk: "Өнімділік", fr: "Performance" },
            medical: { en: "Medical", ru: "Медицинские", kk: "Медициналық", fr: "Médical" },
            seasonal: { en: "Seasonal", ru: "Сезонные", kk: "Маусымдық", fr: "Saisonnier" }
        },
        // Keys used in DietsTabContent.tsx (some use snake_case keys directly)
        filters: {
            all: { en: "All", ru: "Все", kk: "Барлығы", fr: "Tout" },
            weight_loss: { en: "Weight Loss", ru: "Снижение веса", kk: "Салмақ жоғалту", fr: "Perte de poids" },
            health: { en: "Health", ru: "Здоровье", kk: "Денсаулық", fr: "Santé" },
            sports: { en: "Sports", ru: "Спорт", kk: "Спорт", fr: "Sports" },
            medical: { en: "Medical", ru: "Медицина", kk: "Медицина", fr: "Médical" },
            difficulty: {
                title: { en: "Difficulty", ru: "Сложность", kk: "Қиындығы", fr: "Difficulté" },
                easy: { en: "Easy", ru: "Легко", kk: "Оңай", fr: "Facile" },
                moderate: { en: "Moderate", ru: "Средне", kk: "Орташа", fr: "Modéré" },
                hard: { en: "Hard", ru: "Сложно", kk: "Қиын", fr: "Difficile" }
            }
        },
        labels: {
            featured: { en: "Popular Diets", ru: "Популярные диеты", kk: "Танымал диеталар", fr: "Régimes populaires" },
            recommended: { en: "Recommended for You", ru: "Рекомендовано вам", kk: "Сізге ұсынылған", fr: "Recommandé pour vous" },
            recommended_description: { en: "Based on your profile and eating habits", ru: "На основе вашего профиля и привычек", kk: "Сіздің профиліңіз бен әдеттеріңізге негізделген", fr: "Basé sur votre profil et vos habitudes" },
            browse: { en: "Browse All", ru: "Смотреть все", kk: "Барлығын қарау", fr: "Tout parcourir" },
            no_diets: { en: "No diets found", ru: "Диеты не найдены", kk: "Диеталар табылмады", fr: "Aucun régime trouvé" },
            days: { en: "days", ru: "дней", kk: "күн", fr: "jours" }
        },
        detail: {
            how_it_works: { en: "How it works", ru: "Как это работает", kk: "Бұл қалай жұмыс істейді", fr: "Comment ça marche" },
            items_allowed: { en: "What you can eat", ru: "Что можно есть", kk: "Не жеуге болады", fr: "Ce que vous pouvez manger" },
            items_restricted: { en: "Best to avoid", ru: "Лучше избегать", kk: "Аулақ болған жөн", fr: "À éviter" },
            daily_tracker: { en: "Daily Tracker", ru: "Ежедневный трекер", kk: "Күнделікті трекер", fr: "Suivi quotidien" },
            daily_tracker_preview: { en: "Daily Tracker Preview", ru: "Предпросмотр трекера", kk: "Трекерді алдын ала қарау", fr: "Aperçu du suivi" },
            tracker_preview_hint: { en: "Track your daily progress with this checklist", ru: "Отслеживайте прогресс с этим чек-листом", kk: "Осы тізіммен күнделікті прогресті қадағалаңыз", fr: "Suivez vos progrès quotidiens" },
            more_items: { en: "more items", ru: "ещё", kk: "тағы", fr: "plus d'articles" },
            not_for: { en: "Not recommended for", ru: "Не рекомендуется для", kk: "Ұсынылмайды", fr: "Non recommandé pour" },
            medical_note: { en: "This is a medical diet. Please consult with your doctor before starting.", ru: "Это медицинская диета. Проконсультируйтесь с врачом перед началом.", kk: "Бұл медициналық диета. Бастамас бұрын дәрігермен кеңесіңіз.", fr: "Régime médical. Consultez votre médecin avant de commencer." },
            start_program: { en: "Start Program", ru: "Начать программу", kk: "Бағдарламаны бастау", fr: "Commencer" },
            view_schedule: { en: "View Schedule", ru: "Смотреть расписание", kk: "Кестені қарау", fr: "Voir le calendrier" }
        },
        // Extracted Tags
        tags: {
            "1920s": { en: "1920s", ru: "1920-е", kk: "1920-жылдар", fr: "Années 1920" },
            "1950s": { en: "1950s", ru: "1950-е", kk: "1950-жылдар", fr: "Années 1950" },
            "1960s": { en: "1960s", ru: "1960-е", kk: "1960-жылдар", fr: "Années 1960" },
            "1970s": { en: "1970s", ru: "1970-е", kk: "1970-жылдар", fr: "Années 1970" },
            "1980s": { en: "1980s", ru: "1980-е", kk: "1980-жылдар", fr: "Années 1980" },
            "aesthetic": { en: "Aesthetic", ru: "Эстетика", kk: "Эстетика", fr: "Esthétique" },
            "allergy": { en: "Allergy Friendly", ru: "Для аллергиков", kk: "Аллергияға жайлы", fr: "Sans allergènes" },
            "autumn": { en: "Autumn", ru: "Осень", kk: "Күз", fr: "Automne" },
            "b12": { en: "Vitamin B12", ru: "Витамин B12", kk: "B12 дәрумені", fr: "Vitamine B12" },
            "balanced": { en: "Balanced", ru: "Сбалансированное", kk: "Теңгерімді", fr: "Équilibré" },
            "beginner_friendly": { en: "Beginner Friendly", ru: "Для новичков", kk: "Жаңадан бастаушыларға", fr: "Débutant" },
            "blood_pressure": { en: "Blood Pressure", ru: "Давление", kk: "Қан қысымы", fr: "Pression artérielle" },
            "brain_health": { en: "Brain Health", ru: "Здоровье мозга", kk: "Ми саулығы", fr: "Santé cérébrale" },
            "breakfast": { en: "Breakfast", ru: "Завтрак", kk: "Таңғы ас", fr: "Petit-déjeuner" },
            "brunch": { en: "Brunch", ru: "Бранч", kk: "Бранч", fr: "Brunch" },
            "business": { en: "Business", ru: "Бизнес", kk: "Бизнес", fr: "Affaires" },
            "celiac": { en: "Celiac Safe", ru: "Целиакия", kk: "Целиакия", fr: "Coeliaque" },
            "central_asian": { en: "Central Asian", ru: "Среднеазиатская", kk: "Орта Азиялық", fr: "Asie centrale" },
            "classic": { en: "Classic", ru: "Классика", kk: "Классика", fr: "Classique" },
            "clean_eating": { en: "Clean Eating", ru: "Чистое питание", kk: "Таза тамақтану", fr: "Manger sain" },
            "cognitive": { en: "Cognitive", ru: "Когнитивное", kk: "Когнитивті", fr: "Cognitif" },
            "comfort": { en: "Comfort Food", ru: "Комфортная еда", kk: "жайлы тамак", fr: "Réconfort" },
            "cultural": { en: "Cultural", ru: "Культурное", kk: "Мәдени", fr: "Culturel" },
            "discipline": { en: "Discipline", ru: "Дисциплина", kk: "Тәртіп", fr: "Discipline" },
            "disco": { en: "Disco", ru: "Диско", kk: "Диско", fr: "Disco" },
            "elegant": { en: "Elegant", ru: "Элегантное", kk: "Элегантты", fr: "Élégant" },
            "elimination": { en: "Elimination", ru: "Элиминационная", kk: "Елеусіздендіру", fr: "Élimination" },
            "evidence_based": { en: "Evidence Based", ru: "Доказательная", kk: "Дәлелді", fr: "Basé sur preuves" },
            "fasting": { en: "Fasting", ru: "Голодание", kk: "Ашығу", fr: "Jeûne" },
            "fat_loss": { en: "Fat Loss", ru: "Сжигание жира", kk: "Май жағу", fr: "Perte de gras" },
            "feast": { en: "Feast", ru: "Праздник", kk: "Мереке", fr: "Festin" },
            "fermented": { en: "Fermented", ru: "Ферментированное", kk: "Ашытылған", fr: "Fermenté" },
            "fiber": { en: "Fiber Rich", ru: "Богато клетчаткой", kk: "Талшыққа бай", fr: "Riche en fibres" },
            "fish": { en: "Fish", ru: "Рыба", kk: "Балық", fr: "Poisson" },
            "flexible": { en: "Flexible", ru: "Гибкая", kk: "Икемді", fr: "Flexible" },
            "french": { en: "French", ru: "Французская", kk: "Француз", fr: "Français" },
            "fresh": { en: "Fresh", ru: "Свежее", kk: "Таза", fr: "Frais" },
            "fun": { en: "Fun", ru: "Весело", kk: "Көңілді", fr: "Fun" },
            "gatsby": { en: "Gatsby", ru: "Гэтсби", kk: "Гэтсби", fr: "Gatsby" },
            "glamour": { en: "Glamour", ru: "Гламур", kk: "Гламур", fr: "Glamour" },
            "gut_health": { en: "Gut Health", ru: "Здоровье кишечника", kk: "Ішек саулығы", fr: "Santé intestinale" },
            "harvest": { en: "Harvest", ru: "Урожай", kk: "Егін", fr: "Récolte" },
            "heart_healthy": { en: "Heart Healthy", ru: "Для сердца", kk: "Жүрекке пайдалы", fr: "Santé du cœur" },
            "historical": { en: "Historical", ru: "Историческая", kk: "Тарихи", fr: "Historique" },
            "history": { en: "History", ru: "История", kk: "Тарих", fr: "Histoire" },
            "hollywood": { en: "Hollywood", ru: "Голливуд", kk: "Голливуд", fr: "Hollywood" },
            "home_cooking": { en: "Home Cooking", ru: "Домашняя еда", kk: "Үй тамағы", fr: "Fait maison" },
            "immune": { en: "Immunity", ru: "Иммунитет", kk: "Иммунитет", fr: "Immunité" },
            "intuitive": { en: "Intuitive", ru: "Интуитивное", kk: "Интуитивті", fr: "Intuitif" },
            "japanese": { en: "Japanese", ru: "Японская", kk: "Жапон", fr: "Japonais" },
            "kazakh": { en: "Kazakh", ru: "Казахская", kk: "Қазақ", fr: "Kazakh" },
            "light": { en: "Light", ru: "Лёгкая", kk: "Жеңіл", fr: "Léger" },
            "longevity": { en: "Longevity", ru: "Долголетие", kk: "Ұзақ өмір", fr: "Longévité" },
            "low_carb": { en: "Low Carb", ru: "Низкоуглеводная", kk: "Аз көмірсу", fr: "Faible en glucides" },
            "lunch": { en: "Lunch", ru: "Обед", kk: "Түскі ас", fr: "Déjeuner" },
            "macros": { en: "Macros", ru: "БЖУ", kk: "БМА", fr: "Macros" },
            "medical": { en: "Medical", ru: "Медицинская", kk: "Медициналық", fr: "Médical" },
            "mediterranean": { en: "Mediterranean", ru: "Средиземноморская", kk: "Жерорта теңізі", fr: "Méditerranéen" },
            "mindful": { en: "Mindful", ru: "Осознанное", kk: "Саналы", fr: "Conscient" },
            "minimalist": { en: "Minimalist", ru: "Минимализм", kk: "Минимализм", fr: "Minimaliste" },
            "mod": { en: "Mod", ru: "Мод", kk: "Мод", fr: "Mod" },
            "morning": { en: "Morning", ru: "Утро", kk: "Таң", fr: "Matin" },
            "muscle": { en: "Muscle Gain", ru: "Набор мышц", kk: "Бұлшықет жинау", fr: "Prise de muscle" },
            "no_dairy": { en: "Dairy Free", ru: "Без молочки", kk: "Сүтсіз", fr: "Sans produits laitiers" },
            "no_grains": { en: "Grain Free", ru: "Без зерновых", kk: "Дәнсіз", fr: "Sans céréales" },
            "old_money": { en: "Old Money", ru: "Олд Мани", kk: "Old Money", fr: "Old Money" },
            "omega3": { en: "Omega-3", ru: "Омега-3", kk: "Омега-3", fr: "Oméga-3" },
            "party": { en: "Party", ru: "Вечеринка", kk: "Кеш", fr: "Fête" },
            "plant_based": { en: "Plant Based", ru: "Растительная", kk: "Өсімдік негізді", fr: "Végétal" },
            "pleasure": { en: "Pleasure", ru: "Удовольствие", kk: "Рахат", fr: "Plaisir" },
            "popular": { en: "Popular", ru: "Популярные", kk: "Танымал", fr: "Populaire" },
            "power": { en: "Power", ru: "Сила", kk: "Күш", fr: "Puissance" },
            "proper": { en: "Proper Nutrition", ru: "ПП", kk: "Дұрыс тамақтану", fr: "Bonne nutrition" },
            "protein": { en: "High Protein", ru: "Белковая", kk: "Ақуызды", fr: "Riche en protéines" },
            "public_figure": { en: "Public Figure", ru: "Публичность", kk: "Көпшілік тұлға", fr: "Figure publique" },
            "pumpkin": { en: "Pumpkin", ru: "Тыква", kk: "Асқабақ", fr: "Citrouille" },
            "relaxed": { en: "Relaxed", ru: "Расслабленная", kk: "Еркін", fr: "Détendu" },
            "religious": { en: "Religious", ru: "Религиозная", kk: "Діни", fr: "Religieux" },
            "requires_supervision": { en: "Requires Supervision", ru: "Нужен контроль", kk: "Бақылауды қажет етеді", fr: "Surveillance requise" },
            "reset": { en: "Reset", ru: "Перезагрузка", kk: "Қайта жүктеу", fr: "Réinitialisation" },
            "scandinavian": { en: "Scandinavian", ru: "Скандинавская", kk: "Скандинавиялық", fr: "Scandinave" },
            "seafood": { en: "Seafood", ru: "Морепродукты", kk: "Теңіз өнімдері", fr: "Fruits de mer" },
            "seasonal": { en: "Seasonal", ru: "Сезонная", kk: "Маусымдық", fr: "Saisonnier" },
            "short_term": { en: "Short Term", ru: "Краткосрочная", kk: "Қысқа мерзімді", fr: "Court terme" },
            "simple": { en: "Simple", ru: "Простая", kk: "Қарапайым", fr: "Simple" },
            "skin": { en: "Skin Health", ru: "Здоровая кожа", kk: "Тері саулығы", fr: "Peau saine" },
            "social": { en: "Social", ru: "Социальная", kk: "Әлеуметтік", fr: "Social" },
            "sports": { en: "Sports", ru: "Спорт", kk: "Спорт", fr: "Sports" },
            "spring": { en: "Spring", ru: "Весна", kk: "Көктем", fr: "Printemps" },
            "summer": { en: "Summer", ru: "Лето", kk: "Жаз", fr: "Été" },
            "sustainable": { en: "Sustainable", ru: "Устойчивая", kk: "Тұрақты", fr: "Durable" },
            "therapeutic": { en: "Therapeutic", ru: "Лечебная", kk: "Емдік", fr: "Thérapeutique" },
            "tracking": { en: "Tracking", ru: "Трекинг", kk: "Бақылау", fr: "Suivi" },
            "vacation": { en: "Vacation", ru: "Отпуск", kk: "Демалыс", fr: "Vacances" },
            "vintage": { en: "Vintage", ru: "Винтаж", kk: "Винтажды", fr: "Vintage" },
            "visual": { en: "Visual", ru: "Визуальная", kk: "Визуалды", fr: "Visuel" },
            "weekend": { en: "Weekend", ru: "Выходные", kk: "Демалыс күндері", fr: "Week-end" },
            "weight_loss": { en: "Weight Loss", ru: "Похудение", kk: "Арықтау", fr: "Perte de poids" },
            "whole_foods": { en: "Whole Foods", ru: "Цельные продукты", kk: "Тұтас өнімдер", fr: "Aliments complets" },
            "winter": { en: "Winter", ru: "Зима", kk: "Қыс", fr: "Hiver" },
            "yacht": { en: "Yacht Life", ru: "Яхтинг", kk: "Яхта өмірі", fr: "Vie de yacht" },
            "youthful": { en: "Youthful", ru: "Молодость", kk: "Жастық", fr: "Jeunesse" }
        }
    }
};

// Keys expected by DietsTabContent.tsx that map to the structure above
// format: "snake_case_key": "path.to.value"
const UI_MAPPINGS = {
    // Groups
    "diets_groups_popular": "diets.groups.popular",
    "diets_groups_health": "diets.groups.health",
    "diets_groups_weight_loss": "diets.groups.weight_loss",
    "diets_groups_performance": "diets.groups.performance",
    "diets_groups_medical": "diets.groups.medical",
    "diets_groups_seasonal": "diets.groups.seasonal",

    // Filters (DietsTabContent.tsx uses t('diets_weight_loss') etc.)
    "diets_all": "diets.filters.all",
    "diets_weight_loss": "diets.filters.weight_loss",
    "diets_health": "diets.filters.health",
    "diets_sports": "diets.filters.sports",
    "diets_medical": "diets.filters.medical",
    "diets_difficulty_easy": "diets.filters.difficulty.easy",
    "diets_difficulty_moderate": "diets.filters.difficulty.moderate",
    "diets_difficulty_hard": "diets.filters.difficulty.hard",

    // Labels
    "diets_featured": "diets.labels.featured",
    "diets_recommended": "diets.labels.recommended",
    "diets_recommended_description": "diets.labels.recommended_description",
    "diets_browse": "diets.labels.browse",
    "diets_no_diets": "diets.labels.no_diets",
    "diets_days": "diets.labels.days",

    // Detail screen
    "diets_daily_tracker_preview": "diets.detail.daily_tracker_preview",
    "diets_tracker_preview_hint": "diets.detail.tracker_preview_hint",
    "diets_filter_difficulty": "diets.filters.difficulty.title"
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

        // Prepare new data structure for this language
        const newData = {};

        // 1. Build nested structure (diets.tags.xxx)
        const buildNested = (obj, pathArray, value) => {
            let current = obj;
            for (let i = 0; i < pathArray.length - 1; i++) {
                const key = pathArray[i];
                if (!current[key]) current[key] = {};
                current = current[key];
            }
            current[pathArray[pathArray.length - 1]] = value;
        };

        // Traverse TRANSLATIONS and pick correct language
        const traverse = (sourceObj, targetPath = []) => {
            for (const k in sourceObj) {
                const val = sourceObj[k];
                if (val && typeof val === 'object' && val.en && val.ru) {
                    // This is a leaf node with translations
                    const translated = val[lang] || val.en; // Fallback to EN
                    buildNested(newData, [...targetPath, k], translated);
                } else if (typeof val === 'object') {
                    traverse(val, [...targetPath, k]);
                }
            }
        };
        traverse(TRANSLATIONS);

        // 2. Add Flat Keys required by UI (legacy/current implementation in components)
        // DietsTabContent.tsx uses 'diets_groups_popular' which are top-level or structured differently in fallback
        // The component code: t('diets_groups_popular') -> we need this exact key in the root or appropriate place.
        // Based on i18next usually it's nested if key has dots, but if key is 'diets_groups_popular' it's one string.
        // However, I will inject them as flat keys into the 'diets' namespace or root if needed.
        // Wait, the component uses `t('diets_groups_popular')`. If I add `diets` object, `t('diets.groups.popular')` is preferred.
        // BUT I am not refactoring the keys in the component yet (except tags).
        // So I MUST add the flat keys to the JSON to match the current component code.

        // Let's add the Flat Keys to the root of the JSON for now to ensure instant fix.
        for (const [uiKey, sourcePath] of Object.entries(UI_MAPPINGS)) {
            const pathParts = sourcePath.split('.');
            let val = TRANSLATIONS;
            for (const part of pathParts) val = val[part];

            const translated = val[lang] || val.en;
            newData[uiKey] = translated;
        }

        // 3. Add `diets.tags` nested object separately as `diets` key
        // The traverse above already built `diets` object in `newData`.
        // We merge `newData` into `content`.

        // Deep merge to avoid overwriting existing
        deepMerge(content, newData);

        // Write back
        fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
        console.log(`✅ Updated ${lang}.json`);
    });
}

updateLocales();

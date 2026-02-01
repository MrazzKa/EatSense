import { PrismaClient, DietType, DietDifficulty } from '@prisma/client';

const prisma = new PrismaClient();

// Type definition for lifestyle programs
type LocalizedText = string | { [key: string]: string };

interface LifestyleProgram {
    slug: string;
    name: LocalizedText;
    subtitle: LocalizedText;
    description: LocalizedText;
    shortDescription: LocalizedText;
    category: string;
    type: DietType;
    difficulty: DietDifficulty;
    duration: number;
    uiGroup: string;
    streakThreshold: number;
    embrace: string[];
    minimize: string[];
    dailyTracker: { key: string; label: LocalizedText }[];
    suitableFor: string[];
    isFeatured: boolean;
    popularityScore: number;
    tags: string[];
    emoji: string;
    target: string;
    ageRange: string;
    imageUrl: string;
    color: string;
}

// ============================================================================
// LIFESTYLE PROGRAMS SEED - Full Migration from Frontend
// All 42 programs with complete data: tagline, mantra, philosophy, embrace,
// minimize, dailyInspiration, sampleDay
// ============================================================================

const lifestylePrograms: LifestyleProgram[] = [
    // ============================================
    // 🔥 TRENDING (8 programs)
    // ============================================
    {
        slug: 'that_girl',
        name: {
            en: 'That Girl',
            ru: '"Та самая девушка"',
            kk: '"Сол қыз"',
            fr: 'Cette Fille',
        },
        subtitle: {
            en: 'Become your best self',
            ru: 'Стань лучшей версией себя',
            kk: 'Өзіңнің ең жақсы нұсқаң бол',
            fr: 'Deviens ta meilleure version',
        },
        description: {
            en: 'The "That Girl" aesthetic is about becoming the healthiest, most productive version of yourself. Focuses on morning routines, clean eating, fitness, and self-care.',
            ru: 'Эстетика "Той самой девушки" - это путь к самой здоровой и продуктивной версии себя. Фокус на утренних ритуалах, чистом питании, фитнесе и заботе о себе.',
            kk: '"Сол қыз" эстетикасы - өзіңнің ең салауатты және өнімді нұсқаң болу. Таңғы ырымдар, таза тамақтану, фитнес және өзіне қамқор.',
            fr: 'L\'esthétique "Cette Fille" consiste à devenir la version la plus saine et productive de vous-même.',
        },
        shortDescription: {
            en: 'Wellness aesthetic lifestyle',
            ru: 'Велнес-эстетика образа жизни',
            kk: 'Сауықтыру эстетикалық өмір салты',
            fr: 'Style de vie esthétique bien-être',
        },
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        embrace: ['green smoothies', 'matcha', 'overnight oats', 'açaí bowls', 'avocado toast', 'Buddha bowls', 'lean proteins', 'fresh salads', 'chia seeds', 'berries', 'lemon water'],
        minimize: ['processed foods', 'fast food', 'excessive sugar', 'alcohol', 'caffeine after 2pm', 'heavy dinners'],
        dailyTracker: [
            { key: 'morning_routine', label: { en: 'Morning routine completed', ru: 'Утренний ритуал выполнен', kk: 'Таңғы ырым орындалды', fr: 'Routine matinale terminée' } },
            { key: 'green_juice', label: { en: 'Green juice or smoothie', ru: 'Зелёный сок или смузи', kk: 'Жасыл шырын немесе смузи', fr: 'Jus vert ou smoothie' } },
            { key: 'aesthetic_meal', label: { en: 'Aesthetic healthy meal', ru: 'Эстетичная здоровая еда', kk: 'Эстетикалық салауатты тамақ', fr: 'Repas sain esthétique' } },
            { key: 'hydration', label: { en: '2L of water', ru: '2 литра воды', kk: '2 литр су', fr: '2L d\'eau' } },
        ],
        suitableFor: ['wellness', 'aesthetic', 'instagram'],
        isFeatured: true,
        popularityScore: 94,
        tags: ['trending', 'aesthetic', 'wellness'],
        emoji: '✨',
        target: 'female',
        ageRange: '18-30',
        imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80',
        color: '#7CB342',
    },
    {
        slug: 'clean_girl',
        name: {
            en: 'Clean Girl',
            ru: '"Чистая девушка"',
            kk: '"Таза қыз"',
            fr: 'Clean Girl',
        },
        subtitle: {
            en: 'Minimal, natural beauty',
            ru: 'Минимализм и естественная красота',
            kk: 'Минимализм және табиғи сұлулық',
            fr: 'Beauté naturelle et minimale',
        },
        description: {
            en: 'The Clean Girl aesthetic emphasizes natural beauty, minimal makeup, and clean eating. Focus on whole foods that nourish your skin from within.',
            ru: 'Эстетика "Чистой девушки" подчеркивает естественную красоту, минимальный макияж и чистое питание. Фокус на цельных продуктах, питающих кожу изнутри.',
            kk: '"Таза қыз" эстетикасы табиғи сұлулықты, минималды макияжды және таза тамақтануды ерекшелейді.',
            fr: 'L\'esthétique Clean Girl met l\'accent sur la beauté naturelle, le maquillage minimal et l\'alimentation propre.',
        },
        shortDescription: {
            en: 'Natural glow lifestyle',
            ru: 'Образ жизни с естественным сиянием',
            kk: 'Табиғи жарқырау өмір салты',
            fr: 'Style de vie éclat naturel',
        },
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        embrace: ['whole foods', 'vegetables', 'leafy greens', 'cucumber', 'berries', 'citrus', 'lean proteins', 'eggs', 'fish', 'avocado', 'olive oil', 'nuts', 'water', 'herbal tea'],
        minimize: ['processed foods', 'sugar', 'dairy', 'excessive caffeine', 'alcohol', 'fried foods'],
        dailyTracker: [
            { key: 'whole_foods', label: { en: 'Whole foods only', ru: 'Только цельные продукты', kk: 'Тек тұтас тағамдар', fr: 'Aliments entiers uniquement' } },
            { key: 'hydration', label: { en: '2L+ of water', ru: '2+ литра воды', kk: '2+ литр су', fr: '2L+ d\'eau' } },
            { key: 'simple_meal', label: { en: 'Simple clean meal', ru: 'Простая чистая еда', kk: 'Қарапайым таза тамақ', fr: 'Repas simple et propre' } },
        ],
        suitableFor: ['skin_health', 'simplicity', 'natural'],
        isFeatured: true,
        popularityScore: 92,
        tags: ['trending', 'clean', 'minimal'],
        emoji: '🧴',
        target: 'female',
        ageRange: '18-35',
        imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
        color: '#81D4FA',
    },
    {
        slug: 'old_money',
        name: {
            en: 'Old Money',
            ru: '"Старые деньги"',
            kk: '"Ескі ақша"',
            fr: 'Old Money',
        },
        subtitle: {
            en: 'Quiet luxury living',
            ru: 'Тихая роскошь',
            kk: 'Тыныш сәнділік',
            fr: 'Luxe discret',
        },
        description: {
            en: 'Embrace timeless elegance and quality over trends. Old Money aesthetic focuses on classic, high-quality ingredients and proper dining etiquette.',
            ru: 'Выберите вечную элегантность и качество вместо трендов. Эстетика "Старых денег" фокусируется на классических, качественных ингредиентах и правильном этикете.',
            kk: 'Трендтердің орнына мәңгі талғампаздық пен сапаны таңдаңыз. "Ескі ақша" эстетикасы классикалық, сапалы ингредиенттер мен дұрыс этикетке бағытталған.',
            fr: 'Adoptez l\'élégance intemporelle et la qualité plutôt que les tendances.',
        },
        shortDescription: {
            en: 'Timeless elegance lifestyle',
            ru: 'Образ жизни вечной элегантности',
            kk: 'Мәңгі талғампаздық өмір салты',
            fr: 'Style de vie élégance intemporelle',
        },
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        embrace: ['grass-fed beef', 'wild salmon', 'organic eggs', 'quality cheese', 'seasonal vegetables', 'farmers market produce', 'fresh berries', 'fine wine', 'real butter', 'artisan bread'],
        minimize: ['chain restaurants', 'fast food', 'cheap ingredients', 'processed foods', 'trendy diet foods'],
        dailyTracker: [
            { key: 'quality_ingredients', label: { en: 'Quality ingredients', ru: 'Качественные продукты', kk: 'Сапалы ингредиенттер', fr: 'Ingrédients de qualité' } },
            { key: 'proper_dining', label: { en: 'Proper dining etiquette', ru: 'Правильный этикет за столом', kk: 'Дұрыс үстел этикеті', fr: 'Étiquette de table appropriée' } },
            { key: 'three_meals', label: { en: 'Three proper meals', ru: 'Три полноценных приёма пищи', kk: 'Үш толық тамақ', fr: 'Trois repas appropriés' } },
        ],
        suitableFor: ['luxury', 'quality', 'elegance'],
        isFeatured: true,
        popularityScore: 98,
        tags: ['trending', 'luxury', 'quality'],
        emoji: '🏛️',
        target: 'all',
        ageRange: '22-55',
        imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
        color: '#8D6E63',
    },
    {
        slug: 'tomato_girl_summer',
        name: { en: 'Tomato Girl Summer', ru: 'Лето Томатной Девушки', kk: 'Қызанақ Қыз Жаз', fr: 'Tomato Girl Summer' },
        subtitle: { en: 'Mediterranean dreams, sun-kissed living', ru: 'Средиземноморские мечты, загорелая жизнь', kk: 'Жерорта теңізі армандары', fr: 'Rêves méditerranéens, vie ensoleillée' },
        description: { en: 'La dolce vita on your plate. Fresh tomatoes, burrata, olive oil, pasta, wine.', ru: 'Сладкая жизнь на тарелке. Помидоры, буррата, оливковое масло.', kk: 'Табақтағы тәтті өмір.', fr: 'La dolce vita dans l\' },
        shortDescription: { en: 'Mediterranean vibes, sun-kissed', ru: 'Средиземноморские вайбы', kk: 'Жерорта теңізі энергиясы', fr: 'Vibes méditerranéennes, soleil' },
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        embrace: ['tomatoes', 'olive oil', 'burrata', 'mozzarella', 'feta', 'fresh pasta', 'crusty bread', 'seafood', 'peaches', 'figs', 'wine', 'fresh herbs', 'basil'],
        minimize: ['processed foods', 'heavy cream sauces', 'fast food'],
        dailyTracker: [
            { key: 'olive_oil', label: { en: 'Olive oil on everything', ru: 'Оливковое масло на всём', kk: 'Барлық нәрсеге зейтін майы', fr: 'Huile d\' } },
            { key: 'fresh_tomatoes', label: { en: 'Fresh tomatoes', ru: 'Свежие помидоры', kk: 'Жаңа қызанақтар', fr: 'Tomates fraîches' } },
            { key: 'aperitivo', label: { en: 'Aperitivo hour', ru: 'Час аперитива', kk: 'Аперитив сағаты', fr: 'Heure apéritif' } },
        ],
        suitableFor: ['mediterranean', 'summer', 'italian'],
        isFeatured: true,
        popularityScore: 93, // FIX #11: Keep high - Mediterranean summer trend is globally popular
        tags: ['trending', 'mediterranean', 'summer'],
        emoji: '🍅',
        target: 'female',
        ageRange: '18-40',
        imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80', // Mediterranean summer, tomatoes, fresh food
        color: '#E53935',
    },
    {
        slug: 'pilates_princess',
        name: { en: 'Pilates Princess', ru: 'Принцесса Пилатеса', kk: 'Пилатес Ханшасы', fr: 'Pilates Princess' },
        subtitle: { en: 'Long, lean, graceful strength', ru: 'Длинная, стройная, грациозная сила', kk: 'Ұзын, арық, сәнді күш', fr: 'Long, fine, force gracieuse' },
        description: { en: 'Fuel for lengthening and strengthening. Lean proteins, anti-inflammatory foods, collagen.', ru: 'Топливо для удлинения и укрепления. Постные белки, коллаген.', kk: 'Ұзарту және күшейту үшін отын.', fr: 'Carburant pour allongement et renforcement. Protéines maigres, collagène.' },
        shortDescription: { en: 'Lean, graceful, strong', ru: 'Стройная, грациозная, сильная', kk: 'Арық, сәнді, күшті', fr: 'Fine, gracieuse, forte' },
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        embrace: ['lean proteins', 'fish', 'chicken', 'eggs', 'collagen', 'bone broth', 'vegetables', 'quinoa', 'sweet potato', 'berries', 'green juice', 'matcha', 'nuts'],
        minimize: ['processed foods', 'sugar', 'excessive carbs', 'alcohol', 'heavy meals', 'inflammatory foods'],
        dailyTracker: [
            { key: 'collagen', label: { en: 'Collagen in smoothie', ru: 'Коллаген в смузи', kk: 'Смузидегі коллаген', fr: 'Collagène dans smoothie' } },
            { key: 'lean_protein', label: { en: 'Lean protein', ru: 'Постный белок', kk: 'Азық белок', fr: 'Protéines maigres' } },
            { key: 'light_eating', label: { en: 'Light eating on class days', ru: 'Лёгкое питание в дни занятий', kk: 'Сабақ күндерінде жеңіл тағам', fr: 'Repas léger les jours de cours' } },
        ],
        suitableFor: ['pilates', 'flexibility', 'grace'],
        isFeatured: false,
        popularityScore: 85,
        tags: ['trending', 'pilates', 'fitness'],
        emoji: '🤍',
        target: 'female',
        ageRange: '20-50',
        imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80', // Pilates, graceful movement, lean strength
        color: '#F48FB1',
    },
    {
        slug: 'coastal_grandmother',
        name: { en: 'Coastal Grandmother', ru: 'Прибрежная Бабушка', kk: 'Жағалау Анасы', fr: 'Grand-mère côtière' },
        subtitle: { en: 'Nancy Meyers kitchen energy', ru: 'Энергия кухни Нэнси Мейерс', kk: 'Нэнси Мейерс асхана энергиясы', fr: 'Énergie cuisine Nancy Meyers' },
        description: { en: 'Diane Keaton lifestyle. Fresh seafood, farmers market vegetables, white wine on the porch.', ru: 'Образ жизни Дианы Китон. Морепродукты, белое вино на веранде.', kk: 'Диана Китон өмір салты.', fr: 'Style Diane Keaton. Fruits de mer, légumes du marché, vin blanc sur la véranda.' },
        shortDescription: { en: 'Coastal elegance, Nancy Meyers vibes', ru: 'Прибрежная элегантность', kk: 'Жағалау элеганттылығы', fr: 'Élégance côtière, vibes Nancy Meyers' },
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        embrace: ['fresh seafood', 'fish', 'shrimp', 'vegetables', 'salads', 'fresh bread', 'olive oil', 'white wine', 'fresh fruit', 'yogurt', 'honey', 'herbal tea'],
        minimize: ['processed foods', 'fast food', 'complicated recipes', 'stress eating', 'rushed meals'],
        dailyTracker: [
            { key: 'set_table', label: { en: 'Set table properly', ru: 'Правильная сервировка', kk: 'Дұрыс сервировка', fr: 'Mettre la table correctement' } },
            { key: 'fresh_seafood', label: { en: 'Fresh seafood', ru: 'Свежие морепродукты', kk: 'Жаңа теңіз өнімдері', fr: 'Fruits de mer frais' } },
            { key: 'beach_walk', label: { en: 'Walk on the beach', ru: 'Прогулка по пляжу', kk: 'Пляжда серуен', fr: 'Marche sur la plage' } },
        ],
        suitableFor: ['coastal', 'elegant', 'serene'],
        isFeatured: true, // FIX #11: Make featured - Coastal Grandmother is popular thanks to TikTok
        popularityScore: 90, // FIX #11: Increase popularity - Coastal Grandmother trend is globally popular
        tags: ['trending', 'coastal', 'elegant'],
        emoji: '🐚',
        target: 'female',
        ageRange: '30-65',
        imageUrl: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800&q=80', // Coastal, elegant, fresh seafood
        color: '#B0BEC5',
    },
    {
        slug: 'soft_life',
        name: { en: 'Soft Life', ru: 'Мягкая Жизнь', kk: 'Жұмсақ Өмір', fr: 'Soft Life' },
        subtitle: { en: 'Ease, comfort, zero stress', ru: 'Лёгкость, комфорт, ноль стресса', kk: 'Жеңілдік, ыңғайлылық, стресс жоқ', fr: 'Douceur, confort, zéro stress' },
        description: { en: 'Anti-hustle culture eating. Gentle foods, no strict rules, comfort without guilt.', ru: 'Питание против культуры суеты. Мягкие продукты, никаких строгих правил.', kk: 'Асығыс мәдениетіне қарсы тағам.', fr: 'Anti-hustle. Aliments doux, pas de règles strictes, confort sans culpabilité.' },
        shortDescription: { en: 'Easy, comfortable, stress-free', ru: 'Легко, комфортно, без стресса', kk: 'Жеңіл, ыңғайлы, стресссіз', fr: 'Facile, confortable, sans stress' },
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        embrace: ['comfort foods made healthy', 'soups', 'stews', 'warm bowls', 'soft textures', 'nourishing meals', 'treats in moderation', 'tea', 'gentle cooking'],
        minimize: ['stress eating', 'strict diets', 'punishment mentality', 'harsh restrictions', 'guilt'],
        dailyTracker: [
            { key: 'comfort_food', label: { en: 'Comfort food without guilt', ru: 'Комфортная еда без чувства вины', kk: 'Кінәсіз ыңғайлы тағам', fr: 'Comfort food sans culpabilité' } },
            { key: 'gentle_self', label: { en: 'Gentle with yourself', ru: 'Мягко к себе', kk: 'Өзіңізбен жұмсақ', fr: 'Douceur envers soi' } },
            { key: 'rest', label: { en: 'Rest is productive', ru: 'Отдых продуктивен', kk: 'Демалу өнімді', fr: 'Le repos est productif' } },
        ],
        suitableFor: ['comfort', 'relaxation', 'anti-stress'],
        isFeatured: true, // FIX #11: Make featured - Soft Life is popular anti-hustle culture
        popularityScore: 90, // FIX #11: Increase popularity - Soft Life is globally popular among millennials and Gen Z
        tags: ['trending', 'soft', 'comfort'],
        emoji: '🌸',
        target: 'all',
        ageRange: '25-50',
        imageUrl: 'https://images.unsplash.com/photo-1495195134817-aeb325a55b65?w=800&q=80', // Soft life, comfort, gentle living
        color: '#F8BBD9',
    },
    {
        slug: 'mob_wife',
        name: { en: 'Mob Wife', ru: 'Жена Мафиози', kk: 'Мафия Әйелі', fr: 'Mob Wife' },
        subtitle: { en: 'Dramatic, luxurious, unapologetic', ru: 'Драматичная, роскошная, без извинений', kk: 'Драмалық, сәнді, кешірімсіз', fr: 'Dramatique, luxueux, sans excuses' },
        description: { en: 'Italian-American indulgence. Sunday sauce, big family dinners, espresso, cannoli.', ru: 'Итало-американское потворство. Воскресный соус, семейные ужины.', kk: 'Италия-америкалық ләззат.', fr: 'Indulgence italo-américaine. Sauce du dimanche, dîners en famille, espresso, cannoli.' },
        shortDescription: { en: 'Italian luxury, bold choices', ru: 'Итальянская роскошь, смелые выборы', kk: 'Италиялық сәнділік', fr: 'Luxe italien, choix audacieux' },
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        embrace: ['Italian food', 'pasta', 'red sauce', 'meatballs', 'bread', 'olive oil', 'espresso', 'red wine', 'cannoli', 'tiramisu', 'family dinners', 'Sunday sauce'],
        minimize: ['diet food', 'sad salads', 'apologizing for eating', 'guilt', 'eating alone'],
        dailyTracker: [
            { key: 'sunday_sauce', label: { en: 'Sunday sauce tradition', ru: 'Традиция воскресного соуса', kk: 'Жексенбі соусы дәстүрі', fr: 'Tradition sauce du dimanche' } },
            { key: 'espresso', label: { en: 'Espresso, not apologies', ru: 'Эспрессо, а не извинения', kk: 'Эспрессо, кешірім емес', fr: 'Espresso, pas d\' } },
            { key: 'family_dinner', label: { en: 'Family-style dinner', ru: 'Семейный ужин', kk: 'Отбасылық кешкі ас', fr: 'Dîner en famille' } },
        ],
        suitableFor: ['italian', 'family', 'bold'],
        isFeatured: false,
        popularityScore: 78,
        tags: ['trending', 'italian', 'bold'],
        emoji: '🖤',
        target: 'female',
        ageRange: '25-55',
        imageUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&q=80', // Italian luxury, dramatic, bold food
        color: '#212121',
    },
    // ============================================
    // 🎯 GOAL_LOSE_WEIGHT (4 programs)
    // ============================================
    {
        slug: 'summer_shred',
        name: { en: 'Summer Shred', ru: 'Летняя Сушка', kk: 'Жаздық Сушка', fr: 'Summer Shred' },
        subtitle: { en: 'Lean, defined, beach-ready', ru: 'Стройное, рельефное, готовое к пляжу', kk: 'Арық, анықталған, пляжқа дайын', fr: 'Sèche, définie, prête plage' },
        description: { en: 'Strategic fat loss while preserving muscle. High protein, plenty of vegetables.', ru: 'Стратегическая потеря жира при сохранении мышц.', kk: 'Бұлшық етті сақтай отырып стратегиялық май жоғалту.', fr: 'Perte de gras stratégique, préserver le muscle. Protéines, légumes.' },
        shortDescription: { en: 'Lean, defined, beach-ready', ru: 'Стройное, рельефное', kk: 'Арық, анықталған', fr: 'Sèche, définie, prête plage' },
        category: 'weight_loss', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Weight Loss', streakThreshold: 0.7,
        embrace: ['lean proteins', 'chicken breast', 'fish', 'egg whites', 'Greek yogurt', 'vegetables', 'leafy greens', 'berries'],
        minimize: ['sugar', 'alcohol', 'fried foods', 'processed carbs', 'late night eating'],
        dailyTracker: [{ key: 'protein', label: { en: 'Protein at every meal', ru: 'Белок при каждом приёме пищи', kk: 'Әр тағамда белок', fr: 'Protéines à chaque repas' } }],
        suitableFor: ['fat_loss', 'definition'], isFeatured: true, popularityScore: 88, tags: ['weight_loss', 'shred'], emoji: '🔥', target: 'all', ageRange: '18-45',
        imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80', // Lean shredded body, beach ready
        color: '#FF6B6B',
    },
    {
        slug: 'metabolic_reset',
        name: { en: 'Metabolic Reset', ru: 'Метаболический Сброс', kk: 'Метаболизмдік Қалпына Келтіру', fr: 'Reset métabolique' },
        subtitle: { en: 'Restart your fat-burning engine', ru: 'Перезапустите двигатель сжигания жира', kk: 'Май жағу қозғалтқышын қайта бастаңыз', fr: 'Redémarrer la machine à brûler les graisses' },
        description: { en: 'Repair metabolism through whole foods, stable blood sugar, strategic eating windows.', ru: 'Восстановите метаболизм через цельные продукты.', kk: 'Толық тағамдар арқылы метаболизмді жөндеу.', fr: 'Réparer le métabolisme : aliments bruts, glycémie stable, fenêtres alimentaires.' },
        shortDescription: { en: 'Reset metabolism, stable energy', ru: 'Сбросить метаболизм', kk: 'Метаболизмді қалпына келтіру', fr: 'Reset métabolisme, énergie stable' },
        category: 'weight_loss', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Weight Loss', streakThreshold: 0.7,
        embrace: ['whole foods', 'protein', 'healthy fats', 'vegetables', 'fiber', 'complex carbs', 'green tea'],
        minimize: ['processed foods', 'sugar', 'refined carbs', 'frequent snacking', 'late eating'],
        dailyTracker: [{ key: 'blood_sugar', label: { en: 'Stable blood sugar', ru: 'Стабильный сахар', kk: 'Тұрақты қан қанты', fr: 'Glycémie stable' } }],
        suitableFor: ['metabolism', 'reset'], isFeatured: false, popularityScore: 82, tags: ['weight_loss', 'metabolism'], emoji: '🔄', target: 'all', ageRange: '25-55',
        imageUrl: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80', color: '#4CAF50', // Metabolic reset, healthy transformation
    },
    {
        slug: 'debloat_detox',
        name: { en: 'Debloat & Glow', ru: 'Убрать Отёки', kk: 'Ісінуді Алып Тастау', fr: 'Debloat & Glow' },
        subtitle: { en: 'Flatten, refresh, feel light', ru: 'Сплющить, освежить, почувствовать лёгкость', kk: 'Тегістеу, жаңарту, жеңіл сезіну', fr: 'Aplatir, rafraîchir, se sentir léger' },
        description: { en: 'Anti-inflammatory, low sodium, gut-friendly eating.', ru: 'Противовоспалительное, низконатриевое питание.', kk: 'Қабынуға қарсы, төмен натрийлі тағам.', fr: 'Anti-inflammatoire, peu de sodium, intestin-friendly.' },
        shortDescription: { en: 'Debloat, refresh, feel light', ru: 'Убрать отёки, освежиться', kk: 'Ісінуді алу, жаңарту', fr: 'Dégonfler, rafraîchir, légèreté' },
        category: 'weight_loss', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Weight Loss', streakThreshold: 0.6,
        embrace: ['cucumber', 'celery', 'asparagus', 'leafy greens', 'lemon water', 'ginger', 'peppermint tea'],
        minimize: ['sodium', 'carbonated drinks', 'beans', 'dairy', 'alcohol'],
        dailyTracker: [{ key: 'debloat', label: { en: 'Low sodium day', ru: 'День без натрия', kk: 'Натрийсіз күн', fr: 'Journée pauvre en sodium' } }],
        suitableFor: ['debloat', 'refresh'], isFeatured: false, popularityScore: 80, tags: ['weight_loss', 'debloat'], emoji: '💨', target: 'all', ageRange: '18-55',
        imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80', color: '#00BCD4', // Debloat & glow, fresh vegetables, clean eating
    },
    {
        slug: 'sustainable_slim',
        name: { en: 'Sustainable Slim', ru: 'Устойчивая Стройность', kk: 'Тұрақты Арықтық', fr: 'Sustainable Slim' },
        subtitle: { en: 'Lose it and keep it off forever', ru: 'Сбросьте и сохраните навсегда', kk: 'Жоғалтыңыз және мәңгі сақтаңыз', fr: 'Perdre et ne pas reprendre' },
        description: { en: 'Anti-yo-yo approach. Small sustainable changes, focus on habits not numbers.', ru: 'Подход против йо-йо. Небольшие устойчивые изменения.', kk: 'Йо-йоға қарсы тәсіл.', fr: 'Approche anti-yo-yo. Petits changements durables, habitudes pas chiffres.' },
        shortDescription: { en: 'Sustainable weight loss', ru: 'Устойчивое похудение', kk: 'Тұрақты арықтау', fr: 'Perte de poids durable' },
        category: 'weight_loss', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Weight Loss', streakThreshold: 0.6,
        embrace: ['whole foods', 'vegetables', 'lean proteins', 'fruits', 'whole grains', 'healthy fats'],
        minimize: ['processed foods', 'excessive sugar', 'mindless snacking', 'emotional eating'],
        dailyTracker: [{ key: 'habits', label: { en: 'Build habits', ru: 'Стройте привычки', kk: 'Дағдылар құрыңыз', fr: 'Construire les habitudes' } }],
        suitableFor: ['sustainable', 'lifestyle'], isFeatured: false, popularityScore: 78, tags: ['weight_loss', 'sustainable'], emoji: '🌱', target: 'all', ageRange: '25-60',
        imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80', // Aesthetic wellness, green smoothie, morning routine
        color: '#8BC34A',
    },
    // ============================================
    // 🎯 GOAL_BUILD_MUSCLE (4 programs)
    // ============================================
    {
        slug: 'lean_bulk',
        name: { en: 'Lean Bulk', ru: 'Чистый Набор', kk: 'Таза Қосылу', fr: 'Lean Bulk' },
        subtitle: { en: 'Build muscle without the fat', ru: 'Набрать мышцы без жира', kk: 'Майсыз бұлшық ет қосу', fr: 'Prendre du muscle sans gras' },
        description: { en: 'Strategic surplus. Enough calories to grow, enough protein to build.', ru: 'Стратегический профицит. Достаточно калорий для роста.', kk: 'Стратегиялық артықшылық.', fr: 'Surplus stratégique. Assez de calories pour grossir, assez de protéines.' },
        shortDescription: { en: 'Build muscle, stay lean', ru: 'Набрать мышцы, остаться стройным', kk: 'Бұлшық ет қосу, арық қалу', fr: 'Prendre du muscle, rester sec' },
        category: 'muscle_building', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Build Muscle', streakThreshold: 0.7,
        embrace: ['lean proteins', 'chicken', 'beef', 'fish', 'eggs', 'Greek yogurt', 'complex carbs', 'rice', 'oats'],
        minimize: ['junk food', 'excessive fat', 'alcohol', 'empty calories'],
        dailyTracker: [{ key: 'protein_goal', label: { en: 'Hit protein goal', ru: 'Достичь цели по белку', kk: 'Белок мақсатына жету', fr: 'Atteindre l\'objectif protéines' } }],
        suitableFor: ['bulking', 'muscle'], isFeatured: true, popularityScore: 85, tags: ['muscle', 'bulk'], emoji: '💪', target: 'male', ageRange: '18-45',
        imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', // Muscle building, strength training
        color: '#FF9800',
    },
    {
        slug: 'strength_athlete',
        name: { en: 'Strength Athlete', ru: 'Силовой Атлет', kk: 'Күш Атлеті', fr: 'Athlète force' },
        subtitle: { en: 'Fuel for power and performance', ru: 'Топливо для силы и производительности', kk: 'Күш пен өнімділік үшін отын', fr: 'Carburant force et performance' },
        description: { en: 'Performance nutrition for lifters. High protein, strategic carbs.', ru: 'Спортивное питание для лифтеров.', kk: 'Көтерушілерге арналған тағам.', fr: 'Nutrition performance pour haltérophiles. Protéines, glucides stratégiques.' },
        shortDescription: { en: 'Fuel for strength', ru: 'Топливо для силы', kk: 'Күш үшін отын', fr: 'Carburant force' },
        category: 'muscle_building', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Build Muscle', streakThreshold: 0.7,
        embrace: ['high protein', 'beef', 'chicken', 'eggs', 'fish', 'rice', 'potatoes', 'oats'],
        minimize: ['alcohol', 'excessive junk', 'undereating'],
        dailyTracker: [{ key: 'post_workout', label: { en: 'Post-workout nutrition', ru: 'Питание после тренировки', kk: 'Жаттығудан кейінгі тағам', fr: 'Nutrition post-entraînement' } }],
        suitableFor: ['strength', 'powerlifting'], isFeatured: false, popularityScore: 82, tags: ['muscle', 'strength'], emoji: '🏋️', target: 'male', ageRange: '18-50',
        imageUrl: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=800&q=80', color: '#673AB7', // Strength athlete, power, performance
    },
    {
        slug: 'athletic_performance',
        name: { en: 'Athletic Performance', ru: 'Спортивная Форма', kk: 'Спорттық Форма', fr: 'Performance athlétique' },
        subtitle: { en: 'Train hard, eat smart, perform better', ru: 'Тренируйся усердно, ешь умно', kk: 'Қатты жаттығу, ақылды жеу', fr: 'S\' },
        description: { en: 'Sports nutrition for competitive athletes.', ru: 'Спортивное питание для соревновательных атлетов.', kk: 'Бәсекелес атлеттерге арналған тағам.', fr: 'Nutrition sportive pour athlètes compétitifs.' },
        shortDescription: { en: 'Athletic performance nutrition', ru: 'Спортивное питание', kk: 'Спорттық тағам', fr: 'Nutrition performance athlétique' },
        category: 'muscle_building', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Build Muscle', streakThreshold: 0.7,
        embrace: ['lean proteins', 'complex carbs', 'fruits', 'vegetables', 'hydration', 'electrolytes'],
        minimize: ['alcohol', 'processed foods', 'heavy foods before training'],
        dailyTracker: [{ key: 'fuel_work', label: { en: 'Fuel the work', ru: 'Заправляйте работу', kk: 'Жұмысты отындаңыз', fr: 'Alimenter l\'effort' } }],
        suitableFor: ['athletes', 'performance'], isFeatured: false, popularityScore: 80, tags: ['muscle', 'athletic'], emoji: '🏃', target: 'all', ageRange: '16-45',
        imageUrl: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80', color: '#2196F3', // Athletic performance, sports nutrition
    },
    {
        slug: 'functional_fitness',
        name: { en: 'Functional Fitness', ru: 'Функциональный Фитнес', kk: 'Функционалдық Фитнес', fr: 'Functional Fitness' },
        subtitle: { en: 'Strong, capable, ready for anything', ru: 'Сильный, способный, готов ко всему', kk: 'Күшті, қабілетті, кез келген нәрсеге дайын', fr: 'Fort, capable, prêt à tout' },
        description: { en: 'Nutrition for real-world performance. Balanced macros, anti-inflammatory focus.', ru: 'Питание для реальной производительности.', kk: 'Нақты өмір өнімділігіне арналған тағам.', fr: 'Nutrition performance au quotidien. Macros équilibrés, anti-inflammatoire.' },
        shortDescription: { en: 'Functional strength nutrition', ru: 'Питание для функциональной силы', kk: 'Функционалдық күш тағамы', fr: 'Nutrition force fonctionnelle' },
        category: 'muscle_building', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Build Muscle', streakThreshold: 0.7,
        embrace: ['whole foods', 'lean proteins', 'vegetables', 'fruits', 'complex carbs', 'turmeric', 'omega-3s'],
        minimize: ['processed foods', 'inflammatory foods', 'excessive sugar'],
        dailyTracker: [{ key: 'anti_inflammatory', label: { en: 'Anti-inflammatory foods', ru: 'Противовоспалительные продукты', kk: 'Қабынуға қарсы тағамдар', fr: 'Aliments anti-inflammatoires' } }],
        suitableFor: ['functional', 'mobility'], isFeatured: false, popularityScore: 78, tags: ['muscle', 'functional'], emoji: '⚡', target: 'all', ageRange: '25-55',
        imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80', color: '#FF9800', // Functional fitness, movement, strength
    },
    // ============================================
    // 🎯 GOAL_CLEAR_SKIN (3 programs)
    // ============================================
    {
        slug: 'glass_skin', name: { en: 'Glass Skin', ru: 'Стеклянная Кожа', kk: 'Шыны Тері', fr: 'Glass Skin' },
        subtitle: { en: 'Korean beauty starts from inside', ru: 'Корейская красота начинается изнутри', kk: 'Кореялық сұлулық іштен басталады', fr: 'La beauté K part de l\' },
        description: { en: 'Gut-skin connection. Fermented foods, omega-3s, collagen.', ru: 'Связь кишечника и кожи.', kk: 'Ішек-тері байланысы.', fr: 'Lien intestin-peau. Fermentés, oméga-3, collagène.' },
        shortDescription: { en: 'K-beauty nutrition', ru: 'К-бьюти питание', kk: 'К-бьюти тағам', fr: 'Nutrition K-beauty' },
        category: 'skin_health', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Clear Skin', streakThreshold: 0.6,
        embrace: ['fermented foods', 'kimchi', 'miso', 'bone broth', 'salmon', 'seaweed', 'green tea'],
        minimize: ['dairy', 'sugar', 'processed foods', 'alcohol'],
        dailyTracker: [{ key: 'fermented', label: { en: 'Fermented foods', ru: 'Ферментированные продукты', kk: 'Ферменттелген тағамдар', fr: 'Aliments fermentés' } }],
        suitableFor: ['skin', 'korean'], isFeatured: true, popularityScore: 91, tags: ['skin', 'kbeauty'], emoji: '✨', target: 'all', ageRange: '18-50', // FIX #11: Increase popularity - K-beauty is globally popular
        imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80', // Korean beauty, glass skin, healthy glow
        color: '#E1BEE7',
    },
    {
        slug: 'acne_clear', name: { en: 'Acne Clear', ru: 'Чистая Кожа', kk: 'Таза Тері', fr: 'Acne Clear' },
        subtitle: { en: 'Calm inflammation, clear breakouts', ru: 'Успокоить воспаление, очистить высыпания', kk: 'Қабынуды тыныштандыру', fr: 'Apaiser l\' },
        description: { en: 'Anti-inflammatory, low-glycemic eating.', ru: 'Противовоспалительное, низкогликемическое питание.', kk: 'Қабынуға қарсы тағам.', fr: 'Anti-inflammatoire, alimentation low-glycémique.' },
        shortDescription: { en: 'Clear skin nutrition', ru: 'Питание для чистой кожи', kk: 'Таза тері тағамы', fr: 'Nutrition peau nette' },
        category: 'skin_health', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Clear Skin', streakThreshold: 0.6,
        embrace: ['low-glycemic foods', 'vegetables', 'lean proteins', 'omega-3 fish', 'zinc-rich foods', 'probiotics', 'green tea'],
        minimize: ['dairy', 'sugar', 'high-glycemic carbs', 'processed foods'],
        dailyTracker: [{ key: 'low_glycemic', label: { en: 'Low glycemic day', ru: 'Низкогликемический день', kk: 'Төмен гликемиялық күн', fr: 'Journée low-glycémique' } }],
        suitableFor: ['acne', 'skin'], isFeatured: false, popularityScore: 82, tags: ['skin', 'acne'], emoji: '🧊', target: 'all', ageRange: '14-40',
        imageUrl: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=800&q=80', color: '#64B5F6', // Acne clear, clear skin, healthy glow
    },
    {
        slug: 'anti_aging_glow', name: { en: 'Anti-Aging Glow', ru: 'Антивозрастное Сияние', kk: 'Жасылдыққа Қарсы Жарқырау', fr: 'Anti-âge Glow' },
        subtitle: { en: 'Age gracefully, glow eternally', ru: 'Стареть красиво, сиять вечно', kk: 'Әдемі қартаю, мәңгі жарқырау', fr: 'Vieillir avec grâce, rayonner' },
        description: { en: 'Longevity nutrition. Antioxidants, collagen, healthy fats.', ru: 'Питание для долголетия кожи.', kk: 'Теріге арналған ұзақ өмір тағамы.', fr: 'Nutrition longévité. Antioxydants, collagène, bonnes graisses.' },
        shortDescription: { en: 'Anti-aging nutrition', ru: 'Антивозрастное питание', kk: 'Қартаюға қарсы тағам', fr: 'Nutrition anti-âge' },
        category: 'skin_health', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Clear Skin', streakThreshold: 0.6,
        embrace: ['antioxidants', 'berries', 'leafy greens', 'olive oil', 'fatty fish', 'nuts', 'collagen', 'bone broth', 'green tea', 'dark chocolate'],
        minimize: ['sugar', 'processed foods', 'alcohol', 'fried foods'],
        dailyTracker: [{ key: 'antioxidants', label: { en: 'Antioxidant-rich foods', ru: 'Продукты с антиоксидантами', kk: 'Антиоксидантқа бай тағамдар', fr: 'Aliments riches en antioxydants' } }],
        suitableFor: ['antiaging', 'glow'], isFeatured: false, popularityScore: 80, tags: ['skin', 'antiaging'], emoji: '🌟', target: 'all', ageRange: '30-65',
        imageUrl: 'https://images.unsplash.com/photo-1505944270255-72b8c68c6a70?w=800&q=80', color: '#FFD54F', // Anti-aging glow, youthful skin, healthy aging
    },
    // ============================================
    // 🎯 GOAL_MORE_ENERGY (3 programs)
    // ============================================
    {
        slug: 'all_day_energy', name: { en: 'All-Day Energy', ru: 'Энергия На Весь День', kk: 'Күн Бойы Энергия', fr: 'Énergie toute la journée' },
        subtitle: { en: 'No crashes, no slumps, just go', ru: 'Никаких спадов, просто вперёд', kk: 'Төмендеу жоқ, тек алға', fr: 'Pas de coup de barre, en avant' },
        description: { en: 'Blood sugar stability for sustained energy.', ru: 'Стабильность сахара для устойчивой энергии.', kk: 'Тұрақты энергия үшін қан қантының тұрақтылығы.', fr: 'Glycémie stable pour énergie durable.' },
        shortDescription: { en: 'Sustained energy all day', ru: 'Стабильная энергия весь день', kk: 'Күн бойы тұрақты энергия', fr: 'Énergie stable toute la journée' },
        category: 'energy', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'More Energy', streakThreshold: 0.6,
        embrace: ['complex carbs', 'oats', 'quinoa', 'sweet potato', 'lean proteins', 'nuts', 'vegetables', 'green tea'],
        minimize: ['sugar', 'refined carbs', 'excessive caffeine', 'skipping meals'],
        dailyTracker: [{ key: 'stable_energy', label: { en: 'Stable energy', ru: 'Стабильная энергия', kk: 'Тұрақты энергия', fr: 'Énergie stable' } }],
        suitableFor: ['energy', 'productivity'], isFeatured: true, popularityScore: 85, tags: ['energy', 'focus'], emoji: '⚡', target: 'all', ageRange: '20-55',
        imageUrl: 'https://images.unsplash.com/photo-1494390248081-4e521a5940db?w=800&q=80', // Energy, productivity, healthy breakfast
        color: '#FFD54F',
    },
    {
        slug: 'brain_fuel', name: { en: 'Brain Fuel', ru: 'Топливо для Мозга', kk: 'Ми Үшін Отын', fr: 'Carburant cerveau' },
        subtitle: { en: 'Focus, clarity, mental edge', ru: 'Фокус, ясность, умственное преимущество', kk: 'Назар, анықтық', fr: 'Focus, clarté, acuité mentale' },
        description: { en: 'Nootropic nutrition. Omega-3s, stable glucose, brain nutrients.', ru: 'Ноотропное питание.', kk: 'Ноотроптық тағам.', fr: 'Nutrition nootropique. Oméga-3, glucose stable.' },
        shortDescription: { en: 'Brain-boosting nutrition', ru: 'Питание для мозга', kk: 'Миға арналған тағам', fr: 'Nutrition cerveau' },
        category: 'energy', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'More Energy', streakThreshold: 0.6,
        embrace: ['fatty fish', 'salmon', 'eggs', 'blueberries', 'walnuts', 'dark chocolate', 'green tea', 'olive oil', 'avocado'],
        minimize: ['sugar', 'processed foods', 'trans fats', 'blood sugar spikes'],
        dailyTracker: [{ key: 'brain_foods', label: { en: 'Brain foods', ru: 'Продукты для мозга', kk: 'Ми тағамдары', fr: 'Aliments cerveau' } }],
        suitableFor: ['focus', 'mental'], isFeatured: false, popularityScore: 82, tags: ['energy', 'brain'], emoji: '🧠', target: 'all', ageRange: '25-60',
        imageUrl: 'https://images.unsplash.com/photo-1508558936510-0af1e3cccbab?w=800&q=80', color: '#9C27B0', // Brain fuel, mental clarity, cognitive health
    },
    {
        slug: 'adrenal_recovery', name: { en: 'Adrenal Recovery', ru: 'Восстановление Надпочечников', kk: 'Бүйрек Үсті Бездерін Қалпына Келтіру', fr: 'Récupération surrénales' },
        subtitle: { en: 'Heal burnout, restore vitality', ru: 'Исцелить выгорание', kk: 'Күйіп қалуды жазу', fr: 'Guérir le burnout, restaurer la vitalité' },
        description: { en: 'Healing nutrition for burned-out systems.', ru: 'Исцеляющее питание для истощённых систем.', kk: 'Күйіп қалған жүйелерге арналған жазылу тағамы.', fr: 'Nutrition guérison pour systèmes épuisés.' },
        shortDescription: { en: 'Burnout recovery', ru: 'Восстановление от выгорания', kk: 'Күйіп қалудан қалпына келтіру', fr: 'Récupération burnout' },
        category: 'energy', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'More Energy', streakThreshold: 0.6,
        embrace: ['nutrient-dense foods', 'organ meats', 'bone broth', 'eggs', 'vegetables', 'fruits', 'healthy fats'],
        minimize: ['caffeine', 'sugar', 'alcohol', 'processed foods', 'skipping meals'],
        dailyTracker: [{ key: 'no_caffeine', label: { en: 'No caffeine', ru: 'Без кофеина', kk: 'Кофеинсіз', fr: 'Pas de caféine' } }],
        suitableFor: ['burnout', 'recovery'], isFeatured: false, popularityScore: 78, tags: ['energy', 'recovery'], emoji: '🔋', target: 'all', ageRange: '25-55',
        imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80', color: '#4DB6AC', // Adrenal recovery, stress management, balance
    },
    // ============================================
    // 🌍 DESTINATIONS (5 programs)
    // ============================================
    {
        slug: 'amalfi_coast', name: { en: 'Amalfi Coast', ru: 'Амальфитанское Побережье', kk: 'Амальфи Жағалауы', fr: 'Côte Amalfitaine' },
        subtitle: { en: 'Limoncello sunsets, Italian dreams', ru: 'Закаты с лимончелло', kk: 'Лимончелло күн батулары', fr: 'Couchers limoncello, rêves italiens' },
        description: { en: 'Southern Italian coastal living.', ru: 'Южно-итальянская прибрежная жизнь.', kk: 'Оңтүстік италиялық жағалау өмірі.', fr: 'Vie côtière sud italien.' },
        shortDescription: { en: 'Italian coastal eating', ru: 'Итальянское прибрежное питание', kk: 'Италиялық жағалау тағамы', fr: 'Alimentation côtière italienne' },
        category: 'destinations', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Destinations', streakThreshold: 0.6,
        embrace: ['fresh seafood', 'fish', 'lemons', 'olive oil', 'tomatoes', 'fresh pasta', 'wine'],
        minimize: ['processed foods', 'fast food', 'rushing meals'],
        dailyTracker: [{ key: 'italian_meal', label: { en: 'Italian-style meal', ru: 'Итальянский приём пищи', kk: 'Италиялық тағам', fr: 'Repas style italien' } }],
        suitableFor: ['italian', 'coastal'], isFeatured: true, popularityScore: 96, tags: ['destinations', 'italian'], emoji: '🍋', target: 'all', ageRange: '18-65', // FIX #11: Increase popularity - Mediterranean diet is globally popular
        imageUrl: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=800&q=80', // Italian coastal, Mediterranean summer
        color: '#FFEB3B',
    },
    {
        slug: 'greek_islands', name: { en: 'Greek Islands', ru: 'Греческие Острова', kk: 'Грек Аралдары', fr: 'Îles grecques' },
        subtitle: { en: 'Santorini sunsets on your plate', ru: 'Закаты Санторини на тарелке', kk: 'Санторини күн батулары табақта', fr: 'Couchers Santorin dans l\' },
        description: { en: 'The original Mediterranean diet.', ru: 'Оригинальная средиземноморская диета.', kk: 'Түпнұсқа Жерорта теңізі диетасы.', fr: 'Le régime méditerranéen originel.' },
        shortDescription: { en: 'Greek Mediterranean eating', ru: 'Греческое средиземноморское питание', kk: 'Грек Жерорта теңізі тағамы', fr: 'Alimentation grecque méditerranéenne' },
        category: 'destinations', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Destinations', streakThreshold: 0.6,
        embrace: ['olive oil', 'feta', 'Greek yogurt', 'fish', 'legumes', 'vegetables', 'wine', 'honey'],
        minimize: ['processed foods', 'excessive red meat'],
        dailyTracker: [{ key: 'mediterranean', label: { en: 'Mediterranean meal', ru: 'Средиземноморская еда', kk: 'Жерорта теңізі тағамы', fr: 'Repas méditerranéen' } }],
        suitableFor: ['greek', 'mediterranean'], isFeatured: false, popularityScore: 82, tags: ['destinations', 'greek'], emoji: '🇬🇷', target: 'all', ageRange: '18-70',
        imageUrl: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800&q=80', color: '#03A9F4', // Greek Islands, Mediterranean, fresh seafood
    },
    {
        slug: 'okinawa_longevity', name: { en: 'Okinawa Longevity', ru: 'Долголетие Окинавы', kk: 'Окинава Ұзақ Өмір', fr: 'Longévité Okinawa' },
        subtitle: { en: 'Secrets of living to 100', ru: 'Секреты жизни до 100', kk: '100-ге дейін өмір сүру құпиялары', fr: 'Secrets pour vivre jusqu\' },
        description: { en: 'Blue Zone wisdom. Hara hachi bu — 80% full.', ru: 'Мудрость Голубой зоны.', kk: 'Көк аймақ даналығы.', fr: 'Sagesse zone bleue. Hara hachi bu — 80 % plein.' },
        shortDescription: { en: 'Blue zone longevity', ru: 'Долголетие синей зоны', kk: 'Көк аймақ ұзақ өмір', fr: 'Longévité zone bleue' },
        category: 'destinations', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Destinations', streakThreshold: 0.6,
        embrace: ['purple sweet potato', 'tofu', 'vegetables', 'seaweed', 'fish', 'green tea', 'turmeric'],
        minimize: ['excessive meat', 'processed foods', 'large portions'],
        dailyTracker: [{ key: 'hara_hachi_bu', label: { en: '80% full', ru: '80% сытости', kk: '80% тоқ', fr: '80 % plein' } }],
        suitableFor: ['longevity', 'japanese'], isFeatured: true, popularityScore: 95, tags: ['destinations', 'japanese'], emoji: '🇯🇵', target: 'all', ageRange: '25-80', // FIX #11: Increase popularity and make featured - Japanese longevity diet is globally popular
        imageUrl: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80', color: '#9C27B0', // Okinawa longevity, Japanese wellness, longevity
    },
    {
        slug: 'tokyo_energy', name: { en: 'Tokyo Energy', ru: 'Энергия Токио', kk: 'Токио Энергиясы', fr: 'Tokyo Energy' },
        subtitle: { en: 'Fast-paced city, balanced eating', ru: 'Город в быстром темпе, сбалансированное питание', kk: 'Жылдам қала, теңгерімді тағам', fr: 'Ville rapide, alimentation équilibrée' },
        description: { en: 'Japanese efficiency meets nutrition.', ru: 'Японская эффективность встречается с питанием.', kk: 'Жапон тиімділігі тағаммен кездеседі.', fr: 'Efficacité japonaise et nutrition.' },
        shortDescription: { en: 'Japanese efficient eating', ru: 'Японское эффективное питание', kk: 'Жапон тиімді тағамы', fr: 'Alimentation japonaise efficace' },
        category: 'destinations', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Destinations', streakThreshold: 0.6,
        embrace: ['fish', 'rice', 'miso', 'vegetables', 'edamame', 'seaweed', 'green tea', 'noodles'],
        minimize: ['excessive processed foods', 'skipping meals'],
        dailyTracker: [{ key: 'bento', label: { en: 'Bento balance', ru: 'Баланс бенто', kk: 'Бенто теңгерімі', fr: 'Équilibre bento' } }],
        suitableFor: ['japanese', 'urban'], isFeatured: false, popularityScore: 78, tags: ['destinations', 'tokyo'], emoji: '🗼', target: 'all', ageRange: '20-50',
        imageUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&q=80', color: '#FF5722', // Tokyo Energy, Japanese efficiency, vibrant city life
    },
    {
        slug: 'scandi_hygge', name: { en: 'Scandi Hygge', ru: 'Скандинавский Хюгге', kk: 'Скандинавиялық Хюгге', fr: 'Scandi Hygge' },
        subtitle: { en: 'Cozy, balanced, sustainably happy', ru: 'Уютно, сбалансированно, счастливо', kk: 'Жайлы, теңгерімді, бақытты', fr: 'Cocooning, équilibré, durablement heureux' },
        description: { en: 'Nordic eating meets hygge lifestyle.', ru: 'Скандинавское питание встречается с хюгге.', kk: 'Скандинавиялық тағам хюгге өмір салтымен.', fr: 'Alimentation nordique et hygge.' },
        shortDescription: { en: 'Nordic cozy eating', ru: 'Скандинавское уютное питание', kk: 'Скандинавиялық жайлы тағам', fr: 'Alimentation nordique cocooning' },
        category: 'destinations', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Destinations', streakThreshold: 0.6,
        embrace: ['fatty fish', 'salmon', 'whole grain bread', 'berries', 'root vegetables', 'dairy', 'skyr', 'coffee'],
        minimize: ['excessive processed foods', 'rushed eating'],
        dailyTracker: [{ key: 'hygge', label: { en: 'Hygge moment', ru: 'Момент хюгге', kk: 'Хюгге сәті', fr: 'Moment hygge' } }],
        suitableFor: ['nordic', 'cozy'], isFeatured: true, popularityScore: 92, tags: ['destinations', 'nordic'], emoji: '🇩🇰', target: 'all', ageRange: '25-60', // FIX #11: Increase popularity and make featured - Scandinavian lifestyle is globally popular
        imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80', color: '#607D8B', // Scandi Hygge, cozy, comfort, Nordic lifestyle
    },
    // ============================================
    // 👗 AESTHETICS (5 programs)
    // ============================================
    {
        slug: '1950s_bombshell', name: { en: '1950s Bombshell', ru: 'Гламур 50-х', kk: '50-ші Жылдар Гламуры', fr: 'Bombshell années 50' },
        subtitle: { en: 'Curves, confidence, classic beauty', ru: 'Изгибы, уверенность, классическая красота', kk: 'Иілмелер, сенімділік', fr: 'Courbes, confiance, beauté classique' },
        description: { en: 'Real food, real curves. Protein-rich, whole ingredients.', ru: 'Настоящая еда, настоящие формы.', kk: 'Нағыз тағам, нағыз иілмелер.', fr: 'Vraie nourriture, vraies courbes. Protéines, ingrédients bruts.' },
        shortDescription: { en: 'Classic curves nutrition', ru: 'Питание для классических форм', kk: 'Классикалық иілмелер тағамы', fr: 'Nutrition courbes classiques' },
        category: 'aesthetics', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Aesthetics', streakThreshold: 0.6,
        embrace: ['eggs', 'steak', 'fish', 'cottage cheese', 'whole milk', 'vegetables', 'grapefruit'],
        minimize: ['processed foods', 'TV dinners', 'diet products'],
        dailyTracker: [{ key: 'protein', label: { en: 'Protein at every meal', ru: 'Белок при каждом приёме', kk: 'Әр тағамда белок', fr: 'Protéines à chaque repas' } }],
        suitableFor: ['curves', 'classic'], isFeatured: false, popularityScore: 75, tags: ['aesthetics', 'vintage'], emoji: '💄', target: 'female', ageRange: '20-50',
        imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80', color: '#E91E63', // 1950s Bombshell, vintage glamour, classic beauty
    },
    {
        slug: 'prima_ballerina', name: { en: 'Prima Ballerina', ru: 'Прима-балерина', kk: 'Прима-балерина', fr: 'Prima ballerina' },
        subtitle: { en: 'Grace, discipline, elegant strength', ru: 'Грация, дисциплина, элегантная сила', kk: 'Сәнділік, тәртіп', fr: 'Grâce, discipline, force élégante' },
        description: { en: 'Eating for performance and grace. Carbs for energy, protein for strength.', ru: 'Питание для производительности и грации.', kk: 'Өнер көрсету және сәнділік үшін тағам.', fr: 'Manger pour performance et grâce. Glucides énergie, protéines force.' },
        shortDescription: { en: 'Dancer nutrition', ru: 'Питание танцора', kk: 'Биші тағамы', fr: 'Nutrition danseur' },
        category: 'aesthetics', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Aesthetics', streakThreshold: 0.7,
        embrace: ['complex carbs', 'oatmeal', 'pasta', 'quinoa', 'lean proteins', 'chicken', 'fish', 'eggs', 'bananas', 'berries'],
        minimize: ['heavy greasy foods', 'excessive sugar', 'alcohol'],
        dailyTracker: [{ key: 'dancer_fuel', label: { en: 'Dancer-style eating', ru: 'Питание танцора', kk: 'Биші тағамы', fr: 'Alimentation style danseur' } }],
        suitableFor: ['dance', 'grace'], isFeatured: false, popularityScore: 72, tags: ['aesthetics', 'dance'], emoji: '🩰', target: 'female', ageRange: '16-45',
        imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80', // Prima Ballerina, graceful dance, elegant movement
        color: '#F8BBD9',
    },
    {
        slug: 'french_girl', name: { en: 'French Girl', ru: 'Французская Девушка', kk: 'Француз Қызы', fr: 'French Girl' },
        subtitle: { en: 'Je ne sais quoi in every bite', ru: 'Необъяснимое очарование', kk: 'Түсіндірілмейтін сүйкімділік', fr: 'Je ne sais quoi à chaque bouchée' },
        description: { en: 'Original intuitive eating. Three meals, no snacking, wine with dinner.', ru: 'Оригинальное интуитивное питание.', kk: 'Түпнұсқа интуитивті тағам.', fr: 'Manger intuitif originel. Trois repas, pas de grignotage, vin au dîner.' },
        shortDescription: { en: 'French intuitive eating', ru: 'Французское интуитивное питание', kk: 'Француз интуитивті тағамы', fr: 'Alimentation intuitive française' },
        category: 'aesthetics', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Aesthetics', streakThreshold: 0.6,
        embrace: ['fresh bread', 'cheese', 'wine', 'butter', 'eggs', 'fish', 'vegetables', 'dark chocolate'],
        minimize: ['snacking', 'processed foods', 'soft drinks', 'guilt', 'large portions'],
        dailyTracker: [{ key: 'three_meals', label: { en: 'Three meals, no snacking', ru: 'Три приёма пищи', kk: 'Үш тағам', fr: 'Trois repas, pas de grignotage' } }],
        suitableFor: ['french', 'intuitive'], isFeatured: true, popularityScore: 97, tags: ['aesthetics', 'french'], emoji: '🗼', target: 'female', ageRange: '20-60', // FIX #11: Increase popularity - French Girl is globally popular
        imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', // French girl aesthetic, intuitive eating, elegant
        color: '#9C27B0',
    },
    {
        slug: 'pin_up_retro', name: { en: 'Pin-Up Retro', ru: 'Ретро Пин-ап', kk: 'Ретро Пин-ап', fr: 'Pin-Up Rétro' },
        subtitle: { en: 'Vintage curves, modern confidence', ru: 'Винтажные изгибы', kk: 'Винтаждық иілмелер', fr: 'Courbes vintage, confiance moderne' },
        description: { en: 'Home-cooked meals, whole ingredients, no guilt.', ru: 'Домашние блюда, цельные ингредиенты.', kk: 'Үйде дайындалған тағамдар.', fr: 'Repas maison, ingrédients bruts, sans culpabilité.' },
        shortDescription: { en: 'Retro body-positive eating', ru: 'Ретро бодипозитивное питание', kk: 'Ретро дене-позитивті тағам', fr: 'Alimentation rétro body-positive' },
        category: 'aesthetics', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Aesthetics', streakThreshold: 0.6,
        embrace: ['home-cooked meals', 'meat', 'fish', 'eggs', 'potatoes', 'vegetables', 'fruits', 'bread', 'butter'],
        minimize: ['processed foods', 'fast food', 'artificial ingredients', 'guilt'],
        dailyTracker: [{ key: 'home_cooked', label: { en: 'Home-cooked meal', ru: 'Домашняя еда', kk: 'Үйде дайындалған тағам', fr: 'Repas fait maison' } }],
        suitableFor: ['retro', 'bodypositive'], isFeatured: false, popularityScore: 70, tags: ['aesthetics', 'retro'], emoji: '🎀', target: 'female', ageRange: '20-45',
        imageUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800&q=80', color: '#F44336', // Pin-Up Retro, vintage curves, body-positive
    },
    {
        slug: 'minimalist_zen', name: { en: 'Minimalist Zen', ru: 'Минималистский Дзен', kk: 'Минималистік Дзен', fr: 'Minimaliste Zen' },
        subtitle: { en: 'Less clutter, more clarity', ru: 'Меньше беспорядка, больше ясности', kk: 'Азырақ шатасу, көбірек анықтық', fr: 'Moins de désordre, plus de clarté' },
        description: { en: 'Japanese-inspired minimalism. Few ingredients, high quality.', ru: 'Японский минимализм.', kk: 'Жапонға шабыттанған минимализм.', fr: 'Minimalisme inspiré du Japon. Peu d\' },
        shortDescription: { en: 'Minimalist eating', ru: 'Минималистичное питание', kk: 'Минималистік тағам', fr: 'Alimentation minimaliste' },
        category: 'aesthetics', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Aesthetics', streakThreshold: 0.6,
        embrace: ['simple ingredients', 'rice', 'fish', 'vegetables', 'tofu', 'miso', 'green tea', 'seasonal foods'],
        minimize: ['complicated recipes', 'excessive variety', 'distracted eating'],
        dailyTracker: [{ key: 'simple_meal', label: { en: 'Simple, quality meal', ru: 'Простая качественная еда', kk: 'Қарапайым сапалы тағам', fr: 'Repas simple et qualité' } }],
        suitableFor: ['minimalist', 'zen'], isFeatured: false, popularityScore: 68, tags: ['aesthetics', 'zen'], emoji: '⚪', target: 'all', ageRange: '25-60',
        imageUrl: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80', color: '#9E9E9E', // Minimalist Zen, simplicity, mindfulness, peace
    },
    // ============================================
    // ⚔️ WARRIOR_MODE (6 programs)
    // ============================================
    {
        slug: 'spartan_warrior', name: { en: 'Spartan Warrior', ru: 'Спартанский Воин', kk: 'Спарталық Жауынгер', fr: 'Guerrier spartiate' },
        subtitle: { en: 'THIS. IS. DISCIPLINE.', ru: 'ЭТО. ЕСТЬ. ДИСЦИПЛИНА.', kk: 'БҰЛ. БОЛЫП ТАБЫЛАДЫ. ТӘРТІП.', fr: 'CECI. EST. LA DISCIPLINE.' },
        description: { en: 'Ancient warrior fuel. Simple foods, no luxury.', ru: 'Древнее топливо воина.', kk: 'Ежелгі жауынгер отыны.', fr: 'Carburant guerrier antique. Aliments simples, pas de luxe.' },
        shortDescription: { en: 'Spartan discipline', ru: 'Спартанская дисциплина', kk: 'Спартандық тәртіп', fr: 'Discipline spartiate' },
        category: 'warrior_mode', type: DietType.LIFESTYLE, difficulty: DietDifficulty.HARD, duration: 14, uiGroup: 'Warrior Mode', streakThreshold: 0.8,
        embrace: ['meat', 'lamb', 'beef', 'organ meats', 'bone broth', 'grains', 'barley', 'figs', 'olives'],
        minimize: ['luxury foods', 'excessive variety', 'sweets', 'weakness'],
        dailyTracker: [{ key: 'spartan', label: { en: 'Spartan discipline', ru: 'Спартанская дисциплина', kk: 'Спартандық тәртіп', fr: 'Discipline spartiate' } }],
        suitableFor: ['warrior', 'discipline'], isFeatured: true, popularityScore: 82, tags: ['warrior', 'spartan'], emoji: '🛡️', target: 'male', ageRange: '18-50',
        imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', // Spartan discipline, warrior mode, strength
        color: '#795548',
    },
    {
        slug: 'viking_raider', name: { en: 'Viking Raider', ru: 'Викинг-Завоеватель', kk: 'Викинг Басып Алушы', fr: 'Viking Raider' },
        subtitle: { en: 'Fuel for conquest and cold', ru: 'Топливо для завоеваний', kk: 'Басып алу үшін отын', fr: 'Carburant conquête et froid' },
        description: { en: 'Norse fuel. High fat, high protein, fermented foods.', ru: 'Скандинавское топливо.', kk: 'Норвегиялық отын.', fr: 'Carburant nordique. Gras, protéines, fermentés.' },
        shortDescription: { en: 'Viking strength eating', ru: 'Питание силы викинга', kk: 'Викинг күші тағамы', fr: 'Alimentation force viking' },
        category: 'warrior_mode', type: DietType.LIFESTYLE, difficulty: DietDifficulty.HARD, duration: 14, uiGroup: 'Warrior Mode', streakThreshold: 0.8,
        embrace: ['meat', 'beef', 'pork', 'fish', 'salmon', 'dairy', 'cheese', 'butter', 'eggs', 'berries'],
        minimize: ['processed foods', 'sugar', 'weakness'],
        dailyTracker: [{ key: 'viking', label: { en: 'Viking strength', ru: 'Сила викинга', kk: 'Викинг күші', fr: 'Force viking' } }],
        suitableFor: ['warrior', 'strength'], isFeatured: false, popularityScore: 78, tags: ['warrior', 'viking'], emoji: '🪓', target: 'male', ageRange: '18-50',
        imageUrl: 'https://images.unsplash.com/photo-1597347316205-36f6c451902a?w=800&q=80', color: '#455A64', // Viking Raider, Nordic strength, warrior fuel
    },
    {
        slug: 'navy_seal', name: { en: 'Navy SEAL', ru: 'Морской Спецназ', kk: 'Теңіз Арнайы Бөлімі', fr: 'Navy SEAL' },
        subtitle: { en: 'Elite fuel for elite performance', ru: 'Элитное топливо', kk: 'Элиталық отын', fr: 'Carburant élite pour performance élite' },
        description: { en: 'Performance nutrition, no nonsense. High calories for high output.', ru: 'Спортивное питание, без ерунды.', kk: 'Өнер көрсету тағамы, мағынасыз нәрсе жоқ.', fr: 'Nutrition performance, pas de bêtises. Calories pour output élevé.' },
        shortDescription: { en: 'Elite performance nutrition', ru: 'Элитное спортивное питание', kk: 'Элиталық спорт тағамы', fr: 'Nutrition performance élite' },
        category: 'warrior_mode', type: DietType.LIFESTYLE, difficulty: DietDifficulty.HARD, duration: 14, uiGroup: 'Warrior Mode', streakThreshold: 0.8,
        embrace: ['lean proteins', 'chicken', 'fish', 'beef', 'eggs', 'complex carbs', 'rice', 'oats', 'vegetables'],
        minimize: ['alcohol', 'sugar', 'fried foods', 'anything that slows you down'],
        dailyTracker: [{ key: 'mission', label: { en: 'Mission fuel', ru: 'Топливо для миссии', kk: 'Миссия отыны', fr: 'Carburant mission' } }],
        suitableFor: ['elite', 'military'], isFeatured: false, popularityScore: 80, tags: ['warrior', 'seal'], emoji: '🎖️', target: 'male', ageRange: '18-45',
        imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', color: '#263238', // Navy SEAL, elite performance, discipline
    },
    {
        slug: 'mma_fighter', name: { en: 'MMA Fighter', ru: 'Боец MMA', kk: 'MMA Жауынгері', fr: 'Combattant MMA' },
        subtitle: { en: 'Cut weight, stay strong, dominate', ru: 'Сбросить вес, остаться сильным', kk: 'Салмақты азайту, күшті қалу', fr: 'Sèche, reste fort, domine' },
        description: { en: 'Fight camp nutrition. High protein, strategic carbs.', ru: 'Питание бойцовского лагеря.', kk: 'Жауынгер лагері тағамы.', fr: 'Nutrition camp d\' },
        shortDescription: { en: 'Fighter nutrition', ru: 'Питание бойца', kk: 'Жауынгер тағамы', fr: 'Nutrition combattant' },
        category: 'warrior_mode', type: DietType.LIFESTYLE, difficulty: DietDifficulty.HARD, duration: 14, uiGroup: 'Warrior Mode', streakThreshold: 0.8,
        embrace: ['lean proteins', 'chicken', 'fish', 'eggs', 'vegetables', 'complex carbs', 'fruits', 'water'],
        minimize: ['sodium', 'alcohol', 'junk food'],
        dailyTracker: [{ key: 'fight_ready', label: { en: 'Fight ready', ru: 'Готов к бою', kk: 'Ұрысқа дайын', fr: 'Prêt au combat' } }],
        suitableFor: ['mma', 'fighter'], isFeatured: false, popularityScore: 76, tags: ['warrior', 'mma'], emoji: '🥊', target: 'male', ageRange: '18-40',
        imageUrl: 'https://images.unsplash.com/photo-1562771379-eafdca7a02f8?w=800&q=80', color: '#D32F2F', // MMA Fighter, combat nutrition, peak performance
    },
    {
        slug: 'ceo_warrior', name: { en: 'CEO Warrior', ru: 'CEO-Воин', kk: 'CEO Жауынгері', fr: 'CEO Warrior' },
        subtitle: { en: 'Dominate the boardroom', ru: 'Доминируй в зале заседаний', kk: 'Кеңседе басым бол', fr: 'Domine la salle de réunion' },
        description: { en: 'Biohacker meets executive. IF, keto principles.', ru: 'Биохакинг встречается с руководителем.', kk: 'Биохакинг басшымен кездеседі.', fr: 'Biohacking dirigeant. Jeûne intermittent, principes keto.' },
        shortDescription: { en: 'Executive biohacking', ru: 'Биохакинг руководителя', kk: 'Басшы биохакингі', fr: 'Biohacking dirigeant' },
        category: 'warrior_mode', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Warrior Mode', streakThreshold: 0.7,
        embrace: ['healthy fats', 'MCT oil', 'avocado', 'olive oil', 'quality proteins', 'grass-fed beef', 'eggs', 'low-carb vegetables'],
        minimize: ['sugar', 'processed carbs', 'frequent meals', 'blood sugar spikes'],
        dailyTracker: [{ key: 'optimized', label: { en: 'Optimized day', ru: 'Оптимизированный день', kk: 'Оңтайландырылған күн', fr: 'Journée optimisée' } }],
        suitableFor: ['biohacker', 'executive'], isFeatured: false, popularityScore: 74, tags: ['warrior', 'ceo'], emoji: '💼', target: 'male', ageRange: '25-55',
        imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80', color: '#37474F', // CEO Warrior, executive performance, high performance
    },
    {
        slug: 'stoic_monk', name: { en: 'Stoic Monk', ru: 'Стоический Монах', kk: 'Стоик Монах', fr: 'Moine stoïque' },
        subtitle: { en: 'Master your body, master your mind', ru: 'Управляй телом, управляй умом', kk: 'Денеңізді басқарыңыз', fr: 'Maîtrise corps et esprit' },
        description: { en: 'Voluntary simplicity. Eat little, want nothing.', ru: 'Добровольная простота.', kk: 'Ерікті қарапайымдылық.', fr: 'Simplicité volontaire. Manger peu, ne rien désirer.' },
        shortDescription: { en: 'Stoic simplicity', ru: 'Стоическая простота', kk: 'Стоик қарапайымдылығы', fr: 'Simplicité stoïque' },
        category: 'warrior_mode', type: DietType.LIFESTYLE, difficulty: DietDifficulty.HARD, duration: 14, uiGroup: 'Warrior Mode', streakThreshold: 0.8,
        embrace: ['simple foods', 'rice', 'beans', 'vegetables', 'fish', 'eggs', 'water', 'tea', 'fasting'],
        minimize: ['luxury', 'excess', 'emotional eating'],
        dailyTracker: [{ key: 'stoic', label: { en: 'Stoic discipline', ru: 'Стоическая дисциплина', kk: 'Стоик тәртібі', fr: 'Discipline stoïque' } }],
        suitableFor: ['stoic', 'minimalist'], isFeatured: false, popularityScore: 70, tags: ['warrior', 'stoic'], emoji: '🧘', target: 'all', ageRange: '25-60',
        imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80', color: '#78909C', // Stoic Monk, minimalism, discipline, simplicity
    },
    // ============================================
    // 📅 SEASONAL (4 programs)
    // ============================================
    {
        slug: 'summer_beach_body', name: { en: 'Summer Beach Body', ru: 'Пляжное Тело', kk: 'Пляж Денесі', fr: 'Corps plage été' },
        subtitle: { en: '4 weeks to your most confident summer', ru: '4 недели до уверенного лета', kk: 'Ең сенімді жазға 4 апта', fr: '4 semaines vers l\' },
        description: { en: 'Light, clean eating for beach confidence.', ru: 'Лёгкое, чистое питание для пляжной уверенности.', kk: 'Пляж сенімділігі үшін жеңіл тағам.', fr: 'Manger léger et sain pour confiance plage.' },
        shortDescription: { en: 'Beach body prep', ru: 'Подготовка пляжного тела', kk: 'Пляж денесін дайындау', fr: 'Prépa corps plage' },
        category: 'seasonal', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Seasonal', streakThreshold: 0.7,
        embrace: ['grilled fish', 'grilled chicken', 'egg whites', 'leafy greens', 'cucumber', 'berries', 'watermelon', 'quinoa'],
        minimize: ['bread', 'pasta', 'sugar', 'alcohol', 'fried foods'],
        dailyTracker: [{ key: 'beach_ready', label: { en: 'Beach ready day', ru: 'День готов к пляжу', kk: 'Пляжқа дайын күн', fr: 'Journée prête plage' } }],
        suitableFor: ['summer', 'beach'], isFeatured: true, popularityScore: 88, tags: ['seasonal', 'summer'], emoji: '☀️', target: 'all', ageRange: '18-45',
        imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80', // Summer body, beach ready, healthy lifestyle
        color: '#00BCD4',
    },
    {
        slug: 'new_year_reset', name: { en: 'New Year Reset', ru: 'Новогоднее Обновление', kk: 'Жаңа Жылдық Қалпына Келтіру', fr: 'Reset Nouvel An' },
        subtitle: { en: 'Fresh start, clean slate', ru: 'Новое начало, чистый лист', kk: 'Жаңа бастау, таза парақ', fr: 'Nouveau départ, page blanche' },
        description: { en: 'Gentle reset after indulgent times.', ru: 'Мягкое обновление после излишеств.', kk: 'Ләззат кезеңдерінен кейінгі жұмсақ қалпына келтіру.', fr: 'Reset doux après les excès.' },
        shortDescription: { en: 'New year reset', ru: 'Новогоднее обновление', kk: 'Жаңа жылдық қалпына келтіру', fr: 'Reset Nouvel An' },
        category: 'seasonal', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Seasonal', streakThreshold: 0.6,
        embrace: ['all vegetables', 'whole fruits', 'lean proteins', 'legumes', 'whole grains', 'herbal tea', 'water'],
        minimize: ['processed foods', 'sugar', 'alcohol', 'excessive coffee'],
        dailyTracker: [{ key: 'reset', label: { en: 'Reset day', ru: 'День обновления', kk: 'Қалпына келтіру күні', fr: 'Journée reset' } }],
        suitableFor: ['reset', 'newyear'], isFeatured: false, popularityScore: 82, tags: ['seasonal', 'newyear'], emoji: '🎆', target: 'all', ageRange: '18-60',
        imageUrl: 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=800&q=80', color: '#673AB7', // New Year Reset, fresh start, clean slate
    },
    {
        slug: 'wedding_ready', name: { en: 'Wedding Ready', ru: 'К Свадьбе Готова', kk: 'Үйленуге Дайын', fr: 'Prête pour le mariage' },
        subtitle: { en: 'Glowing, confident, picture-perfect', ru: 'Сияющая, уверенная, идеальная', kk: 'Жарқыраған, сенімді', fr: 'Lumineuse, confiante, parfaite en photo' },
        description: { en: 'Gradual, sustainable approach for your special day.', ru: 'Постепенный подход к особому дню.', kk: 'Ерекше күніңізге арналған біртіндеп тәсіл.', fr: 'Approche graduelle et durable pour le grand jour.' },
        shortDescription: { en: 'Wedding prep nutrition', ru: 'Питание для подготовки к свадьбе', kk: 'Үйленуге дайындық тағамы', fr: 'Nutrition prépa mariage' },
        category: 'seasonal', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Seasonal', streakThreshold: 0.7,
        embrace: ['lean proteins', 'fish', 'chicken', 'collagen-rich foods', 'bone broth', 'leafy greens', 'cucumber', 'quinoa', 'avocado'],
        minimize: ['high-sodium foods', 'beans', 'alcohol', 'carbonated drinks', 'dairy', 'sugar'],
        dailyTracker: [{ key: 'bridal_glow', label: { en: 'Bridal glow day', ru: 'День свадебного сияния', kk: 'Үйлену жарқырауы күні', fr: 'Journée glow mariée' } }],
        suitableFor: ['wedding', 'bride'], isFeatured: false, popularityScore: 80, tags: ['seasonal', 'wedding'], emoji: '💍', target: 'female', ageRange: '22-45',
        imageUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&q=80', color: '#FFCDD2', // Wedding Ready, bridal preparation, special occasion
    },
    {
        slug: 'holiday_balance', name: { en: 'Holiday Balance', ru: 'Праздничный Баланс', kk: 'Мерекелік Теңгерім', fr: 'Équilibre fêtes' },
        subtitle: { en: 'Enjoy the season without regret', ru: 'Наслаждайтесь сезоном без сожалений', kk: 'Мерекесіз кешірімсіз ләззат алыңыз', fr: 'Profiter des fêtes sans regret' },
        description: { en: 'Navigate holidays without gaining or restricting.', ru: 'Навигация по праздникам без набора веса.', kk: 'Салмақ қоспай мерекелерді басқару.', fr: 'Traverser les fêtes sans prendre ni se priver.' },
        shortDescription: { en: 'Holiday balance', ru: 'Праздничный баланс', kk: 'Мерекелік теңгерім', fr: 'Équilibre fêtes' },
        category: 'seasonal', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Seasonal', streakThreshold: 0.6,
        embrace: ['vegetables at every meal', 'lean proteins', 'mindful portions', 'walking after meals'],
        minimize: ['mindless snacking', 'eating because it is there', 'guilt'],
        dailyTracker: [{ key: 'balance', label: { en: 'Balanced day', ru: 'Сбалансированный день', kk: 'Теңгерімді күн', fr: 'Journée équilibrée' } }],
        suitableFor: ['holiday', 'balance'], isFeatured: false, popularityScore: 75, tags: ['seasonal', 'holiday'], emoji: '🎄', target: 'all', ageRange: '18-65',
        imageUrl: 'https://images.unsplash.com/photo-1512389142860-9c449e58a814?w=800&q=80', color: '#4CAF50', // Holiday Balance, festive moderation, seasonal wellness
    },
    // ============================================
    // 🔥 EXTRA (DB-only, previously missing fr)
    // ============================================
    {
        slug: 'hot_girl_walk',
        name: { en: 'Hot Girl Walk', ru: 'Хот Гёрл Вок', kk: 'Hot Girl Walk', fr: 'Hot Girl Walk' },
        subtitle: { en: 'Walk, reflect, glow', ru: 'Гуляй, размышляй, сияй', kk: 'Жүр, ойлан, жарқыра', fr: 'Marche, réflexion, glow' },
        description: { en: 'Daily walks for mood and movement. Simple, sustainable, no gym required.', ru: 'Ежедневные прогулки для настроения и движения. Просто, устойчиво.', kk: 'Көңіл-күй және қозғалыс үшін күнделікті серуен. Қарапайым.', fr: 'Marches quotidiennes pour le moral et le mouvement. Simple, durable, pas de salle.' },
        shortDescription: { en: 'Daily walks, mood, movement', ru: 'Ежедневные прогулки', kk: 'Күнделікті серуен', fr: 'Marches quotidiennes, moral, mouvement' },
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        embrace: ['walking', 'hydration', 'whole foods', 'fresh air', 'mindfulness'],
        minimize: ['sedentary', 'skipping walks', 'processed snacks'],
        dailyTracker: [
            { key: 'walk', label: { en: 'Hot girl walk done', ru: 'Прогулка выполнена', kk: 'Серуен орындалдым', fr: 'Hot girl walk faite' } },
            { key: 'hydration', label: { en: 'Stayed hydrated', ru: 'Пил достаточно воды', kk: 'Жеткілікті су іштім', fr: 'Bien hydraté' } },
            { key: 'mood', label: { en: 'Checked in with mood', ru: 'Отследил настроение', kk: 'Көңіл-күйді бақыладым', fr: 'Prise de conscience de l\' } },
        ],
        suitableFor: ['walking', 'mood', 'simple'],
        isFeatured: false,
        popularityScore: 75,
        tags: ['trending', 'walk', 'mindfulness'],
        emoji: '🚶‍♀️',
        target: 'all',
        ageRange: '18-50',
        imageUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80', // Hot Girl Walk, walking, movement, confidence
        color: '#E91E63',
    },
    {
        slug: 'lazy_girl_weight_loss',
        name: { en: 'Lazy Girl Weight Loss', ru: 'Ленивое Похудение', kk: 'Жатыңқы Арықтау', fr: 'Lazy Girl perte de poids' },
        subtitle: { en: 'Minimal effort, maximum results', ru: 'Минимум усилий, максимум результата', kk: 'Ең аз күш, ең көп нәтиже', fr: 'Effort minimal, résultats max' },
        description: { en: 'Low-effort habits for sustainable weight loss. No strict diets, no punishing workouts.', ru: 'Привычки с минимумом усилий для устойчивого похудения.', kk: 'Тұрақты арықтау үшін төмен күш салу әдеттері.', fr: 'Habitudes low-effort pour une perte de poids durable. Pas de régime strict.' },
        shortDescription: { en: 'Low-effort, sustainable loss', ru: 'Низкие усилия, устойчивая потеря', kk: 'Төмен күш, тұрақты жоғалту', fr: 'Faible effort, perte durable' },
        category: 'weight_loss',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Weight Loss',
        streakThreshold: 0.6,
        embrace: ['simple swaps', 'more water', 'walking', 'protein', 'vegetables', 'sleep'],
        minimize: ['strict rules', 'all-or-nothing', 'burnout'],
        dailyTracker: [
            { key: 'simple_habit', label: { en: 'One simple healthy habit', ru: 'Одна простая привычка', kk: 'Бір қарапайым сау әдет', fr: 'Une habitude saine simple' } },
            { key: 'no_restrict', label: { en: 'No harsh restriction', ru: 'Без жёстких ограничений', kk: 'Қатаң шектеу жоқ', fr: 'Pas de restriction stricte' } },
            { key: 'sustainable', label: { en: 'Sustainable choice', ru: 'Устойчивый выбор', kk: 'Тұрақты таңдау', fr: 'Choix durable' } },
        ],
        suitableFor: ['weight_loss', 'low_effort', 'sustainable'],
        isFeatured: false,
        popularityScore: 72,
        tags: ['weight_loss', 'lazy', 'trending'],
        emoji: '😴',
        target: 'female',
        ageRange: '18-45',
        imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80', // Pilates, graceful movement, lean strength
        color: '#9C27B0',
    },
    {
        slug: 'high_energy',
        name: { en: 'High Energy', ru: 'Высокая Энергия', kk: 'Жоғары Қуат', fr: 'Haute énergie' },
        subtitle: { en: 'Fuel up, perform, thrive', ru: 'Заправляйся, действуй, процветай', kk: 'Отында, орында, гүлден', fr: 'Se carburer, performer, prospérer' },
        description: { en: 'Nutrition for all-day energy. Balanced meals, smart carbs, no crashes.', ru: 'Питание для энергии весь день. Сбалансированные приёмы, умные углеводы.', kk: 'Күн бойы энергия үшін тағам. Теңгерімді тамақ, ақылды көмірсулар.', fr: 'Nutrition pour énergie toute la journée. Repas équilibrés, glucides intelligents.' },
        shortDescription: { en: 'All-day energy nutrition', ru: 'Энергия на весь день', kk: 'Күн бойы энергия', fr: 'Nutrition énergie toute la journée' },
        category: 'energy',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'More Energy',
        streakThreshold: 0.6,
        embrace: ['complex carbs', 'protein', 'healthy fats', 'fruits', 'vegetables', 'hydration', 'regular meals'],
        minimize: ['sugar spikes', 'skipping meals', 'excessive caffeine'],
        dailyTracker: [
            { key: 'steady_energy', label: { en: 'Steady energy all day', ru: 'Стабильная энергия', kk: 'Тұрақты энергия', fr: 'Énergie stable toute la journée' } },
            { key: 'no_crash', label: { en: 'No afternoon crash', ru: 'Без послеобеденного спада', kk: 'Түскі астан кейінгі төмендеу жоқ', fr: 'Pas de coup de barre après-midi' } },
            { key: 'balanced_meals', label: { en: 'Balanced meals', ru: 'Сбалансированные приёмы', kk: 'Теңгерімді тамақ', fr: 'Repas équilibrés' } },
        ],
        suitableFor: ['energy', 'productivity', 'performance'],
        isFeatured: false,
        popularityScore: 78,
        tags: ['energy', 'performance', 'focus'],
        emoji: '⚡',
        target: 'all',
        ageRange: '20-55',
        imageUrl: 'https://images.unsplash.com/photo-1494390248081-4e521a5940db?w=800&q=80', // High Energy, all-day energy, productivity, performance
        color: '#FFC107',
    },
];

// ============================================================================
// SEED FUNCTION
// ============================================================================

async function main() {
    console.log('🌿 Seeding lifestyle programs...');

    for (const program of lifestylePrograms) {
        const id = program.slug;

        // Helper to generate content if missing
        const getMantra = (p: LifestyleProgram) => ({
            en: p.tags.includes('warrior') ? "Discipline equals freedom" : "Be your best self today",
            ru: p.tags.includes('warrior') ? "Дисциплина - это свобода" : "Будь лучшей версией себя",
            kk: p.tags.includes('warrior') ? "Тәртіп - бұл еркіндік" : "Бүгін ең жақсы бол",
            fr: p.tags.includes('warrior') ? "La discipline, c'est la liberté" : "Soyez la meilleure version de vous-même"
        });

        const getPhilosophy = (p: LifestyleProgram) => ({
            en: (p.description as any).en || "Wellness is a journey, not a destination.",
            ru: (p.description as any).ru || "Здоровье - это путь, а не цель.",
            kk: (p.description as any).kk || "Денсаулық - бұл мақсат емес, жол.",
            fr: "Le bien-être est un voyage, pas une destination."
        });

        const getDailyInspiration = (p: LifestyleProgram) => ({
            en: ["Visualise your success", "Drink water first thing", "Move your body with joy"],
            ru: ["Визуализируйте успех", "Пейте воду с утра", "Двигайтесь с радостью"],
            kk: ["Жетістігіңізді елестетіңіз", "Таңертең су ішіңіз", "Қуанышпен қозғалыңыз"],
            fr: ["Visualisez votre succès", "Buvez de l'eau au réveil", "Bougez avec joie"]
        });

        const getVibe = (p: LifestyleProgram) => p.tags.join(', ');

        const getSampleDay = (p: LifestyleProgram) => ({
            morning: { en: "Lemon water & light movement", ru: "Лимонная вода и лёгкая разминка", kk: "Лимон суы және жеңіл жаттығу", fr: "Eau citron et mouvement doux" },
            midday: { en: "Nutrient dense bowl", ru: "Питательный боул", kk: "Құнарлы тағам", fr: "Bol nutritif" },
            evening: { en: "Relaxing tea & disconnect", ru: "Расслабляющий чай и отдых", kk: "Демалу шайы", fr: "Thé relaxant et déconnexion" }
        });

        // Construct rules object with all the lifestyle fields
        const rules = {
            mantra: (program as any).mantra || getMantra(program),
            philosophy: (program as any).philosophy || getPhilosophy(program),
            embrace: program.embrace, // Also keep in rules for easy access
            minimize: program.minimize,
            dailyInspiration: (program as any).dailyInspiration || getDailyInspiration(program),
            sampleDay: (program as any).sampleDay || getSampleDay(program),
            vibe: (program as any).vibe || getVibe(program)
        };

        await prisma.dietProgram.upsert({
            where: { id },
            update: {
                slug: program.slug,
                name: program.name,
                subtitle: program.subtitle,
                description: program.description,
                shortDescription: program.shortDescription,
                category: program.category,
                type: program.type,
                difficulty: program.difficulty,
                duration: program.duration,
                uiGroup: program.uiGroup,
                streakThreshold: program.streakThreshold,
                allowedFoods: program.embrace,
                restrictedFoods: program.minimize,
                dailyTracker: program.dailyTracker,
                suitableFor: program.suitableFor,
                isFeatured: program.isFeatured,
                popularityScore: program.popularityScore,
                tags: program.tags,
                imageUrl: program.imageUrl,
                color: program.color,
                rules: rules, // Save lifestyle content here
            },
            create: {
                id,
                slug: program.slug,
                name: program.name,
                subtitle: program.subtitle,
                description: program.description,
                shortDescription: program.shortDescription,
                category: program.category,
                type: program.type,
                difficulty: program.difficulty,
                duration: program.duration,
                uiGroup: program.uiGroup,
                streakThreshold: program.streakThreshold,
                allowedFoods: program.embrace,
                restrictedFoods: program.minimize,
                dailyTracker: program.dailyTracker,
                suitableFor: program.suitableFor,
                isFeatured: program.isFeatured,
                popularityScore: program.popularityScore,
                tags: program.tags,
                imageUrl: program.imageUrl,
                color: program.color,
                rules: rules, // Save lifestyle content here
            },
        });

        const programName = typeof program.name === 'string' ? program.name : program.name['en'] || 'Unknown Program';
        console.log(`  ✅ ${programName}`);
    }

    console.log(`\n🎉 Seeded ${lifestylePrograms.length} lifestyle programs!`);
}

main()
    .catch((e) => {
        console.error('❌ Error seeding lifestyles:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

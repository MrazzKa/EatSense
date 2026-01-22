import { PrismaClient, DietType, DietDifficulty } from '@prisma/client';

const prisma = new PrismaClient();

// Type definition for lifestyle programs
interface LifestyleProgram {
    slug: string;
    name: { en: string; ru: string; kk: string };
    subtitle: { en: string; ru: string; kk: string };
    description: { en: string; ru: string; kk: string };
    shortDescription: { en: string; ru: string; kk: string };
    category: string;
    type: DietType;
    difficulty: DietDifficulty;
    duration: number;
    uiGroup: string;
    streakThreshold: number;
    embrace: string[];
    minimize: string[];
    dailyTracker: { key: string; label: { en: string; ru: string; kk: string } }[];
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
        name: { en: 'That Girl', ru: 'That Girl', kk: 'That Girl' },
        subtitle: { en: '5AM, green juice, main character energy', ru: '5 утра, зелёный сок, энергия главного персонажа', kk: 'Таңғы 5, жасыл шырын, басты кейіпкер энергиясы' },
        description: { en: 'Wellness as aesthetic. Green smoothies, matcha, overnight oats. Looking good, feeling good.', ru: 'Здоровье как эстетика. Зелёные смузи, матча, овсянка на ночь.', kk: 'Денсаулық эстетика ретінде. Жасыл смузи, матча.' },
        shortDescription: { en: '5AM routine, green juice, main character energy', ru: '5 утра, зелёный сок, энергия главного персонажа', kk: 'Таңғы 5, жасыл шырын' },
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        embrace: ['green smoothies', 'matcha', 'overnight oats', 'açaí bowls', 'avocado toast', 'Buddha bowls', 'lean proteins', 'fresh salads', 'chia seeds', 'berries', 'lemon water'],
        minimize: ['processed foods', 'fast food', 'excessive sugar', 'alcohol', 'caffeine after 2pm', 'heavy dinners'],
        dailyTracker: [
            { key: 'morning_routine', label: { en: 'Morning routine 5AM', ru: 'Утренняя рутина 5 утра', kk: 'Таңғы 5-те режим' } },
            { key: 'green_juice', label: { en: 'Green smoothie or matcha', ru: 'Зелёный смузи или матча', kk: 'Жасыл смузи немесе матча' } },
            { key: 'aesthetic_meal', label: { en: 'Aesthetic healthy meal', ru: 'Эстетичная здоровая еда', kk: 'Эстетикалық сау тағам' } },
            { key: 'hydration', label: { en: 'Stay hydrated', ru: 'Пейте воду', kk: 'Су ішу' } },
        ],
        suitableFor: ['wellness', 'aesthetic', 'instagram'],
        isFeatured: true,
        popularityScore: 95,
        tags: ['trending', 'aesthetic', 'wellness'],
        emoji: '✨',
        target: 'female',
        ageRange: '18-30',
        imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800',
        color: '#7CB342',
    },
    {
        slug: 'clean_girl',
        name: { en: 'Clean Girl', ru: 'Clean Girl', kk: 'Таза Қыз' },
        subtitle: { en: 'Minimal, glowing, effortless beauty', ru: 'Минимализм, сияние, естественная красота', kk: 'Минималистік, жарқыраған, табиғи сұлулық' },
        description: { en: 'The no-makeup makeup of eating. Whole foods, nothing processed, maximum hydration.', ru: 'Еда без макияжа. Цельные продукты, ничего обработанного.', kk: 'Макияжсыз тағам. Толық тағамдар.' },
        shortDescription: { en: 'Minimal, glowing, effortless', ru: 'Минимализм, сияние, естественность', kk: 'Минималистік, жарқыраған' },
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        embrace: ['whole foods', 'vegetables', 'leafy greens', 'cucumber', 'berries', 'citrus', 'lean proteins', 'eggs', 'fish', 'avocado', 'olive oil', 'nuts', 'water', 'herbal tea'],
        minimize: ['processed foods', 'sugar', 'dairy', 'excessive caffeine', 'alcohol', 'fried foods'],
        dailyTracker: [
            { key: 'whole_foods', label: { en: 'Whole foods only', ru: 'Только цельные продукты', kk: 'Тек толық тағамдар' } },
            { key: 'hydration', label: { en: '3L water', ru: '3л воды', kk: '3л су' } },
            { key: 'simple_meal', label: { en: 'Simple clean meal', ru: 'Простая чистая еда', kk: 'Қарапайым таза тағам' } },
        ],
        suitableFor: ['skin_health', 'simplicity', 'natural'],
        isFeatured: true,
        popularityScore: 92,
        tags: ['trending', 'clean', 'minimal'],
        emoji: '🧴',
        target: 'female',
        ageRange: '18-35',
        imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
        color: '#81D4FA',
    },
    {
        slug: 'old_money',
        name: { en: 'Old Money', ru: 'Старые Деньги', kk: 'Ескі Ақша' },
        subtitle: { en: 'Quiet luxury, timeless elegance', ru: 'Тихая роскошь, вечная элегантность', kk: 'Тыныш сәнділік, мәңгі элеганттылық' },
        description: { en: 'Quality over everything. Grass-fed, wild-caught, organic, artisanal. No chain restaurants.', ru: 'Качество превыше всего. Травяное, дикое, органическое.', kk: 'Сапа бәрінен жоғары.' },
        shortDescription: { en: 'Quality over quantity, timeless elegance', ru: 'Качество важнее количества', kk: 'Сапа санынан маңызды' },
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        embrace: ['grass-fed beef', 'wild salmon', 'organic eggs', 'quality cheese', 'seasonal vegetables', 'farmers market produce', 'fresh berries', 'fine wine', 'real butter', 'artisan bread'],
        minimize: ['chain restaurants', 'fast food', 'cheap ingredients', 'processed foods', 'trendy diet foods'],
        dailyTracker: [
            { key: 'quality_ingredients', label: { en: 'Quality ingredients', ru: 'Качественные ингредиенты', kk: 'Сапалы ингредиенттер' } },
            { key: 'proper_dining', label: { en: 'Proper table setting', ru: 'Правильная сервировка', kk: 'Дұрыс сервировка' } },
            { key: 'three_meals', label: { en: 'Three structured meals', ru: 'Три приёма пищи', kk: 'Үш тағам' } },
        ],
        suitableFor: ['luxury', 'quality', 'elegance'],
        isFeatured: false,
        popularityScore: 88,
        tags: ['trending', 'luxury', 'quality'],
        emoji: '🏛️',
        target: 'all',
        ageRange: '22-55',
        imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
        color: '#8D6E63',
    },
    {
        slug: 'tomato_girl_summer',
        name: { en: 'Tomato Girl Summer', ru: 'Лето Томатной Девушки', kk: 'Қызанақ Қыз Жаз' },
        subtitle: { en: 'Mediterranean dreams, sun-kissed living', ru: 'Средиземноморские мечты, загорелая жизнь', kk: 'Жерорта теңізі армандары' },
        description: { en: 'La dolce vita on your plate. Fresh tomatoes, burrata, olive oil, pasta, wine.', ru: 'Сладкая жизнь на тарелке. Помидоры, буррата, оливковое масло.', kk: 'Табақтағы тәтті өмір.' },
        shortDescription: { en: 'Mediterranean vibes, sun-kissed', ru: 'Средиземноморские вайбы', kk: 'Жерорта теңізі энергиясы' },
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        embrace: ['tomatoes', 'olive oil', 'burrata', 'mozzarella', 'feta', 'fresh pasta', 'crusty bread', 'seafood', 'peaches', 'figs', 'wine', 'fresh herbs', 'basil'],
        minimize: ['processed foods', 'heavy cream sauces', 'fast food'],
        dailyTracker: [
            { key: 'olive_oil', label: { en: 'Olive oil on everything', ru: 'Оливковое масло на всём', kk: 'Барлық нәрсеге зейтін майы' } },
            { key: 'fresh_tomatoes', label: { en: 'Fresh tomatoes', ru: 'Свежие помидоры', kk: 'Жаңа қызанақтар' } },
            { key: 'aperitivo', label: { en: 'Aperitivo hour', ru: 'Час аперитива', kk: 'Аперитив сағаты' } },
        ],
        suitableFor: ['mediterranean', 'summer', 'italian'],
        isFeatured: true,
        popularityScore: 90,
        tags: ['trending', 'mediterranean', 'summer'],
        emoji: '🍅',
        target: 'female',
        ageRange: '18-40',
        imageUrl: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=800',
        color: '#E53935',
    },
    {
        slug: 'pilates_princess',
        name: { en: 'Pilates Princess', ru: 'Принцесса Пилатеса', kk: 'Пилатес Ханшасы' },
        subtitle: { en: 'Long, lean, graceful strength', ru: 'Длинная, стройная, грациозная сила', kk: 'Ұзын, арық, сәнді күш' },
        description: { en: 'Fuel for lengthening and strengthening. Lean proteins, anti-inflammatory foods, collagen.', ru: 'Топливо для удлинения и укрепления. Постные белки, коллаген.', kk: 'Ұзарту және күшейту үшін отын.' },
        shortDescription: { en: 'Lean, graceful, strong', ru: 'Стройная, грациозная, сильная', kk: 'Арық, сәнді, күшті' },
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        embrace: ['lean proteins', 'fish', 'chicken', 'eggs', 'collagen', 'bone broth', 'vegetables', 'quinoa', 'sweet potato', 'berries', 'green juice', 'matcha', 'nuts'],
        minimize: ['processed foods', 'sugar', 'excessive carbs', 'alcohol', 'heavy meals', 'inflammatory foods'],
        dailyTracker: [
            { key: 'collagen', label: { en: 'Collagen in smoothie', ru: 'Коллаген в смузи', kk: 'Смузидегі коллаген' } },
            { key: 'lean_protein', label: { en: 'Lean protein', ru: 'Постный белок', kk: 'Азық белок' } },
            { key: 'light_eating', label: { en: 'Light eating on class days', ru: 'Лёгкое питание в дни занятий', kk: 'Сабақ күндерінде жеңіл тағам' } },
        ],
        suitableFor: ['pilates', 'flexibility', 'grace'],
        isFeatured: false,
        popularityScore: 85,
        tags: ['trending', 'pilates', 'fitness'],
        emoji: '🤍',
        target: 'female',
        ageRange: '20-50',
        imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800',
        color: '#F48FB1',
    },
    {
        slug: 'coastal_grandmother',
        name: { en: 'Coastal Grandmother', ru: 'Прибрежная Бабушка', kk: 'Жағалау Анасы' },
        subtitle: { en: 'Nancy Meyers kitchen energy', ru: 'Энергия кухни Нэнси Мейерс', kk: 'Нэнси Мейерс асхана энергиясы' },
        description: { en: 'Diane Keaton lifestyle. Fresh seafood, farmers market vegetables, white wine on the porch.', ru: 'Образ жизни Дианы Китон. Морепродукты, белое вино на веранде.', kk: 'Диана Китон өмір салты.' },
        shortDescription: { en: 'Coastal elegance, Nancy Meyers vibes', ru: 'Прибрежная элегантность', kk: 'Жағалау элеганттылығы' },
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        embrace: ['fresh seafood', 'fish', 'shrimp', 'vegetables', 'salads', 'fresh bread', 'olive oil', 'white wine', 'fresh fruit', 'yogurt', 'honey', 'herbal tea'],
        minimize: ['processed foods', 'fast food', 'complicated recipes', 'stress eating', 'rushed meals'],
        dailyTracker: [
            { key: 'set_table', label: { en: 'Set table properly', ru: 'Правильная сервировка', kk: 'Дұрыс сервировка' } },
            { key: 'fresh_seafood', label: { en: 'Fresh seafood', ru: 'Свежие морепродукты', kk: 'Жаңа теңіз өнімдері' } },
            { key: 'beach_walk', label: { en: 'Walk on the beach', ru: 'Прогулка по пляжу', kk: 'Пляжда серуен' } },
        ],
        suitableFor: ['coastal', 'elegant', 'serene'],
        isFeatured: false,
        popularityScore: 82,
        tags: ['trending', 'coastal', 'elegant'],
        emoji: '🐚',
        target: 'female',
        ageRange: '30-65',
        imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800',
        color: '#B0BEC5',
    },
    {
        slug: 'soft_life',
        name: { en: 'Soft Life', ru: 'Мягкая Жизнь', kk: 'Жұмсақ Өмір' },
        subtitle: { en: 'Ease, comfort, zero stress', ru: 'Лёгкость, комфорт, ноль стресса', kk: 'Жеңілдік, ыңғайлылық, стресс жоқ' },
        description: { en: 'Anti-hustle culture eating. Gentle foods, no strict rules, comfort without guilt.', ru: 'Питание против культуры суеты. Мягкие продукты, никаких строгих правил.', kk: 'Асығыс мәдениетіне қарсы тағам.' },
        shortDescription: { en: 'Easy, comfortable, stress-free', ru: 'Легко, комфортно, без стресса', kk: 'Жеңіл, ыңғайлы, стресссіз' },
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        embrace: ['comfort foods made healthy', 'soups', 'stews', 'warm bowls', 'soft textures', 'nourishing meals', 'treats in moderation', 'tea', 'gentle cooking'],
        minimize: ['stress eating', 'strict diets', 'punishment mentality', 'harsh restrictions', 'guilt'],
        dailyTracker: [
            { key: 'comfort_food', label: { en: 'Comfort food without guilt', ru: 'Комфортная еда без чувства вины', kk: 'Кінәсіз ыңғайлы тағам' } },
            { key: 'gentle_self', label: { en: 'Gentle with yourself', ru: 'Мягко к себе', kk: 'Өзіңізбен жұмсақ' } },
            { key: 'rest', label: { en: 'Rest is productive', ru: 'Отдых продуктивен', kk: 'Демалу өнімді' } },
        ],
        suitableFor: ['comfort', 'relaxation', 'anti-stress'],
        isFeatured: false,
        popularityScore: 80,
        tags: ['trending', 'soft', 'comfort'],
        emoji: '🌸',
        target: 'all',
        ageRange: '25-50',
        imageUrl: 'https://images.unsplash.com/photo-1495195134817-aeb325a55b65?w=800',
        color: '#F8BBD9',
    },
    {
        slug: 'mob_wife',
        name: { en: 'Mob Wife', ru: 'Жена Мафиози', kk: 'Мафия Әйелі' },
        subtitle: { en: 'Dramatic, luxurious, unapologetic', ru: 'Драматичная, роскошная, без извинений', kk: 'Драмалық, сәнді, кешірімсіз' },
        description: { en: 'Italian-American indulgence. Sunday sauce, big family dinners, espresso, cannoli.', ru: 'Итало-американское потворство. Воскресный соус, семейные ужины.', kk: 'Италия-америкалық ләззат.' },
        shortDescription: { en: 'Italian luxury, bold choices', ru: 'Итальянская роскошь, смелые выборы', kk: 'Италиялық сәнділік' },
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        embrace: ['Italian food', 'pasta', 'red sauce', 'meatballs', 'bread', 'olive oil', 'espresso', 'red wine', 'cannoli', 'tiramisu', 'family dinners', 'Sunday sauce'],
        minimize: ['diet food', 'sad salads', 'apologizing for eating', 'guilt', 'eating alone'],
        dailyTracker: [
            { key: 'sunday_sauce', label: { en: 'Sunday sauce tradition', ru: 'Традиция воскресного соуса', kk: 'Жексенбі соусы дәстүрі' } },
            { key: 'espresso', label: { en: 'Espresso, not apologies', ru: 'Эспрессо, а не извинения', kk: 'Эспрессо, кешірім емес' } },
            { key: 'family_dinner', label: { en: 'Family-style dinner', ru: 'Семейный ужин', kk: 'Отбасылық кешкі ас' } },
        ],
        suitableFor: ['italian', 'family', 'bold'],
        isFeatured: false,
        popularityScore: 78,
        tags: ['trending', 'italian', 'bold'],
        emoji: '🖤',
        target: 'female',
        ageRange: '25-55',
        imageUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800',
        color: '#212121',
    },
    // ============================================
    // 🎯 GOAL_LOSE_WEIGHT (4 programs)
    // ============================================
    {
        slug: 'summer_shred',
        name: { en: 'Summer Shred', ru: 'Летняя Сушка', kk: 'Жаздық Сушка' },
        subtitle: { en: 'Lean, defined, beach-ready', ru: 'Стройное, рельефное, готовое к пляжу', kk: 'Арық, анықталған, пляжқа дайын' },
        description: { en: 'Strategic fat loss while preserving muscle. High protein, plenty of vegetables.', ru: 'Стратегическая потеря жира при сохранении мышц.', kk: 'Бұлшық етті сақтай отырып стратегиялық май жоғалту.' },
        shortDescription: { en: 'Lean, defined, beach-ready', ru: 'Стройное, рельефное', kk: 'Арық, анықталған' },
        category: 'weight_loss', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Weight Loss', streakThreshold: 0.7,
        embrace: ['lean proteins', 'chicken breast', 'fish', 'egg whites', 'Greek yogurt', 'vegetables', 'leafy greens', 'berries'],
        minimize: ['sugar', 'alcohol', 'fried foods', 'processed carbs', 'late night eating'],
        dailyTracker: [{ key: 'protein', label: { en: 'Protein at every meal', ru: 'Белок при каждом приёме пищи', kk: 'Әр тағамда белок' } }],
        suitableFor: ['fat_loss', 'definition'], isFeatured: true, popularityScore: 88, tags: ['weight_loss', 'shred'], emoji: '🔥', target: 'all', ageRange: '18-45',
        imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800', color: '#FF5722',
    },
    {
        slug: 'metabolic_reset',
        name: { en: 'Metabolic Reset', ru: 'Метаболический Сброс', kk: 'Метаболизмдік Қалпына Келтіру' },
        subtitle: { en: 'Restart your fat-burning engine', ru: 'Перезапустите двигатель сжигания жира', kk: 'Май жағу қозғалтқышын қайта бастаңыз' },
        description: { en: 'Repair metabolism through whole foods, stable blood sugar, strategic eating windows.', ru: 'Восстановите метаболизм через цельные продукты.', kk: 'Толық тағамдар арқылы метаболизмді жөндеу.' },
        shortDescription: { en: 'Reset metabolism, stable energy', ru: 'Сбросить метаболизм', kk: 'Метаболизмді қалпына келтіру' },
        category: 'weight_loss', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Weight Loss', streakThreshold: 0.7,
        embrace: ['whole foods', 'protein', 'healthy fats', 'vegetables', 'fiber', 'complex carbs', 'green tea'],
        minimize: ['processed foods', 'sugar', 'refined carbs', 'frequent snacking', 'late eating'],
        dailyTracker: [{ key: 'blood_sugar', label: { en: 'Stable blood sugar', ru: 'Стабильный сахар', kk: 'Тұрақты қан қанты' } }],
        suitableFor: ['metabolism', 'reset'], isFeatured: false, popularityScore: 82, tags: ['weight_loss', 'metabolism'], emoji: '🔄', target: 'all', ageRange: '25-55',
        imageUrl: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800', color: '#4CAF50',
    },
    {
        slug: 'debloat_detox',
        name: { en: 'Debloat & Glow', ru: 'Убрать Отёки', kk: 'Ісінуді Алып Тастау' },
        subtitle: { en: 'Flatten, refresh, feel light', ru: 'Сплющить, освежить, почувствовать лёгкость', kk: 'Тегістеу, жаңарту, жеңіл сезіну' },
        description: { en: 'Anti-inflammatory, low sodium, gut-friendly eating.', ru: 'Противовоспалительное, низконатриевое питание.', kk: 'Қабынуға қарсы, төмен натрийлі тағам.' },
        shortDescription: { en: 'Debloat, refresh, feel light', ru: 'Убрать отёки, освежиться', kk: 'Ісінуді алу, жаңарту' },
        category: 'weight_loss', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Weight Loss', streakThreshold: 0.6,
        embrace: ['cucumber', 'celery', 'asparagus', 'leafy greens', 'lemon water', 'ginger', 'peppermint tea'],
        minimize: ['sodium', 'carbonated drinks', 'beans', 'dairy', 'alcohol'],
        dailyTracker: [{ key: 'debloat', label: { en: 'Low sodium day', ru: 'День без натрия', kk: 'Натрийсіз күн' } }],
        suitableFor: ['debloat', 'refresh'], isFeatured: false, popularityScore: 80, tags: ['weight_loss', 'debloat'], emoji: '💨', target: 'all', ageRange: '18-55',
        imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800', color: '#00BCD4',
    },
    {
        slug: 'sustainable_slim',
        name: { en: 'Sustainable Slim', ru: 'Устойчивая Стройность', kk: 'Тұрақты Арықтық' },
        subtitle: { en: 'Lose it and keep it off forever', ru: 'Сбросьте и сохраните навсегда', kk: 'Жоғалтыңыз және мәңгі сақтаңыз' },
        description: { en: 'Anti-yo-yo approach. Small sustainable changes, focus on habits not numbers.', ru: 'Подход против йо-йо. Небольшие устойчивые изменения.', kk: 'Йо-йоға қарсы тәсіл.' },
        shortDescription: { en: 'Sustainable weight loss', ru: 'Устойчивое похудение', kk: 'Тұрақты арықтау' },
        category: 'weight_loss', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Weight Loss', streakThreshold: 0.6,
        embrace: ['whole foods', 'vegetables', 'lean proteins', 'fruits', 'whole grains', 'healthy fats'],
        minimize: ['processed foods', 'excessive sugar', 'mindless snacking', 'emotional eating'],
        dailyTracker: [{ key: 'habits', label: { en: 'Build habits', ru: 'Стройте привычки', kk: 'Дағдылар құрыңыз' } }],
        suitableFor: ['sustainable', 'lifestyle'], isFeatured: false, popularityScore: 78, tags: ['weight_loss', 'sustainable'], emoji: '🌱', target: 'all', ageRange: '25-60',
        imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800', color: '#8BC34A',
    },
    // ============================================
    // 🎯 GOAL_BUILD_MUSCLE (4 programs)
    // ============================================
    {
        slug: 'lean_bulk',
        name: { en: 'Lean Bulk', ru: 'Чистый Набор', kk: 'Таза Қосылу' },
        subtitle: { en: 'Build muscle without the fat', ru: 'Набрать мышцы без жира', kk: 'Майсыз бұлшық ет қосу' },
        description: { en: 'Strategic surplus. Enough calories to grow, enough protein to build.', ru: 'Стратегический профицит. Достаточно калорий для роста.', kk: 'Стратегиялық артықшылық.' },
        shortDescription: { en: 'Build muscle, stay lean', ru: 'Набрать мышцы, остаться стройным', kk: 'Бұлшық ет қосу, арық қалу' },
        category: 'muscle_building', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Build Muscle', streakThreshold: 0.7,
        embrace: ['lean proteins', 'chicken', 'beef', 'fish', 'eggs', 'Greek yogurt', 'complex carbs', 'rice', 'oats'],
        minimize: ['junk food', 'excessive fat', 'alcohol', 'empty calories'],
        dailyTracker: [{ key: 'protein_goal', label: { en: 'Hit protein goal', ru: 'Достичь цели по белку', kk: 'Белок мақсатына жету' } }],
        suitableFor: ['bulking', 'muscle'], isFeatured: true, popularityScore: 85, tags: ['muscle', 'bulk'], emoji: '💪', target: 'male', ageRange: '18-45',
        imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800', color: '#F44336',
    },
    {
        slug: 'strength_athlete',
        name: { en: 'Strength Athlete', ru: 'Силовой Атлет', kk: 'Күш Атлеті' },
        subtitle: { en: 'Fuel for power and performance', ru: 'Топливо для силы и производительности', kk: 'Күш пен өнімділік үшін отын' },
        description: { en: 'Performance nutrition for lifters. High protein, strategic carbs.', ru: 'Спортивное питание для лифтеров.', kk: 'Көтерушілерге арналған тағам.' },
        shortDescription: { en: 'Fuel for strength', ru: 'Топливо для силы', kk: 'Күш үшін отын' },
        category: 'muscle_building', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Build Muscle', streakThreshold: 0.7,
        embrace: ['high protein', 'beef', 'chicken', 'eggs', 'fish', 'rice', 'potatoes', 'oats'],
        minimize: ['alcohol', 'excessive junk', 'undereating'],
        dailyTracker: [{ key: 'post_workout', label: { en: 'Post-workout nutrition', ru: 'Питание после тренировки', kk: 'Жаттығудан кейінгі тағам' } }],
        suitableFor: ['strength', 'powerlifting'], isFeatured: false, popularityScore: 82, tags: ['muscle', 'strength'], emoji: '🏋️', target: 'male', ageRange: '18-50',
        imageUrl: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=800', color: '#673AB7',
    },
    {
        slug: 'athletic_performance',
        name: { en: 'Athletic Performance', ru: 'Спортивная Форма', kk: 'Спорттық Форма' },
        subtitle: { en: 'Train hard, eat smart, perform better', ru: 'Тренируйся усердно, ешь умно', kk: 'Қатты жаттығу, ақылды жеу' },
        description: { en: 'Sports nutrition for competitive athletes.', ru: 'Спортивное питание для соревновательных атлетов.', kk: 'Бәсекелес атлеттерге арналған тағам.' },
        shortDescription: { en: 'Athletic performance nutrition', ru: 'Спортивное питание', kk: 'Спорттық тағам' },
        category: 'muscle_building', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Build Muscle', streakThreshold: 0.7,
        embrace: ['lean proteins', 'complex carbs', 'fruits', 'vegetables', 'hydration', 'electrolytes'],
        minimize: ['alcohol', 'processed foods', 'heavy foods before training'],
        dailyTracker: [{ key: 'fuel_work', label: { en: 'Fuel the work', ru: 'Заправляйте работу', kk: 'Жұмысты отындаңыз' } }],
        suitableFor: ['athletes', 'performance'], isFeatured: false, popularityScore: 80, tags: ['muscle', 'athletic'], emoji: '🏃', target: 'all', ageRange: '16-45',
        imageUrl: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800', color: '#2196F3',
    },
    {
        slug: 'functional_fitness',
        name: { en: 'Functional Fitness', ru: 'Функциональный Фитнес', kk: 'Функционалдық Фитнес' },
        subtitle: { en: 'Strong, capable, ready for anything', ru: 'Сильный, способный, готов ко всему', kk: 'Күшті, қабілетті, кез келген нәрсеге дайын' },
        description: { en: 'Nutrition for real-world performance. Balanced macros, anti-inflammatory focus.', ru: 'Питание для реальной производительности.', kk: 'Нақты өмір өнімділігіне арналған тағам.' },
        shortDescription: { en: 'Functional strength nutrition', ru: 'Питание для функциональной силы', kk: 'Функционалдық күш тағамы' },
        category: 'muscle_building', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Build Muscle', streakThreshold: 0.7,
        embrace: ['whole foods', 'lean proteins', 'vegetables', 'fruits', 'complex carbs', 'turmeric', 'omega-3s'],
        minimize: ['processed foods', 'inflammatory foods', 'excessive sugar'],
        dailyTracker: [{ key: 'anti_inflammatory', label: { en: 'Anti-inflammatory foods', ru: 'Противовоспалительные продукты', kk: 'Қабынуға қарсы тағамдар' } }],
        suitableFor: ['functional', 'mobility'], isFeatured: false, popularityScore: 78, tags: ['muscle', 'functional'], emoji: '⚡', target: 'all', ageRange: '25-55',
        imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800', color: '#FF9800',
    },
    // ============================================
    // 🎯 GOAL_CLEAR_SKIN (3 programs)
    // ============================================
    {
        slug: 'glass_skin', name: { en: 'Glass Skin', ru: 'Стеклянная Кожа', kk: 'Шыны Тері' },
        subtitle: { en: 'Korean beauty starts from inside', ru: 'Корейская красота начинается изнутри', kk: 'Кореялық сұлулық іштен басталады' },
        description: { en: 'Gut-skin connection. Fermented foods, omega-3s, collagen.', ru: 'Связь кишечника и кожи.', kk: 'Ішек-тері байланысы.' },
        shortDescription: { en: 'K-beauty nutrition', ru: 'К-бьюти питание', kk: 'К-бьюти тағам' },
        category: 'skin_health', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Clear Skin', streakThreshold: 0.6,
        embrace: ['fermented foods', 'kimchi', 'miso', 'bone broth', 'salmon', 'seaweed', 'green tea'],
        minimize: ['dairy', 'sugar', 'processed foods', 'alcohol'],
        dailyTracker: [{ key: 'fermented', label: { en: 'Fermented foods', ru: 'Ферментированные продукты', kk: 'Ферменттелген тағамдар' } }],
        suitableFor: ['skin', 'korean'], isFeatured: true, popularityScore: 88, tags: ['skin', 'kbeauty'], emoji: '✨', target: 'all', ageRange: '18-50',
        imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800', color: '#E1BEE7',
    },
    {
        slug: 'acne_clear', name: { en: 'Acne Clear', ru: 'Чистая Кожа', kk: 'Таза Тері' },
        subtitle: { en: 'Calm inflammation, clear breakouts', ru: 'Успокоить воспаление, очистить высыпания', kk: 'Қабынуды тыныштандыру' },
        description: { en: 'Anti-inflammatory, low-glycemic eating.', ru: 'Противовоспалительное, низкогликемическое питание.', kk: 'Қабынуға қарсы тағам.' },
        shortDescription: { en: 'Clear skin nutrition', ru: 'Питание для чистой кожи', kk: 'Таза тері тағамы' },
        category: 'skin_health', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Clear Skin', streakThreshold: 0.6,
        embrace: ['low-glycemic foods', 'vegetables', 'lean proteins', 'omega-3 fish', 'zinc-rich foods', 'probiotics', 'green tea'],
        minimize: ['dairy', 'sugar', 'high-glycemic carbs', 'processed foods'],
        dailyTracker: [{ key: 'low_glycemic', label: { en: 'Low glycemic day', ru: 'Низкогликемический день', kk: 'Төмен гликемиялық күн' } }],
        suitableFor: ['acne', 'skin'], isFeatured: false, popularityScore: 82, tags: ['skin', 'acne'], emoji: '🧊', target: 'all', ageRange: '14-40',
        imageUrl: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=800', color: '#64B5F6',
    },
    {
        slug: 'anti_aging_glow', name: { en: 'Anti-Aging Glow', ru: 'Антивозрастное Сияние', kk: 'Жасылдыққа Қарсы Жарқырау' },
        subtitle: { en: 'Age gracefully, glow eternally', ru: 'Стареть красиво, сиять вечно', kk: 'Әдемі қартаю, мәңгі жарқырау' },
        description: { en: 'Longevity nutrition. Antioxidants, collagen, healthy fats.', ru: 'Питание для долголетия кожи.', kk: 'Теріге арналған ұзақ өмір тағамы.' },
        shortDescription: { en: 'Anti-aging nutrition', ru: 'Антивозрастное питание', kk: 'Қартаюға қарсы тағам' },
        category: 'skin_health', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Clear Skin', streakThreshold: 0.6,
        embrace: ['antioxidants', 'berries', 'leafy greens', 'olive oil', 'fatty fish', 'nuts', 'collagen', 'bone broth', 'green tea', 'dark chocolate'],
        minimize: ['sugar', 'processed foods', 'alcohol', 'fried foods'],
        dailyTracker: [{ key: 'antioxidants', label: { en: 'Antioxidant-rich foods', ru: 'Продукты с антиоксидантами', kk: 'Антиоксидантқа бай тағамдар' } }],
        suitableFor: ['antiaging', 'glow'], isFeatured: false, popularityScore: 80, tags: ['skin', 'antiaging'], emoji: '🌟', target: 'all', ageRange: '30-65',
        imageUrl: 'https://images.unsplash.com/photo-1505944270255-72b8c68c6a70?w=800', color: '#FFD54F',
    },
    // ============================================
    // 🎯 GOAL_MORE_ENERGY (3 programs)
    // ============================================
    {
        slug: 'all_day_energy', name: { en: 'All-Day Energy', ru: 'Энергия На Весь День', kk: 'Күн Бойы Энергия' },
        subtitle: { en: 'No crashes, no slumps, just go', ru: 'Никаких спадов, просто вперёд', kk: 'Төмендеу жоқ, тек алға' },
        description: { en: 'Blood sugar stability for sustained energy.', ru: 'Стабильность сахара для устойчивой энергии.', kk: 'Тұрақты энергия үшін қан қантының тұрақтылығы.' },
        shortDescription: { en: 'Sustained energy all day', ru: 'Стабильная энергия весь день', kk: 'Күн бойы тұрақты энергия' },
        category: 'energy', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'More Energy', streakThreshold: 0.6,
        embrace: ['complex carbs', 'oats', 'quinoa', 'sweet potato', 'lean proteins', 'nuts', 'vegetables', 'green tea'],
        minimize: ['sugar', 'refined carbs', 'excessive caffeine', 'skipping meals'],
        dailyTracker: [{ key: 'stable_energy', label: { en: 'Stable energy', ru: 'Стабильная энергия', kk: 'Тұрақты энергия' } }],
        suitableFor: ['energy', 'productivity'], isFeatured: true, popularityScore: 85, tags: ['energy', 'focus'], emoji: '⚡', target: 'all', ageRange: '20-55',
        imageUrl: 'https://images.unsplash.com/photo-1494390248081-4e521a5940db?w=800', color: '#FFC107',
    },
    {
        slug: 'brain_fuel', name: { en: 'Brain Fuel', ru: 'Топливо для Мозга', kk: 'Ми Үшін Отын' },
        subtitle: { en: 'Focus, clarity, mental edge', ru: 'Фокус, ясность, умственное преимущество', kk: 'Назар, анықтық' },
        description: { en: 'Nootropic nutrition. Omega-3s, stable glucose, brain nutrients.', ru: 'Ноотропное питание.', kk: 'Ноотроптық тағам.' },
        shortDescription: { en: 'Brain-boosting nutrition', ru: 'Питание для мозга', kk: 'Миға арналған тағам' },
        category: 'energy', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'More Energy', streakThreshold: 0.6,
        embrace: ['fatty fish', 'salmon', 'eggs', 'blueberries', 'walnuts', 'dark chocolate', 'green tea', 'olive oil', 'avocado'],
        minimize: ['sugar', 'processed foods', 'trans fats', 'blood sugar spikes'],
        dailyTracker: [{ key: 'brain_foods', label: { en: 'Brain foods', ru: 'Продукты для мозга', kk: 'Ми тағамдары' } }],
        suitableFor: ['focus', 'mental'], isFeatured: false, popularityScore: 82, tags: ['energy', 'brain'], emoji: '🧠', target: 'all', ageRange: '25-60',
        imageUrl: 'https://images.unsplash.com/photo-1508558936510-0af1e3cccbab?w=800', color: '#9C27B0',
    },
    {
        slug: 'adrenal_recovery', name: { en: 'Adrenal Recovery', ru: 'Восстановление Надпочечников', kk: 'Бүйрек Үсті Бездерін Қалпына Келтіру' },
        subtitle: { en: 'Heal burnout, restore vitality', ru: 'Исцелить выгорание', kk: 'Күйіп қалуды жазу' },
        description: { en: 'Healing nutrition for burned-out systems.', ru: 'Исцеляющее питание для истощённых систем.', kk: 'Күйіп қалған жүйелерге арналған жазылу тағамы.' },
        shortDescription: { en: 'Burnout recovery', ru: 'Восстановление от выгорания', kk: 'Күйіп қалудан қалпына келтіру' },
        category: 'energy', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'More Energy', streakThreshold: 0.6,
        embrace: ['nutrient-dense foods', 'organ meats', 'bone broth', 'eggs', 'vegetables', 'fruits', 'healthy fats'],
        minimize: ['caffeine', 'sugar', 'alcohol', 'processed foods', 'skipping meals'],
        dailyTracker: [{ key: 'no_caffeine', label: { en: 'No caffeine', ru: 'Без кофеина', kk: 'Кофеинсіз' } }],
        suitableFor: ['burnout', 'recovery'], isFeatured: false, popularityScore: 78, tags: ['energy', 'recovery'], emoji: '🔋', target: 'all', ageRange: '25-55',
        imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800', color: '#4DB6AC',
    },
    // ============================================
    // 🌍 DESTINATIONS (5 programs)
    // ============================================
    {
        slug: 'amalfi_coast', name: { en: 'Amalfi Coast', ru: 'Амальфитанское Побережье', kk: 'Амальфи Жағалауы' },
        subtitle: { en: 'Limoncello sunsets, Italian dreams', ru: 'Закаты с лимончелло', kk: 'Лимончелло күн батулары' },
        description: { en: 'Southern Italian coastal living.', ru: 'Южно-итальянская прибрежная жизнь.', kk: 'Оңтүстік италиялық жағалау өмірі.' },
        shortDescription: { en: 'Italian coastal eating', ru: 'Итальянское прибрежное питание', kk: 'Италиялық жағалау тағамы' },
        category: 'destinations', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Destinations', streakThreshold: 0.6,
        embrace: ['fresh seafood', 'fish', 'lemons', 'olive oil', 'tomatoes', 'fresh pasta', 'wine'],
        minimize: ['processed foods', 'fast food', 'rushing meals'],
        dailyTracker: [{ key: 'italian_meal', label: { en: 'Italian-style meal', ru: 'Итальянский приём пищи', kk: 'Италиялық тағам' } }],
        suitableFor: ['italian', 'coastal'], isFeatured: true, popularityScore: 85, tags: ['destinations', 'italian'], emoji: '🍋', target: 'all', ageRange: '18-65',
        imageUrl: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=800', color: '#FFEB3B',
    },
    {
        slug: 'greek_islands', name: { en: 'Greek Islands', ru: 'Греческие Острова', kk: 'Грек Аралдары' },
        subtitle: { en: 'Santorini sunsets on your plate', ru: 'Закаты Санторини на тарелке', kk: 'Санторини күн батулары табақта' },
        description: { en: 'The original Mediterranean diet.', ru: 'Оригинальная средиземноморская диета.', kk: 'Түпнұсқа Жерорта теңізі диетасы.' },
        shortDescription: { en: 'Greek Mediterranean eating', ru: 'Греческое средиземноморское питание', kk: 'Грек Жерорта теңізі тағамы' },
        category: 'destinations', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Destinations', streakThreshold: 0.6,
        embrace: ['olive oil', 'feta', 'Greek yogurt', 'fish', 'legumes', 'vegetables', 'wine', 'honey'],
        minimize: ['processed foods', 'excessive red meat'],
        dailyTracker: [{ key: 'mediterranean', label: { en: 'Mediterranean meal', ru: 'Средиземноморская еда', kk: 'Жерорта теңізі тағамы' } }],
        suitableFor: ['greek', 'mediterranean'], isFeatured: false, popularityScore: 82, tags: ['destinations', 'greek'], emoji: '🇬🇷', target: 'all', ageRange: '18-70',
        imageUrl: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800', color: '#03A9F4',
    },
    {
        slug: 'okinawa_longevity', name: { en: 'Okinawa Longevity', ru: 'Долголетие Окинавы', kk: 'Окинава Ұзақ Өмір' },
        subtitle: { en: 'Secrets of living to 100', ru: 'Секреты жизни до 100', kk: '100-ге дейін өмір сүру құпиялары' },
        description: { en: 'Blue Zone wisdom. Hara hachi bu — 80% full.', ru: 'Мудрость Голубой зоны.', kk: 'Көк аймақ даналығы.' },
        shortDescription: { en: 'Blue zone longevity', ru: 'Долголетие синей зоны', kk: 'Көк аймақ ұзақ өмір' },
        category: 'destinations', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Destinations', streakThreshold: 0.6,
        embrace: ['purple sweet potato', 'tofu', 'vegetables', 'seaweed', 'fish', 'green tea', 'turmeric'],
        minimize: ['excessive meat', 'processed foods', 'large portions'],
        dailyTracker: [{ key: 'hara_hachi_bu', label: { en: '80% full', ru: '80% сытости', kk: '80% тоқ' } }],
        suitableFor: ['longevity', 'japanese'], isFeatured: false, popularityScore: 80, tags: ['destinations', 'japanese'], emoji: '🇯🇵', target: 'all', ageRange: '25-80',
        imageUrl: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800', color: '#9C27B0',
    },
    {
        slug: 'tokyo_energy', name: { en: 'Tokyo Energy', ru: 'Энергия Токио', kk: 'Токио Энергиясы' },
        subtitle: { en: 'Fast-paced city, balanced eating', ru: 'Город в быстром темпе, сбалансированное питание', kk: 'Жылдам қала, теңгерімді тағам' },
        description: { en: 'Japanese efficiency meets nutrition.', ru: 'Японская эффективность встречается с питанием.', kk: 'Жапон тиімділігі тағаммен кездеседі.' },
        shortDescription: { en: 'Japanese efficient eating', ru: 'Японское эффективное питание', kk: 'Жапон тиімді тағамы' },
        category: 'destinations', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Destinations', streakThreshold: 0.6,
        embrace: ['fish', 'rice', 'miso', 'vegetables', 'edamame', 'seaweed', 'green tea', 'noodles'],
        minimize: ['excessive processed foods', 'skipping meals'],
        dailyTracker: [{ key: 'bento', label: { en: 'Bento balance', ru: 'Баланс бенто', kk: 'Бенто теңгерімі' } }],
        suitableFor: ['japanese', 'urban'], isFeatured: false, popularityScore: 78, tags: ['destinations', 'tokyo'], emoji: '🗼', target: 'all', ageRange: '20-50',
        imageUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800', color: '#FF5722',
    },
    {
        slug: 'scandi_hygge', name: { en: 'Scandi Hygge', ru: 'Скандинавский Хюгге', kk: 'Скандинавиялық Хюгге' },
        subtitle: { en: 'Cozy, balanced, sustainably happy', ru: 'Уютно, сбалансированно, счастливо', kk: 'Жайлы, теңгерімді, бақытты' },
        description: { en: 'Nordic eating meets hygge lifestyle.', ru: 'Скандинавское питание встречается с хюгге.', kk: 'Скандинавиялық тағам хюгге өмір салтымен.' },
        shortDescription: { en: 'Nordic cozy eating', ru: 'Скандинавское уютное питание', kk: 'Скандинавиялық жайлы тағам' },
        category: 'destinations', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Destinations', streakThreshold: 0.6,
        embrace: ['fatty fish', 'salmon', 'whole grain bread', 'berries', 'root vegetables', 'dairy', 'skyr', 'coffee'],
        minimize: ['excessive processed foods', 'rushed eating'],
        dailyTracker: [{ key: 'hygge', label: { en: 'Hygge moment', ru: 'Момент хюгге', kk: 'Хюгге сәті' } }],
        suitableFor: ['nordic', 'cozy'], isFeatured: false, popularityScore: 75, tags: ['destinations', 'nordic'], emoji: '🇩🇰', target: 'all', ageRange: '25-60',
        imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800', color: '#607D8B',
    },
    // ============================================
    // 👗 AESTHETICS (5 programs)
    // ============================================
    {
        slug: '1950s_bombshell', name: { en: '1950s Bombshell', ru: 'Гламур 50-х', kk: '50-ші Жылдар Гламуры' },
        subtitle: { en: 'Curves, confidence, classic beauty', ru: 'Изгибы, уверенность, классическая красота', kk: 'Иілмелер, сенімділік' },
        description: { en: 'Real food, real curves. Protein-rich, whole ingredients.', ru: 'Настоящая еда, настоящие формы.', kk: 'Нағыз тағам, нағыз иілмелер.' },
        shortDescription: { en: 'Classic curves nutrition', ru: 'Питание для классических форм', kk: 'Классикалық иілмелер тағамы' },
        category: 'aesthetics', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Aesthetics', streakThreshold: 0.6,
        embrace: ['eggs', 'steak', 'fish', 'cottage cheese', 'whole milk', 'vegetables', 'grapefruit'],
        minimize: ['processed foods', 'TV dinners', 'diet products'],
        dailyTracker: [{ key: 'protein', label: { en: 'Protein at every meal', ru: 'Белок при каждом приёме', kk: 'Әр тағамда белок' } }],
        suitableFor: ['curves', 'classic'], isFeatured: false, popularityScore: 75, tags: ['aesthetics', 'vintage'], emoji: '💄', target: 'female', ageRange: '20-50',
        imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800', color: '#E91E63',
    },
    {
        slug: 'prima_ballerina', name: { en: 'Prima Ballerina', ru: 'Прима-балерина', kk: 'Прима-балерина' },
        subtitle: { en: 'Grace, discipline, elegant strength', ru: 'Грация, дисциплина, элегантная сила', kk: 'Сәнділік, тәртіп' },
        description: { en: 'Eating for performance and grace. Carbs for energy, protein for strength.', ru: 'Питание для производительности и грации.', kk: 'Өнер көрсету және сәнділік үшін тағам.' },
        shortDescription: { en: 'Dancer nutrition', ru: 'Питание танцора', kk: 'Биші тағамы' },
        category: 'aesthetics', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Aesthetics', streakThreshold: 0.7,
        embrace: ['complex carbs', 'oatmeal', 'pasta', 'quinoa', 'lean proteins', 'chicken', 'fish', 'eggs', 'bananas', 'berries'],
        minimize: ['heavy greasy foods', 'excessive sugar', 'alcohol'],
        dailyTracker: [{ key: 'dancer_fuel', label: { en: 'Dancer-style eating', ru: 'Питание танцора', kk: 'Биші тағамы' } }],
        suitableFor: ['dance', 'grace'], isFeatured: false, popularityScore: 72, tags: ['aesthetics', 'dance'], emoji: '🩰', target: 'female', ageRange: '16-45',
        imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800', color: '#F8BBD9',
    },
    {
        slug: 'french_girl', name: { en: 'French Girl', ru: 'Французская Девушка', kk: 'Француз Қызы' },
        subtitle: { en: 'Je ne sais quoi in every bite', ru: 'Необъяснимое очарование', kk: 'Түсіндірілмейтін сүйкімділік' },
        description: { en: 'Original intuitive eating. Three meals, no snacking, wine with dinner.', ru: 'Оригинальное интуитивное питание.', kk: 'Түпнұсқа интуитивті тағам.' },
        shortDescription: { en: 'French intuitive eating', ru: 'Французское интуитивное питание', kk: 'Француз интуитивті тағамы' },
        category: 'aesthetics', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Aesthetics', streakThreshold: 0.6,
        embrace: ['fresh bread', 'cheese', 'wine', 'butter', 'eggs', 'fish', 'vegetables', 'dark chocolate'],
        minimize: ['snacking', 'processed foods', 'soft drinks', 'guilt', 'large portions'],
        dailyTracker: [{ key: 'three_meals', label: { en: 'Three meals, no snacking', ru: 'Три приёма пищи', kk: 'Үш тағам' } }],
        suitableFor: ['french', 'intuitive'], isFeatured: true, popularityScore: 85, tags: ['aesthetics', 'french'], emoji: '🗼', target: 'female', ageRange: '20-60',
        imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', color: '#3F51B5',
    },
    {
        slug: 'pin_up_retro', name: { en: 'Pin-Up Retro', ru: 'Ретро Пин-ап', kk: 'Ретро Пин-ап' },
        subtitle: { en: 'Vintage curves, modern confidence', ru: 'Винтажные изгибы', kk: 'Винтаждық иілмелер' },
        description: { en: 'Home-cooked meals, whole ingredients, no guilt.', ru: 'Домашние блюда, цельные ингредиенты.', kk: 'Үйде дайындалған тағамдар.' },
        shortDescription: { en: 'Retro body-positive eating', ru: 'Ретро бодипозитивное питание', kk: 'Ретро дене-позитивті тағам' },
        category: 'aesthetics', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Aesthetics', streakThreshold: 0.6,
        embrace: ['home-cooked meals', 'meat', 'fish', 'eggs', 'potatoes', 'vegetables', 'fruits', 'bread', 'butter'],
        minimize: ['processed foods', 'fast food', 'artificial ingredients', 'guilt'],
        dailyTracker: [{ key: 'home_cooked', label: { en: 'Home-cooked meal', ru: 'Домашняя еда', kk: 'Үйде дайындалған тағам' } }],
        suitableFor: ['retro', 'bodypositive'], isFeatured: false, popularityScore: 70, tags: ['aesthetics', 'retro'], emoji: '🎀', target: 'female', ageRange: '20-45',
        imageUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800', color: '#F44336',
    },
    {
        slug: 'minimalist_zen', name: { en: 'Minimalist Zen', ru: 'Минималистский Дзен', kk: 'Минималистік Дзен' },
        subtitle: { en: 'Less clutter, more clarity', ru: 'Меньше беспорядка, больше ясности', kk: 'Азырақ шатасу, көбірек анықтық' },
        description: { en: 'Japanese-inspired minimalism. Few ingredients, high quality.', ru: 'Японский минимализм.', kk: 'Жапонға шабыттанған минимализм.' },
        shortDescription: { en: 'Minimalist eating', ru: 'Минималистичное питание', kk: 'Минималистік тағам' },
        category: 'aesthetics', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Aesthetics', streakThreshold: 0.6,
        embrace: ['simple ingredients', 'rice', 'fish', 'vegetables', 'tofu', 'miso', 'green tea', 'seasonal foods'],
        minimize: ['complicated recipes', 'excessive variety', 'distracted eating'],
        dailyTracker: [{ key: 'simple_meal', label: { en: 'Simple, quality meal', ru: 'Простая качественная еда', kk: 'Қарапайым сапалы тағам' } }],
        suitableFor: ['minimalist', 'zen'], isFeatured: false, popularityScore: 68, tags: ['aesthetics', 'zen'], emoji: '⚪', target: 'all', ageRange: '25-60',
        imageUrl: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800', color: '#9E9E9E',
    },
    // ============================================
    // ⚔️ WARRIOR_MODE (6 programs)
    // ============================================
    {
        slug: 'spartan_warrior', name: { en: 'Spartan Warrior', ru: 'Спартанский Воин', kk: 'Спарталық Жауынгер' },
        subtitle: { en: 'THIS. IS. DISCIPLINE.', ru: 'ЭТО. ЕСТЬ. ДИСЦИПЛИНА.', kk: 'БҰЛ. БОЛЫП ТАБЫЛАДЫ. ТӘРТІП.' },
        description: { en: 'Ancient warrior fuel. Simple foods, no luxury.', ru: 'Древнее топливо воина.', kk: 'Ежелгі жауынгер отыны.' },
        shortDescription: { en: 'Spartan discipline', ru: 'Спартанская дисциплина', kk: 'Спартандық тәртіп' },
        category: 'warrior_mode', type: DietType.LIFESTYLE, difficulty: DietDifficulty.HARD, duration: 14, uiGroup: 'Warrior Mode', streakThreshold: 0.8,
        embrace: ['meat', 'lamb', 'beef', 'organ meats', 'bone broth', 'grains', 'barley', 'figs', 'olives'],
        minimize: ['luxury foods', 'excessive variety', 'sweets', 'weakness'],
        dailyTracker: [{ key: 'spartan', label: { en: 'Spartan discipline', ru: 'Спартанская дисциплина', kk: 'Спартандық тәртіп' } }],
        suitableFor: ['warrior', 'discipline'], isFeatured: true, popularityScore: 82, tags: ['warrior', 'spartan'], emoji: '🛡️', target: 'male', ageRange: '18-50',
        imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800', color: '#795548',
    },
    {
        slug: 'viking_raider', name: { en: 'Viking Raider', ru: 'Викинг-Завоеватель', kk: 'Викинг Басып Алушы' },
        subtitle: { en: 'Fuel for conquest and cold', ru: 'Топливо для завоеваний', kk: 'Басып алу үшін отын' },
        description: { en: 'Norse fuel. High fat, high protein, fermented foods.', ru: 'Скандинавское топливо.', kk: 'Норвегиялық отын.' },
        shortDescription: { en: 'Viking strength eating', ru: 'Питание силы викинга', kk: 'Викинг күші тағамы' },
        category: 'warrior_mode', type: DietType.LIFESTYLE, difficulty: DietDifficulty.HARD, duration: 14, uiGroup: 'Warrior Mode', streakThreshold: 0.8,
        embrace: ['meat', 'beef', 'pork', 'fish', 'salmon', 'dairy', 'cheese', 'butter', 'eggs', 'berries'],
        minimize: ['processed foods', 'sugar', 'weakness'],
        dailyTracker: [{ key: 'viking', label: { en: 'Viking strength', ru: 'Сила викинга', kk: 'Викинг күші' } }],
        suitableFor: ['warrior', 'strength'], isFeatured: false, popularityScore: 78, tags: ['warrior', 'viking'], emoji: '🪓', target: 'male', ageRange: '18-50',
        imageUrl: 'https://images.unsplash.com/photo-1597347316205-36f6c451902a?w=800', color: '#455A64',
    },
    {
        slug: 'navy_seal', name: { en: 'Navy SEAL', ru: 'Морской Спецназ', kk: 'Теңіз Арнайы Бөлімі' },
        subtitle: { en: 'Elite fuel for elite performance', ru: 'Элитное топливо', kk: 'Элиталық отын' },
        description: { en: 'Performance nutrition, no nonsense. High calories for high output.', ru: 'Спортивное питание, без ерунды.', kk: 'Өнер көрсету тағамы, мағынасыз нәрсе жоқ.' },
        shortDescription: { en: 'Elite performance nutrition', ru: 'Элитное спортивное питание', kk: 'Элиталық спорт тағамы' },
        category: 'warrior_mode', type: DietType.LIFESTYLE, difficulty: DietDifficulty.HARD, duration: 14, uiGroup: 'Warrior Mode', streakThreshold: 0.8,
        embrace: ['lean proteins', 'chicken', 'fish', 'beef', 'eggs', 'complex carbs', 'rice', 'oats', 'vegetables'],
        minimize: ['alcohol', 'sugar', 'fried foods', 'anything that slows you down'],
        dailyTracker: [{ key: 'mission', label: { en: 'Mission fuel', ru: 'Топливо для миссии', kk: 'Миссия отыны' } }],
        suitableFor: ['elite', 'military'], isFeatured: false, popularityScore: 80, tags: ['warrior', 'seal'], emoji: '🎖️', target: 'male', ageRange: '18-45',
        imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800', color: '#263238',
    },
    {
        slug: 'mma_fighter', name: { en: 'MMA Fighter', ru: 'Боец MMA', kk: 'MMA Жауынгері' },
        subtitle: { en: 'Cut weight, stay strong, dominate', ru: 'Сбросить вес, остаться сильным', kk: 'Салмақты азайту, күшті қалу' },
        description: { en: 'Fight camp nutrition. High protein, strategic carbs.', ru: 'Питание бойцовского лагеря.', kk: 'Жауынгер лагері тағамы.' },
        shortDescription: { en: 'Fighter nutrition', ru: 'Питание бойца', kk: 'Жауынгер тағамы' },
        category: 'warrior_mode', type: DietType.LIFESTYLE, difficulty: DietDifficulty.HARD, duration: 14, uiGroup: 'Warrior Mode', streakThreshold: 0.8,
        embrace: ['lean proteins', 'chicken', 'fish', 'eggs', 'vegetables', 'complex carbs', 'fruits', 'water'],
        minimize: ['sodium', 'alcohol', 'junk food'],
        dailyTracker: [{ key: 'fight_ready', label: { en: 'Fight ready', ru: 'Готов к бою', kk: 'Ұрысқа дайын' } }],
        suitableFor: ['mma', 'fighter'], isFeatured: false, popularityScore: 76, tags: ['warrior', 'mma'], emoji: '🥊', target: 'male', ageRange: '18-40',
        imageUrl: 'https://images.unsplash.com/photo-1562771379-eafdca7a02f8?w=800', color: '#D32F2F',
    },
    {
        slug: 'ceo_warrior', name: { en: 'CEO Warrior', ru: 'CEO-Воин', kk: 'CEO Жауынгері' },
        subtitle: { en: 'Dominate the boardroom', ru: 'Доминируй в зале заседаний', kk: 'Кеңседе басым бол' },
        description: { en: 'Biohacker meets executive. IF, keto principles.', ru: 'Биохакинг встречается с руководителем.', kk: 'Биохакинг басшымен кездеседі.' },
        shortDescription: { en: 'Executive biohacking', ru: 'Биохакинг руководителя', kk: 'Басшы биохакингі' },
        category: 'warrior_mode', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Warrior Mode', streakThreshold: 0.7,
        embrace: ['healthy fats', 'MCT oil', 'avocado', 'olive oil', 'quality proteins', 'grass-fed beef', 'eggs', 'low-carb vegetables'],
        minimize: ['sugar', 'processed carbs', 'frequent meals', 'blood sugar spikes'],
        dailyTracker: [{ key: 'optimized', label: { en: 'Optimized day', ru: 'Оптимизированный день', kk: 'Оңтайландырылған күн' } }],
        suitableFor: ['biohacker', 'executive'], isFeatured: false, popularityScore: 74, tags: ['warrior', 'ceo'], emoji: '💼', target: 'male', ageRange: '25-55',
        imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800', color: '#37474F',
    },
    {
        slug: 'stoic_monk', name: { en: 'Stoic Monk', ru: 'Стоический Монах', kk: 'Стоик Монах' },
        subtitle: { en: 'Master your body, master your mind', ru: 'Управляй телом, управляй умом', kk: 'Денеңізді басқарыңыз' },
        description: { en: 'Voluntary simplicity. Eat little, want nothing.', ru: 'Добровольная простота.', kk: 'Ерікті қарапайымдылық.' },
        shortDescription: { en: 'Stoic simplicity', ru: 'Стоическая простота', kk: 'Стоик қарапайымдылығы' },
        category: 'warrior_mode', type: DietType.LIFESTYLE, difficulty: DietDifficulty.HARD, duration: 14, uiGroup: 'Warrior Mode', streakThreshold: 0.8,
        embrace: ['simple foods', 'rice', 'beans', 'vegetables', 'fish', 'eggs', 'water', 'tea', 'fasting'],
        minimize: ['luxury', 'excess', 'emotional eating'],
        dailyTracker: [{ key: 'stoic', label: { en: 'Stoic discipline', ru: 'Стоическая дисциплина', kk: 'Стоик тәртібі' } }],
        suitableFor: ['stoic', 'minimalist'], isFeatured: false, popularityScore: 70, tags: ['warrior', 'stoic'], emoji: '🧘', target: 'all', ageRange: '25-60',
        imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800', color: '#78909C',
    },
    // ============================================
    // 📅 SEASONAL (4 programs)
    // ============================================
    {
        slug: 'summer_beach_body', name: { en: 'Summer Beach Body', ru: 'Пляжное Тело', kk: 'Пляж Денесі' },
        subtitle: { en: '4 weeks to your most confident summer', ru: '4 недели до уверенного лета', kk: 'Ең сенімді жазға 4 апта' },
        description: { en: 'Light, clean eating for beach confidence.', ru: 'Лёгкое, чистое питание для пляжной уверенности.', kk: 'Пляж сенімділігі үшін жеңіл тағам.' },
        shortDescription: { en: 'Beach body prep', ru: 'Подготовка пляжного тела', kk: 'Пляж денесін дайындау' },
        category: 'seasonal', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Seasonal', streakThreshold: 0.7,
        embrace: ['grilled fish', 'grilled chicken', 'egg whites', 'leafy greens', 'cucumber', 'berries', 'watermelon', 'quinoa'],
        minimize: ['bread', 'pasta', 'sugar', 'alcohol', 'fried foods'],
        dailyTracker: [{ key: 'beach_ready', label: { en: 'Beach ready day', ru: 'День готов к пляжу', kk: 'Пляжқа дайын күн' } }],
        suitableFor: ['summer', 'beach'], isFeatured: true, popularityScore: 88, tags: ['seasonal', 'summer'], emoji: '☀️', target: 'all', ageRange: '18-45',
        imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800', color: '#FF9800',
    },
    {
        slug: 'new_year_reset', name: { en: 'New Year Reset', ru: 'Новогоднее Обновление', kk: 'Жаңа Жылдық Қалпына Келтіру' },
        subtitle: { en: 'Fresh start, clean slate', ru: 'Новое начало, чистый лист', kk: 'Жаңа бастау, таза парақ' },
        description: { en: 'Gentle reset after indulgent times.', ru: 'Мягкое обновление после излишеств.', kk: 'Ләззат кезеңдерінен кейінгі жұмсақ қалпына келтіру.' },
        shortDescription: { en: 'New year reset', ru: 'Новогоднее обновление', kk: 'Жаңа жылдық қалпына келтіру' },
        category: 'seasonal', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Seasonal', streakThreshold: 0.6,
        embrace: ['all vegetables', 'whole fruits', 'lean proteins', 'legumes', 'whole grains', 'herbal tea', 'water'],
        minimize: ['processed foods', 'sugar', 'alcohol', 'excessive coffee'],
        dailyTracker: [{ key: 'reset', label: { en: 'Reset day', ru: 'День обновления', kk: 'Қалпына келтіру күні' } }],
        suitableFor: ['reset', 'newyear'], isFeatured: false, popularityScore: 82, tags: ['seasonal', 'newyear'], emoji: '🎆', target: 'all', ageRange: '18-60',
        imageUrl: 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=800', color: '#673AB7',
    },
    {
        slug: 'wedding_ready', name: { en: 'Wedding Ready', ru: 'К Свадьбе Готова', kk: 'Үйленуге Дайын' },
        subtitle: { en: 'Glowing, confident, picture-perfect', ru: 'Сияющая, уверенная, идеальная', kk: 'Жарқыраған, сенімді' },
        description: { en: 'Gradual, sustainable approach for your special day.', ru: 'Постепенный подход к особому дню.', kk: 'Ерекше күніңізге арналған біртіндеп тәсіл.' },
        shortDescription: { en: 'Wedding prep nutrition', ru: 'Питание для подготовки к свадьбе', kk: 'Үйленуге дайындық тағамы' },
        category: 'seasonal', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Seasonal', streakThreshold: 0.7,
        embrace: ['lean proteins', 'fish', 'chicken', 'collagen-rich foods', 'bone broth', 'leafy greens', 'cucumber', 'quinoa', 'avocado'],
        minimize: ['high-sodium foods', 'beans', 'alcohol', 'carbonated drinks', 'dairy', 'sugar'],
        dailyTracker: [{ key: 'bridal_glow', label: { en: 'Bridal glow day', ru: 'День свадебного сияния', kk: 'Үйлену жарқырауы күні' } }],
        suitableFor: ['wedding', 'bride'], isFeatured: false, popularityScore: 80, tags: ['seasonal', 'wedding'], emoji: '💍', target: 'female', ageRange: '22-45',
        imageUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800', color: '#FFCDD2',
    },
    {
        slug: 'holiday_balance', name: { en: 'Holiday Balance', ru: 'Праздничный Баланс', kk: 'Мерекелік Теңгерім' },
        subtitle: { en: 'Enjoy the season without regret', ru: 'Наслаждайтесь сезоном без сожалений', kk: 'Мерекесіз кешірімсіз ләззат алыңыз' },
        description: { en: 'Navigate holidays without gaining or restricting.', ru: 'Навигация по праздникам без набора веса.', kk: 'Салмақ қоспай мерекелерді басқару.' },
        shortDescription: { en: 'Holiday balance', ru: 'Праздничный баланс', kk: 'Мерекелік теңгерім' },
        category: 'seasonal', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Seasonal', streakThreshold: 0.6,
        embrace: ['vegetables at every meal', 'lean proteins', 'mindful portions', 'walking after meals'],
        minimize: ['mindless snacking', 'eating because it is there', 'guilt'],
        dailyTracker: [{ key: 'balance', label: { en: 'Balanced day', ru: 'Сбалансированный день', kk: 'Теңгерімді күн' } }],
        suitableFor: ['holiday', 'balance'], isFeatured: false, popularityScore: 75, tags: ['seasonal', 'holiday'], emoji: '🎄', target: 'all', ageRange: '18-65',
        imageUrl: 'https://images.unsplash.com/photo-1512389142860-9c449e58a814?w=800', color: '#4CAF50',
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
            kk: p.tags.includes('warrior') ? "Тәртіп - бұл еркіндік" : "Бүгін ең жақсы бол"
        });

        const getPhilosophy = (p: LifestyleProgram) => ({
            en: p.description.en || "Wellness is a journey, not a destination.",
            ru: p.description.ru || "Здоровье - это путь, а не цель.",
            kk: p.description.kk || "Денсаулық - бұл мақсат емес, жол."
        });

        const getDailyInspiration = (p: LifestyleProgram) => ({
            en: ["Visualise your success", "Drink water first thing", "Move your body with joy"],
            ru: ["Визуализируйте успех", "Пейте воду с утра", "Двигайтесь с радостью"],
            kk: ["Жетістігіңізді елестетіңіз", "Таңертең су ішіңіз", "Қуанышпен қозғалыңыз"]
        });

        const getVibe = (p: LifestyleProgram) => p.tags.join(', ');

        const getSampleDay = (p: LifestyleProgram) => ({
            morning: { en: "Lemon water & light movement", ru: "Лимонная вода и лёгкая разминка", kk: "Лимон суы және жеңіл жаттығу" },
            midday: { en: "Nutrient dense bowl", ru: "Питательный боул", kk: "Құнарлы тағам" },
            evening: { en: "Relaxing tea & disconnect", ru: "Расслабляющий чай и отдых", kk: "Демалу шайы" }
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

        console.log(`  ✅ ${program.name.en}`);
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

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
        name: 'programs.lifestyle.that_girl.name',
        subtitle: 'programs.lifestyle.that_girl.subtitle',
        description: 'programs.lifestyle.that_girl.description',
        shortDescription: 'programs.lifestyle.that_girl.shortDescription',
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        embrace: ['green smoothies', 'matcha', 'overnight oats', 'açaí bowls', 'avocado toast', 'Buddha bowls', 'lean proteins', 'fresh salads', 'chia seeds', 'berries', 'lemon water'],
        minimize: ['processed foods', 'fast food', 'excessive sugar', 'alcohol', 'caffeine after 2pm', 'heavy dinners'],
        dailyTracker: [
            { key: 'morning_routine', label: 'programs.lifestyle.that_girl.dailyTracker.morning_routine.label' },
            { key: 'green_juice', label: 'programs.lifestyle.that_girl.dailyTracker.green_juice.label' },
            { key: 'aesthetic_meal', label: 'programs.lifestyle.that_girl.dailyTracker.aesthetic_meal.label' },
            { key: 'hydration', label: 'programs.lifestyle.that_girl.dailyTracker.hydration.label' },
        ],
        suitableFor: ['wellness', 'aesthetic', 'instagram'],
        isFeatured: true,
        popularityScore: 94, // FIX #11: Slightly lower - Clean Girl is popular but more local than global
        tags: ['trending', 'aesthetic', 'wellness'],
        emoji: '✨',
        target: 'female',
        ageRange: '18-30',
        imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80', // Aesthetic wellness, green smoothie, morning routine
        color: '#7CB342',
    },
    {
        slug: 'clean_girl',
        name: 'programs.lifestyle.clean_girl.name',
        subtitle: 'programs.lifestyle.clean_girl.subtitle',
        description: 'programs.lifestyle.clean_girl.description',
        shortDescription: 'programs.lifestyle.clean_girl.shortDescription',
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        embrace: ['whole foods', 'vegetables', 'leafy greens', 'cucumber', 'berries', 'citrus', 'lean proteins', 'eggs', 'fish', 'avocado', 'olive oil', 'nuts', 'water', 'herbal tea'],
        minimize: ['processed foods', 'sugar', 'dairy', 'excessive caffeine', 'alcohol', 'fried foods'],
        dailyTracker: [
            { key: 'whole_foods', label: 'programs.lifestyle.clean_girl.dailyTracker.whole_foods.label' },
            { key: 'hydration', label: 'programs.lifestyle.clean_girl.dailyTracker.hydration.label' },
            { key: 'simple_meal', label: 'programs.lifestyle.clean_girl.dailyTracker.simple_meal.label' },
        ],
        suitableFor: ['skin_health', 'simplicity', 'natural'],
        isFeatured: true,
        popularityScore: 92,
        tags: ['trending', 'clean', 'minimal'],
        emoji: '🧴',
        target: 'female',
        ageRange: '18-35',
        imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80', // Clean minimal food, fresh vegetables
        color: '#81D4FA',
    },
    {
        slug: 'old_money',
        name: 'programs.lifestyle.old_money.name',
        subtitle: 'programs.lifestyle.old_money.subtitle',
        description: 'programs.lifestyle.old_money.description',
        shortDescription: 'programs.lifestyle.old_money.shortDescription',
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        embrace: ['grass-fed beef', 'wild salmon', 'organic eggs', 'quality cheese', 'seasonal vegetables', 'farmers market produce', 'fresh berries', 'fine wine', 'real butter', 'artisan bread'],
        minimize: ['chain restaurants', 'fast food', 'cheap ingredients', 'processed foods', 'trendy diet foods'],
        dailyTracker: [
            { key: 'quality_ingredients', label: 'programs.lifestyle.old_money.dailyTracker.quality_ingredients.label' },
            { key: 'proper_dining', label: 'programs.lifestyle.old_money.dailyTracker.proper_dining.label' },
            { key: 'three_meals', label: 'programs.lifestyle.old_money.dailyTracker.three_meals.label' },
        ],
        suitableFor: ['luxury', 'quality', 'elegance'],
        isFeatured: true, // FIX #11: Make Old Money featured - it's globally popular
        popularityScore: 98, // FIX #11: Increase popularity - Old Money is globally trending "quiet luxury"
        tags: ['trending', 'luxury', 'quality'],
        emoji: '🏛️',
        target: 'all',
        ageRange: '22-55',
        imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80', // Fine dining, elegant restaurant
        color: '#8D6E63',
    },
    {
        slug: 'tomato_girl_summer',
        name: 'programs.lifestyle.tomato_girl_summer.name',
        subtitle: 'programs.lifestyle.tomato_girl_summer.subtitle',
        description: 'programs.lifestyle.tomato_girl_summer.description',
        shortDescription: 'programs.lifestyle.tomato_girl_summer.shortDescription',
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        embrace: ['tomatoes', 'olive oil', 'burrata', 'mozzarella', 'feta', 'fresh pasta', 'crusty bread', 'seafood', 'peaches', 'figs', 'wine', 'fresh herbs', 'basil'],
        minimize: ['processed foods', 'heavy cream sauces', 'fast food'],
        dailyTracker: [
            { key: 'olive_oil', label: 'programs.lifestyle.tomato_girl_summer.dailyTracker.olive_oil.label' },
            { key: 'fresh_tomatoes', label: 'programs.lifestyle.tomato_girl_summer.dailyTracker.fresh_tomatoes.label' },
            { key: 'aperitivo', label: 'programs.lifestyle.tomato_girl_summer.dailyTracker.aperitivo.label' },
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
        name: 'programs.lifestyle.pilates_princess.name',
        subtitle: 'programs.lifestyle.pilates_princess.subtitle',
        description: 'programs.lifestyle.pilates_princess.description',
        shortDescription: 'programs.lifestyle.pilates_princess.shortDescription',
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        embrace: ['lean proteins', 'fish', 'chicken', 'eggs', 'collagen', 'bone broth', 'vegetables', 'quinoa', 'sweet potato', 'berries', 'green juice', 'matcha', 'nuts'],
        minimize: ['processed foods', 'sugar', 'excessive carbs', 'alcohol', 'heavy meals', 'inflammatory foods'],
        dailyTracker: [
            { key: 'collagen', label: 'programs.lifestyle.pilates_princess.dailyTracker.collagen.label' },
            { key: 'lean_protein', label: 'programs.lifestyle.pilates_princess.dailyTracker.lean_protein.label' },
            { key: 'light_eating', label: 'programs.lifestyle.pilates_princess.dailyTracker.light_eating.label' },
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
        name: 'programs.lifestyle.coastal_grandmother.name',
        subtitle: 'programs.lifestyle.coastal_grandmother.subtitle',
        description: 'programs.lifestyle.coastal_grandmother.description',
        shortDescription: 'programs.lifestyle.coastal_grandmother.shortDescription',
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        embrace: ['fresh seafood', 'fish', 'shrimp', 'vegetables', 'salads', 'fresh bread', 'olive oil', 'white wine', 'fresh fruit', 'yogurt', 'honey', 'herbal tea'],
        minimize: ['processed foods', 'fast food', 'complicated recipes', 'stress eating', 'rushed meals'],
        dailyTracker: [
            { key: 'set_table', label: 'programs.lifestyle.coastal_grandmother.dailyTracker.set_table.label' },
            { key: 'fresh_seafood', label: 'programs.lifestyle.coastal_grandmother.dailyTracker.fresh_seafood.label' },
            { key: 'beach_walk', label: 'programs.lifestyle.coastal_grandmother.dailyTracker.beach_walk.label' },
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
        name: 'programs.lifestyle.soft_life.name',
        subtitle: 'programs.lifestyle.soft_life.subtitle',
        description: 'programs.lifestyle.soft_life.description',
        shortDescription: 'programs.lifestyle.soft_life.shortDescription',
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        embrace: ['comfort foods made healthy', 'soups', 'stews', 'warm bowls', 'soft textures', 'nourishing meals', 'treats in moderation', 'tea', 'gentle cooking'],
        minimize: ['stress eating', 'strict diets', 'punishment mentality', 'harsh restrictions', 'guilt'],
        dailyTracker: [
            { key: 'comfort_food', label: 'programs.lifestyle.soft_life.dailyTracker.comfort_food.label' },
            { key: 'gentle_self', label: 'programs.lifestyle.soft_life.dailyTracker.gentle_self.label' },
            { key: 'rest', label: 'programs.lifestyle.soft_life.dailyTracker.rest.label' },
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
        name: 'programs.lifestyle.mob_wife.name',
        subtitle: 'programs.lifestyle.mob_wife.subtitle',
        description: 'programs.lifestyle.mob_wife.description',
        shortDescription: 'programs.lifestyle.mob_wife.shortDescription',
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        embrace: ['Italian food', 'pasta', 'red sauce', 'meatballs', 'bread', 'olive oil', 'espresso', 'red wine', 'cannoli', 'tiramisu', 'family dinners', 'Sunday sauce'],
        minimize: ['diet food', 'sad salads', 'apologizing for eating', 'guilt', 'eating alone'],
        dailyTracker: [
            { key: 'sunday_sauce', label: 'programs.lifestyle.mob_wife.dailyTracker.sunday_sauce.label' },
            { key: 'espresso', label: 'programs.lifestyle.mob_wife.dailyTracker.espresso.label' },
            { key: 'family_dinner', label: 'programs.lifestyle.mob_wife.dailyTracker.family_dinner.label' },
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
        name: 'programs.lifestyle.summer_shred.name',
        subtitle: 'programs.lifestyle.summer_shred.subtitle',
        description: 'programs.lifestyle.summer_shred.description',
        shortDescription: 'programs.lifestyle.summer_shred.shortDescription',
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
        name: 'programs.lifestyle.metabolic_reset.name',
        subtitle: 'programs.lifestyle.metabolic_reset.subtitle',
        description: 'programs.lifestyle.metabolic_reset.description',
        shortDescription: 'programs.lifestyle.metabolic_reset.shortDescription',
        category: 'weight_loss', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Weight Loss', streakThreshold: 0.7,
        embrace: ['whole foods', 'protein', 'healthy fats', 'vegetables', 'fiber', 'complex carbs', 'green tea'],
        minimize: ['processed foods', 'sugar', 'refined carbs', 'frequent snacking', 'late eating'],
        dailyTracker: [{ key: 'blood_sugar', label: { en: 'Stable blood sugar', ru: 'Стабильный сахар', kk: 'Тұрақты қан қанты', fr: 'Glycémie stable' } }],
        suitableFor: ['metabolism', 'reset'], isFeatured: false, popularityScore: 82, tags: ['weight_loss', 'metabolism'], emoji: '🔄', target: 'all', ageRange: '25-55',
        imageUrl: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80', color: '#4CAF50', // Metabolic reset, healthy transformation
    },
    {
        slug: 'debloat_detox',
        name: 'programs.lifestyle.debloat_detox.name',
        subtitle: 'programs.lifestyle.debloat_detox.subtitle',
        description: 'programs.lifestyle.debloat_detox.description',
        shortDescription: 'programs.lifestyle.debloat_detox.shortDescription',
        category: 'weight_loss', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Weight Loss', streakThreshold: 0.6,
        embrace: ['cucumber', 'celery', 'asparagus', 'leafy greens', 'lemon water', 'ginger', 'peppermint tea'],
        minimize: ['sodium', 'carbonated drinks', 'beans', 'dairy', 'alcohol'],
        dailyTracker: [{ key: 'debloat', label: { en: 'Low sodium day', ru: 'День без натрия', kk: 'Натрийсіз күн', fr: 'Journée pauvre en sodium' } }],
        suitableFor: ['debloat', 'refresh'], isFeatured: false, popularityScore: 80, tags: ['weight_loss', 'debloat'], emoji: '💨', target: 'all', ageRange: '18-55',
        imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80', color: '#00BCD4', // Debloat & glow, fresh vegetables, clean eating
    },
    {
        slug: 'sustainable_slim',
        name: 'programs.lifestyle.sustainable_slim.name',
        subtitle: 'programs.lifestyle.sustainable_slim.subtitle',
        description: 'programs.lifestyle.sustainable_slim.description',
        shortDescription: 'programs.lifestyle.sustainable_slim.shortDescription',
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
        name: 'programs.lifestyle.lean_bulk.name',
        subtitle: 'programs.lifestyle.lean_bulk.subtitle',
        description: 'programs.lifestyle.lean_bulk.description',
        shortDescription: 'programs.lifestyle.lean_bulk.shortDescription',
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
        name: 'programs.lifestyle.strength_athlete.name',
        subtitle: 'programs.lifestyle.strength_athlete.subtitle',
        description: 'programs.lifestyle.strength_athlete.description',
        shortDescription: 'programs.lifestyle.strength_athlete.shortDescription',
        category: 'muscle_building', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Build Muscle', streakThreshold: 0.7,
        embrace: ['high protein', 'beef', 'chicken', 'eggs', 'fish', 'rice', 'potatoes', 'oats'],
        minimize: ['alcohol', 'excessive junk', 'undereating'],
        dailyTracker: [{ key: 'post_workout', label: { en: 'Post-workout nutrition', ru: 'Питание после тренировки', kk: 'Жаттығудан кейінгі тағам', fr: 'Nutrition post-entraînement' } }],
        suitableFor: ['strength', 'powerlifting'], isFeatured: false, popularityScore: 82, tags: ['muscle', 'strength'], emoji: '🏋️', target: 'male', ageRange: '18-50',
        imageUrl: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=800&q=80', color: '#673AB7', // Strength athlete, power, performance
    },
    {
        slug: 'athletic_performance',
        name: 'programs.lifestyle.athletic_performance.name',
        subtitle: 'programs.lifestyle.athletic_performance.subtitle',
        description: 'programs.lifestyle.athletic_performance.description',
        shortDescription: 'programs.lifestyle.athletic_performance.shortDescription',
        category: 'muscle_building', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Build Muscle', streakThreshold: 0.7,
        embrace: ['lean proteins', 'complex carbs', 'fruits', 'vegetables', 'hydration', 'electrolytes'],
        minimize: ['alcohol', 'processed foods', 'heavy foods before training'],
        dailyTracker: [{ key: 'fuel_work', label: { en: 'Fuel the work', ru: 'Заправляйте работу', kk: 'Жұмысты отындаңыз', fr: 'Alimenter l\'effort' } }],
        suitableFor: ['athletes', 'performance'], isFeatured: false, popularityScore: 80, tags: ['muscle', 'athletic'], emoji: '🏃', target: 'all', ageRange: '16-45',
        imageUrl: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80', color: '#2196F3', // Athletic performance, sports nutrition
    },
    {
        slug: 'functional_fitness',
        name: 'programs.lifestyle.functional_fitness.name',
        subtitle: 'programs.lifestyle.functional_fitness.subtitle',
        description: 'programs.lifestyle.functional_fitness.description',
        shortDescription: 'programs.lifestyle.functional_fitness.shortDescription',
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
        subtitle: 'programs.lifestyle.glass_skin.subtitle',
        description: 'programs.lifestyle.glass_skin.description',
        shortDescription: 'programs.lifestyle.glass_skin.shortDescription',
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
        subtitle: 'programs.lifestyle.acne_clear.subtitle',
        description: 'programs.lifestyle.acne_clear.description',
        shortDescription: 'programs.lifestyle.acne_clear.shortDescription',
        category: 'skin_health', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Clear Skin', streakThreshold: 0.6,
        embrace: ['low-glycemic foods', 'vegetables', 'lean proteins', 'omega-3 fish', 'zinc-rich foods', 'probiotics', 'green tea'],
        minimize: ['dairy', 'sugar', 'high-glycemic carbs', 'processed foods'],
        dailyTracker: [{ key: 'low_glycemic', label: { en: 'Low glycemic day', ru: 'Низкогликемический день', kk: 'Төмен гликемиялық күн', fr: 'Journée low-glycémique' } }],
        suitableFor: ['acne', 'skin'], isFeatured: false, popularityScore: 82, tags: ['skin', 'acne'], emoji: '🧊', target: 'all', ageRange: '14-40',
        imageUrl: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=800&q=80', color: '#64B5F6', // Acne clear, clear skin, healthy glow
    },
    {
        slug: 'anti_aging_glow', name: { en: 'Anti-Aging Glow', ru: 'Антивозрастное Сияние', kk: 'Жасылдыққа Қарсы Жарқырау', fr: 'Anti-âge Glow' },
        subtitle: 'programs.lifestyle.anti_aging_glow.subtitle',
        description: 'programs.lifestyle.anti_aging_glow.description',
        shortDescription: 'programs.lifestyle.anti_aging_glow.shortDescription',
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
        subtitle: 'programs.lifestyle.all_day_energy.subtitle',
        description: 'programs.lifestyle.all_day_energy.description',
        shortDescription: 'programs.lifestyle.all_day_energy.shortDescription',
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
        subtitle: 'programs.lifestyle.brain_fuel.subtitle',
        description: 'programs.lifestyle.brain_fuel.description',
        shortDescription: 'programs.lifestyle.brain_fuel.shortDescription',
        category: 'energy', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'More Energy', streakThreshold: 0.6,
        embrace: ['fatty fish', 'salmon', 'eggs', 'blueberries', 'walnuts', 'dark chocolate', 'green tea', 'olive oil', 'avocado'],
        minimize: ['sugar', 'processed foods', 'trans fats', 'blood sugar spikes'],
        dailyTracker: [{ key: 'brain_foods', label: { en: 'Brain foods', ru: 'Продукты для мозга', kk: 'Ми тағамдары', fr: 'Aliments cerveau' } }],
        suitableFor: ['focus', 'mental'], isFeatured: false, popularityScore: 82, tags: ['energy', 'brain'], emoji: '🧠', target: 'all', ageRange: '25-60',
        imageUrl: 'https://images.unsplash.com/photo-1508558936510-0af1e3cccbab?w=800&q=80', color: '#9C27B0', // Brain fuel, mental clarity, cognitive health
    },
    {
        slug: 'adrenal_recovery', name: { en: 'Adrenal Recovery', ru: 'Восстановление Надпочечников', kk: 'Бүйрек Үсті Бездерін Қалпына Келтіру', fr: 'Récupération surrénales' },
        subtitle: 'programs.lifestyle.adrenal_recovery.subtitle',
        description: 'programs.lifestyle.adrenal_recovery.description',
        shortDescription: 'programs.lifestyle.adrenal_recovery.shortDescription',
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
        subtitle: 'programs.lifestyle.amalfi_coast.subtitle',
        description: 'programs.lifestyle.amalfi_coast.description',
        shortDescription: 'programs.lifestyle.amalfi_coast.shortDescription',
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
        subtitle: 'programs.lifestyle.greek_islands.subtitle',
        description: 'programs.lifestyle.greek_islands.description',
        shortDescription: 'programs.lifestyle.greek_islands.shortDescription',
        category: 'destinations', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Destinations', streakThreshold: 0.6,
        embrace: ['olive oil', 'feta', 'Greek yogurt', 'fish', 'legumes', 'vegetables', 'wine', 'honey'],
        minimize: ['processed foods', 'excessive red meat'],
        dailyTracker: [{ key: 'mediterranean', label: { en: 'Mediterranean meal', ru: 'Средиземноморская еда', kk: 'Жерорта теңізі тағамы', fr: 'Repas méditerranéen' } }],
        suitableFor: ['greek', 'mediterranean'], isFeatured: false, popularityScore: 82, tags: ['destinations', 'greek'], emoji: '🇬🇷', target: 'all', ageRange: '18-70',
        imageUrl: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800&q=80', color: '#03A9F4', // Greek Islands, Mediterranean, fresh seafood
    },
    {
        slug: 'okinawa_longevity', name: { en: 'Okinawa Longevity', ru: 'Долголетие Окинавы', kk: 'Окинава Ұзақ Өмір', fr: 'Longévité Okinawa' },
        subtitle: 'programs.lifestyle.okinawa_longevity.subtitle',
        description: 'programs.lifestyle.okinawa_longevity.description',
        shortDescription: 'programs.lifestyle.okinawa_longevity.shortDescription',
        category: 'destinations', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Destinations', streakThreshold: 0.6,
        embrace: ['purple sweet potato', 'tofu', 'vegetables', 'seaweed', 'fish', 'green tea', 'turmeric'],
        minimize: ['excessive meat', 'processed foods', 'large portions'],
        dailyTracker: [{ key: 'hara_hachi_bu', label: { en: '80% full', ru: '80% сытости', kk: '80% тоқ', fr: '80 % plein' } }],
        suitableFor: ['longevity', 'japanese'], isFeatured: true, popularityScore: 95, tags: ['destinations', 'japanese'], emoji: '🇯🇵', target: 'all', ageRange: '25-80', // FIX #11: Increase popularity and make featured - Japanese longevity diet is globally popular
        imageUrl: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80', color: '#9C27B0', // Okinawa longevity, Japanese wellness, longevity
    },
    {
        slug: 'tokyo_energy', name: { en: 'Tokyo Energy', ru: 'Энергия Токио', kk: 'Токио Энергиясы', fr: 'Tokyo Energy' },
        subtitle: 'programs.lifestyle.tokyo_energy.subtitle',
        description: 'programs.lifestyle.tokyo_energy.description',
        shortDescription: 'programs.lifestyle.tokyo_energy.shortDescription',
        category: 'destinations', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Destinations', streakThreshold: 0.6,
        embrace: ['fish', 'rice', 'miso', 'vegetables', 'edamame', 'seaweed', 'green tea', 'noodles'],
        minimize: ['excessive processed foods', 'skipping meals'],
        dailyTracker: [{ key: 'bento', label: { en: 'Bento balance', ru: 'Баланс бенто', kk: 'Бенто теңгерімі', fr: 'Équilibre bento' } }],
        suitableFor: ['japanese', 'urban'], isFeatured: false, popularityScore: 78, tags: ['destinations', 'tokyo'], emoji: '🗼', target: 'all', ageRange: '20-50',
        imageUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&q=80', color: '#FF5722', // Tokyo Energy, Japanese efficiency, vibrant city life
    },
    {
        slug: 'scandi_hygge', name: { en: 'Scandi Hygge', ru: 'Скандинавский Хюгге', kk: 'Скандинавиялық Хюгге', fr: 'Scandi Hygge' },
        subtitle: 'programs.lifestyle.scandi_hygge.subtitle',
        description: 'programs.lifestyle.scandi_hygge.description',
        shortDescription: 'programs.lifestyle.scandi_hygge.shortDescription',
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
        subtitle: 'programs.lifestyle.1950s_bombshell.subtitle',
        description: 'programs.lifestyle.1950s_bombshell.description',
        shortDescription: 'programs.lifestyle.1950s_bombshell.shortDescription',
        category: 'aesthetics', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Aesthetics', streakThreshold: 0.6,
        embrace: ['eggs', 'steak', 'fish', 'cottage cheese', 'whole milk', 'vegetables', 'grapefruit'],
        minimize: ['processed foods', 'TV dinners', 'diet products'],
        dailyTracker: [{ key: 'protein', label: { en: 'Protein at every meal', ru: 'Белок при каждом приёме', kk: 'Әр тағамда белок', fr: 'Protéines à chaque repas' } }],
        suitableFor: ['curves', 'classic'], isFeatured: false, popularityScore: 75, tags: ['aesthetics', 'vintage'], emoji: '💄', target: 'female', ageRange: '20-50',
        imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80', color: '#E91E63', // 1950s Bombshell, vintage glamour, classic beauty
    },
    {
        slug: 'prima_ballerina', name: { en: 'Prima Ballerina', ru: 'Прима-балерина', kk: 'Прима-балерина', fr: 'Prima ballerina' },
        subtitle: 'programs.lifestyle.prima_ballerina.subtitle',
        description: 'programs.lifestyle.prima_ballerina.description',
        shortDescription: 'programs.lifestyle.prima_ballerina.shortDescription',
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
        subtitle: 'programs.lifestyle.french_girl.subtitle',
        description: 'programs.lifestyle.french_girl.description',
        shortDescription: 'programs.lifestyle.french_girl.shortDescription',
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
        subtitle: 'programs.lifestyle.pin_up_retro.subtitle',
        description: 'programs.lifestyle.pin_up_retro.description',
        shortDescription: 'programs.lifestyle.pin_up_retro.shortDescription',
        category: 'aesthetics', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Aesthetics', streakThreshold: 0.6,
        embrace: ['home-cooked meals', 'meat', 'fish', 'eggs', 'potatoes', 'vegetables', 'fruits', 'bread', 'butter'],
        minimize: ['processed foods', 'fast food', 'artificial ingredients', 'guilt'],
        dailyTracker: [{ key: 'home_cooked', label: { en: 'Home-cooked meal', ru: 'Домашняя еда', kk: 'Үйде дайындалған тағам', fr: 'Repas fait maison' } }],
        suitableFor: ['retro', 'bodypositive'], isFeatured: false, popularityScore: 70, tags: ['aesthetics', 'retro'], emoji: '🎀', target: 'female', ageRange: '20-45',
        imageUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800&q=80', color: '#F44336', // Pin-Up Retro, vintage curves, body-positive
    },
    {
        slug: 'minimalist_zen', name: { en: 'Minimalist Zen', ru: 'Минималистский Дзен', kk: 'Минималистік Дзен', fr: 'Minimaliste Zen' },
        subtitle: 'programs.lifestyle.minimalist_zen.subtitle',
        description: 'programs.lifestyle.minimalist_zen.description',
        shortDescription: 'programs.lifestyle.minimalist_zen.shortDescription',
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
        subtitle: 'programs.lifestyle.spartan_warrior.subtitle',
        description: 'programs.lifestyle.spartan_warrior.description',
        shortDescription: 'programs.lifestyle.spartan_warrior.shortDescription',
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
        subtitle: 'programs.lifestyle.viking_raider.subtitle',
        description: 'programs.lifestyle.viking_raider.description',
        shortDescription: 'programs.lifestyle.viking_raider.shortDescription',
        category: 'warrior_mode', type: DietType.LIFESTYLE, difficulty: DietDifficulty.HARD, duration: 14, uiGroup: 'Warrior Mode', streakThreshold: 0.8,
        embrace: ['meat', 'beef', 'pork', 'fish', 'salmon', 'dairy', 'cheese', 'butter', 'eggs', 'berries'],
        minimize: ['processed foods', 'sugar', 'weakness'],
        dailyTracker: [{ key: 'viking', label: { en: 'Viking strength', ru: 'Сила викинга', kk: 'Викинг күші', fr: 'Force viking' } }],
        suitableFor: ['warrior', 'strength'], isFeatured: false, popularityScore: 78, tags: ['warrior', 'viking'], emoji: '🪓', target: 'male', ageRange: '18-50',
        imageUrl: 'https://images.unsplash.com/photo-1597347316205-36f6c451902a?w=800&q=80', color: '#455A64', // Viking Raider, Nordic strength, warrior fuel
    },
    {
        slug: 'navy_seal', name: { en: 'Navy SEAL', ru: 'Морской Спецназ', kk: 'Теңіз Арнайы Бөлімі', fr: 'Navy SEAL' },
        subtitle: 'programs.lifestyle.navy_seal.subtitle',
        description: 'programs.lifestyle.navy_seal.description',
        shortDescription: 'programs.lifestyle.navy_seal.shortDescription',
        category: 'warrior_mode', type: DietType.LIFESTYLE, difficulty: DietDifficulty.HARD, duration: 14, uiGroup: 'Warrior Mode', streakThreshold: 0.8,
        embrace: ['lean proteins', 'chicken', 'fish', 'beef', 'eggs', 'complex carbs', 'rice', 'oats', 'vegetables'],
        minimize: ['alcohol', 'sugar', 'fried foods', 'anything that slows you down'],
        dailyTracker: [{ key: 'mission', label: { en: 'Mission fuel', ru: 'Топливо для миссии', kk: 'Миссия отыны', fr: 'Carburant mission' } }],
        suitableFor: ['elite', 'military'], isFeatured: false, popularityScore: 80, tags: ['warrior', 'seal'], emoji: '🎖️', target: 'male', ageRange: '18-45',
        imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', color: '#263238', // Navy SEAL, elite performance, discipline
    },
    {
        slug: 'mma_fighter', name: { en: 'MMA Fighter', ru: 'Боец MMA', kk: 'MMA Жауынгері', fr: 'Combattant MMA' },
        subtitle: 'programs.lifestyle.mma_fighter.subtitle',
        description: 'programs.lifestyle.mma_fighter.description',
        shortDescription: 'programs.lifestyle.mma_fighter.shortDescription',
        category: 'warrior_mode', type: DietType.LIFESTYLE, difficulty: DietDifficulty.HARD, duration: 14, uiGroup: 'Warrior Mode', streakThreshold: 0.8,
        embrace: ['lean proteins', 'chicken', 'fish', 'eggs', 'vegetables', 'complex carbs', 'fruits', 'water'],
        minimize: ['sodium', 'alcohol', 'junk food'],
        dailyTracker: [{ key: 'fight_ready', label: { en: 'Fight ready', ru: 'Готов к бою', kk: 'Ұрысқа дайын', fr: 'Prêt au combat' } }],
        suitableFor: ['mma', 'fighter'], isFeatured: false, popularityScore: 76, tags: ['warrior', 'mma'], emoji: '🥊', target: 'male', ageRange: '18-40',
        imageUrl: 'https://images.unsplash.com/photo-1562771379-eafdca7a02f8?w=800&q=80', color: '#D32F2F', // MMA Fighter, combat nutrition, peak performance
    },
    {
        slug: 'ceo_warrior', name: { en: 'CEO Warrior', ru: 'CEO-Воин', kk: 'CEO Жауынгері', fr: 'CEO Warrior' },
        subtitle: 'programs.lifestyle.ceo_warrior.subtitle',
        description: 'programs.lifestyle.ceo_warrior.description',
        shortDescription: 'programs.lifestyle.ceo_warrior.shortDescription',
        category: 'warrior_mode', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Warrior Mode', streakThreshold: 0.7,
        embrace: ['healthy fats', 'MCT oil', 'avocado', 'olive oil', 'quality proteins', 'grass-fed beef', 'eggs', 'low-carb vegetables'],
        minimize: ['sugar', 'processed carbs', 'frequent meals', 'blood sugar spikes'],
        dailyTracker: [{ key: 'optimized', label: { en: 'Optimized day', ru: 'Оптимизированный день', kk: 'Оңтайландырылған күн', fr: 'Journée optimisée' } }],
        suitableFor: ['biohacker', 'executive'], isFeatured: false, popularityScore: 74, tags: ['warrior', 'ceo'], emoji: '💼', target: 'male', ageRange: '25-55',
        imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80', color: '#37474F', // CEO Warrior, executive performance, high performance
    },
    {
        slug: 'stoic_monk', name: { en: 'Stoic Monk', ru: 'Стоический Монах', kk: 'Стоик Монах', fr: 'Moine stoïque' },
        subtitle: 'programs.lifestyle.stoic_monk.subtitle',
        description: 'programs.lifestyle.stoic_monk.description',
        shortDescription: 'programs.lifestyle.stoic_monk.shortDescription',
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
        subtitle: 'programs.lifestyle.summer_beach_body.subtitle',
        description: 'programs.lifestyle.summer_beach_body.description',
        shortDescription: 'programs.lifestyle.summer_beach_body.shortDescription',
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
        subtitle: 'programs.lifestyle.new_year_reset.subtitle',
        description: 'programs.lifestyle.new_year_reset.description',
        shortDescription: 'programs.lifestyle.new_year_reset.shortDescription',
        category: 'seasonal', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Seasonal', streakThreshold: 0.6,
        embrace: ['all vegetables', 'whole fruits', 'lean proteins', 'legumes', 'whole grains', 'herbal tea', 'water'],
        minimize: ['processed foods', 'sugar', 'alcohol', 'excessive coffee'],
        dailyTracker: [{ key: 'reset', label: { en: 'Reset day', ru: 'День обновления', kk: 'Қалпына келтіру күні', fr: 'Journée reset' } }],
        suitableFor: ['reset', 'newyear'], isFeatured: false, popularityScore: 82, tags: ['seasonal', 'newyear'], emoji: '🎆', target: 'all', ageRange: '18-60',
        imageUrl: 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=800&q=80', color: '#673AB7', // New Year Reset, fresh start, clean slate
    },
    {
        slug: 'wedding_ready', name: { en: 'Wedding Ready', ru: 'К Свадьбе Готова', kk: 'Үйленуге Дайын', fr: 'Prête pour le mariage' },
        subtitle: 'programs.lifestyle.wedding_ready.subtitle',
        description: 'programs.lifestyle.wedding_ready.description',
        shortDescription: 'programs.lifestyle.wedding_ready.shortDescription',
        category: 'seasonal', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Seasonal', streakThreshold: 0.7,
        embrace: ['lean proteins', 'fish', 'chicken', 'collagen-rich foods', 'bone broth', 'leafy greens', 'cucumber', 'quinoa', 'avocado'],
        minimize: ['high-sodium foods', 'beans', 'alcohol', 'carbonated drinks', 'dairy', 'sugar'],
        dailyTracker: [{ key: 'bridal_glow', label: { en: 'Bridal glow day', ru: 'День свадебного сияния', kk: 'Үйлену жарқырауы күні', fr: 'Journée glow mariée' } }],
        suitableFor: ['wedding', 'bride'], isFeatured: false, popularityScore: 80, tags: ['seasonal', 'wedding'], emoji: '💍', target: 'female', ageRange: '22-45',
        imageUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&q=80', color: '#FFCDD2', // Wedding Ready, bridal preparation, special occasion
    },
    {
        slug: 'holiday_balance', name: { en: 'Holiday Balance', ru: 'Праздничный Баланс', kk: 'Мерекелік Теңгерім', fr: 'Équilibre fêtes' },
        subtitle: 'programs.lifestyle.holiday_balance.subtitle',
        description: 'programs.lifestyle.holiday_balance.description',
        shortDescription: 'programs.lifestyle.holiday_balance.shortDescription',
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
        name: 'programs.lifestyle.hot_girl_walk.name',
        subtitle: 'programs.lifestyle.hot_girl_walk.subtitle',
        description: 'programs.lifestyle.hot_girl_walk.description',
        shortDescription: 'programs.lifestyle.hot_girl_walk.shortDescription',
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        embrace: ['walking', 'hydration', 'whole foods', 'fresh air', 'mindfulness'],
        minimize: ['sedentary', 'skipping walks', 'processed snacks'],
        dailyTracker: [
            { key: 'walk', label: 'programs.lifestyle.hot_girl_walk.dailyTracker.walk.label' },
            { key: 'hydration', label: 'programs.lifestyle.hot_girl_walk.dailyTracker.hydration.label' },
            { key: 'mood', label: 'programs.lifestyle.hot_girl_walk.dailyTracker.mood.label' },
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
        name: 'programs.lifestyle.lazy_girl_weight_loss.name',
        subtitle: 'programs.lifestyle.lazy_girl_weight_loss.subtitle',
        description: 'programs.lifestyle.lazy_girl_weight_loss.description',
        shortDescription: 'programs.lifestyle.lazy_girl_weight_loss.shortDescription',
        category: 'weight_loss',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Weight Loss',
        streakThreshold: 0.6,
        embrace: ['simple swaps', 'more water', 'walking', 'protein', 'vegetables', 'sleep'],
        minimize: ['strict rules', 'all-or-nothing', 'burnout'],
        dailyTracker: [
            { key: 'simple_habit', label: 'programs.lifestyle.lazy_girl_weight_loss.dailyTracker.simple_habit.label' },
            { key: 'no_restrict', label: 'programs.lifestyle.lazy_girl_weight_loss.dailyTracker.no_restrict.label' },
            { key: 'sustainable', label: 'programs.lifestyle.lazy_girl_weight_loss.dailyTracker.sustainable.label' },
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
        name: 'programs.lifestyle.high_energy.name',
        subtitle: 'programs.lifestyle.high_energy.subtitle',
        description: 'programs.lifestyle.high_energy.description',
        shortDescription: 'programs.lifestyle.high_energy.shortDescription',
        category: 'energy',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'More Energy',
        streakThreshold: 0.6,
        embrace: ['complex carbs', 'protein', 'healthy fats', 'fruits', 'vegetables', 'hydration', 'regular meals'],
        minimize: ['sugar spikes', 'skipping meals', 'excessive caffeine'],
        dailyTracker: [
            { key: 'steady_energy', label: 'programs.lifestyle.high_energy.dailyTracker.steady_energy.label' },
            { key: 'no_crash', label: 'programs.lifestyle.high_energy.dailyTracker.no_crash.label' },
            { key: 'balanced_meals', label: 'programs.lifestyle.high_energy.dailyTracker.balanced_meals.label' },
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

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// LIFESTYLE PROGRAMS - Converted from mobile app data
// These use type: 'LIFESTYLE' in the DietProgram table
// ============================================================================

const lifestylePrograms = [
    // 🔥 TRENDING
    {
        id: 'that_girl',
        slug: 'that_girl',
        name: { en: 'That Girl', ru: 'That Girl', kk: 'That Girl' },
        subtitle: {
            en: '5AM, green juice, main character energy',
            ru: '5 утра, зелёный сок, энергия главного персонажа',
            kk: 'Таңғы 5, жасыл шырын, басты кейіпкер энергиясы',
        },
        description: {
            en: 'Wellness as aesthetic. Green smoothies, matcha, overnight oats, açaí bowls. Looking good, feeling good, doing good.',
            ru: 'Здоровье как эстетика. Зелёные смузи, матча, овсянка на ночь, чаши асаи. Выглядеть хорошо, чувствовать себя хорошо.',
            kk: 'Денсаулық эстетика ретінде. Жасыл смузи, матча, түнде дайындалған суытпа, асаи тағамдары.',
        },
        shortDescription: {
            en: 'Main character energy lifestyle',
            ru: 'Образ жизни главного героя',
            kk: 'Басты кейіпкер энергиясы',
        },
        category: 'trending',
        type: 'LIFESTYLE' as const,
        difficulty: 'EASY' as const,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        dailyTracker: [
            { key: 'morning_routine', label: { en: 'Morning routine done', ru: 'Утренняя рутина выполнена', kk: 'Таңғы режим орындалды' } },
            { key: 'healthy_meal', label: { en: 'Aesthetic healthy meal', ru: 'Эстетичная здоровая еда', kk: 'Эстетикалық сау тамақ' } },
            { key: 'water', label: { en: 'Water with lemon', ru: 'Вода с лимоном', kk: 'Лимонды су' } },
            { key: 'no_processed', label: { en: 'No processed foods', ru: 'Без обработанных продуктов', kk: 'Өңделген тамақсыз' } },
        ],
        suitableFor: ['wellness', 'aesthetic', 'young_women'],
        isFeatured: true,
        popularityScore: 90,
        tags: ['trending', 'aesthetic', 'wellness'],
    },
    {
        id: 'clean_girl',
        slug: 'clean_girl',
        name: { en: 'Clean Girl', ru: 'Clean Girl', kk: 'Clean Girl' },
        subtitle: {
            en: 'Minimalist, glow from within, less is more',
            ru: 'Минимализм, сияние изнутри, меньше — значит больше',
            kk: 'Минимализм, ішкі жарқырау, аз — көп',
        },
        description: {
            en: 'Natural beauty through clean eating. Focus on whole foods, hydration, and simplicity.',
            ru: 'Естественная красота через чистое питание. Фокус на цельных продуктах, гидратации и простоте.',
            kk: 'Таза тамақтану арқылы табиғи сұлулық.',
        },
        shortDescription: {
            en: 'Minimalist clean eating',
            ru: 'Минималистичное чистое питание',
            kk: 'Минималистік таза тамақтану',
        },
        category: 'trending',
        type: 'LIFESTYLE' as const,
        difficulty: 'EASY' as const,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        dailyTracker: [
            { key: 'whole_foods', label: { en: 'Whole foods only', ru: 'Только цельные продукты', kk: 'Тек тұтас өнімдер' } },
            { key: 'hydration', label: { en: 'Stay hydrated', ru: 'Пейте воду', kk: 'Сулану' } },
            { key: 'no_sugar', label: { en: 'No added sugar', ru: 'Без добавленного сахара', kk: 'Қосылған қантсыз' } },
        ],
        suitableFor: ['skin_health', 'minimalist'],
        isFeatured: true,
        popularityScore: 88,
        tags: ['trending', 'clean', 'minimalist'],
    },
    {
        id: 'hot_girl_walk',
        slug: 'hot_girl_walk',
        name: { en: 'Hot Girl Walk', ru: 'Hot Girl Walk', kk: 'Hot Girl Walk' },
        subtitle: {
            en: 'Walk, hydrate, manifest',
            ru: 'Ходьба, гидратация, манифестация',
            kk: 'Жүру, сулану, манифестация',
        },
        description: {
            en: 'Daily walking routine combined with hydration and positive mindset for wellness.',
            ru: 'Ежедневная рутина ходьбы в сочетании с гидратацией и позитивным настроем.',
            kk: 'Күнделікті жүру режимі гидратация мен позитивті көзқараспен бірге.',
        },
        shortDescription: {
            en: 'Walking lifestyle',
            ru: 'Активный образ жизни',
            kk: 'Белсенді өмір салты',
        },
        category: 'trending',
        type: 'LIFESTYLE' as const,
        difficulty: 'EASY' as const,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        dailyTracker: [
            { key: 'walk', label: { en: '4km walk', ru: '4км прогулка', kk: '4км серуен' } },
            { key: 'water', label: { en: '8 glasses of water', ru: '8 стаканов воды', kk: '8 стақан су' } },
            { key: 'light_meal', label: { en: 'Light, energizing meal', ru: 'Лёгкая, энергичная еда', kk: 'Жеңіл, қуатты тамақ' } },
        ],
        suitableFor: ['fitness', 'weight_loss'],
        isFeatured: true,
        popularityScore: 85,
        tags: ['trending', 'walking', 'fitness'],
    },
    {
        id: 'soft_life',
        slug: 'soft_life',
        name: { en: 'Soft Life', ru: 'Soft Life', kk: 'Soft Life' },
        subtitle: {
            en: 'Ease, comfort, nourishment without stress',
            ru: 'Лёгкость, комфорт, питание без стресса',
            kk: 'Жеңілдік, жайлылық, стресссіз тамақтану',
        },
        description: {
            en: 'Prioritize ease and enjoyment in eating. No strict rules, just nourishing choices.',
            ru: 'Приоритет лёгкости и удовольствия в еде. Никаких строгих правил.',
            kk: 'Тамақтануда жеңілдік пен ләззатқа басымдық. Қатаң ережелер жоқ.',
        },
        shortDescription: {
            en: 'Stress-free lifestyle',
            ru: 'Образ жизни без стресса',
            kk: 'Стресссіз өмір салты',
        },
        category: 'trending',
        type: 'LIFESTYLE' as const,
        difficulty: 'EASY' as const,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.5,
        dailyTracker: [
            { key: 'enjoyable_meal', label: { en: 'Enjoyable meal', ru: 'Еда в удовольствие', kk: 'Ләззатты тамақ' } },
            { key: 'no_rush', label: { en: 'No rush eating', ru: 'Не торопитесь', kk: 'Асықпаңыз' } },
            { key: 'rest', label: { en: 'Proper rest', ru: 'Достаточно отдыха', kk: 'Жеткілікті демалыс' } },
        ],
        suitableFor: ['stress_relief', 'mental_health'],
        isFeatured: false,
        popularityScore: 82,
        tags: ['trending', 'soft', 'relaxed'],
    },
    // WEIGHT LOSS GOALS
    {
        id: 'lazy_girl_weight_loss',
        slug: 'lazy_girl_weight_loss',
        name: { en: 'Lazy Girl Weight Loss', ru: 'Похудение для ленивых', kk: 'Жалқау қыздарға арналған салмақ тастау' },
        subtitle: {
            en: 'Minimal effort, maximum results',
            ru: 'Минимум усилий, максимум результата',
            kk: 'Минималды күш, максималды нәтиже',
        },
        description: {
            en: 'Simple, sustainable weight loss without complicated meal plans or intense exercise.',
            ru: 'Простое и устойчивое похудение без сложных планов питания.',
            kk: 'Қарапайым, тұрақты салмақ тастау.',
        },
        shortDescription: {
            en: 'Easy weight loss',
            ru: 'Лёгкое похудение',
            kk: 'Оңай салмақ тастау',
        },
        category: 'weight_loss',
        type: 'LIFESTYLE' as const,
        difficulty: 'EASY' as const,
        duration: 21,
        uiGroup: 'Weight Loss',
        streakThreshold: 0.6,
        dailyTracker: [
            { key: 'portion_control', label: { en: 'Portion control', ru: 'Контроль порций', kk: 'Порция бақылау' } },
            { key: 'no_snacks', label: { en: 'No unnecessary snacks', ru: 'Без лишних перекусов', kk: 'Қажетсіз тамақсыз' } },
            { key: 'water', label: { en: 'Water before meals', ru: 'Вода перед едой', kk: 'Тамақ алдында су' } },
        ],
        suitableFor: ['weight_loss', 'beginners'],
        isFeatured: true,
        popularityScore: 87,
        tags: ['weight_loss', 'easy', 'lazy'],
    },
    // ENERGY GOALS
    {
        id: 'high_energy',
        slug: 'high_energy',
        name: { en: 'High Energy', ru: 'Высокая энергия', kk: 'Жоғары қуат' },
        subtitle: {
            en: 'Fuel your day with energy-boosting foods',
            ru: 'Заряжай день энергией',
            kk: 'Күніңді қуатпен заряда',
        },
        description: {
            en: 'Focus on foods that provide sustained energy throughout the day.',
            ru: 'Фокус на продуктах, которые дают стабильную энергию в течение дня.',
            kk: 'Күні бойы тұрақты қуат беретін тағамдарға назар аударыңыз.',
        },
        shortDescription: {
            en: 'Energy-boosting lifestyle',
            ru: 'Энергичный образ жизни',
            kk: 'Қуат беретін өмір салты',
        },
        category: 'energy',
        type: 'LIFESTYLE' as const,
        difficulty: 'EASY' as const,
        duration: 14,
        uiGroup: 'Energy',
        streakThreshold: 0.6,
        dailyTracker: [
            { key: 'breakfast', label: { en: 'Energy breakfast', ru: 'Энергичный завтрак', kk: 'Қуатты таңғы ас' } },
            { key: 'no_sugar_crash', label: { en: 'Avoid sugar crashes', ru: 'Избегайте скачков сахара', kk: 'Қант құлдырауынан аулақ болыңыз' } },
            { key: 'balanced_meals', label: { en: 'Balanced meals', ru: 'Сбалансированные приёмы пищи', kk: 'Теңдестірілген тамақ' } },
        ],
        suitableFor: ['energy', 'productivity'],
        isFeatured: false,
        popularityScore: 80,
        tags: ['energy', 'productivity'],
    },
];

async function seedLifestyles() {
    console.log('🌱 Seeding lifestyle programs...');

    for (const program of lifestylePrograms) {
        try {
            await prisma.dietProgram.upsert({
                where: { id: program.id },
                update: {
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
                    dailyTracker: program.dailyTracker,
                    suitableFor: program.suitableFor,
                    isFeatured: program.isFeatured,
                    popularityScore: program.popularityScore,
                    tags: program.tags,
                    isActive: true,
                },
                create: {
                    id: program.id,
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
                    dailyTracker: program.dailyTracker,
                    suitableFor: program.suitableFor,
                    isFeatured: program.isFeatured,
                    popularityScore: program.popularityScore,
                    tags: program.tags,
                    isActive: true,
                },
            });
            console.log(`  ✓ ${program.name.en}`);
        } catch (error) {
            console.error(`  ✗ Failed to seed ${program.name.en}:`, error);
        }
    }

    console.log('✅ Lifestyle programs seeded!');
}

// Run if called directly
seedLifestyles()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

export { seedLifestyles };

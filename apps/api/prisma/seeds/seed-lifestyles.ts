import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// All 42 lifestyle program IDs from the mobile app
const ALL_LIFESTYLE_IDS = [
    'that_girl', 'clean_girl', 'old_money', 'tomato_girl_summer', 'pilates_princess',
    'coastal_grandmother', 'soft_life', 'mob_wife', 'summer_shred', 'metabolic_reset',
    'debloat_detox', 'sustainable_slim', 'lean_bulk', 'strength_athlete', 'athletic_performance',
    'functional_fitness', 'glass_skin', 'acne_clear', 'anti_aging_glow', 'all_day_energy',
    'brain_fuel', 'adrenal_recovery', 'amalfi_coast', 'greek_islands', 'okinawa_longevity',
    'tokyo_energy', 'scandi_hygge', '1950s_bombshell', 'prima_ballerina', 'french_girl',
    'pin_up_retro', 'minimalist_zen', 'spartan_warrior', 'viking_raider', 'navy_seal',
    'mma_fighter', 'ceo_warrior', 'stoic_monk', 'summer_beach_body', 'new_year_reset',
    'wedding_ready', 'holiday_balance'
];

// Category mappings
const CATEGORY_MAP: Record<string, { category: string; uiGroup: string }> = {
    that_girl: { category: 'trending', uiGroup: 'Trending' },
    clean_girl: { category: 'trending', uiGroup: 'Trending' },
    old_money: { category: 'trending', uiGroup: 'Trending' },
    tomato_girl_summer: { category: 'trending', uiGroup: 'Trending' },
    pilates_princess: { category: 'trending', uiGroup: 'Trending' },
    coastal_grandmother: { category: 'trending', uiGroup: 'Trending' },
    soft_life: { category: 'trending', uiGroup: 'Trending' },
    mob_wife: { category: 'trending', uiGroup: 'Trending' },
    summer_shred: { category: 'weight_loss', uiGroup: 'Weight Loss' },
    metabolic_reset: { category: 'weight_loss', uiGroup: 'Weight Loss' },
    debloat_detox: { category: 'weight_loss', uiGroup: 'Weight Loss' },
    sustainable_slim: { category: 'weight_loss', uiGroup: 'Weight Loss' },
    lean_bulk: { category: 'muscle', uiGroup: 'Build Muscle' },
    strength_athlete: { category: 'muscle', uiGroup: 'Build Muscle' },
    athletic_performance: { category: 'muscle', uiGroup: 'Build Muscle' },
    functional_fitness: { category: 'muscle', uiGroup: 'Build Muscle' },
    glass_skin: { category: 'skin', uiGroup: 'Clear Skin' },
    acne_clear: { category: 'skin', uiGroup: 'Clear Skin' },
    anti_aging_glow: { category: 'skin', uiGroup: 'Clear Skin' },
    all_day_energy: { category: 'energy', uiGroup: 'More Energy' },
    brain_fuel: { category: 'energy', uiGroup: 'More Energy' },
    adrenal_recovery: { category: 'energy', uiGroup: 'More Energy' },
    amalfi_coast: { category: 'destinations', uiGroup: 'Destinations' },
    greek_islands: { category: 'destinations', uiGroup: 'Destinations' },
    okinawa_longevity: { category: 'destinations', uiGroup: 'Destinations' },
    tokyo_energy: { category: 'destinations', uiGroup: 'Destinations' },
    scandi_hygge: { category: 'destinations', uiGroup: 'Destinations' },
    '1950s_bombshell': { category: 'aesthetics', uiGroup: 'Aesthetics' },
    prima_ballerina: { category: 'aesthetics', uiGroup: 'Aesthetics' },
    french_girl: { category: 'aesthetics', uiGroup: 'Aesthetics' },
    pin_up_retro: { category: 'aesthetics', uiGroup: 'Aesthetics' },
    minimalist_zen: { category: 'aesthetics', uiGroup: 'Aesthetics' },
    spartan_warrior: { category: 'warrior', uiGroup: 'Warrior Mode' },
    viking_raider: { category: 'warrior', uiGroup: 'Warrior Mode' },
    navy_seal: { category: 'warrior', uiGroup: 'Warrior Mode' },
    mma_fighter: { category: 'warrior', uiGroup: 'Warrior Mode' },
    ceo_warrior: { category: 'warrior', uiGroup: 'Warrior Mode' },
    stoic_monk: { category: 'warrior', uiGroup: 'Warrior Mode' },
    summer_beach_body: { category: 'seasonal', uiGroup: 'Seasonal' },
    new_year_reset: { category: 'seasonal', uiGroup: 'Seasonal' },
    wedding_ready: { category: 'seasonal', uiGroup: 'Seasonal' },
    holiday_balance: { category: 'seasonal', uiGroup: 'Seasonal' },
};

// Human-readable names
const NAMES: Record<string, { en: string; ru: string; kk: string }> = {
    that_girl: { en: 'That Girl', ru: 'That Girl', kk: 'That Girl' },
    clean_girl: { en: 'Clean Girl', ru: 'Clean Girl', kk: 'Clean Girl' },
    old_money: { en: 'Old Money', ru: 'Старые Деньги', kk: 'Ескі Ақша' },
    tomato_girl_summer: { en: 'Tomato Girl Summer', ru: 'Лето Томатной Девушки', kk: 'Қызанақ Қыз Жаз' },
    pilates_princess: { en: 'Pilates Princess', ru: 'Принцесса Пилатеса', kk: 'Пилатес Ханшасы' },
    coastal_grandmother: { en: 'Coastal Grandmother', ru: 'Прибрежная Бабушка', kk: 'Жағалау Әжесі' },
    soft_life: { en: 'Soft Life', ru: 'Мягкая Жизнь', kk: 'Жұмсақ Өмір' },
    mob_wife: { en: 'Mob Wife', ru: 'Жена Мафиози', kk: 'Мафия Әйелі' },
    summer_shred: { en: 'Summer Shred', ru: 'Летняя Сушка', kk: 'Жаздық Сушка' },
    metabolic_reset: { en: 'Metabolic Reset', ru: 'Метаболический Сброс', kk: 'Метаболизм Қалпына Келтіру' },
    debloat_detox: { en: 'Debloat Detox', ru: 'Детокс от Вздутия', kk: 'Ісіну Детоксы' },
    sustainable_slim: { en: 'Sustainable Slim', ru: 'Устойчивая Стройность', kk: 'Тұрақты Арықтық' },
    lean_bulk: { en: 'Lean Bulk', ru: 'Качественный Набор', kk: 'Сапалы Жинау' },
    strength_athlete: { en: 'Strength Athlete', ru: 'Силовой Атлет', kk: 'Күш Атлеті' },
    athletic_performance: { en: 'Athletic Performance', ru: 'Спортивная Форма', kk: 'Спорттық Форма' },
    functional_fitness: { en: 'Functional Fitness', ru: 'Функциональный Фитнес', kk: 'Функционалды Фитнес' },
    glass_skin: { en: 'Glass Skin', ru: 'Стеклянная Кожа', kk: 'Шыны Тері' },
    acne_clear: { en: 'Acne Clear', ru: 'Чистая Кожа', kk: 'Таза Тері' },
    anti_aging_glow: { en: 'Anti-Aging Glow', ru: 'Антивозрастное Сияние', kk: 'Қартаюға Қарсы Жарқырау' },
    all_day_energy: { en: 'All-Day Energy', ru: 'Энергия на Весь День', kk: 'Күні Бойы Энергия' },
    brain_fuel: { en: 'Brain Fuel', ru: 'Топливо для Мозга', kk: 'Ми Отыны' },
    adrenal_recovery: { en: 'Adrenal Recovery', ru: 'Восстановление Надпочечников', kk: 'Бүйрек Үсті Қалпына Келтіру' },
    amalfi_coast: { en: 'Amalfi Coast', ru: 'Амальфи', kk: 'Амальфи Жағалауы' },
    greek_islands: { en: 'Greek Islands', ru: 'Греческие Острова', kk: 'Грек Аралдары' },
    okinawa_longevity: { en: 'Okinawa Longevity', ru: 'Долголетие Окинавы', kk: 'Окинава Ұзақ Өмір' },
    tokyo_energy: { en: 'Tokyo Energy', ru: 'Энергия Токио', kk: 'Токио Энергиясы' },
    scandi_hygge: { en: 'Scandi Hygge', ru: 'Скандинавский Хюгге', kk: 'Скандинавиялық Хюгге' },
    '1950s_bombshell': { en: '1950s Bombshell', ru: 'Бомба 1950-х', kk: '1950-жылдар Бомбасы' },
    prima_ballerina: { en: 'Prima Ballerina', ru: 'Прима-Балерина', kk: 'Прима-Балерина' },
    french_girl: { en: 'French Girl', ru: 'Французская Девушка', kk: 'Француз Қызы' },
    pin_up_retro: { en: 'Pin-Up Retro', ru: 'Пин-Ап Ретро', kk: 'Пин-Ап Ретро' },
    minimalist_zen: { en: 'Minimalist Zen', ru: 'Минималист Дзен', kk: 'Минималист Дзен' },
    spartan_warrior: { en: 'Spartan Warrior', ru: 'Спартанский Воин', kk: 'Спарта Жауынгері' },
    viking_raider: { en: 'Viking Raider', ru: 'Викинг-Рейдер', kk: 'Викинг-Рейдер' },
    navy_seal: { en: 'Navy SEAL', ru: 'Морской Котик', kk: 'Теңіз Мысығы' },
    mma_fighter: { en: 'MMA Fighter', ru: 'Боец MMA', kk: 'MMA Жауынгері' },
    ceo_warrior: { en: 'CEO Warrior', ru: 'CEO-Воин', kk: 'CEO-Жауынгер' },
    stoic_monk: { en: 'Stoic Monk', ru: 'Стоик-Монах', kk: 'Стоик-Монах' },
    summer_beach_body: { en: 'Summer Beach Body', ru: 'Летнее Пляжное Тело', kk: 'Жаздық Пляж Денесі' },
    new_year_reset: { en: 'New Year Reset', ru: 'Новогодний Сброс', kk: 'Жаңа Жыл Қалпына Келтіру' },
    wedding_ready: { en: 'Wedding Ready', ru: 'Готова к Свадьбе', kk: 'Тойға Дайын' },
    holiday_balance: { en: 'Holiday Balance', ru: 'Праздничный Баланс', kk: 'Мерекелік Теңгерім' },
};

// Generate default daily tracker items
function getDefaultDailyTracker(id: string): Array<{ key: string; label: Record<string, string> }> {
    const category = CATEGORY_MAP[id]?.category || 'lifestyle';

    const trackers: Record<string, Array<{ key: string; label: Record<string, string> }>> = {
        trending: [
            { key: 'morning_routine', label: { en: 'Morning routine', ru: 'Утренняя рутина', kk: 'Таңғы режим' } },
            { key: 'healthy_meal', label: { en: 'Healthy meal', ru: 'Здоровая еда', kk: 'Сау тамақ' } },
            { key: 'hydration', label: { en: 'Stay hydrated', ru: 'Пейте воду', kk: 'Су ішу' } },
            { key: 'mindful', label: { en: 'Mindful eating', ru: 'Осознанное питание', kk: 'Саналы тамақтану' } },
        ],
        weight_loss: [
            { key: 'portion', label: { en: 'Portion control', ru: 'Контроль порций', kk: 'Порция бақылау' } },
            { key: 'protein', label: { en: 'Protein at each meal', ru: 'Белок в каждом приёме', kk: 'Әр тамақта белок' } },
            { key: 'vegetables', label: { en: 'Vegetables', ru: 'Овощи', kk: 'Көкөністер' } },
            { key: 'no_snacks', label: { en: 'No unnecessary snacks', ru: 'Без лишних перекусов', kk: 'Қажетсіз тамақсыз' } },
        ],
        muscle: [
            { key: 'protein_goal', label: { en: 'Hit protein goal', ru: 'Достичь цели по белку', kk: 'Белок мақсатына жету' } },
            { key: 'training', label: { en: 'Training nutrition', ru: 'Питание для тренировок', kk: 'Жаттығу тағамы' } },
            { key: 'recovery', label: { en: 'Recovery meal', ru: 'Восстановительная еда', kk: 'Қалпына келтіру тағамы' } },
            { key: 'sleep', label: { en: 'Quality sleep', ru: 'Качественный сон', kk: 'Сапалы ұйқы' } },
        ],
        skin: [
            { key: 'water', label: { en: 'Drink enough water', ru: 'Пейте достаточно воды', kk: 'Жеткілікті су ішу' } },
            { key: 'antioxidants', label: { en: 'Antioxidant-rich foods', ru: 'Продукты с антиоксидантами', kk: 'Антиоксидантқа бай тағамдар' } },
            { key: 'no_sugar', label: { en: 'Limit sugar', ru: 'Ограничьте сахар', kk: 'Қантты шектеу' } },
            { key: 'omega3', label: { en: 'Omega-3 foods', ru: 'Продукты с омега-3', kk: 'Омега-3 тағамдар' } },
        ],
        energy: [
            { key: 'breakfast', label: { en: 'Energy breakfast', ru: 'Энергичный завтрак', kk: 'Қуатты таңғы ас' } },
            { key: 'balanced', label: { en: 'Balanced meals', ru: 'Сбалансированные приёмы', kk: 'Теңгерімді тамақ' } },
            { key: 'no_crash', label: { en: 'Avoid sugar crashes', ru: 'Избегайте скачков сахара', kk: 'Қант құлдырауынан аулақ болыңыз' } },
            { key: 'hydration', label: { en: 'Stay hydrated', ru: 'Пейте воду', kk: 'Су ішу' } },
        ],
        destinations: [
            { key: 'local_foods', label: { en: 'Local-inspired foods', ru: 'Местные продукты', kk: 'Жергілікті тағамдар' } },
            { key: 'mindful', label: { en: 'Mindful eating', ru: 'Осознанное питание', kk: 'Саналы тамақтану' } },
            { key: 'fresh', label: { en: 'Fresh ingredients', ru: 'Свежие ингредиенты', kk: 'Жаңа ингредиенттер' } },
            { key: 'balance', label: { en: 'Balance', ru: 'Баланс', kk: 'Теңгерім' } },
        ],
        aesthetics: [
            { key: 'aesthetic_meal', label: { en: 'Aesthetic meal', ru: 'Эстетичная еда', kk: 'Эстетикалық тамақ' } },
            { key: 'portion', label: { en: 'Mindful portions', ru: 'Осознанные порции', kk: 'Саналы порциялар' } },
            { key: 'quality', label: { en: 'Quality over quantity', ru: 'Качество важнее количества', kk: 'Сапа сандан маңыздырақ' } },
            { key: 'treat', label: { en: 'Intentional treats', ru: 'Осознанные сладости', kk: 'Саналы тәттілер' } },
        ],
        warrior: [
            { key: 'discipline', label: { en: 'Disciplined eating', ru: 'Дисциплинированное питание', kk: 'Тәртіпті тамақтану' } },
            { key: 'protein', label: { en: 'High protein', ru: 'Высокий белок', kk: 'Жоғары белок' } },
            { key: 'no_junk', label: { en: 'No junk food', ru: 'Без вредной еды', kk: 'Зиянды тамақсыз' } },
            { key: 'performance', label: { en: 'Performance fuel', ru: 'Топливо для производительности', kk: 'Өнімділік отыны' } },
        ],
        seasonal: [
            { key: 'seasonal_foods', label: { en: 'Seasonal foods', ru: 'Сезонные продукты', kk: 'Маусымдық тағамдар' } },
            { key: 'balance', label: { en: 'Stay balanced', ru: 'Сохраняйте баланс', kk: 'Теңгерімді болыңыз' } },
            { key: 'mindful', label: { en: 'Mindful choices', ru: 'Осознанный выбор', kk: 'Саналы таңдау' } },
            { key: 'enjoy', label: { en: 'Enjoy responsibly', ru: 'Наслаждайтесь ответственно', kk: 'Жауапкершілікпен ләззат алыңыз' } },
        ],
    };

    return trackers[category] || trackers.trending;
}

async function seedLifestyles() {
    console.log('🌱 Seeding all 42 lifestyle programs...');
    let created = 0;
    let updated = 0;

    for (const id of ALL_LIFESTYLE_IDS) {
        const categoryInfo = CATEGORY_MAP[id] || { category: 'lifestyle', uiGroup: 'Lifestyle' };
        const name = NAMES[id] || { en: id, ru: id, kk: id };

        try {
            const result = await prisma.dietProgram.upsert({
                where: { id },
                update: {
                    name,
                    category: categoryInfo.category,
                    type: 'LIFESTYLE',
                    uiGroup: categoryInfo.uiGroup,
                    dailyTracker: getDefaultDailyTracker(id),
                    isActive: true,
                },
                create: {
                    id,
                    slug: id,
                    name,
                    subtitle: { en: '', ru: '', kk: '' },
                    description: { en: '', ru: '', kk: '' },
                    shortDescription: { en: '', ru: '', kk: '' },
                    category: categoryInfo.category,
                    type: 'LIFESTYLE',
                    difficulty: 'EASY',
                    duration: 14,
                    uiGroup: categoryInfo.uiGroup,
                    streakThreshold: 0.6,
                    dailyTracker: getDefaultDailyTracker(id),
                    suitableFor: [categoryInfo.category],
                    isFeatured: ['that_girl', 'okinawa_longevity', 'summer_shred'].includes(id),
                    popularityScore: 80,
                    tags: [categoryInfo.category, 'lifestyle'],
                    isActive: true,
                },
            });

            if (result) {
                console.log(`  ✓ ${name.en}`);
                created++;
            }
        } catch (error) {
            console.error(`  ✗ Failed to seed ${id}:`, error);
        }
    }

    console.log(`\n✅ Lifestyle programs seeded: ${created} total`);
}

seedLifestyles()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

export { seedLifestyles };

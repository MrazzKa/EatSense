import { PrismaClient, Prisma, DietType, DietDifficulty } from '@prisma/client';

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
    howItWorks?: { [key: string]: string[] } | any;
    previewDays?: any;
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
            de: `Dieses Mädchen`,
            es: `esa chica`
        },
        subtitle: {
            en: 'Become your best self',
            ru: 'Стань лучшей версией себя',
            kk: 'Өзіңнің ең жақсы нұсқаң бол',
            fr: 'Deviens ta meilleure version',
            de: `Werde dein bestes Selbst`,
            es: `Conviértete en tu mejor yo`
        },
        description: {
            en: 'The "That Girl" aesthetic is about becoming the healthiest, most productive version of yourself. Focuses on morning routines, clean eating, fitness, and self-care.',
            ru: 'Эстетика "Той самой девушки" - это путь к самой здоровой и продуктивной версии себя. Фокус на утренних ритуалах, чистом питании, фитнесе и заботе о себе.',
            kk: '"Сол қыз" эстетикасы - өзіңнің ең салауатты және өнімді нұсқаң болу. Таңғы ырымдар, таза тамақтану, фитнес және өзіне қамқор.',
            fr: 'L\'esthétique "Cette Fille" consiste à devenir la version la plus saine et productive de vous-même.',
            de: `Bei der „That Girl“-Ästhetik geht es darum, die gesündeste und produktivste Version deiner selbst zu werden. Der Schwerpunkt liegt auf Morgenroutinen, Clean Eating, Fitness und Selbstpflege.`,
            es: `La estética de "Esa chica" trata de convertirse en la versión más saludable y productiva de ti mismo. Se centra en las rutinas matutinas, la alimentación sana, el ejercicio físico y el cuidado personal.`
        },
        shortDescription: {
            en: 'Wellness aesthetic lifestyle',
            ru: 'Велнес-эстетика образа жизни',
            kk: 'Сауықтыру эстетикалық өмір салты',
            fr: 'Style de vie esthétique bien-être',
            de: `Wellness-ästhetischer Lebensstil`,
            es: `Estilo de vida estético y de bienestar.`
        },
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        howItWorks: {
            en: [
                'The TikTok-born wellness lifestyle: early mornings, matcha lattes, aesthetic meal prep, journaling, and pilates. It\'s about looking and feeling like you have your life together through intentional daily rituals.',
                'Nutrition centers on photogenic, nutrient-dense foods: smoothie bowls topped with perfectly arranged fruit, overnight oats in mason jars, avocado toast with microgreens, and colorful grain bowls.',
                'It\'s not about restriction - it\'s about abundance of good things. Green juice accompanies breakfast, not replaces it. The philosophy is \'add more good\' rather than \'cut out bad\'.',
                'The morning routine is sacred. Waking early, lemon water, movement, shower, healthy breakfast, journaling. This structure creates momentum that carries through the entire day.'
            ],
            ru: [
                'Велнес-эстетика из TikTok: ранние подъемы, матча-латте, красивый фуд-преп, ведение дневника и пилатес. Это ощущение того, что твоя жизнь под контролем благодаря осознанным ежедневным ритуалам.',
                'Питание строится вокруг фотогеничной, нутритивно-плотной еды: смузи-боулы с идеально выложенными фруктами, ленивая овсянка в баночках, авокадо-тосты с микрозеленью и яркие боулы с крупами.',
                'Это не про ограничения, это про изобилие полезного. Зеленый сок дополняет завтрак, а не заменяет его. Философия гласит: «добавляй полезное», а не «исключай вредное».',
                'Утренняя рутина священна: проснуться рано, выпить воду с лимоном, размяться, принять душ, съесть здоровый завтрак и сделать запись в дневнике. Эта структура создает импульс на весь день.'
            ],
            kk: [
                'TikTok-тан шыққан сауықтыру эстетикасы: ерте тұру, матча-латте, әдемі тамақ дайындау, күнделік жүргізу және пилатес. Бұл саналы күнделікті ритуалдар арқылы өміріңіздің өз қолыңызда екенін сезіну.',
                'Тамақтану фотогеникалық, нәрлі тағамдарға негізделген: жемістері тамаша орналасқан смузи-боулдар, құмырадағы сұлы ботқасы, микрожасыл қосылған авокадо тосттары және түрлі-түсті боулдар.',
                'Бұл шектеулер туралы емес - бұл пайдалы нәрселердің молынан болуы туралы. Жасыл шырын таңғы асты алмастырмайды, толықтырады. Философия: «зиянын алып тастау» емес, «пайдалысын қосу».',
                'Таңғы ритуал киелі: ерте ояну, лимон қосылған су, жаттығу, душқа түсу, пайдалы таңғы ас және күнделікке жазу. Бұл жүйе күні бойына серпін береді.'
            ],
            fr: [
                'Le style de vie bien-être né sur TikTok : matins tôt, lattes au matcha, préparation de repas esthétiques, journal et pilates. Le sentiment d\'avoir sa vie en main grâce à des rituels.',
                'La nutrition est centrée sur des aliments photogéniques et denses en nutriments : smoothie bowls, porridge, toasts à l\'avocat et bowls colorés.',
                'Il ne s\'agit pas de restrictions, mais d\'une abondance de bonnes choses. La philosophie est d\'« ajouter plus de bon » plutôt que de « couper le mauvais ».',
                'La routine matinale est sacrée. Eau citronnée, mouvement, douche, petit-déjeuner sain, journal. Cette structure crée un élan pour toute la journée.'
            ],
            de: [
                'Der TikTok-Wellness-Lifestyle: frühes Aufstehen, Matcha-Lattes, ästhetisches Meal-Prep, Journaling und Pilates. Durch bewusste Rituale das Leben im Griff haben.',
                'Die Ernährung konzentriert sich auf fotogene, nährstoffreiche Lebensmittel: Smoothie-Bowls, Overnight-Oats, Avocado-Toast und bunte Grain-Bowls.',
                'Es geht nicht um Verzicht – es geht um eine Fülle guter Dinge. Die Philosophie lautet: "mehr Gutes hinzufügen" statt "Schlechtes weglassen".',
                'Die Morgenroutine ist heilig. Zitronenwasser, Bewegung, Dusche, gesundes Frühstück, Journaling. Diese Struktur schafft Schwung für den Tag.'
            ],
            es: [
                'El estilo de vida de bienestar nacido en TikTok: madrugones, matcha lattes, preparación estética de comidas, diario íntimo y pilates.',
                'La nutrición se centra en alimentos fotogénicos y ricos en nutrientes: boles de batidos, avena nocturna, tostadas de aguacate y boles de cereales.',
                'No se trata de restricciones, sino de abundancia de cosas buenas. La filosofía es "agregar más cosas buenas" en lugar de "eliminar las malas".',
                'La rutina matutina es sagrada. Agua con limón, movimiento, ducha, desayuno saludable, diario. Crea un impulso para todo el día.'
            ]
        },
        embrace: ['green smoothies', 'matcha', 'overnight oats', 'açaí bowls', 'avocado toast', 'Buddha bowls', 'lean proteins', 'fresh salads', 'chia seeds', 'berries', 'lemon water'],
        minimize: ['processed foods', 'fast food', 'excessive sugar', 'alcohol', 'caffeine after 2pm', 'heavy dinners'],
        dailyTracker: [
            {
                key: 'morning_routine', label: {
                    en: 'Morning routine completed', ru: 'Утренний ритуал выполнен', kk: 'Таңғы ырым орындалды', fr: 'Routine matinale terminée',
                    de: `Morgenroutine abgeschlossen`,
                    es: `Rutina matutina completada`
                }
            },
            {
                key: 'green_juice', label: {
                    en: 'Green juice or smoothie', ru: 'Зелёный сок или смузи', kk: 'Жасыл шырын немесе смузи', fr: 'Jus vert ou smoothie',
                    de: `Grüner Saft oder Smoothie`,
                    es: `Jugo o batido verde`
                }
            },
            {
                key: 'aesthetic_meal', label: {
                    en: 'Aesthetic healthy meal', ru: 'Эстетичная здоровая еда', kk: 'Эстетикалық салауатты тамақ', fr: 'Repas sain esthétique',
                    de: `Ästhetische gesunde Mahlzeit`,
                    es: `Comida saludable y estética`
                }
            },
            {
                key: 'hydration', label: {
                    en: '2L of water', ru: '2 литра воды', kk: '2 литр су', fr: '2L d\'eau',
                    de: `2L Wasser`,
                    es: `2 litros de agua`
                }
            },
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
            de: `Sauberes Mädchen`,
            es: `chica limpia`
        },
        subtitle: {
            en: 'Minimal, natural beauty',
            ru: 'Минимализм и естественная красота',
            kk: 'Минимализм және табиғи сұлулық',
            fr: 'Beauté naturelle et minimale',
            de: `Minimale, natürliche Schönheit`,
            es: `Belleza minimalista y natural`
        },
        description: {
            en: 'The Clean Girl aesthetic emphasizes natural beauty, minimal makeup, and clean eating. Focus on whole foods that nourish your skin from within.',
            ru: 'Эстетика "Чистой девушки" подчеркивает естественную красоту, минимальный макияж и чистое питание. Фокус на цельных продуктах, питающих кожу изнутри.',
            kk: '"Таза қыз" эстетикасы табиғи сұлулықты, минималды макияжды және таза тамақтануды ерекшелейді.',
            fr: 'L\'esthétique Clean Girl met l\'accent sur la beauté naturelle, le maquillage minimal et l\'alimentation propre.',
            de: `Die Clean Girl-Ästhetik legt Wert auf natürliche Schönheit, minimales Make-up und sauberes Essen. Konzentrieren Sie sich auf Vollwertkost, die Ihre Haut von innen nährt.`,
            es: `La estética de Clean Girl enfatiza la belleza natural, el maquillaje mínimo y una alimentación limpia. Concéntrate en alimentos integrales que nutran tu piel desde dentro.`
        },
        shortDescription: {
            en: 'Natural glow lifestyle',
            ru: 'Образ жизни с естественным сиянием',
            kk: 'Табиғи жарқырау өмір салты',
            fr: 'Style de vie éclat naturel',
            de: `Natürlich strahlender Lebensstil`,
            es: `Estilo de vida con brillo natural`
        },
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        howItWorks: {
            en: [
                'Dewy skin, slicked-back hair, gold hoops, and a diet that matches - simple, minimal, effective. Your skin reflects what you eat, and the Clean Girl understands this deeply.',
                'The approach is minimalist: few ingredients, high quality, maximum hydration. Think warm lemon water, simple grain bowls, lots of raw vegetables, herbal tea, and foods rich in omega-3s, zinc, and vitamin E.',
                'No complicated meal prep, no exotic superfoods, no expensive supplements. Just water, sleep, whole foods, and consistency. The best beauty investment is a full fridge of vegetables and a good night\'s sleep.',
                'Portion sizes are intuitive - eat when hungry, stop when satisfied. No tracking, no macros. Food should be as close to its natural state as possible.'
            ],
            ru: [
                'Свежая кожа, гладко зачесанные волосы, золотые серьги-кольца и соответствующее питание - простое, минималистичное, эффективное. Состояние вашей кожи отражает то, что вы едите, и «Чистая девушка» это прекрасно понимает.',
                'Минималистичный подход: минимум ингредиентов, высокое качество, максимальное увлажнение. Теплая вода с лимоном, простые боулы с крупами, много свежих овощей, травяной чай и продукты, богатые омега-3, цинком и витамином Е.',
                'Никакой сложной готовки, экзотических суперфудов и дорогих добавок. Только вода, сон, цельные продукты и постоянство. Лучшая инвестиция в красоту - полный холодильник овощей и крепкий сон.',
                'Интуитивный контроль порций - ешьте, когда голодны, останавливайтесь, когда сыты. Никакого подсчета калорий или макронутриентов. Еда должна быть максимально близка к своему естественному состоянию.'
            ],
            kk: [
                'Жарқыраған тері, тегіс таралған шаш, алтын сырғалар және соған сәйкес тамақтану - қарапайым, минималды, тиімді. Теріңіздің жағдайы не жейтініңізді көрсетеді және «Таза қыз» мұны жақсы түсінеді.',
                'Минималистік тәсіл: аз ғана ингредиенттер, жоғары сапа, барынша ылғалдану. Лимон қосылған жылы су, қарапайым жарма боулдары, көптеген жаңа піскен көкөністер, шөп шайы және омега-3, мырыш, Е витаминіне бай тағамдар.',
                'Күрделі тамақ дайындау, экзотикалық суперфудтар және қымбат қоспалар жоқ. Тек су, ұйқы, тұтас тағамдар және тұрақтылық. Сұлулыққа салынған ең жақсы инвестиция - көкөністерге толы тоңазытқыш және тыныш ұйқы.',
                'Порцияларды интуитивті бақылау - қарныңыз ашқанда жеңіз, тойғанда тоқтатыңыз. Калорияларды немесе макронутриенттерді санаудың қажеті жоқ. Тамақ табиғи қалпына барынша жақын болуы керек.'
            ],
            fr: [
                'Peau lumineuse, cheveux lisses, créoles en or et régime à l\'avenant : simple, minimal, efficace. Votre peau reflète ce que vous mangez, et la Clean Girl le comprend profondément.',
                'L\'approche est minimaliste : peu d\'ingrédients, grande qualité, hydratation maximale. Eau chaude citronnée, bols de céréales simples, beaucoup de légumes crus, tisane et aliments riches en oméga-3, zinc et vitamine E.',
                'Pas de préparation de repas compliquée. Juste de l\'eau, du sommeil, des aliments entiers et de la constance. Le meilleur investissement beauté est un frigo plein de légumes et une bonne nuit de sommeil.',
                'Les portions sont intuitives : mangez quand vous avez faim, arrêtez quand vous êtes rassasié. Pas de comptage de calories ou macros. Les aliments doivent être le plus près possible de leur état naturel.'
            ],
            de: [
                'Strahlende Haut, zurückgekämmte Haare, goldene Creolen und eine dazu passende Ernährung – einfach, minimal, effektiv. Ihre Haut spiegelt wider, was Sie essen, und das Clean Girl versteht das voll und ganz.',
                'Der Ansatz ist minimalistisch: wenige Zutaten, hohe Qualität, maximale Feuchtigkeitsversorgung. Warmes Zitronenwasser, einfache Getreide-Bowls, viel rohes Gemüse, Kräutertee und Lebensmittel reich an Omega-3, Zink und Vitamin E.',
                'Kein kompliziertes Meal-Prep. Nur Wasser, Schlaf, Vollwertkost und Beständigkeit. Die beste Schönheitsinvestition ist ein voller Kühlschrank mit Gemüse und eine gute Mütze voll Schlaf.',
                'Portionsgrößen sind intuitiv – essen Sie, wenn Sie hungrig sind, hören Sie auf, wenn Sie satt sind. Kein Tracking, keine Makros. Die Nahrung sollte so naturbelassen wie möglich sein.'
            ],
            es: [
                'Piel luminosa, cabello engominado hacia atrás, aros de oro y una dieta a juego: simple, mínima, efectiva. Tu piel refleja lo que comes, y la Clean Girl lo entiende profundamente.',
                'El enfoque es minimalista: pocos ingredientes, alta calidad, máxima hidratación. Agua tibia con limón, boles de cereales simples, muchas verduras crudas, té de hierbas y alimentos ricos en omega-3, zinc y vitamina E.',
                'Sin preparación de comidas complicadas. Solo agua, sueño, alimentos integrales y constancia. La mejor inversión en belleza es un refrigerador lleno de verduras y una buena noche de sueño.',
                'El tamaño de las porciones es intuitivo: come cuando tengas hambre, detente cuando estés satisfecho. Sin seguimiento, sin macros. La comida debe estar lo más cerca posible de su estado natural.'
            ]
        },
        embrace: ['whole foods', 'vegetables', 'leafy greens', 'cucumber', 'berries', 'citrus', 'lean proteins', 'eggs', 'fish', 'avocado', 'olive oil', 'nuts', 'water', 'herbal tea'],
        minimize: ['processed foods', 'sugar', 'dairy', 'excessive caffeine', 'alcohol', 'fried foods'],
        dailyTracker: [
            {
                key: 'whole_foods', label: {
                    en: 'Whole foods only', ru: 'Только цельные продукты', kk: 'Тек тұтас тағамдар', fr: 'Aliments entiers uniquement',
                    de: `Nur Vollwertkost`,
                    es: `Solo alimentos integrales`
                }
            },
            {
                key: 'hydration', label: {
                    en: '2L+ of water', ru: '2+ литра воды', kk: '2+ литр су', fr: '2L+ d\'eau',
                    de: `2L+ Wasser`,
                    es: `2L+ de agua`
                }
            },
            {
                key: 'simple_meal', label: {
                    en: 'Simple clean meal', ru: 'Простая чистая еда', kk: 'Қарапайым таза тамақ', fr: 'Repas simple et propre',
                    de: `Einfache, saubere Mahlzeit`,
                    es: `Comida sencilla y limpia`
                }
            },
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
            de: `Altes Geld`,
            es: `dinero viejo`
        },
        subtitle: {
            en: 'Quiet luxury living',
            ru: 'Тихая роскошь',
            kk: 'Тыныш сәнділік',
            fr: 'Luxe discret',
            de: `Ruhiges Luxusleben`,
            es: `Vida tranquila y lujosa`
        },
        description: {
            en: 'Embrace timeless elegance and quality over trends. Old Money aesthetic focuses on classic, high-quality ingredients and proper dining etiquette.',
            ru: 'Выберите вечную элегантность и качество вместо трендов. Эстетика "Старых денег" фокусируется на классических, качественных ингредиентах и правильном этикете.',
            kk: 'Трендтердің орнына мәңгі талғампаздық пен сапаны таңдаңыз. "Ескі ақша" эстетикасы классикалық, сапалы ингредиенттер мен дұрыс этикетке бағытталған.',
            fr: 'Adoptez l\'élégance intemporelle et la qualité plutôt que les tendances.',
            de: `Setzen Sie auf zeitlose Eleganz und Qualität statt auf Trends. Die Ästhetik von Old Money konzentriert sich auf klassische, hochwertige Zutaten und die richtige Etikette beim Essen.`,
            es: `Adopte la elegancia y la calidad atemporales por encima de las tendencias. La estética de Old Money se centra en ingredientes clásicos de alta calidad y en la etiqueta gastronómica adecuada.`
        },
        shortDescription: {
            en: 'Timeless elegance lifestyle',
            ru: 'Образ жизни вечной элегантности',
            kk: 'Мәңгі талғампаздық өмір салты',
            fr: 'Style de vie élégance intemporelle',
            de: `Zeitloser Eleganz-Lifestyle`,
            es: `Estilo de vida de elegancia atemporal`
        },
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        howItWorks: {
            en: [
                'Embrace timeless elegance and quality over trends. Old Money aesthetic focuses on classic, high-quality ingredients and proper dining etiquette.',
                'Think country estate dinners, Sunday brunches at members-only clubs, and seasonal produce from trusted suppliers. The kitchen stocks grass-fed beef, wild-caught fish, artisan bread, and proper butter.',
                'Meals are unhurried affairs with real tableware, cloth napkins, and conversation. You would never eat standing up, skip breakfast, or consume anything from a plastic container.',
                'This is not about spending more - it\'s about refusing to compromise. A perfectly roasted heritage chicken with garden vegetables will always outclass a trendy superfood bowl.'
            ],
            ru: [
                'Выберите вечную элегантность и качество вместо трендов. Эстетика "Старых денег" фокусируется на классических, высококачественных ингредиентах и правильном этикете - никакого фастфуда.',
                'Представьте ужины в загородном поместье, воскресные бранчи в закрытых клубах и сезонные продукты. На кухне всегда фермерская говядина, дикая рыба, ремесленный хлеб и настоящее масло.',
                'Ужин - это неспешный процесс с настоящей посудой, тканевыми салфетками и беседой. Вы никогда не едите стоя, не пропускаете завтрак и не едите из пластиковых контейнеров.',
                'Дело не в том, чтобы тратить больше - дело в бескомпромиссности к качеству. Идеально запеченная фермерская курица с овощами всегда превзойдет модный суперфуд-боул.'
            ],
            kk: [
                'Трендтердің орнына мәңгілік талғампаздық пен сапаны таңдаңыз. «Ескі ақша» эстетикасы классикалық, жоғары сапалы ингредиенттерге және дұрыс этикетке назар аударады.',
                'Қала сыртындағы кешкі астар мен сенімді жеткізушілердің маусымдық өнімдерін елестетіп көріңіз. Ас үйде әрқашан фермерлік сиыр еті, жабайы балық, қолдан пісірілген нан және нағыз сары май болады.',
                'Тамақтану - нағыз ыдыс-аяқ, мата майлықтар және жағымды әңгімемен өтетін асықпайтын процесс. Сіз ешқашан түрегеп тұрып тамақтанбайсыз немесе пластик контейнерлерден жемейсіз.',
                'Бұл көп ақша жұмсау туралы емес - бұл сападан бас тартпау туралы. Көкөністермен тамаша пісірілген тауық сәнді суперфуд-боулдан әрқашан асып түседі.'
            ],
            fr: [
                'Privilégiez l\'élégance intemporelle et la qualité aux tendances. L\'esthétique Old Money se concentre sur des ingrédients classiques de haute qualité et l\'étiquette à table.',
                'Pensez dîners de domaine, produits de saison. La cuisine abrite bœuf nourri à l\'herbe, poisson sauvage, pain artisanal et vrai beurre.',
                'Les repas sont des moments sans hâte avec de la vraie vaisselle et de la conversation. Vous ne mangeriez jamais debout ni dans des contenants en plastique.',
                'Il ne s\'agit pas de dépenser plus, mais de refuser les compromis. Un poulet fermier parfaitement rôti surpassera toujours un bowl superfood à la mode.'
            ],
            de: [
                'Entscheiden Sie sich für zeitlose Eleganz und Qualität statt für Trends. Die Old-Money-Ästhetik konzentriert sich auf klassische, hochwertige Zutaten und die richtige Tisch-Etikette.',
                'Denken Sie an Abendessen auf dem Landsitz und saisonale Produkte. In der Küche gibt es Weiderind, Wildfisch, handgemachtes Brot und echte Butter.',
                'Mahlzeiten sind gemütliche Angelegenheiten mit echtem Geschirr und Gesprächen. Sie würden niemals im Stehen oder aus Plastikbehältern essen.',
                'Es geht nicht darum, mehr auszugeben – es geht darum, keine Kompromisse einzugehen. Ein perfekt gebratenes Hühnchen wird immer besser sein als eine trendige Superfood-Bowl.'
            ],
            es: [
                'Abraza la elegancia atemporal y la calidad en lugar de las tendencias. La estética Old Money se centra en ingredientes clásicos y de alta calidad y una etiqueta adecuada.',
                'Piensa en cenas en fincas rurales y productos de temporada. La cocina tiene carne de res de pastoreo, pescado salvaje, pan artesanal y mantequilla de verdad.',
                'Las comidas son asuntos sin prisas con vajilla de verdad y conversación. Nunca comerías de pie, ni de recipientes de plástico.',
                'No se trata de gastar más, sino de negarse a comprometer la calidad. Un pollo asado con verduras de huerto siempre superará a un tazón de moda.'
            ]
        },
        embrace: ['grass-fed beef', 'wild salmon', 'organic eggs', 'quality cheese', 'seasonal vegetables', 'farmers market produce', 'fresh berries', 'fine wine', 'real butter', 'artisan bread'],
        minimize: ['chain restaurants', 'fast food', 'cheap ingredients', 'processed foods', 'trendy diet foods'],
        dailyTracker: [
            {
                key: 'quality_ingredients', label: {
                    en: 'Quality ingredients', ru: 'Качественные продукты', kk: 'Сапалы ингредиенттер', fr: 'Ingrédients de qualité',
                    de: `Hochwertige Zutaten`,
                    es: `Ingredientes de calidad`
                }
            },
            {
                key: 'proper_dining', label: {
                    en: 'Proper dining etiquette', ru: 'Правильный этикет за столом', kk: 'Дұрыс үстел этикеті', fr: 'Étiquette de table appropriée',
                    de: `Richtige Etikette beim Essen`,
                    es: `Etiqueta adecuada en la cena`
                }
            },
            {
                key: 'three_meals', label: {
                    en: 'Three proper meals', ru: 'Три полноценных приёма пищи', kk: 'Үш толық тамақ', fr: 'Trois repas appropriés',
                    de: `Drei richtige Mahlzeiten`,
                    es: `Tres comidas adecuadas`
                }
            },
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
        name: {
            en: 'Tomato Girl Summer', ru: 'Лето Томатной Девушки', kk: 'Қызанақ Қыз Жаз', fr: 'Tomato Girl Summer',
            de: `Tomatenmädchen Sommer`,
            es: `Tomate Chica Verano`
        },
        subtitle: {
            en: 'Mediterranean dreams, sun-kissed living', ru: 'Средиземноморские мечты, загорелая жизнь', kk: 'Жерорта теңізі армандары', fr: 'Rêves méditerranéens, vie ensoleillée',
            de: `Mediterrane Träume, sonnenverwöhntes Wohnen`,
            es: `Sueños mediterráneos, vida bañada por el sol`
        },
        description: {
            en: 'La dolce vita on your plate. Fresh tomatoes, burrata, olive oil, pasta, wine.', ru: 'Сладкая жизнь на тарелке. Помидоры, буррата, оливковое масло.', kk: 'Табақтағы тәтті өмір.', fr: 'La dolce vita dans l\'assiette.',
            de: `La Dolce Vita auf Ihrem Teller. Frische Tomaten, Burrata, Olivenöl, Nudeln, Wein.`,
            es: `La dolce vita en tu plato. Tomates frescos, burrata, aceite de oliva, pasta, vino.`
        },
        shortDescription: {
            en: 'Mediterranean vibes, sun-kissed', ru: 'Средиземноморские вайбы', kk: 'Жерорта теңізі энергиясы', fr: 'Vibes méditerranéennes, soleil',
            de: `Mediterrane Atmosphäre, sonnenverwöhnt`,
            es: `Vibraciones mediterráneas, bañadas por el sol.`
        },
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        embrace: ['tomatoes', 'olive oil', 'burrata', 'mozzarella', 'feta', 'fresh pasta', 'crusty bread', 'seafood', 'peaches', 'figs', 'wine', 'fresh herbs', 'basil'],
        minimize: ['processed foods', 'heavy cream sauces', 'fast food'],
        dailyTracker: [
            {
                key: 'olive_oil', label: {
                    en: 'Olive oil on everything', ru: 'Оливковое масло на всём', kk: 'Барлық нәрсеге зейтін майы', fr: 'Huile d\'olive partout',
                    de: `Olivenöl auf allem`,
                    es: `Aceite de oliva en todo`
                }
            },
            {
                key: 'fresh_tomatoes', label: {
                    en: 'Fresh tomatoes', ru: 'Свежие помидоры', kk: 'Жаңа қызанақтар', fr: 'Tomates fraîches',
                    de: `Frische Tomaten`,
                    es: `tomates frescos`
                }
            },
            {
                key: 'aperitivo', label: {
                    en: 'Aperitivo hour', ru: 'Час аперитива', kk: 'Аперитив сағаты', fr: 'Heure apéritif',
                    de: `Aperitif-Stunde`,
                    es: `hora del aperitivo`
                }
            },
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
        name: {
            en: 'Pilates Princess', ru: 'Принцесса Пилатеса', kk: 'Пилатес Ханшасы', fr: 'Pilates Princess',
            de: `Pilates-Prinzessin`,
            es: `princesa pilates`
        },
        subtitle: {
            en: 'Long, lean, graceful strength', ru: 'Длинная, стройная, грациозная сила', kk: 'Ұзын, арық, сәнді күш', fr: 'Long, fine, force gracieuse',
            de: `Lange, schlanke, anmutige Kraft`,
            es: `Fuerza larga, delgada y elegante.`
        },
        description: {
            en: 'Fuel for lengthening and strengthening. Lean proteins, anti-inflammatory foods, collagen.', ru: 'Топливо для удлинения и укрепления. Постные белки, коллаген.', kk: 'Ұзарту және күшейту үшін отын.', fr: 'Carburant pour allongement et renforcement. Protéines maigres, collagène.',
            de: `Treibstoff zur Verlängerung und Stärkung. Magere Proteine, entzündungshemmende Lebensmittel, Kollagen.`,
            es: `Combustible para alargar y fortalecer. Proteínas magras, alimentos antiinflamatorios, colágeno.`
        },
        shortDescription: {
            en: 'Lean, graceful, strong', ru: 'Стройная, грациозная, сильная', kk: 'Арық, сәнді, күшті', fr: 'Fine, gracieuse, forte',
            de: `Schlank, anmutig, stark`,
            es: `Delgado, elegante, fuerte`
        },
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        embrace: ['lean proteins', 'fish', 'chicken', 'eggs', 'collagen', 'bone broth', 'vegetables', 'quinoa', 'sweet potato', 'berries', 'green juice', 'matcha', 'nuts'],
        minimize: ['processed foods', 'sugar', 'excessive carbs', 'alcohol', 'heavy meals', 'inflammatory foods'],
        dailyTracker: [
            {
                key: 'collagen', label: {
                    en: 'Collagen in smoothie', ru: 'Коллаген в смузи', kk: 'Смузидегі коллаген', fr: 'Collagène dans smoothie',
                    de: `Kollagen im Smoothie`,
                    es: `Colágeno en batido`
                }
            },
            {
                key: 'lean_protein', label: {
                    en: 'Lean protein', ru: 'Постный белок', kk: 'Азық белок', fr: 'Protéines maigres',
                    de: `Mageres Protein`,
                    es: `Proteína magra`
                }
            },
            {
                key: 'light_eating', label: {
                    en: 'Light eating on class days', ru: 'Лёгкое питание в дни занятий', kk: 'Сабақ күндерінде жеңіл тағам', fr: 'Repas léger les jours de cours',
                    de: `An Unterrichtstagen leichte Kost`,
                    es: `Comer ligero los días de clase.`
                }
            },
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
        name: {
            en: 'Coastal Grandmother', ru: 'Прибрежная Бабушка', kk: 'Жағалау Анасы', fr: 'Grand-mère côtière',
            de: `Küstengroßmutter`,
            es: `Abuela costera`
        },
        subtitle: {
            en: 'Coastal kitchen energy', ru: 'Энергия прибрежной кухни', kk: 'Жағалау асхана энергиясы', fr: 'Énergie cuisine côtière',
            de: `Küstenküchenenergie`,
            es: `La energía de la cocina costera`
        },
        description: {
            en: 'Coastal living lifestyle. Fresh seafood, farmers market vegetables, white wine on the porch.', ru: 'Прибрежный образ жизни. Морепродукты, белое вино на веранде.', kk: 'Жағалау өмір салты.', fr: 'Style de vie côtier. Fruits de mer, légumes du marché, vin blanc sur la véranda.',
            de: `Küstenlebensstil. Frische Meeresfrüchte, Gemüse vom Bauernmarkt, Weißwein auf der Veranda.`,
            es: `Estilo de vida costero. Mariscos frescos, verduras del mercado de agricultores, vino blanco en el porche.`
        },
        shortDescription: {
            en: 'Coastal elegance, seaside vibes', ru: 'Прибрежная элегантность', kk: 'Жағалау элеганттылығы', fr: 'Élégance côtière, vibes côtières',
            de: `Küsteneleganz, Meeresatmosphäre`,
            es: `Elegancia costera, vibraciones costeras.`
        },
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        embrace: ['fresh seafood', 'fish', 'shrimp', 'vegetables', 'salads', 'fresh bread', 'olive oil', 'white wine', 'fresh fruit', 'yogurt', 'honey', 'herbal tea'],
        minimize: ['processed foods', 'fast food', 'complicated recipes', 'stress eating', 'rushed meals'],
        dailyTracker: [
            {
                key: 'set_table', label: {
                    en: 'Set table properly', ru: 'Правильная сервировка', kk: 'Дұрыс сервировка', fr: 'Mettre la table correctement',
                    de: `Tisch richtig decken`,
                    es: `Poner la mesa correctamente`
                }
            },
            {
                key: 'fresh_seafood', label: {
                    en: 'Fresh seafood', ru: 'Свежие морепродукты', kk: 'Жаңа теңіз өнімдері', fr: 'Fruits de mer frais',
                    de: `Frische Meeresfrüchte`,
                    es: `Mariscos frescos`
                }
            },
            {
                key: 'beach_walk', label: {
                    en: 'Walk on the beach', ru: 'Прогулка по пляжу', kk: 'Пляжда серуен', fr: 'Marche sur la plage',
                    de: `Gehen Sie am Strand spazieren`,
                    es: `Caminar por la playa`
                }
            },
        ],
        suitableFor: ['coastal', 'elegant', 'serene'],
        isFeatured: true, // FIX #11: Make featured - Coastal Grandmother is popular thanks to TikTok
        popularityScore: 90, // FIX #11: Increase popularity - Coastal Grandmother trend is globally popular
        tags: ['trending', 'coastal', 'elegant'],
        emoji: '🐚',
        target: 'female',
        ageRange: '30-65',
        imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80', // Coastal beach lifestyle, ocean vibes
        color: '#B0BEC5',
    },
    {
        slug: 'soft_life',
        name: {
            en: 'Soft Life', ru: 'Мягкая Жизнь', kk: 'Жұмсақ Өмір', fr: 'Soft Life',
            de: `Weiches Leben`,
            es: `vida suave`
        },
        subtitle: {
            en: 'Ease, comfort, zero stress', ru: 'Лёгкость, комфорт, ноль стресса', kk: 'Жеңілдік, ыңғайлылық, стресс жоқ', fr: 'Douceur, confort, zéro stress',
            de: `Leichtigkeit, Komfort, kein Stress`,
            es: `Facilidad, comodidad, cero estrés.`
        },
        description: {
            en: 'Anti-hustle culture eating. Gentle foods, no strict rules, comfort without guilt.', ru: 'Питание против культуры суеты. Мягкие продукты, никаких строгих правил.', kk: 'Асығыс мәдениетіне қарсы тағам.', fr: 'Anti-hustle. Aliments doux, pas de règles strictes, confort sans culpabilité.',
            de: `Essen in der Anti-Hustle-Kultur. Sanfte Lebensmittel, keine strengen Regeln, Komfort ohne Schuldgefühle.`,
            es: `Cultura anti-ajetreo comiendo. Alimentos suaves, sin reglas estrictas, consuelo sin culpa.`
        },
        shortDescription: {
            en: 'Easy, comfortable, stress-free', ru: 'Легко, комфортно, без стресса', kk: 'Жеңіл, ыңғайлы, стресссіз', fr: 'Facile, confortable, sans stress',
            de: `Einfach, bequem, stressfrei`,
            es: `Fácil, cómodo y sin estrés.`
        },
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        embrace: ['comfort foods made healthy', 'soups', 'stews', 'warm bowls', 'soft textures', 'nourishing meals', 'treats in moderation', 'tea', 'gentle cooking'],
        minimize: ['stress eating', 'strict diets', 'punishment mentality', 'harsh restrictions', 'guilt'],
        dailyTracker: [
            {
                key: 'comfort_food', label: {
                    en: 'Comfort food without guilt', ru: 'Комфортная еда без чувства вины', kk: 'Кінәсіз ыңғайлы тағам', fr: 'Comfort food sans culpabilité',
                    de: `Wohlfühlessen ohne Schuldgefühle`,
                    es: `Comida reconfortante sin culpa`
                }
            },
            {
                key: 'gentle_self', label: {
                    en: 'Gentle with yourself', ru: 'Мягко к себе', kk: 'Өзіңізбен жұмсақ', fr: 'Douceur envers soi',
                    de: `Sei sanft zu dir selbst`,
                    es: `Gentil contigo misma`
                }
            },
            {
                key: 'rest', label: {
                    en: 'Rest is productive', ru: 'Отдых продуктивен', kk: 'Демалу өнімді', fr: 'Le repos est productif',
                    de: `Ruhe ist produktiv`,
                    es: `El descanso es productivo`
                }
            },
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
        name: {
            en: 'Mob Wife', ru: 'Жена Мафиози', kk: 'Мафия Әйелі', fr: 'Mob Wife',
            de: `Mob-Frau`,
            es: `esposa de la mafia`
        },
        subtitle: {
            en: 'Dramatic, luxurious, unapologetic', ru: 'Драматичная, роскошная, без извинений', kk: 'Драмалық, сәнді, кешірімсіз', fr: 'Dramatique, luxueux, sans excuses',
            de: `Dramatisch, luxuriös, kompromisslos`,
            es: `Dramático, lujoso, sin complejos.`
        },
        description: {
            en: 'Italian-American indulgence. Sunday sauce, big family dinners, espresso, cannoli.', ru: 'Итало-американское потворство. Воскресный соус, семейные ужины.', kk: 'Италия-америкалық ләззат.', fr: 'Indulgence italo-américaine. Sauce du dimanche, dîners en famille, espresso, cannoli.',
            de: `Italienisch-amerikanischer Genuss. Sonntagssauce, große Familienessen, Espresso, Cannoli.`,
            es: `Indulgencia italoamericana. Salsa dominical, grandes cenas familiares, espresso, cannoli.`
        },
        shortDescription: {
            en: 'Italian luxury, bold choices', ru: 'Итальянская роскошь, смелые выборы', kk: 'Италиялық сәнділік', fr: 'Luxe italien, choix audacieux',
            de: `Italienischer Luxus, mutige Entscheidungen`,
            es: `Lujo italiano, opciones audaces`
        },
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        embrace: ['Italian food', 'pasta', 'red sauce', 'meatballs', 'bread', 'olive oil', 'espresso', 'red wine', 'cannoli', 'tiramisu', 'family dinners', 'Sunday sauce'],
        minimize: ['diet food', 'sad salads', 'apologizing for eating', 'guilt', 'eating alone'],
        dailyTracker: [
            {
                key: 'sunday_sauce', label: {
                    en: 'Sunday sauce tradition', ru: 'Традиция воскресного соуса', kk: 'Жексенбі соусы дәстүрі', fr: 'Tradition sauce du dimanche',
                    de: `Sonntagssaucentradition`,
                    es: `Tradición de salsa dominical`
                }
            },
            {
                key: 'espresso', label: {
                    en: 'Espresso, not apologies', ru: 'Эспрессо, а не извинения', kk: 'Эспрессо, кешірім емес', fr: 'Espresso, pas d\'excuses',
                    de: `Espresso, keine Entschuldigung`,
                    es: `Espresso, no disculpas`
                }
            },
            {
                key: 'family_dinner', label: {
                    en: 'Family-style dinner', ru: 'Семейный ужин', kk: 'Отбасылық кешкі ас', fr: 'Dîner en famille',
                    de: `Abendessen im Familienstil`,
                    es: `Cena estilo familiar`
                }
            },
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
        name: {
            en: 'Summer Shred', ru: 'Летняя Сушка', kk: 'Жаздық Сушка', fr: 'Summer Shred',
            de: `Sommer-Shred`,
            es: `Trituración de verano`
        },
        subtitle: {
            en: 'Lean, defined, beach-ready', ru: 'Стройное, рельефное, готовое к пляжу', kk: 'Арық, анықталған, пляжқа дайын', fr: 'Sèche, définie, prête plage',
            de: `Schlank, definiert, strandtauglich`,
            es: `Esbelto, definido, listo para la playa.`
        },
        description: {
            en: 'Strategic fat loss while preserving muscle. High protein, plenty of vegetables.', ru: 'Стратегическая потеря жира при сохранении мышц.', kk: 'Бұлшық етті сақтай отырып стратегиялық май жоғалту.', fr: 'Perte de gras stratégique, préserver le muscle. Protéines, légumes.',
            de: `Strategischer Fettabbau bei gleichzeitigem Erhalt der Muskulatur. Hoher Proteingehalt, viel Gemüse.`,
            es: `Pérdida estratégica de grasa preservando el músculo. Alto contenido de proteínas, muchas verduras.`
        },
        shortDescription: {
            en: 'Lean, defined, beach-ready', ru: 'Стройное, рельефное', kk: 'Арық, анықталған', fr: 'Sèche, définie, prête plage',
            de: `Schlank, definiert, strandtauglich`,
            es: `Esbelto, definido, listo para la playa.`
        },
        category: 'weight_loss', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Weight Loss', streakThreshold: 0.7,
        embrace: ['lean proteins', 'chicken breast', 'fish', 'egg whites', 'Greek yogurt', 'vegetables', 'leafy greens', 'berries'],
        minimize: ['sugar', 'alcohol', 'fried foods', 'processed carbs', 'late night eating'],
        dailyTracker: [{
            key: 'protein', label: {
                en: 'Protein at every meal', ru: 'Белок при каждом приёме пищи', kk: 'Әр тағамда белок', fr: 'Protéines à chaque repas',
                de: `Protein zu jeder Mahlzeit`,
                es: `Proteína en cada comida`
            }
        }],
        suitableFor: ['fat_loss', 'definition'], isFeatured: true, popularityScore: 88, tags: ['weight_loss', 'shred'], emoji: '🔥', target: 'all', ageRange: '18-45',
        imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80', // Lean shredded body, beach ready
        color: '#FF6B6B',
    },
    {
        slug: 'metabolic_reset',
        name: {
            en: 'Metabolic Reset', ru: 'Метаболический Сброс', kk: 'Метаболизмдік Қалпына Келтіру', fr: 'Reset métabolique',
            de: `Stoffwechsel-Reset`,
            es: `Reinicio metabólico`
        },
        subtitle: {
            en: 'Restart your fat-burning engine', ru: 'Перезапустите двигатель сжигания жира', kk: 'Май жағу қозғалтқышын қайта бастаңыз', fr: 'Redémarrer la machine à brûler les graisses',
            de: `Starten Sie Ihren Fettverbrennungsmotor neu`,
            es: `Reinicia tu motor quemagrasas`
        },
        description: {
            en: 'Repair metabolism through whole foods, stable blood sugar, strategic eating windows.', ru: 'Восстановите метаболизм через цельные продукты.', kk: 'Толық тағамдар арқылы метаболизмді жөндеу.', fr: 'Réparer le métabolisme : aliments bruts, glycémie stable, fenêtres alimentaires.',
            de: `Reparieren Sie den Stoffwechsel durch Vollwertkost, stabilen Blutzucker und strategische Essfenster.`,
            es: `Reparar el metabolismo a través de alimentos integrales, niveles estables de azúcar en sangre y ventanas estratégicas para comer.`
        },
        shortDescription: {
            en: 'Reset metabolism, stable energy', ru: 'Сбросить метаболизм', kk: 'Метаболизмді қалпына келтіру', fr: 'Reset métabolisme, énergie stable',
            de: `Stoffwechsel zurücksetzen, stabile Energie`,
            es: `Restablecer el metabolismo, energía estable.`
        },
        category: 'weight_loss', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Weight Loss', streakThreshold: 0.7,
        embrace: ['whole foods', 'protein', 'healthy fats', 'vegetables', 'fiber', 'complex carbs', 'green tea'],
        minimize: ['processed foods', 'sugar', 'refined carbs', 'frequent snacking', 'late eating'],
        dailyTracker: [{
            key: 'blood_sugar', label: {
                en: 'Stable blood sugar', ru: 'Стабильный сахар', kk: 'Тұрақты қан қанты', fr: 'Glycémie stable',
                de: `Stabiler Blutzucker`,
                es: `Azúcar en sangre estable`
            }
        }],
        suitableFor: ['metabolism', 'reset'], isFeatured: false, popularityScore: 82, tags: ['weight_loss', 'metabolism'], emoji: '🔄', target: 'all', ageRange: '25-55',
        imageUrl: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80', color: '#4CAF50', // Metabolic reset, healthy transformation
    },
    {
        slug: 'debloat_detox',
        name: {
            en: 'Debloat & Glow', ru: 'Убрать Отёки', kk: 'Ісінуді Алып Тастау', fr: 'Debloat & Glow',
            de: `Debloat & Glow`,
            es: `Desinflar y brillar`
        },
        subtitle: {
            en: 'Flatten, refresh, feel light', ru: 'Сплющить, освежить, почувствовать лёгкость', kk: 'Тегістеу, жаңарту, жеңіл сезіну', fr: 'Aplatir, rafraîchir, se sentir léger',
            de: `Glätten, erfrischen, sich leicht anfühlen`,
            es: `Aplana, refresca, siéntete ligero`
        },
        description: {
            en: 'Anti-inflammatory, low sodium, gut-friendly eating.', ru: 'Противовоспалительное, низконатриевое питание.', kk: 'Қабынуға қарсы, төмен натрийлі тағам.', fr: 'Anti-inflammatoire, peu de sodium, intestin-friendly.',
            de: `Entzündungshemmende, natriumarme, darmfreundliche Ernährung.`,
            es: `Alimentación antiinflamatoria, baja en sodio y respetuosa con el intestino.`
        },
        shortDescription: {
            en: 'Debloat, refresh, feel light', ru: 'Убрать отёки, освежиться', kk: 'Ісінуді алу, жаңарту', fr: 'Dégonfler, rafraîchir, légèreté',
            de: `Entspannen, erfrischen, sich leicht fühlen`,
            es: `Desinflama, refresca, siéntete ligero`
        },
        category: 'weight_loss', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Weight Loss', streakThreshold: 0.6,
        embrace: ['cucumber', 'celery', 'asparagus', 'leafy greens', 'lemon water', 'ginger', 'peppermint tea'],
        minimize: ['sodium', 'carbonated drinks', 'beans', 'dairy', 'alcohol'],
        dailyTracker: [{
            key: 'debloat', label: {
                en: 'Low sodium day', ru: 'День без натрия', kk: 'Натрийсіз күн', fr: 'Journée pauvre en sodium',
                de: `Tag mit niedrigem Natriumgehalt`,
                es: `Día bajo en sodio`
            }
        }],
        suitableFor: ['debloat', 'refresh'], isFeatured: false, popularityScore: 80, tags: ['weight_loss', 'debloat'], emoji: '💨', target: 'all', ageRange: '18-55',
        imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80', color: '#00BCD4', // Debloat & glow, fresh vegetables, clean eating
    },
    {
        slug: 'sustainable_slim',
        name: {
            en: 'Sustainable Slim', ru: 'Устойчивая Стройность', kk: 'Тұрақты Арықтық', fr: 'Sustainable Slim',
            de: `Nachhaltig schlank`,
            es: `Delgado sostenible`
        },
        subtitle: {
            en: 'Lose it and keep it off forever', ru: 'Сбросьте и сохраните навсегда', kk: 'Жоғалтыңыз және мәңгі сақтаңыз', fr: 'Perdre et ne pas reprendre',
            de: `Verliere es und halte es für immer fern`,
            es: `Piérdelo y mantenlo apagado para siempre.`
        },
        description: {
            en: 'Anti-yo-yo approach. Small sustainable changes, focus on habits not numbers.', ru: 'Подход против йо-йо. Небольшие устойчивые изменения.', kk: 'Йо-йоға қарсы тәсіл.', fr: 'Approche anti-yo-yo. Petits changements durables, habitudes pas chiffres.',
            de: `Anti-Jo-Jo-Ansatz. Kleine, nachhaltige Veränderungen, konzentrieren Sie sich auf Gewohnheiten, nicht auf Zahlen.`,
            es: `Enfoque anti-yo-yo. Pequeños cambios sostenibles, céntrese en los hábitos, no en los números.`
        },
        shortDescription: {
            en: 'Sustainable weight loss', ru: 'Устойчивое похудение', kk: 'Тұрақты арықтау', fr: 'Perte de poids durable',
            de: `Nachhaltiger Gewichtsverlust`,
            es: `Pérdida de peso sostenible`
        },
        category: 'weight_loss', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Weight Loss', streakThreshold: 0.6,
        embrace: ['whole foods', 'vegetables', 'lean proteins', 'fruits', 'whole grains', 'healthy fats'],
        minimize: ['processed foods', 'excessive sugar', 'mindless snacking', 'emotional eating'],
        dailyTracker: [{
            key: 'habits', label: {
                en: 'Build habits', ru: 'Стройте привычки', kk: 'Дағдылар құрыңыз', fr: 'Construire les habitudes',
                de: `Bauen Sie Gewohnheiten auf`,
                es: `Construir hábitos`
            }
        }],
        suitableFor: ['sustainable', 'lifestyle'], isFeatured: false, popularityScore: 78, tags: ['weight_loss', 'sustainable'], emoji: '🌱', target: 'all', ageRange: '25-60',
        imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80', // Aesthetic wellness, green smoothie, morning routine
        color: '#8BC34A',
    },
    // ============================================
    // 🎯 GOAL_BUILD_MUSCLE (4 programs)
    // ============================================
    {
        slug: 'lean_bulk',
        name: {
            en: 'Lean Bulk', ru: 'Чистый Набор', kk: 'Таза Қосылу', fr: 'Lean Bulk',
            de: `Schlanke Masse`,
            es: `Masa magra`
        },
        subtitle: {
            en: 'Build muscle without the fat', ru: 'Набрать мышцы без жира', kk: 'Майсыз бұлшық ет қосу', fr: 'Prendre du muscle sans gras',
            de: `Bauen Sie Muskeln ohne Fett auf`,
            es: `Desarrolla músculo sin grasa`
        },
        description: {
            en: 'Strategic surplus. Enough calories to grow, enough protein to build.', ru: 'Стратегический профицит. Достаточно калорий для роста.', kk: 'Стратегиялық артықшылық.', fr: 'Surplus stratégique. Assez de calories pour grossir, assez de protéines.',
            de: `Strategischer Überschuss. Genug Kalorien zum Wachsen, genug Protein zum Aufbau.`,
            es: `Superávit estratégico. Suficientes calorías para crecer, suficientes proteínas para desarrollar.`
        },
        shortDescription: {
            en: 'Build muscle, stay lean', ru: 'Набрать мышцы, остаться стройным', kk: 'Бұлшық ет қосу, арық қалу', fr: 'Prendre du muscle, rester sec',
            de: `Bauen Sie Muskeln auf und bleiben Sie schlank`,
            es: `Construir músculo, mantenerse delgada`
        },
        category: 'muscle_building', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Build Muscle', streakThreshold: 0.7,
        howItWorks: {
            en: [
                'Strategic caloric surplus (200-350 above TDEE) to maximize muscle gain while minimizing fat. Unlike dirty bulking, lean bulk optimizes the muscle-to-fat ratio.',
                'Weight gain should not exceed 0.25-0.5% BW/week for trained individuals. Faster gain = more fat, not more muscle.',
                'Progressive overload is non-negotiable: without increasing training volume, extra calories become fat.',
                '14-day program in structured phases with regular assessment. Gaining too fast? Reduce surplus. Too slow? Increase.'
            ],
            ru: [
                'Стратегический профицит калорий (на 200-350 выше нормы) для максимального роста мышц и минимизации жира. В отличие от "грязного набора", чистый набор оптимизирует соотношение мышц и жира.',
                'Набор веса не должен превышать 0,25-0,5% от массы тела в неделю для тренированных людей. Более быстрый набор означает больше жира, а не мышц.',
                'Прогрессивная перегрузка обязательна: без увеличения объема тренировок лишние калории превратятся в жир.',
                '14-дневная программа состоит из структурированных фаз с регулярной оценкой. Набираете слишком быстро? Уменьшите профицит. Слишком медленно? Увеличьте.'
            ],
            kk: [
                'Бұлшықет өсуін барынша арттырып, майды азайту үшін калорияның стратегиялық артықшылығы (қалыптыдан 200-350-ге көп). «Лас масса жинауға» қарағанда, таза набор бұлшықет пен майдың арақатынасын оңтайландырады.',
                'Салмақ қосу жаттыққан адамдар үшін аптасына дене салмағының 0,25-0,5%-нан аспауы керек. Жылдам салмақ қосу - бұлшықет емес, майдың көбеюі.',
                'Прогрессивті жүктеме міндетті: жаттығу көлемін арттырмай, артық калориялар майға айналады.',
                '14 күндік бағдарлама тұрақты бағалауды қажет ететін құрылымдық кезеңдерден тұрады. Тым тез салмақ қосып жатсыз ба? Профицитті азайтыңыз. Тым баяу ма? Көбейтіңіз.'
            ],
            fr: [
                'Surplus calorique stratégique (200-350 au-dessus de la maintenance) pour maximiser le gain musculaire tout en minimisant les graisses. Le lean bulk optimise le ratio muscle/graisse.',
                'La prise de poids ne doit pas dépasser 0,25 à 0,5 % du poids corporel par semaine pour les personnes entraînées. Une prise plus rapide = plus de graisse.',
                'La surcharge progressive est non négociable : sans augmenter le volume d\'entraînement, les calories supplémentaires se transforment en graisse.',
                'Programme de 14 jours en phases structurées avec une évaluation régulière. Vous prenez trop vite ? Réduisez le surplus. Trop lentement ? Augmentez-le.'
            ],
            de: [
                'Strategischer Kalorienüberschuss (200-350 über dem Gesamtenergieumsatz), um den Muskelaufbau zu maximieren und Fett zu minimieren. Lean Bulk optimiert das Verhältnis von Muskeln zu Fett.',
                'Die Gewichtszunahme sollte bei trainierten Personen 0,25-0,5 % des Körpergewichts pro Woche nicht überschreiten. Schnellere Zunahme = mehr Fett, nicht mehr Muskeln.',
                'Progressive Überlastung ist nicht verhandelbar: Ohne Erhöhung des Trainingsvolumens werden zusätzliche Kalorien zu Fett.',
                '14-Tage-Programm in strukturierten Phasen mit regelmäßiger Bewertung. Sie nehmen zu schnell zu? Überschuss reduzieren. Zu langsam? Erhöhen.'
            ],
            es: [
                'Superávit calórico estratégico (200-350 por encima de TDEE) para maximizar la ganancia muscular minimizando la grasa. El volumen limpio optimiza la relación músculo-grasa.',
                'El aumento de peso no debe exceder el 0,25-0,5 % del peso corporal a la semana en personas entrenadas. Un aumento más rápido = más grasa, no más músculo.',
                'La sobrecarga progresiva es innegociable: sin aumentar el volumen de entrenamiento, las calorías extra se convierten en grasa.',
                'Programa de 14 días en fases estructuradas con evaluación regular. ¿Ganas demasiado rápido? Reduce el superávit. ¿Demasiado lento? Auméntalo.'
            ]
        },
        embrace: ['lean proteins', 'chicken', 'beef', 'fish', 'eggs', 'Greek yogurt', 'complex carbs', 'rice', 'oats'],
        minimize: ['junk food', 'excessive fat', 'alcohol', 'empty calories'],
        dailyTracker: [
            {
                key: 'protein_goal', label: {
                    en: 'Hit protein goal', ru: 'Достичь цели по белку', kk: 'Белок мақсатына жету', fr: 'Atteindre l\'objectif protéines',
                    de: `Erreichen Sie Ihr Proteinziel`,
                    es: `Alcanzar el objetivo de proteínas`
                }
            },
            {
                key: 'calorie_surplus', label: {
                    en: 'Eat in caloric surplus', ru: 'Есть с профицитом калорий', kk: 'Калориялық артықшылықпен тамақтану', fr: 'Manger en surplus calorique',
                    de: `Essen Sie im Kalorienüberschuss`,
                    es: `Comer en excedente calórico`
                }
            },
            {
                key: 'strength_training', label: {
                    en: 'Complete strength training', ru: 'Выполнить силовую тренировку', kk: 'Күш жаттығуын аяқтау', fr: 'Entraînement de force terminé',
                    de: `Komplettes Krafttraining`,
                    es: `Entrenamiento de fuerza completo`
                }
            },
            {
                key: 'sleep_8h', label: {
                    en: 'Sleep 7-8 hours', ru: 'Спать 7-8 часов', kk: '7-8 сағат ұйықтау', fr: 'Dormir 7-8 heures',
                    de: `Schlafen Sie 7-8 Stunden`,
                    es: `Dormir 7-8 horas`
                }
            },
            {
                key: 'hydration', label: {
                    en: 'Drink enough water', ru: 'Пить достаточно воды', kk: 'Жеткілікті су ішу', fr: 'Boire assez d\'eau',
                    de: `Trinken Sie ausreichend Wasser`,
                    es: `Bebe suficiente agua`
                }
            },
            {
                key: 'creatine', label: {
                    en: 'Take creatine', ru: 'Принять креатин', kk: 'Креатин қабылдау', fr: 'Prendre de la créatine',
                    de: `Nimm Kreatin`,
                    es: `tomar creatina`
                }
            },
        ],
        suitableFor: ['bulking', 'muscle'], isFeatured: true, popularityScore: 85, tags: ['muscle', 'bulk'], emoji: '💪', target: 'male', ageRange: '18-45',
        imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', // Muscle building, strength training
        color: '#FF9800',
    },
    {
        slug: 'strength_athlete',
        name: {
            en: 'Strength Athlete', ru: 'Силовой Атлет', kk: 'Күш Атлеті', fr: 'Athlète force',
            de: `Kraftsportler`,
            es: `Atleta de fuerza`
        },
        subtitle: {
            en: 'Fuel for power and performance', ru: 'Топливо для силы и производительности', kk: 'Күш пен өнімділік үшін отын', fr: 'Carburant force et performance',
            de: `Treibstoff für Kraft und Leistung`,
            es: `Combustible para potencia y rendimiento`
        },
        description: {
            en: 'Performance nutrition for lifters. High protein, strategic carbs.', ru: 'Спортивное питание для лифтеров.', kk: 'Көтерушілерге арналған тағам.', fr: 'Nutrition performance pour haltérophiles. Protéines, glucides stratégiques.',
            de: `Leistungsernährung für Kraftsportler. Hoher Proteingehalt, strategische Kohlenhydrate.`,
            es: `Nutrición de rendimiento para levantadores. Carbohidratos estratégicos y ricos en proteínas.`
        },
        shortDescription: {
            en: 'Fuel for strength', ru: 'Топливо для силы', kk: 'Күш үшін отын', fr: 'Carburant force',
            de: `Treibstoff für Kraft`,
            es: `Combustible para la fuerza`
        },
        category: 'muscle_building', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Build Muscle', streakThreshold: 0.7,
        embrace: ['high protein', 'beef', 'chicken', 'eggs', 'fish', 'rice', 'potatoes', 'oats'],
        minimize: ['alcohol', 'excessive junk', 'undereating'],
        dailyTracker: [{
            key: 'post_workout', label: {
                en: 'Post-workout nutrition', ru: 'Питание после тренировки', kk: 'Жаттығудан кейінгі тағам', fr: 'Nutrition post-entraînement',
                de: `Ernährung nach dem Training`,
                es: `Nutrición post-entrenamiento`
            }
        }],
        suitableFor: ['strength', 'powerlifting'], isFeatured: false, popularityScore: 82, tags: ['muscle', 'strength'], emoji: '🏋️', target: 'male', ageRange: '18-50',
        imageUrl: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=800&q=80', color: '#673AB7', // Strength athlete, power, performance
    },
    {
        slug: 'athletic_performance',
        name: {
            en: 'Athletic Performance', ru: 'Спортивная Форма', kk: 'Спорттық Форма', fr: 'Performance athlétique',
            de: `Sportliche Leistung`,
            es: `Rendimiento atlético`
        },
        subtitle: {
            en: 'Train hard, eat smart, perform better', ru: 'Тренируйся усердно, ешь умно', kk: 'Қатты жаттығу, ақылды жеу', fr: 'S\'entraîner dur, manger malin, mieux performer',
            de: `Trainiere hart, ernähre dich intelligent und erziele bessere Leistungen`,
            es: `Entrena duro, come inteligentemente, rinde mejor`
        },
        description: {
            en: 'Sports nutrition for competitive athletes.', ru: 'Спортивное питание для соревновательных атлетов.', kk: 'Бәсекелес атлеттерге арналған тағам.', fr: 'Nutrition sportive pour athlètes compétitifs.',
            de: `Sporternährung für Leistungssportler.`,
            es: `Nutrición deportiva para deportistas competitivas.`
        },
        shortDescription: {
            en: 'Athletic performance nutrition', ru: 'Спортивное питание', kk: 'Спорттық тағам', fr: 'Nutrition performance athlétique',
            de: `Sportliche Leistungsernährung`,
            es: `Nutrición para el rendimiento deportivo`
        },
        category: 'muscle_building', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Build Muscle', streakThreshold: 0.7,
        embrace: ['lean proteins', 'complex carbs', 'fruits', 'vegetables', 'hydration', 'electrolytes'],
        minimize: ['alcohol', 'processed foods', 'heavy foods before training'],
        dailyTracker: [{
            key: 'fuel_work', label: {
                en: 'Fuel the work', ru: 'Заправляйте работу', kk: 'Жұмысты отындаңыз', fr: 'Alimenter l\'effort',
                de: `Treiben Sie die Arbeit an`,
                es: `Alimenta el trabajo`
            }
        }],
        suitableFor: ['athletes', 'performance'], isFeatured: false, popularityScore: 80, tags: ['muscle', 'athletic'], emoji: '🏃', target: 'all', ageRange: '16-45',
        imageUrl: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80', color: '#2196F3', // Athletic performance, sports nutrition
    },
    {
        slug: 'functional_fitness',
        name: {
            en: 'Functional Fitness', ru: 'Функциональный Фитнес', kk: 'Функционалдық Фитнес', fr: 'Functional Fitness',
            de: `Funktionelle Fitness`,
            es: `aptitud funcional`
        },
        subtitle: {
            en: 'Strong, capable, ready for anything', ru: 'Сильный, способный, готов ко всему', kk: 'Күшті, қабілетті, кез келген нәрсеге дайын', fr: 'Fort, capable, prêt à tout',
            de: `Stark, fähig, zu allem bereit`,
            es: `Fuerte, capaz, dispuesto a todo.`
        },
        description: {
            en: 'Nutrition for real-world performance. Balanced macros, anti-inflammatory focus.', ru: 'Питание для реальной производительности.', kk: 'Нақты өмір өнімділігіне арналған тағам.', fr: 'Nutrition performance au quotidien. Macros équilibrés, anti-inflammatoire.',
            de: `Ernährung für echte Leistung. Ausgewogene Makros, entzündungshemmender Fokus.`,
            es: `Nutrición para el rendimiento en el mundo real. Macros equilibradas, enfoque antiinflamatorio.`
        },
        shortDescription: {
            en: 'Functional strength nutrition', ru: 'Питание для функциональной силы', kk: 'Функционалдық күш тағамы', fr: 'Nutrition force fonctionnelle',
            de: `Funktionelle Krafternährung`,
            es: `Nutrición de fuerza funcional`
        },
        category: 'muscle_building', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Build Muscle', streakThreshold: 0.7,
        embrace: ['whole foods', 'lean proteins', 'vegetables', 'fruits', 'complex carbs', 'turmeric', 'omega-3s'],
        minimize: ['processed foods', 'inflammatory foods', 'excessive sugar'],
        dailyTracker: [{
            key: 'anti_inflammatory', label: {
                en: 'Anti-inflammatory foods', ru: 'Противовоспалительные продукты', kk: 'Қабынуға қарсы тағамдар', fr: 'Aliments anti-inflammatoires',
                de: `Entzündungshemmende Lebensmittel`,
                es: `Alimentos antiinflamatorios`
            }
        }],
        suitableFor: ['functional', 'mobility'], isFeatured: false, popularityScore: 78, tags: ['muscle', 'functional'], emoji: '⚡', target: 'all', ageRange: '25-55',
        imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80', color: '#FF9800', // Functional fitness, movement, strength
    },
    // ============================================
    // 🎯 GOAL_CLEAR_SKIN (3 programs)
    // ============================================
    {
        slug: 'glass_skin', name: {
            en: 'Glass Skin', ru: 'Стеклянная Кожа', kk: 'Шыны Тері', fr: 'Glass Skin',
            de: `Glashaut`,
            es: `Piel de cristal`
        },
        subtitle: {
            en: 'Korean beauty starts from inside', ru: 'Корейская красота начинается изнутри', kk: 'Кореялық сұлулық іштен басталады', fr: 'La beauté K part de l\'intérieur',
            de: `Koreanische Schönheit beginnt von innen`,
            es: `La belleza coreana comienza desde adentro`
        },
        description: {
            en: 'Gut-skin connection. Fermented foods, omega-3s, collagen.', ru: 'Связь кишечника и кожи.', kk: 'Ішек-тері байланысы.', fr: 'Lien intestin-peau. Fermentés, oméga-3, collagène.',
            de: `Darm-Haut-Verbindung. Fermentierte Lebensmittel, Omega-3-Fettsäuren, Kollagen.`,
            es: `Conexión intestino-piel. Alimentos fermentados, omega-3, colágeno.`
        },
        shortDescription: {
            en: 'K-beauty nutrition', ru: 'К-бьюти питание', kk: 'К-бьюти тағам', fr: 'Nutrition K-beauty',
            de: `K-Beauty-Ernährung`,
            es: `nutrición de belleza k`
        },
        category: 'skin_health', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Clear Skin', streakThreshold: 0.6,
        embrace: ['fermented foods', 'kimchi', 'miso', 'bone broth', 'salmon', 'seaweed', 'green tea'],
        minimize: ['dairy', 'sugar', 'processed foods', 'alcohol'],
        dailyTracker: [{
            key: 'fermented', label: {
                en: 'Fermented foods', ru: 'Ферментированные продукты', kk: 'Ферменттелген тағамдар', fr: 'Aliments fermentés',
                de: `Fermentierte Lebensmittel`,
                es: `alimentos fermentados`
            }
        }],
        suitableFor: ['skin', 'korean'], isFeatured: true, popularityScore: 91, tags: ['skin', 'kbeauty'], emoji: '✨', target: 'all', ageRange: '18-50', // FIX #11: Increase popularity - K-beauty is globally popular
        imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80', // Korean beauty, glass skin, healthy glow
        color: '#E1BEE7',
    },
    {
        slug: 'acne_clear', name: {
            en: 'Acne Clear', ru: 'Чистая Кожа', kk: 'Таза Тері', fr: 'Acne Clear',
            de: `Akne klar`,
            es: `Acné claro`
        },
        subtitle: {
            en: 'Calm inflammation, clear breakouts', ru: 'Успокоить воспаление, очистить высыпания', kk: 'Қабынуды тыныштандыру', fr: 'Apaiser l\'inflammation',
            de: `Lindert Entzündungen, deutliche Ausbrüche`,
            es: `Calma la inflamación, elimina los brotes.`
        },
        description: {
            en: 'Anti-inflammatory, low-glycemic eating.', ru: 'Противовоспалительное, низкогликемическое питание.', kk: 'Қабынуға қарсы тағам.', fr: 'Anti-inflammatoire, alimentation low-glycémique.',
            de: `Entzündungshemmende, niedrig glykämische Ernährung.`,
            es: `Alimentación antiinflamatoria y de bajo índice glucémico.`
        },
        shortDescription: {
            en: 'Clear skin nutrition', ru: 'Питание для чистой кожи', kk: 'Таза тері тағамы', fr: 'Nutrition peau nette',
            de: `Klare Hauternährung`,
            es: `Nutrición de la piel clara`
        },
        category: 'skin_health', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Clear Skin', streakThreshold: 0.6,
        embrace: ['low-glycemic foods', 'vegetables', 'lean proteins', 'omega-3 fish', 'zinc-rich foods', 'probiotics', 'green tea'],
        minimize: ['dairy', 'sugar', 'high-glycemic carbs', 'processed foods'],
        dailyTracker: [{
            key: 'low_glycemic', label: {
                en: 'Low glycemic day', ru: 'Низкогликемический день', kk: 'Төмен гликемиялық күн', fr: 'Journée low-glycémique',
                de: `Tag mit niedrigem glykämischen Wert`,
                es: `Día de bajo índice glucémico`
            }
        }],
        suitableFor: ['acne', 'skin'], isFeatured: false, popularityScore: 82, tags: ['skin', 'acne'], emoji: '🧊', target: 'all', ageRange: '14-40',
        imageUrl: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=800&q=80', color: '#64B5F6', // Acne clear, clear skin, healthy glow
    },
    {
        slug: 'anti_aging_glow', name: {
            en: 'Anti-Aging Glow', ru: 'Антивозрастное Сияние', kk: 'Жасылдыққа Қарсы Жарқырау', fr: 'Anti-âge Glow',
            de: `Anti-Aging-Glanz`,
            es: `Brillo antienvejecimiento`
        },
        subtitle: {
            en: 'Age gracefully, glow eternally', ru: 'Стареть красиво, сиять вечно', kk: 'Әдемі қартаю, мәңгі жарқырау', fr: 'Vieillir avec grâce, rayonner',
            de: `Altern Sie in Würde, strahlen Sie ewig`,
            es: `Envejece con gracia, brilla eternamente`
        },
        description: {
            en: 'Longevity nutrition. Antioxidants, collagen, healthy fats.', ru: 'Питание для долголетия кожи.', kk: 'Теріге арналған ұзақ өмір тағамы.', fr: 'Nutrition longévité. Antioxydants, collagène, bonnes graisses.',
            de: `Ernährung für ein langes Leben. Antioxidantien, Kollagen, gesunde Fette.`,
            es: `Nutrición de longevidad. Antioxidantes, colágeno, grasas saludables.`
        },
        shortDescription: {
            en: 'Anti-aging nutrition', ru: 'Антивозрастное питание', kk: 'Қартаюға қарсы тағам', fr: 'Nutrition anti-âge',
            de: `Anti-Aging-Ernährung`,
            es: `Nutrición anti-envejecimiento`
        },
        category: 'skin_health', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Clear Skin', streakThreshold: 0.6,
        embrace: ['antioxidants', 'berries', 'leafy greens', 'olive oil', 'fatty fish', 'nuts', 'collagen', 'bone broth', 'green tea', 'dark chocolate'],
        minimize: ['sugar', 'processed foods', 'alcohol', 'fried foods'],
        dailyTracker: [{
            key: 'antioxidants', label: {
                en: 'Antioxidant-rich foods', ru: 'Продукты с антиоксидантами', kk: 'Антиоксидантқа бай тағамдар', fr: 'Aliments riches en antioxydants',
                de: `Antioxidantienreiche Lebensmittel`,
                es: `Alimentos ricos en antioxidantes`
            }
        }],
        suitableFor: ['antiaging', 'glow'], isFeatured: false, popularityScore: 80, tags: ['skin', 'antiaging'], emoji: '🌟', target: 'all', ageRange: '30-65',
        imageUrl: 'https://images.unsplash.com/photo-1505944270255-72b8c68c6a70?w=800&q=80', color: '#FFD54F', // Anti-aging glow, youthful skin, healthy aging
    },
    // ============================================
    // 🎯 GOAL_MORE_ENERGY (3 programs)
    // ============================================
    {
        slug: 'all_day_energy', name: {
            en: 'All-Day Energy', ru: 'Энергия На Весь День', kk: 'Күн Бойы Энергия', fr: 'Énergie toute la journée',
            de: `Energie für den ganzen Tag`,
            es: `Energía para todo el día`
        },
        subtitle: {
            en: 'No crashes, no slumps, just go', ru: 'Никаких спадов, просто вперёд', kk: 'Төмендеу жоқ, тек алға', fr: 'Pas de coup de barre, en avant',
            de: `Keine Abstürze, keine Einbrüche, einfach los`,
            es: `Sin caídas ni caídas, simplemente sigue adelante.`
        },
        description: {
            en: 'Blood sugar stability for sustained energy.', ru: 'Стабильность сахара для устойчивой энергии.', kk: 'Тұрақты энергия үшін қан қантының тұрақтылығы.', fr: 'Glycémie stable pour énergie durable.',
            de: `Blutzuckerstabilität für anhaltende Energie.`,
            es: `Estabilidad del azúcar en sangre para una energía sostenida.`
        },
        shortDescription: {
            en: 'Sustained energy all day', ru: 'Стабильная энергия весь день', kk: 'Күн бойы тұрақты энергия', fr: 'Énergie stable toute la journée',
            de: `Anhaltende Energie den ganzen Tag`,
            es: `Energía sostenida todo el día.`
        },
        category: 'energy', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'More Energy', streakThreshold: 0.6,
        embrace: ['complex carbs', 'oats', 'quinoa', 'sweet potato', 'lean proteins', 'nuts', 'vegetables', 'green tea'],
        minimize: ['sugar', 'refined carbs', 'excessive caffeine', 'skipping meals'],
        dailyTracker: [{
            key: 'stable_energy', label: {
                en: 'Stable energy', ru: 'Стабильная энергия', kk: 'Тұрақты энергия', fr: 'Énergie stable',
                de: `Stabile Energie`,
                es: `Energía estable`
            }
        }],
        suitableFor: ['energy', 'productivity'], isFeatured: true, popularityScore: 85, tags: ['energy', 'focus'], emoji: '⚡', target: 'all', ageRange: '20-55',
        imageUrl: 'https://images.unsplash.com/photo-1494390248081-4e521a5940db?w=800&q=80', // Energy, productivity, healthy breakfast
        color: '#FFD54F',
    },
    {
        slug: 'brain_fuel', name: {
            en: 'Brain Fuel', ru: 'Топливо для Мозга', kk: 'Ми Үшін Отын', fr: 'Carburant cerveau',
            de: `Gehirntreibstoff`,
            es: `Combustible cerebral`
        },
        subtitle: {
            en: 'Focus, clarity, mental edge', ru: 'Фокус, ясность, умственное преимущество', kk: 'Назар, анықтық', fr: 'Focus, clarté, acuité mentale',
            de: `Konzentration, Klarheit, mentale Stärke`,
            es: `Enfoque, claridad, ventaja mental.`
        },
        description: {
            en: 'Nootropic nutrition. Omega-3s, stable glucose, brain nutrients.', ru: 'Ноотропное питание.', kk: 'Ноотроптық тағам.', fr: 'Nutrition nootropique. Oméga-3, glucose stable.',
            de: `Nootropische Ernährung. Omega-3-Fettsäuren, stabile Glukose, Gehirnnährstoffe.`,
            es: `Nutrición nootrópica. Omega-3, glucosa estable, nutrientes cerebrales.`
        },
        shortDescription: {
            en: 'Brain-boosting nutrition', ru: 'Питание для мозга', kk: 'Миға арналған тағам', fr: 'Nutrition cerveau',
            de: `Gehirnfördernde Ernährung`,
            es: `Nutrición que estimula el cerebro`
        },
        category: 'energy', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'More Energy', streakThreshold: 0.6,
        embrace: ['fatty fish', 'salmon', 'eggs', 'blueberries', 'walnuts', 'dark chocolate', 'green tea', 'olive oil', 'avocado'],
        minimize: ['sugar', 'processed foods', 'trans fats', 'blood sugar spikes'],
        dailyTracker: [{
            key: 'brain_foods', label: {
                en: 'Brain foods', ru: 'Продукты для мозга', kk: 'Ми тағамдары', fr: 'Aliments cerveau',
                de: `Gehirnnahrung`,
                es: `Alimentos para el cerebro`
            }
        }],
        suitableFor: ['focus', 'mental'], isFeatured: false, popularityScore: 82, tags: ['energy', 'brain'], emoji: '🧠', target: 'all', ageRange: '25-60',
        imageUrl: 'https://images.unsplash.com/photo-1508558936510-0af1e3cccbab?w=800&q=80', color: '#9C27B0', // Brain fuel, mental clarity, cognitive health
    },
    {
        slug: 'adrenal_recovery', name: {
            en: 'Adrenal Recovery', ru: 'Восстановление Надпочечников', kk: 'Бүйрек Үсті Бездерін Қалпына Келтіру', fr: 'Récupération surrénales',
            de: `Adrenale Erholung`,
            es: `Recuperación suprarrenal`
        },
        subtitle: {
            en: 'Heal burnout, restore vitality', ru: 'Исцелить выгорание', kk: 'Күйіп қалуды жазу', fr: 'Guérir le burnout, restaurer la vitalité',
            de: `Burnout heilen, Vitalität wiederherstellen`,
            es: `Curar el agotamiento, restaurar la vitalidad.`
        },
        description: {
            en: 'Healing nutrition for burned-out systems.', ru: 'Исцеляющее питание для истощённых систем.', kk: 'Күйіп қалған жүйелерге арналған жазылу тағамы.', fr: 'Nutrition guérison pour systèmes épuisés.',
            de: `Heilende Ernährung für ausgebrannte Systeme.`,
            es: `Nutrición curativa para sistemas quemados.`
        },
        shortDescription: {
            en: 'Burnout recovery', ru: 'Восстановление от выгорания', kk: 'Күйіп қалудан қалпына келтіру', fr: 'Récupération burnout',
            de: `Burnout-Erholung`,
            es: `Recuperación del agotamiento`
        },
        category: 'energy', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'More Energy', streakThreshold: 0.6,
        embrace: ['nutrient-dense foods', 'organ meats', 'bone broth', 'eggs', 'vegetables', 'fruits', 'healthy fats'],
        minimize: ['caffeine', 'sugar', 'alcohol', 'processed foods', 'skipping meals'],
        dailyTracker: [{
            key: 'no_caffeine', label: {
                en: 'No caffeine', ru: 'Без кофеина', kk: 'Кофеинсіз', fr: 'Pas de caféine',
                de: `No caffeine`,
                es: `sin cafeina`
            }
        }],
        suitableFor: ['burnout', 'recovery'], isFeatured: false, popularityScore: 78, tags: ['energy', 'recovery'], emoji: '🔋', target: 'all', ageRange: '25-55',
        imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80', color: '#4DB6AC', // Adrenal recovery, stress management, balance
    },
    // ============================================
    // 🌍 DESTINATIONS (5 programs)
    // ============================================
    {
        slug: 'amalfi_coast', name: {
            en: 'Amalfi Coast', ru: 'Амальфитанское Побережье', kk: 'Амальфи Жағалауы', fr: 'Côte Amalfitaine',
            de: `Amalfiküste`,
            es: `Costa de Amalfi`
        },
        subtitle: {
            en: 'Limoncello sunsets, Italian dreams', ru: 'Закаты с лимончелло', kk: 'Лимончелло күн батулары', fr: 'Couchers limoncello, rêves italiens',
            de: `Limoncello-Sonnenuntergänge, italienische Träume`,
            es: `Atardeceres de Limoncello, sueños italianos.`
        },
        description: {
            en: 'Southern Italian coastal living.', ru: 'Южно-итальянская прибрежная жизнь.', kk: 'Оңтүстік италиялық жағалау өмірі.', fr: 'Vie côtière sud italien.',
            de: `Süditalienisches Küstenleben.`,
            es: `Vida costera del sur de Italia.`
        },
        shortDescription: {
            en: 'Italian coastal eating', ru: 'Итальянское прибрежное питание', kk: 'Италиялық жағалау тағамы', fr: 'Alimentation côtière italienne',
            de: `Italienisches Essen an der Küste`,
            es: `Comer en la costa italiana`
        },
        category: 'destinations', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Destinations', streakThreshold: 0.6,
        embrace: ['fresh seafood', 'fish', 'lemons', 'olive oil', 'tomatoes', 'fresh pasta', 'wine'],
        minimize: ['processed foods', 'fast food', 'rushing meals'],
        dailyTracker: [{
            key: 'italian_meal', label: {
                en: 'Italian-style meal', ru: 'Итальянский приём пищи', kk: 'Италиялық тағам', fr: 'Repas style italien',
                de: `Italienisches Essen`,
                es: `comida al estilo italiano`
            }
        }],
        suitableFor: ['italian', 'coastal'], isFeatured: true, popularityScore: 96, tags: ['destinations', 'italian'], emoji: '🍋', target: 'all', ageRange: '18-65', // FIX #11: Increase popularity - Mediterranean diet is globally popular
        imageUrl: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=800&q=80', // Italian coastal, Mediterranean summer
        color: '#FFEB3B',
    },
    {
        slug: 'greek_islands', name: {
            en: 'Greek Islands', ru: 'Греческие Острова', kk: 'Грек Аралдары', fr: 'Îles grecques',
            de: `Griechische Inseln`,
            es: `Islas griegas`
        },
        subtitle: {
            en: 'Santorini sunsets on your plate', ru: 'Закаты Санторини на тарелке', kk: 'Санторини күн батулары табақта', fr: 'Couchers Santorin dans l\'assiette',
            de: `Sonnenuntergänge auf Santorin auf Ihrem Teller`,
            es: `Los atardeceres de Santorini en tu plato`
        },
        description: {
            en: 'The original Mediterranean diet.', ru: 'Оригинальная средиземноморская диета.', kk: 'Түпнұсқа Жерорта теңізі диетасы.', fr: 'Le régime méditerranéen originel.',
            de: `Die ursprüngliche Mittelmeerdiät.`,
            es: `La dieta mediterránea original.`
        },
        shortDescription: {
            en: 'Greek Mediterranean eating', ru: 'Греческое средиземноморское питание', kk: 'Грек Жерорта теңізі тағамы', fr: 'Alimentation grecque méditerranéenne',
            de: `Griechisch-mediterranes Essen`,
            es: `Comida mediterránea griega`
        },
        category: 'destinations', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Destinations', streakThreshold: 0.6,
        embrace: ['olive oil', 'feta', 'Greek yogurt', 'fish', 'legumes', 'vegetables', 'wine', 'honey'],
        minimize: ['processed foods', 'excessive red meat'],
        dailyTracker: [{
            key: 'mediterranean', label: {
                en: 'Mediterranean meal', ru: 'Средиземноморская еда', kk: 'Жерорта теңізі тағамы', fr: 'Repas méditerranéen',
                de: `Mediterranes Essen`,
                es: `comida mediterránea`
            }
        }],
        suitableFor: ['greek', 'mediterranean'], isFeatured: false, popularityScore: 82, tags: ['destinations', 'greek'], emoji: '🇬🇷', target: 'all', ageRange: '18-70',
        imageUrl: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800&q=80', color: '#03A9F4', // Greek Islands, Mediterranean, fresh seafood
    },
    {
        slug: 'okinawa_longevity', name: {
            en: 'Okinawa Longevity', ru: 'Долголетие Окинавы', kk: 'Окинава Ұзақ Өмір', fr: 'Longévité Okinawa',
            de: `Okinawa Langlebigkeit`,
            es: `Longevidad en Okinawa`
        },
        subtitle: {
            en: 'Secrets of living to 100', ru: 'Секреты жизни до 100', kk: '100-ге дейін өмір сүру құпиялары', fr: 'Secrets pour vivre jusqu\'à 100 ans',
            de: `Geheimnisse des Lebens bis 100`,
            es: `Secretos para vivir hasta los 100`
        },
        description: {
            en: 'Blue Zone wisdom. Hara hachi bu - 80% full.', ru: 'Мудрость Голубой зоны.', kk: 'Көк аймақ даналығы.', fr: 'Sagesse zone bleue. Hara hachi bu - 80 % plein.',
            de: `Weisheit der Blauen Zone. Hara hachi bu – 80 % voll.`,
            es: `Sabiduría de la Zona Azul. Hara hachi bu: 80% lleno.`
        },
        shortDescription: {
            en: 'Blue zone longevity', ru: 'Долголетие синей зоны', kk: 'Көк аймақ ұзақ өмір', fr: 'Longévité zone bleue',
            de: `Langlebigkeit in der blauen Zone`,
            es: `Longevidad de la zona azul`
        },
        category: 'destinations', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Destinations', streakThreshold: 0.6,
        embrace: ['purple sweet potato', 'tofu', 'vegetables', 'seaweed', 'fish', 'green tea', 'turmeric'],
        minimize: ['excessive meat', 'processed foods', 'large portions'],
        dailyTracker: [{
            key: 'hara_hachi_bu', label: {
                en: '80% full', ru: '80% сытости', kk: '80% тоқ', fr: '80 % plein',
                de: `80 % voll`,
                es: `80% lleno`
            }
        }],
        suitableFor: ['longevity', 'japanese'], isFeatured: true, popularityScore: 95, tags: ['destinations', 'japanese'], emoji: '🇯🇵', target: 'all', ageRange: '25-80', // FIX #11: Increase popularity and make featured - Japanese longevity diet is globally popular
        imageUrl: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80', color: '#9C27B0', // Okinawa longevity, Japanese wellness, longevity
    },
    {
        slug: 'tokyo_energy', name: {
            en: 'Tokyo Energy', ru: 'Энергия Токио', kk: 'Токио Энергиясы', fr: 'Tokyo Energy',
            de: `Tokio Energie`,
            es: `Energía de Tokio`
        },
        subtitle: {
            en: 'Fast-paced city, balanced eating', ru: 'Город в быстром темпе, сбалансированное питание', kk: 'Жылдам қала, теңгерімді тағам', fr: 'Ville rapide, alimentation équilibrée',
            de: `Hektische Stadt, ausgewogene Ernährung`,
            es: `Ciudad de ritmo rápido, alimentación equilibrada`
        },
        description: {
            en: 'Japanese efficiency meets nutrition.', ru: 'Японская эффективность встречается с питанием.', kk: 'Жапон тиімділігі тағаммен кездеседі.', fr: 'Efficacité japonaise et nutrition.',
            de: `Japanische Effizienz trifft auf Ernährung.`,
            es: `La eficiencia japonesa se une a la nutrición.`
        },
        shortDescription: {
            en: 'Japanese efficient eating', ru: 'Японское эффективное питание', kk: 'Жапон тиімді тағамы', fr: 'Alimentation japonaise efficace',
            de: `Japanisches effizientes Essen`,
            es: `Alimentación eficiente japonesa`
        },
        category: 'destinations', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Destinations', streakThreshold: 0.6,
        embrace: ['fish', 'rice', 'miso', 'vegetables', 'edamame', 'seaweed', 'green tea', 'noodles'],
        minimize: ['excessive processed foods', 'skipping meals'],
        dailyTracker: [{
            key: 'bento', label: {
                en: 'Bento balance', ru: 'Баланс бенто', kk: 'Бенто теңгерімі', fr: 'Équilibre bento',
                de: `Bento-Balance`,
                es: `balanza bento`
            }
        }],
        suitableFor: ['japanese', 'urban'], isFeatured: false, popularityScore: 78, tags: ['destinations', 'tokyo'], emoji: '🗼', target: 'all', ageRange: '20-50',
        imageUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&q=80', color: '#FF5722', // Tokyo Energy, Japanese efficiency, vibrant city life
    },
    {
        slug: 'scandi_hygge', name: {
            en: 'Scandi Hygge', ru: 'Скандинавский Хюгге', kk: 'Скандинавиялық Хюгге', fr: 'Scandi Hygge',
            de: `Scandi gemütlich`,
            es: `Escandinavo acogedor`
        },
        subtitle: {
            en: 'Cozy, balanced, sustainably happy', ru: 'Уютно, сбалансированно, счастливо', kk: 'Жайлы, теңгерімді, бақытты', fr: 'Cocooning, équilibré, durablement heureux',
            de: `Gemütlich, ausgeglichen, nachhaltig glücklich`,
            es: `Acogedor, equilibrado, sosteniblemente feliz`
        },
        description: {
            en: 'Nordic eating meets hygge lifestyle.', ru: 'Скандинавское питание встречается с хюгге.', kk: 'Скандинавиялық тағам хюгге өмір салтымен.', fr: 'Alimentation nordique et hygge.',
            de: `Nordisches Essen trifft auf Hygge-Lifestyle.`,
            es: `La alimentación nórdica se une al estilo de vida hygge.`
        },
        shortDescription: {
            en: 'Nordic cozy eating', ru: 'Скандинавское уютное питание', kk: 'Скандинавиялық жайлы тағам', fr: 'Alimentation nordique cocooning',
            de: `Nordisches gemütliches Essen`,
            es: `Comida nórdica acogedora`
        },
        category: 'destinations', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Destinations', streakThreshold: 0.6,
        embrace: ['fatty fish', 'salmon', 'whole grain bread', 'berries', 'root vegetables', 'dairy', 'skyr', 'coffee'],
        minimize: ['excessive processed foods', 'rushed eating'],
        dailyTracker: [{
            key: 'hygge', label: {
                en: 'Hygge moment', ru: 'Момент хюгге', kk: 'Хюгге сәті', fr: 'Moment hygge',
                de: `Hygge-Moment`,
                es: `Momento higiénico`
            }
        }],
        suitableFor: ['nordic', 'cozy'], isFeatured: true, popularityScore: 92, tags: ['destinations', 'nordic'], emoji: '🇩🇰', target: 'all', ageRange: '25-60', // FIX #11: Increase popularity and make featured - Scandinavian lifestyle is globally popular
        imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80', color: '#607D8B', // Scandi Hygge, cozy, comfort, Nordic lifestyle
    },
    // ============================================
    // 👗 AESTHETICS (5 programs)
    // ============================================
    {
        slug: '1950s_bombshell', name: {
            en: '1950s Bombshell', ru: 'Гламур 50-х', kk: '50-ші Жылдар Гламуры', fr: 'Bombshell années 50',
            de: `Bombe der 1950er Jahre`,
            es: `Bomba de los años 50`
        },
        subtitle: {
            en: 'Curves, confidence, classic beauty', ru: 'Изгибы, уверенность, классическая красота', kk: 'Иілмелер, сенімділік', fr: 'Courbes, confiance, beauté classique',
            de: `Kurven, Selbstvertrauen, klassische Schönheit`,
            es: `Curvas, confianza, belleza clásica.`
        },
        description: {
            en: 'Real food, real curves. Protein-rich, whole ingredients.', ru: 'Настоящая еда, настоящие формы.', kk: 'Нағыз тағам, нағыз иілмелер.', fr: 'Vraie nourriture, vraies courbes. Protéines, ingrédients bruts.',
            de: `Echtes Essen, echte Kurven. Proteinreiche, vollwertige Zutaten.`,
            es: `Comida real, curvas reales. Ingredientes integrales ricos en proteínas.`
        },
        shortDescription: {
            en: 'Classic curves nutrition', ru: 'Питание для классических форм', kk: 'Классикалық иілмелер тағамы', fr: 'Nutrition courbes classiques',
            de: `Klassische Kurvenernährung`,
            es: `Nutrición curvas clásicas`
        },
        category: 'aesthetics', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Aesthetics', streakThreshold: 0.6,
        embrace: ['eggs', 'steak', 'fish', 'cottage cheese', 'whole milk', 'vegetables', 'grapefruit'],
        minimize: ['processed foods', 'TV dinners', 'diet products'],
        dailyTracker: [{
            key: 'protein', label: {
                en: 'Protein at every meal', ru: 'Белок при каждом приёме', kk: 'Әр тағамда белок', fr: 'Protéines à chaque repas',
                de: `Protein zu jeder Mahlzeit`,
                es: `Proteína en cada comida`
            }
        }],
        suitableFor: ['curves', 'classic'], isFeatured: false, popularityScore: 75, tags: ['aesthetics', 'vintage'], emoji: '💄', target: 'female', ageRange: '20-50',
        imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80', color: '#E91E63', // 1950s Bombshell, vintage glamour, classic beauty
    },
    {
        slug: 'prima_ballerina', name: {
            en: 'Prima Ballerina', ru: 'Прима-балерина', kk: 'Прима-балерина', fr: 'Prima ballerina',
            de: `Prima Ballerina`,
            es: `Primera bailarina`
        },
        subtitle: {
            en: 'Grace, discipline, elegant strength', ru: 'Грация, дисциплина, элегантная сила', kk: 'Сәнділік, тәртіп', fr: 'Grâce, discipline, force élégante',
            de: `Anmut, Disziplin, elegante Stärke`,
            es: `Gracia, disciplina, fuerza elegante.`
        },
        description: {
            en: 'Eating for performance and grace. Carbs for energy, protein for strength.', ru: 'Питание для производительности и грации.', kk: 'Өнер көрсету және сәнділік үшін тағам.', fr: 'Manger pour performance et grâce. Glucides énergie, protéines force.',
            de: `Essen für Leistung und Anmut. Kohlenhydrate für Energie, Protein für Kraft.`,
            es: `Comer para obtener rendimiento y gracia. Carbohidratos para obtener energía, proteínas para fortalecer.`
        },
        shortDescription: {
            en: 'Dancer nutrition', ru: 'Питание танцора', kk: 'Биші тағамы', fr: 'Nutrition danseur',
            de: `Tänzerernährung`,
            es: `Nutrición bailarina`
        },
        category: 'aesthetics', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Aesthetics', streakThreshold: 0.7,
        embrace: ['complex carbs', 'oatmeal', 'pasta', 'quinoa', 'lean proteins', 'chicken', 'fish', 'eggs', 'bananas', 'berries'],
        minimize: ['heavy greasy foods', 'excessive sugar', 'alcohol'],
        dailyTracker: [{
            key: 'dancer_fuel', label: {
                en: 'Dancer-style eating', ru: 'Питание танцора', kk: 'Биші тағамы', fr: 'Alimentation style danseur',
                de: `Essen im Tänzerstil`,
                es: `Comer al estilo bailarina`
            }
        }],
        suitableFor: ['dance', 'grace'], isFeatured: false, popularityScore: 72, tags: ['aesthetics', 'dance'], emoji: '🩰', target: 'female', ageRange: '16-45',
        imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80', // Prima Ballerina, graceful dance, elegant movement
        color: '#F8BBD9',
    },
    {
        slug: 'french_girl', name: {
            en: 'French Girl', ru: 'Французская Девушка', kk: 'Француз Қызы', fr: 'French Girl',
            de: `Französisches Mädchen`,
            es: `chica francesa`
        },
        subtitle: {
            en: 'Je ne sais quoi in every bite', ru: 'Необъяснимое очарование', kk: 'Түсіндірілмейтін сүйкімділік', fr: 'Je ne sais quoi à chaque bouchée',
            de: `Ich weiß nicht, was in jedem Schwanz ist`,
            es: `No se que en cada verga`
        },
        description: {
            en: 'Original intuitive eating. Three meals, no snacking, wine with dinner.', ru: 'Оригинальное интуитивное питание.', kk: 'Түпнұсқа интуитивті тағам.', fr: 'Manger intuitif originel. Trois repas, pas de grignotage, vin au dîner.',
            de: `Ursprüngliches intuitives Essen. Drei Mahlzeiten, keine Snacks, Wein zum Abendessen.`,
            es: `Alimentación intuitiva original. Tres comidas, sin refrigerios, vino con la cena.`
        },
        shortDescription: {
            en: 'French intuitive eating', ru: 'Французское интуитивное питание', kk: 'Француз интуитивті тағамы', fr: 'Alimentation intuitive française',
            de: `Französisches intuitives Essen`,
            es: `Comer intuitivo francés`
        },
        category: 'aesthetics', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Aesthetics', streakThreshold: 0.6,
        embrace: ['fresh bread', 'cheese', 'wine', 'butter', 'eggs', 'fish', 'vegetables', 'dark chocolate'],
        minimize: ['snacking', 'processed foods', 'soft drinks', 'guilt', 'large portions'],
        dailyTracker: [{
            key: 'three_meals', label: {
                en: 'Three meals, no snacking', ru: 'Три приёма пищи', kk: 'Үш тағам', fr: 'Trois repas, pas de grignotage',
                de: `Drei Mahlzeiten, keine Snacks`,
                es: `Tres comidas, sin refrigerios.`
            }
        }],
        suitableFor: ['french', 'intuitive'], isFeatured: true, popularityScore: 97, tags: ['aesthetics', 'french'], emoji: '🗼', target: 'female', ageRange: '20-60', // FIX #11: Increase popularity - French Girl is globally popular
        imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', // French girl aesthetic, intuitive eating, elegant
        color: '#9C27B0',
    },
    {
        slug: 'pin_up_retro', name: {
            en: 'Pin-Up Retro', ru: 'Ретро Пин-ап', kk: 'Ретро Пин-ап', fr: 'Pin-Up Rétro',
            de: `Pin-Up-Retro`,
            es: `pin-up retro`
        },
        subtitle: {
            en: 'Vintage curves, modern confidence', ru: 'Винтажные изгибы', kk: 'Винтаждық иілмелер', fr: 'Courbes vintage, confiance moderne',
            de: `Vintage-Kurven, modernes Selbstvertrauen`,
            es: `Curvas vintage, confianza moderna`
        },
        description: {
            en: 'Home-cooked meals, whole ingredients, no guilt.', ru: 'Домашние блюда, цельные ингредиенты.', kk: 'Үйде дайындалған тағамдар.', fr: 'Repas maison, ingrédients bruts, sans culpabilité.',
            de: `Hausgemachte Mahlzeiten, vollständige Zutaten, kein Gewissen.`,
            es: `Comidas caseras, ingredientes integrales, sin culpa.`
        },
        shortDescription: {
            en: 'Retro body-positive eating', ru: 'Ретро бодипозитивное питание', kk: 'Ретро дене-позитивті тағам', fr: 'Alimentation rétro body-positive',
            de: `Körperpositives Essen im Retro-Stil`,
            es: `Alimentación retro positiva para el cuerpo`
        },
        category: 'aesthetics', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Aesthetics', streakThreshold: 0.6,
        embrace: ['home-cooked meals', 'meat', 'fish', 'eggs', 'potatoes', 'vegetables', 'fruits', 'bread', 'butter'],
        minimize: ['processed foods', 'fast food', 'artificial ingredients', 'guilt'],
        dailyTracker: [{
            key: 'home_cooked', label: {
                en: 'Home-cooked meal', ru: 'Домашняя еда', kk: 'Үйде дайындалған тағам', fr: 'Repas fait maison',
                de: `Hausgemachte Mahlzeit`,
                es: `comida casera`
            }
        }],
        suitableFor: ['retro', 'bodypositive'], isFeatured: false, popularityScore: 70, tags: ['aesthetics', 'retro'], emoji: '🎀', target: 'female', ageRange: '20-45',
        imageUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800&q=80', color: '#F44336', // Pin-Up Retro, vintage curves, body-positive
    },
    {
        slug: 'minimalist_zen', name: {
            en: 'Minimalist Zen', ru: 'Минималистский Дзен', kk: 'Минималистік Дзен', fr: 'Minimaliste Zen',
            de: `Minimalistisches Zen`,
            es: `Zen minimalista`
        },
        subtitle: {
            en: 'Less clutter, more clarity', ru: 'Меньше беспорядка, больше ясности', kk: 'Азырақ шатасу, көбірек анықтық', fr: 'Moins de désordre, plus de clarté',
            de: `Weniger Unordnung, mehr Klarheit`,
            es: `Menos desorden, más claridad`
        },
        description: {
            en: 'Japanese-inspired minimalism. Few ingredients, high quality.', ru: 'Японский минимализм.', kk: 'Жапонға шабыттанған минимализм.', fr: 'Minimalisme inspiré du Japon. Peu d\'ingrédients.',
            de: `Japanisch inspirierter Minimalismus. Wenige Zutaten, hohe Qualität.`,
            es: `Minimalismo de inspiración japonesa. Pocos ingredientes, mucha calidad.`
        },
        shortDescription: {
            en: 'Minimalist eating', ru: 'Минималистичное питание', kk: 'Минималистік тағам', fr: 'Alimentation minimaliste',
            de: `Minimalistisches Essen`,
            es: `Comer minimalista`
        },
        category: 'aesthetics', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Aesthetics', streakThreshold: 0.6,
        embrace: ['simple ingredients', 'rice', 'fish', 'vegetables', 'tofu', 'miso', 'green tea', 'seasonal foods'],
        minimize: ['complicated recipes', 'excessive variety', 'distracted eating'],
        dailyTracker: [{
            key: 'simple_meal', label: {
                en: 'Simple, quality meal', ru: 'Простая качественная еда', kk: 'Қарапайым сапалы тағам', fr: 'Repas simple et qualité',
                de: `Einfaches, hochwertiges Essen`,
                es: `Comida sencilla y de calidad.`
            }
        }],
        suitableFor: ['minimalist', 'zen'], isFeatured: false, popularityScore: 68, tags: ['aesthetics', 'zen'], emoji: '⚪', target: 'all', ageRange: '25-60',
        imageUrl: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80', color: '#9E9E9E', // Minimalist Zen, simplicity, mindfulness, peace
    },
    // ============================================
    // ⚔️ WARRIOR_MODE (6 programs)
    // ============================================
    {
        slug: 'spartan_warrior', name: {
            en: 'Spartan Warrior', ru: 'Спартанский Воин', kk: 'Спарталық Жауынгер', fr: 'Guerrier spartiate',
            de: `Spartanischer Krieger`,
            es: `guerrero espartano`
        },
        subtitle: {
            en: 'THIS. IS. DISCIPLINE.', ru: 'ЭТО. ЕСТЬ. ДИСЦИПЛИНА.', kk: 'БҰЛ. БОЛЫП ТАБЫЛАДЫ. ТӘРТІП.', fr: 'CECI. EST. LA DISCIPLINE.',
            de: `DAS. IST. DISZIPLIN.`,
            es: `ESTE. ES. DISCIPLINA.`
        },
        description: {
            en: 'Ancient warrior fuel. Simple foods, no luxury.', ru: 'Древнее топливо воина.', kk: 'Ежелгі жауынгер отыны.', fr: 'Carburant guerrier antique. Aliments simples, pas de luxe.',
            de: `Treibstoff für alte Krieger. Einfache Lebensmittel, kein Luxus.`,
            es: `Combustible para guerreros antiguos. Alimentos sencillos, sin lujos.`
        },
        shortDescription: {
            en: 'Spartan discipline', ru: 'Спартанская дисциплина', kk: 'Спартандық тәртіп', fr: 'Discipline spartiate',
            de: `Spartanische Disziplin`,
            es: `Disciplina espartana`
        },
        category: 'warrior_mode', type: DietType.LIFESTYLE, difficulty: DietDifficulty.HARD, duration: 14, uiGroup: 'Warrior Mode', streakThreshold: 0.8,
        embrace: ['meat', 'lamb', 'beef', 'organ meats', 'bone broth', 'grains', 'barley', 'figs', 'olives'],
        minimize: ['luxury foods', 'excessive variety', 'sweets', 'weakness'],
        dailyTracker: [{
            key: 'spartan', label: {
                en: 'Spartan discipline', ru: 'Спартанская дисциплина', kk: 'Спартандық тәртіп', fr: 'Discipline spartiate',
                de: `Spartanische Disziplin`,
                es: `Disciplina espartana`
            }
        }],
        suitableFor: ['warrior', 'discipline'], isFeatured: true, popularityScore: 82, tags: ['warrior', 'spartan'], emoji: '🛡️', target: 'male', ageRange: '18-50',
        imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', // Spartan discipline, warrior mode, strength
        color: '#795548',
    },
    {
        slug: 'viking_raider', name: {
            en: 'Viking Raider', ru: 'Викинг-Завоеватель', kk: 'Викинг Басып Алушы', fr: 'Viking Raider',
            de: `Wikinger-Raider`,
            es: `Asaltante vikingo`
        },
        subtitle: {
            en: 'Fuel for conquest and cold', ru: 'Топливо для завоеваний', kk: 'Басып алу үшін отын', fr: 'Carburant conquête et froid',
            de: `Treibstoff für Eroberung und Kälte`,
            es: `Combustible para la conquista y el frío`
        },
        description: {
            en: 'Norse fuel. High fat, high protein, fermented foods.', ru: 'Скандинавское топливо.', kk: 'Норвегиялық отын.', fr: 'Carburant nordique. Gras, protéines, fermentés.',
            de: `Nordischer Treibstoff. Fettreiche, proteinreiche, fermentierte Lebensmittel.`,
            es: `Combustible nórdico. Alimentos fermentados ricos en grasas y proteínas.`
        },
        shortDescription: {
            en: 'Viking strength eating', ru: 'Питание силы викинга', kk: 'Викинг күші тағамы', fr: 'Alimentation force viking',
            de: `Wikinger-Kraftessen`,
            es: `Fuerza vikinga comiendo`
        },
        category: 'warrior_mode', type: DietType.LIFESTYLE, difficulty: DietDifficulty.HARD, duration: 14, uiGroup: 'Warrior Mode', streakThreshold: 0.8,
        embrace: ['meat', 'beef', 'pork', 'fish', 'salmon', 'dairy', 'cheese', 'butter', 'eggs', 'berries'],
        minimize: ['processed foods', 'sugar', 'weakness'],
        dailyTracker: [{
            key: 'viking', label: {
                en: 'Viking strength', ru: 'Сила викинга', kk: 'Викинг күші', fr: 'Force viking',
                de: `Wikingerstärke`,
                es: `fuerza vikinga`
            }
        }],
        suitableFor: ['warrior', 'strength'], isFeatured: false, popularityScore: 78, tags: ['warrior', 'viking'], emoji: '🪓', target: 'male', ageRange: '18-50',
        imageUrl: 'https://images.unsplash.com/photo-1597347316205-36f6c451902a?w=800&q=80', color: '#455A64', // Viking Raider, Nordic strength, warrior fuel
    },
    {
        slug: 'navy_seal', name: {
            en: 'Navy SEAL', ru: 'Морской Спецназ', kk: 'Теңіз Арнайы Бөлімі', fr: 'Navy SEAL',
            de: `Navy SEAL`,
            es: `SELLO de la Marina`
        },
        subtitle: {
            en: 'Elite fuel for elite performance', ru: 'Элитное топливо', kk: 'Элиталық отын', fr: 'Carburant élite pour performance élite',
            de: `Elite-Kraftstoff für Elite-Leistung`,
            es: `Combustible de élite para un rendimiento de élite`
        },
        description: {
            en: 'Performance nutrition, no nonsense. High calories for high output.', ru: 'Спортивное питание, без ерунды.', kk: 'Өнер көрсету тағамы, мағынасыз нәрсе жоқ.', fr: 'Nutrition performance, pas de bêtises. Calories pour output élevé.',
            de: `Leistungsernährung, kein Unsinn. Hohe Kalorien für hohe Leistung.`,
            es: `Nutrición de rendimiento, sin tonterías. Altas calorías para un alto rendimiento.`
        },
        shortDescription: {
            en: 'Elite performance nutrition', ru: 'Элитное спортивное питание', kk: 'Элиталық спорт тағамы', fr: 'Nutrition performance élite',
            de: `Elite-Leistungsnahrung`,
            es: `Nutrición para el rendimiento de élite`
        },
        category: 'warrior_mode', type: DietType.LIFESTYLE, difficulty: DietDifficulty.HARD, duration: 14, uiGroup: 'Warrior Mode', streakThreshold: 0.8,
        embrace: ['lean proteins', 'chicken', 'fish', 'beef', 'eggs', 'complex carbs', 'rice', 'oats', 'vegetables'],
        minimize: ['alcohol', 'sugar', 'fried foods', 'anything that slows you down'],
        dailyTracker: [{
            key: 'mission', label: {
                en: 'Mission fuel', ru: 'Топливо для миссии', kk: 'Миссия отыны', fr: 'Carburant mission',
                de: `Missionstreibstoff`,
                es: `Combustible de misión`
            }
        }],
        suitableFor: ['elite', 'military'], isFeatured: false, popularityScore: 80, tags: ['warrior', 'seal'], emoji: '🎖️', target: 'male', ageRange: '18-45',
        imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', color: '#263238', // Navy SEAL, elite performance, discipline
    },
    {
        slug: 'mma_fighter', name: {
            en: 'MMA Fighter', ru: 'Боец MMA', kk: 'MMA Жауынгері', fr: 'Combattant MMA',
            de: `MMA-Kämpfer`,
            es: `Luchadora de MMA`
        },
        subtitle: {
            en: 'Cut weight, stay strong, dominate', ru: 'Сбросить вес, остаться сильным', kk: 'Салмақты азайту, күшті қалу', fr: 'Sèche, reste fort, domine',
            de: `Reduzieren Sie Gewicht, bleiben Sie stark, dominieren Sie`,
            es: `Reduce peso, mantente fuerte, domina`
        },
        description: {
            en: 'Fight camp nutrition. High protein, strategic carbs.', ru: 'Питание бойцовского лагеря.', kk: 'Жауынгер лагері тағамы.', fr: 'Nutrition de camp d\'entraînement. Protéines élevées, glucides stratégiques.',
            de: `Kampflager-Ernährung. Hoher Proteingehalt, strategische Kohlenhydrate.`,
            es: `Lucha contra la nutrición del campamento. Carbohidratos estratégicos y ricos en proteínas.`
        },
        shortDescription: {
            en: 'Fighter nutrition', ru: 'Питание бойца', kk: 'Жауынгер тағамы', fr: 'Nutrition combattant',
            de: `Kämpferernährung`,
            es: `Nutrición de luchador`
        },
        category: 'warrior_mode', type: DietType.LIFESTYLE, difficulty: DietDifficulty.HARD, duration: 14, uiGroup: 'Warrior Mode', streakThreshold: 0.8,
        embrace: ['lean proteins', 'chicken', 'fish', 'eggs', 'vegetables', 'complex carbs', 'fruits', 'water'],
        minimize: ['sodium', 'alcohol', 'junk food'],
        dailyTracker: [{
            key: 'fight_ready', label: {
                en: 'Fight ready', ru: 'Готов к бою', kk: 'Ұрысқа дайын', fr: 'Prêt au combat',
                de: `Kampfbereit`,
                es: `Listo para pelear`
            }
        }],
        suitableFor: ['mma', 'fighter'], isFeatured: false, popularityScore: 76, tags: ['warrior', 'mma'], emoji: '🥊', target: 'male', ageRange: '18-40',
        imageUrl: 'https://images.unsplash.com/photo-1562771379-eafdca7a02f8?w=800&q=80', color: '#D32F2F', // MMA Fighter, combat nutrition, peak performance
    },
    {
        slug: 'ceo_warrior', name: {
            en: 'CEO Warrior', ru: 'CEO-Воин', kk: 'CEO Жауынгері', fr: 'CEO Warrior',
            de: `CEO Warrior`,
            es: `Guerrero CEO`
        },
        subtitle: {
            en: 'Dominate the boardroom', ru: 'Доминируй в зале заседаний', kk: 'Кеңседе басым бол', fr: 'Domine la salle de réunion',
            de: `Beherrschen Sie den Sitzungssaal`,
            es: `Dominar la sala de juntas`
        },
        description: {
            en: 'Biohacker meets executive. IF, keto principles.', ru: 'Биохакинг встречается с руководителем.', kk: 'Биохакинг басшымен кездеседі.', fr: 'Biohacking dirigeant. Jeûne intermittent, principes keto.',
            de: `Biohacker trifft Führungskraft. WENN, Keto-Prinzipien.`,
            es: `Biohacker se reúne con un ejecutivo. SI, principios cetogénicos.`
        },
        shortDescription: {
            en: 'Executive biohacking', ru: 'Биохакинг руководителя', kk: 'Басшы биохакингі', fr: 'Biohacking dirigeant',
            de: `Biohacking für Führungskräfte`,
            es: `Biohacking ejecutivo`
        },
        category: 'warrior_mode', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Warrior Mode', streakThreshold: 0.7,
        howItWorks: {
            en: [
                'For high-performers who treat their body like a company - optimized, measured, and running at peak efficiency. Combines biohacking principles with practical executive nutrition for 14-hour days.',
                'The CEO Warrior tracks biomarkers, uses strategic supplementation, times meals for cognitive performance, and treats nutrition as a competitive advantage. If you\'re outworking everyone, you need to out-fuel everyone.',
                'Morning protocol: black coffee with MCT oil for fat-fueled focus, delayed first meal until 10-11am (compressed eating window), high-protein lunch for afternoon performance, early light dinner for sleep quality.',
                'Supplements are strategic, not random: magnesium for sleep, omega-3 for brain, vitamin D for everything, and creatine for both cognitive and physical performance.'
            ],
            ru: [
                'Для высокоэффективных людей, которые относятся к своему телу как к компании - оптимизируют, измеряют и работают на пике эффективности. Сочетает принципы биохакинга с практичным питанием руководителя.',
                'CEO-Воин отслеживает биомаркеры, планирует приемы пищи для когнитивной производительности и считает питание конкурентным преимуществом. Заправляйте организм лучше всех.',
                'Утренний протокол: черный кофе с МСТ-маслом для фокуса, первый прием пищи в 10-11 утра (сжатое окно питания), высокобелковый обед для продуктивности днем и ранний легкий ужин для качества сна.',
                'Добавки стратегические, а не случайные: магний для сна, омега-3 для мозга, витамин D для всего и креатин для когнитивной и физической продуктивности.'
            ],
            kk: [
                'Өз денесіне компания ретінде қарайтын жоғары тиімді адамдарға арналған - оңтайландырылған және ең жоғары тиімділікпен жұмыс істейді. Биохакинг қағидаларын 14 сағаттық жұмыс күніне арналған басшының тамақтануымен біріктіреді.',
                'CEO Жауынгері биомаркерлерді қадағалайды, когнитивті өнімділік үшін тамақтану уақытын жоспарлайды және тамақтануды бәсекелестік артықшылық ретінде қарастырады.',
                'Таңғы хаттама: назар аудару үшін МСТ майы қосылған қара кофе, алғашқы тамақты 10-11-ге дейін кешіктіру, күндізгі өнімділікке арналған ақуызға бай түскі ас және ұйқы сапасы үшін жеңіл кешкі ас.',
                'Қоспалар стратегиялық болып табылады: ұйқыға арналған магний, миға арналған омега-3, барлығына арналған D витамині, сондай-ақ креатин.'
            ],
            fr: [
                'Pour les personnes hautement performantes qui traitent leur corps comme une entreprise. Combine les principes du biohacking avec une nutrition exécutive pratique pour des journées de 14 heures.',
                'Le CEO Warrior suit ses biomarqueurs, synchronise ses repas pour la performance cognitive et traite la nutrition comme un avantage concurrentiel.',
                'Protocole matinal : café noir avec huile MCT pour la concentration, premier repas retardé à 10h-11h, déjeuner hyperprotéiné pour la performance, dîner léger et tôt pour le sommeil.',
                'Les suppléments sont stratégiques, pas aléatoires : magnésium pour le sommeil, oméga-3 pour le cerveau, vitamine D pour tout et créatine pour les performances.'
            ],
            de: [
                'Für Leistungsträger, die ihren Körper wie ein Unternehmen behandeln. Kombiniert Biohacking-Prinzipien mit praktischer Führungskräfteernährung für 14-Stunden-Tage.',
                'Der CEO Warrior verfolgt Biomarker, plant Mahlzeiten für die kognitive Leistung und betrachtet Ernährung als Wettbewerbsvorteil.',
                'Morgenprotokoll: schwarzer Kaffee mit MCT-Öl, erste Mahlzeit auf 10-11 Uhr verschoben, proteinreiches Mittagessen für die Leistung, frühes leichtes Abendessen für die Schlafqualität.',
                'Nahrungsergänzungsmittel sind strategisch: Magnesium für den Schlaf, Omega-3 für das Gehirn, Vitamin D für alles und Kreatin für kognitive und körperliche Leistungsfähigkeit.'
            ],
            es: [
                'Para personas de alto rendimiento que tratan su cuerpo como una empresa. Combina los principios del biohacking con la nutrición ejecutiva práctica para jornadas de 14 horas.',
                'El Guerrero CEO realiza un seguimiento de los biomarcadores, programa las comidas para el rendimiento cognitivo y trata la nutrición como una ventaja competitiva.',
                'Protocolo matutino: café solo con aceite MCT para concentrarse, primera comida retrasada hasta las 10-11 a.m., almuerzo rico en proteínas para el rendimiento de la tarde, cena ligera y temprana para la calidad del sueño.',
                'Los suplementos son estratégicos: magnesio para dormir, omega-3 para el cerebro, vitamina D para todo y creatina para el rendimiento cognitivo y físico.'
            ]
        },
        embrace: ['healthy fats', 'MCT oil', 'avocado', 'olive oil', 'quality proteins', 'grass-fed beef', 'eggs', 'low-carb vegetables'],
        minimize: ['sugar', 'processed carbs', 'frequent meals', 'blood sugar spikes'],
        dailyTracker: [{
            key: 'optimized', label: {
                en: 'Optimized day', ru: 'Оптимизированный день', kk: 'Оңтайландырылған күн', fr: 'Journée optimisée',
                de: `Optimierter Tag`,
                es: `Día optimizado`
            }
        }],
        suitableFor: ['biohacker', 'executive'], isFeatured: true, popularityScore: 74, tags: ['warrior', 'ceo'], emoji: '💼', target: 'male', ageRange: '25-55',
        imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80', color: '#37474F', // CEO Warrior, executive performance, high performance
    },
    {
        slug: 'stoic_monk', name: {
            en: 'Stoic Monk', ru: 'Стоический Монах', kk: 'Стоик Монах', fr: 'Moine stoïque',
            de: `Stoischer Mönch`,
            es: `Monje estoico`
        },
        subtitle: {
            en: 'Master your body, master your mind', ru: 'Управляй телом, управляй умом', kk: 'Денеңізді басқарыңыз', fr: 'Maîtrise corps et esprit',
            de: `Beherrsche deinen Körper, beherrsche deinen Geist`,
            es: `Domina tu cuerpo, domina tu mente`
        },
        description: {
            en: 'Voluntary simplicity. Eat little, want nothing.', ru: 'Добровольная простота.', kk: 'Ерікті қарапайымдылық.', fr: 'Simplicité volontaire. Manger peu, ne rien désirer.',
            de: `Freiwillige Einfachheit. Iss wenig, will nichts.`,
            es: `Simplicidad voluntaria. Come poco, no quieres nada.`
        },
        shortDescription: {
            en: 'Stoic simplicity', ru: 'Стоическая простота', kk: 'Стоик қарапайымдылығы', fr: 'Simplicité stoïque',
            de: `Stoische Einfachheit`,
            es: `Simplicidad estoica`
        },
        category: 'warrior_mode', type: DietType.LIFESTYLE, difficulty: DietDifficulty.HARD, duration: 14, uiGroup: 'Warrior Mode', streakThreshold: 0.8,
        embrace: ['simple foods', 'rice', 'beans', 'vegetables', 'fish', 'eggs', 'water', 'tea', 'fasting'],
        minimize: ['luxury', 'excess', 'emotional eating'],
        dailyTracker: [{
            key: 'stoic', label: {
                en: 'Stoic discipline', ru: 'Стоическая дисциплина', kk: 'Стоик тәртібі', fr: 'Discipline stoïque',
                de: `Stoische Disziplin`,
                es: `Disciplina estoica`
            }
        }],
        suitableFor: ['stoic', 'minimalist'], isFeatured: false, popularityScore: 70, tags: ['warrior', 'stoic'], emoji: '🧘', target: 'all', ageRange: '25-60',
        imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80', color: '#78909C', // Stoic Monk, minimalism, discipline, simplicity
    },
    // ============================================
    // 📅 SEASONAL (4 programs)
    // ============================================
    {
        slug: 'summer_beach_body', name: {
            en: 'Summer Beach Body', ru: 'Пляжное Тело', kk: 'Пляж Денесі', fr: 'Corps plage été',
            de: `Sommer-Strand-Body`,
            es: `Cuerpo de playa de verano`
        },
        subtitle: {
            en: '4 weeks to your most confident summer', ru: '4 недели до уверенного лета', kk: 'Ең сенімді жазға 4 апта', fr: '4 semaines vers l\'été le plus confiant',
            de: `Nur noch 4 Wochen bis zu Ihrem selbstbewusstesten Sommer`,
            es: `4 semanas para tu verano más seguro`
        },
        description: {
            en: 'Light, clean eating for beach confidence.', ru: 'Лёгкое, чистое питание для пляжной уверенности.', kk: 'Пляж сенімділігі үшін жеңіл тағам.', fr: 'Manger léger et sain pour confiance plage.',
            de: `Leichtes, sauberes Essen für mehr Selbstvertrauen am Strand.`,
            es: `Comida ligera y limpia para tener confianza en la playa.`
        },
        shortDescription: {
            en: 'Beach body prep', ru: 'Подготовка пляжного тела', kk: 'Пляж денесін дайындау', fr: 'Prépa corps plage',
            de: `Körpervorbereitung am Strand`,
            es: `Preparación del cuerpo en la playa`
        },
        category: 'seasonal', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Seasonal', streakThreshold: 0.7,
        embrace: ['grilled fish', 'grilled chicken', 'egg whites', 'leafy greens', 'cucumber', 'berries', 'watermelon', 'quinoa'],
        minimize: ['bread', 'pasta', 'sugar', 'alcohol', 'fried foods'],
        dailyTracker: [{
            key: 'beach_ready', label: {
                en: 'Beach ready day', ru: 'День готов к пляжу', kk: 'Пляжқа дайын күн', fr: 'Journée prête plage',
                de: `Strandreifer Tag`,
                es: `Día listo para la playa`
            }
        }],
        suitableFor: ['summer', 'beach'], isFeatured: true, popularityScore: 88, tags: ['seasonal', 'summer'], emoji: '☀️', target: 'all', ageRange: '18-45',
        imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80', // Summer body, beach ready, healthy lifestyle
        color: '#00BCD4',
    },
    {
        slug: 'new_year_reset', name: {
            en: 'New Year Reset', ru: 'Новогоднее Обновление', kk: 'Жаңа Жылдық Қалпына Келтіру', fr: 'Reset Nouvel An',
            de: `Neujahrs-Reset`,
            es: `Reinicio de año nuevo`
        },
        subtitle: {
            en: 'Fresh start, clean slate', ru: 'Новое начало, чистый лист', kk: 'Жаңа бастау, таза парақ', fr: 'Nouveau départ, page blanche',
            de: `Neuanfang, saubere Weste`,
            es: `Un nuevo comienzo, borrón y cuenta nueva`
        },
        description: {
            en: 'Gentle reset after indulgent times.', ru: 'Мягкое обновление после излишеств.', kk: 'Ләззат кезеңдерінен кейінгі жұмсақ қалпына келтіру.', fr: 'Reset doux après les excès.',
            de: `Sanfter Neustart nach genussvollen Zeiten.`,
            es: `Reinicio suave después de tiempos indulgentes.`
        },
        shortDescription: {
            en: 'New year reset', ru: 'Новогоднее обновление', kk: 'Жаңа жылдық қалпына келтіру', fr: 'Reset Nouvel An',
            de: `Neujahrs-Reset`,
            es: `reinicio de año nuevo`
        },
        category: 'seasonal', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Seasonal', streakThreshold: 0.6,
        embrace: ['all vegetables', 'whole fruits', 'lean proteins', 'legumes', 'whole grains', 'herbal tea', 'water'],
        minimize: ['processed foods', 'sugar', 'alcohol', 'excessive coffee'],
        dailyTracker: [{
            key: 'reset', label: {
                en: 'Reset day', ru: 'День обновления', kk: 'Қалпына келтіру күні', fr: 'Journée reset',
                de: `Tag zurücksetzen`,
                es: `Reiniciar día`
            }
        }],
        suitableFor: ['reset', 'newyear'], isFeatured: false, popularityScore: 82, tags: ['seasonal', 'newyear'], emoji: '🎆', target: 'all', ageRange: '18-60',
        imageUrl: 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=800&q=80', color: '#673AB7', // New Year Reset, fresh start, clean slate
    },
    {
        slug: 'wedding_ready', name: {
            en: 'Wedding Ready', ru: 'К Свадьбе Готова', kk: 'Үйленуге Дайын', fr: 'Prête pour le mariage',
            de: `Bereit für die Hochzeit`,
            es: `Listo para la boda`
        },
        subtitle: {
            en: 'Glowing, confident, picture-perfect', ru: 'Сияющая, уверенная, идеальная', kk: 'Жарқыраған, сенімді', fr: 'Lumineuse, confiante, parfaite en photo',
            de: `Strahlend, selbstbewusst, bildschön`,
            es: `Brillante, confiado, perfecto`
        },
        description: {
            en: 'Gradual, sustainable approach for your special day.', ru: 'Постепенный подход к особому дню.', kk: 'Ерекше күніңізге арналған біртіндеп тәсіл.', fr: 'Approche graduelle et durable pour le grand jour.',
            de: `Schrittweiser, nachhaltiger Ansatz für Ihren besonderen Tag.`,
            es: `Enfoque gradual y sostenible para su día especial.`
        },
        shortDescription: {
            en: 'Wedding prep nutrition', ru: 'Питание для подготовки к свадьбе', kk: 'Үйленуге дайындық тағамы', fr: 'Nutrition prépa mariage',
            de: `Ernährung zur Hochzeitsvorbereitung`,
            es: `Nutrición para preparar la boda`
        },
        category: 'seasonal', type: DietType.LIFESTYLE, difficulty: DietDifficulty.MODERATE, duration: 14, uiGroup: 'Seasonal', streakThreshold: 0.7,
        embrace: ['lean proteins', 'fish', 'chicken', 'collagen-rich foods', 'bone broth', 'leafy greens', 'cucumber', 'quinoa', 'avocado'],
        minimize: ['high-sodium foods', 'beans', 'alcohol', 'carbonated drinks', 'dairy', 'sugar'],
        dailyTracker: [{
            key: 'bridal_glow', label: {
                en: 'Bridal glow day', ru: 'День свадебного сияния', kk: 'Үйлену жарқырауы күні', fr: 'Journée glow mariée',
                de: `Tag des Brautglühens`,
                es: `Día de brillo nupcial`
            }
        }],
        suitableFor: ['wedding', 'bride'], isFeatured: false, popularityScore: 80, tags: ['seasonal', 'wedding'], emoji: '💍', target: 'female', ageRange: '22-45',
        imageUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&q=80', color: '#FFCDD2', // Wedding Ready, bridal preparation, special occasion
    },
    {
        slug: 'holiday_balance', name: {
            en: 'Holiday Balance', ru: 'Праздничный Баланс', kk: 'Мерекелік Теңгерім', fr: 'Équilibre fêtes',
            de: `Urlaubsguthaben`,
            es: `Saldo de vacaciones`
        },
        subtitle: {
            en: 'Enjoy the season without regret', ru: 'Наслаждайтесь сезоном без сожалений', kk: 'Мерекесіз кешірімсіз ләззат алыңыз', fr: 'Profiter des fêtes sans regret',
            de: `Genießen Sie die Saison ohne Reue`,
            es: `Disfruta la temporada sin arrepentirte`
        },
        description: {
            en: 'Navigate holidays without gaining or restricting.', ru: 'Навигация по праздникам без набора веса.', kk: 'Салмақ қоспай мерекелерді басқару.', fr: 'Traverser les fêtes sans prendre ni se priver.',
            de: `Navigieren Sie durch die Feiertage, ohne zu gewinnen oder einzuschränken.`,
            es: `Navega durante las vacaciones sin ganar ni restringir.`
        },
        shortDescription: {
            en: 'Holiday balance', ru: 'Праздничный баланс', kk: 'Мерекелік теңгерім', fr: 'Équilibre fêtes',
            de: `Urlaubsbilanz`,
            es: `Saldo de vacaciones`
        },
        category: 'seasonal', type: DietType.LIFESTYLE, difficulty: DietDifficulty.EASY, duration: 14, uiGroup: 'Seasonal', streakThreshold: 0.6,
        embrace: ['vegetables at every meal', 'lean proteins', 'mindful portions', 'walking after meals'],
        minimize: ['mindless snacking', 'eating because it is there', 'guilt'],
        dailyTracker: [{
            key: 'balance', label: {
                en: 'Balanced day', ru: 'Сбалансированный день', kk: 'Теңгерімді күн', fr: 'Journée équilibrée',
                de: `Ausgeglichener Tag`,
                es: `día equilibrado`
            }
        }],
        suitableFor: ['holiday', 'balance'], isFeatured: false, popularityScore: 75, tags: ['seasonal', 'holiday'], emoji: '🎄', target: 'all', ageRange: '18-65',
        imageUrl: 'https://images.unsplash.com/photo-1512389142860-9c449e58a814?w=800&q=80', color: '#4CAF50', // Holiday Balance, festive moderation, seasonal wellness
    },
    // ============================================
    // 🔥 EXTRA (DB-only, previously missing fr)
    // ============================================
    {
        slug: 'hot_girl_walk',
        name: {
            en: 'Hot Girl Walk', ru: 'Хот Гёрл Вок', kk: 'Hot Girl Walk', fr: 'Hot Girl Walk',
            de: `Heißer Girl Walk`,
            es: `paseo de chica caliente`
        },
        subtitle: {
            en: 'Walk, reflect, glow', ru: 'Гуляй, размышляй, сияй', kk: 'Жүр, ойлан, жарқыра', fr: 'Marche, réflexion, glow',
            de: `Gehen, reflektieren, leuchten`,
            es: `Camina, reflexiona, brilla`
        },
        description: {
            en: 'Daily walks for mood and movement. Simple, sustainable, no gym required.', ru: 'Ежедневные прогулки для настроения и движения. Просто, устойчиво.', kk: 'Көңіл-күй және қозғалыс үшін күнделікті серуен. Қарапайым.', fr: 'Marches quotidiennes pour le moral et le mouvement. Simple, durable, pas de salle.',
            de: `Tägliche Spaziergänge für Stimmung und Bewegung. Einfach, nachhaltig, kein Fitnessstudio erforderlich.`,
            es: `Paseos diarios para mejorar el estado de ánimo y el movimiento. Sencillo, sostenible, no requiere gimnasio.`
        },
        shortDescription: {
            en: 'Daily walks, mood, movement', ru: 'Ежедневные прогулки', kk: 'Күнделікті серуен', fr: 'Marches quotidiennes, moral, mouvement',
            de: `Tägliche Spaziergänge, Stimmung, Bewegung`,
            es: `Paseos diarios, estado de ánimo, movimiento.`
        },
        category: 'trending',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Trending',
        streakThreshold: 0.6,
        embrace: ['walking', 'hydration', 'whole foods', 'fresh air', 'mindfulness'],
        minimize: ['sedentary', 'skipping walks', 'processed snacks'],
        dailyTracker: [
            {
                key: 'walk', label: {
                    en: 'Hot girl walk done', ru: 'Прогулка выполнена', kk: 'Серуен орындалдым', fr: 'Hot girl walk faite',
                    de: `Heißer Girl Walk fertig`,
                    es: `Paseo de chica caliente hecho`
                }
            },
            {
                key: 'hydration', label: {
                    en: 'Stayed hydrated', ru: 'Пил достаточно воды', kk: 'Жеткілікті су іштім', fr: 'Bien hydraté',
                    de: `Blieb hydriert`,
                    es: `Se mantuvo hidratado`
                }
            },
            {
                key: 'mood', label: {
                    en: 'Checked in with mood', ru: 'Отследил настроение', kk: 'Көңіл-күйді бақыладым', fr: 'Prise de conscience de l\'humeur',
                    de: `Mit Stimmung eingecheckt`,
                    es: `Registrado con humor`
                }
            },
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
        name: {
            en: 'Lazy Girl Weight Loss', ru: 'Ленивое Похудение', kk: 'Жатыңқы Арықтау', fr: 'Lazy Girl perte de poids',
            de: `Faules Mädchen, Gewichtsverlust`,
            es: `Pérdida de peso de niña perezosa`
        },
        subtitle: {
            en: 'Minimal effort, maximum results', ru: 'Минимум усилий, максимум результата', kk: 'Ең аз күш, ең көп нәтиже', fr: 'Effort minimal, résultats max',
            de: `Minimaler Aufwand, maximale Ergebnisse`,
            es: `Mínimo esfuerzo, máximos resultados.`
        },
        description: {
            en: 'Low-effort habits for sustainable weight loss. No strict diets, no punishing workouts.', ru: 'Привычки с минимумом усилий для устойчивого похудения.', kk: 'Тұрақты арықтау үшін төмен күш салу әдеттері.', fr: 'Habitudes low-effort pour une perte de poids durable. Pas de régime strict.',
            de: `Gewohnheiten mit geringem Aufwand für eine nachhaltige Gewichtsabnahme. Keine strengen Diäten, keine belastenden Trainingseinheiten.`,
            es: `Hábitos de bajo esfuerzo para una pérdida de peso sostenible. Sin dietas estrictas ni entrenamientos agotadores.`
        },
        shortDescription: {
            en: 'Low-effort, sustainable loss', ru: 'Низкие усилия, устойчивая потеря', kk: 'Төмен күш, тұрақты жоғалту', fr: 'Faible effort, perte durable',
            de: `Geringer Aufwand, nachhaltiger Verlust`,
            es: `Pérdida sostenible y con poco esfuerzo`
        },
        category: 'weight_loss',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'Weight Loss',
        streakThreshold: 0.6,
        embrace: ['simple swaps', 'more water', 'walking', 'protein', 'vegetables', 'sleep'],
        minimize: ['strict rules', 'all-or-nothing', 'burnout'],
        dailyTracker: [
            {
                key: 'simple_habit', label: {
                    en: 'One simple healthy habit', ru: 'Одна простая привычка', kk: 'Бір қарапайым сау әдет', fr: 'Une habitude saine simple',
                    de: `Eine einfache, gesunde Angewohnheit`,
                    es: `Un simple hábito saludable`
                }
            },
            {
                key: 'no_restrict', label: {
                    en: 'No harsh restriction', ru: 'Без жёстких ограничений', kk: 'Қатаң шектеу жоқ', fr: 'Pas de restriction stricte',
                    de: `Keine strenge Einschränkung`,
                    es: `Sin restricciones estrictas`
                }
            },
            {
                key: 'sustainable', label: {
                    en: 'Sustainable choice', ru: 'Устойчивый выбор', kk: 'Тұрақты таңдау', fr: 'Choix durable',
                    de: `Nachhaltige Wahl`,
                    es: `Elección sostenible`
                }
            },
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
        name: {
            en: 'High Energy', ru: 'Высокая Энергия', kk: 'Жоғары Қуат', fr: 'Haute énergie',
            de: `Hohe Energie`,
            es: `Alta energía`
        },
        subtitle: {
            en: 'Fuel up, perform, thrive', ru: 'Заправляйся, действуй, процветай', kk: 'Отында, орында, гүлден', fr: 'Se carburer, performer, prospérer',
            de: `Auftanken, Leistung erbringen, Erfolg haben`,
            es: `Recarga energías, rinde y prospera`
        },
        description: {
            en: 'Nutrition for all-day energy. Balanced meals, smart carbs, no crashes.', ru: 'Питание для энергии весь день. Сбалансированные приёмы, умные углеводы.', kk: 'Күн бойы энергия үшін тағам. Теңгерімді тамақ, ақылды көмірсулар.', fr: 'Nutrition pour énergie toute la journée. Repas équilibrés, glucides intelligents.',
            de: `Ernährung für ganztägige Energie. Ausgewogene Mahlzeiten, intelligente Kohlenhydrate, keine Abstürze.`,
            es: `Nutrición para tener energía durante todo el día. Comidas equilibradas, carbohidratos inteligentes, sin accidentes.`
        },
        shortDescription: {
            en: 'All-day energy nutrition', ru: 'Энергия на весь день', kk: 'Күн бойы энергия', fr: 'Nutrition énergie toute la journée',
            de: `Energiereiche Ernährung für den ganzen Tag`,
            es: `Nutrición energética durante todo el día`
        },
        category: 'energy',
        type: DietType.LIFESTYLE,
        difficulty: DietDifficulty.EASY,
        duration: 14,
        uiGroup: 'More Energy',
        streakThreshold: 0.6,
        embrace: ['complex carbs', 'protein', 'healthy fats', 'fruits', 'vegetables', 'hydration', 'regular meals'],
        minimize: ['sugar spikes', 'skipping meals', 'excessive caffeine'],
        dailyTracker: [
            {
                key: 'steady_energy', label: {
                    en: 'Steady energy all day', ru: 'Стабильная энергия', kk: 'Тұрақты энергия', fr: 'Énergie stable toute la journée',
                    de: `Konstante Energie den ganzen Tag`,
                    es: `Energía constante todo el día.`
                }
            },
            {
                key: 'no_crash', label: {
                    en: 'No afternoon crash', ru: 'Без послеобеденного спада', kk: 'Түскі астан кейінгі төмендеу жоқ', fr: 'Pas de coup de barre après-midi',
                    de: `Kein Absturz am Nachmittag`,
                    es: `Sin accidente por la tarde`
                }
            },
            {
                key: 'balanced_meals', label: {
                    en: 'Balanced meals', ru: 'Сбалансированные приёмы', kk: 'Теңгерімді тамақ', fr: 'Repas équilibrés',
                    de: `Ausgewogene Mahlzeiten`,
                    es: `Comidas equilibradas`
                }
            },
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
            fr: ["Visualisez votre succès", "Buvez de l'eau au réveil", "Bougez avec joie"],
            de: [
                `Visualisieren Sie Ihren Erfolg`,
                `Trinken Sie als erstes Wasser`,
                `Bewege deinen Körper mit Freude`
            ],
            es: [
                `Visualiza tu éxito`,
                `Bebe agua a primera hora`,
                `Mueve tu cuerpo con alegría`
            ]
        });

        const getVibe = (p: LifestyleProgram) => p.tags.join(', ');

        const getSampleDay = (p: LifestyleProgram) => ({
            morning: {
                en: "Lemon water & light movement", ru: "Лимонная вода и лёгкая разминка", kk: "Лимон суы және жеңіл жаттығу", fr: "Eau citron et mouvement doux",
                de: `Zitronenwasser und leichte Bewegung`,
                es: `Agua de limón y movimiento ligero.`
            },
            midday: {
                en: "Nutrient dense bowl", ru: "Питательный боул", kk: "Құнарлы тағам", fr: "Bol nutritif",
                de: `Nährstoffreiche Schüssel`,
                es: `Tazón denso en nutrientes`
            },
            evening: {
                en: "Relaxing tea & disconnect", ru: "Расслабляющий чай и отдых", kk: "Демалу шайы", fr: "Thé relaxant et déconnexion",
                de: `Entspannender Tee und Abschalten`,
                es: `Té relajante y desconexión`
            }
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
                howItWorks: (program.howItWorks as any) || Prisma.DbNull,
            } as any,
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
                howItWorks: (program.howItWorks as any) || Prisma.DbNull,
            } as any,
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

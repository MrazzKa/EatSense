import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// DIETS CATALOG - 18 diets from DIETS_CATALOG.md
// Categories: modern, medical, historical, cultural, inspired
// UI Groups: Popular, Health, Weight loss, Performance, Medical, Historical
// ============================================================================

const diets = [
    // ==================== A) Modern / Evidence-based ====================

    // 1) Mediterranean (MED_DIET)
    {
        slug: 'mediterranean',
        name: {
            en: 'Mediterranean Diet',
            ru: 'Средиземноморская диета',
            kk: 'Жерорта теңізі диетасы',
            fr: 'Régime méditerranéen',
            de: `Mittelmeerdiät`,
            es: `Dieta Mediterránea`
        },
        description: {
            en: 'A heart-healthy eating pattern inspired by the traditional cuisines of Greece, Italy, and other Mediterranean countries. Emphasizes whole foods, healthy fats, and moderate portions.',
            ru: 'Полезный для сердца рацион питания, вдохновленный традиционной кухней Греции, Италии и других средиземноморских стран. Акцент на цельные продукты, полезные жиры и умеренные порции.',
            kk: 'Грекия, Италия және басқа Жерорта теңізі елдерінің дәстүрлі асханаларынан шабыт алған жүрекке пайдалы тамақтану үлгісі.',
            fr: 'Un régime alimentaire bon pour le cœur inspiré des cuisines traditionnelles de la Grèce, de l\'Italie et d\'autres pays méditerranéens.',
            de: `Ein herzgesundes Ernährungsmuster, inspiriert von der traditionellen Küche Griechenlands, Italiens und anderer Mittelmeerländer. Der Schwerpunkt liegt auf Vollwertkost, gesunden Fetten und moderaten Portionen.`,
            es: `Un patrón de alimentación saludable para el corazón inspirado en las cocinas tradicionales de Grecia, Italia y otros países mediterráneos. Hace hincapié en los alimentos integrales, las grasas saludables y las porciones moderadas.`
        },
        shortDescription: {
            en: 'Heart-healthy Mediterranean eating',
            ru: 'Средиземноморское питание для здоровья сердца',
            kk: 'Жүрекке пайдалы Жерорта теңізі тамақтануы',
            fr: 'Alimentation méditerranéenne saine pour le cœur',
            de: `Herzgesunde mediterrane Ernährung`,
            es: `Alimentación mediterránea saludable para el corazón`
        },
        category: 'modern',
        type: 'HEALTH',
        difficulty: 'EASY',
        duration: 30,
        uiGroup: 'Health',
        evidenceLevel: 'high',
        disclaimerKey: null,
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'Base of every plate: non-starchy vegetables + whole grains (farro, bulgur, brown rice) + legumes (chickpeas, lentils, white beans)',
                'Primary fat: extra-virgin olive oil for cooking and dressing (2-4 tbsp/day). Replace butter and seed oils entirely',
                'Protein priority: fish/seafood 2-3x/week, poultry 2x/week, red meat max 1-2x/month in small portions',
                'Daily: nuts/seeds (handful), fresh fruit as dessert, herbs and spices instead of salt',
                'Moderate dairy: mainly yogurt and cheese (feta, pecorino), not processed dairy products',
                'Optional: moderate red wine with meals (1 glass women, 1-2 men). Never required',
            ],
            ru: [
                'Основа тарелки: некрахмалистые овощи + цельные злаки (полба, булгур, бурый рис) + бобовые (нут, чечевица, белая фасоль)',
                'Основной жир: оливковое масло extra-virgin для готовки и заправки (2-4 ст.л./день). Полностью заменить сливочное и растительные масла',
                'Приоритет белка: рыба/морепродукты 2-3 р/нед, птица 2 р/нед, красное мясо макс. 1-2 р/мес маленькими порциями',
                'Ежедневно: орехи/семена (горсть), свежие фрукты на десерт, травы и специи вместо соли',
                'Умеренно молочное: в основном йогурт и сыр (фета, пекорино), не обработанные молочные продукты',
                'По желанию: умеренно красное вино к еде (1 бокал жен., 1-2 муж.). Никогда не обязательно',
            ],
            kk: [
                'Тәрелке негізі: крахмалсыз көкөністер + тұтас дәнді дақылдар (полба, бұлғыр, қоңыр күріш) + бұршақ (нұт, жасымық, ақ бұршақ)',
                'Негізгі май: extra-virgin зәйтүн майы пісіруге және тұздықтауға (2-4 ас қасық/күн). Сары май мен тұқым майларын толық ауыстыру',
                'Ақуыз басымдығы: балық/теңіз өнімдері аптасына 2-3 рет, құс еті 2 рет, қызыл ет айына ең көбі 1-2 рет',
                'Күн сайын: жаңғақ/тұқым (уыс), десертке жаңа жемістер, тұздың орнына шөптер мен дәмдеуіштер',
                'Қалыпты сүт: негізінен йогурт және ірімшік (фета, пекорино), өңделмеген сүт өнімдері',
                'Міндетті емес: тамаққа бірге қалыпты қызыл шарап (әйелдерге 1, ерлерге 1-2 бокал)',
            ],
            fr: [
                'Base de chaque assiette : légumes non féculents + céréales complètes (épeautre, boulgour, riz complet) + légumineuses (pois chiches, lentilles, haricots blancs)',
                'Graisses principales : huile d\'olive extra-vierge pour la cuisson et l\'assaisonnement (2-4 cuil. à soupe/jour). Remplacer beurre et huiles de graines',
                'Priorité protéines : poisson/fruits de mer 2-3×/sem, volaille 2×/sem, viande rouge max 1-2×/mois en petites portions',
                'Quotidien : noix/graines (poignée), fruits frais en dessert, herbes et épices au lieu du sel',
                'Laitages modérés : principalement yaourt et fromage (feta, pecorino), pas de produits laitiers transformés',
                'Optionnel : vin rouge modéré au repas (1 verre femmes, 1-2 hommes). Jamais obligatoire',
            ],
            de: [
                `Basis jedes Tellers: stärkefreies Gemüse + Vollkorn (Farro, Bulgur, brauner Reis) + Hülsenfrüchte (Kichererbsen, Linsen, weiße Bohnen)`,
                `Hauptfett: natives Olivenöl extra zum Kochen und Dressing (2–4 EL/Tag). Ersetzen Sie Butter und Samenöle vollständig`,
                `Proteinpriorität: Fisch/Meeresfrüchte 2-3x/Woche, Geflügel 2x/Woche, rotes Fleisch maximal 1-2x/Monat in kleinen Portionen`,
                `Täglich: Nüsse/Samen (Handvoll), frisches Obst als Nachtisch, Kräuter und Gewürze statt Salz`,
                `Mäßige Milchprodukte: hauptsächlich Joghurt und Käse (Feta, Pecorino), keine verarbeiteten Milchprodukte`,
                `Optional: mäßiger Rotwein zu den Mahlzeiten (1 Glas Frauen, 1-2 Männer). Nie erforderlich`
                ],
            es: [
                `Base de cada plato: verduras sin almidón + cereales integrales (farro, bulgur, arroz integral) + legumbres (garbanzos, lentejas, judías blancas)`,
                `Grasa primaria: aceite de oliva virgen extra para cocinar y aliñar (2-4 cucharadas/día). Reemplazar completamente la mantequilla y los aceites de semillas.`,
                `Prioridad de proteínas: pescado/marisco 2-3 veces por semana, aves de corral 2 veces por semana, carnes rojas máximo 1-2 veces por mes en porciones pequeñas`,
                `Diariamente: nueces/semillas (un puñado), fruta fresca como postre, hierbas y especias en lugar de sal`,
                `Lácteos moderados: principalmente yogur y queso (feta, pecorino), productos lácteos no procesados`,
                `Opcional: vino tinto moderado con las comidas (1 copa mujeres, 1-2 hombres). Nunca requerido`
                ]
        },
        dailyTracker: [
            { key: 'veggies_fruits_5', label: { en: '5+ servings of vegetables and fruits today', ru: '5+ порций овощей и фруктов сегодня', kk: 'Бүгін 5+ порция көкөніс пен жеміс', fr: '5+ portions de légumes et fruits aujourd\'hui',
                de: `Heute mehr als 5 Portionen Gemüse und Obst`,
                es: `Más de 5 porciones de verduras y frutas hoy`
            } },
            { key: 'olive_oil', label: { en: 'Olive oil used as primary fat (no butter/seed oils)', ru: 'Оливковое масло как основной жир (без сливочного/растительных)', kk: 'Зәйтүн майы негізгі май ретінде (сары май/тұқым майысыз)', fr: 'Huile d\'olive comme graisse principale (pas de beurre/huiles)',
                de: `Als Primärfett wird Olivenöl verwendet (keine Butter/Samenöle)`,
                es: `Aceite de oliva utilizado como grasa primaria (sin mantequilla ni aceites de semillas)`
            } },
            { key: 'whole_grains', label: { en: 'Whole grains at every meal (not refined white flour)', ru: 'Цельные злаки в каждом приёме (не белая мука)', kk: 'Әр тамақта тұтас дәндер (ақ ұн емес)', fr: 'Céréales complètes à chaque repas (pas de farine blanche)',
                de: `Vollkorn zu jeder Mahlzeit (kein raffiniertes Weißmehl)`,
                es: `Cereales integrales en cada comida (no harina blanca refinada)`
            } },
            { key: 'protein_source', label: { en: 'Fish or legumes as main protein source', ru: 'Рыба или бобовые как основной белок', kk: 'Балық немесе бұршақ негізгі ақуыз көзі', fr: 'Poisson ou légumineuses comme source de protéines',
                de: `Fisch oder Hülsenfrüchte als Hauptproteinquelle`,
                es: `Pescado o legumbres como principal fuente de proteínas`
            } },
            { key: 'no_ultraprocessed', label: { en: 'No ultra-processed food consumed today', ru: 'Сегодня без ультра-переработанных продуктов', kk: 'Бүгін ультраөңделген тағам жоқ', fr: 'Aucun aliment ultra-transformé aujourd\'hui',
                de: `Heute werden keine hochverarbeiteten Lebensmittel konsumiert`,
                es: `Hoy en día no se consumen alimentos ultraprocesados`
            } },
            { key: 'water_2l', label: { en: 'Minimum 2L of water (not sugary drinks)', ru: 'Минимум 2л воды (не сладкие напитки)', kk: 'Кемінде 2л су (тәтті сусын емес)', fr: 'Minimum 2L d\'eau (pas de boissons sucrées)',
                de: `Mindestens 2 l Wasser (keine zuckerhaltigen Getränke)`,
                es: `Mínimo 2L de agua (no bebidas azucaradas)`
            } },
        ],
        notFor: null,
        suitableFor: ['heart_health', 'weight_loss', 'diabetes', 'longevity'],
        notSuitableFor: [],
        allowedFoods: ['vegetables', 'fruits', 'whole_grains', 'fish', 'olive_oil', 'nuts', 'legumes'],
        restrictedFoods: ['processed_foods', 'red_meat', 'sugar', 'refined_grains'],
        macroSplit: { protein: 20, carbs: 50, fat: 30 },
        tips: {
            en: ['Use olive oil as your primary fat source', 'Eat fish at least twice a week', 'Enjoy meals with family'],
            ru: ['Используйте оливковое масло', 'Ешьте рыбу минимум два раза в неделю', 'Наслаждайтесь едой в кругу семьи'],
            kk: ['Зәйтүн майын негізгі май көзі ретінде пайдаланыңыз', 'Аптасына кем дегенде екі рет балық жеңіз', 'Отбасымен бірге тамақтаныңыз'],
            fr: ['Utilisez l\'huile d\'olive comme principale source de lipides', 'Mangez du poisson au moins deux fois par semaine', 'Prenez les repas en famille'],
            de: [
                `Verwenden Sie Olivenöl als primäre Fettquelle`,
                `Essen Sie mindestens zweimal pro Woche Fisch`,
                `Genießen Sie Mahlzeiten mit der Familie`
                ],
            es: [
                `Utilice aceite de oliva como principal fuente de grasa`,
                `Coma pescado al menos dos veces por semana.`,
                `Disfruta de las comidas en familia`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80',
        color: '#4CAF50',
        isFeatured: true,
        popularityScore: 95,
        tags: ['heart_healthy', 'sustainable', 'evidence_based'],
    },

    // 2) DASH (DASH_DIET)
    {
        slug: 'dash',
        name: {
            en: 'DASH Diet',
            ru: 'Диета DASH',
            kk: 'DASH диетасы',
            fr: 'Régime DASH',
            de: `DASH-Diät`,
            es: `Dieta DASH`
        },
        description: {
            en: 'Dietary Approaches to Stop Hypertension - a proven eating plan to lower blood pressure and improve heart health through whole foods and reduced sodium.',
            ru: 'Диетические подходы к остановке гипертонии - проверенный план питания для снижения артериального давления и улучшения здоровья сердца.',
            kk: 'Гипертонияны тоқтатудың диеталық тәсілдері - қан қысымын төмендету және жүрек денсаулығын жақсарту үшін дәлелденген тамақтану жоспары.',
            fr: 'Approches diététiques pour stopper l\'hypertension - un plan alimentaire prouvé pour réduire la pression artérielle.',
            de: `Ernährungsansätze gegen Bluthochdruck – ein bewährter Ernährungsplan zur Senkung des Blutdrucks und zur Verbesserung der Herzgesundheit durch Vollwertkost und reduzierten Natriumgehalt.`,
            es: `Enfoques dietéticos para detener la hipertensión: un plan de alimentación comprobado para reducir la presión arterial y mejorar la salud del corazón a través de alimentos integrales y sodio reducido.`
        },
        shortDescription: {
            en: 'Lower blood pressure naturally',
            ru: 'Снижение давления естественным путем',
            kk: 'Қан қысымын табиғи түрде төмендету',
            fr: 'Réduire la pression artérielle naturellement',
            de: `Senken Sie den Blutdruck auf natürliche Weise`,
            es: `Bajar la presión arterial de forma natural`
        },
        category: 'modern',
        type: 'HEALTH',
        difficulty: 'EASY',
        duration: 30,
        uiGroup: 'Health',
        evidenceLevel: 'high',
        disclaimerKey: null,
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'Sodium target: 1,500-2,300mg/day max. Read every label - sodium hides in bread, sauces, canned foods',
                '4-5 servings each of fruits AND vegetables daily (not combined - 4-5 of each)',
                '2-3 servings low-fat dairy daily (milk, yogurt, cheese) for calcium and potassium',
                'Whole grains 6-8 servings daily (oats, brown rice, whole wheat bread, quinoa)',
                'Lean proteins: poultry, fish, beans. Limit red meat to 2 small servings/week',
                'Nuts, seeds, legumes 4-5 times/week. Minimize added fats and sweets',
            ],
            ru: [
                'Цель по натрию: макс. 1500-2300мг/день. Читайте этикетки - натрий прячется в хлебе, соусах, консервах',
                '4-5 порций фруктов И овощей ежедневно (не суммарно - 4-5 каждого)',
                '2-3 порции нежирных молочных ежедневно (молоко, йогурт, сыр) для кальция и калия',
                'Цельные злаки 6-8 порций/день (овсянка, бурый рис, цельнозерновой хлеб, киноа)',
                'Нежирный белок: птица, рыба, бобовые. Красное мясо макс. 2 порции/нед',
                'Орехи, семена, бобовые 4-5 раз/нед. Минимизировать добавленные жиры и сладости',
            ],
            kk: [
                'Натрий мақсаты: күніне макс. 1500-2300мг. Жапсырмаларды оқыңыз - натрий нанда, тұздықтарда жасырылады',
                'Күн сайын 4-5 порция жеміс ЖӘНЕ көкөніс (біріктірілген емес - әрқайсысынан 4-5)',
                'Күн сайын 2-3 порция майсыз сүт өнімдері (сүт, йогурт, ірімшік) кальций мен калий үшін',
                'Тұтас дәндер күніне 6-8 порция (сұлы, қоңыр күріш, тұтас бидай наны, киноа)',
                'Майсыз ақуыз: құс, балық, бұршақ. Қызыл ет аптасына макс. 2 порция',
                'Жаңғақ, тұқым, бұршақ аптасына 4-5 рет. Қосылған майлар мен тәттілерді азайту',
            ],
            fr: [
                'Objectif sodium : max 1 500-2 300 mg/jour. Vérifier les étiquettes - sodium caché dans pain, sauces, conserves',
                '4-5 portions de fruits ET de légumes par jour (pas combinés - 4-5 de chaque)',
                '2-3 portions de laitages allégés/jour (lait, yaourt, fromage) pour calcium et potassium',
                'Céréales complètes 6-8 portions/jour (flocons d\'avoine, riz complet, pain complet, quinoa)',
                'Protéines maigres : volaille, poisson, légumineuses. Viande rouge max 2 portions/sem',
                'Noix, graines, légumineuses 4-5×/sem. Minimiser graisses ajoutées et sucreries',
            ],
            de: [
                `Natriumziel: max. 1.500–2.300 mg/Tag. Lesen Sie jedes Etikett: Natrium steckt in Brot, Soßen und Konserven`,
                `Täglich jeweils 4–5 Portionen Obst UND Gemüse (nicht kombiniert – jeweils 4–5)`,
                `Täglich 2-3 Portionen fettarme Milchprodukte (Milch, Joghurt, Käse) für Kalzium und Kalium`,
                `Vollkorn 6-8 Portionen täglich (Hafer, brauner Reis, Vollkornbrot, Quinoa)`,
                `Magere Proteine: Geflügel, Fisch, Bohnen. Begrenzen Sie rotes Fleisch auf 2 kleine Portionen pro Woche`,
                `Nüsse, Samen, Hülsenfrüchte 4-5 mal pro Woche. Reduzieren Sie den Zusatz von Fetten und Süßigkeiten auf ein Minimum`
                ],
            es: [
                `Objetivo de sodio: 1.500-2.300 mg/día máx. Lea todas las etiquetas: el sodio se esconde en el pan, las salsas y los alimentos enlatados.`,
                `4-5 porciones cada una de frutas Y verduras al día (no combinadas: 4-5 de cada una)`,
                `2-3 porciones diarias de productos lácteos bajos en grasa (leche, yogur, queso) para obtener calcio y potasio`,
                `Cereales integrales 6-8 porciones diarias (avena, arroz integral, pan integral, quinua)`,
                `Proteínas magras: aves, pescado, frijoles. Limite la carne roja a 2 porciones pequeñas por semana.`,
                `Frutos secos, semillas, legumbres 4-5 veces/semana. Minimizar las grasas y los dulces añadidos`
                ]
        },
        dailyTracker: [
            { key: 'sodium_check', label: { en: 'Sodium intake under 2,300mg (labels checked)', ru: 'Натрий менее 2300мг (этикетки проверены)', kk: 'Натрий 2300мг-дан аз (жапсырмалар тексерілді)', fr: 'Sodium sous 2 300 mg (étiquettes vérifiées)',
                de: `Natriumaufnahme unter 2.300 mg (Etiketten überprüft)`,
                es: `Ingesta de sodio inferior a 2300 mg (etiquetas revisadas)`
            } },
            { key: 'fruits_4', label: { en: '4-5 servings of fruits consumed', ru: '4-5 порций фруктов', kk: '4-5 порция жеміс', fr: '4-5 portions de fruits',
                de: `4-5 Portionen Obst verzehrt`,
                es: `Se consumen 4-5 porciones de frutas.`
            } },
            { key: 'veggies_4', label: { en: '4-5 servings of vegetables consumed', ru: '4-5 порций овощей', kk: '4-5 порция көкөніс', fr: '4-5 portions de légumes',
                de: `4-5 Portionen Gemüse verzehrt`,
                es: `Se consumen 4-5 porciones de verduras.`
            } },
            { key: 'lowfat_dairy', label: { en: 'Low-fat dairy serving included (yogurt, milk)', ru: 'Нежирная молочная порция (йогурт, молоко)', kk: 'Майсыз сүт өнімі порциясы (йогурт, сүт)', fr: 'Portion de laitage allégé incluse (yaourt, lait)',
                de: `Portion fettarme Milchprodukte inklusive (Joghurt, Milch)`,
                es: `Ración de lácteos bajos en grasa incluida (yogur, leche)`
            } },
            { key: 'whole_grains', label: { en: 'Whole grains at most meals', ru: 'Цельные злаки в большинстве приёмов', kk: 'Көп тамақтарда тұтас дәндер', fr: 'Céréales complètes à la plupart des repas',
                de: `Vollkornprodukte zu den meisten Mahlzeiten`,
                es: `Cereales integrales en la mayoría de las comidas.`
            } },
            { key: 'no_sugar', label: { en: 'No added sugar or sugary drinks today', ru: 'Без добавленного сахара и сладких напитков сегодня', kk: 'Бүгін қосылған қантсыз және тәтті сусынсыз', fr: 'Pas de sucre ajouté ni boissons sucrées aujourd\'hui',
                de: `Heute gibt es keinen zugesetzten Zucker oder zuckerhaltige Getränke`,
                es: `Hoy sin azúcares añadidos ni bebidas azucaradas`
            } },
        ],
        notFor: null,
        suitableFor: ['hypertension', 'heart_health', 'weight_loss'],
        notSuitableFor: [],
        allowedFoods: ['vegetables', 'fruits', 'whole_grains', 'lean_protein', 'low_fat_dairy'],
        restrictedFoods: ['salt', 'processed_foods', 'sugary_drinks', 'red_meat'],
        macroSplit: { protein: 18, carbs: 55, fat: 27 },
        tips: {
            en: ['Read labels for sodium content', 'Use herbs instead of salt', 'Choose whole grains over refined'],
            ru: ['Читайте этикетки на содержание натрия', 'Используйте травы вместо соли', 'Выбирайте цельные злаки вместо рафинированных'],
            kk: ['Натрий мөлшері үшін жапсырмаларды оқыңыз', 'Тұздың орнына шөптерді қолданыңыз', 'Өңделген дәндерден гөрі тұтас дәндерді таңдаңыз'],
            fr: ['Lisez les étiquettes pour le sodium', 'Utilisez des herbes au lieu de sel', 'Préférez les céréales complètes'],
            de: [
                `Lesen Sie die Etiketten für den Natriumgehalt`,
                `Verwenden Sie Kräuter statt Salz`,
                `Wählen Sie Vollkorn statt raffiniertem Getreide`
                ],
            es: [
                `Lea las etiquetas para conocer el contenido de sodio.`,
                `Use hierbas en lugar de sal`,
                `Elija cereales integrales en lugar de refinados`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80',
        color: '#2196F3',
        isFeatured: true,
        popularityScore: 88,
        tags: ['heart_healthy', 'blood_pressure', 'evidence_based'],
    },

    // 3) MIND (MIND_DIET)
    {
        slug: 'mind',
        name: {
            en: 'MIND Diet',
            ru: 'Диета MIND',
            kk: 'MIND диетасы',
            fr: 'Régime MIND',
            de: `MIND-Diät`,
            es: `Dieta MENTE`
        },
        description: {
            en: 'The MIND diet combines Mediterranean and DASH diets, specifically designed to boost brain health and reduce the risk of cognitive decline.',
            ru: 'Диета MIND сочетает средиземноморскую и DASH диеты, специально разработана для здоровья мозга и снижения риска когнитивного упадка.',
            kk: 'MIND диетасы Жерорта теңізі және DASH диеталарын біріктіреді, ми денсаулығын жақсарту үшін арнайы жасалған.',
            fr: 'Le régime MIND combine les régimes méditerranéen et DASH, conçu pour la santé cérébrale.',
            de: `Die MIND-Diät kombiniert mediterrane und DASH-Diäten und wurde speziell entwickelt, um die Gesundheit des Gehirns zu fördern und das Risiko eines kognitiven Verfalls zu verringern.`,
            es: `La dieta MIND combina las dietas mediterránea y DASH, diseñadas específicamente para mejorar la salud del cerebro y reducir el riesgo de deterioro cognitivo.`
        },
        shortDescription: {
            en: 'Brain-boosting diet',
            ru: 'Диета для здоровья мозга',
            kk: 'Ми денсаулығы үшін диета',
            fr: 'Régime pour la santé cérébrale',
            de: `Gehirnfördernde Diät`,
            es: `Dieta para estimular el cerebro`
        },
        category: 'modern',
        type: 'HEALTH',
        difficulty: 'EASY',
        duration: 30,
        uiGroup: 'Health',
        evidenceLevel: 'medium',
        disclaimerKey: null,
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'Leafy greens at least 6 servings/week (spinach, kale, arugula, Swiss chard, mixed greens)',
                'Berries at least 2x/week - especially blueberries and strawberries (only fruits specifically emphasized)',
                'Nuts every day as snack - walnuts preferred (omega-3 ALA), almonds and pecans also good',
                'Olive oil as primary cooking and dressing fat. Replace butter completely',
                'Fish at least 1x/week (salmon, sardines, mackerel). Poultry 2+x/week',
                'Beans and whole grains most days. Limit cheese to max 1x/week, red meat max 3x/week',
            ],
            ru: [
                'Листовая зелень минимум 6 порций/нед (шпинат, кейл, руккола, мангольд, салатный микс)',
                'Ягоды минимум 2 р/нед - особенно черника и клубника (единственные фрукты, специально выделяемые)',
                'Орехи каждый день как перекус - грецкие предпочтительны (ALA омега-3), миндаль и пекан тоже',
                'Оливковое масло как основной жир для готовки и заправки. Полностью заменить сливочное масло',
                'Рыба минимум 1 р/нед (лосось, сардины, скумбрия). Птица 2+ р/нед',
                'Бобовые и цельные злаки почти каждый день. Сыр макс. 1 р/нед, красное мясо макс. 3 р/нед',
            ],
            kk: [
                'Жапырақты жасылдар аптасына кемінде 6 порция (шпинат, кейл, руккола, мангольд)',
                'Жидектер аптасына кемінде 2 рет - әсіресе көк жидек мен құлпынай',
                'Күн сайын жаңғақ перекус ретінде - грек жаңғағы жақсы (ALA омега-3)',
                'Зәйтүн майы негізгі май ретінде пісіруге және тұздықтауға. Сары майды толық ауыстыру',
                'Балық аптасына кемінде 1 рет (лосось, сардина, скумбрия). Құс 2+ р/апт',
                'Бұршақ мен тұтас дәндер көп күндерде. Ірімшік макс. 1 р/апт, қызыл ет макс. 3 р/апт',
            ],
            fr: [
                'Légumes verts feuillus min. 6 portions/sem (épinards, chou frisé, roquette, bette à carde)',
                'Baies min. 2×/sem - surtout myrtilles et fraises (seuls fruits spécifiquement mis en avant)',
                'Noix chaque jour en collation - noix de Grenoble préférées (ALA oméga-3)',
                'Huile d\'olive comme graisse principale de cuisson. Remplacer complètement le beurre',
                'Poisson min. 1×/sem (saumon, sardines, maquereau). Volaille 2+×/sem',
                'Légumineuses et céréales complètes la plupart des jours. Fromage max 1×/sem, viande rouge max 3×/sem',
            ],
            de: [
                `Blattgemüse mindestens 6 Portionen pro Woche (Spinat, Grünkohl, Rucola, Mangold, gemischtes Gemüse)`,
                `Beeren mindestens 2x pro Woche – insbesondere Blaubeeren und Erdbeeren (nur Früchte, die ausdrücklich hervorgehoben werden)`,
                `Jeden Tag Nüsse als Snack – vorzugsweise Walnüsse (Omega-3 ALA), Mandeln und Pekannüsse sind ebenfalls gut`,
                `Olivenöl als primäres Koch- und Dressingfett. Butter vollständig ersetzen`,
                `Mindestens 1x pro Woche Fisch (Lachs, Sardinen, Makrele). Geflügel 2+x/Woche`,
                `An den meisten Tagen Bohnen und Vollkornprodukte. Beschränken Sie Käse auf maximal 1x pro Woche, rotes Fleisch auf maximal 3x pro Woche`
                ],
            es: [
                `Verduras de hojas verdes al menos 6 porciones por semana (espinacas, col rizada, rúcula, acelgas, verduras mixtas)`,
                `Bayas al menos 2 veces por semana, especialmente arándanos y fresas (solo se enfatizan específicamente las frutas)`,
                `Frutos secos todos los días como refrigerio; se prefieren las nueces (omega-3 ALA), las almendras y las nueces también son buenas`,
                `Aceite de oliva como grasa primaria para cocinar y aderezar. Reemplace la mantequilla por completo`,
                `Pescar al menos 1 vez por semana (salmón, sardinas, caballa). Aves de corral 2+x/semana`,
                `Frijoles y cereales integrales la mayoría de los días. Limite el queso a un máximo de 1 vez por semana y la carne roja a un máximo de 3 veces por semana.`
                ]
        },
        dailyTracker: [
            { key: 'leafy_greens', label: { en: 'Leafy greens consumed today (spinach, kale, arugula)', ru: 'Листовая зелень сегодня (шпинат, кейл, руккола)', kk: 'Бүгін жапырақты жасылдар (шпинат, кейл, руккола)', fr: 'Légumes verts aujourd\'hui (épinards, chou, roquette)',
                de: `Heute verzehrtes Blattgemüse (Spinat, Grünkohl, Rucola)`,
                es: `Verduras de hojas verdes que se consumen actualmente (espinacas, col rizada, rúcula)`
            } },
            { key: 'berries_weekly', label: { en: 'Berries consumed this week (target: 2+ times)', ru: 'Ягоды на этой неделе (цель: 2+ раз)', kk: 'Осы аптада жидек (мақсат: 2+ рет)', fr: 'Baies cette semaine (objectif : 2+ fois)',
                de: `Diese Woche konsumierte Beeren (Ziel: 2+ Mal)`,
                es: `Bayas consumidas esta semana (objetivo: más de 2 veces)`
            } },
            { key: 'nuts_daily', label: { en: 'Nuts eaten as daily snack (preferably walnuts)', ru: 'Орехи как перекус (лучше грецкие)', kk: 'Жаңғақ перекус ретінде (грек жаңғағы жақсы)', fr: 'Noix en collation quotidienne (noix de Grenoble de préférence)',
                de: `Nüsse als täglicher Snack (vorzugsweise Walnüsse)`,
                es: `Frutos secos consumidos como merienda diaria (preferiblemente nueces)`
            } },
            { key: 'olive_oil', label: { en: 'Olive oil used as primary fat', ru: 'Оливковое масло как основной жир', kk: 'Зәйтүн майы негізгі май ретінде', fr: 'Huile d\'olive comme graisse principale',
                de: `Als Primärfett wird Olivenöl verwendet`,
                es: `Aceite de oliva utilizado como grasa primaria.`
            } },
            { key: 'whole_grains', label: { en: 'Whole grains included in meals today', ru: 'Цельные злаки в сегодняшних приёмах пищи', kk: 'Бүгінгі тамақтарда тұтас дәндер', fr: 'Céréales complètes dans les repas aujourd\'hui',
                de: `Vollkornprodukte sind heute in den Mahlzeiten enthalten`,
                es: `Cereales integrales incluidos en las comidas de hoy`
            } },
            { key: 'no_fried_sweets', label: { en: 'No fried food or pastries/sweets consumed', ru: 'Без жареного, выпечки и сладостей', kk: 'Қуырылған тағам, пиштірме және тәтті жоқ', fr: 'Pas de friture ni de pâtisseries/sucreries',
                de: `Keine frittierten Speisen oder Gebäck/Süßigkeiten verzehren`,
                es: `No consumir frituras ni bollería/dulces`
            } },
        ],
        notFor: null,
        suitableFor: ['brain_health', 'memory', 'longevity'],
        notSuitableFor: [],
        allowedFoods: ['leafy_greens', 'berries', 'nuts', 'whole_grains', 'fish', 'olive_oil'],
        restrictedFoods: ['butter', 'cheese', 'red_meat', 'fried_food', 'sweets'],
        macroSplit: { protein: 20, carbs: 50, fat: 30 },
        tips: {
            en: ['Eat leafy greens daily', 'Have berries at least twice a week', 'Limit red meat to 4 servings per week'],
            ru: ['Ешьте зелень ежедневно', 'Ягоды минимум дважды в неделю', 'Ограничьте красное мясо до 4 порций в неделю'],
            kk: ['Күн сайын жасылдар жеңіз', 'Аптасына кем дегенде екі рет жидек жеңіз', 'Қызыл етті аптасына 4 порцияға дейін шектеңіз'],
            fr: ['Verts à feuilles quotidiennement', 'Baies au moins 2×/semaine', 'Viande rouge max 4 portions/semaine'],
            de: [
                `Essen Sie täglich Blattgemüse`,
                `Trinken Sie mindestens zweimal pro Woche Beeren`,
                `Begrenzen Sie rotes Fleisch auf 4 Portionen pro Woche`
                ],
            es: [
                `Coma verduras de hojas verdes a diario`,
                `Consume bayas al menos dos veces por semana.`,
                `Limite la carne roja a 4 porciones por semana.`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800&q=80',
        color: '#9C27B0',
        isFeatured: false,
        popularityScore: 75,
        tags: ['brain_health', 'cognitive', 'evidence_based'],
    },
    // 4) Flexitarian (FLEX_DIET)
    {
        slug: 'flexitarian',
        name: {
            en: 'Flexitarian Diet',
            ru: 'Флекситарианская диета',
            kk: 'Флекситариандық диета',
            fr: 'Régime Flexitarien',
            de: `Flexitarische Diät`,
            es: `Dieta flexitariana`
        },
        description: {
            en: 'A flexible approach to plant-based eating with occasional meat. Perfect for those who want to reduce meat consumption gradually.',
            ru: 'Гибкий подход к растительному питанию с редким употреблением мяса. Идеально для постепенного сокращения мяса.',
            kk: 'Кейде етпен бірге өсімдіктерге негізделген тамақтануға икемді көзқарас.',
            fr: 'Une approche flexible de l\'alimentation végétale avec de la viande occasionnellement.',
            de: `Ein flexibler Ansatz für eine pflanzliche Ernährung mit gelegentlichem Fleischkonsum. Perfekt für alle, die den Fleischkonsum schrittweise reduzieren möchten.`,
            es: `Un enfoque flexible para una alimentación basada en plantas con carne ocasional. Perfecto para quienes quieren reducir el consumo de carne de forma paulatina.`
        },
        shortDescription: {
            en: 'Mostly plants, some meat',
            ru: 'Больше растений, меньше мяса',
            kk: 'Көбінесе өсімдіктер, аз ет',
            fr: 'Principalement végétal, un peu de viande',
            de: `Hauptsächlich Pflanzen, etwas Fleisch`,
            es: `Principalmente plantas, algo de carne.`
        },
        category: 'modern',
        type: 'HEALTH',
        difficulty: 'EASY',
        duration: 30,
        uiGroup: 'Health',
        evidenceLevel: 'medium',
        disclaimerKey: null,
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                '5 plant-based days, 2 meat/fish days per week. Start 3+4 if 5+2 feels ambitious',
                'Plant-based protein sources: beans, lentils, tofu, tempeh, edamame, chickpeas, nuts, seeds',
                'On meat days: animal protein as side dish (quarter plate), vegetables remain the star',
                'Explore one new plant protein each week (try tempeh, seitan, or black bean burgers)',
                'Whole grains daily: quinoa, brown rice, farro, whole wheat pasta, oats',
                'Minimize processed food regardless of origin - vegan cookie is still a cookie',
            ],
            ru: [
                '5 растительных дней, 2 дня с мясом/рыбой в неделю. Начните с 3+4 если 5+2 сложно',
                'Растительные белки: фасоль, чечевица, тофу, темпе, эдамаме, нут, орехи, семена',
                'В дни с мясом: животный белок как гарнир (четверть тарелки), овощи - главные',
                'Пробуйте один новый растительный белок каждую неделю (темпе, сейтан, бургер из чёрной фасоли)',
                'Цельные злаки ежедневно: киноа, бурый рис, полба, цельнозерновая паста, овсянка',
                'Минимизировать обработанные продукты независимо от происхождения - веганское печенье всё равно печенье',
            ],
            kk: [
                'Аптасына 5 өсімдік күн, 2 ет/балық күн. 5+2 қиын болса 3+4-тен бастаңыз',
                'Өсімдік ақуыздары: бұршақ, жасымық, тофу, темпе, эдамаме, нұт, жаңғақ, тұқым',
                'Ет күндерінде: жануар ақуызы ғарнир ретінде (тәрелкенің төрттен бірі), көкөністер негізгі',
                'Әр апта бір жаңа өсімдік ақуызын сынап көріңіз (темпе, сейтан, қара бұршақ бургер)',
                'Күн сайын тұтас дәндер: киноа, қоңыр күріш, полба, тұтас бидай пастасы, сұлы',
                'Өңделген тағамдарды тегіне қарамастан азайту - веган печенье де печенье',
            ],
            fr: [
                '5 jours végétaux, 2 jours viande/poisson par semaine. Commencer 3+4 si 5+2 semble trop',
                'Sources de protéines végétales : haricots, lentilles, tofu, tempeh, edamame, pois chiches, noix',
                'Jours viande : protéine animale en accompagnement (quart d\'assiette), légumes restent la vedette',
                'Essayer une nouvelle protéine végétale chaque semaine (tempeh, seitan, burger aux haricots noirs)',
                'Céréales complètes quotidien : quinoa, riz complet, épeautre, pâtes complètes, flocons d\'avoine',
                'Minimiser les aliments transformés peu importe l\'origine - un biscuit végan reste un biscuit',
            ],
            de: [
                `5 pflanzliche Tage, 2 Fleisch-/Fischtage pro Woche. Beginnen Sie mit 3+4, wenn sich 5+2 ehrgeizig anfühlt`,
                `Pflanzliche Proteinquellen: Bohnen, Linsen, Tofu, Tempeh, Edamame, Kichererbsen, Nüsse, Samen`,
                `An Fleischtagen: tierisches Eiweiß als Beilage (Viertelteller), Gemüse bleibt der Star`,
                `Entdecken Sie jede Woche ein neues Pflanzenprotein (probieren Sie Tempeh, Seitan oder Burger mit schwarzen Bohnen)`,
                `Vollkornprodukte täglich: Quinoa, brauner Reis, Farro, Vollkornnudeln, Hafer`,
                `Reduzieren Sie verarbeitete Lebensmittel unabhängig von der Herkunft – vegane Kekse sind immer noch Kekse`
                ],
            es: [
                `5 días a base de plantas, 2 días de carne/pescado por semana. Comience 3+4 si 5+2 le parece ambicioso`,
                `Fuentes de proteínas de origen vegetal: frijoles, lentejas, tofu, tempeh, edamame, garbanzos, nueces, semillas`,
                `Los días de carne: proteínas animales como guarnición (cuarto de plato), las verduras siguen siendo las protagonistas`,
                `Explore una nueva proteína vegetal cada semana (pruebe las hamburguesas de tempeh, seitán o frijoles negros)`,
                `Cereales integrales diarios: quinua, arroz integral, farro, pasta integral, avena`,
                `Minimizar los alimentos procesados ​​independientemente de su origen: la galleta vegana sigue siendo una galleta`
                ]
        },
        dailyTracker: [
            { key: 'plant_protein', label: { en: 'Plant-based protein consumed today (beans, tofu, lentils)', ru: 'Растительный белок сегодня (фасоль, тофу, чечевица)', kk: 'Бүгін өсімдік ақуызы (бұршақ, тофу, жасымық)', fr: 'Protéine végétale aujourd\'hui (haricots, tofu, lentilles)',
                de: `Heute konsumiertes pflanzliches Protein (Bohnen, Tofu, Linsen)`,
                es: `Proteínas de origen vegetal que se consumen actualmente (frijoles, tofu, lentejas)`
            } },
            { key: 'veggies_fruits_5', label: { en: '5+ servings vegetables and fruits', ru: '5+ порций овощей и фруктов', kk: '5+ порция көкөніс пен жеміс', fr: '5+ portions de légumes et fruits',
                de: `5+ Portionen Gemüse und Obst`,
                es: `Más de 5 porciones de verduras y frutas.`
            } },
            { key: 'whole_grains', label: { en: 'Whole grains in at least one meal', ru: 'Цельные злаки хотя бы в одном приёме', kk: 'Кемінде бір тамақта тұтас дәндер', fr: 'Céréales complètes dans au moins un repas',
                de: `Vollkornprodukte in mindestens einer Mahlzeit`,
                es: `Cereales integrales en al menos una comida.`
            } },
            { key: 'new_plant_food', label: { en: 'New plant food tried this week', ru: 'Новый растительный продукт на этой неделе', kk: 'Осы аптада жаңа өсімдік тағамы сыналды', fr: 'Nouvel aliment végétal essayé cette semaine',
                de: `Diese Woche habe ich neues Pflanzenfutter ausprobiert`,
                es: `Esta semana se prueba un nuevo alimento vegetal`
            } },
            { key: 'meatfree_meals', label: { en: 'Meat-free meals today (aim for 2+)', ru: 'Безмясные приёмы сегодня (цель: 2+)', kk: 'Бүгін етсіз тамақ (мақсат: 2+)', fr: 'Repas sans viande aujourd\'hui (objectif : 2+)',
                de: `Fleischfreie Mahlzeiten heute (Ziel sind 2+)`,
                es: `Comidas sin carne hoy (apunta a 2+)`
            } },
            { key: 'min_processed', label: { en: 'Minimal processed food (plant-based junk counts too)', ru: 'Минимум обработанных (веганское жю тоже считается)', kk: 'Өңделген тағам минимум (веган жү де саналады)', fr: 'Minimum d\'aliments transformés (junk végan compte aussi)',
                de: `Wenig verarbeitete Lebensmittel (auch pflanzlicher Junkfood zählt)`,
                es: `Comida procesada mínima (la comida chatarra de origen vegetal también cuenta)`
            } },
        ],
        notFor: null,
        suitableFor: ['weight_loss', 'heart_health', 'beginners'],
        notSuitableFor: [],
        allowedFoods: ['vegetables', 'fruits', 'whole_grains', 'legumes', 'nuts', 'occasional_meat'],
        restrictedFoods: ['processed_foods', 'excessive_meat'],
        macroSplit: { protein: 20, carbs: 50, fat: 30 },
        tips: {
            en: ['Start with meatless Mondays', 'Explore plant protein sources'],
            ru: ['Начните с понедельников без мяса', 'Изучайте растительные источники белка'],
            kk: ['Етсіз дүйсенбілерден бастаңыз', 'Өсімдік ақуыз көздерін зерттеңіз'],
            fr: ['Commencez par les lundis sans viande', 'Découvrez les protéines végétales'],
            de: [
                `Beginnen Sie mit fleischlosen Montagen`,
                `Entdecken Sie pflanzliche Proteinquellen`
                ],
            es: [
                `Empieza con los lunes sin carne`,
                `Explora las fuentes de proteínas vegetales`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
        color: '#8BC34A',
        isFeatured: false,
        popularityScore: 78,
        tags: ['flexible', 'plant_based', 'beginner_friendly'],
    },

    // 5) Nordic (NORDIC_DIET)
    {
        slug: 'nordic',
        name: { en: 'Nordic', ru: 'Скандинавская', kk: 'Скандинавиялық', fr: 'Nordique',
            de: `nordisch`,
            es: `Nórdica`
        },
        description: { en: 'Based on traditional Scandinavian cuisine. Emphasizes local, seasonal foods.', ru: 'Основана на традиционной скандинавской кухне. Акцент на местных сезонных продуктах.', kk: 'Дәстүрлі скандинавиялық асханаға негізделген. Жергілікті маусымдық тағамдарға баса назар.', fr: 'Basé sur la cuisine scandinave traditionnelle. Produits locaux et de saison.',
            de: `Basierend auf traditioneller skandinavischer Küche. Der Schwerpunkt liegt auf lokalen, saisonalen Lebensmitteln.`,
            es: `Basado en la cocina tradicional escandinava. Destaca los alimentos locales y de temporada.`
        },
        shortDescription: { en: 'Scandinavian-style healthy eating', ru: 'Здоровое питание по-скандинавски', kk: 'Скандинавиялық стильдегі сау тамақтану', fr: 'Alimentation saine style scandinave',
            de: `Gesunde Ernährung im skandinavischen Stil`,
            es: `Alimentación saludable al estilo escandinavo`
        },
        category: 'modern',
        type: 'HEALTH',
        difficulty: 'EASY',
        duration: 30,
        uiGroup: 'Health',
        evidenceLevel: 'medium',
        disclaimerKey: null,
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'Fatty fish 3-4x/week: salmon, herring, mackerel, sardines - richest omega-3 sources',
                'Root vegetables daily: beetroot, carrots, parsnips, turnips, potatoes, celeriac',
                'Whole grains daily - especially rye bread (rugbrod), oats, barley. Dark, dense breads preferred',
                'Wild/foraged foods when available: berries, mushrooms, herbs. Frozen berries count year-round',
                'Canola (rapeseed) oil as primary cooking fat - Nordic alternative to olive oil, also omega-3 rich',
                'Game meats and free-range over conventional beef. Organ meats when possible',
            ],
            ru: [
                'Жирная рыба 3-4 р/нед: лосось, сельдь, скумбрия, сардины - богатейшие источники омега-3',
                'Корнеплоды ежедневно: свёкла, морковь, пастернак, репа, картофель, корневой сельдерей',
                'Цельные злаки ежедневно - особенно ржаной хлеб, овёс, ячмень. Тёмный плотный хлеб предпочтительнее',
                'Дикоросы/собранное: ягоды, грибы, травы. Замороженные ягоды считаются круглый год',
                'Рапсовое масло как основной жир - скандинавская альтернатива оливковому, тоже богато омега-3',
                'Дичь и свободный выгул вместо обычной говядины. Субпродукты при возможности',
            ],
            kk: [
                'Майлы балық 3-4 р/апт: лосось, сельдь, скумбрия, сардина - ең бай омега-3 көздері',
                'Күн сайын тамыр көкөністері: қызылша, сәбіз, пастернак, шалқан, картоп',
                'Күн сайын тұтас дәндер - әсіресе қара бидай наны, сұлы, арпа. Қара, тығыз нандар жақсы',
                'Жабайы тағамдар: жидектер, саңырауқұлақтар, шөптер. Мұздатылған жидектер бүкіл жыл саналады',
                'Рапс майы негізгі май - зәйтүн майына скандинавиялық балама, омега-3-ке де бай',
                'Жабайы ет және еркін күтім - қарапайым сиыр етінен жақсы',
            ],
            fr: [
                'Poissons gras 3-4×/sem : saumon, hareng, maquereau, sardines - sources les plus riches en oméga-3',
                'Légumes-racines quotidiens : betterave, carottes, panais, navet, pommes de terre, céleri-rave',
                'Céréales complètes quotidien - surtout pain de seigle, avoine, orge. Pains sombres et denses',
                'Aliments sauvages/cueillis : baies, champignons, herbes. Baies surgelées comptent toute l\'année',
                'Huile de colza comme graisse de cuisson principale - alternative nordique à l\'huile d\'olive',
                'Gibier et élevage en plein air plutôt que bœuf conventionnel. Abats quand possible',
            ],
            de: [
                `Fetthaltiger Fisch 3-4x/Woche: Lachs, Hering, Makrele, Sardinen – reichhaltigste Omega-3-Quellen`,
                `Wurzelgemüse täglich: Rote Bete, Karotten, Pastinaken, Rüben, Kartoffeln, Sellerie`,
                `Täglich Vollkornprodukte – insbesondere Roggenbrot (Rubrod), Hafer, Gerste. Dunkle, dichte Brote werden bevorzugt`,
                `Wildlebende/gesammelte Lebensmittel, sofern verfügbar: Beeren, Pilze, Kräuter. Gefrorene Beeren zählen das ganze Jahr über`,
                `Rapsöl als primäres Speisefett – nordische Alternative zu Olivenöl, ebenfalls reich an Omega-3-Fettsäuren`,
                `Wildfleisch und Freilandhaltung statt herkömmlichem Rindfleisch. Wenn möglich, Innereien`
                ],
            es: [
                `Pescado graso 3-4 veces por semana: salmón, arenque, caballa, sardinas: las fuentes más ricas en omega-3`,
                `Hortalizas de raíz al día: remolacha, zanahoria, chirivía, nabo, patatas, apio nabo.`,
                `Cereales integrales diariamente, especialmente pan de centeno (rugbrod), avena y cebada. Se prefieren panes oscuros y densos.`,
                `Alimentos silvestres/forrajeros cuando estén disponibles: bayas, champiñones, hierbas. Las bayas congeladas cuentan durante todo el año`,
                `Aceite de canola (colza) como grasa primaria para cocinar: alternativa nórdica al aceite de oliva, también rico en omega-3`,
                `Carnes de caza y camperas sobre ternera convencional. Vísceras cuando sea posible`
                ]
        },
        dailyTracker: [
            { key: 'fatty_fish', label: { en: 'Fatty fish consumed (salmon, herring, mackerel)', ru: 'Жирная рыба (лосось, сельдь, скумбрия)', kk: 'Майлы балық (лосось, сельдь, скумбрия)', fr: 'Poisson gras (saumon, hareng, maquereau)',
                de: `Verzehrter fetter Fisch (Lachs, Hering, Makrele)`,
                es: `Pescados grasos consumidos (salmón, arenque, caballa)`
            } },
            { key: 'root_veggies', label: { en: 'Root vegetables in at least one meal', ru: 'Корнеплоды хотя бы в одном приёме', kk: 'Кемінде бір тамақта тамыр көкөністері', fr: 'Légumes-racines dans au moins un repas',
                de: `Wurzelgemüse in mindestens einer Mahlzeit`,
                es: `Verduras de raíz en al menos una comida.`
            } },
            { key: 'rye_oats', label: { en: 'Whole grain rye bread or oats consumed', ru: 'Ржаной хлеб или овёс', kk: 'Қара бидай наны немесе сұлы', fr: 'Pain de seigle complet ou avoine',
                de: `Vollkorn-Roggenbrot oder Haferflocken verzehrt`,
                es: `Se consume pan integral de centeno o avena.`
            } },
            { key: 'berries', label: { en: 'Berries consumed (fresh or frozen)', ru: 'Ягоды (свежие или замороженные)', kk: 'Жидектер (жаңа немесе мұздатылған)', fr: 'Baies (fraîches ou surgelées)',
                de: `Verzehrte Beeren (frisch oder gefroren)`,
                es: `Bayas consumidas (frescas o congeladas)`
            } },
            { key: 'home_cooked', label: { en: 'Home-cooked meal with seasonal ingredients', ru: 'Домашняя еда с сезонными продуктами', kk: 'Маусымдық тағамдармен үйде пісірілген тамақ', fr: 'Repas maison avec ingrédients de saison',
                de: `Hausgemachte Mahlzeit mit saisonalen Zutaten`,
                es: `Comida casera con ingredientes de temporada.`
            } },
            { key: 'canola_oil', label: { en: 'Canola oil or Nordic fat used (not butter as main)', ru: 'Рапсовое масло (не сливочное как основное)', kk: 'Рапс майы (сары май негізгі емес)', fr: 'Huile de colza (pas beurre comme graisse principale)',
                de: `Rapsöl oder nordisches Fett verwendet (keine Butter als Hauptbestandteil)`,
                es: `Se utiliza aceite de canola o grasa nórdica (no mantequilla como principal)`
            } },
        ],
        notFor: null,
        suitableFor: ['heart_health', 'weight_loss', 'sustainability'],
        notSuitableFor: [],
        allowedFoods: ['fish', 'berries', 'whole_grains', 'root_vegetables', 'cabbage', 'legumes'],
        restrictedFoods: ['processed_foods', 'sugar', 'refined_grains'],
        macroSplit: { protein: 20, carbs: 50, fat: 30 },
        tips: {
            en: ['Choose local and seasonal foods', 'Try rye bread instead of wheat'],
            ru: ['Выбирайте местные и сезонные продукты', 'Попробуйте ржаной хлеб вместо пшеничного'],
            kk: ['Жергілікті және маусымдық тағамдарды таңдаңыз', 'Бидай орнына қара бидай нанын қолданып көріңіз'],
            fr: ['Privilégiez local et de saison', 'Essayez le pain de seigle'],
            de: [
                `Wählen Sie lokale und saisonale Lebensmittel`,
                `Probieren Sie Roggenbrot statt Weizenbrot`
                ],
            es: [
                `Elige alimentos locales y de temporada.`,
                `Prueba pan de centeno en lugar de trigo.`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80',
        color: '#607D8B',
        isFeatured: false,
        popularityScore: 70,
        tags: ['scandinavian', 'sustainable', 'seasonal'],
    },

    // 6) Balanced Plate (PLATE_METHOD)
    {
        slug: 'plate-method',
        name: {
            en: 'Balanced Plate Method',
            ru: 'Метод сбалансированной тарелки',
            kk: 'Теңдестірілген тәрелке әдісі',
            fr: 'Méthode de l\'assiette équilibrée',
            de: `Balanced Plate-Methode`,
            es: `Método de placa equilibrada`
        },
        description: {
            en: 'A simple visual guide to balanced eating. Divide your plate into sections: half vegetables, quarter protein, quarter carbs. Easy to follow at every meal.',
            ru: 'Простое визуальное руководство по сбалансированному питанию. Разделите тарелку на секции: половина овощей, четверть белка, четверть углеводов.',
            kk: 'Теңдестірілген тамақтануға қарапайым визуалды нұсқаулық. Тәрелкені бөліктерге бөліңіз: жартысы көкөніс, төрттен бірі ақуыз, төрттен бірі көмірсулар.',
            fr: 'Un guide visuel simple pour une alimentation équilibrée. Divisez votre assiette: moitié légumes, quart protéines, quart glucides.',
            de: `Eine einfache visuelle Anleitung für eine ausgewogene Ernährung. Teilen Sie Ihren Teller in Abschnitte auf: halb Gemüse, viertel Protein, viertel Kohlenhydrate. Leicht zu befolgen bei jeder Mahlzeit.`,
            es: `Una guía visual sencilla para una alimentación equilibrada. Divide tu plato en secciones: la mitad de verduras, un cuarto de proteína y un cuarto de carbohidratos. Fácil de seguir en cada comida.`
        },
        shortDescription: {
            en: 'Simple visual portion guide',
            ru: 'Простой визуальный гид по порциям',
            kk: 'Қарапайым визуалды порция нұсқаулығы',
            fr: 'Guide visuel simple des portions',
            de: `Einfache visuelle Portionsanleitung`,
            es: `Guía de porciones visual simple`
        },
        category: 'modern',
        type: 'HEALTH',
        difficulty: 'EASY',
        duration: 30,
        uiGroup: 'Popular',
        evidenceLevel: 'high',
        disclaimerKey: null,
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'Half plate (50%): non-starchy vegetables and fruits - salad, broccoli, peppers, tomatoes, leafy greens',
                'Quarter plate (25%): lean protein - chicken, fish, tofu, eggs, beans, lentils (palm-sized portion)',
                'Quarter plate (25%): whole grains or starchy vegetables - brown rice, quinoa, sweet potato, oats',
                'Add thumb-sized healthy fat: olive oil drizzle, quarter avocado, small handful of nuts',
                'Fruit as dessert or part of veggie/fruit half. Whole fruit over juice',
                'Water, tea, or coffee. Skip sugary drinks. Apply to every meal including breakfast',
            ],
            ru: [
                'Половина тарелки (50%): некрахмалистые овощи и фрукты - салат, брокколи, перец, помидоры, зелень',
                'Четверть тарелки (25%): нежирный белок - курица, рыба, тофу, яйца, фасоль (порция с ладонь)',
                'Четверть тарелки (25%): цельные злаки или крахмалистые овощи - бурый рис, киноа, батат, овсянка',
                'Добавьте здоровый жир размером с большой палец: оливковое масло, четверть авокадо, горсть орехов',
                'Фрукты на десерт. Целые фрукты вместо соков',
                'Вода, чай или кофе. Без сладких напитков. Применять к каждому приёму, включая завтрак',
            ],
            kk: [
                'Тәрелкенің жартысы (50%): крахмалсыз көкөністер мен жемістер - салат, брокколи, бұрыш, қызанақ',
                'Төрттен бір (25%): майсыз ақуыз - тауық, балық, тофу, жұмыртқа, бұршақ (алақан өлшемі)',
                'Төрттен бір (25%): тұтас дәндер немесе крахмалды көкөністер - қоңыр күріш, киноа, батат, сұлы',
                'Пайдалы май қосыңыз: зәйтүн майы, төрттен бір авокадо, аз жаңғақ',
                'Десертке жемістер. Шырынның орнына тұтас жеміс',
                'Су, шай немесе кофе. Тәтті сусындарсыз. Таңғы асты қоса әр тамаққа қолдану',
            ],
            fr: [
                'Moitié assiette (50%) : légumes non féculents et fruits - salade, brocoli, poivrons, tomates',
                'Quart d\'assiette (25%) : protéine maigre - poulet, poisson, tofu, œufs, haricots (taille paume)',
                'Quart d\'assiette (25%) : céréales complètes ou féculents - riz complet, quinoa, patate douce',
                'Ajouter une graisse saine (taille pouce) : filet d\'huile d\'olive, quart d\'avocat, poignée de noix',
                'Fruits en dessert. Fruits entiers plutôt que jus',
                'Eau, thé ou café. Pas de boissons sucrées. Appliquer à chaque repas y compris petit-déj',
            ],
            de: [
                `Halber Teller (50 %): nicht stärkehaltiges Gemüse und Obst – Salat, Brokkoli, Paprika, Tomaten, Blattgemüse`,
                `Viertelplatte (25 %): mageres Protein – Huhn, Fisch, Tofu, Eier, Bohnen, Linsen (handtellergroße Portion)`,
                `Viertelteller (25 %): Vollkorn oder stärkehaltiges Gemüse – brauner Reis, Quinoa, Süßkartoffel, Hafer`,
                `Fügen Sie daumengroßes gesundes Fett hinzu: einen Spritzer Olivenöl, eine viertel Avocado und eine kleine Handvoll Nüsse`,
                `Obst als Dessert oder Teil der Gemüse-/Obsthälfte. Ganze Frucht über Saft`,
                `Wasser, Tee oder Kaffee. Verzichten Sie auf zuckerhaltige Getränke. Zu jeder Mahlzeit, einschließlich Frühstück, auftragen`
                ],
            es: [
                `Medio plato (50%): verduras y frutas sin almidón: ensalada, brócoli, pimientos, tomates y verduras de hojas verdes.`,
                `Cuarto de plato (25%): proteína magra: pollo, pescado, tofu, huevos, frijoles, lentejas (porción del tamaño de la palma de la mano)`,
                `Cuarto de plato (25%): cereales integrales o vegetales con almidón: arroz integral, quinua, batata, avena.`,
                `Agregue grasa saludable del tamaño de un pulgar: un chorrito de aceite de oliva, un cuarto de aguacate y un puñado pequeño de nueces.`,
                `Fruta como postre o parte de la mitad de verdura/fruta. Fruta entera sobre jugo`,
                `Agua, té o café. Evite las bebidas azucaradas. Aplicar en cada comida incluido el desayuno.`
                ]
        },
        dailyTracker: [
            { key: 'half_veggies', label: { en: 'Half plate vegetables/fruits at every meal', ru: 'Половина тарелки овощей/фруктов в каждом приёме', kk: 'Әр тамақта тәрелкенің жартысы көкөніс/жеміс', fr: 'Moitié assiette légumes/fruits à chaque repas',
                de: `Zu jeder Mahlzeit einen halben Teller Gemüse/Obst servieren`,
                es: `Medio plato de verduras/frutas en cada comida.`
            } },
            { key: 'quarter_protein', label: { en: 'Quarter plate lean protein at every meal', ru: 'Четверть тарелки нежирный белок в каждом приёме', kk: 'Әр тамақта төрттен бір майсыз ақуыз', fr: 'Quart d\'assiette protéine maigre à chaque repas',
                de: `Zu jeder Mahlzeit einen Viertelteller mageres Protein zu sich nehmen`,
                es: `Un cuarto de plato de proteína magra en cada comida`
            } },
            { key: 'quarter_grains', label: { en: 'Quarter plate whole grains at every meal', ru: 'Четверть тарелки цельные злаки в каждом приёме', kk: 'Әр тамақта төрттен бір тұтас дәндер', fr: 'Quart d\'assiette céréales complètes à chaque repas',
                de: `Zu jeder Mahlzeit einen Viertelteller Vollkornprodukte zu sich nehmen`,
                es: `Un cuarto de plato de cereales integrales en cada comida.`
            } },
            { key: 'healthy_fat', label: { en: 'Healthy fat included (olive oil, avocado, or nuts)', ru: 'Здоровый жир (оливковое масло, авокадо, орехи)', kk: 'Пайдалы май (зәйтүн майы, авокадо, жаңғақ)', fr: 'Graisse saine incluse (huile d\'olive, avocat, noix)',
                de: `Gesundes Fett enthalten (Olivenöl, Avocado oder Nüsse)`,
                es: `Grasas saludables incluidas (aceite de oliva, aguacate o frutos secos)`
            } },
            { key: 'water_main', label: { en: 'Water as main drink (no sugary beverages)', ru: 'Вода как основной напиток (без сладких напитков)', kk: 'Су негізгі сусын (тәтті сусындарсыз)', fr: 'Eau comme boisson principale (pas de boissons sucrées)',
                de: `Wasser als Hauptgetränk (keine zuckerhaltigen Getränke)`,
                es: `Agua como bebida principal (no bebidas azucaradas)`
            } },
            { key: 'portion_control', label: { en: 'Portion sizes respected (no oversized plates or seconds)', ru: 'Порции соблюдены (без огромных тарелок и добавок)', kk: 'Порция өлшемдері сақталды (үлкен тәрелке немесе қосымшасыз)', fr: 'Portions respectées (pas d\'assiettes surdimensionnées)',
                de: `Portionsgrößen eingehalten (keine übergroßen Teller oder Sekunden)`,
                es: `Se respetan los tamaños de las porciones (no se permiten platos demasiado grandes ni segundos)`
            } },
        ],
        notFor: null,
        suitableFor: ['beginners', 'weight_management', 'diabetes'],
        notSuitableFor: [],
        allowedFoods: ['vegetables', 'lean_protein', 'whole_grains', 'fruits'],
        restrictedFoods: ['processed_foods', 'sugary_drinks'],
        macroSplit: { protein: 25, carbs: 45, fat: 30 },
        tips: {
            en: ['Use a 9-inch plate', 'Fill vegetables first', 'Drink water with meals'],
            ru: ['Используйте тарелку 23 см', 'Сначала заполняйте овощами', 'Пейте воду во время еды'],
            kk: ['23 см тәрелке пайдаланыңыз', 'Алдымен көкөністерді толтырыңыз', 'Тамақ кезінде су ішіңіз'],
            fr: ['Assiette 23 cm', 'Remplir les légumes d\'abord', 'Boire de l\'eau aux repas'],
            de: [
                `Verwenden Sie eine 9-Zoll-Platte`,
                `Füllen Sie zuerst das Gemüse`,
                `Trinken Sie Wasser zu den Mahlzeiten`
                ],
            es: [
                `Utilice un plato de 9 pulgadas`,
                `Llene las verduras primero`,
                `Beber agua con las comidas.`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
        color: '#00BCD4',
        isFeatured: true,
        popularityScore: 92,
        tags: ['beginner_friendly', 'simple', 'visual'],
    },

    // ==================== B) Weight loss / Protocols ====================

    // 7) Intermittent Fasting 14:10 (IF_14_10)
    {
        slug: 'if-14-10',
        name: { en: '14:10 Eating Window', ru: 'Окно питания 14:10', kk: '14:10 тамақтану терезесі', fr: 'Fenêtre 14:10',
            de: `14:10 Essensfenster`,
            es: `14:10 Ventana para comer`
        },
        description: { en: 'A gentler approach to intermittent fasting. Fast for 14 hours, eat within a 10-hour window.', ru: 'Более мягкий подход к интервальному голоданию. Голодание 14 часов, приём пищи в 10-часовом окне.', kk: 'Аралық аштыққа жұмсақ тәсіл. 14 сағат аштық, 10 сағаттық терезеде тамақтану.', fr: 'Jeûne intermittent plus doux. Jeûner 14 h, manger sur 10 h.',
            de: `Ein sanfterer Ansatz zum intermittierenden Fasten. 14 Stunden lang fasten, innerhalb eines 10-Stunden-Fensters essen.`,
            es: `Un enfoque más suave para el ayuno intermitente. Ayuna durante 14 horas, come dentro de un período de 10 horas.`
        },
        shortDescription: { en: 'Gentle fasting: 14h fast, 10h eating window', ru: 'Мягкое голодание: 14ч аштық, 10ч окно', kk: 'Жұмсақ аштық: 14 сағ аштық, 10 сағ терезе', fr: 'Jeûne 14 h, fenêtre 10 h',
            de: `Sanftes Fasten: 14h Fasten, 10h Essensfenster`,
            es: `Ayuno suave: 14 h de ayuno, 10 h de ventana para comer`
        },
        category: 'inspired',
        type: 'WEIGHT_LOSS',
        difficulty: 'EASY',
        duration: 30,
        uiGroup: 'Weight loss',
        evidenceLevel: 'medium',
        disclaimerKey: 'DISCLAIMER_GENERAL',
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'Choose 10-hour window: e.g., 8am-6pm or 9am-7pm',
                '14h fast (mostly overnight): water, herbal tea, black coffee only',
                'Eat 3 balanced meals within window - no need to skip breakfast',
                'Food quality focus: works even without changing what you eat, but whole foods amplify results',
                'Consistent timing daily to align with circadian rhythm',
                'After 2-3 weeks, optionally narrow to 12h, then 10h, then 8h window',
            ],
            ru: [
                'Выберите 10-часовое окно: напр. 8:00-18:00 или 9:00-19:00',
                '14ч голодания (в основном ночью): только вода, травяной чай, чёрный кофе',
                '3 сбалансированных приёма в окне - не нужно пропускать завтрак',
                'Фокус на качестве еды: работает даже без изменения рациона, но цельные продукты усиливают результат',
                'Постоянное время каждый день для синхронизации с циркадным ритмом',
                'Через 2-3 недели можно сузить до 12ч, затем 10ч, затем 8ч',
            ],
            kk: [
                '10 сағаттық терезе таңдаңыз: мыс. 8:00-18:00 немесе 9:00-19:00',
                '14с аштық (негізінен түнде): тек су, шөп шай, қара кофе',
                'Терезеде 3 теңгерімді тамақ - таңғы асты өткізу қажет емес',
                'Тағам сапасына назар: тұтас өнімдер нәтижені күшейтеді',
                'Күн сайын тұрақты уақыт циркадтық ритммен үйлесу үшін',
                '2-3 аптадан кейін қалау бойынша 12с, соң 10с, соң 8с терезеге тарылту',
            ],
            fr: [
                'Choisir fenêtre de 10h : ex. 8h-18h ou 9h-19h',
                '14h de jeûne (surtout la nuit) : eau, tisane, café noir uniquement',
                '3 repas équilibrés dans la fenêtre - pas besoin de sauter le petit-déj',
                'Qualité alimentaire : fonctionne même sans changer ce que vous mangez, aliments complets amplifient',
                'Horaires constants chaque jour pour le rythme circadien',
                'Après 2-3 semaines, réduire à 12h, puis 10h, puis 8h optionnellement',
            ],
            de: [
                `Wählen Sie ein 10-Stunden-Fenster: z. B. 8–18 Uhr oder 9–19 Uhr`,
                `14 Stunden Fasten (meistens über Nacht): Wasser, Kräutertee, nur schwarzer Kaffee`,
                `Essen Sie 3 ausgewogene Mahlzeiten innerhalb des Zeitfensters – Sie müssen das Frühstück nicht auslassen`,
                `Fokus auf Lebensmittelqualität: Funktioniert auch ohne Umstellung Ihrer Ernährung, aber Vollwertkost verstärkt die Ergebnisse`,
                `Konsistentes tägliches Timing, um sich an den zirkadianen Rhythmus anzupassen`,
                `Nach 2–3 Wochen optional auf 12 Stunden, dann auf 10 Stunden und dann auf 8 Stunden einschränken`
                ],
            es: [
                `Elija un período de 10 horas: por ejemplo, de 8 a. m. a 6 p. m. o de 9 a. m. a 7 p. m.`,
                `Ayuno de 14 horas (principalmente durante la noche): agua, té de hierbas, solo café negro`,
                `Consuma 3 comidas equilibradas dentro del plazo: no es necesario saltarse el desayuno`,
                `Enfoque en la calidad de los alimentos: funciona incluso sin cambiar lo que come, pero los alimentos integrales amplifican los resultados`,
                `Horario constante diariamente para alinearse con el ritmo circadiano.`,
                `Después de 2-3 semanas, opcionalmente reduzca la ventana a 12 h, luego a 10 h y luego a 8 h`
                ]
        },
        dailyTracker: [
            { key: 'eating_window', label: { en: 'Eating window respected (all food within 10 hours)', ru: 'Окно питания соблюдено (10ч)', kk: 'Тамақтану терезесі сақталды (10с)', fr: 'Fenêtre respectée (10h)',
                de: `Essensfenster eingehalten (alle Speisen innerhalb von 10 Stunden)`,
                es: `Se respeta la ventana de alimentación (todos los alimentos en un plazo de 10 horas)`
            } },
            { key: 'no_late_eating', label: { en: 'No late-night eating after window', ru: 'Без еды после окна', kk: 'Терезеден кейін тамақ жоқ', fr: 'Pas de repas tardif après la fenêtre',
                de: `Kein spätabendliches Essen nach dem Fenster`,
                es: `No comer tarde en la noche después de la ventana`
            } },
            { key: 'balanced_meals', label: { en: '3 balanced meals within window', ru: '3 сбалансированных приёма в окне', kk: 'Терезеде 3 теңгерімді тамақ', fr: '3 repas équilibrés dans la fenêtre',
                de: `3 ausgewogene Mahlzeiten innerhalb des Zeitfensters`,
                es: `3 comidas balanceadas dentro de la ventana`
            } },
            { key: 'hydration', label: { en: 'Adequate hydration (2L+ water)', ru: 'Достаточно воды (2л+)', kk: 'Жеткілікті су (2л+)', fr: 'Hydratation (2L+ eau)',
                de: `Ausreichende Flüssigkeitszufuhr (2L+ Wasser)`,
                es: `Hidratación adecuada (2L+ agua)`
            } },
            { key: 'no_calorie_drinks', label: { en: 'No calorie drinks outside window', ru: 'Без калорийных напитков вне окна', kk: 'Терезеден тыс калориялы сусынсыз', fr: 'Pas de boissons caloriques hors fenêtre',
                de: `Keine kalorienhaltigen Getränke vor dem Fenster`,
                es: `Bebidas sin calorías fuera de la ventana`
            } },
            { key: 'consistent_timing', label: { en: 'Consistent meal timing maintained', ru: 'Постоянное время приёмов пищи', kk: 'Тамақ уақыты тұрақты', fr: 'Horaires de repas constants',
                de: `Konsistente Essenszeiten werden eingehalten`,
                es: `Se mantiene un horario de comidas constante`
            } },
        ],
        notFor: {
            en: ['Pregnancy/breastfeeding', 'Eating disorders', 'Insulin-dependent diabetes without doctor', 'Teenagers'],
            ru: ['Беременность/ГВ', 'РПП', 'Диабет на инсулине без врача', 'Подростки'],
            kk: ['Жүктілік/емізу', 'Тамақтану бұзылыстары', 'Дәрігерсіз инсулинге тәуелді диабет', 'Жасөспірімдер'],
            fr: ['Grossesse/allaitement', 'Troubles alimentaires', 'Diabète insulinodépendant sans médecin', 'Ados'],
            de: [
                `Schwangerschaft/Stillzeit`,
                `Essstörungen`,
                `Insulinabhängiger Diabetes ohne Arzt`,
                `Teenager`
                ],
            es: [
                `Embarazo/lactancia`,
                `Trastornos alimentarios`,
                `Diabetes insulinodependiente sin médico`,
                `Adolescentes`
                ]
        },
        suitableFor: ['weight_loss', 'metabolic_health', 'beginners'],
        notSuitableFor: ['pregnant', 'eating_disorders', 'diabetes_type1', 'teenagers'],
        allowedFoods: ['all_during_eating_window'],
        restrictedFoods: ['calories_during_fasting'],
        macroSplit: { protein: 25, carbs: 45, fat: 30 },
        rules: { fastingWindow: '14 hours', eatingWindow: '10 hours' },
        tips: {
            en: ['Start with breakfast at 8am, finish dinner by 6pm', 'Black coffee and tea are OK during fasting'],
            ru: ['Начните с завтрака в 8:00, ужин до 18:00', 'Чёрный кофе и чай можно во время голодания'],
            kk: ['Таңғы асты 8:00-де бастаңыз, кешкі асты 18:00-ге дейін аяқтаңыз', 'Қара кофе мен шай аштық кезінде бола береді'],
            fr: ['Petit-déj à 8 h, dîner avant 18 h', 'Café et thé sans sucre OK pendant le jeûne'],
            de: [
                `Beginnen Sie mit dem Frühstück um 8 Uhr und beenden Sie das Abendessen um 18 Uhr`,
                `Schwarzer Kaffee und Tee sind während des Fastens in Ordnung`
                ],
            es: [
                `Comience con el desayuno a las 8 a. m. y termine la cena a las 6 p. m.`,
                `El café negro y el té están bien durante el ayuno.`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1495147466023-ac5c588e2e94?w=800&q=80',
        color: '#673AB7',
        isFeatured: false,
        popularityScore: 80,
        tags: ['fasting', 'beginner_friendly', 'flexible'],
    },

    // 8) Intermittent Fasting 16:8 (IF_16_8)
    {
        slug: 'if-16-8',
        name: {
            en: 'Intermittent Fasting 16:8',
            ru: 'Интервальное голодание 16:8',
            kk: 'Интервалды аштық 16:8',
            fr: 'Jeûne intermittent 16:8',
            de: `Intervallfasten 16:8`,
            es: `Ayuno intermitente 16:8`
        },
        description: {
            en: 'Popular fasting protocol with 16 hours of fasting and an 8-hour eating window. Supports weight loss and metabolic health.',
            ru: 'Популярный протокол голодания: 16 часов голода и 8-часовое окно питания. Поддерживает снижение веса и метаболическое здоровье.',
            kk: '16 сағат аштық және 8 сағат тамақтану терезесі бар танымал аштық хаттамасы.',
            fr: 'Protocole de jeûne populaire avec 16 heures de jeûne et une fenêtre alimentaire de 8 heures.',
            de: `Beliebtes Fastenprotokoll mit 16 Stunden Fasten und einem 8-stündigen Essensfenster. Unterstützt Gewichtsverlust und Stoffwechselgesundheit.`,
            es: `Protocolo de ayuno popular con 16 horas de ayuno y una ventana de alimentación de 8 horas. Apoya la pérdida de peso y la salud metabólica.`
        },
        shortDescription: {
            en: '16h fast, 8h eating window',
            ru: '16ч голод, 8ч питание',
            kk: '16с аштық, 8с тамақтану',
            fr: '16h jeûne, 8h alimentation',
            de: `16 Stunden Fasten, 8 Stunden Essensfenster`,
            es: `16h de ayuno, 8h de ventana para comer`
        },
        category: 'inspired',
        type: 'WEIGHT_LOSS',
        difficulty: 'MODERATE',
        duration: 30,
        uiGroup: 'Weight loss',
        evidenceLevel: 'medium',
        disclaimerKey: 'DISCLAIMER_GENERAL',
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'Choose 8-hour window: most popular 12pm-8pm. Adjust to your schedule',
                '16h fast: only water, black coffee, plain herbal tea. Zero calories',
                'Break fast with protein + healthy fats first (eggs, salmon, avocado) - NOT sugar/carbs',
                'Eat 2-3 quality meals within window. No calorie restriction needed but eat whole foods',
                'Last meal 2-3 hours before bed for sleep quality',
                'Stay consistent - adaptation takes 1-2 weeks. Morning hunger disappears',
            ],
            ru: [
                'Выберите 8-часовое окно: популярно 12:00-20:00. Подстройте под себя',
                '16ч голод: только вода, чёрный кофе, травяной чай. Ноль калорий',
                'Прерывайте голод белком + здоровыми жирами (яйца, лосось, авокадо) - НЕ сахаром',
                '2-3 качественных приёма в окне. Не нужно ограничивать калории, но ешьте цельные продукты',
                'Последний приём за 2-3ч до сна для качества сна',
                'Будьте последовательны - адаптация 1-2 недели. Утренний голод пройдёт',
            ],
            kk: [
                '8 сағаттық терезе таңдаңыз: ең танымал 12:00-20:00',
                '16с аштық: тек су, қара кофе, шөп шай. Нөл калория',
                'Аштықты ақуыз + пайдалы маймен бұзыңыз (жұмыртқа, лосось, авокадо) - қант ЕМЕС',
                'Терезеде 2-3 сапалы тамақ. Калорияны шектеу қажет емес, бірақ тұтас өнімдер',
                'Соңғы тамақ ұйқыдан 2-3с бұрын',
                'Тұрақты болыңыз - бейімделу 1-2 апта. Таңғы аштық өтеді',
            ],
            fr: [
                'Fenêtre 8h : le plus populaire 12h-20h. Adaptez à votre emploi du temps',
                '16h de jeûne : eau, café noir, tisane uniquement. Zéro calorie',
                'Rompre le jeûne avec protéines + graisses saines (œufs, saumon, avocat) - PAS de sucre',
                '2-3 repas de qualité dans la fenêtre. Pas de restriction calorique mais aliments complets',
                'Dernier repas 2-3h avant le coucher',
                'Soyez constant - adaptation en 1-2 semaines. La faim matinale disparaît',
            ],
            de: [
                `Wählen Sie ein 8-Stunden-Fenster: am beliebtesten 12:00–20:00 Uhr. Passen Sie sich Ihrem Zeitplan an`,
                `16 Stunden Fasten: nur Wasser, schwarzer Kaffee, einfacher Kräutertee. Null Kalorien`,
                `Frühstücken Sie zuerst mit Eiweiß und gesunden Fetten (Eier, Lachs, Avocado) – NICHT mit Zucker/Kohlenhydraten`,
                `Essen Sie 2-3 hochwertige Mahlzeiten innerhalb des Zeitfensters. Es ist keine Kalorienbeschränkung erforderlich, Sie sollten sich jedoch vollwertig ernähren`,
                `Letzte Mahlzeit 2-3 Stunden vor dem Schlafengehen für guten Schlaf`,
                `Bleiben Sie konsequent – ​​die Anpassung dauert 1–2 Wochen. Der morgendliche Hunger verschwindet`
                ],
            es: [
                `Elija un período de 8 horas: el más popular de 12 p. m. a 8 p. m. Adáptate a tu horario`,
                `Ayuno de 16h: sólo agua, café negro, infusiones naturales. Cero calorías`,
                `Descanse el ayuno primero con proteínas y grasas saludables (huevos, salmón, aguacate), NO con azúcar ni carbohidratos.`,
                `Consuma 2 o 3 comidas de calidad dentro del plazo. No es necesaria ninguna restricción calórica, pero come alimentos integrales.`,
                `Última comida 2-3 horas antes de acostarse para mejorar la calidad del sueño.`,
                `Sea constante: la adaptación tarda entre 1 y 2 semanas. El hambre matinal desaparece`
                ]
        },
        dailyTracker: [
            { key: 'fasting_16h', label: { en: '16-hour fast maintained (no calories consumed)', ru: '16ч голодания (без калорий)', kk: '16с аштық (калориясыз)', fr: '16h de jeûne (zéro calorie)',
                de: `16-stündiges Fasten (keine Kalorien verbraucht)`,
                es: `Ayuno mantenido de 16 horas (sin consumo de calorías)`
            } },
            { key: 'zero_cal_fast', label: { en: 'No calories during fast (no milk in coffee, no sugar)', ru: 'Без калорий во время голода (без молока в кофе)', kk: 'Аштықта калориясыз (кофеде сүтсіз)', fr: 'Zéro calorie pendant le jeûne (pas de lait)',
                de: `Keine Kalorien beim Fasten (keine Milch im Kaffee, kein Zucker)`,
                es: `Sin calorías durante el ayuno (sin leche en el café, sin azúcar)`
            } },
            { key: 'protein_first', label: { en: 'First meal included protein + healthy fats', ru: 'Первый приём с белком + здоровыми жирами', kk: 'Бірінші тамақта ақуыз + пайдалы май', fr: 'Premier repas avec protéines + graisses saines',
                de: `Die erste Mahlzeit enthielt Eiweiß + gesunde Fette`,
                es: `La primera comida incluyó proteínas + grasas saludables.`
            } },
            { key: 'whole_foods', label: { en: 'Quality whole foods in eating window', ru: 'Качественные цельные продукты в окне', kk: 'Терезеде сапалы тұтас өнімдер', fr: 'Aliments complets de qualité dans la fenêtre',
                de: `Hochwertige Vollwertkost im Essfenster`,
                es: `Alimentos integrales de calidad en la ventana de alimentación`
            } },
            { key: 'hydration', label: { en: 'Adequate water during fast (2L+ minimum)', ru: 'Достаточно воды во время голода (2л+)', kk: 'Аштық кезінде жеткілікті су (2л+)', fr: 'Eau suffisante pendant le jeûne (2L+)',
                de: `Ausreichend Wasser während des Fastens (mindestens 2L+)`,
                es: `Agua adecuada durante el ayuno (2L+ mínimo)`
            } },
            { key: 'last_meal_early', label: { en: 'Last meal finished 2-3h before bed', ru: 'Последний приём за 2-3ч до сна', kk: 'Соңғы тамақ ұйқыдан 2-3с бұрын', fr: 'Dernier repas 2-3h avant coucher',
                de: `Die letzte Mahlzeit wurde 2-3 Stunden vor dem Schlafengehen beendet`,
                es: `Última comida terminada 2-3h antes de acostarse.`
            } },
        ],
        notFor: {
            en: ['Same as 14:10 - see above'],
            ru: ['См. IF_14_10'],
            kk: ['IF_14_10 қараңыз'],
            fr: ['Comme 14:10 - voir ci-dessus'],
            de: [
                `Wie 14:10 – siehe oben`
                ],
            es: [
                `Igual que 14:10 - ver arriba`
                ]
        },
        suitableFor: ['weight_loss', 'metabolic_health'],
        notSuitableFor: ['pregnant', 'eating_disorders', 'diabetes_type1', 'teenagers'],
        allowedFoods: ['all_during_eating_window'],
        restrictedFoods: ['calories_during_fasting', 'sugary_drinks'],
        macroSplit: { protein: 25, carbs: 45, fat: 30 },
        rules: { fastingWindow: '16 hours', eatingWindow: '8 hours', allowedDuringFast: ['water', 'black_coffee', 'tea'] },
        tips: {
            en: ['Start with 14:10 if new to fasting', 'Stay hydrated', 'Break fast with balanced meal'],
            ru: ['Если новичок - начните с 14:10', 'Пейте много воды', 'Прерывайте голодание сбалансированной едой'],
            kk: ['Жаңа болсаңыз 14:10-дан бастаңыз', 'Көп су ішіңіз', 'Аштықты теңгерімді тамақпен аяқтаңыз'],
            fr: ['Commencez par 14:10 si débutant', 'Restez hydraté', 'Rompez le jeûne avec un repas équilibré'],
            de: [
                `Beginnen Sie mit 14:10, wenn Sie neu im Fasten sind`,
                `Bleiben Sie hydriert`,
                `Machen Sie eine Fastenpause mit einer ausgewogenen Mahlzeit`
                ],
            es: [
                `Comience con las 14:10 si es nuevo en el ayuno`,
                `Mantente hidratada`,
                `Romper el ayuno con una comida equilibrada`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1495147466023-ac5c588e2e94?w=800&q=80',
        color: '#9C27B0',
        isFeatured: true,
        popularityScore: 88,
        tags: ['fasting', 'popular', 'flexible'],
    },

    // 9) High-Protein Cut (HP_CUT)
    {
        slug: 'high-protein-cut',
        name: { en: 'High-Protein Cut', ru: 'Высокобелковая (сушка)', kk: 'Жоғары ақуыз (кептіру)', fr: 'Cut haute protéine',
            de: `Proteinreicher Schnitt`,
            es: `Corte rico en proteínas`
        },
        description: { en: 'High protein intake for preserving muscle while cutting fat. Popular with athletes.', ru: 'Высокое потребление белка для сохранения мышц при сжигании жира. Популярна у спортсменов.', kk: 'Майды жағу кезінде бұлшықетті сақтау үшін жоғары ақуыз тұтыну. Спортшылар арасында танымал.', fr: 'Fort apport en protéines pour préserver le muscle tout en perdant du gras. Populaire chez les sportifs.',
            de: `Hohe Proteinzufuhr zum Erhalt der Muskulatur bei gleichzeitiger Fettverbrennung. Beliebt bei Sportlern.`,
            es: `Alto consumo de proteínas para preservar los músculos mientras se reduce la grasa. Popular entre los atletas.`
        },
        shortDescription: { en: 'High protein for fat loss while preserving muscle', ru: 'Высокий белок для сжигания жира с сохранением мышц', kk: 'Бұлшықетті сақтай отырып май жоғалту үшін жоғары ақуыз', fr: 'Haute protéine pour perte de gras en préservant le muscle',
            de: `Hoher Proteingehalt für den Fettabbau bei gleichzeitigem Erhalt der Muskulatur`,
            es: `Alto contenido de proteínas para perder grasa y preservar el músculo.`
        },
        category: 'modern',
        type: 'SPORTS',
        difficulty: 'MODERATE',
        duration: 30,
        uiGroup: 'Performance',
        evidenceLevel: 'medium',
        disclaimerKey: 'DISCLAIMER_GENERAL',
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'Calculate TDEE, subtract 300-500 calories for daily target',
                'Protein: 1.6-2.2g/kg bodyweight daily. For 75kg = 120-165g protein/day',
                'Distribute protein across 4-5 meals (25-40g each) for optimal muscle protein synthesis',
                'Largest carb intake around workouts: pre-workout (2h before) and post-workout (within 1h)',
                'Don\'t cut fat below 20% total calories - hormones require adequate fat',
                'Weekly refeed at maintenance calories (higher carbs) to prevent metabolic adaptation',
            ],
            ru: [
                'Рассчитайте TDEE, вычтите 300-500 ккал для дневной цели',
                'Белок: 1.6-2.2г/кг веса в день. Для 75кг = 120-165г белка/день',
                'Распределите белок на 4-5 приёмов (25-40г каждый) для оптимального синтеза белка',
                'Основные углеводы вокруг тренировок: пре (2ч до) и пост (в течение 1ч)',
                'Не снижайте жиры ниже 20% калорий - гормонам нужен жир',
                'Еженедельный рифид на поддержке (больше углеводов) против метаболической адаптации',
            ],
            kk: [
                'TDEE есептеңіз, күндік мақсат үшін 300-500 ккал алыңыз',
                'Ақуыз: күніне 1.6-2.2г/кг салмақ. 75кг үшін = 120-165г ақуыз/күн',
                'Ақуызды 4-5 тамаққа бөліңіз (әрқайсысына 25-40г)',
                'Негізгі көмірсулар жаттығу айналасында: алдында (2с бұрын) және кейін (1с ішінде)',
                'Майды калорияның 20%-нан төмендетпеңіз - гормондарға май қажет',
                'Апталық рифид (көбірек көмірсу) метаболикалық бейімделуден сақтану',
            ],
            fr: [
                'Calculer TDEE, soustraire 300-500 kcal pour cible quotidienne',
                'Protéines : 1.6-2.2g/kg de poids. Pour 75kg = 120-165g protéines/jour',
                'Répartir les protéines sur 4-5 repas (25-40g chacun)',
                'Glucides principaux autour des entraînements : avant (2h) et après (1h)',
                'Ne pas réduire les graisses en dessous de 20% des calories',
                'Refeed hebdomadaire au maintien (plus de glucides) contre l\'adaptation métabolique',
            ],
            de: [
                `Berechnen Sie den TDEE und ziehen Sie 300–500 Kalorien vom Tagesziel ab`,
                `Protein: 1,6–2,2 g/kg Körpergewicht täglich. Für 75 kg = 120–165 g Protein/Tag`,
                `Verteilen Sie das Protein auf 4–5 Mahlzeiten (je 25–40 g), um eine optimale Muskelproteinsynthese zu erreichen`,
                `Größte Kohlenhydrataufnahme rund ums Training: vor dem Training (2 Stunden vor) und nach dem Training (innerhalb von 1 Stunde)`,
                `Reduzieren Sie den Fettanteil nicht unter 20 % der Gesamtkalorien – Hormone benötigen ausreichend Fett`,
                `Wöchentliches Nachfüllen mit Erhaltungskalorien (höhere Kohlenhydrate), um eine Stoffwechselanpassung zu verhindern`
                ],
            es: [
                `Calcule TDEE, reste 300-500 calorías para el objetivo diario`,
                `Proteínas: 1,6-2,2 g/kg de peso corporal al día. Para 75 kg = 120-165 g de proteína/día`,
                `Distribuya las proteínas en 4-5 comidas (25-40 g cada una) para una síntesis óptima de proteínas musculares.`,
                `Mayor consumo de carbohidratos durante los entrenamientos: antes del entrenamiento (2 horas antes) y después del entrenamiento (dentro de 1 hora)`,
                `No reduzca la grasa por debajo del 20% de las calorías totales: las hormonas requieren una cantidad adecuada de grasa`,
                `Realimentación semanal con calorías de mantenimiento (más carbohidratos) para evitar la adaptación metabólica.`
                ]
        },
        dailyTracker: [
            { key: 'protein_target', label: { en: 'Protein target hit (1.8g+/kg bodyweight)', ru: 'Цель по белку (1.8+г/кг веса)', kk: 'Ақуыз мақсаты (1.8+г/кг)', fr: 'Objectif protéines atteint (1.8g+/kg)',
                de: `Proteinziel erreicht (1,8 g+/kg Körpergewicht)`,
                es: `Objetivo de proteínas alcanzado (1,8 g+/kg de peso corporal)`
            } },
            { key: 'caloric_deficit', label: { en: 'Caloric deficit maintained (300-500 below TDEE)', ru: 'Дефицит калорий (300-500 ниже TDEE)', kk: 'Калория тапшылығы (300-500 TDEE-ден төмен)', fr: 'Déficit calorique (300-500 sous TDEE)',
                de: `Kaloriendefizit beibehalten (300-500 unter TDEE)`,
                es: `Se mantiene el déficit calórico (300-500 por debajo del TDEE)`
            } },
            { key: 'protein_meals', label: { en: '4+ protein meals consumed (evenly distributed)', ru: '4+ приёмов белка (равномерно)', kk: '4+ ақуыз тамақ (тең бөлінген)', fr: '4+ repas protéinés (équitablement)',
                de: `4+ Proteinmahlzeiten verzehrt (gleichmäßig verteilt)`,
                es: `Se consumen más de 4 comidas con proteínas (distribuidas uniformemente)`
            } },
            { key: 'workout_nutrition', label: { en: 'Pre/post workout nutrition completed', ru: 'Пре/пост тренировочное питание', kk: 'Жаттығу алдында/кейінгі тамақтану', fr: 'Nutrition pré/post entraînement',
                de: `Ernährung vor/nach dem Training abgeschlossen`,
                es: `Nutrición pre/post entrenamiento completada`
            } },
            { key: 'sleep_7h', label: { en: 'Adequate sleep (7+ hours - critical during deficit)', ru: 'Достаточно сна (7+ часов - критично на дефиците)', kk: 'Жеткілікті ұйқы (7+ сағат - тапшылықта маңызды)', fr: 'Sommeil suffisant (7h+ - critique en déficit)',
                de: `Ausreichend Schlaf (7+ Stunden – kritisch bei Defizit)`,
                es: `Sueño adecuado (más de 7 horas, fundamental durante el déficit)`
            } },
            { key: 'resistance_training', label: { en: 'Resistance training session completed', ru: 'Силовая тренировка выполнена', kk: 'Күш жаттығуы аяқталды', fr: 'Séance de musculation complétée',
                de: `Krafttrainingseinheit abgeschlossen`,
                es: `Sesión de entrenamiento de resistencia completada.`
            } },
        ],
        notFor: {
            en: ['Kidney problems - only with doctor'],
            ru: ['Проблемы с почками - только с врачом'],
            kk: ['Бүйрек мәселелері - тек дәрігермен'],
            fr: ['Problèmes rénaux - uniquement avec médecin'],
            de: [
                `Nierenprobleme – nur beim Arzt`
                ],
            es: [
                `Problemas renales - solo con doctora`
                ]
        },
        suitableFor: ['muscle_building', 'fat_loss', 'athletes'],
        notSuitableFor: ['kidney_disease'],
        allowedFoods: ['lean_meat', 'fish', 'eggs', 'dairy', 'vegetables', 'legumes'],
        restrictedFoods: ['excessive_carbs', 'sugar', 'processed_foods'],
        macroSplit: { protein: 35, carbs: 35, fat: 30 },
        tips: {
            en: ['Aim for 1.6-2.2g protein per kg', 'Spread protein throughout day'],
            ru: ['Цель: 1.6-2.2г белка на кг веса', 'Распределяйте белок в течение дня'],
            kk: ['Мақсат: кг-ға 1.6-2.2г ақуыз', 'Ақуызды күн бойы бөліңіз'],
            fr: ['Viser 1,6–2,2 g protéines/kg', 'Répartir les protéines sur la journée'],
            de: [
                `Streben Sie 1,6–2,2 g Protein pro kg an`,
                `Verteilen Sie Protein über den Tag`
                ],
            es: [
                `Apunta a 1,6-2,2 g de proteína por kg`,
                `Distribuya las proteínas a lo largo del día`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800&q=80',
        color: '#F44336',
        isFeatured: false,
        popularityScore: 78,
        tags: ['sports', 'muscle', 'fat_loss'],
    },

    // 10) Low-Carb (LOW_CARB)
    {
        slug: 'low-carb',
        name: {
            en: 'Low-Carb Diet',
            ru: 'Низкоуглеводная диета',
            kk: 'Төмен көмірсулы диета',
            fr: 'Régime faible en glucides',
            de: `Low-Carb-Diät`,
            es: `Dieta baja en carbohidratos`
        },
        description: {
            en: 'Reduce carbohydrate intake while focusing on protein and healthy fats. Effective for weight loss and blood sugar control.',
            ru: 'Снижение потребления углеводов с фокусом на белок и полезные жиры. Эффективна для похудения и контроля сахара в крови.',
            kk: 'Ақуыз бен пайдалы майларға назар аудара отырып көмірсу тұтынуын азайту.',
            fr: 'Réduire l\'apport en glucides tout en se concentrant sur les protéines et les graisses saines.',
            de: `Reduzieren Sie die Kohlenhydrataufnahme und konzentrieren Sie sich gleichzeitig auf Eiweiß und gesunde Fette. Wirksam zur Gewichtsreduktion und Blutzuckerkontrolle.`,
            es: `Reduzca la ingesta de carbohidratos mientras se centra en las proteínas y las grasas saludables. Eficaz para bajar de peso y controlar el azúcar en sangre.`
        },
        shortDescription: {
            en: 'Fewer carbs, more protein',
            ru: 'Меньше углеводов, больше белка',
            kk: 'Аз көмірсу, көп ақуыз',
            fr: 'Moins de glucides, plus de protéines',
            de: `Weniger Kohlenhydrate, mehr Protein`,
            es: `Menos carbohidratos, más proteínas`
        },
        category: 'modern',
        type: 'WEIGHT_LOSS',
        difficulty: 'MODERATE',
        duration: 30,
        uiGroup: 'Weight loss',
        evidenceLevel: 'medium',
        disclaimerKey: null,
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'Limit total carbs to 50-130g/day (start 100g, adjust based on energy and results)',
                'Protein at every meal: palm-sized portion. Protein improves satiety and preserves muscle',
                'Non-starchy vegetables unlimited: leafy greens, broccoli, cauliflower, peppers, zucchini',
                'Complex carbs when you eat them: sweet potato > bread, berries > bananas, quinoa > white rice',
                'Healthy fats for satisfaction: olive oil, avocado, nuts. Don\'t go low-fat AND low-carb',
                'Front-load carbs earlier in day or around exercise. Lower-carb dinner for sleep and blood sugar',
            ],
            ru: [
                'Ограничьте углеводы до 50-130г/день (начните с 100г, корректируйте по энергии и результату)',
                'Белок в каждом приёме: порция с ладонь. Улучшает насыщение и сохраняет мышцы',
                'Некрахмалистые овощи без ограничений: зелень, брокколи, цветная капуста, перец, кабачки',
                'Сложные углеводы: батат > хлеб, ягоды > бананы, киноа > белый рис',
                'Здоровые жиры: оливковое масло, авокадо, орехи. Не совмещайте низкожир И низкоуглевод',
                'Углеводы в первой половине дня или вокруг тренировки. Меньше углеводов на ужин',
            ],
            kk: [
                'Көмірсуларды күніне 50-130г-ға шектеңіз (100г-дан бастаңыз)',
                'Әр тамақта ақуыз: алақан өлшемі. Тойымдылықты жақсартады және бұлшық етті сақтайды',
                'Крахмалсыз көкөністер шексіз: жасылдар, брокколи, гүлді қырыққабат, бұрыш, қабақ',
                'Күрделі көмірсулар: батат > нан, жидек > банан, киноа > ақ күріш',
                'Пайдалы майлар: зәйтүн майы, авокадо, жаңғақ. Төмен май + төмен көмірсу қоспаңыз',
                'Көмірсуларды күннің бірінші жартысына немесе жаттығу айналасына. Кешкі асқа аз көмірсу',
            ],
            fr: [
                'Limiter glucides à 50-130g/jour (commencer à 100g, ajuster selon énergie)',
                'Protéines à chaque repas : portion taille paume. Améliore la satiété',
                'Légumes non féculents illimités : verdure, brocoli, chou-fleur, poivrons',
                'Glucides complexes quand vous en mangez : patate douce > pain, baies > bananes',
                'Graisses saines : huile d\'olive, avocat, noix. Pas faible en gras ET faible en glucides',
                'Glucides tôt dans la journée ou autour de l\'exercice. Dîner faible en glucides',
            ],
            de: [
                `Begrenzen Sie die Gesamtkohlenhydratmenge auf 50–130 g/Tag (beginnen Sie mit 100 g und passen Sie diese je nach Energie und Ergebnissen an).`,
                `Protein zu jeder Mahlzeit: handtellergroße Portion. Protein verbessert das Sättigungsgefühl und erhält die Muskulatur`,
                `Nicht stärkehaltiges Gemüse unbegrenzt: Blattgemüse, Brokkoli, Blumenkohl, Paprika, Zucchini`,
                `Komplexe Kohlenhydrate, wenn man sie isst: Süßkartoffel > Brot, Beeren > Bananen, Quinoa > weißer Reis`,
                `Gesunde Fette für Zufriedenheit: Olivenöl, Avocado, Nüsse. Gehen Sie nicht fett- UND kohlenhydratarm vor`,
                `Nehmen Sie Kohlenhydrate früher am Tag oder rund um das Training zu sich. Kohlenhydratarmes Abendessen für Schlaf und Blutzucker`
                ],
            es: [
                `Limite los carbohidratos totales a 50-130 g/día (comience con 100 g, ajuste según la energía y los resultados)`,
                `Proteínas en cada comida: porción del tamaño de la palma de la mano. La proteína mejora la saciedad y preserva el músculo.`,
                `Verduras sin almidón ilimitadas: verduras de hojas verdes, brócoli, coliflor, pimientos, calabacines`,
                `Carbohidratos complejos cuando los comes: camote > pan, bayas > plátanos, quinua > arroz blanco`,
                `Grasas saludables para la satisfacción: aceite de oliva, aguacate, frutos secos. No consumas alimentos bajos en grasas Y bajos en carbohidratos`,
                `Cargue los carbohidratos al principio del día o alrededor del ejercicio. Cena baja en carbohidratos para dormir y controlar el azúcar en sangre`
                ]
        },
        dailyTracker: [
            { key: 'carbs_under_130', label: { en: 'Total carbs under 130g today', ru: 'Углеводы до 130г', kk: 'Көмірсулар 130г-дан аз', fr: 'Glucides sous 130g',
                de: `Gesamtkohlenhydrate heute unter 130 g`,
                es: `Carbohidratos totales por debajo de 130 g hoy`
            } },
            { key: 'protein_each', label: { en: 'Protein at every meal (palm-sized minimum)', ru: 'Белок в каждом приёме (мин. с ладонь)', kk: 'Әр тамақта ақуыз (мин. алақандай)', fr: 'Protéines à chaque repas (min. taille paume)',
                de: `Protein zu jeder Mahlzeit (mindestens handtellergroß)`,
                es: `Proteína en cada comida (mínimo del tamaño de la palma de la mano)`
            } },
            { key: 'veggies_3plus', label: { en: 'Non-starchy vegetables at 3+ meals', ru: 'Некрахмалистые овощи в 3+ приёмах', kk: '3+ тамақта крахмалсыз көкөністер', fr: 'Légumes non féculents à 3+ repas',
                de: `Nicht stärkehaltiges Gemüse zu mehr als 3 Mahlzeiten`,
                es: `Verduras sin almidón en más de 3 comidas`
            } },
            { key: 'no_refined_carbs', label: { en: 'No refined carbs (white bread, pastries, white rice)', ru: 'Без рафинированных углеводов', kk: 'Тазаланған көмірсуларсыз', fr: 'Pas de glucides raffinés',
                de: `Keine raffinierten Kohlenhydrate (Weißbrot, Gebäck, weißer Reis)`,
                es: `Sin carbohidratos refinados (pan blanco, bollería, arroz blanco)`
            } },
            { key: 'complex_carbs', label: { en: 'Complex carbs chosen when carbs were eaten', ru: 'Сложные углеводы при употреблении', kk: 'Көмірсу жегенде күрделі көмірсулар', fr: 'Glucides complexes quand glucides consommés',
                de: `Beim Verzehr von Kohlenhydraten wurden komplexe Kohlenhydrate ausgewählt`,
                es: `Carbohidratos complejos elegidos cuando se comían carbohidratos`
            } },
            { key: 'healthy_fats', label: { en: 'Healthy fats included for satisfaction', ru: 'Здоровые жиры для насыщения', kk: 'Тойымдылық үшін пайдалы майлар', fr: 'Graisses saines pour la satiété',
                de: `Gesunde Fette zur Zufriedenheit enthalten`,
                es: `Grasas saludables incluidas para la satisfacción.`
            } },
        ],
        notFor: null,
        suitableFor: ['weight_loss', 'blood_sugar_control'],
        notSuitableFor: [],
        allowedFoods: ['vegetables', 'lean_protein', 'nuts', 'seeds', 'low_carb_fruits'],
        restrictedFoods: ['sugar', 'refined_grains', 'sugary_drinks', 'processed_foods'],
        macroSplit: { protein: 30, carbs: 25, fat: 45 },
        tips: {
            en: ['Replace bread with vegetables', 'Choose whole grains when eating carbs'],
            ru: ['Замените хлеб овощами', 'Выбирайте цельные злаки, если едите углеводы'],
            kk: ['Нанды көкөністермен ауыстырыңыз', 'Көмірсу жегенде тұтас дәндерді таңдаңыз'],
            fr: ['Remplacer le pain par des légumes', 'Préférer les céréales complètes si glucides'],
            de: [
                `Ersetzen Sie Brot durch Gemüse`,
                `Wählen Sie Vollkornprodukte, wenn Sie Kohlenhydrate essen`
                ],
            es: [
                `Reemplazar el pan con verduras`,
                `Elija cereales integrales cuando coma carbohidratos`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80',
        color: '#FF5722',
        isFeatured: true,
        popularityScore: 88,
        tags: ['low_carb', 'weight_loss'],
    },

    // ==================== C) Medical / Therapeutic ====================

    // 11) Keto (KETO)
    {
        slug: 'keto',
        name: {
            en: 'Keto Diet',
            ru: 'Кето диета',
            kk: 'Кето диетасы',
            fr: 'Régime Keto',
            de: `Keto-Diät`,
            es: `Dieta cetogénica`
        },
        description: {
            en: 'Very low carbohydrate, high fat diet that puts your body into ketosis. Requires medical supervision for some conditions.',
            ru: 'Диета с очень низким содержанием углеводов и высоким содержанием жиров, вводящая тело в кетоз. Для некоторых состояний требуется медицинский контроль.',
            kk: 'Денені кетозға енгізетін өте төмен көмірсулы, жоғары майлы диета.',
            fr: 'Régime très faible en glucides et riche en graisses qui met votre corps en cétose.',
            de: `Sehr kohlenhydratarme, fettreiche Diät, die Ihren Körper in die Ketose versetzt. Bei einigen Erkrankungen ist eine ärztliche Überwachung erforderlich.`,
            es: `Dieta muy baja en carbohidratos y alta en grasas que pone al cuerpo en cetosis. Requiere supervisión médica para algunas condiciones.`
        },
        shortDescription: {
            en: 'Very low-carb, high-fat',
            ru: 'Очень мало углеводов, много жиров',
            kk: 'Өте аз көмірсу, көп май',
            fr: 'Très faible en glucides, riche en graisses',
            de: `Sehr kohlenhydratarm, fettreich`,
            es: `Muy bajo en carbohidratos y alto en grasas`
        },
        category: 'medical',
        type: 'MEDICAL',
        difficulty: 'HARD',
        duration: 30,
        uiGroup: 'Medical',
        evidenceLevel: 'low',
        disclaimerKey: 'DISCLAIMER_MEDICAL',
        streakThreshold: 0.8,
        howItWorks: {
            en: [
                'Limit net carbs (total - fiber) to 20-50g/day. Track carefully, especially first 2 weeks',
                '70-80% of daily calories from fat: avocado, olive oil, coconut oil, butter, nuts, cheese, fatty fish/meat',
                'Moderate protein: 20-25% calories (excessive protein → glucose via gluconeogenesis)',
                'Eliminate: all sugar, bread, pasta, rice, potatoes, most fruits. Berries in small amounts OK',
                'Supplement electrolytes: 5-7g sodium/day, magnesium and potassium to prevent keto flu',
                'Drink 3+ liters water daily - ketosis has diuretic effect, dehydration is #1 side effect',
            ],
            ru: [
                'Ограничьте чистые углеводы (всего - клетчатка) до 20-50г/день. Тщательно отслеживайте',
                '70-80% калорий из жиров: авокадо, оливковое/кокосовое масло, масло, орехи, сыр, жирная рыба/мясо',
                'Умеренный белок: 20-25% калорий (избыток белка → глюкоза через глюконеогенез)',
                'Исключить: сахар, хлеб, пасту, рис, картофель, большинство фруктов. Ягоды немного можно',
                'Электролиты: 5-7г натрия/день, магний и калий для профилактики кето-гриппа',
                '3+ литра воды ежедневно - кетоз имеет мочегонный эффект',
            ],
            kk: [
                'Таза көмірсуларды (барлығы - клетчатка) күніне 20-50г-ға шектеңіз. Мұқият қадағалаңыз',
                'Күндік калорияның 70-80% майдан: авокадо, зәйтүн/кокос майы, сары май, жаңғақ, ірімшік',
                'Қалыпты ақуыз: 20-25% калория (артық ақуыз → глюконеогенез арқылы глюкоза)',
                'Жою: қант, нан, паста, күріш, картоп, көп жемістер. Жидектер аздап болады',
                'Электролиттер: күніне 5-7г натрий, магний мен калий кето тұмаудың алдын алу',
                'Күніне 3+ литр су - кетоздың несеп әсері бар',
            ],
            fr: [
                'Limiter les glucides nets (à total - fibres) à 20-50g/jour. Suivre attentivement',
                '70-80% des calories en graisses : avocat, huile d\'olive/coco, beurre, noix, fromage, poisson gras',
                'Protéines modérées : 20-25% calories (excès → glucose via gluconéogenèse)',
                'Éliminer : sucre, pain, pâtes, riz, pommes de terre, la plupart des fruits. Baies OK en petites quantités',
                'Électrolytes : 5-7g sodium/jour, magnésium et potassium pour prévenir la grippe céto',
                '3+ litres d\'eau par jour - la cétose a un effet diurétique',
            ],
            de: [
                `Begrenzen Sie die Nettokohlenhydrate (insgesamt – Ballaststoffe) auf 20–50 g/Tag. Verfolgen Sie sorgfältig, insbesondere in den ersten beiden Wochen`,
                `70–80 % der täglichen Kalorien stammen aus Fett: Avocado, Olivenöl, Kokosöl, Butter, Nüsse, Käse, fetter Fisch/Fleisch`,
                `Mäßiges Protein: 20–25 % Kalorien (überschüssiges Protein → Glukose durch Gluconeogenese)`,
                `Eliminieren Sie: jeglichen Zucker, Brot, Nudeln, Reis, Kartoffeln und die meisten Früchte. Beeren in kleinen Mengen ok`,
                `Ergänzende Elektrolyte: 5–7 g Natrium/Tag, Magnesium und Kalium zur Vorbeugung der Keto-Grippe`,
                `Trinken Sie täglich mehr als 3 Liter Wasser – Ketose hat eine harntreibende Wirkung, Dehydrierung ist die Nebenwirkung Nr. 1`
                ],
            es: [
                `Limite los carbohidratos netos (total - fibra) a 20-50 g/día. Realice un seguimiento cuidadoso, especialmente las primeras 2 semanas`,
                `70-80% de las calorías diarias provienen de grasas: aguacate, aceite de oliva, aceite de coco, mantequilla, nueces, queso, pescado/carne grasos.`,
                `Proteína moderada: 20-25% de calorías (exceso de proteína → glucosa vía gluconeogénesis)`,
                `Eliminar: todo el azúcar, pan, pasta, arroz, patatas, la mayoría de las frutas. Bayas en pequeñas cantidades, OK`,
                `Suplemento de electrolitos: 5-7 g de sodio/día, magnesio y potasio para prevenir la gripe cetogénica`,
                `Beba más de 3 litros de agua al día: la cetosis tiene un efecto diurético, la deshidratación es el efecto secundario número uno`
                ]
        },
        dailyTracker: [
            { key: 'net_carbs_50', label: { en: 'Net carbs under 50g today (weighed and tracked)', ru: 'Чистые углеводы до 50г (взвешено и отслежено)', kk: 'Таза көмірсулар 50г-дан аз (өлшеніп қадағаланды)', fr: 'Glucides nets sous 50g (pesés et suivis)',
                de: `Netto-Kohlenhydrate unter 50 g heute (gewogen und verfolgt)`,
                es: `Carbohidratos netos por debajo de 50 g hoy (pesados ​​y rastreados)`
            } },
            { key: 'fat_primary', label: { en: 'Fat was primary energy source (70-80% calories)', ru: 'Жир основной источник энергии (70-80% калорий)', kk: 'Май негізгі энергия көзі (70-80% калория)', fr: 'Graisses comme source d\'énergie principale (70-80% calories)',
                de: `Fett war die primäre Energiequelle (70-80 % Kalorien)`,
                es: `La grasa era la principal fuente de energía (70-80% calorías)`
            } },
            { key: 'electrolytes', label: { en: 'Electrolytes supplemented (sodium, magnesium, potassium)', ru: 'Электролиты приняты (натрий, магний, калий)', kk: 'Электролиттер қабылданды (натрий, магний, калий)', fr: 'Électrolytes pris (sodium, magnésium, potassium)',
                de: `Ergänzte Elektrolyte (Natrium, Magnesium, Kalium)`,
                es: `Electrolitos suplementados (sodio, magnesio, potasio)`
            } },
            { key: 'protein_moderate', label: { en: 'Adequate protein (not too much, not too little)', ru: 'Достаточно белка (не много и не мало)', kk: 'Жеткілікті ақуыз (артық да аз да емес)', fr: 'Protéines adéquates (ni trop ni trop peu)',
                de: `Ausreichend Protein (nicht zu viel, nicht zu wenig)`,
                es: `Proteínas adecuadas (ni demasiada ni muy poca)`
            } },
            { key: 'no_sugar', label: { en: 'No sugar in any form consumed', ru: 'Без сахара в любой форме', kk: 'Ешқандай қант түрінде жоқ', fr: 'Aucun sucre sous quelque forme',
                de: `Kein Zucker in irgendeiner Form konsumiert`,
                es: `No se consume azúcar en ninguna forma.`
            } },
            { key: 'hydration_3l', label: { en: 'Hydration: 3+ liters water', ru: 'Гидратация: 3+ литра воды', kk: 'Гидратация: 3+ литр су', fr: 'Hydratation : 3+ litres d\'eau',
                de: `Flüssigkeitszufuhr: 3+ Liter Wasser`,
                es: `Hidratación: 3+ litros de agua`
            } },
        ],
        notFor: {
            en: ['Pregnancy/breastfeeding', 'Pancreatitis', 'Liver/gallbladder disease', 'Eating disorders', 'Many endocrine conditions - without doctor'],
            ru: ['Беременность/ГВ', 'Панкреатит', 'Болезни печени/желчного', 'РПП', 'Многие эндокринные состояния - без врача'],
            kk: ['Жүктілік/емізу', 'Панкреатит', 'Бауыр/өт қабы аурулары', 'Тамақтану бұзылыстары', 'Көптеген эндокриндік жағдайлар - дәрігерсіз'],
            fr: ['Grossesse/allaitement', 'Pancréatite', 'Maladies foie/vésicule', 'Troubles alimentaires', 'Nombreuses affections endocriniennes - sans médecin'],
            de: [
                `Schwangerschaft/Stillzeit`,
                `Pankreatitis`,
                `Leber-/Gallenblasenerkrankung`,
                `Essstörungen`,
                `Viele endokrine Erkrankungen – ohne Arzt`
                ],
            es: [
                `Embarazo/lactancia`,
                `Pancreatitis`,
                `Enfermedad del hígado/vesícula biliar`,
                `Trastornos alimentarios`,
                `Muchas enfermedades endocrinas, sin médico`
                ]
        },
        suitableFor: ['weight_loss', 'epilepsy', 'diabetes_type2'],
        notSuitableFor: ['pregnant', 'kidney_disease', 'liver_disease', 'pancreatitis', 'eating_disorders'],
        allowedFoods: ['meat', 'fish', 'eggs', 'cheese', 'butter', 'oils', 'low_carb_vegetables', 'nuts'],
        restrictedFoods: ['grains', 'sugar', 'fruits', 'legumes', 'root_vegetables'],
        macroSplit: { protein: 25, carbs: 5, fat: 70 },
        dailyCaloriesMin: 1200,
        dailyCaloriesMax: 2000,
        tips: {
            en: ['Consult a doctor first', 'Monitor ketones', 'Watch for keto flu'],
            ru: ['Сначала консультация врача', 'Следите за кетонами', 'Следите за кето-гриппом'],
            kk: ['Алдымен дәрігерге кеңесіңіз', 'Кетондарды қадағалаңыз', 'Кето тұмауынан сақ болыңыз'],
            fr: ['Consulter un médecin d\'abord', 'Surveiller les cétones', 'Attention à la grippe céto'],
            de: [
                `Konsultieren Sie zunächst einen Arzt`,
                `Überwachen Sie Ketone`,
                `Achten Sie auf die Keto-Grippe`
                ],
            es: [
                `Consulta primero con un médico`,
                `Monitorear cetonas`,
                `Esté atento a la gripe cetogénica`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800&q=80',
        color: '#FF9800',
        isFeatured: true,
        popularityScore: 90,
        tags: ['medical', 'low_carb', 'requires_supervision'],
    },

    // 12) Low-FODMAP (LOW_FODMAP)
    {
        slug: 'low-fodmap',
        name: { en: 'Low-FODMAP (Gut)', ru: 'Low-FODMAP (ЖКТ)', kk: 'Low-FODMAP (Асқазан-ішек)', fr: 'Low-FODMAP (intestin)',
            de: `Low-FODMAP (Darm)`,
            es: `Bajo en FODMAP (intestino)`
        },
        description: { en: 'Elimination diet for IBS and digestive issues. Must be done in phases with professional guidance.', ru: 'Элиминационная диета для СРК и проблем ЖКТ. Должна проводиться по фазам под руководством специалиста.', kk: 'IBS және ас қорыту мәселелері үшін элиминациялық диета. Маман басшылығымен кезеңдермен өткізілуі керек.', fr: 'Régime d\'élimination pour le confort digestif.',
            de: `Eliminationsdiät bei Reizdarmsyndrom und Verdauungsproblemen. Muss phasenweise unter professioneller Anleitung erfolgen.`,
            es: `Dieta de eliminación para el SII y problemas digestivos. Debe realizarse por fases con orientación profesional.`
        },
        shortDescription: { en: 'Gut-healing diet in phases - requires guidance', ru: 'Диета для ЖКТ по фазам - требует специалиста', kk: 'Асқазан-ішек үшін кезеңдік диета - маман қажет', fr: 'Régime intestin par phases - suivi requis',
            de: `Darmheilungsdiät in Phasen – erfordert Anleitung`,
            es: `Dieta curativa del intestino en fases: requiere orientación`
        },
        category: 'medical',
        type: 'MEDICAL',
        difficulty: 'HARD',
        duration: 42,
        uiGroup: 'Medical',
        evidenceLevel: 'medium',
        disclaimerKey: 'DISCLAIMER_MEDICAL',
        streakThreshold: 0.8,
        howItWorks: {
            en: [
                'Phase 1 (Wk 1-3): strictly avoid all high-FODMAP foods. Use Monash FODMAP app for safe portions',
                'Phase 2 (Wk 4-6): test one FODMAP subgroup every 3 days (fructose, lactose, fructans, GOS, polyols)',
                'Phase 3 (Wk 7+): personalized long-term diet avoiding only YOUR specific triggers',
                'Keep detailed food + symptom diary every day - rate bloating, pain, gas, bowel habits 1-10',
                'Eat enough fiber from safe sources (oats, rice, potatoes, banana, kiwi) to avoid constipation',
                'Strongly recommended: work with FODMAP-trained dietitian. Self-guiding risks unnecessary restriction',
            ],
            ru: [
                'Фаза 1 (Нед 1-3): строго избегать всех высоко-FODMAP продуктов',
                'Фаза 2 (Нед 4-6): тест одной FODMAP-группы каждые 3 дня (фруктоза, лактоза, фруктаны, ГОС, полиолы)',
                'Фаза 3 (Нед 7+): персональная диета, избегая только ВАШИХ триггеров',
                'Подробный дневник еды + симптомов каждый день - вздутие, боль, газы 1-10',
                'Достаточно клетчатки из безопасных источников (овёс, рис, картофель, банан)',
                'Настоятельно рекомендуем: работать с FODMAP-специалистом',
            ],
            kk: [
                '1 кезең (Апт 1-3): барлық жоғары FODMAP тағамдардан қатаң бас тарту',
                '2 кезең (Апт 4-6): әр 3 күн бір FODMAP тобын тесттеу (фруктоза, лактоза, фруктандар)',
                '3 кезең (Апт 7+): тек ӨЗІҢІЗДІҢ триггерлеріңізден қашық жеке диета',
                'Күн сайын тағам + симптом күнделігі - ісіну, ауыру, газ 1-10',
                'Қауіпсіз көздерден жеткілікті клетчатка (сұлы, күріш, картоп, банан)',
                'Нақты ұсынылады: FODMAP-маманмен жұмыс істеу',
            ],
            fr: [
                'Phase 1 (Sem 1-3) : éviter strictement tous les aliments riches en FODMAP',
                'Phase 2 (Sem 4-6) : tester un sous-groupe tous les 3 jours (fructose, lactose, fructanes, GOS, polyols)',
                'Phase 3 (Sem 7+) : régime personnalisé évitant uniquement VOS déclencheurs',
                'Journal alimentaire + symptômes chaque jour - ballonnements, douleur, gaz 1-10',
                'Assez de fibres de sources sûres (avoine, riz, pommes de terre, banane)',
                'Fortement recommandé : travailler avec un diététicien formé FODMAP',
            ],
            de: [
                `Phase 1 (Woche 1–3): Vermeiden Sie strikt alle Lebensmittel mit hohem FODMAP-Gehalt. Verwenden Sie die Monash FODMAP-App für sichere Portionen`,
                `Phase 2 (Woche 4–6): Testen Sie alle 3 Tage eine FODMAP-Untergruppe (Fruktose, Laktose, Fruktane, GOS, Polyole).`,
                `Phase 3 (Woche 7+): personalisierte Langzeitdiät, die nur IHRE spezifischen Auslöser vermeidet`,
                `Führen Sie jeden Tag ein detailliertes Ernährungs- und Symptomtagebuch – bewerten Sie Blähungen, Schmerzen, Blähungen und Stuhlgewohnheiten mit 1–10`,
                `Essen Sie ausreichend Ballaststoffe aus sicheren Quellen (Hafer, Reis, Kartoffeln, Banane, Kiwi), um Verstopfung zu vermeiden`,
                `Dringend empfohlen: Arbeiten Sie mit einem FODMAP-geschulten Ernährungsberater zusammen. Selbstführung birgt das Risiko unnötiger Einschränkungen`
                ],
            es: [
                `Fase 1 (semanas 1-3): evite estrictamente todos los alimentos con alto contenido de FODMAP. Utilice la aplicación Monash FODMAP para porciones seguras`,
                `Fase 2 (semanas 4-6): pruebe un subgrupo de FODMAP cada 3 días (fructosa, lactosa, fructanos, GOS, polioles)`,
                `Fase 3 (semana 7+): dieta personalizada a largo plazo evitando solo TUS desencadenantes específicos`,
                `Lleve un diario detallado de alimentos y síntomas todos los días: califique la hinchazón, el dolor, los gases y los hábitos intestinales del 1 al 10.`,
                `Consuma suficiente fibra de fuentes seguras (avena, arroz, patatas, plátano, kiwi) para evitar el estreñimiento.`,
                `Muy recomendable: trabajar con un dietista capacitado en FODMAP. La autoguía corre el riesgo de restringirse innecesariamente`
                ]
        },
        dailyTracker: [
            { key: 'fodmap_avoided', label: { en: 'All high-FODMAP foods avoided today (Phase 1)', ru: 'Все высоко-FODMAP продукты исключены (Фаза 1)', kk: 'Барлық жоғары FODMAP тағамдар жойылды (1 кезең)', fr: 'Tous les aliments riches en FODMAP évités (Phase 1)',
                de: `Alle heute vermiedenen Lebensmittel mit hohem FODMAP-Gehalt (Phase 1)`,
                es: `Todos los alimentos ricos en FODMAP que se evitan hoy (Fase 1)`
            } },
            { key: 'food_diary', label: { en: 'Food diary updated with all meals and portions', ru: 'Дневник еды обновлён со всеми приёмами', kk: 'Тағам күнделігі барлық тамақтармен жаңартылды', fr: 'Journal alimentaire mis à jour avec tous les repas',
                de: `Ernährungstagebuch mit allen Mahlzeiten und Portionen aktualisiert`,
                es: `Diario de alimentación actualizado con todas las comidas y porciones.`
            } },
            { key: 'symptom_diary', label: { en: 'Symptom diary updated (bloating, pain, gas 1-10)', ru: 'Дневник симптомов (вздутие, боль, газы 1-10)', kk: 'Симптом күнделігі (ісіну, ауыру, газ 1-10)', fr: 'Journal des symptômes (ballonnements, douleur, gaz 1-10)',
                de: `Symptomtagebuch aktualisiert (Blähungen, Schmerzen, Blähungen 1-10)`,
                es: `Diario de síntomas actualizado (hinchazón, dolor, gases 1-10)`
            } },
            { key: 'fiber_safe', label: { en: 'Adequate fiber from safe sources (oats, rice, banana)', ru: 'Достаточно клетчатки из безопасных источников', kk: 'Қауіпсіз көздерден жеткілікті клетчатка', fr: 'Fibres suffisantes de sources sûres (avoine, riz, banane)',
                de: `Ausreichend Ballaststoffe aus sicheren Quellen (Hafer, Reis, Banane)`,
                es: `Fibra adecuada de fuentes seguras (avena, arroz, plátano)`
            } },
            { key: 'stress_mgmt', label: { en: 'Stress management practiced (stress worsens IBS)', ru: 'Управление стрессом (стресс ухудшает СРК)', kk: 'Стресс басқару (стресс IBS-ті нашарлатады)', fr: 'Gestion du stress (le stress aggrave le SII)',
                de: `Stressmanagement wird praktiziert (Stress verschlimmert das Reizdarmsyndrom)`,
                es: `Se practica el manejo del estrés (el estrés empeora el SII)`
            } },
            { key: 'hydration', label: { en: 'Adequate hydration (2L+ water)', ru: 'Достаточная гидратация (2л+ воды)', kk: 'Жеткілікті гидратация (2л+ су)', fr: 'Hydratation adéquate (2L+ d\'eau)',
                de: `Ausreichende Flüssigkeitszufuhr (2L+ Wasser)`,
                es: `Hidratación adecuada (2L+ agua)`
            } },
        ],
        notFor: {
            en: ['Should not stay on long-term without specialist'],
            ru: ['Долго сидеть без специалиста нельзя'],
            kk: ['Мамансыз ұзақ отыруға болмайды'],
            fr: ['Ne pas poursuivre longtemps sans spécialiste'],
            de: [
                `Ohne Facharzt sollte man nicht auf Dauer bleiben`
                ],
            es: [
                `No debe permanecer en tratamiento a largo plazo sin un especialista.`
                ]
        },
        suitableFor: ['ibs', 'digestive_issues', 'bloating'],
        notSuitableFor: ['unsupervised_long_term'],
        allowedFoods: ['low_fodmap_foods'],
        restrictedFoods: ['high_fodmap_foods'],
        macroSplit: { protein: 20, carbs: 50, fat: 30 },
        tips: {
            en: ['Work with a dietitian', 'Keep a food diary', 'Reintroduce foods one at a time'],
            ru: ['Работайте с диетологом', 'Ведите дневник питания', 'Вводите продукты по одному'],
            kk: ['Диетологпен жұмыс істеңіз', 'Тамақтану күнделігін жүргізіңіз', 'Тағамдарды бір-бірлеп қайта енгізіңіз'],
            fr: ['Travailler avec un diététicien', 'Tenir un journal alimentaire', 'Réintroduire les aliments un par un'],
            de: [
                `Arbeiten Sie mit einem Ernährungsberater zusammen`,
                `Führen Sie ein Ernährungstagebuch`,
                `Führen Sie die Lebensmittel nacheinander wieder ein`
                ],
            es: [
                `Trabajar con una dietista`,
                `Lleve un diario de alimentos`,
                `Reintroduzca los alimentos uno a la vez.`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80',
        color: '#009688',
        isFeatured: false,
        popularityScore: 65,
        tags: ['medical', 'gut_health', 'therapeutic'],
    },

    // 13) Gluten-Free (GF)
    {
        slug: 'gluten-free',
        name: { en: 'Gluten-Free', ru: 'Безглютеновая', kk: 'Глютенсіз', fr: 'Sans gluten',
            de: `Glutenfrei`,
            es: `Sin gluten`
        },
        description: { en: 'Essential for celiac disease and gluten sensitivity. Not necessary as a lifestyle choice without medical indication.', ru: 'Необходима при целиакии и чувствительности к глютену. Не обязательна без медицинских показаний.', kk: 'Целиакия және глютенге сезімталдық үшін қажет. Медициналық көрсеткіштерсіз міндетті емес.', fr: 'Indispensable en cas de maladie cœliaque ou sensibilité. Pas utile sans indication médicale.',
            de: `Unentbehrlich bei Zöliakie und Glutenunverträglichkeit. Als Lebensstilwahl ohne medizinische Indikation nicht notwendig.`,
            es: `Esencial para la enfermedad celíaca y la sensibilidad al gluten. No es necesario como opción de estilo de vida sin indicación médica.`
        },
        shortDescription: { en: 'For celiac disease or gluten sensitivity', ru: 'При целиакии или непереносимости глютена', kk: 'Целиакия немесе глютенге сезімталдық үшін', fr: 'Maladie cœliaque ou sensibilité au gluten',
            de: `Bei Zöliakie oder Glutenunverträglichkeit`,
            es: `Para enfermedad celíaca o sensibilidad al gluten.`
        },
        category: 'medical',
        type: 'MEDICAL',
        difficulty: 'MODERATE',
        duration: 30,
        uiGroup: 'Medical',
        evidenceLevel: 'medium',
        disclaimerKey: 'DISCLAIMER_MEDICAL',
        streakThreshold: 0.9,
        howItWorks: {
            en: [
                'Eliminate completely: wheat (all forms), barley, rye, spelt, kamut, triticale',
                'Oats: ONLY certified Gluten-Free oats - regular oats are cross-contaminated',
                'Read EVERY label: wheat, barley, rye, malt, brewer\'s yeast, modified food starch',
                'Cross-contamination prevention: separate cutting boards, toaster, colander in shared kitchens',
                'Safe grains: rice, quinoa, buckwheat, millet, corn, potato, sweet potato, tapioca, amaranth, teff',
                'Prioritize naturally GF whole foods over processed GF products',
            ],
            ru: [
                'Полностью исключить: пшеницу (все формы), ячмень, рожь, спельту, камут, тритикале',
                'Овёс: ТОЛЬКО сертифицированный «без глютена» - обычный овёс загрязнён',
                'Читайте КАЖДУЮ этикетку: пшеница, ячмень, рожь, солод, пивные дрожжи, модифицированный крахмал',
                'Профилактика перекрёстного загрязнения: отдельные доски, тостер, дуршлаг',
                'Безопасные злаки: рис, киноа, гречка, пшено, кукуруза, картофель, батат, амарант',
                'Приоритет: натурально безглютеновые продукты, а не обработанные заменители',
            ],
            kk: [
                'Толық жою: бидай (барлық түрлері), арпа, қара бидай, спельта, камут',
                'Сұлы: ТЕК сертификатталған «глютенсіз» - қарапайым сұлы ластанған',
                'ӘР жапсырманы оқыңыз: бидай, арпа, қара бидай, солод, сыра ашытқысы',
                'Кросс-контаминация алдын алу: бөлек тақталар, тостер, сүзгіш',
                'Қауіпсіз дәндер: күріш, киноа, гречка, тары, жүгері, картоп, батат, амарант',
                'Басымдық: өңделген ауыстырушылар емес, табиғи глютенсіз тағамдар',
            ],
            fr: [
                'Éliminer complètement : blé (toutes formes), orge, seigle, épeautre, kamut, triticale',
                'Avoine : UNIQUEMENT certifiée sans gluten - avoine régulière est contaminée',
                'Lire CHAQUE étiquette : blé, orge, seigle, malt, levure de bière, amidon modifié',
                'Prévention contamination croisée : planches, grille-pain, passoire séparés',
                'Céréales sûres : riz, quinoa, sarrasin, millet, maïs, pomme de terre, patate douce, amarante',
                'Privilégier aliments naturellement SG plutôt que substituts transformés',
            ],
            de: [
                `Vollständig eliminieren: Weizen (alle Formen), Gerste, Roggen, Dinkel, Kamut, Triticale`,
                `Hafer: NUR zertifizierter glutenfreier Hafer – normaler Hafer ist kreuzkontaminiert`,
                `Lesen Sie JEDES Etikett: Weizen, Gerste, Roggen, Malz, Bierhefe, modifizierte Lebensmittelstärke`,
                `Vermeidung von Kreuzkontaminationen: separate Schneidebretter, Toaster, Sieb in Gemeinschaftsküchen`,
                `Sichere Körner: Reis, Quinoa, Buchweizen, Hirse, Mais, Kartoffeln, Süßkartoffeln, Tapioka, Amaranth, Teff`,
                `Bevorzugen Sie vollwertige natürliche GF-Lebensmittel gegenüber verarbeiteten GF-Produkten`
                ],
            es: [
                `Eliminar completamente: trigo (todas sus formas), cebada, centeno, espelta, kamut, triticale.`,
                `Avena: SÓLO avena certificada sin gluten; la avena normal tiene contaminación cruzada`,
                `Lea TODAS las etiquetas: trigo, cebada, centeno, malta, levadura de cerveza, almidón alimentario modificado`,
                `Prevención de la contaminación cruzada: tablas de cortar separadas, tostadora y colador en cocinas compartidas`,
                `Granos seguros: arroz, quinua, trigo sarraceno, mijo, maíz, patata, boniato, tapioca, amaranto, teff.`,
                `Priorizar los alimentos integrales naturalmente GF sobre los productos GF procesados`
                ]
        },
        dailyTracker: [
            { key: 'no_gluten', label: { en: 'No gluten consumed (wheat, barley, rye checked)', ru: 'Без глютена (пшеница, ячмень, рожь проверены)', kk: 'Глютенсіз (бидай, арпа, қара бидай тексерілді)', fr: 'Sans gluten (blé, orge, seigle vérifiés)',
                de: `Kein Gluten konsumiert (Weizen, Gerste, Roggen geprüft)`,
                es: `No se consume gluten (trigo, cebada, centeno marcados)`
            } },
            { key: 'labels_checked', label: { en: 'Labels checked on ALL packaged food', ru: 'Этикетки проверены на ВСЕХ упакованных', kk: 'БАРЛЫҚ оралған тағамдардың жапсырмалары тексерілді', fr: 'Étiquettes vérifiées sur TOUS les aliments emballés',
                de: `Etiketten aller verpackten Lebensmittel überprüft`,
                es: `Etiquetas revisadas en TODOS los alimentos envasados`
            } },
            { key: 'cross_contamination', label: { en: 'Cross-contamination prevented (separate utensils)', ru: 'Перекрёстное загрязнение предотвращено', kk: 'Кросс-контаминация алды алынды', fr: 'Contamination croisée prévenue (ustensiles séparés)',
                de: `Kreuzkontamination verhindert (getrennte Utensilien)`,
                es: `Se evita la contaminación cruzada (utensilios separados)`
            } },
            { key: 'whole_foods_gf', label: { en: 'Naturally GF whole foods prioritized over processed GF products', ru: 'Натурально безглютеновые продукты в приоритете', kk: 'Табиғи глютенсіз тағамдар басымды', fr: 'Aliments naturellement SG privilégiés',
                de: `Von Natur aus haben vollwertige GF-Lebensmittel Vorrang vor verarbeiteten GF-Produkten`,
                es: `Naturalmente, los alimentos integrales GF tienen prioridad sobre los productos GF procesados`
            } },
            { key: 'fiber_intake', label: { en: 'Adequate fiber intake (GF diets can be low in fiber)', ru: 'Достаточно клетчатки (ГФ диеты могут быть низкоклетчаточными)', kk: 'Жеткілікті клетчатка (ГФ диеталар төмен болуы мүмкін)', fr: 'Apport en fibres suffisant (régimes SG peuvent être pauvres en fibres)',
                de: `Ausreichende Ballaststoffaufnahme (GF-Diäten können ballaststoffarm sein)`,
                es: `Ingesta adecuada de fibra (las dietas GF pueden ser bajas en fibra)`
            } },
            { key: 'iron_bvitamins', label: { en: 'Iron and B-vitamin intake monitored (common celiac deficiencies)', ru: 'Железо и витамины группы B (частый дефицит при целиакии)', kk: 'Темір мен B витамині (целиакияда жиі тапшылық)', fr: 'Fer et vitamines B surveillés (carences fréquentes en cœliaque)',
                de: `Überwachung der Eisen- und B-Vitamin-Zufuhr (häufige Zöliakie-Mangelzustände)`,
                es: `Se controla la ingesta de hierro y vitamina B (deficiencias celíacas comunes)`
            } },
        ],
        notFor: {
            en: ['If no indication - not necessary'],
            ru: ['Если нет показаний - не обязательно'],
            kk: ['Көрсеткіштер болмаса - міндетті емес'],
            fr: ['Sans indication - pas nécessaire'],
            de: [
                `Wenn keine Angabe – nicht notwendig`
                ],
            es: [
                `Si no hay indicación, no es necesario`
                ]
        },
        suitableFor: ['celiac_disease', 'gluten_sensitivity'],
        notSuitableFor: [],
        allowedFoods: ['rice', 'corn', 'quinoa', 'vegetables', 'fruits', 'meat', 'fish', 'dairy'],
        restrictedFoods: ['wheat', 'barley', 'rye', 'oats_cross_contaminated'],
        macroSplit: { protein: 20, carbs: 50, fat: 30 },
        tips: {
            en: ['Read all labels carefully', 'Watch for cross-contamination', 'Many naturally GF foods exist'],
            ru: ['Внимательно читайте этикетки', 'Следите за перекрёстным загрязнением', 'Существует много натуральных безглютеновых продуктов'],
            kk: ['Барлық жапсырмаларды мұқият оқыңыз', 'Кросс-контаминацияны қадағалаңыз', 'Табиғи глютенсіз тағамдар көп'],
            fr: ['Lire toutes les étiquettes', 'Attention à la contamination croisée', 'Beaucoup d\'aliments naturellement SG'],
            de: [
                `Lesen Sie alle Etiketten sorgfältig durch`,
                `Achten Sie auf Kreuzkontaminationen`,
                `Es gibt viele natürlich GF-Lebensmittel`
                ],
            es: [
                `Lea todas las etiquetas con atención`,
                `Esté atento a la contaminación cruzada`,
                `Existen muchos alimentos naturalmente GF`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80',
        color: '#795548',
        isFeatured: false,
        popularityScore: 60,
        tags: ['medical', 'celiac', 'allergy'],
    },

    // ==================== D) Historical / Cultural ====================

    // 14) Roman-Inspired (ROMAN_INSPIRED)
    {
        slug: 'roman-inspired',
        name: { en: 'Roman-Inspired', ru: 'Римская (вдохновл.)', kk: 'Римдік (шабыт)', fr: 'Inspiré romain',
            de: `Roman-inspiriert`,
            es: `De inspiración romana`
        },
        description: { en: 'Inspired by ancient Roman diet. Focus on grains, legumes, olive oil, and vegetables. Historical reconstruction for fun.', ru: 'Вдохновлённая древнеримской диетой. Зёрна, бобовые, оливковое масло, овощи. Историческая реконструкция.', kk: 'Ежелгі Рим диетасынан шабыт алған. Дәндер, бұршақ, зәйтүн майы, көкөністер.', fr: 'Inspiré du régime romain antique. Céréales, légumineuses, huile d\'olive.',
            de: `Inspiriert von der antiken römischen Ernährung. Konzentrieren Sie sich auf Getreide, Hülsenfrüchte, Olivenöl und Gemüse. Historische Rekonstruktion zum Spaß.`,
            es: `Inspirado en la antigua dieta romana. Concéntrese en cereales, legumbres, aceite de oliva y verduras. Reconstrucción histórica por diversión.`
        },
        shortDescription: { en: 'Ancient Roman-inspired eating', ru: 'Питание в стиле Древнего Рима', kk: 'Ежелгі Рим стиліндегі тамақтану', fr: 'Alimentation style Rome antique',
            de: `Essen im antiken römischen Stil`,
            es: `Comida de inspiración romana antigua`
        },
        category: 'historical',
        type: 'LIFESTYLE',
        difficulty: 'EASY',
        duration: 14,
        uiGroup: 'Historical',
        evidenceLevel: 'low',
        disclaimerKey: 'DISCLAIMER_HISTORICAL',
        streakThreshold: 0.6,
        howItWorks: {
            en: [
                'Base: grains + legumes + olive oil',
                'Vegetables 3+ servings',
                'Minimal sweets/fast food',
            ],
            ru: [
                'Основа: зёрна + бобовые + оливковое масло',
                'Овощи 3+ порции',
                'Минимум сладкого/фастфуда',
            ],
            kk: [
                'Негіз: дәндер + бұршақ + зәйтүн майы',
                'Көкөністер 3+ порция',
                'Тәтті/фастфуд минимум',
            ],
            fr: [
                'Base : céréales + légumineuses + huile d\'olive',
                'Légumes 3+ portions',
                'Sucreries/fast-food minimal',
            ],
            de: [
                `Basis: Getreide + Hülsenfrüchte + Olivenöl`,
                `Gemüse 3+ Portionen`,
                `Wenig Süßigkeiten/Fast Food`
                ],
            es: [
                `Base: cereales + legumbres + aceite de oliva`,
                `Verduras 3+ porciones`,
                `Dulces mínimos/comida rápida`
                ]
        },
        dailyTracker: [
            { key: 'legumes', label: { en: 'Legumes/lentils 1 time', ru: 'Бобовые/чечевица 1 раз', kk: 'Бұршақ/жасымық 1 рет', fr: 'Légumineuses/lentilles 1×',
                de: `Hülsenfrüchte/Linsen 1 Mal`,
                es: `Legumbres/lentejas 1 vez`
            } },
            { key: 'veggies_3', label: { en: 'Vegetables 3+', ru: 'Овощи 3+', kk: 'Көкөністер 3+', fr: 'Légumes 3+',
                de: `Gemüse 3+`,
                es: `Verduras 3+`
            } },
            { key: 'whole_grains', label: { en: 'Whole grains', ru: 'Цельные злаки', kk: 'Тұтас дәндер', fr: 'Céréales complètes',
                de: `Vollkornprodukte`,
                es: `cereales integrales`
            } },
            { key: 'min_junk', label: { en: 'Minimal sweets/fast food', ru: 'Минимум сладкого/фастфуда', kk: 'Тәтті/фастфуд минимум', fr: 'Sucreries/fast-food minimal',
                de: `Wenig Süßigkeiten/Fast Food`,
                es: `Dulces mínimos/comida rápida`
            } },
        ],
        notFor: null,
        suitableFor: ['fun', 'historical_interest', 'simple_eating'],
        notSuitableFor: [],
        allowedFoods: ['grains', 'legumes', 'olive_oil', 'vegetables', 'fruits', 'cheese', 'fish'],
        restrictedFoods: ['processed_foods', 'excessive_sugar'],
        macroSplit: { protein: 15, carbs: 60, fat: 25 },
        tips: {
            en: ['Try farro and lentils', 'Use olive oil generously', 'Eat simple, seasonal foods'],
            ru: ['Попробуйте полбу и чечевицу', 'Щедро используйте оливковое масло', 'Ешьте простую, сезонную еду'],
            kk: ['Полба мен жасымықты қолданып көріңіз', 'Зәйтүн майын мол пайдаланыңыз', 'Қарапайым, маусымдық тағамдарды жеңіз'],
            fr: ['Essayez épeautre et lentilles', 'Huile d\'olive généreusement', 'Manger simple et de saison'],
            de: [
                `Probieren Sie Farro und Linsen`,
                `Olivenöl großzügig verwenden`,
                `Essen Sie einfache, saisonale Lebensmittel`
                ],
            es: [
                `Prueba farro y lentejas`,
                `Utilice aceite de oliva generosamente`,
                `Consuma alimentos sencillos y de temporada.`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
        color: '#8D6E63',
        isFeatured: false,
        popularityScore: 45,
        tags: ['historical', 'fun', 'simple'],
    },

    // 15) Spartan-Inspired (SPARTAN_INSPIRED)
    {
        slug: 'spartan-inspired',
        name: { en: 'Spartan-Inspired', ru: 'Спартанская (вдохновл.)', kk: 'Спартандық (шабыт)', fr: 'Inspiré spartiate',
            de: `Spartanisch inspiriert`,
            es: `Inspiración espartana`
        },
        description: { en: 'Inspired by Spartan simplicity. Focus on simple, unprocessed foods and discipline.', ru: 'Вдохновлённая спартанской простотой. Простые, непереработанные продукты и дисциплина.', kk: 'Спартандық қарапайымдылықтан шабыт алған. Қарапайым, өңделмеген тағамдар және тәртіп.', fr: 'Inspiré par la simplicité spartiate. Aliments simples, non transformés et discipline.',
            de: `Inspiriert von spartanischer Einfachheit. Konzentrieren Sie sich auf einfache, unverarbeitete Lebensmittel und Disziplin.`,
            es: `Inspirado en la sencillez espartana. Concéntrese en la disciplina y en alimentos simples y no procesados.`
        },
        shortDescription: { en: 'Spartan simplicity and discipline', ru: 'Спартанская простота и дисциплина', kk: 'Спартандық қарапайымдылық және тәртіп', fr: 'Simplicité et discipline spartiates',
            de: `Spartanische Einfachheit und Disziplin`,
            es: `Sencillez y disciplina espartanas`
        },
        category: 'historical',
        type: 'LIFESTYLE',
        difficulty: 'MODERATE',
        duration: 14,
        uiGroup: 'Historical',
        evidenceLevel: 'low',
        disclaimerKey: 'DISCLAIMER_HISTORICAL',
        streakThreshold: 0.6,
        howItWorks: {
            en: [
                'Simple products (no ultra-processed)',
                'Vegetables 3+ servings',
                'Protein 2-3 times',
                'No sugary drinks',
            ],
            ru: [
                'Простые продукты (без ультра-переработки)',
                'Овощи 3+ порции',
                'Белок 2–3 раза',
                'Без сладких напитков',
            ],
            kk: [
                'Қарапайым өнімдер (ультра-өңделмеген)',
                'Көкөністер 3+ порция',
                'Ақуыз 2-3 рет',
                'Тәтті сусындарсыз',
            ],
            fr: [
                'Produits simples (sans ultra-transformés)',
                'Légumes 3+ portions',
                'Protéines 2–3×',
                'Pas de boissons sucrées',
            ],
            de: [
                `Einfache Produkte (keine hochverarbeiteten Produkte)`,
                `Gemüse 3+ Portionen`,
                `Protein 2-3 mal`,
                `Keine zuckerhaltigen Getränke`
                ],
            es: [
                `Productos sencillos (nada de ultraprocesados)`,
                `Verduras 3+ porciones`,
                `Proteína 2-3 veces`,
                `Nada de bebidas azucaradas`
                ]
        },
        dailyTracker: [
            { key: 'simple_foods', label: { en: 'Simple products (no ultra-processed)', ru: 'Простые продукты (без ультра-переработки)', kk: 'Қарапайым өнімдер', fr: 'Produits simples (sans ultra-transformés)',
                de: `Einfache Produkte (keine hochverarbeiteten Produkte)`,
                es: `Productos sencillos (nada de ultraprocesados)`
            } },
            { key: 'veggies_3', label: { en: 'Vegetables 3+', ru: 'Овощи 3+', kk: 'Көкөністер 3+', fr: 'Légumes 3+',
                de: `Gemüse 3+`,
                es: `Verduras 3+`
            } },
            { key: 'protein_2_3', label: { en: 'Protein 2-3', ru: 'Белок 2–3', kk: 'Ақуыз 2-3', fr: 'Protéines 2–3',
                de: `Protein 2-3`,
                es: `Proteína 2-3`
            } },
            { key: 'no_sugary_drinks', label: { en: 'No sugary drinks', ru: 'Без сладких напитков', kk: 'Тәтті сусындарсыз', fr: 'Pas de boissons sucrées',
                de: `Keine zuckerhaltigen Getränke`,
                es: `Nada de bebidas azucaradas`
            } },
        ],
        notFor: null,
        suitableFor: ['discipline', 'minimalism', 'fun'],
        notSuitableFor: [],
        allowedFoods: ['simple_whole_foods', 'vegetables', 'protein', 'water'],
        restrictedFoods: ['processed_foods', 'sugary_drinks', 'excessive_sweets'],
        macroSplit: { protein: 25, carbs: 50, fat: 25 },
        tips: {
            en: ['Embrace simplicity', 'Eat to fuel, not for entertainment', 'Practice discipline'],
            ru: ['Примите простоту', 'Ешьте для топлива, не для развлечения', 'Практикуйте дисциплину'],
            kk: ['Қарапайымдылықты қабылдаңыз', 'Ойын-сауық үшін емес, отын үшін жеңіз', 'Тәртіпке дағдыланыңыз'],
            fr: ['Embrassez la simplicité', 'Manger pour carburer, pas pour le plaisir', 'Pratiquer la discipline'],
            de: [
                `Umarmen Sie die Einfachheit`,
                `Essen Sie, um Energie zu tanken, nicht zur Unterhaltung`,
                `Übe Disziplin`
                ],
            es: [
                `Adopte la simplicidad`,
                `Coma para alimentarse, no para entretenerse`,
                `Practica la disciplina`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=800&q=80',
        color: '#5D4037',
        isFeatured: false,
        popularityScore: 40,
        tags: ['historical', 'discipline', 'minimalist'],
    },

    // 16) Arctic-Inspired (INUIT_INSPIRED)
    {
        slug: 'arctic-inspired',
        name: { en: 'Arctic-Inspired', ru: 'Арктическая (инуиты, вдохновл.)', kk: 'Арктикалық (шабыт)', fr: 'Inspiré arctique',
            de: `Von der Arktis inspiriert`,
            es: `Inspirado en el Ártico`
        },
        description: { en: 'Adapted from traditional Inuit diet. Focus on fish, omega-3, and seasonal produce.', ru: 'Адаптация традиционной диеты инуитов. Фокус на рыбе, омега-3 и сезонных продуктах.', kk: 'Дәстүрлі инуит диетасынан бейімделген. Балық, омега-3 және маусымдық өнімдерге назар аудару.', fr: 'Adaptation du régime inuit. Focus poisson, oméga-3 et produits de saison.',
            de: `Angepasst an die traditionelle Inuit-Diät. Konzentrieren Sie sich auf Fisch, Omega-3-Fettsäuren und saisonale Produkte.`,
            es: `Adaptado de la dieta tradicional inuit. Concéntrese en el pescado, los omega-3 y los productos de temporada.`
        },
        shortDescription: { en: 'Fish-focused with omega-3 and berries', ru: 'Фокус на рыбе с омега-3 и ягодами', kk: 'Омега-3 және жидектермен балыққа бағытталған', fr: 'Poisson, oméga-3 et baies',
            de: `Fischorientiert mit Omega-3 und Beeren`,
            es: `Centrado en pescado con omega-3 y bayas.`
        },
        category: 'cultural',
        type: 'LIFESTYLE',
        difficulty: 'MODERATE',
        duration: 14,
        uiGroup: 'Historical',
        evidenceLevel: 'low',
        disclaimerKey: 'DISCLAIMER_HISTORICAL',
        streakThreshold: 0.6,
        howItWorks: {
            en: [
                'Fish/seafood or omega-3 source daily',
                'Berries/fruits',
                'Protein 2-3 times',
                'Enough water',
            ],
            ru: [
                'Рыба/морепродукты или омега-3 источник ежедневно',
                'Ягоды/фрукты',
                'Белок 2–3 раза',
                'Достаточно воды',
            ],
            kk: [
                'Балық/теңіз өнімдері немесе омега-3 көзі күн сайын',
                'Жидектер/жемістер',
                'Ақуыз 2-3 рет',
                'Жеткілікті су',
            ],
            fr: [
                'Poisson/fruits de mer ou source oméga-3 quotidienne',
                'Baies/fruits',
                'Protéines 2–3×',
                'Assez d\'eau',
            ],
            de: [
                `Täglich Fisch/Meeresfrüchte oder Omega-3-Quelle`,
                `Beeren/Früchte`,
                `Protein 2-3 mal`,
                `Genug Wasser`
                ],
            es: [
                `Pescado/marisco o fuente de omega-3 diariamente`,
                `Bayas/frutas`,
                `Proteína 2-3 veces`,
                `suficiente agua`
                ]
        },
        dailyTracker: [
            { key: 'fish_omega3', label: { en: 'Fish/seafood or omega-3 source', ru: 'Рыба/морепродукты или омега-3 источник', kk: 'Балық/теңіз өнімдері немесе омега-3 көзі', fr: 'Poisson/fruits de mer ou oméga-3',
                de: `Fisch/Meeresfrüchte oder Omega-3-Quelle`,
                es: `Pescado/marisco o fuente de omega-3`
            } },
            { key: 'berries', label: { en: 'Berries/fruits', ru: 'Ягоды/фрукты', kk: 'Жидектер/жемістер', fr: 'Baies/fruits',
                de: `Beeren/Früchte`,
                es: `Bayas/frutas`
            } },
            { key: 'protein_2_3', label: { en: 'Protein 2-3', ru: 'Белок 2–3', kk: 'Ақуыз 2-3', fr: 'Protéines 2–3',
                de: `Protein 2-3`,
                es: `Proteína 2-3`
            } },
            { key: 'water', label: { en: 'Enough water', ru: 'Достаточно воды', kk: 'Жеткілікті су', fr: 'Assez d\'eau',
                de: `Genug Wasser`,
                es: `suficiente agua`
            } },
        ],
        notFor: null,
        suitableFor: ['omega3_focus', 'fish_lovers', 'fun'],
        notSuitableFor: ['fish_allergy'],
        allowedFoods: ['fish', 'seafood', 'berries', 'greens', 'lean_meats'],
        restrictedFoods: ['processed_foods', 'excessive_sugar'],
        macroSplit: { protein: 30, carbs: 30, fat: 40 },
        tips: {
            en: ['Focus on fatty fish for omega-3', 'Try seasonal berries', 'This is an adaptation, not authentic'],
            ru: ['Фокус на жирной рыбе для омега-3', 'Попробуйте сезонные ягоды', 'Это адаптация, не аутентичный рецепт'],
            kk: ['Омега-3 үшін майлы балыққа назар аударыңыз', 'Маусымдық жидектерді қолданып көріңіз', 'Бұл түпнұсқа емес, бейімделген нұсқа'],
            fr: ['Privilégier les poissons gras (oméga-3)', 'Baies de saison', 'Adaptation, pas authentique'],
            de: [
                `Konzentrieren Sie sich auf fetthaltigen Fisch für Omega-3`,
                `Probieren Sie saisonale Beeren`,
                `Dies ist eine Adaption, nicht authentisch`
                ],
            es: [
                `Concéntrese en el pescado graso para obtener omega-3`,
                `Prueba las bayas de temporada`,
                `Esta es una adaptación, no auténtica.`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80',
        color: '#00ACC1',
        isFeatured: false,
        popularityScore: 35,
        tags: ['historical', 'fish', 'omega3'],
    },

    // 17) Steppe-Inspired (MONGOL_INSPIRED)
    {
        slug: 'steppe-inspired',
        name: { en: 'Steppe-Inspired', ru: 'Степная (монголы, вдохновл.)', kk: 'Дала (шабыт)', fr: 'Inspiré steppe',
            de: `Von der Steppe inspiriert`,
            es: `Inspirado en la estepa`
        },
        description: { en: 'Adapted from Mongolian steppe traditions. Focus on protein and fermented dairy.', ru: 'Адаптация традиций монгольской степи. Фокус на белке и ферментированных молочных.', kk: 'Моңғол даласы дәстүрлерінен бейімделген. Ақуыз және ашытылған сүт өнімдеріне назар аудару.', fr: 'Adaptation des traditions de la steppe. Focus protéines et laitages fermentés.',
            de: `Angepasst an mongolische Steppentraditionen. Konzentrieren Sie sich auf Eiweiß und fermentierte Milchprodukte.`,
            es: `Adaptado de las tradiciones de la estepa de Mongolia. Concéntrese en las proteínas y los lácteos fermentados.`
        },
        shortDescription: { en: 'Protein and fermented foods, steppe style', ru: 'Белок и ферментированное, степной стиль', kk: 'Ақуыз және ашытылған тағамдар, дала стилі', fr: 'Protéines et fermentés, style steppe',
            de: `Protein- und fermentierte Lebensmittel im Steppenstil`,
            es: `Proteínas y alimentos fermentados, estilo estepario.`
        },
        category: 'cultural',
        type: 'LIFESTYLE',
        difficulty: 'EASY',
        duration: 14,
        uiGroup: 'Historical',
        evidenceLevel: 'low',
        disclaimerKey: 'DISCLAIMER_HISTORICAL',
        streakThreshold: 0.6,
        howItWorks: {
            en: [
                'Protein 2-3 times',
                'Fermented dairy (if tolerated)',
                'Vegetables/greens 2+ (adaptation)',
            ],
            ru: [
                'Белок 2–3 раза',
                'Кисломолочные/ферментированные (если переносимость)',
                'Овощи/зелень 2+ (адаптация)',
            ],
            kk: [
                'Ақуыз 2-3 рет',
                'Ашытылған сүт өнімдері (төзімді болса)',
                'Көкөністер/жасылдар 2+ (бейімдеу)',
            ],
            fr: [
                'Protéines 2–3×',
                'Laitages fermentés (si tolérés)',
                'Légumes/verts 2+ (adaptation)',
            ],
            de: [
                `Protein 2-3 mal`,
                `Fermentierte Milchprodukte (sofern vertragen)`,
                `Gemüse/Grün 2+ (Anpassung)`
                ],
            es: [
                `Proteína 2-3 veces`,
                `Lácteos fermentados (si se toleran)`,
                `Verduras/verduras 2+ (adaptación)`
                ]
        },
        dailyTracker: [
            { key: 'protein_2_3', label: { en: 'Protein 2-3', ru: 'Белок 2–3', kk: 'Ақуыз 2-3', fr: 'Protéines 2–3',
                de: `Protein 2-3`,
                es: `Proteína 2-3`
            } },
            { key: 'fermented', label: { en: 'Fermented dairy (if tolerated)', ru: 'Кисломолочные/ферментированные (если переносимость)', kk: 'Ашытылған сүт өнімдері (төзімді болса)', fr: 'Laitages fermentés (si tolérés)',
                de: `Fermentierte Milchprodukte (sofern vertragen)`,
                es: `Lácteos fermentados (si se toleran)`
            } },
            { key: 'veggies_2', label: { en: 'Vegetables/greens 2+ (adaptation)', ru: 'Овощи/зелень 2+ (адаптация)', kk: 'Көкөністер/жасылдар 2+', fr: 'Légumes/verts 2+ (adaptation)',
                de: `Gemüse/Grün 2+ (Anpassung)`,
                es: `Verduras/verduras 2+ (adaptación)`
            } },
        ],
        notFor: null,
        suitableFor: ['protein_focus', 'fermented_food_lovers', 'fun'],
        notSuitableFor: ['lactose_intolerant'],
        allowedFoods: ['meat', 'dairy', 'fermented_dairy', 'vegetables'],
        restrictedFoods: ['processed_foods', 'excessive_sugar'],
        macroSplit: { protein: 30, carbs: 30, fat: 40 },
        tips: {
            en: ['Try kefir or yogurt', 'This is adapted for modern diet', 'Focus on quality protein'],
            ru: ['Попробуйте кефир или йогурт', 'Это адаптация для современного рациона', 'Фокус на качественном белке'],
            kk: ['Кефир немесе йогуртты қолданып көріңіз', 'Бұл заманауи рационға бейімделген', 'Сапалы ақуызға назар аударыңыз'],
            fr: ['Essayez kéfir ou yaourt', 'Adaptation au régime moderne', 'Qualité des protéines'],
            de: [
                `Versuchen Sie es mit Kefir oder Joghurt`,
                `Dies ist an die moderne Ernährung angepasst`,
                `Konzentrieren Sie sich auf hochwertiges Protein`
                ],
            es: [
                `Prueba el kéfir o el yogur.`,
                `Esto está adaptado a la dieta moderna.`,
                `Centrarse en la proteína de calidad`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',
        color: '#6D4C41',
        isFeatured: false,
        popularityScore: 30,
        tags: ['historical', 'fermented', 'protein'],
    },

    // 18) Three Sisters (PUEBLO_THREE_SISTERS)
    {
        slug: 'three-sisters',
        name: { en: 'Three Sisters', ru: 'Три сестры (индейцы пуэбло)', kk: 'Үш әпке', fr: 'Trois sœurs',
            de: `Drei Schwestern`,
            es: `tres hermanas`
        },
        description: { en: 'Based on Native American "Three Sisters" agriculture. Corn, beans, and squash as dietary foundation.', ru: 'Основана на сельском хозяйстве "Трёх сестёр" коренных американцев. Кукуруза, фасоль и тыква как основа.', kk: 'Америкалық үндістердің "Үш әпке" ауыл шаруашылығына негізделген. Жүгері, бұршақ және асқабақ диета негізі ретінде.', fr: 'Inspiré des « Trois sœurs » amérindiennes. Maïs, haricots et courges comme fondation.',
            de: `Basierend auf der „Three Sisters“-Landwirtschaft der amerikanischen Ureinwohner. Mais, Bohnen und Kürbis als Nahrungsgrundlage.`,
            es: `Basado en la agricultura de las "Tres Hermanas" de los nativos americanos. Maíz, frijol y calabaza como base dietética.`
        },
        shortDescription: { en: 'Native American plant-based foundation', ru: 'Растительная основа коренных американцев', kk: 'Америкалық үндістердің өсімдік негізі', fr: 'Fondation végétale amérindienne',
            de: `Pflanzenbasierte Foundation der amerikanischen Ureinwohner`,
            es: `Fundación basada en plantas nativas americanas`
        },
        category: 'cultural',
        type: 'LIFESTYLE',
        difficulty: 'EASY',
        duration: 14,
        uiGroup: 'Historical',
        evidenceLevel: 'low',
        disclaimerKey: 'DISCLAIMER_HISTORICAL',
        streakThreshold: 0.6,
        howItWorks: {
            en: [
                'Legumes 1 time daily',
                'Vegetables 3+ servings',
                'Whole grains',
            ],
            ru: [
                'Бобовые 1 раз в день',
                'Овощи 3+ порции',
                'Цельные злаки',
            ],
            kk: [
                'Бұршақ күніне 1 рет',
                'Көкөністер 3+ порция',
                'Тұтас дәндер',
            ],
            fr: [
                'Légumineuses 1×/jour',
                'Légumes 3+ portions',
                'Céréales complètes',
            ],
            de: [
                `1x täglich Hülsenfrüchte`,
                `Gemüse 3+ Portionen`,
                `Vollkornprodukte`
                ],
            es: [
                `Legumbres 1 vez al día`,
                `Verduras 3+ porciones`,
                `cereales integrales`
                ]
        },
        dailyTracker: [
            { key: 'legumes', label: { en: 'Legumes 1 time', ru: 'Бобовые 1 раз', kk: 'Бұршақ 1 рет', fr: 'Légumineuses 1×',
                de: `Hülsenfrüchte 1 Mal`,
                es: `Legumbres 1 vez`
            } },
            { key: 'veggies_3', label: { en: 'Vegetables 3+', ru: 'Овощи 3+', kk: 'Көкөністер 3+', fr: 'Légumes 3+',
                de: `Gemüse 3+`,
                es: `Verduras 3+`
            } },
            { key: 'whole_grains', label: { en: 'Whole grains', ru: 'Цельные злаки', kk: 'Тұтас дәндер', fr: 'Céréales complètes',
                de: `Vollkornprodukte`,
                es: `cereales integrales`
            } },
        ],
        notFor: null,
        suitableFor: ['plant_based', 'cultural_interest', 'fun'],
        notSuitableFor: [],
        allowedFoods: ['corn', 'beans', 'squash', 'vegetables', 'fruits'],
        restrictedFoods: ['processed_foods', 'excessive_sugar'],
        macroSplit: { protein: 15, carbs: 60, fat: 25 },
        tips: {
            en: ['Try combining corn, beans, and squash in meals', 'This is a cultural example, not medical prescription'],
            ru: ['Попробуйте сочетать кукурузу, фасоль и тыкву', 'Это культурный пример, не медицинское назначение'],
            kk: ['Тамақта жүгері, бұршақ және асқабақты біріктіріп көріңіз', 'Бұл мәдени мысал, медициналық тағайындау емес'],
            fr: ['Associer maïs, haricots et courges', 'Exemple culturel, pas prescription médicale'],
            de: [
                `Versuchen Sie, Mais, Bohnen und Kürbis in Ihren Mahlzeiten zu kombinieren`,
                `Dies ist ein kulturelles Beispiel, keine ärztliche Verschreibung`
                ],
            es: [
                `Intente combinar maíz, frijoles y calabaza en las comidas.`,
                `Este es un ejemplo cultural, no una prescripción médica.`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f82ber1b?w=800&q=80',
        color: '#FF7043',
        isFeatured: false,
        popularityScore: 25,
        tags: ['historical', 'plant_based', 'cultural'],
    },

    // 18.5) Okinawa Longevity (OKINAWA_LONGEVITY)
    {
        slug: 'okinawa_longevity',
        name: { en: 'Okinawa Longevity', ru: 'Окинавская (долголетие)', kk: 'Окинава (ұзақ өмір)', fr: 'Longévité Okinawa',
            de: `Okinawa Langlebigkeit`,
            es: `Longevidad en Okinawa`
        },
        description: { en: 'Based on the traditional diet of Okinawa, Japan, known for the long lifespan of its inhabitants. Emphasizes plant-based foods, fish, sweet potatoes, and moderate calorie restriction.', ru: 'Основана на традиционной диете жителей Окинавы, Япония, известных своим долголетием. Акцент на растительных продуктах, рыбе, сладком картофеле и умеренном ограничении калорий.', kk: 'Жапонияның Окинава тұрғындарының ұзақ өмір сүруімен танымал дәстүрлі диетасына негізделген. Өсімдік тағамдары, балық, тәтті картоп және қалыпты калория шектеуіне баса назар аударылады.', fr: 'Régime traditionnel d\'Okinawa',
            de: `Basierend auf der traditionellen Ernährung von Okinawa, Japan, das für die lange Lebensdauer seiner Bewohner bekannt ist. Der Schwerpunkt liegt auf pflanzlichen Lebensmitteln, Fisch, Süßkartoffeln und einer moderaten Kalorieneinschränkung.`,
            es: `Basado en la dieta tradicional de Okinawa, Japón, conocida por la larga vida útil de sus habitantes. Hace hincapié en los alimentos de origen vegetal, el pescado, las batatas y la restricción calórica moderada.`
        },
        shortDescription: { en: 'Japanese longevity diet from Okinawa', ru: 'Японская диета долголетия из Окинавы', kk: 'Окинавадан жапондық ұзақ өмір диетасы', fr: 'Régime longévité japonais (Okinawa)',
            de: `Japanische Langlebigkeitsdiät aus Okinawa`,
            es: `Dieta japonesa de longevidad de Okinawa`
        },
        category: 'cultural',
        type: 'LIFESTYLE',
        difficulty: 'MODERATE',
        duration: 30,
        uiGroup: 'Historical',
        evidenceLevel: 'medium',
        disclaimerKey: 'DISCLAIMER_HISTORICAL',
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'Base: sweet potatoes, vegetables, tofu, seaweed',
                'Protein: fish 2-3 times a week, small portions of pork',
                'Practice "Hara hachi bu" - eat until 80% full',
                'Minimal sugar and processed foods',
            ],
            ru: [
                'Основа: сладкий картофель, овощи, тофу, водоросли',
                'Белок: рыба 2-3 раза в неделю, небольшие порции свинины',
                'Практика "Хара хачи бу" - есть до 80% насыщения',
                'Минимум сахара и обработанных продуктов',
            ],
            kk: [
                'Негіз: тәтті картоп, көкөністер, тофу, теңіз балдырлары',
                'Ақуыз: аптасына 2-3 рет балық, аз шошқа еті',
                '"Хара хачи бу" практикасы - 80% тойғанға дейін жеу',
                'Аз қант және өңделген тағамдар',
            ],
            fr: [
                'Base : patates douces, légumes, tofu, algues',
                'Protéines : poisson 2–3×/semaine, petites portions de porc',
                'Pratiquer « Hara hachi bu » - manger jusqu\'à 80 % rassasié',
                'Sucre et produits transformés minimaux',
            ],
            de: [
                `Basis: Süßkartoffeln, Gemüse, Tofu, Seetang`,
                `Protein: 2-3 mal pro Woche Fisch, kleine Portionen Schweinefleisch`,
                `Üben Sie „Hara hachi bu“ – essen Sie, bis Sie zu 80 % satt sind`,
                `Wenig Zucker und verarbeitete Lebensmittel`
                ],
            es: [
                `Base: batatas, verduras, tofu, algas`,
                `Proteínas: pescado 2-3 veces por semana, pequeñas porciones de cerdo`,
                `Practica "Hara hachi bu": come hasta un 80% de saciedad`,
                `Mínimo azúcar y alimentos procesados.`
                ]
        },
        dailyTracker: [
            { key: 'vegetables_5', label: { en: 'Vegetables 5+ servings', ru: 'Овощи 5+ порций', kk: 'Көкөністер 5+ порция', fr: 'Légumes 5+ portions',
                de: `Gemüse ab 5 Portionen`,
                es: `Verduras 5+ porciones`
            } },
            { key: 'sweet_potato', label: { en: 'Sweet potato or whole grains', ru: 'Сладкий картофель или цельные злаки', kk: 'Тәтті картоп немесе тұтас дәндер', fr: 'Patate douce ou céréales complètes',
                de: `Süßkartoffel oder Vollkorn`,
                es: `Camote o cereales integrales`
            } },
            { key: 'tofu_legumes', label: { en: 'Tofu/legumes for protein', ru: 'Тофу/бобовые для белка', kk: 'Ақуыз үшін тофу/бұршақ', fr: 'Tofu/légumineuses pour les protéines',
                de: `Tofu/Hülsenfrüchte für Protein`,
                es: `Tofu/legumbres para proteínas`
            } },
            { key: 'hara_hachi_bu', label: { en: 'Stopped eating at 80% full', ru: 'Остановился на 80% насыщения', kk: '80% тойғанда тоқтадым', fr: 'S\'arrêter à 80%',
                de: `Habe aufgehört zu essen, als ich zu 80 % satt war`,
                es: `Dejó de comer al 80% de su capacidad`
            } },
            { key: 'minimal_processed', label: { en: 'Avoided processed foods', ru: 'Избегал обработанных продуктов', kk: 'Өңделген тағамдардан аулақ болдым', fr: 'Éviter les produits transformés',
                de: `Verarbeitete Lebensmittel gemieden`,
                es: `Alimentos procesados ​​​​evitados`
            } },
        ],
        notFor: null,
        suitableFor: ['longevity', 'heart_health', 'weight_management', 'plant_based'],
        notSuitableFor: [],
        allowedFoods: ['sweet_potatoes', 'vegetables', 'tofu', 'seaweed', 'fish', 'fruits', 'green_tea'],
        restrictedFoods: ['processed_foods', 'excessive_sugar', 'red_meat', 'dairy'],
        macroSplit: { protein: 15, carbs: 60, fat: 25 },
        tips: {
            en: ['Try purple sweet potatoes', 'Drink green tea daily', 'Practice mindful eating'],
            ru: ['Попробуйте фиолетовый сладкий картофель', 'Пейте зелёный чай ежедневно', 'Практикуйте осознанное питание'],
            kk: ['Күлгін тәтті картопты қолданып көріңіз', 'Күн сайын жасыл шай ішіңіз', 'Саналы тамақтануды практикалаңыз'],
            fr: ['Essayez les patates douces violettes', 'Thé vert quotidien', 'Manger en pleine conscience'],
            de: [
                `Probieren Sie lila Süßkartoffeln`,
                `Trinken Sie täglich grünen Tee`,
                `Übe achtsames Essen`
                ],
            es: [
                `Prueba las batatas moradas`,
                `Bebe té verde a diario`,
                `Practica una alimentación consciente`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80',
        color: '#7B1FA2',
        isFeatured: true,
        popularityScore: 85,
        tags: ['longevity', 'japanese', 'plant_based', 'cultural'],
    },

    // ==================== EXTRA DIETS (from DIETS_CATALOG.md) ====================

    // 19) Paleo (PALEO)
    {
        slug: 'paleo',
        name: { en: 'Paleo', ru: 'Палео', kk: 'Палео', fr: 'Paléo',
            de: `Paläo`,
            es: `Paleo`
        },
        description: { en: 'A whole-food approach with minimal processing. Emphasizes meat, fish, vegetables, fruits, nuts, and seeds.', ru: 'Стиль питания с упором на простые продукты и минимум переработки.', kk: 'Қарапайым өнімдерге негізделген, өңделген тағамды азайтады.', fr: 'Aliments bruts, peu transformés. Viande, poisson, légumes, fruits, noix, graines.',
            de: `Ein Vollwert-Ansatz mit minimaler Verarbeitung. Der Schwerpunkt liegt auf Fleisch, Fisch, Gemüse, Obst, Nüssen und Samen.`,
            es: `Un enfoque de alimentos integrales con un procesamiento mínimo. Destaca la carne, el pescado, las verduras, las frutas, los frutos secos y las semillas.`
        },
        shortDescription: { en: 'Whole foods, no grains or dairy', ru: 'Цельные продукты, без злаков и молочного', kk: 'Тұтас өнімдер, дәнді және сүтсіз', fr: 'Aliments bruts, sans céréales ni laitages',
            de: `Vollwertkost, kein Getreide oder Milchprodukte`,
            es: `Alimentos integrales, sin cereales ni lácteos.`
        },
        category: 'modern',
        type: 'HEALTH',
        difficulty: 'MODERATE',
        duration: 30,
        uiGroup: 'Popular',
        evidenceLevel: 'medium',
        disclaimerKey: null,
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'Eat: meat, fish, eggs, vegetables, fruits, nuts, seeds, healthy oils (olive, coconut, avocado)',
                'Avoid: grains (wheat, oats, rice), legumes (beans, lentils, peanuts), dairy, refined sugar, processed foods',
                'Protein at every meal: palm-sized portion of meat, fish, or eggs. Wild game and grass-fed preferred',
                'Fill half your plate with vegetables at every meal. All vegetables except white potatoes (debated)',
                'Fruits freely: berries, apples, citrus. If weight loss goal, limit to 2-3 servings/day',
                'Cook at home with simple ingredients. If it has a label with ingredients you can\'t pronounce, skip it',
            ],
            ru: [
                'Есть: мясо, рыбу, яйца, овощи, фрукты, орехи, семена, здоровые масла',
                'Избегать: злаки, бобовые, молочные, рафинированный сахар, обработанные',
                'Белок в каждом приёме: порция с ладонь. Предпочтительно дичь и травяной откорм',
                'Половина тарелки - овощи в каждом приёме',
                'Фрукты свободно: ягоды, яблоки, цитрусы. Для похудения 2-3 порции/день',
                'Готовьте дома из простых ингредиентов. Если не можете прочитать состав - не ешьте',
            ],
            kk: [
                'Жеу: ет, балық, жұмыртқа, көкөніс, жеміс, жаңғақ, тұқым, пайдалы майлар',
                'Аулақ болу: дәндер, бұршақ, сүт өнімдері, тазартылған қант, өңделгендер',
                'Әр тамақта ақуыз: алақан өлшемі',
                'Әр тамақта тәрелкенің жартысы көкөніс',
                'Жемістер еркін: жидек, алма, цитрус. Салмақ түсіру үшін 2-3 порция/күн',
                'Үйде қарапайым ингредиенттерден пісіріңіз',
            ],
            fr: [
                'Manger : viande, poisson, œufs, légumes, fruits, noix, graines, huiles saines',
                'Éviter : céréales, légumineuses, laitages, sucre raffiné, transformés',
                'Protéines à chaque repas : portion taille paume. Viande pâturée préférée',
                'Moitié de l\'assiette en légumes à chaque repas',
                'Fruits librement : baies, pommes, agrumes. Pour perte de poids 2-3 portions/jour',
                'Cuisiner maison. Si l\'étiquette a des ingrédients imprononçables, évitez',
            ],
            de: [
                `Essen Sie: Fleisch, Fisch, Eier, Gemüse, Obst, Nüsse, Samen, gesunde Öle (Oliven, Kokosnuss, Avocado)`,
                `Vermeiden Sie: Getreide (Weizen, Hafer, Reis), Hülsenfrüchte (Bohnen, Linsen, Erdnüsse), Milchprodukte, raffinierten Zucker, verarbeitete Lebensmittel`,
                `Protein zu jeder Mahlzeit: handtellergroße Portion Fleisch, Fisch oder Eier. Wildwild und Grasfütterung werden bevorzugt`,
                `Füllen Sie zu jeder Mahlzeit die Hälfte Ihres Tellers mit Gemüse. Alle Gemüse außer weißen Kartoffeln (strittig)`,
                `Früchte frei: Beeren, Äpfel, Zitrusfrüchte. Wenn Sie eine Gewichtsabnahme anstreben, beschränken Sie sich auf 2–3 Portionen pro Tag`,
                `Kochen Sie zu Hause mit einfachen Zutaten. Wenn es ein Etikett mit Zutaten gibt, die Sie nicht aussprechen können, überspringen Sie es`
                ],
            es: [
                `Comer: carne, pescado, huevos, verduras, frutas, frutos secos, semillas, aceites saludables (oliva, coco, aguacate)`,
                `Evite: cereales (trigo, avena, arroz), legumbres (frijoles, lentejas, maní), lácteos, azúcar refinada, alimentos procesados.`,
                `Proteínas en cada comida: porción de carne, pescado o huevos del tamaño de la palma de la mano. Se prefiere caza silvestre y animales alimentados con pasto.`,
                `Llena la mitad de tu plato con verduras en cada comida. Todas las verduras excepto las patatas blancas (debatido)`,
                `Frutas libremente: bayas, manzanas, cítricos. Si el objetivo es perder peso, limítelo a 2 o 3 porciones al día.`,
                `Cocine en casa con ingredientes simples. Si tiene una etiqueta con ingredientes que no puedes pronunciar, sáltala`
                ]
        },
        dailyTracker: [
            { key: 'no_grains', label: { en: 'No grains consumed (wheat, rice, oats, corn)', ru: 'Без злаков (пшеница, рис, овёс, кукуруза)', kk: 'Дәндерсіз (бидай, күріш, сұлы, жүгері)', fr: 'Pas de céréales (blé, riz, avoine, maïs)',
                de: `Kein Verzehr von Getreide (Weizen, Reis, Hafer, Mais)`,
                es: `No consumir cereales (trigo, arroz, avena, maíz)`
            } },
            { key: 'no_dairy', label: { en: 'No dairy products consumed', ru: 'Без молочных продуктов', kk: 'Сүт өнімдерісіз', fr: 'Pas de produits laitiers',
                de: `Keine Milchprodukte konsumiert`,
                es: `No se consumen productos lácteos.`
            } },
            { key: 'protein_every', label: { en: 'Protein at every meal (meat, fish, or eggs)', ru: 'Белок в каждом приёме (мясо, рыба, яйца)', kk: 'Әр тамақта ақуыз (ет, балық, жұмыртқа)', fr: 'Protéines à chaque repas (viande, poisson, œufs)',
                de: `Protein zu jeder Mahlzeit (Fleisch, Fisch oder Eier)`,
                es: `Proteínas en cada comida (carne, pescado o huevos)`
            } },
            { key: 'veggies_half', label: { en: 'Vegetables filled half the plate at meals', ru: 'Овощи на половине тарелки', kk: 'Тәрелкенің жартысы көкөніс', fr: 'Légumes remplissent la moitié de l\'assiette',
                de: `Zu den Mahlzeiten füllte Gemüse die Hälfte des Tellers`,
                es: `Las verduras llenaron la mitad del plato en las comidas`
            } },
            { key: 'no_processed', label: { en: 'No processed foods or refined sugar', ru: 'Без обработанных продуктов и сахара', kk: 'Өңделген тағам және қантсыз', fr: 'Pas d\'aliments transformés ni sucre raffiné',
                de: `Keine verarbeiteten Lebensmittel oder raffinierten Zucker`,
                es: `Sin alimentos procesados ​​ni azúcar refinada.`
            } },
            { key: 'home_cooked', label: { en: 'Home-cooked with simple ingredients', ru: 'Домашняя еда из простых ингредиентов', kk: 'Қарапайым ингредиенттерден үйде ас', fr: 'Cuisine maison avec ingrédients simples',
                de: `Hausgemacht mit einfachen Zutaten`,
                es: `Cocina casera con ingredientes sencillos.`
            } },
        ],
        sampleDay: {
            en: 'Breakfast: eggs with veggies + fruit.\nLunch: salad with chicken/beef + nuts.\nDinner: baked fish/steak + grilled vegetables.\nSnacks: berries, nuts, raw veggies.',
            ru: 'Завтрак: яичница с овощами + фрукт.\nОбед: салат с курицей/говядиной + орехи.\nУжин: запечённая рыба/стейк + овощи на гриле.\nПерекусы: ягоды, орехи, сырые овощи.',
            kk: 'Таңғы ас: көкөніспен жұмыртқа + жеміс.\nТүскі ас: тауық/сиыр еті бар салат + жаңғақ.\nКешкі ас: пеште піскен балық/стейк + гриль көкөніс.\nТіскебасар: жидек, жаңғақ, шикі көкөніс.',
            fr: 'Petit-déj : œufs + légumes + fruit.\nDéjeuner : salade poulet/bœuf + noix.\nDîner : poisson/steak + légumes grillés.\nCollations : baies, noix, légumes crus.',
            de: `Frühstück: Eier mit Gemüse + Obst. 
Mittagessen: Salat mit Huhn/Rind + Nüssen. 
Abendessen: gebackener Fisch/Steak + gegrilltes Gemüse. 
Snacks: Beeren, Nüsse, rohes Gemüse.`,
            es: `Desayuno: huevos con verduras + fruta. 
Almuerzo: ensalada con pollo/ternera + frutos secos. 
Cena: pescado/filete al horno + verduras asadas. 
Meriendas: bayas, nueces, verduras crudas.`
        },
        notFor: null,
        suitableFor: ['weight_loss', 'whole_foods', 'anti_inflammatory'],
        notSuitableFor: [],
        allowedFoods: ['meat', 'fish', 'vegetables', 'fruits', 'nuts', 'seeds', 'eggs'],
        restrictedFoods: ['grains', 'legumes', 'dairy', 'processed_foods', 'refined_sugar'],
        macroSplit: { protein: 30, carbs: 30, fat: 40 },
        tips: {
            en: ['Focus on whole, unprocessed foods', 'Include variety of vegetables', 'Choose grass-fed meat when possible'],
            ru: ['Фокус на цельных, необработанных продуктах', 'Включайте разнообразные овощи', 'Выбирайте мясо травяного откорма, если возможно'],
            kk: ['Тұтас, өңделмеген тағамдарға назар аударыңыз', 'Көкөністердің түрлілігін қосыңыз', 'Мүмкіндігінше шөппен қоректенген мал етін таңдаңыз'],
            fr: ['Privilégier aliments bruts, non transformés', 'Varier les légumes', 'Viande pâturée si possible'],
            de: [
                `Konzentrieren Sie sich auf vollwertige, unverarbeitete Lebensmittel`,
                `Fügen Sie verschiedene Gemüsesorten hinzu`,
                `Wenn möglich, wählen Sie Fleisch von grasgefütterten Tieren`
                ],
            es: [
                `Centrarse en alimentos integrales y no procesados`,
                `Incluye variedad de verduras.`,
                `Elija carne alimentada con pasto cuando sea posible`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=800&q=80',
        color: '#8D6E63',
        isFeatured: false,
        popularityScore: 80,
        tags: ['whole_foods', 'no_grains', 'no_dairy'],
    },

    // 20) Whole30-style Clean Reset (WHOLE30_INSPIRED)
    {
        slug: 'whole30-inspired',
        name: { en: 'Whole30 (Inspired)', ru: 'Whole30 (вдохновл.)', kk: 'Whole30 (шабыт)', fr: 'Whole30 (inspiré)',
            de: `Whole30 (inspiriert)`,
            es: `Whole30 (inspirado)`
        },
        description: { en: 'A short reset protocol with strict rules. Eliminates sugar, alcohol, and common triggers for 30 days.', ru: 'Короткий «reset» протокол. Требует аккуратности и понятных правил.', kk: 'Қысқа reset протоколы, қатаң ережелері бар.', fr: 'Protocole reset 30 jours. Supprime sucre, alcool et déclencheurs courants.',
            de: `Ein kurzes Reset-Protokoll mit strengen Regeln. Beseitigt 30 Tage lang Zucker, Alkohol und häufige Auslöser.`,
            es: `Un breve protocolo de reinicio con reglas estrictas. Elimina el azúcar, el alcohol y los desencadenantes comunes durante 30 días.`
        },
        shortDescription: { en: '30-day elimination reset', ru: '30-дневный reset протокол', kk: '30 күндік reset протоколы', fr: 'Reset élimination 30 jours',
            de: `30-Tage-Eliminierungs-Reset`,
            es: `Reinicio de eliminación de 30 días`
        },
        category: 'inspired',
        type: 'WEIGHT_LOSS',
        difficulty: 'HARD',
        duration: 30,
        uiGroup: 'Weight loss',
        evidenceLevel: 'low',
        disclaimerKey: 'DISCLAIMER_MEDICAL',
        streakThreshold: 0.8,
        howItWorks: {
            en: [
                '30-day strict elimination: ZERO added sugar, alcohol, grains, legumes, soy, dairy',
                'Eat: meat, seafood, eggs, vegetables, fruits, natural fats. That\'s the entire list',
                'No weighing yourself or counting calories for 30 days - focus on food quality only',
                'Read EVERY label. Sugar hides in 61+ names (dextrose, maltodextrin, "natural flavors")',
                'No "Paleo-fying" junk food (no Paleo pancakes, almond flour pizza, coconut ice cream)',
                'After 30 days: structured reintroduction. Add back one food group at a time, 3-day intervals',
            ],
            ru: [
                '30 дней строгой элиминации: НОЛЬ добавленного сахара, алкоголя, злаков, бобовых, сои, молочных',
                'Есть: мясо, морепродукты, яйца, овощи, фрукты, натуральные жиры. Весь список',
                'He взвешивайтесь и не считайте калории 30 дней - только качество еды',
                'Читайте КАЖДУЮ этикетку. Сахар прячется под 61+ названием',
                'Не делайте "палео-версии" вредной еды (никаких палео-блинов)',
                'После 30 дней: структурированная реинтродукция. Одна группа продуктов, интервал 3 дня',
            ],
            kk: [
                '30 күн қатаң элиминация: қосылған қант, алкоголь, дәндер, бұршақ, соя, сүт өнімдері НӨЛ',
                'Жеу: ет, теңіз өнімдері, жұмыртқа, көкөніс, жеміс, табиғи майлар',
                '30 күн салмақ өлшемеңіз және калория санамаңыз - тек тағам сапасы',
                'ӘРБІР жапсырманы оқыңыз. Қант 61+ атпен жасырынады',
                'Зиянды тағамның "палео-нұсқасын" жасамаңыз',
                '30 күннен кейін: құрылымды реинтродукция. Бір тағам тобы, 3 күн аралық',
            ],
            fr: [
                'Elimination stricte 30 jours : ZÉRO sucre ajouté, alcool, céréales, légumineuses, soja, laitages',
                'Manger : viande, fruits de mer, œufs, légumes, fruits, graisses naturelles',
                'Ni pesée ni comptage de calories pendant 30 jours - qualité uniquement',
                'Lire CHAQUE étiquette. Le sucre se cache sous 61+ noms',
                'Pas de versions "paléo" de junk food (pas de crêpes paléo, pizza farine d\'amande)',
                'Après 30 jours : réintroduction structurée. Un groupe alimentaire à la fois, intervalles de 3 jours',
            ],
            de: [
                `30-tägige strikte Eliminierung: KEIN zugesetzter Zucker, Alkohol, Getreide, Hülsenfrüchte, Soja, Milchprodukte`,
                `Essen Sie: Fleisch, Meeresfrüchte, Eier, Gemüse, Obst, natürliche Fette. Das ist die gesamte Liste`,
                `30 Tage lang kein Wiegen oder Kalorienzählen – konzentrieren Sie sich nur auf die Lebensmittelqualität`,
                `Lesen Sie JEDES Etikett. Zucker steckt in über 61 Namen (Dextrose, Maltodextrin, „natürliche Aromen“)`,
                `Kein „Paleofying“-Junkfood (keine Paleo-Pfannkuchen, Mandelmehlpizza, Kokoseis)`,
                `Nach 30 Tagen: strukturierte Wiedereinführung. Fügen Sie jeweils eine Lebensmittelgruppe in Abständen von 3 Tagen hinzu`
                ],
            es: [
                `Eliminación estricta de 30 días: CERO azúcar añadido, alcohol, cereales, legumbres, soja, lácteos`,
                `Comer: carnes, mariscos, huevos, verduras, frutas, grasas naturales. Esa es la lista completa`,
                `No te peses ni cuentes calorías durante 30 días: céntrate únicamente en la calidad de los alimentos`,
                `Lea CADA etiqueta. El azúcar se esconde en más de 61 nombres (dextrosa, maltodextrina, "sabores naturales")`,
                `Nada de comida chatarra "paleo-ficante" (nada de panqueques Paleo, pizza de harina de almendras, helado de coco)`,
                `A los 30 días: reintroducción estructurada. Vuelva a agregar un grupo de alimentos a la vez, en intervalos de 3 días.`
                ]
        },
        dailyTracker: [
            { key: 'no_sugar', label: { en: 'Zero added sugar in all food and drinks', ru: 'Ноль добавленного сахара', kk: 'Қосылған қант нөл', fr: 'Zéro sucre ajouté',
                de: `Kein Zuckerzusatz in allen Speisen und Getränken`,
                es: `Cero azúcar añadido en todos los alimentos y bebidas.`
            } },
            { key: 'no_alcohol', label: { en: 'No alcohol consumed', ru: 'Без алкоголя', kk: 'Алкогольсіз', fr: 'Pas d\'alcool',
                de: `Kein Alkoholkonsum`,
                es: `No se consume alcohol`
            } },
            { key: 'no_grains', label: { en: 'No grains, legumes, soy, or dairy consumed', ru: 'Без злаков, бобовых, сои, молочных', kk: 'Дәндер, бұршақ, соя, сүтсіз', fr: 'Pas de céréales, légumineuses, soja, laitages',
                de: `Kein Verzehr von Getreide, Hülsenfrüchten, Soja oder Milchprodukten`,
                es: `No se consumen cereales, legumbres, soja ni lácteos.`
            } },
            { key: 'labels_read', label: { en: 'All labels read before eating packaged food', ru: 'Все этикетки прочитаны', kk: 'Барлық жапсырмалар оқылды', fr: 'Toutes étiquettes lues',
                de: `Lesen Sie alle Etiketten, bevor Sie verpackte Lebensmittel essen`,
                es: `Lea todas las etiquetas antes de comer alimentos envasados`
            } },
            { key: 'whole_foods', label: { en: 'All meals from whole, unprocessed foods', ru: 'Вся еда из цельных продуктов', kk: 'Барлық тамақ тұтас өнімдерден', fr: 'Tous repas d\'aliments bruts',
                de: `Alle Mahlzeiten aus vollwertigen, unverarbeiteten Lebensmitteln`,
                es: `Todas las comidas provienen de alimentos integrales y no procesados.`
            } },
            { key: 'no_junk_paleo', label: { en: 'No "paleo-fied" junk food recreations', ru: 'Без "палео-версий" вредной еды', kk: 'Зиянды тағамның "палео-нұсқасы" жоқ', fr: 'Pas de junk food version paléo',
                de: `Keine „paläofizierten“ Junk-Food-Erholungen`,
                es: `Nada de recreaciones de comida chatarra "paleoficadas"`
            } },
        ],
        sampleDay: {
            en: 'Breakfast: eggs + avocado + vegetables.\nLunch: chicken salad with olive oil.\nDinner: fish/steak + sweet potato + salad.\nSnacks: fruit, nuts, veggies.',
            ru: 'Завтрак: яйца + авокадо + овощи.\nОбед: салат с курицей и оливковым маслом.\nУжин: рыба/стейк + батат + салат.\nПерекусы: фрукты, орехи, овощи.',
            kk: 'Таңғы ас: жұмыртқа + авокадо + көкөніс.\nТүскі ас: тауық салаты + зәйтүн майы.\nКешкі ас: балық/стейк + батат + салат.\nТіскебасар: жеміс, жаңғақ, көкөніс.',
            fr: 'Petit-déj : œufs + avocat + légumes.\nDéjeuner : salade poulet huile d\'olive.\nDîner : poisson/steak + patate douce + salade.\nCollations : fruits, noix, légumes.',
            de: `Frühstück: Eier + Avocado + Gemüse. 
Mittagessen: Hühnersalat mit Olivenöl. 
Abendessen: Fisch/Steak + Süßkartoffel + Salat. 
Snacks: Obst, Nüsse, Gemüse.`,
            es: `Desayuno: huevos + aguacate + verduras. 
Almuerzo: ensalada de pollo con aceite de oliva. 
Cena: pescado/filete + boniato + ensalada. 
Snacks: frutas, frutos secos, verduras.`
        },
        notFor: {
            en: ['Eating disorders', 'Pregnancy/breastfeeding', 'Chronic conditions - only with doctor'],
            ru: ['РПП', 'Беременность/ГВ', 'Хронические болезни - только с врачом'],
            kk: ['Тамақтану бұзылыстары', 'Жүктілік/емізу', 'Созылмалы аурулар - тек дәрігермен'],
            fr: ['Troubles alimentaires', 'Grossesse/allaitement', 'Maladies chroniques - uniquement avec médecin'],
            de: [
                `Essstörungen`,
                `Schwangerschaft/Stillzeit`,
                `Chronische Erkrankungen – nur mit Arzt`
                ],
            es: [
                `Trastornos alimentarios`,
                `Embarazo/lactancia`,
                `Condiciones crónicas - solo con la doctora`
                ]
        },
        suitableFor: ['reset', 'elimination', 'short_term'],
        notSuitableFor: ['eating_disorders', 'pregnant', 'chronic_conditions'],
        allowedFoods: ['meat', 'fish', 'vegetables', 'fruits', 'nuts', 'healthy_fats'],
        restrictedFoods: ['sugar', 'alcohol', 'grains', 'legumes', 'dairy', 'processed_foods'],
        macroSplit: { protein: 30, carbs: 30, fat: 40 },
        tips: {
            en: ['This is a short-term reset, not forever', 'Plan meals in advance', 'Read all labels carefully'],
            ru: ['Это короткий reset, не навсегда', 'Планируйте еду заранее', 'Читайте все этикетки внимательно'],
            kk: ['Бұл қысқа мерзімді reset, мәңгілік емес', 'Тамақты алдын ала жоспарлаңыз', 'Барлық жапсырмаларды мұқият оқыңыз'],
            fr: ['Reset court terme, pas pour toujours', 'Planifier les repas', 'Lire toutes les étiquettes'],
            de: [
                `Dies ist ein kurzfristiger Reset, nicht für immer`,
                `Planen Sie Mahlzeiten im Voraus`,
                `Lesen Sie alle Etiketten sorgfältig durch`
                ],
            es: [
                `Este es un reinicio a corto plazo, no para siempre.`,
                `Planifique las comidas con anticipación`,
                `Lea todas las etiquetas con atención`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80',
        color: '#E91E63',
        isFeatured: false,
        popularityScore: 70,
        tags: ['reset', 'elimination', 'short_term'],
    },

    // 21) Vegan Balanced (VEGAN_BALANCED)
    {
        slug: 'vegan-balanced',
        name: { en: 'Vegan (Balanced)', ru: 'Веганская (сбаланс.)', kk: 'Веган (теңгерімді)', fr: 'Végan (équilibré)',
            de: `Vegan (ausgewogen)`,
            es: `Vegana (equilibrada)`
        },
        description: { en: 'Balanced plant-based eating with focus on adequate protein, B12, and other nutrients.', ru: 'Сбалансированное растительное питание с фокусом на достаточный белок, B12 и другие нутриенты.', kk: 'Жеткілікті ақуыз, B12 және басқа қоректік заттарға назар аудара отырып теңгерімді өсімдік тамақтану.', fr: 'Alimentation végétale équilibrée : protéines, B12 et autres nutriments.',
            de: `Ausgewogene pflanzliche Ernährung mit Schwerpunkt auf ausreichend Protein, B12 und anderen Nährstoffen.`,
            es: `Alimentación equilibrada a base de plantas centrada en proteínas, vitamina B12 y otros nutrientes adecuados.`
        },
        shortDescription: { en: 'Balanced plant-based eating', ru: 'Сбалансированное растительное питание', kk: 'Теңгерімді өсімдік тамақтану', fr: 'Alimentation végétale équilibrée',
            de: `Ausgewogene Ernährung auf pflanzlicher Basis`,
            es: `Alimentación equilibrada a base de plantas`
        },
        category: 'modern',
        type: 'LIFESTYLE',
        difficulty: 'MODERATE',
        duration: 30,
        uiGroup: 'Popular',
        evidenceLevel: 'medium',
        disclaimerKey: null,
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'Protein sources: legumes, tofu/tempeh, soy, grains, nuts',
                'Monitor B12 (and often D/omega-3 as needed)',
            ],
            ru: [
                'Источники белка: бобовые, тофу/темпе, соя, крупы, орехи',
                'Следить за B12 (и часто D/омега-3 по ситуации)',
            ],
            kk: [
                'Ақуыз көздері: бұршақ, тофу/темпе, соя, жармалар, жаңғақтар',
                'B12 қадағалау (және жиі D/омега-3 қажет болған жағдайда)',
            ],
            fr: [
                'Protéines : légumineuses, tofu/tempeh, soja, céréales, noix',
                'Surveiller B12 (et souvent D/oméga-3 si besoin)',
            ],
            de: [
                `Proteinquellen: Hülsenfrüchte, Tofu/Tempeh, Soja, Getreide, Nüsse`,
                `Überwachen Sie B12 (und bei Bedarf häufig auch D/Omega-3)`
                ],
            es: [
                `Fuentes de proteínas: legumbres, tofu/tempeh, soja, cereales, frutos secos`,
                `Controle la B12 (y, a menudo, la D/omega-3 según sea necesario)`
                ]
        },
        dailyTracker: [
            { key: 'plant_protein', label: { en: 'Protein 2-3 times (plant)', ru: 'Белок 2–3 раза (растительный)', kk: 'Ақуыз 2-3 рет (өсімдік)', fr: 'Protéines 2–3× (végétal)',
                de: `Protein 2-3 mal (pflanzlich)`,
                es: `Proteína 2-3 veces (planta)`
            } },
            { key: 'veggies_4', label: { en: 'Vegetables 4+', ru: 'Овощи 4+', kk: 'Көкөністер 4+', fr: 'Légumes 4+',
                de: `Gemüse 4+`,
                es: `Verduras 4+`
            } },
            { key: 'grains_legumes', label: { en: 'Whole grains/legumes', ru: 'Цельные злаки/бобовые', kk: 'Тұтас дәндер/бұршақ', fr: 'Céréales complètes/légumineuses',
                de: `Vollkorn/Hülsenfrüchte`,
                es: `Cereales integrales/legumbres`
            } },
            { key: 'b12_check', label: { en: 'B12 (reminder check)', ru: 'B12 (чек-напоминание)', kk: 'B12 (еске салу)', fr: 'B12 (rappel)',
                de: `B12 (Mahnungskontrolle)`,
                es: `B12 (verificación de recordatorio)`
            } },
        ],
        sampleDay: {
            en: 'Breakfast: tofu scramble + toast + fruit.\nLunch: bean/chickpea salad + baked sweet potato.\nDinner: quinoa + veggies + tahini sauce.\nSnacks: soy yogurt, nuts, berries.',
            ru: 'Завтрак: тофу-скрэмбл + тост + фрукт.\nОбед: салат с фасолью/нутом + запечённый батат.\nУжин: киноа + овощи + соус тахини.\nПерекусы: соевый йогурт, орехи, ягоды.',
            kk: 'Таңғы ас: тофу-скрэмбл + тост + жеміс.\nТүскі ас: фасоль/нут салаты + пеште піскен батат.\nКешкі ас: киноа + көкөніс + тахини соусы.\nТіскебасар: соя йогурты, жаңғақ, жидек.',
            fr: 'Petit-déj : tofu brouillé + toast + fruit.\nDéjeuner : salade haricots/pois chiches + patate douce.\nDîner : quinoa + légumes + tahini.\nCollations : yaourt soja, noix, baies.',
            de: `Frühstück: Tofu-Rührei + Toast + Obst. 
Mittagessen: Bohnen-/Kichererbsensalat + gebackene Süßkartoffel. 
Abendessen: Quinoa + Gemüse + Tahinisauce. 
Snacks: Sojajoghurt, Nüsse, Beeren.`,
            es: `Desayuno: revuelto de tofu + tostadas + fruta. 
Almuerzo: ensalada de judías/garbanzos + boniato al horno. 
Cena: quinoa + verduras + salsa tahini. 
Meriendas: yogur de soja, nueces, frutos rojos.`
        },
        notFor: null,
        suitableFor: ['plant_based', 'ethical', 'environmental'],
        notSuitableFor: [],
        allowedFoods: ['legumes', 'tofu', 'tempeh', 'vegetables', 'fruits', 'whole_grains', 'nuts', 'seeds'],
        restrictedFoods: ['meat', 'fish', 'dairy', 'eggs', 'honey'],
        macroSplit: { protein: 20, carbs: 55, fat: 25 },
        tips: {
            en: ['Ensure adequate B12 intake (supplement if needed)', 'Combine protein sources', 'Include omega-3 sources like flax, chia, walnuts'],
            ru: ['Обеспечьте достаточное потребление B12 (добавки при необходимости)', 'Комбинируйте источники белка', 'Включайте источники омега-3, такие как лен, чиа, грецкие орехи'],
            kk: ['Жеткілікті B12 қабылдауын қамтамасыз етіңіз', 'Ақуыз көздерін біріктіріңіз', 'Зығыр, чиа, грек жаңғағы сияқты омега-3 көздерін қосыңыз'],
            fr: ['B12 suffisant (complément si besoin)', 'Combiner les sources de protéines', 'Oméga-3 : lin, chia, noix'],
            de: [
                `Sorgen Sie für eine ausreichende B12-Zufuhr (bei Bedarf ergänzen)`,
                `Kombinieren Sie Proteinquellen`,
                `Schließen Sie Omega-3-Quellen wie Leinsamen, Chia und Walnüsse ein`
                ],
            es: [
                `Asegurar una ingesta adecuada de B12 (complementar si es necesario)`,
                `Combina fuentes de proteínas`,
                `Incluya fuentes de omega-3 como lino, chía y nueces.`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
        color: '#4CAF50',
        isFeatured: false,
        popularityScore: 75,
        tags: ['plant_based', 'fiber', 'b12'],
    },

    // 22) Clean Eating (CLEAN_EATING)
    {
        slug: 'clean-eating',
        name: { en: 'Clean Eating (Simple)', ru: 'Clean Eating (простое)', kk: 'Clean Eating (қарапайым)', fr: 'Clean Eating (simple)',
            de: `Clean Eating (einfach)`,
            es: `Comer limpio (sencillo)`
        },
        description: { en: 'Simple approach: focus on whole foods and home cooking, minimize processed foods.', ru: 'Простой подход: фокус на простых продуктах и готовке дома, минимум переработки.', kk: 'Қарапайым тәсіл: қарапайым өнімдерге және үйде дайындауға назар аудару, өңдеуді азайту.', fr: 'Approche simple : aliments bruts, cuisine maison, limiter le transformé.',
            de: `Einfacher Ansatz: Konzentrieren Sie sich auf Vollwertkost und Hausmannskost und minimieren Sie verarbeitete Lebensmittel.`,
            es: `Enfoque simple: céntrese en alimentos integrales y cocina casera, minimice los alimentos procesados.`
        },
        shortDescription: { en: 'Whole foods, home cooking', ru: 'Простые продукты, домашняя кухня', kk: 'Қарапайым өнімдер, үй асханасы', fr: 'Aliments bruts, cuisine maison',
            de: `Vollwertkost, Hausmannskost`,
            es: `Alimentos integrales, cocina casera.`
        },
        category: 'inspired',
        type: 'HEALTH',
        difficulty: 'EASY',
        duration: 30,
        uiGroup: 'Popular',
        evidenceLevel: 'low',
        disclaimerKey: null,
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'If ingredient list has 5+ items you don\'t recognize, don\'t buy it. Simple test',
                'Cook at home 80%+ of meals. Control exactly what goes in your food',
                'Whole grains over refined: brown rice > white rice, whole wheat > white bread, oats > cereal',
                'Protein from real sources: chicken, fish, eggs, legumes, yogurt. No protein bars as meals',
                'Vegetables at every meal, fruits at every snack. Color variety = nutrient variety',
                'Limit not eliminate: occasional treats fine, just not the daily baseline',
            ],
            ru: [
                'Если в составе 5+ незнакомых ингредиентов - не покупайте',
                'Готовьте дома 80%+ приёмов пищи',
                'Цельные злаки вместо рафинированных: бурый рис > белый, цельнозерновой > белый хлеб',
                'Белок из настоящих источников: курица, рыба, яйца, бобовые, йогурт',
                'Овощи в каждом приёме, фрукты в каждом перекусе. Разнообразие цветов = питательных веществ',
                'Ограничьте, не исключайте: иногда лакомства ок, но не ежедневно',
            ],
            kk: [
                'Құрамда 5+ танымас ингредиент болса - сатып алмаңыз',
                'Тамақтың 80%+ үйде дайындаңыз',
                'Тұтас дәндер: қоңыр күріш > ақ, тұтас дәнді нан > ақ нан, сұлы > каша',
                'Ақуыз нақты көздерден: тауық, балық, жұмыртқа, бұршақ, йогурт',
                'Әр тамақта көкөніс, әр тіскебасарда жеміс. Түс әртүрлілігі = қорек әртүрлілігі',
                'Шектеңіз, жоЫмаңыз: кейде ләззат ок, бірақ күнделікті негіз емес',
            ],
            fr: [
                'Si la liste a 5+ ingrédients inconnus, n\'achetez pas',
                'Cuisiner maison 80%+ des repas',
                'Céréales complètes : riz brun > blanc, blé complet > blanc, flocons > céréales',
                'Protéines de vraies sources : poulet, poisson, œufs, légumineuses, yaourt',
                'Légumes à chaque repas, fruits à chaque collation. Variété de couleurs = variété nutritive',
                'Limiter pas éliminer : gâteries occasionnelles ok, pas quotidiennes',
            ],
            de: [
                `Wenn die Zutatenliste mehr als 5 Artikel enthält, die Sie nicht kennen, kaufen Sie sie nicht. Einfacher Test`,
                `Kochen Sie über 80 % der Mahlzeiten zu Hause. Kontrollieren Sie genau, was in Ihrem Essen enthalten ist`,
                `Vollkorn überraffiniert: brauner Reis > weißer Reis, Vollkorn > Weißbrot, Hafer > Müsli`,
                `Protein aus echten Quellen: Huhn, Fisch, Eier, Hülsenfrüchte, Joghurt. Keine Proteinriegel als Mahlzeiten`,
                `Gemüse zu jeder Mahlzeit, Obst zu jedem Snack. Farbvielfalt = Nährstoffvielfalt`,
                `Begrenzen, nicht eliminieren: Gelegentliche Leckereien sind in Ordnung, nur nicht die tägliche Grundmenge`
                ],
            es: [
                `Si la lista de ingredientes tiene más de 5 elementos que no reconoce, no la compre. prueba sencilla`,
                `Cocine en casa más del 80 % de las comidas. Controla exactamente lo que contiene tu comida`,
                `Cereales integrales sobre refinados: arroz integral > arroz blanco, trigo integral > pan blanco, avena > cereal`,
                `Proteínas de fuentes reales: pollo, pescado, huevos, legumbres, yogur. Sin barras de proteínas como comidas.`,
                `Verduras en cada comida, frutas en cada merienda. Variedad de color = variedad de nutrientes`,
                `Limitar, no eliminar: las golosinas ocasionales están bien, pero no la base diaria`
                ]
        },
        dailyTracker: [
            { key: 'home_cooked', label: { en: 'Home-cooked meals (80%+ today)', ru: 'Домашняя еда (80%+ сегодня)', kk: 'Үйде дайындалған тамақ (80%+)', fr: 'Cuisine maison (80%+ aujourd\'hui)',
                de: `Hausgemachte Mahlzeiten (80 %+ heute)`,
                es: `Comidas caseras (más del 80 % en la actualidad)`
            } },
            { key: 'whole_grains', label: { en: 'Whole grains chosen over refined', ru: 'Цельные злаки вместо рафинированных', kk: 'Тұтас дәндер таңдалды', fr: 'Céréales complètes choisies',
                de: `Vollkorngetreide statt raffiniertem Getreide`,
                es: `Cereales integrales elegidos en lugar de refinados`
            } },
            { key: 'real_protein', label: { en: 'Real protein sources at meals (not bars/shakes)', ru: 'Настоящие источники белка (не батончики)', kk: 'Нақты ақуыз көздері (батончиктер емес)', fr: 'Vraies sources de protéines (pas barres/shakes)',
                de: `Echte Proteinquellen zu den Mahlzeiten (keine Riegel/Shakes)`,
                es: `Fuentes reales de proteínas en las comidas (no barras ni batidos)`
            } },
            { key: 'veggies_every', label: { en: 'Vegetables at every meal', ru: 'Овощи в каждом приёме', kk: 'Әр тамақта көкөніс', fr: 'Légumes à chaque repas',
                de: `Gemüse zu jeder Mahlzeit`,
                es: `Verduras en cada comida`
            } },
            { key: 'label_check', label: { en: 'Short ingredient list on packaged foods (<5 items)', ru: 'Короткий состав на упаковке (<5 пунктов)', kk: 'Қаптамада қысқа құрам (<5)', fr: 'Liste courte sur emballage (<5 items)',
                de: `Kurze Zutatenliste für verpackte Lebensmittel (<5 Artikel)`,
                es: `Lista corta de ingredientes en alimentos envasados ​​(<5 artículos)`
            } },
            { key: 'no_ultra_processed', label: { en: 'No ultra-processed foods (fast food, packaged snacks)', ru: 'Без ультра-обработанных (фастфуд, снеки)', kk: 'Ультра-өңделгенсіз (фастфуд, снектер)', fr: 'Pas d\'ultra-transformés (fast-food, snacks)',
                de: `Keine hochverarbeiteten Lebensmittel (Fast Food, abgepackte Snacks)`,
                es: `No alimentos ultraprocesados ​​(comida rápida, snacks envasados)`
            } },
        ],
        sampleDay: {
            en: 'Breakfast: oatmeal + fruit + nuts.\nLunch: soup + salad + whole-grain bread.\nDinner: chicken/fish + grains + salad.\nSnacks: fruit, yogurt, nuts.',
            ru: 'Завтрак: овсянка + фрукты + орехи.\nОбед: суп + салат + цельнозерновой хлеб.\nУжин: курица/рыба + крупа + салат.\nПерекусы: фрукты, йогурт, орехи.',
            kk: 'Таңғы ас: сұлы ботқасы + жеміс + жаңғақ.\nТүскі ас: сорпа + салат + тұтас дәнді нан.\nКешкі ас: тауық/балық + жарма + салат.\nТіскебасар: жеміс, йогурт, жаңғақ.',
            fr: 'Petit-déj : flocons d\'avoine + fruit + noix.\nDéjeuner : soupe + salade + pain complet.\nDîner : poulet/poisson + céréales + salade.\nCollations : fruit, yaourt, noix.',
            de: `Frühstück: Haferflocken + Obst + Nüsse. 
Mittagessen: Suppe + Salat + Vollkornbrot. 
Abendessen: Huhn/Fisch + Getreide + Salat. 
Snacks: Obst, Joghurt, Nüsse.`,
            es: `Desayuno: avena + fruta + frutos secos. 
Almuerzo: sopa + ensalada + pan integral. 
Cena: pollo/pescado + cereales + ensalada. 
Snacks: fruta, yogur, frutos secos.`
        },
        notFor: null,
        suitableFor: ['beginners', 'simple', 'sustainable'],
        notSuitableFor: [],
        allowedFoods: ['vegetables', 'fruits', 'whole_grains', 'lean_protein', 'dairy', 'nuts'],
        restrictedFoods: ['processed_foods', 'sugary_drinks', 'fast_food'],
        macroSplit: { protein: 25, carbs: 45, fat: 30 },
        tips: {
            en: ['Start by cooking one more meal at home per day', 'Read ingredient lists - fewer is often better'],
            ru: ['Начните с одного дополнительного домашнего приёма пищи в день', 'Читайте состав - чем короче, тем лучше'],
            kk: ['Күніне бір қосымша үй тамағынан бастаңыз', 'Құрамын оқыңыз - қысқа болған сайын жақсы'],
            fr: ['Cuisiner un repas de plus par jour', 'Lire les ingrédients - moins c\'est souvent mieux'],
            de: [
                `Beginnen Sie damit, täglich eine weitere Mahlzeit zu Hause zuzubereiten`,
                `Lesen Sie die Zutatenlisten – weniger ist oft besser`
                ],
            es: [
                `Empieza cocinando una comida más en casa al día.`,
                `Lea las listas de ingredientes: a menudo, menos es mejor`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80',
        color: '#8BC34A',
        isFeatured: false,
        popularityScore: 72,
        tags: ['simple', 'home_cooking'],
    },

    // 23) IIFYM / Flexible Macros (IIFYM)
    {
        slug: 'iifym',
        name: { en: 'Flexible Dieting (IIFYM)', ru: 'Гибкая диета (IIFYM)', kk: 'Икемді диета (IIFYM)', fr: 'Diète flexible (IIFYM)',
            de: `Flexible Diät (IIFYM)`,
            es: `Dieta flexible (IIFYM)`
        },
        description: { en: 'If It Fits Your Macros - flexible approach focusing on hitting daily calorie and macro targets.', ru: 'Гибкий подход с фокусом на достижение дневных целей по калориям и БЖУ.', kk: 'Күнделікті калория мен БЖУ мақсаттарына жетуге бағытталған икемді тәсіл.', fr: 'Si ça rentre dans tes macros - objectifs calories et macros, choix flexibles.',
            de: `Wenn es zu Ihren Makros passt – flexibler Ansatz, der sich auf das Erreichen der täglichen Kalorien- und Makroziele konzentriert.`,
            es: `Si se adapta a sus macros: enfoque flexible que se centra en alcanzar objetivos macro y calóricos diarios.`
        },
        shortDescription: { en: 'Hit your macros, flexible food choices', ru: 'Достигайте БЖУ, гибкий выбор еды', kk: 'БЖУ-ға жетіңіз, икемді тағам таңдауы', fr: 'Atteindre ses macros, choix alimentaires flexibles',
            de: `Treffen Sie Ihre Makros, flexible Lebensmittelauswahl`,
            es: `Aprovecha tus macros, opciones de alimentos flexibles`
        },
        category: 'inspired',
        type: 'SPORTS',
        difficulty: 'MODERATE',
        duration: 30,
        uiGroup: 'Performance',
        evidenceLevel: 'low',
        disclaimerKey: null,
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'Calculate TDEE, set target based on goal (deficit/surplus/maintenance)',
                'Set protein first: 1.6-2.2g/kg athletes, 1.2-1.6g/kg general fitness. Non-negotiable',
                'Set fat minimum: 20-30% total calories (hormones, cell function)',
                'Fill remaining calories with carbs (fuel training performance)',
                'Track everything in EatSense: weigh food, scan barcodes, log every bite',
                '80/20 rule: 80% whole foods, 20% whatever fits your macros',
            ],
            ru: [
                'Рассчитайте TDEE, цель по задаче (дефицит/профицит/поддержка)',
                'Белок в первую очередь: 1.6-2.2г/кг спортсмены, 1.2-1.6г/кг фитнес',
                'Минимум жиров: 20-30% калорий (гормоны, клетки)',
                'Оставшиеся калории заполните углеводами (топливо для тренировок)',
                'Трекайте всё в EatSense: взвешивайте еду, сканируйте штрихкоды, записывайте всё',
                'Правило 80/20: 80% цельных продуктов, 20% что угодно',
            ],
            kk: [
                'TDEE есептеңіз, мақсат бойынша нысана белгілеңіз',
                'Ақуыз бірінші: 1.6-2.2г/кг спортшылар, 1.2-1.6г/кг фитнес',
                'Май минимумы: калорияның 20-30% (гормондар, жасушалар)',
                'Қалған калорияны көмірсулармен толтырыңыз (жаттығу отыны)',
                'EatSense-те бәрін бақылаңыз: тағамды өлшеңіз, штрихкодтарды сканерлеңіз',
                '80/20 ережесі: 80% тұтас өнімдер, 20% қалағаныңыз',
            ],
            fr: [
                'Calculer TDEE, fixer cible selon objectif (déficit/surplus/maintien)',
                'Protéines d\'abord : 1.6-2.2g/kg athlètes, 1.2-1.6g/kg fitness. Non négociable',
                'Minimum graisses : 20-30% calories (hormones, cellules)',
                'Remplir les calories restantes avec des glucides (carburant)',
                'Tout tracker dans EatSense : peser, scanner, noter chaque bouchée',
                'Règle 80/20 : 80% aliments complets, 20% au choix',
            ],
            de: [
                `Berechnen Sie den TDEE und legen Sie das Ziel basierend auf dem Ziel fest (Defizit/Überschuss/Erhaltung).`,
                `Stellen Sie zuerst das Protein ein: 1,6–2,2 g/kg Sportler, 1,2–1,6 g/kg allgemeine Fitness. Nicht verhandelbar`,
                `Fettminimum festlegen: 20-30 % Gesamtkalorien (Hormone, Zellfunktion)`,
                `Restliche Kalorien mit Kohlenhydraten auffüllen (Trainingsleistung steigern)`,
                `Verfolgen Sie alles in EatSense: Wiegen Sie Lebensmittel, scannen Sie Barcodes, protokollieren Sie jeden Bissen`,
                `80/20-Regel: 80 % Vollwertkost, 20 % alles, was zu Ihren Makros passt`
                ],
            es: [
                `Calcular TDEE, establecer objetivo basado en la meta (déficit/superávit/mantenimiento)`,
                `Establezca primero las proteínas: 1,6-2,2 g/kg para atletas, 1,2-1,6 g/kg para condición física general. Innegociable`,
                `Establecer un mínimo de grasa: 20-30% de calorías totales (hormonas, función celular)`,
                `Llene las calorías restantes con carbohidratos (rendimiento de entrenamiento de combustible)`,
                `Realice un seguimiento de todo en EatSense: pese los alimentos, escanee códigos de barras, registre cada bocado`,
                `Regla 80/20: 80% alimentos integrales, 20% lo que se ajuste a tus macros`
                ]
        },
        dailyTracker: [
            { key: 'macros_hit', label: { en: 'All macros hit within 5g of target', ru: 'Все БЖУ в пределах 5г от цели', kk: 'Барлық БЖУ мақсаттың 5г ішінде', fr: 'Macros atteintes à 5g près',
                de: `Alle Makros treffen innerhalb von 5 g vom Ziel`,
                es: `Todas las macros alcanzan dentro de los 5 g del objetivo.`
            } },
            { key: 'food_weighed', label: { en: 'Every food weighed and logged accurately', ru: 'Вся еда взвешена и записана', kk: 'Барлық тағам өлшеніп жазылды', fr: 'Tout aliment pesé et noté',
                de: `Jedes Lebensmittel wurde genau gewogen und protokolliert`,
                es: `Cada alimento pesado y registrado con precisión.`
            } },
            { key: 'eighty_twenty', label: { en: '80/20 rule followed (majority whole foods)', ru: 'Правило 80/20 (большинство цельных)', kk: '80/20 ережесі (көпшілігі тұтас)', fr: 'Règle 80/20 (majorité aliments complets)',
                de: `80/20-Regel befolgt (mehrheitlich Vollwertkost)`,
                es: `Se sigue la regla 80/20 (mayoría de alimentos integrales)`
            } },
            { key: 'protein_target', label: { en: 'Protein target met (highest priority)', ru: 'Цель белка достигнута (главный приоритет)', kk: 'Ақуыз мақсатына жетті (ең маңызды)', fr: 'Objectif protéines atteint (priorité)',
                de: `Proteinziel erreicht (höchste Priorität)`,
                es: `Objetivo de proteínas alcanzado (máxima prioridad)`
            } },
            { key: 'training_perf', label: { en: 'Training performance maintained/improved', ru: 'Тренировочная производительность сохранена', kk: 'Жаттығу өнімділігі сақталды', fr: 'Performance d\'entraînement maintenue',
                de: `Trainingsleistung gehalten/verbessert`,
                es: `Rendimiento de entrenamiento mantenido/mejorado`
            } },
            { key: 'weekly_tracking', label: { en: 'Weekly body weight and measurements tracked', ru: 'Еженедельное взвешивание и замеры', kk: 'Апталық салмақ және өлшемдер', fr: 'Poids et mesures hebdomadaires',
                de: `Wöchentliche Aufzeichnung von Körpergewicht und Körpermaßen`,
                es: `Seguimiento semanal del peso corporal y las medidas`
            } },
        ],
        sampleDay: {
            en: 'Breakfast: oats + berries + protein.\nLunch: rice + chicken + vegetables.\nDinner: whole-wheat pasta + tomato sauce + salad.\nSnacks: cottage cheese/yogurt, fruit, small chocolate.',
            ru: 'Завтрак: овсянка + ягоды + протеин.\nОбед: рис + курица + овощи.\nУжин: паста из твёрдых сортов + томатный соус + салат.\nПерекусы: творог/йогурт, фрукты, немного шоколада.',
            kk: 'Таңғы ас: сұлы + жидек + протеин.\nТүскі ас: күріш + тауық + көкөніс.\nКешкі ас: қатты бидай пастасы + томат соусы + салат.\nТіскебасар: сүзбе/йогурт, жеміс, аздап шоколад.',
            fr: 'Petit-déj : flocons + baies + protéines.\nDéjeuner : riz + poulet + légumes.\nDîner : pâtes complètes + sauce tomate + salade.\nCollations : fromage blanc/yaourt, fruit, un peu de chocolat.',
            de: `Frühstück: Hafer + Beeren + Protein. 
Mittagessen: Reis + Huhn + Gemüse. 
Abendessen: Vollkornnudeln + Tomatensauce + Salat. 
Snacks: Hüttenkäse/Joghurt, Obst, kleine Schokolade.`,
            es: `Desayuno: avena + frutos rojos + proteínas. 
Almuerzo: arroz + pollo + verduras. 
Cena: pasta integral + salsa de tomate + ensalada. 
Meriendas: requesón/yogur, fruta, chocolate pequeño.`
        },
        notFor: null,
        suitableFor: ['athletes', 'trackers', 'flexible_dieters'],
        notSuitableFor: [],
        allowedFoods: ['any_within_macros'],
        restrictedFoods: [],
        macroSplit: { protein: 30, carbs: 40, fat: 30 },
        tips: {
            en: ['Use a tracking app', 'Prioritize protein first', 'Don\'t forget vegetables even if they fit macros'],
            ru: ['Используйте приложение для трекинга', 'Приоритет белку', 'Не забывайте про овощи'],
            kk: ['Бақылау қосымшасын пайдаланыңыз', 'Ақуызға басымдық беріңіз', 'Көкөністерді ұмытпаңыз'],
            fr: ['Utiliser une app de suivi', 'Priorité aux protéines', 'Ne pas oublier les légumes'],
            de: [
                `Verwenden Sie eine Tracking-App`,
                `Priorisieren Sie zuerst Protein`,
                `Vergessen Sie Gemüse nicht, auch wenn es zu den Makros passt`
                ],
            es: [
                `Utilice una aplicación de seguimiento`,
                `Prioriza las proteínas primero`,
                `No te olvides de las verduras aunque encajen en macros`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
        color: '#3F51B5',
        isFeatured: false,
        popularityScore: 68,
        tags: ['macros', 'tracking'],
    },

    // 24) Roman Commoner (ROMAN_COMMONER_INSPIRED)
    {
        slug: 'roman-commoner',
        name: { en: 'Roman Commoner (Inspired)', ru: 'Римлянин (простой, вдохновл.)', kk: 'Римдік (қарапайым, шабыт)', fr: 'Romain modeste (inspiré)',
            de: `Römischer Bürger (inspiriert)`,
            es: `Plebeya romana (inspirada)`
        },
        description: { en: 'Inspired by the diet of common Roman citizens. Simple grains, legumes, vegetables with occasional fish or cheese.', ru: 'Вдохновлено питанием обычных римских граждан. Простые злаки, бобовые, овощи с редкой рыбой или сыром.', kk: 'Қарапайым римдік азаматтардың тамақтануынан шабыттанған. Қарапайым дәндер, бұршақ, көкөністер, сирек балық немесе ірімшік.', fr: 'Inspiré du régime des citoyens romains. Céréales, légumineuses, légumes, un peu poisson ou fromage.',
            de: `Inspiriert von der Ernährung der einfachen römischen Bürger. Einfaches Getreide, Hülsenfrüchte, Gemüse mit gelegentlichem Fisch oder Käse.`,
            es: `Inspirado en la dieta de los ciudadanos romanos comunes. Cereales simples, legumbres, verduras y ocasionalmente pescado o queso.`
        },
        shortDescription: { en: 'Simple Roman-inspired eating', ru: 'Простое питание в стиле Рима', kk: 'Римдік стильдегі қарапайым тамақтану', fr: 'Alimentation simple style romain',
            de: `Einfaches römisch inspiriertes Essen`,
            es: `Comida sencilla de inspiración romana`
        },
        category: 'historical',
        type: 'LIFESTYLE',
        difficulty: 'EASY',
        duration: 14,
        uiGroup: 'Historical',
        evidenceLevel: 'low',
        disclaimerKey: 'DISCLAIMER_HISTORICAL',
        streakThreshold: 0.6,
        howItWorks: {
            en: [
                'Legumes 1 time daily',
                'Vegetables 3+',
                'Whole grains',
            ],
            ru: [
                'Бобовые 1 раз в день',
                'Овощи 3+',
                'Цельные злаки',
            ],
            kk: [
                'Бұршақ күніне 1 рет',
                'Көкөністер 3+',
                'Тұтас дәндер',
            ],
            fr: [
                'Légumineuses 1×/jour',
                'Légumes 3+',
                'Céréales complètes',
            ],
            de: [
                `1x täglich Hülsenfrüchte`,
                `Gemüse 3+`,
                `Vollkornprodukte`
                ],
            es: [
                `Legumbres 1 vez al día`,
                `Verduras 3+`,
                `cereales integrales`
                ]
        },
        dailyTracker: [
            { key: 'legumes_1', label: { en: 'Legumes 1 time', ru: 'Бобовые 1 раз', kk: 'Бұршақ 1 рет', fr: 'Légumineuses 1×',
                de: `Hülsenfrüchte 1 Mal`,
                es: `Legumbres 1 vez`
            } },
            { key: 'veggies_3', label: { en: 'Vegetables 3+', ru: 'Овощи 3+', kk: 'Көкөністер 3+', fr: 'Légumes 3+',
                de: `Gemüse 3+`,
                es: `Verduras 3+`
            } },
            { key: 'whole_grains', label: { en: 'Whole grains', ru: 'Цельные злаки', kk: 'Тұтас дәндер', fr: 'Céréales complètes',
                de: `Vollkornprodukte`,
                es: `cereales integrales`
            } },
        ],
        sampleDay: {
            en: 'Breakfast: bread/porridge + fruit.\nLunch: bread + legumes/fish leftovers + vegetables.\nDinner: porridge/bread + vegetables + some cheese.',
            ru: 'Завтрак: хлеб/каша + фрукт.\nОбед: хлеб + бобовые/остатки рыбы + овощи.\nУжин: каша/хлеб + овощи + немного сыра.',
            kk: 'Таңғы ас: нан/ботқа + жеміс.\nТүскі ас: нан + бұршақ/балық + көкөніс.\nКешкі ас: ботқа/нан + көкөніс + аздап ірімшік.',
            fr: 'Petit-déj : pain/bouillie + fruit.\nDéjeuner : pain + légumineuses/restes poisson + légumes.\nDîner : bouillie/pain + légumes + un peu fromage.',
            de: `Frühstück: Brot/Porridge + Obst. 
Mittagessen: Brot + Hülsenfrüchte/Fischreste + Gemüse. 
Abendessen: Brei/Brot + Gemüse + etwas Käse.`,
            es: `Desayuno: pan/papilla + fruta. 
Almuerzo: pan + legumbres/restos de pescado + verduras. 
Cena: gachas/pan + verduras + un poco de queso.`
        },
        notFor: null,
        suitableFor: ['history_lovers', 'simple_eating', 'fun'],
        notSuitableFor: [],
        allowedFoods: ['grains', 'legumes', 'vegetables', 'cheese', 'fish', 'bread'],
        restrictedFoods: ['processed_foods', 'excessive_sugar'],
        macroSplit: { protein: 15, carbs: 60, fat: 25 },
        tips: {
            en: ['This is a historical approximation for fun', 'Not a medical prescription'],
            ru: ['Это историческое приближение для интереса', 'Не медицинское назначение'],
            kk: ['Бұл қызықты тарихи жуықтау', 'Медициналық тағайындау емес'],
            fr: ['Approximation historique pour le plaisir', 'Pas une prescription médicale'],
            de: [
                `Dies ist eine historische Annäherung zum Spaß`,
                `Kein ärztliches Rezept`
                ],
            es: [
                `Esta es una aproximación histórica por diversión.`,
                `No es una prescripción médica`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80',
        color: '#A1887F',
        isFeatured: false,
        popularityScore: 35,
        tags: ['history', 'simple'],
    },

    // 25) Roman Elite (ROMAN_ELITE_INSPIRED)
    {
        slug: 'roman-elite',
        name: { en: 'Roman Elite (Inspired)', ru: 'Римлянин (богатый, вдохновл.)', kk: 'Римдік (бай, шабыт)', fr: 'Romain elite (inspiré)',
            de: `Römische Elite (inspiriert)`,
            es: `Elite romana (inspirada)`
        },
        description: { en: 'Inspired by wealthier Roman diets. More variety with fish, meat, various appetizers, and fruits.', ru: 'Вдохновлено питанием богатых римлян. Больше разнообразия: рыба, мясо, закуски, фрукты.', kk: 'Бай римдіктердің тамақтануынан шабыттанған. Балық, ет, тәбет ашары және жемістермен көп түрлілік.', fr: 'Inspiré des régimes romains aisés. Poisson, viande, entrées, fruits.',
            de: `Inspiriert von wohlhabenderen römischen Diäten. Mehr Abwechslung mit Fisch, Fleisch, verschiedenen Vorspeisen und Früchten.`,
            es: `Inspirado en las dietas romanas más ricas. Más variedad con pescados, carnes, aperitivos varios y frutas.`
        },
        shortDescription: { en: 'Wealthy Roman-inspired variety', ru: 'Разнообразие в стиле богатых римлян', kk: 'Бай римдіктер стиліндегі түрлілік', fr: 'Variété style romain aisé',
            de: `Reichhaltige römisch inspirierte Sorte`,
            es: `Variedad rica de inspiración romana`
        },
        category: 'historical',
        type: 'LIFESTYLE',
        difficulty: 'MODERATE',
        duration: 14,
        uiGroup: 'Historical',
        evidenceLevel: 'low',
        disclaimerKey: 'DISCLAIMER_HISTORICAL',
        streakThreshold: 0.6,
        howItWorks: {
            en: [
                'Vegetables 3+',
                'Protein 2-3',
                'Sweets limited',
            ],
            ru: [
                'Овощи 3+',
                'Белок 2–3',
                'Сладкое ограничено',
            ],
            kk: [
                'Көкөністер 3+',
                'Ақуыз 2-3',
                'Тәтті шектелген',
            ],
            fr: [
                'Légumes 3+',
                'Protéines 2–3',
                'Sucreries limitées',
            ],
            de: [
                `Gemüse 3+`,
                `Protein 2-3`,
                `Süßigkeiten begrenzt`
                ],
            es: [
                `Verduras 3+`,
                `Proteína 2-3`,
                `Dulces limitadas`
                ]
        },
        dailyTracker: [
            { key: 'veggies_3', label: { en: 'Vegetables 3+', ru: 'Овощи 3+', kk: 'Көкөністер 3+', fr: 'Légumes 3+',
                de: `Gemüse 3+`,
                es: `Verduras 3+`
            } },
            { key: 'protein_3', label: { en: 'Protein 2-3', ru: 'Белок 2–3', kk: 'Ақуыз 2-3', fr: 'Protéines 2–3',
                de: `Protein 2-3`,
                es: `Proteína 2-3`
            } },
            { key: 'sweets_limited', label: { en: 'Sweets limited', ru: 'Сладкое ограничено', kk: 'Тәтті шектелген', fr: 'Sucreries limitées',
                de: `Süßigkeiten begrenzt`,
                es: `Dulces limitadas`
            } },
        ],
        sampleDay: {
            en: 'Breakfast: eggs/cheese + fruit.\nLunch: fish/poultry + vegetables + bread.\nDinner: several small dishes + fruit/nuts.',
            ru: 'Завтрак: яйца/сыр + фрукты.\nОбед: рыба/птица + овощи + хлеб.\nУжин: несколько небольших блюд + фрукты/орехи.',
            kk: 'Таңғы ас: жұмыртқа/ірімшік + жеміс.\nТүскі ас: балық/құс еті + көкөніс + нан.\nКешкі ас: бірнеше шағын тағам + жеміс/жаңғақ.',
            fr: 'Petit-déj : œufs/fromage + fruit.\nDéjeuner : poisson/volaille + légumes + pain.\nDîner : plusieurs petits plats + fruits/noix.',
            de: `Frühstück: Eier/Käse + Obst. 
Mittagessen: Fisch/Geflügel + Gemüse + Brot. 
Abendessen: mehrere kleine Gerichte + Obst/Nüsse.`,
            es: `Desayuno: huevos/queso + fruta. 
Almuerzo: pescado/aves + verduras + pan. 
Cena: varios platos pequeños + fruta/nueces.`
        },
        notFor: null,
        suitableFor: ['history_lovers', 'variety', 'fun'],
        notSuitableFor: [],
        allowedFoods: ['fish', 'poultry', 'meat', 'vegetables', 'fruits', 'cheese', 'eggs', 'nuts'],
        restrictedFoods: ['processed_foods', 'excessive_sweets'],
        macroSplit: { protein: 25, carbs: 45, fat: 30 },
        tips: {
            en: ['Enjoy variety like wealthy Romans did', 'Include multiple small dishes'],
            ru: ['Наслаждайтесь разнообразием, как богатые римляне', 'Включайте несколько небольших блюд'],
            kk: ['Бай римдіктер сияқты түрлілікті қызықтаңыз', 'Бірнеше шағын тағамды қосыңыз'],
            fr: ['Variété comme les Romains aisés', 'Plusieurs petits plats'],
            de: [
                `Genießen Sie Abwechslung wie die wohlhabenden Römer`,
                `Fügen Sie mehrere kleine Gerichte hinzu`
                ],
            es: [
                `Disfrute de la variedad como lo hacían los romanos ricos`,
                `Incluye varios platos pequeños`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
        color: '#D4AF37',
        isFeatured: false,
        popularityScore: 32,
        tags: ['history', 'feast'],
    },

    // 26) Napoleon - Soldier Style (NAPOLEON_INSPIRED)
    {
        slug: 'napoleon-soldier',
        name: { en: 'Napoleon (Soldier-Style, Inspired)', ru: 'Наполеон (солдатская, вдохновл.)', kk: 'Наполеон (сарбазша, шабыт)', fr: 'Napoléon (style soldat, inspiré)',
            de: `Napoleon (Soldatenstil, inspiriert)`,
            es: `Napoleón (estilo soldado, inspirada)`
        },
        description: { en: 'Inspired by Napoleonic era soldier rations. Hearty soups, bread, and simple protein.', ru: 'Вдохновлено рационом солдат эпохи Наполеона. Сытные супы, хлеб и простой белок.', kk: 'Наполеон дәуіріндегі сарбаз рационынан шабыттанған. Тоймалы сорпалар, нан және қарапайым ақуыз.', fr: 'Inspiré des rations soldats napoléoniens. Soupes, pain, protéines simples.',
            de: `Inspiriert von den Soldatenrationen der napoleonischen Ära. Herzhafte Suppen, Brot und einfaches Protein.`,
            es: `Inspirado en las raciones de soldados de la época napoleónica. Sopas abundantes, pan y proteínas simples.`
        },
        shortDescription: { en: 'Simple soldier-style eating', ru: 'Простое солдатское питание', kk: 'Қарапайым сарбаздық тамақтану', fr: 'Alimentation simple style soldat',
            de: `Einfaches Essen im Soldatenstil`,
            es: `Comer sencillo al estilo soldado`
        },
        category: 'historical',
        type: 'LIFESTYLE',
        difficulty: 'EASY',
        duration: 14,
        uiGroup: 'Historical',
        evidenceLevel: 'low',
        disclaimerKey: 'DISCLAIMER_HISTORICAL',
        streakThreshold: 0.6,
        howItWorks: {
            en: [
                'Soup/warm food 1 time',
                'Vegetables 2+',
                'Water',
            ],
            ru: [
                'Суп/тёплая еда 1 раз',
                'Овощи 2+',
                'Вода',
            ],
            kk: [
                'Сорпа/жылы тағам 1 рет',
                'Көкөністер 2+',
                'Су',
            ],
            fr: [
                'Soupe/plat chaud 1×',
                'Légumes 2+',
                'Eau',
            ],
            de: [
                `Suppe/warmes Essen 1 Mal`,
                `Gemüse 2+`,
                `Wasser`
                ],
            es: [
                `Sopa/comida caliente 1 vez`,
                `Verduras 2+`,
                `Agua`
                ]
        },
        dailyTracker: [
            { key: 'soup_warm', label: { en: 'Soup/warm food 1 time', ru: 'Суп/тёплая еда 1 раз', kk: 'Сорпа/жылы тағам 1 рет', fr: 'Soupe/plat chaud 1×',
                de: `Suppe/warmes Essen 1 Mal`,
                es: `Sopa/comida caliente 1 vez`
            } },
            { key: 'veggies_2', label: { en: 'Vegetables 2+', ru: 'Овощи 2+', kk: 'Көкөністер 2+', fr: 'Légumes 2+',
                de: `Gemüse 2+`,
                es: `Verduras 2+`
            } },
            { key: 'water', label: { en: 'Water', ru: 'Вода', kk: 'Су', fr: 'Eau',
                de: `Wasser`,
                es: `Agua`
            } },
        ],
        sampleDay: {
            en: 'Breakfast: hot soup + bread.\nLunch: eggs/omelet + meat + vegetables.\nDinner: soup + small protein + bread.',
            ru: 'Завтрак: горячий суп + хлеб.\nОбед: яйца/омлет + кусок мяса + овощи.\nУжин: суп + небольшой белок + хлеб.',
            kk: 'Таңғы ас: ыстық сорпа + нан.\nТүскі ас: жұмыртқа/омлет + ет + көкөніс.\nКешкі ас: сорпа + аздап ақуыз + нан.',
            fr: 'Petit-déj : soupe chaude + pain.\nDéjeuner : œufs/omelette + viande + légumes.\nDîner : soupe + un peu protéines + pain.',
            de: `Frühstück: heiße Suppe + Brot. 
Mittagessen: Eier/Omelett + Fleisch + Gemüse. 
Abendessen: Suppe + kleines Protein + Brot.`,
            es: `Desayuno: sopa caliente + pan. 
Almuerzo: huevos/tortilla + carne + verduras. 
Cena: sopa + proteína pequeña + pan.`
        },
        notFor: null,
        suitableFor: ['history_lovers', 'simple_eating', 'fun'],
        notSuitableFor: [],
        allowedFoods: ['soup', 'bread', 'meat', 'eggs', 'vegetables'],
        restrictedFoods: ['processed_foods', 'excessive_sweets'],
        macroSplit: { protein: 20, carbs: 55, fat: 25 },
        tips: {
            en: ['Focus on warm, filling meals', 'This is a historical approximation for fun'],
            ru: ['Фокус на тёплой, сытной еде', 'Это историческое приближение для интереса'],
            kk: ['Жылы, тоймалы тамаққа назар аударыңыз', 'Бұл қызықты тарихи жуықтау'],
            fr: ['Repas chauds et nourrissants', 'Approximation historique pour le plaisir'],
            de: [
                `Konzentrieren Sie sich auf warme, sättigende Mahlzeiten`,
                `Dies ist eine historische Annäherung zum Spaß`
                ],
            es: [
                `Concéntrese en comidas calientes y abundantes`,
                `Esta es una aproximación histórica por diversión.`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=80',
        color: '#5D4037',
        isFeatured: false,
        popularityScore: 28,
        tags: ['history', 'simple'],
    },

    // 27) On-Set Day (PUBLIC_FIGURE_ONSET_INSPIRED)
    {
        slug: 'on-set-day',
        name: { en: 'On-Set Day (Inspired)', ru: 'Съёмочный день (вдохновл.)', kk: 'Түсірілім күні (шабыт)', fr: 'Journée plateau (inspiré)',
            de: `Tag am Set (inspiriert)`,
            es: `Día de rodaje (inspirado)`
        },
        description: { en: 'A public-figure-inspired template without naming individuals. Structured eating focused on protein and vegetables.', ru: 'Шаблон «в стиле публичных людей» без привязки к конкретным именам. Структурированное питание с фокусом на белок и овощи.', kk: 'Белгілі адамдар стиліндегі үлгі, нақты есімдерсіз. Ақуыз бен көкөністерге бағытталған құрылымды тамақтану.', fr: 'Modèle inspiré des personnalités publiques. Alimentation structurée : protéines et légumes.',
            de: `Eine von Persönlichkeiten des öffentlichen Lebens inspirierte Vorlage ohne Namensnennung einzelner Personen. Strukturierte Ernährung mit Schwerpunkt auf Eiweiß und Gemüse.`,
            es: `Una plantilla inspirada en figuras públicas sin nombrar personas. Alimentación estructurada centrada en proteínas y verduras.`
        },
        shortDescription: { en: 'Structured day with protein focus', ru: 'Структурированный день с фокусом на белок', kk: 'Ақуызға бағытталған құрылымды күн', fr: 'Journée structurée, focus protéines',
            de: `Strukturierter Tag mit Proteinfokus`,
            es: `Día estructurado con enfoque en proteínas.`
        },
        category: 'inspired',
        type: 'LIFESTYLE',
        difficulty: 'EASY',
        duration: 30,
        uiGroup: 'Popular',
        evidenceLevel: 'low',
        disclaimerKey: 'DISCLAIMER_PUBLIC_FIGURE',
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'Protein 3 times',
                'Vegetables 4+',
                'Snacks without sugar',
            ],
            ru: [
                'Белок 3 раза',
                'Овощи 4+',
                'Перекусы без сахара',
            ],
            kk: [
                'Ақуыз 3 рет',
                'Көкөністер 4+',
                'Қантсыз тіскебасар',
            ],
            fr: [
                'Protéines 3×',
                'Légumes 4+',
                'Collations sans sucre',
            ],
            de: [
                `Protein 3-mal`,
                `Gemüse 4+`,
                `Snacks ohne Zucker`
                ],
            es: [
                `Proteína 3 veces`,
                `Verduras 4+`,
                `Bocadillos sin azúcar`
                ]
        },
        dailyTracker: [
            { key: 'protein_3', label: { en: 'Protein 3 times', ru: 'Белок 3 раза', kk: 'Ақуыз 3 рет', fr: 'Protéines 3×',
                de: `Protein 3-mal`,
                es: `Proteína 3 veces`
            } },
            { key: 'veggies_4', label: { en: 'Vegetables 4+', ru: 'Овощи 4+', kk: 'Көкөністер 4+', fr: 'Légumes 4+',
                de: `Gemüse 4+`,
                es: `Verduras 4+`
            } },
            { key: 'snacks_no_sugar', label: { en: 'Snacks without sugar', ru: 'Перекусы без сахара', kk: 'Қантсыз тіскебасар', fr: 'Collations sans sucre',
                de: `Snacks ohne Zucker`,
                es: `Bocadillos sin azúcar`
            } },
        ],
        sampleDay: {
            en: 'Breakfast: eggs + veggies, sometimes oats.\nLunch: chicken/fish + quinoa/rice + lots of vegetables.\nDinner: fish/turkey + salad.\nSnacks: yogurt/protein, nuts, fruit.',
            ru: 'Завтрак: омлет/яйца + овощи, иногда овсянка.\nОбед: курица/рыба + киноа/рис + большая порция овощей.\nУжин: рыба/индейка + салат.\nПерекусы: йогурт/протеин, орехи, фрукты.',
            kk: 'Таңғы ас: жұмыртқа + көкөніс, кейде сұлы.\nТүскі ас: тауық/балық + киноа/күріш + көп көкөніс.\nКешкі ас: балық/күркетауық + салат.\nТіскебасар: йогурт/протеин, жаңғақ, жеміс.',
            fr: 'Petit-déj : œufs + légumes, parfois flocons.\nDéjeuner : poulet/poisson + quinoa/riz + légumes.\nDîner : poisson/dinde + salade.\nCollations : yaourt/protéines, noix, fruit.',
            de: `Frühstück: Eier + Gemüse, manchmal Hafer. 
Mittagessen: Huhn/Fisch + Quinoa/Reis + viel Gemüse. 
Abendessen: Fisch/Truthahn + Salat. 
Snacks: Joghurt/Protein, Nüsse, Obst.`,
            es: `Desayuno: huevos + verduras, a veces avena. 
Almuerzo: pollo/pescado + quinua/arroz + muchas verduras. 
Cena: pescado/pavo + ensalada. 
Snacks: yogur/proteína, frutos secos, fruta.`
        },
        notFor: null,
        suitableFor: ['structured_eating', 'protein_focus', 'simple'],
        notSuitableFor: [],
        allowedFoods: ['lean_protein', 'vegetables', 'whole_grains', 'fruits', 'nuts', 'yogurt'],
        restrictedFoods: ['sugary_snacks', 'processed_foods'],
        macroSplit: { protein: 30, carbs: 40, fat: 30 },
        tips: {
            en: ['This is a template, not an official program', 'Focus on protein with each meal', 'Prepare snacks in advance'],
            ru: ['Это шаблон, не официальная программа', 'Фокус на белке в каждом приёме', 'Готовьте перекусы заранее'],
            kk: ['Бұл үлгі, ресми бағдарлама емес', 'Әр тамақта ақуызға назар аударыңыз', 'Тіскебасарды алдын ала дайындаңыз'],
            fr: ['Modèle, pas programme officiel', 'Protéines à chaque repas', 'Préparer les collations à l\'avance'],
            de: [
                `Dies ist eine Vorlage, kein offizielles Programm`,
                `Konzentrieren Sie sich bei jeder Mahlzeit auf Protein`,
                `Bereiten Sie Snacks im Voraus zu`
                ],
            es: [
                `Esta es una plantilla, no un programa oficial.`,
                `Concéntrate en las proteínas con cada comida`,
                `Prepare bocadillos con anticipación`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80',
        color: '#9C27B0',
        isFeatured: false,
        popularityScore: 65,
        tags: ['public_figure', 'simple', 'protein'],
    },

    // ==================== SEASONAL DIETS ====================

    // 28) Ramadan - REMOVED

    // 29) Great Lent (LENT)
    {
        slug: 'great-lent',
        name: { en: 'Great Lent (Orthodox)', ru: 'Великий пост', kk: 'Ұлы ораза', fr: 'Grand Carême (orthodoxe)',
            de: `Große Fastenzeit (orthodox)`,
            es: `Gran Cuaresma (ortodoxa)`
        },
        description: { en: 'Guidance for the Orthodox Great Lent fasting period with plant-based meals. A spiritual journey through mindful eating.', ru: 'Рекомендации по питанию в Великий пост с растительными блюдами. Духовный путь через осознанное питание.', kk: 'Ұлы ораза кезеңінде өсімдік тағамдарымен тамақтану бойынша нұсқаулар. Саналы тамақтану арқылы рухани жол.', fr: 'Conseils pour le Grand Carême orthodoxe, repas végétaux. Parcours spirituel par une alimentation consciente.',
            de: `Anleitung für die orthodoxe Fastenzeit mit pflanzlichen Mahlzeiten. Eine spirituelle Reise durch achtsames Essen.`,
            es: `Orientación para el período de ayuno de la Gran Cuaresma ortodoxa con comidas a base de plantas. Un viaje espiritual a través de la alimentación consciente.`
        },
        shortDescription: { en: 'Orthodox fasting traditions', ru: 'Традиции православного поста', kk: 'Православиелік ораза дәстүрлері', fr: 'Traditions du jeûne orthodoxe',
            de: `Orthodoxe Fastentraditionen`,
            es: `Tradiciones de ayuno ortodoxas`
        },
        category: 'cultural',
        type: 'LIFESTYLE',
        difficulty: 'MODERATE',
        duration: 40,
        uiGroup: 'Seasonal',
        evidenceLevel: 'low',
        disclaimerKey: 'DISCLAIMER_GENERAL',
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'Focus on plant-based foods: vegetables, grains, legumes, fruits',
                'Avoid meat, dairy, and eggs during strict fasting days',
                'Fish allowed on certain days (Annunciation, Palm Sunday)',
                'Oil and wine permitted on weekends for most',
                'Emphasis on moderation and mindfulness, not just restriction',
            ],
            ru: [
                'Фокус на растительной пище: овощи, крупы, бобовые, фрукты',
                'Исключите мясо, молочные и яйца в строгие постные дни',
                'Рыба разрешена в определённые дни (Благовещение, Вербное воскресенье)',
                'Масло и вино допускаются по выходным для большинства',
                'Акцент на умеренности и осознанности, не только на ограничениях',
            ],
            kk: [
                'Өсімдік тағамына назар аударыңыз: көкөністер, жармалар, бұршақ, жемістер',
                'Қатаң ораза күндері ет, сүт өнімдері мен жұмыртқадан бас тартыңыз',
                'Балық белгілі күндері рұқсат (Благовещение, Құрма жексенбісі)',
                'Май мен шарап демалыс күндері рұқсат',
                'Тек шектеу емес, қалыптылық пен саналылыққа баса назар',
            ],
            fr: [
                'Focus végétal : légumes, céréales, légumineuses, fruits',
                'Pas de viande, lait, œufs les jours stricts',
                'Poisson certains jours (Annonciation, Rameaux)',
                'Huile et vin le week-end pour la plupart',
                'Modération et conscience, pas que restriction',
            ],
            de: [
                `Konzentrieren Sie sich auf pflanzliche Lebensmittel: Gemüse, Getreide, Hülsenfrüchte, Obst`,
                `Vermeiden Sie an strengen Fastentagen Fleisch, Milchprodukte und Eier`,
                `An bestimmten Tagen ist Fisch erlaubt (Verkündigung, Palmsonntag)`,
                `Öl und Wein sind für die meisten am Wochenende erlaubt`,
                `Der Schwerpunkt liegt auf Mäßigung und Achtsamkeit, nicht nur auf Einschränkung`
                ],
            es: [
                `Centrarse en los alimentos de origen vegetal: verduras, cereales, legumbres y frutas.`,
                `Evite la carne, los lácteos y los huevos durante los días de ayuno estricto.`,
                `Se permite pescar en determinados días (Anunciación, Domingo de Ramos)`,
                `Aceite y vino permitidos los fines de semana para la mayoría.`,
                `Énfasis en la moderación y la atención plena, no solo en la restricción`
                ]
        },
        dailyTracker: [
            { key: 'plant_based', label: { en: 'Ate plant-based today', ru: 'Ел растительное сегодня', kk: 'Бүгін өсімдік тағамын жедім', fr: 'Végétal aujourd\'hui',
                de: `Habe heute pflanzlich gegessen`,
                es: `Comí a base de plantas hoy`
            } },
            { key: 'no_meat', label: { en: 'No meat/dairy/eggs', ru: 'Без мяса/молочного/яиц', kk: 'Етсіз/сүтсіз/жұмыртқасыз', fr: 'Sans viande/lait/œufs',
                de: `Kein Fleisch/Milchprodukte/Eier`,
                es: `Sin carne/lácteos/huevos`
            } },
            { key: 'vegetables_4', label: { en: 'Vegetables 4+ servings', ru: 'Овощи 4+ порции', kk: 'Көкөніс 4+ порция', fr: 'Légumes 4+ portions',
                de: `Gemüse 4+ Portionen`,
                es: `Verduras 4+ porciones`
            } },
            { key: 'legumes', label: { en: 'Legumes or grains', ru: 'Бобовые или крупы', kk: 'Бұршақ немесе жарма', fr: 'Légumineuses ou céréales',
                de: `Hülsenfrüchte oder Getreide`,
                es: `Legumbres o cereales`
            } },
            { key: 'mindful', label: { en: 'Ate mindfully', ru: 'Ел осознанно', kk: 'Саналы тамақтандым', fr: 'Mangé en conscience',
                de: `Achtsam gegessen`,
                es: `comió conscientemente`
            } },
        ],
        sampleDay: {
            en: 'Breakfast: Oatmeal with dried fruits and nuts. Lunch: Lentil soup, bread, vegetable salad. Dinner: Buckwheat with mushrooms, pickled vegetables.',
            ru: 'Завтрак: овсянка с сухофруктами и орехами. Обед: суп из чечевицы, хлеб, салат из овощей. Ужин: гречка с грибами, соленья.',
            kk: 'Таңғы ас: кептірілген жемістер мен жаңғақ қосылған сұлы ботқасы. Түскі ас: жасымық сорпасы, нан, көкөніс салаты. Кешкі ас: саңырауқұлақты гречка, тұздалған көкөніс.',
            fr: 'Petit-déj : flocons, fruits secs, noix. Déjeuner : soupe lentilles, pain, salade. Dîner : sarrasin champignons, légumes marinés.',
            de: `Frühstück: Haferflocken mit Trockenfrüchten und Nüssen. Mittagessen: Linsensuppe, Brot, Gemüsesalat. Abendessen: Buchweizen mit Pilzen, eingelegtes Gemüse.`,
            es: `Desayuno: Avena con frutos secos y nueces. Almuerzo: Sopa de lentejas, pan, ensalada de verduras. Cena: Alforfón con champiñones, verduras en escabeche.`
        },
        notFor: null,
        suitableFor: ['plant_based', 'spiritual', 'seasonal'],
        notSuitableFor: [],
        allowedFoods: ['vegetables', 'fruits', 'legumes', 'grains', 'nuts', 'mushrooms', 'bread'],
        restrictedFoods: ['meat', 'dairy', 'eggs', 'alcohol_weekdays'],
        macroSplit: { protein: 15, carbs: 60, fat: 25 },
        tips: {
            en: ['Plan meals ahead', 'Explore legume recipes', 'Focus on spiritual meaning, not just food rules'],
            ru: ['Планируйте меню заранее', 'Изучите рецепты с бобовыми', 'Фокусируйтесь на духовном смысле, не только на правилах еды'],
            kk: ['Мәзірді алдын ала жоспарлаңыз', 'Бұршақ рецептерін зерттеңіз', 'Тек тамақ ережелеріне емес, рухани мағынаға назар аударыңыз'],
            fr: ['Planifier les repas', 'Explorer les recettes légumineuses', 'Sens spirituel, pas que les règles alimentaires'],
            de: [
                `Planen Sie Mahlzeiten im Voraus`,
                `Entdecken Sie Hülsenfruchtrezepte`,
                `Konzentrieren Sie sich auf die spirituelle Bedeutung, nicht nur auf die Essensregeln`
                ],
            es: [
                `Planifique las comidas con anticipación`,
                `Explora recetas de legumbres`,
                `Centrarse en el significado espiritual, no sólo en las reglas alimentarias`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
        color: '#7E57C2',
        isFeatured: false,
        popularityScore: 60,
        tags: ['seasonal', 'fasting', 'religious', 'plant_based'],
    },

    // 30) Summer Detox (SUMMER_DETOX)
    {
        slug: 'summer-detox',
        name: { en: 'Summer Fresh', ru: 'Летняя свежесть', kk: 'Жазғы сергектік', fr: 'Été fraîcheur',
            de: `Sommerfrisch`,
            es: `Verano fresco`
        },
        description: { en: 'Seasonal eating focused on fresh fruits, vegetables, and light meals perfect for hot summer days.', ru: 'Сезонное питание с акцентом на свежие фрукты, овощи и лёгкие блюда для жарких летних дней.', kk: 'Ыстық жаз күндеріне арналған таза жемістер, көкөністер және жеңіл тағамдарға бағытталған маусымдық тамақтану.', fr: 'Fruits et légumes frais, repas légers pour les jours chauds.',
            de: `Saisonale Ernährung mit Schwerpunkt auf frischem Obst, Gemüse und leichten Mahlzeiten, perfekt für heiße Sommertage.`,
            es: `La alimentación estacional se centra en frutas y verduras frescas y comidas ligeras, perfectas para los calurosos días de verano.`
        },
        shortDescription: { en: 'Fresh summer eating plan', ru: 'Свежий летний план питания', kk: 'Таза жазғы тамақтану жоспары', fr: 'Plan alimentaire estival frais',
            de: `Frischer Sommer-Ernährungsplan`,
            es: `Plan de alimentación fresco de verano`
        },
        category: 'modern',
        type: 'HEALTH',
        difficulty: 'EASY',
        duration: 14,
        uiGroup: 'Seasonal',
        evidenceLevel: 'low',
        disclaimerKey: null,
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'Prioritize seasonal fruits and vegetables',
                'Choose light proteins: fish, chicken, legumes',
                'Stay hydrated with water, herbal teas, fresh juices',
                'Eat smaller portions more frequently',
                'Minimize heavy, fried, and processed foods',
            ],
            ru: [
                'Отдавайте предпочтение сезонным фруктам и овощам',
                'Выбирайте лёгкие белки: рыба, курица, бобовые',
                'Пейте много воды, травяных чаёв, свежих соков',
                'Ешьте меньшими порциями, но чаще',
                'Минимизируйте тяжёлую, жареную и переработанную еду',
            ],
            kk: [
                'Маусымдық жемістер мен көкөністерге басымдық беріңіз',
                'Жеңіл ақуыздарды таңдаңыз: балық, тауық, бұршақ',
                'Су, шөп шайлары, таза шырындармен сусындаңыз',
                'Кішірек порциялармен, бірақ жиі тамақтаныңыз',
                'Ауыр, қуырылған және өңделген тағамды азайтыңыз',
            ],
            fr: [
                'Fruits et légumes de saison en priorité',
                'Protéines légères : poisson, poulet, légumineuses',
                'Eau, tisanes, jus frais',
                'Portions plus petites, plus souvent',
                'Éviter lourd, frit, transformé',
            ],
            de: [
                `Priorisieren Sie saisonales Obst und Gemüse`,
                `Wählen Sie leichte Proteine: Fisch, Huhn, Hülsenfrüchte`,
                `Bleiben Sie mit Wasser, Kräutertees und frischen Säften ausreichend hydriert`,
                `Essen Sie häufiger kleinere Portionen`,
                `Vermeiden Sie schwere, frittierte und verarbeitete Lebensmittel`
                ],
            es: [
                `Prioriza las frutas y verduras de temporada`,
                `Elige proteínas ligeras: pescado, pollo, legumbres.`,
                `Manténgase hidratado con agua, infusiones y jugos frescos.`,
                `Coma porciones más pequeñas con más frecuencia`,
                `Minimizar los alimentos pesados, fritos y procesados.`
                ]
        },
        dailyTracker: [
            { key: 'fruits_3', label: { en: 'Fresh fruits 3+ servings', ru: 'Свежие фрукты 3+ порции', kk: 'Таза жемістер 3+ порция', fr: 'Fruits frais 3+ portions',
                de: `Frisches Obst 3+ Portionen`,
                es: `Frutas frescas 3+ porciones`
            } },
            { key: 'vegetables_4', label: { en: 'Vegetables 4+ servings', ru: 'Овощи 4+ порции', kk: 'Көкөністер 4+ порция', fr: 'Légumes 4+ portions',
                de: `Gemüse 4+ Portionen`,
                es: `Verduras 4+ porciones`
            } },
            { key: 'water_8', label: { en: 'Water 8+ glasses', ru: 'Вода 8+ стаканов', kk: 'Су 8+ стақан', fr: 'Eau 8+ verres',
                de: `Wasser 8+ Gläser`,
                es: `Agua 8+ vasos`
            } },
            { key: 'light_protein', label: { en: 'Light protein (fish/chicken/legumes)', ru: 'Лёгкий белок (рыба/курица/бобовые)', kk: 'Жеңіл ақуыз (балық/тауық/бұршақ)', fr: 'Protéines légères (poisson/poulet/légumineuses)',
                de: `Leichtes Protein (Fisch/Huhn/Hülsenfrüchte)`,
                es: `Proteínas ligeras (pescado/pollo/legumbres)`
            } },
            { key: 'no_heavy_food', label: { en: 'No heavy/fried food', ru: 'Без тяжёлой/жареной еды', kk: 'Ауыр/қуырылған тағамсыз', fr: 'Pas lourd/frit',
                de: `Kein schweres/frittiertes Essen`,
                es: `No comida pesada/frita`
            } },
        ],
        sampleDay: {
            en: 'Breakfast: Greek yogurt with berries and granola. Lunch: Grilled chicken salad with seasonal vegetables. Dinner: Grilled fish with quinoa and cucumber salad. Snacks: Watermelon, cold gazpacho.',
            ru: 'Завтрак: греческий йогурт с ягодами и гранолой. Обед: салат с курицей-гриль и сезонными овощами. Ужин: рыба-гриль с киноа и салатом из огурцов. Перекусы: арбуз, холодный гаспачо.',
            kk: 'Таңғы ас: жидек және гранола қосылған грек йогурты. Түскі ас: гриль тауық салаты, маусымдық көкөністер. Кешкі ас: гриль балық, киноа, қияр салаты. Тіскебасар: қарбыз, суық гаспачо.',
            fr: 'Petit-déj : yaourt grec, baies, granola. Déjeuner : salade poulet grillé, légumes. Dîner : poisson grillé, quinoa, concombre. Collations : pastèque, gazpacho.',
            de: `Frühstück: Griechischer Joghurt mit Beeren und Müsli. Mittagessen: Gegrillter Hühnersalat mit Gemüse der Saison. Abendessen: Gegrillter Fisch mit Quinoa und Gurkensalat. Snacks: Wassermelone, kalte Gazpacho.`,
            es: `Desayuno: yogur griego con frutos rojos y granola. Almuerzo: Ensalada de pollo a la parrilla con verduras de temporada. Cena: Pescado a la plancha con ensalada de quinoa y pepino. Meriendas: Sandía, gazpacho frío.`
        },
        notFor: null,
        suitableFor: ['seasonal', 'weight_loss', 'energy'],
        notSuitableFor: [],
        allowedFoods: ['fruits', 'vegetables', 'fish', 'chicken', 'legumes', 'whole_grains', 'yogurt'],
        restrictedFoods: ['fried_foods', 'heavy_meats', 'processed_foods', 'sugary_drinks'],
        macroSplit: { protein: 20, carbs: 55, fat: 25 },
        tips: {
            en: ['Shop at farmers markets for seasonal produce', 'Try cold soups like gazpacho', 'Eat your heaviest meal when it\'s cooler'],
            ru: ['Покупайте сезонные продукты на рынках', 'Попробуйте холодные супы, например гаспачо', 'Ешьте самую плотную еду в прохладное время'],
            kk: ['Маусымдық өнімдерді базардан сатып алыңыз', 'Гаспачо сияқты суық сорпаларды көріңіз', 'Ең ауыр тамақты салқын уақытта жеңіз'],
            fr: ['Marchés pour produits de saison', 'Soupes froides type gazpacho', 'Repas le plus lourd quand il fait frais'],
            de: [
                `Kaufen Sie auf Bauernmärkten saisonale Produkte ein`,
                `Probieren Sie kalte Suppen wie Gazpacho`,
                `Essen Sie Ihre schwerste Mahlzeit, wenn es kühler ist`
                ],
            es: [
                `Compre productos de temporada en los mercados de agricultores`,
                `Prueba sopas frías como el gazpacho.`,
                `Coma su comida más pesada cuando esté más fresco.`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80',
        color: '#26A69A',
        isFeatured: false,
        popularityScore: 70,
        tags: ['seasonal', 'summer', 'fresh', 'light'],
    },

    // 31) Navruz (NAVRUZ)
    {
        slug: 'navruz',
        name: { en: 'Navruz Spring', ru: 'Навруз', kk: 'Наурыз', fr: 'Navrouz printanier',
            de: `Nowruz-Frühling`,
            es: `Primavera de Nouruz`
        },
        description: {
            en: 'A celebration of spring equinox with traditional Central Asian foods. Fresh greens, dairy, and symbolic dishes for renewal.', ru: 'Празднование весеннего равноденствия с традиционными блюдами Центральной Азии. Свежая зелень, молочные продукты и символичные блюда обновления.', kk: 'Орталық Азияның дәстүрлі тағамдарымен көктемгі теңелу мерекесі. Таза жасылдар, сүт өнімдері және жаңару символикалық тағамдары.', fr: 'Célébration de l\'équinoxe de printemps.',
            de: `Eine Feier der Frühlings-Tagundnachtgleiche mit traditionellen zentralasiatischen Speisen. Frisches Gemüse, Milchprodukte und symbolische Gerichte für die Erneuerung.`,
            es: `Una celebración del equinoccio de primavera con comidas tradicionales de Asia Central. Verduras frescas, lácteos y platos simbólicos para la renovación.`
        },
        shortDescription: { en: 'Spring celebration eating', ru: 'Весеннее праздничное питание', kk: 'Көктемгі мерекелік тамақтану', fr: 'Alimentation fête du printemps',
            de: `Essen im Frühlingsfest`,
            es: `Celebración de primavera comiendo`
        },
        category: 'cultural',
        type: 'LIFESTYLE',
        difficulty: 'EASY',
        duration: 14,
        uiGroup: 'Seasonal',
        evidenceLevel: 'low',
        disclaimerKey: 'DISCLAIMER_GENERAL',
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'Include fresh spring greens in every meal',
                'Try traditional dishes like sumalak, navruz-kozhe',
                'Focus on dairy products: kurt, ayran, suzma',
                'Celebrate with family and share meals',
                'Use seasonal ingredients as they become available',
            ],
            ru: [
                'Включайте свежую весеннюю зелень в каждый приём пищи',
                'Попробуйте традиционные блюда: сумаляк, наурыз-коже',
                'Фокус на молочных продуктах: курт, айран, сузьма',
                'Празднуйте с семьёй и делитесь едой',
                'Используйте сезонные продукты по мере их появления',
            ],
            kk: [
                'Әр тамаққа таза көктемгі жасылдарды қосыңыз',
                'Дәстүрлі тағамдарды көріңіз: сүмелек, наурыз-көже',
                'Сүт өнімдеріне назар аударыңыз: құрт, айран, сүзбе',
                'Отбасымен бірге мерекелеңіз және тамақпен бөлісіңіз',
                'Маусымдық өнімдерді пайда болған кезде пайдаланыңыз',
            ],
            fr: [
                'Verts de printemps à chaque repas',
                'Plats traditionnels : sumalak, navruz-kozhe',
                'Laitages : kurt, ayran, suzma',
                'Fêter en famille, partager les repas',
                'Ingrédients de saison',
            ],
            de: [
                `Fügen Sie zu jeder Mahlzeit frisches Frühlingsgrün hinzu`,
                `Probieren Sie traditionelle Gerichte wie Sumalak und Navruz-Kozhe`,
                `Konzentrieren Sie sich auf Milchprodukte: Kurt, Ayran, Suzma`,
                `Feiern Sie mit der Familie und teilen Sie die Mahlzeiten`,
                `Verwenden Sie saisonale Zutaten, sobald diese verfügbar sind`
                ],
            es: [
                `Incluya verduras frescas de primavera en cada comida.`,
                `Pruebe platos tradicionales como sumalak, navruz-kozhe.`,
                `Centrarse en los productos lácteos: kurt, ayran, suzma`,
                `Celebra en familia y comparte comidas.`,
                `Utilice ingredientes de temporada a medida que estén disponibles.`
                ]
        },
        dailyTracker: [
            { key: 'fresh_greens', label: { en: 'Fresh greens/herbs', ru: 'Свежая зелень', kk: 'Таза жасылдар', fr: 'Verts/herbes frais',
                de: `Frisches Grün/Kräuter`,
                es: `Verduras/hierbas frescas`
            } },
            { key: 'dairy', label: { en: 'Dairy products', ru: 'Молочные продукты', kk: 'Сүт өнімдері', fr: 'Laitages',
                de: `Milchprodukte`,
                es: `productos lácteos`
            } },
            { key: 'traditional_dish', label: { en: 'Traditional dish', ru: 'Традиционное блюдо', kk: 'Дәстүрлі тағам', fr: 'Plat traditionnel',
                de: `Traditionelles Gericht`,
                es: `plato tradicional`
            } },
            { key: 'vegetables_3', label: { en: 'Vegetables 3+ servings', ru: 'Овощи 3+ порции', kk: 'Көкөністер 3+ порция', fr: 'Légumes 3+ portions',
                de: `Gemüse 3+ Portionen`,
                es: `Verduras 3+ porciones`
            } },
            { key: 'shared_meal', label: { en: 'Shared meal with others', ru: 'Совместная трапеза', kk: 'Бірге тамақтану', fr: 'Repas partagé',
                de: `Gemeinsames Essen mit anderen`,
                es: `Comida compartida con otros.`
            } },
        ],
        sampleDay: {
            en: 'Breakfast: Baursak with honey, kurt, tea. Lunch: Navruz-kozhe (traditional seven-ingredient soup), fresh salad. Dinner: Beshbarmak or plov with meat and vegetables. Snacks: Dried fruits, nuts, suzma.',
            ru: 'Завтрак: баурсак с мёдом, курт, чай. Обед: наурыз-коже (традиционный суп из 7 ингредиентов), свежий салат. Ужин: бешбармак или плов с мясом и овощами. Перекусы: сухофрукты, орехи, сузьма.',
            kk: 'Таңғы ас: бал қосылған бауырсақ, құрт, шай. Түскі ас: наурыз-көже (7 компоненттен тұратын дәстүрлі сорпа), таза салат. Кешкі ас: бешбармақ немесе палау етпен және көкөніспен. Тіскебасар: кептірілген жемістер, жаңғақ, сүзбе.',
            fr: 'Petit-déj : baursak, miel, kurt, thé. Déjeuner : navruz-kozhe, salade. Dîner : beshbarmak ou plov. Collations : fruits secs, noix, suzma.',
            de: `Frühstück: Baursak mit Honig, Kurt, Tee. Mittagessen: Navruz-kozhe (traditionelle Suppe mit sieben Zutaten), frischer Salat. Abendessen: Beshbarmak oder Plov mit Fleisch und Gemüse. Snacks: Trockenfrüchte, Nüsse, Suzma.`,
            es: `Desayuno: Baursak con miel, kurt, té. Almuerzo: Navruz-kozhe (sopa tradicional de siete ingredientes), ensalada fresca. Cena: Beshbarmak o plov con carne y verduras. Meriendas: Frutos secos, nueces, suzma.`
        },
        notFor: null,
        suitableFor: ['cultural', 'seasonal', 'family'],
        notSuitableFor: [],
        allowedFoods: ['dairy', 'meat', 'grains', 'vegetables', 'fruits', 'nuts', 'honey'],
        restrictedFoods: [],
        macroSplit: { protein: 20, carbs: 50, fat: 30 },
        tips: {
            en: ['Learn to make navruz-kozhe', 'Visit local markets for fresh spring produce', 'Share traditional dishes with neighbors'],
            ru: ['Научитесь готовить наурыз-коже', 'Посетите местные рынки за свежими весенними продуктами', 'Делитесь традиционными блюдами с соседями'],
            kk: ['Наурыз-көже дайындауды үйреніңіз', 'Таза көктемгі өнімдер үшін жергілікті базарларға барыңыз', 'Көршілермен дәстүрлі тағамдармен бөлісіңіз'],
            fr: ['Apprendre le navruz-kozhe', 'Marchés locaux pour produits de printemps', 'Partager les plats avec les voisins'],
            de: [
                `Lernen Sie, Navruz-Kozhe zuzubereiten`,
                `Besuchen Sie lokale Märkte für frische Frühlingsprodukte`,
                `Teilen Sie traditionelle Gerichte mit Ihren Nachbarn`
                ],
            es: [
                `Aprende a hacer navruz-kozhe`,
                `Visite los mercados locales para comprar productos frescos de primavera.`,
                `Compartir platos tradicionales con las vecinas.`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
        color: '#8BC34A',
        isFeatured: true,
        popularityScore: 85,
        tags: ['seasonal', 'spring', 'cultural', 'kazakh', 'central_asian'],
    },

    // 32) Winter Warmth (WINTER_WARMTH)
    {
        slug: 'winter-warmth',
        name: { en: 'Winter Warmth', ru: 'Зимнее тепло', kk: 'Қысқы жылу', fr: 'Chaleur hivernale',
            de: `Winterwärme`,
            es: `Calor de invierno`
        },
        description: {
            en: 'Hearty, warming meals to keep you energized through winter. Focus on soups, stews, root vegetables, and immune-supporting foods.', ru: 'Сытные, согревающие блюда для энергии всю зиму. Фокус на супах, рагу, корнеплодах и продуктах для иммунитета.', kk: 'Қысты энергиямен өткізуге арналған тамаша, жылытатын тағамдар. Сорпалар, рагу, тамыржемістер және иммунитетті қолдайтын тағамдарға назар.', fr: 'Plats réconfortants pour l\'hiver.',
            de: `Herzhafte, wärmende Mahlzeiten, die Sie mit Energie durch den Winter bringen. Konzentrieren Sie sich auf Suppen, Eintöpfe, Wurzelgemüse und immunstärkende Lebensmittel.`,
            es: `Comidas abundantes y calientes para mantenerte con energía durante el invierno. Concéntrese en sopas, guisos, tubérculos y alimentos que apoyan el sistema inmunológico.`
        },
        shortDescription: { en: 'Warming winter eating plan', ru: 'Согревающий зимний план питания', kk: 'Жылытатын қысқы тамақтану жоспары', fr: 'Plan alimentaire réconfortant hiver',
            de: `Wärmender Ernährungsplan für den Winter`,
            es: `Plan de alimentación cálido para el invierno`
        },
        category: 'modern',
        type: 'HEALTH',
        difficulty: 'EASY',
        duration: 21,
        uiGroup: 'Seasonal',
        evidenceLevel: 'low',
        disclaimerKey: null,
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'Warming spices daily: ginger, turmeric, cinnamon, cayenne, black pepper, cumin, cardamom',
                'Root vegetables as staples: sweet potato, parsnips, carrots, beets, turnips, celeriac',
                'Soups and stews as main meals 3-4x/week - nutrient-dense, warming, easy to batch cook',
                'Citrus daily for vitamin C: oranges, grapefruit, clementines, lemons',
                'Warm breakfasts every morning: porridge, warm eggs, sauteed greens',
                'Vitamin D: fatty fish 2-3x/week, eggs, and consider 1000-2000 IU supplement',
            ],
            ru: [
                'Согревающие специи ежедневно: имбирь, куркума, корица, кайенский перец, тмин',
                'Корнеплоды как основа: батат, пастернак, морковь, свёкла, репа',
                'Супы и рагу как основные блюда 3-4 раза/неделю - питательные и согревающие',
                'Цитрусы ежедневно для витамина C: апельсины, грейпфруты, мандарины',
                'Тёплый завтрак каждое утро: каша, яйца, тушёная зелень',
                'Витамин D: жирная рыба 2-3 раза/неделю, яйца, и добавка 1000-2000 МЕ',
            ],
            kk: [
                'Күн сайын жылытатын дәмдеуіштер: зімбір, сарықөк, дарчын, қызыл бұрыш, зира',
                'Тамыржемістер негіз ретінде: батат, пастернак, сәбіз, қызылша, шалқан',
                'Сорпа мен рагу негізгі тамақ ретінде аптасына 3-4 рет',
                'Күн сайын цитрус C витамині үшін: апельсин, грейпфрут, мандарин',
                'Әр таңда жылы таңғы ас: ботқа, жұмыртқа, тушталған жасылдар',
                'D витамині: майлы балық аптасына 2-3 рет, жұмыртқа, 1000-2000 МЕ қосымша',
            ],
            fr: [
                'Épices réchauffantes quotidiennes : gingembre, curcuma, cannelle, cayenne',
                'Légumes-racines : patate douce, panais, carottes, betteraves, navets',
                'Soupes et ragoûts 3-4x/semaine - nutritifs et réchauffants',
                'Agrumes quotidiens pour vitamine C : oranges, pamplemousses, clémentines',
                'Petit-déj chaud chaque matin : porridge, œufs, légumes sautés',
                'Vitamine D : poisson gras 2-3x/semaine, œufs, supplément 1000-2000 UI',
            ],
            de: [
                `Täglich wärmende Gewürze: Ingwer, Kurkuma, Zimt, Cayennepfeffer, schwarzer Pfeffer, Kreuzkümmel, Kardamom`,
                `Wurzelgemüse als Grundnahrungsmittel: Süßkartoffel, Pastinaken, Karotten, Rüben, Rüben, Sellerie`,
                `Suppen und Eintöpfe als Hauptmahlzeiten 3–4x/Woche – nährstoffreich, wärmend, einfach in der Zubereitung zuzubereiten`,
                `Zitrusfrüchte täglich für Vitamin C: Orangen, Grapefruit, Clementinen, Zitronen`,
                `Jeden Morgen warmes Frühstück: Haferbrei, warme Eier, sautiertes Gemüse`,
                `Vitamin D: 2-3x/Woche fetter Fisch, Eier und 1000-2000 IE Nahrungsergänzung in Betracht ziehen`
                ],
            es: [
                `Especias para calentar a diario: jengibre, cúrcuma, canela, cayena, pimienta negra, comino, cardamomo.`,
                `Hortalizas de raíz como alimento básico: batata, chirivía, zanahoria, remolacha, nabo, apio nabo.`,
                `Sopas y guisos como comidas principales 3 o 4 veces por semana: ricos en nutrientes, reconfortantes y fáciles de cocinar por lotes`,
                `Cítricos diarios para la vitamina C: naranjas, pomelos, clementinas, limones`,
                `Desayunos calientes todas las mañanas: gachas de avena, huevos calientes, verduras salteadas`,
                `Vitamina D: pescado graso 2-3 veces por semana, huevos y considerar un suplemento de 1000-2000 UI`
                ]
        },
        dailyTracker: [
            { key: 'warming_spices', label: { en: 'Warming spices used in at least one meal', ru: 'Согревающие специи хотя бы в одном блюде', kk: 'Кем дегенде бір тамақта жылытатын дәмдеуіш', fr: 'Épices réchauffantes dans un repas',
                de: `Wärmende Gewürze, die in mindestens einer Mahlzeit verwendet werden`,
                es: `Especias calientes utilizadas en al menos una comida.`
            } },
            { key: 'root_veggies', label: { en: 'Root vegetables in at least one meal', ru: 'Корнеплоды хотя бы в одном приёме', kk: 'Кем дегенде бір тамақта тамыржеміс', fr: 'Légumes-racines dans un repas',
                de: `Wurzelgemüse in mindestens einer Mahlzeit`,
                es: `Verduras de raíz en al menos una comida.`
            } },
            { key: 'citrus', label: { en: 'Citrus fruit consumed for vitamin C', ru: 'Цитрус для витамина C', kk: 'C витамині үшін цитрус жеміс', fr: 'Agrumes pour vitamine C',
                de: `Zitrusfrüchte werden für Vitamin C verzehrt`,
                es: `Cítricos consumidos para obtener vitamina C.`
            } },
            { key: 'soup_stew', label: { en: 'Soup, stew, or warm dish as main meal', ru: 'Суп, рагу или тёплое блюдо', kk: 'Сорпа, рагу немесе жылы тағам', fr: 'Soupe, ragoût ou plat chaud',
                de: `Suppe, Eintopf oder warmes Gericht als Hauptmahlzeit`,
                es: `Sopa, guiso o plato caliente como comida principal.`
            } },
            { key: 'vitamin_d', label: { en: 'Vitamin D source included (fish, eggs, or supplement)', ru: 'Источник витамина D (рыба, яйца или добавка)', kk: 'D витамин көзі (балық, жұмыртқа немесе қосымша)', fr: 'Source de vitamine D (poisson, œufs, supplément)',
                de: `Vitamin-D-Quelle enthalten (Fisch, Eier oder Nahrungsergänzungsmittel)`,
                es: `Fuente de vitamina D incluida (pescado, huevos o suplemento)`
            } },
            { key: 'warm_breakfast', label: { en: 'Warm breakfast eaten (not cold cereal)', ru: 'Тёплый завтрак (не холодные хлопья)', kk: 'Жылы таңғы ас (суық каша емес)', fr: 'Petit-déj chaud (pas céréales froides)',
                de: `Warmes Frühstück gegessen (kein kaltes Müsli)`,
                es: `Desayuno caliente (no cereal frío)`
            } },
        ],
        sampleDay: {
            en: 'Breakfast: Oatmeal with cinnamon, honey, and walnuts. Lunch: Beef and vegetable stew with crusty bread. Dinner: Baked salmon with roasted root vegetables. Snacks: Hot tea with ginger, baked apple.',
            ru: 'Завтрак: овсянка с корицей, мёдом и грецкими орехами. Обед: рагу из говядины с овощами и хлебом. Ужин: запечённый лосось с запечёнными корнеплодами. Перекусы: горячий чай с имбирём, печёное яблоко.',
            kk: 'Таңғы ас: бал, дарчын және грек жаңғағы қосылған сұлы ботқасы. Түскі ас: сиыр еті мен көкөніс рагуы, нанмен. Кешкі ас: пеште піскен лосось, пеште піскен тамыржемістер. Тіскебасар: зімбірлі ыстық шай, пісірілген алма.',
            fr: 'Petit-déj : flocons cannelle miel noix. Déjeuner : ragoût bœuf légumes, pain. Dîner : saumon, légumes rôtis. Collations : thé gingembre, pomme cuite.',
            de: `Frühstück: Haferflocken mit Zimt, Honig und Walnüssen. Mittagessen: Rindfleisch-Gemüse-Eintopf mit knusprigem Brot. Abendessen: Gebackener Lachs mit geröstetem Wurzelgemüse. Snacks: Heißer Tee mit Ingwer, Bratapfel.`,
            es: `Desayuno: Avena con canela, miel y nueces. Almuerzo: Estofado de ternera y verduras con pan crujiente. Cena: Salmón al horno con tubérculos asados. Meriendas: Té caliente con jengibre, manzana al horno.`
        },
        notFor: null,
        suitableFor: ['seasonal', 'energy', 'immune_health'],
        notSuitableFor: [],
        allowedFoods: ['root_vegetables', 'whole_grains', 'lean_meat', 'fish', 'legumes', 'nuts', 'honey', 'citrus'],
        restrictedFoods: ['cold_drinks', 'ice_cream', 'raw_salads_excess'],
        macroSplit: { protein: 25, carbs: 45, fat: 30 },
        tips: {
            en: ['Batch cook soups and stews on weekends', 'Keep a thermos of warm tea at work', 'Add spices for extra warmth: cinnamon, ginger, turmeric'],
            ru: ['Готовьте супы и рагу на выходных про запас', 'Держите термос с горячим чаем на работе', 'Добавляйте специи для тепла: корица, имбирь, куркума'],
            kk: ['Демалыс күндері сорпа мен рагу дайындаңыз', 'Жұмыста ыстық шай термосын ұстаңыз', 'Жылу үшін дәмдеуіштер қосыңыз: дарчын, зімбір, сарықөк'],
            fr: ['Soupes/ragoûts le week-end', 'Thermos de thé au travail', 'Cannelle, gingembre, curcuma'],
            de: [
                `Am Wochenende kochen Sie Suppen und Eintöpfe in großen Mengen`,
                `Halten Sie bei der Arbeit eine Thermoskanne mit warmem Tee bereit`,
                `Für zusätzliche Wärme Gewürze hinzufügen: Zimt, Ingwer, Kurkuma`
                ],
            es: [
                `Cocine por lotes sopas y guisos los fines de semana.`,
                `Mantenga un termo de té caliente en el trabajo.`,
                `Agregue especias para darle más calidez: canela, jengibre, cúrcuma.`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=800&q=80',
        color: '#FF7043',
        isFeatured: false,
        popularityScore: 65,
        tags: ['seasonal', 'winter', 'comfort', 'immune'],
    },

    // 33) Autumn Harvest (AUTUMN_HARVEST)
    {
        slug: 'autumn-harvest',
        name: {
            en: 'Autumn Harvest', ru: 'Осенний урожай', kk: 'Күзгі егін', fr: 'Récolte d\'automne',
            de: `Herbsternte`,
            es: `Cosecha de otoño`
        },
        description: {
            en: 'Embrace autumn with pumpkins, apples, squash, and other fall favorites. Transition from summer lightness to winter warmth.', ru: 'Встречаем осень с тыквой, яблоками, кабачками и другими осенними любимцами. Переход от летней лёгкости к зимнему теплу.', kk: 'Асқабақ, алма, кабачок және басқа күзгі сүйіктілермен күзді қарсы алыңыз. Жазғы жеңілдіктен қысқы жылуға көшу.', fr: 'Citrouille, pommes, courges et autres classiques d\'automne.',
            de: `Genießen Sie den Herbst mit Kürbissen, Äpfeln, Kürbissen und anderen Herbstlieblingen. Übergang von sommerlicher Leichtigkeit zu winterlicher Wärme.`,
            es: `Abrace el otoño con calabazas, manzanas, calabacines y otros favoritos del otoño. Transición de la ligereza del verano a la calidez del invierno.`
        },
        shortDescription: { en: 'Seasonal autumn eating', ru: 'Сезонное осеннее питание', kk: 'Маусымдық күзгі тамақтану', fr: 'Alimentation automnale de saison',
            de: `Saisonales Herbstessen`,
            es: `Comida estacional de otoño`
        },
        category: 'modern',
        type: 'HEALTH',
        difficulty: 'EASY',
        duration: 21,
        uiGroup: 'Seasonal',
        evidenceLevel: 'low',
        disclaimerKey: null,
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'Pumpkin/squash as weekly staples: butternut, acorn, delicata - in soups, roasted, or sides',
                'Apples and pears daily (peak season = maximum nutrition). Eat whole with skin for fiber',
                'Mushrooms 3-4x/week: shiitake, cremini, portobello, chanterelle. Natural vitamin D source',
                'Transition cooking: shift from raw salads to roasted, sauteed, slow-cooked dishes',
                'Warming spices daily: cinnamon in oatmeal, ginger in stir-fries, nutmeg in soups',
                'Begin immune prep: vitamin C (Brussels sprouts, peppers), zinc (pumpkin seeds, meat)',
            ],
            ru: [
                'Тыква/кабачки как основа: в супах, запечённые, гарниром',
                'Яблоки и груши ежедневно. Ешьте целиком с кожурой для клетчатки',
                'Грибы 3-4 раза/неделю: шиитаке, шампиньоны, портобелло. Источник витамина D',
                'Переход в готовке: от сырых салатов к запечённым, тушёным, медленно приготовленным',
                'Согревающие специи ежедневно: корица, имбирь, мускатный орех',
                'Подготовка иммунитета: витамин C (брюссельская капуста, перец), цинк (тыквенные семечки)',
            ],
            kk: [
                'Асқабақ/кабачок апталық негіз ретінде: сорпада, пісірілген, гарнир ретінде',
                'Күн сайын алма мен алмұрт. Клетчатка үшін қабығымен тұтас жеңіз',
                'Аптасына 3-4 рет саңырауқұлақ: шиитаке, шампиньон, портобелло. D витамин көзі',
                'Пісіру өтпелі: шикі салаттардан пісірілген, тушталған, баяу пісіргенге өту',
                'Күн сайын жылытатын дәмдеуіштер: дарчын, зімбір, мускат жаңғағы',
                'Иммунитет дайындығы: C витамині (Брюссель қырыққабаты, бұрыш), мырыш (асқабақ тұқымы)',
            ],
            fr: [
                'Potiron/courge comme base : soupe, rôti, ou en accompagnement',
                'Pommes et poires quotidiennes. Entières avec la peau pour les fibres',
                'Champignons 3-4x/semaine : shiitake, cremini, portobello. Source de vitamine D',
                'Transition cuisine : des salades crues aux plats rôtis, sautés, mijotés',
                'Épices réchauffantes quotidiennes : cannelle, gingembre, muscade',
                'Préparation immunitaire : vitamine C (choux Bruxelles), zinc (graines citrouille)',
            ],
            de: [
                `Kürbis/Kürbis als wöchentliche Grundnahrungsmittel: Butternuss, Eichel, Feinkost – in Suppen, geröstet oder als Beilage`,
                `Täglich Äpfel und Birnen (Hauptsaison = maximale Ernährung). Essen Sie das Ganze mit der Schale als Ballaststoffquelle`,
                `Pilze 3-4x/Woche: Shiitake, Cremini, Portobello, Pfifferlinge. Natürliche Vitamin-D-Quelle`,
                `Übergangskochen: Wechseln Sie von rohen Salaten zu gerösteten, sautierten, langsam gegarten Gerichten`,
                `Täglich wärmende Gewürze: Zimt in Haferflocken, Ingwer in Pfannengerichten, Muskatnuss in Suppen`,
                `Beginnen Sie mit der Immunvorbereitung: Vitamin C (Rosenkohl, Paprika), Zink (Kürbiskerne, Fleisch)`
                ],
            es: [
                `Calabaza/calabaza como alimento básico semanal: nuez, bellota, delicatessen, en sopas, asadas o como acompañamiento`,
                `Manzanas y peras diariamente (temporada alta = nutrición máxima). Coma entero con piel para obtener fibra.`,
                `Hongos 3-4 veces por semana: shiitake, cremini, portobello, rebozuelos. Fuente natural de vitamina D`,
                `Cocina de transición: pasar de ensaladas crudas a platos asados, salteados y cocinados a fuego lento`,
                `Especias calientes a diario: canela en avena, jengibre en salteados, nuez moscada en sopas`,
                `Comience la preparación inmunológica: vitamina C (coles de Bruselas, pimientos), zinc (semillas de calabaza, carne)`
                ]
        },
        dailyTracker: [
            { key: 'autumn_produce', label: { en: 'Seasonal autumn produce used (squash, apples, mushrooms)', ru: 'Осенние продукты (тыква, яблоки, грибы)', kk: 'Күзгі өнімдер (асқабақ, алма, саңырауқұлақ)', fr: 'Produits d\'automne (courge, pommes, champignons)',
                de: `Verwendete saisonale Herbstprodukte (Kürbis, Äpfel, Pilze)`,
                es: `Productos de temporada de otoño utilizados (calabazas, manzanas, champiñones)`
            } },
            { key: 'mushrooms', label: { en: 'Mushrooms consumed (3-4x/week target)', ru: 'Грибы (цель 3-4 раза/неделю)', kk: 'Саңырауқұлақ (мақсат 3-4 рет/апта)', fr: 'Champignons (3-4x/semaine)',
                de: `Verzehrte Pilze (3-4x/Woche-Ziel)`,
                es: `Hongos consumidos (objetivo de 3 a 4 veces por semana)`
            } },
            { key: 'apple_pear', label: { en: 'Apple or pear eaten today (whole, with skin)', ru: 'Яблоко или груша (целиком, с кожурой)', kk: 'Алма немесе алмұрт (тұтас, қабығымен)', fr: 'Pomme ou poire (entière, avec peau)',
                de: `Heute gegessener Apfel oder Birne (ganz, mit Schale)`,
                es: `Manzana o pera que se come hoy (entera, con piel)`
            } },
            { key: 'warming_spices', label: { en: 'Warming spices in at least one meal', ru: 'Согревающие специи в хотя бы одном блюде', kk: 'Кем дегенде бір тамақта жылытатын дәмдеуіш', fr: 'Épices réchauffantes dans un repas',
                de: `Wärmende Gewürze in mindestens einer Mahlzeit`,
                es: `Calentar especias en al menos una comida.`
            } },
            { key: 'roasted_meal', label: { en: 'Home-cooked roasted or slow-cooked meal', ru: 'Домашнее запечённое или тушёное блюдо', kk: 'Үйде пісірілген немесе баяу піскен тағам', fr: 'Plat rôti ou mijoté maison',
                de: `Hausgemachte, gebratene oder langsam gegarte Mahlzeit`,
                es: `Comida casera asada o cocinada a fuego lento`
            } },
            { key: 'vitamin_c', label: { en: 'Vitamin C source consumed (Brussels sprouts, peppers, citrus)', ru: 'Источник витамина C (брюссельская капуста, перец, цитрус)', kk: 'C витамин көзі (Брюссель қырыққабаты, бұрыш, цитрус)', fr: 'Source vitamine C (choux Bruxelles, poivrons, agrumes)',
                de: `Verzehrte Vitamin-C-Quelle (Rosenkohl, Paprika, Zitrusfrüchte)`,
                es: `Fuente de vitamina C consumida (coles de Bruselas, pimientos, cítricos)`
            } },
        ],
        sampleDay: {
            en: 'Breakfast: Pumpkin oatmeal with cinnamon and pecans. Lunch: Butternut squash soup with whole grain bread. Dinner: Roasted chicken with sweet potato and Brussels sprouts. Snacks: Apple slices with almond butter, pear.',
            ru: 'Завтрак: тыквенная овсянка с корицей и пеканом. Обед: суп из мускатной тыквы с цельнозерновым хлебом. Ужин: запечённая курица с бататом и брюссельской капустой. Перекусы: ломтики яблока с миндальным маслом, груша.',
            kk: 'Таңғы ас: дарчын және пекан қосылған асқабақты сұлы ботқасы. Түскі ас: мускат асқабақ сорпасы, тұтас дәнді нанмен. Кешкі ас: пеште піскен тауық, батат және Брюссель қырыққабаты. Тіскебасар: бадам майымен алма тілімдері, алмұрт.',
            fr: 'Petit-déj : flocons potiron cannelle pécan. Déjeuner : soupe courge, pain complet. Dîner : poulet, patate douce, choux. Collations : pomme amande, poire.',
            de: `Frühstück: Kürbis-Haferflocken mit Zimt und Pekannüssen. Mittagessen: Butternusskürbissuppe mit Vollkornbrot. Abendessen: Gebratenes Hähnchen mit Süßkartoffeln und Rosenkohl. Snacks: Apfelscheiben mit Mandelbutter, Birne.`,
            es: `Desayuno: Avena con calabaza, canela y nueces. Almuerzo: Sopa de calabaza con pan integral. Cena: Pollo asado con boniato y coles de Bruselas. Meriendas: Rodajas de manzana con mantequilla de almendras, pera.`
        },
        notFor: null,
        suitableFor: ['seasonal', 'fiber', 'antioxidants'],
        notSuitableFor: [],
        allowedFoods: ['pumpkin', 'squash', 'sweet_potato', 'apples', 'pears', 'whole_grains', 'nuts', 'lean_meat'],
        restrictedFoods: ['excessive_cold_foods', 'out_of_season_produce'],
        macroSplit: { protein: 20, carbs: 50, fat: 30 },
        tips: {
            en: ['Visit farmers markets for local autumn produce', 'Roast vegetables to bring out natural sweetness', 'Make apple sauce or pumpkin puree to freeze'],
            ru: ['Посетите фермерские рынки за местными осенними продуктами', 'Запекайте овощи для раскрытия натуральной сладости', 'Сделайте яблочное пюре или тыквенное пюре для заморозки'],
            kk: ['Жергілікті күзгі өнімдер үшін фермерлер базарына барыңыз', 'Табиғи тәттілікті ашу үшін көкөністерді пісіріңіз', 'Мұздату үшін алма пюресі немесе асқабақ пюресін жасаңыз'],
            fr: ['Marchés pour produits d\'automne', 'Rôtir les légumes pour la douceur', 'Compote ou purée potiron à congeler'],
            de: [
                `Besuchen Sie Bauernmärkte für lokale Herbstprodukte`,
                `Rösten Sie Gemüse, um die natürliche Süße hervorzuheben`,
                `Bereiten Sie Apfelmus oder Kürbispüree zum Einfrieren zu`
                ],
            es: [
                `Visite los mercados de agricultores para comprar productos locales de otoño.`,
                `Verduras asadas para resaltar el dulzor natural.`,
                `Prepara salsa de manzana o puré de calabaza para congelar.`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=800&q=80',
        color: '#FF9800',
        isFeatured: false,
        popularityScore: 60,
        tags: ['seasonal', 'autumn', 'harvest', 'pumpkin'],
    },

    // 34) Lean Bulk (LEAN_BULK)
    {
        slug: 'lean-bulk',
        name: { en: 'Lean Bulk', ru: 'Сухой набор массы', kk: 'Құрғақ масса жинау', fr: 'Prise de masse sèche',
            de: `Schlanke Masse`,
            es: `Masa magra`
        },
        description: { en: 'Strategic caloric surplus (200-350 above TDEE) to maximize muscle gain while minimizing fat. Unlike dirty bulking, lean bulk optimizes the muscle-to-fat ratio.', ru: 'Стратегический профицит калорий (200-350 выше TDEE) для максимального набора мышц с минимальным жиром.', kk: 'Бұлшықет жинауды максималдау үшін стратегиялық калория профициті (TDEE-ден 200-350 жоғары).', fr: 'Surplus calorique stratégique (200-350 au-dessus du TDEE) pour maximiser le gain musculaire.',
            de: `Strategischer Kalorienüberschuss (200–350 über TDEE), um den Muskelaufbau zu maximieren und gleichzeitig Fett zu minimieren. Im Gegensatz zum Dirty Bulking optimiert Lean Bulk das Muskel-Fett-Verhältnis.`,
            es: `Superávit calórico estratégico (200-350 por encima del TDEE) para maximizar la ganancia muscular y minimizar la grasa. A diferencia del volumen sucio, el volumen magro optimiza la relación músculo-grasa.`
        },
        shortDescription: { en: 'Build muscle without the fat', ru: 'Набирайте мышцы без жира', kk: 'Майсыз бұлшықет жинаңыз', fr: 'Muscle sans graisse',
            de: `Bauen Sie Muskeln ohne Fett auf`,
            es: `Desarrolla músculo sin grasa`
        },
        category: 'sports',
        type: 'SPORTS',
        difficulty: 'MODERATE',
        duration: 14,
        uiGroup: 'Performance',
        evidenceLevel: 'strong',
        disclaimerKey: null,
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'TDEE + 200-350 calories (not more). More surplus = more fat, not more muscle',
                'Protein: 1.6-2.2g/kg bodyweight daily - same target as cutting',
                'Carbs are training fuel: fill most surplus with carbs, especially around workouts',
                'Largest meals pre-workout (2-3h before) and post-workout (within 1h)',
                'Progressive overload mandatory: track every workout, add reps or weight weekly',
                'Weigh daily (morning, fasted), track weekly average. >0.5% BW/week → reduce surplus',
            ],
            ru: [
                'TDEE + 200-350 калорий (не больше). Больше профицит = больше жира, не мышц',
                'Белок: 1.6-2.2г/кг массы тела ежедневно - та же цель, что и на сушке',
                'Углеводы - топливо для тренировок: заполняйте профицит углеводами, особенно вокруг тренировок',
                'Самые большие приёмы пищи до тренировки (2-3ч) и после (в течение 1ч)',
                'Прогрессивная нагрузка обязательна: записывайте каждую тренировку, добавляйте объём',
                'Взвешивайтесь ежедневно (утро, натощак), отслеживайте средний вес за неделю',
            ],
            kk: [
                'TDEE + 200-350 калория (артық емес). Көп профицит = көп май, бұлшықет емес',
                'Ақуыз: күніне 1.6-2.2г/кг дене салмағы - кесу кезіндегідей мақсат',
                'Көмірсулар жаттығу отыны: профицитті көмірсулармен толтырыңыз, әсіресе жаттығу маңында',
                'Ең үлкен тамақ жаттығуға дейін (2-3 сағ) және кейін (1 сағ ішінде)',
                'Прогрессивті жүктеме міндетті: әр жаттығуды жазыңыз, көлем қосыңыз',
                'Күн сайын өлшеніңіз (таңертең, аш қарынға), апталық орташа салмақты бақылаңыз',
            ],
            fr: [
                'TDEE + 200-350 calories (pas plus). Plus de surplus = plus de gras, pas de muscle',
                'Protéines : 1.6-2.2g/kg poids corporel quotidien - même cible qu\'en sèche',
                'Glucides = carburant : remplir le surplus de glucides, surtout autour des entraînements',
                'Plus gros repas pré-entraînement (2-3h avant) et post-entraînement (dans 1h)',
                'Surcharge progressive obligatoire : noter chaque entraînement, ajouter reps ou charge',
                'Peser quotidiennement (matin, à jeun), suivre moyenne hebdomadaire',
            ],
            de: [
                `TDEE + 200-350 Kalorien (nicht mehr). Mehr Überschuss = mehr Fett, nicht mehr Muskeln`,
                `Protein: 1,6–2,2 g/kg Körpergewicht täglich – dasselbe Ziel wie beim Schneiden`,
                `Kohlenhydrate sind der Trainingstreibstoff: Füllen Sie die meisten Überschüsse mit Kohlenhydraten auf, insbesondere während des Trainings`,
                `Größte Mahlzeiten vor dem Training (2-3 Stunden vor) und nach dem Training (innerhalb von 1 Stunde)`,
                `Progressive Überlastung obligatorisch: Verfolgen Sie jedes Training, fügen Sie wöchentlich Wiederholungen oder Gewichte hinzu`,
                `Wiegen Sie täglich (morgens, nüchtern) und verfolgen Sie den Wochendurchschnitt. >0,5 % BW/Woche → Überschuss reduzieren`
                ],
            es: [
                `TDEE + 200-350 calorías (no más). Más excedente = más grasa, no más músculo`,
                `Proteína: 1,6-2,2 g/kg de peso corporal al día: el mismo objetivo que reducir`,
                `Los carbohidratos son combustible para el entrenamiento: llene la mayor parte del excedente con carbohidratos, especialmente durante los entrenamientos.`,
                `Comidas más abundantes antes del entrenamiento (2-3 h antes) y post-entrenamiento (dentro de 1 h)`,
                `Sobrecarga progresiva obligatoria: realice un seguimiento de cada entrenamiento, agregue repeticiones o peso semanalmente`,
                `Pésese diariamente (mañana, en ayunas), realice un seguimiento del promedio semanal. >0,5% BW/semana → reducir excedente`
                ]
        },
        dailyTracker: [
            { key: 'protein_target', label: { en: 'Protein target hit (1.8g+/kg)', ru: 'Цель белка достигнута (1.8г+/кг)', kk: 'Ақуыз мақсатына жетті (1.8г+/кг)', fr: 'Objectif protéines atteint (1.8g+/kg)',
                de: `Protein-Zieltreffer (1,8 g+/kg)`,
                es: `Objetivo de proteína alcanzado (1,8 g+/kg)`
            } },
            { key: 'caloric_surplus', label: { en: 'Caloric surplus maintained (200-350 above TDEE)', ru: 'Профицит калорий соблюдён (200-350 выше TDEE)', kk: 'Калория профициті сақталды (TDEE-ден 200-350)', fr: 'Surplus calorique maintenu (200-350 au-dessus TDEE)',
                de: `Kalorienüberschuss aufrechterhalten (200-350 über TDEE)`,
                es: `Se mantiene el superávit calórico (200-350 por encima del TDEE)`
            } },
            { key: 'pre_workout_meal', label: { en: 'Pre-workout meal eaten (2-3h before)', ru: 'Еда до тренировки (2-3ч до)', kk: 'Жаттығуға дейінгі тамақ (2-3 сағ бұрын)', fr: 'Repas pré-entraînement (2-3h avant)',
                de: `Mahlzeit vor dem Training eingenommen (2-3 Stunden vorher)`,
                es: `Comida pre-entrenamiento consumida (2-3h antes)`
            } },
            { key: 'post_workout', label: { en: 'Post-workout nutrition consumed (protein + carbs within 1h)', ru: 'Питание после тренировки (белок + углеводы в течение 1ч)', kk: 'Жаттығудан кейінгі тамақ (ақуыз + көмірсу 1 сағ ішінде)', fr: 'Nutrition post-entraînement (protéines + glucides dans 1h)',
                de: `Verzehrte Nahrung nach dem Training (Protein + Kohlenhydrate innerhalb einer Stunde)`,
                es: `Nutrición post-entrenamiento consumida (proteínas + carbohidratos en 1 hora)`
            } },
            { key: 'training', label: { en: 'Resistance training with progressive overload', ru: 'Силовая тренировка с прогрессией', kk: 'Прогрессивті жүктемемен күш жаттығуы', fr: 'Entraînement de résistance avec surcharge progressive',
                de: `Krafttraining mit fortschreitender Überlastung`,
                es: `Entrenamiento de resistencia con sobrecarga progresiva`
            } },
            { key: 'weight_tracked', label: { en: 'Weekly average weight tracked (daily weigh-ins)', ru: 'Средний вес за неделю отслежен (ежедневные взвешивания)', kk: 'Апталық орташа салмақ бақыланды (күнделікті өлшеу)', fr: 'Poids moyen hebdomadaire suivi (pesées quotidiennes)',
                de: `Wöchentliches Durchschnittsgewicht erfasst (tägliche Wiegungen)`,
                es: `Seguimiento del peso promedio semanal (pesaje diario)`
            } },
        ],
        sampleDay: {
            en: 'Breakfast: 4 eggs + oats + banana.\nLunch: rice + chicken breast + vegetables.\nPre-workout: rice cakes + honey + whey.\nPost-workout: protein shake + sweet potato.\nDinner: salmon + quinoa + salad.\nSnack: Greek yogurt + berries.',
            ru: 'Завтрак: 4 яйца + овсянка + банан.\nОбед: рис + куриная грудка + овощи.\nДо тренировки: рисовые хлебцы + мёд + сывороточный протеин.\nПосле тренировки: протеиновый коктейль + батат.\nУжин: лосось + киноа + салат.\nПерекус: греческий йогурт + ягоды.',
            kk: 'Таңғы ас: 4 жұмыртқа + сұлы + банан.\nТүскі ас: күріш + тауық төсі + көкөніс.\nЖаттығуға дейін: күріш нандары + бал + сарысу протеині.\nЖаттығудан кейін: протеин коктейлі + батат.\nКешкі ас: лосось + киноа + салат.\nТіскебасар: грек йогурты + жидек.',
            fr: 'Petit-déj : 4 œufs + flocons + banane.\nDéjeuner : riz + blanc de poulet + légumes.\nPré-entraînement : galettes de riz + miel + whey.\nPost-entraînement : shake protéiné + patate douce.\nDîner : saumon + quinoa + salade.\nCollation : yaourt grec + baies.',
            de: `Frühstück: 4 Eier + Haferflocken + Banane. 
Mittagessen: Reis + Hähnchenbrust + Gemüse. 
Vor dem Training: Reiskuchen + Honig + Molke. 
Nach dem Training: Proteinshake + Süßkartoffel. 
Abendessen: Lachs + Quinoa + Salat. 
Snack: Griechischer Joghurt + Beeren.`,
            es: `Desayuno: 4 huevos + avena + plátano. 
Almuerzo: arroz + pechuga de pollo + verduras. 
Pre-entrenamiento: tortas de arroz + miel + suero. 
Post-entrenamiento: batido de proteínas + boniato. 
Cena: salmón + quinoa + ensalada. 
Merienda: yogur griego + frutos rojos.`
        },
        notFor: {
            en: ['Diabetes - only with doctor', 'Eating disorders', 'Heart conditions'],
            ru: ['Диабет - только с врачом', 'РПП', 'Заболевания сердца'],
            kk: ['Диабет - тек дәрігермен', 'Тамақтану бұзылыстары', 'Жүрек аурулары'],
            fr: ['Diabète - avec médecin', 'Troubles alimentaires', 'Problèmes cardiaques'],
            de: [
                `Diabetes – nur beim Arzt`,
                `Essstörungen`,
                `Herzerkrankungen`
                ],
            es: [
                `Diabetes: sólo con el médico`,
                `Trastornos alimentarios`,
                `Condiciones del corazón`
                ]
        },
        suitableFor: ['muscle_gain', 'athletes', 'strength_training'],
        notSuitableFor: ['eating_disorders', 'diabetes_uncontrolled'],
        allowedFoods: ['lean_meat', 'fish', 'eggs', 'whole_grains', 'rice', 'sweet_potato', 'nuts', 'dairy', 'fruits'],
        restrictedFoods: ['excessive_junk', 'alcohol'],
        macroSplit: { protein: 31, carbs: 45, fat: 24 },
        tips: {
            en: ['Surplus of 200-350 only, not more', 'Track progressive overload in every workout', 'If gaining >0.5% BW/week, reduce surplus'],
            ru: ['Профицит 200-350, не больше', 'Отслеживайте прогрессию в каждой тренировке', 'Если набираете >0.5% массы/неделю, уменьшите профицит'],
            kk: ['Профицит тек 200-350, артық емес', 'Әр жаттығуда прогрессияны бақылаңыз', 'Аптасына >0.5% масса жинасаңыз, профицитті азайтыңыз'],
            fr: ['Surplus de 200-350 seulement', 'Suivre la surcharge progressive', 'Si gain >0.5% PC/semaine, réduire surplus'],
            de: [
                `Nur 200-350 Überschüsse, nicht mehr`,
                `Verfolgen Sie die fortschreitende Überlastung bei jedem Training`,
                `Bei einem Zuwachs von mehr als 0,5 % BW/Woche den Überschuss reduzieren`
                ],
            es: [
                `Excedente de 200-350 solamente, no más`,
                `Realice un seguimiento de la sobrecarga progresiva en cada entrenamiento`,
                `Si gana >0,5% BW/semana, reduzca el excedente`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
        color: '#4CAF50',
        isFeatured: false,
        popularityScore: 70,
        tags: ['muscle_gain', 'bulking', 'performance'],
    },

    // 35) Summer Fresh (SUMMER_FRESH)
    {
        slug: 'summer-fresh',
        name: { en: 'Summer Fresh', ru: 'Летняя свежесть', kk: 'Жазғы сергіту', fr: 'Fraîcheur estivale',
            de: `Sommerfrisch`,
            es: `Verano fresco`
        },
        description: { en: 'Light, hydrating meals for hot summer. Built around peak-season produce: berries, stone fruits, tomatoes, zucchini, watermelon, cucumbers, peppers, herbs.', ru: 'Лёгкие, увлажняющие блюда для жаркого лета. Основаны на сезонных продуктах: ягоды, косточковые, помидоры, кабачки, арбуз, огурцы, перец, зелень.', kk: 'Ыстық жазға арналған жеңіл, ылғалдандыратын тағамдар. Маусымдық өнімдерге негізделген: жидек, сүйекті жемістер, қызанақ, кабачок, қарбыз, қияр, бұрыш, шөптер.', fr: 'Repas légers et hydratants pour l\'été. Basés sur les produits de saison : baies, fruits à noyau, tomates, courgettes, pastèque, concombres.',
            de: `Leichte, feuchtigkeitsspendende Mahlzeiten für den heißen Sommer. Gebaut um Produkte der Hochsaison: Beeren, Steinobst, Tomaten, Zucchini, Wassermelone, Gurken, Paprika, Kräuter.`,
            es: `Comidas ligeras e hidratantes para el caluroso verano. Elaborado en torno a productos de temporada alta: bayas, frutas de hueso, tomates, calabacines, sandías, pepinos, pimientos y hierbas.`
        },
        shortDescription: { en: 'Fresh summer eating plan', ru: 'Свежий летний план питания', kk: 'Жазғы жаңа тамақтану жоспары', fr: 'Plan alimentaire estival frais',
            de: `Frischer Sommer-Ernährungsplan`,
            es: `Plan de alimentación fresco de verano`
        },
        category: 'modern',
        type: 'HEALTH',
        difficulty: 'EASY',
        duration: 14,
        uiGroup: 'Seasonal',
        evidenceLevel: 'low',
        disclaimerKey: null,
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'Hydrating foods every meal: cucumber, watermelon, tomatoes, zucchini, berries, citrus',
                'Lighter portions - respect reduced summer appetite. 3 light meals + snacks',
                'Raw/cold preparations: salads, smoothie bowls, gazpacho, cold soups, poke',
                'Grill instead of oven/stove - flavor without heating kitchen',
                'Seasonal berries and stone fruits daily at peak nutrition',
                'Hydration: 3+ liters water/day. Add electrolytes if sweating heavily',
            ],
            ru: [
                'Увлажняющие продукты в каждом приёме: огурцы, арбуз, помидоры, кабачки, ягоды',
                'Лёгкие порции - уважайте сниженный летний аппетит. 3 лёгких приёма + перекусы',
                'Сырые/холодные блюда: салаты, смузи-боулы, гаспачо, холодные супы',
                'Гриль вместо духовки/плиты - вкус без перегрева кухни',
                'Сезонные ягоды и косточковые фрукты ежедневно на пике питательности',
                'Гидратация: 3+ литра воды/день. Добавьте электролиты при интенсивном потоотделении',
            ],
            kk: [
                'Әр тамақта ылғалдандыратын өнімдер: қияр, қарбыз, қызанақ, кабачок, жидек',
                'Жеңіл порциялар - азайған жазғы тәбетті құрметтеңіз. 3 жеңіл тамақ + тіскебасар',
                'Шикі/суық дайындамалар: салаттар, смузи-боулдар, гаспачо, суық сорпалар',
                'Пеш/плита орнына гриль - асханаңызды қыздырмай дәм',
                'Маусымдық жидек пен сүйекті жемістер күнделікті қорек шыңында',
                'Гидратация: күніне 3+ литр су. Қатты терлесеңіз электролиттер қосыңыз',
            ],
            fr: [
                'Aliments hydratants à chaque repas : concombre, pastèque, tomates, courgettes, baies',
                'Portions légères - respecter l\'appétit réduit en été. 3 repas légers + collations',
                'Préparations crues/froides : salades, smoothie bowls, gaspacho, soupes froides',
                'Griller au lieu du four - saveur sans chauffer la cuisine',
                'Baies et fruits à noyau quotidiens en pleine saison',
                'Hydratation : 3+ litres eau/jour. Ajouter électrolytes si forte transpiration',
            ],
            de: [
                `Feuchtigkeitsspendende Lebensmittel zu jeder Mahlzeit: Gurke, Wassermelone, Tomaten, Zucchini, Beeren, Zitrusfrüchte`,
                `Leichtere Portionen – respektieren Sie den reduzierten Appetit im Sommer. 3 leichte Mahlzeiten + Snacks`,
                `Rohe/kalte Zubereitungen: Salate, Smoothie-Bowls, Gazpacho, kalte Suppen, Poke`,
                `Grillen statt Ofen/Herd – Würzen ohne Heizung der Küche`,
                `Täglich saisonale Beeren und Steinfrüchte zur Spitzenernährung`,
                `Flüssigkeitszufuhr: 3+ Liter Wasser/Tag. Bei starkem Schwitzen Elektrolyte hinzufügen`
                ],
            es: [
                `Alimentos hidratantes en cada comida: pepino, sandía, tomates, calabacines, frutos rojos, cítricos.`,
                `Porciones más ligeras: respete el apetito reducido del verano. 3 comidas ligeras + snacks`,
                `Preparaciones crudas/frías: ensaladas, smoothie bowls, gazpacho, sopas frías, poke`,
                `Grill en lugar de horno/estufa: sabor sin calentar la cocina`,
                `Bayas de temporada y frutas con hueso diariamente con una nutrición óptima`,
                `Hidratación: 3+ litros de agua/día. Agregue electrolitos si suda mucho`
                ]
        },
        dailyTracker: [
            { key: 'water_3l', label: { en: '3+ liters water consumed', ru: '3+ литра воды выпито', kk: '3+ литр су ішілді', fr: '3+ litres d\'eau consommés',
                de: `3+ Liter Wasser verbraucht`,
                es: `3+ litros de agua consumidos`
            } },
            { key: 'summer_fruit', label: { en: 'Seasonal summer fruit in meals', ru: 'Сезонные летние фрукты в еде', kk: 'Маусымдық жазғы жемістер тамақта', fr: 'Fruits d\'été de saison',
                de: `Saisonales Sommerobst in den Mahlzeiten`,
                es: `Fruta de temporada de verano en las comidas.`
            } },
            { key: 'hydrating_meal', label: { en: 'Light, hydrating meal consumed', ru: 'Лёгкое, увлажняющее блюдо', kk: 'Жеңіл, ылғалдандыратын тамақ', fr: 'Repas léger et hydratant',
                de: `Leichte, feuchtigkeitsspendende Mahlzeit`,
                es: `Consumo de comida ligera e hidratante.`
            } },
            { key: 'raw_veggies', label: { en: 'Raw or lightly cooked vegetables included', ru: 'Сырые или легко приготовленные овощи', kk: 'Шикі немесе аздап пісірілген көкөністер', fr: 'Légumes crus ou légèrement cuits',
                de: `Rohes oder leicht gegartes Gemüse inklusive`,
                es: `Verduras crudas o ligeramente cocidas incluidas.`
            } },
            { key: 'no_heavy', label: { en: 'No heavy fried or cream-based dishes', ru: 'Без тяжёлых жареных или сливочных блюд', kk: 'Ауыр қуырылған немесе кілегейлі тағамсыз', fr: 'Pas de plats lourds frits ou crémeux',
                de: `Keine stark frittierten oder cremigen Gerichte`,
                es: `No se permiten platos pesados ​​fritos o a base de crema.`
            } },
            { key: 'outdoor_activity', label: { en: 'Outdoor activity or movement completed', ru: 'Активность на свежем воздухе', kk: 'Ашық ауада белсенділік', fr: 'Activité en plein air',
                de: `Outdoor-Aktivität oder Bewegung abgeschlossen`,
                es: `Actividad o movimiento al aire libre completado`
            } },
        ],
        sampleDay: {
            en: 'Breakfast: Smoothie bowl (frozen berries, banana, yogurt, granola).\nLunch: Greek salad with grilled chicken.\nDinner: Grilled fish with zucchini and corn.\nSnacks: Watermelon, cucumber sticks, cold brew.',
            ru: 'Завтрак: Смузи боул (замороженные ягоды, банан, йогурт, гранола).\nОбед: Греческий салат с курицей-гриль.\nУжин: Рыба-гриль с кабачками и кукурузой.\nПерекусы: Арбуз, палочки огурца, колд-брю.',
            kk: 'Таңғы ас: Смузи боул (мұздатылған жидек, банан, йогурт, гранола).\nТүскі ас: Гриль тауықпен грек салаты.\nКешкі ас: Гриль балық, кабачок және жүгері.\nТіскебасар: Қарбыз, қияр таяқшалары, колд-брю.',
            fr: 'Petit-déj : Smoothie bowl (baies, banane, yaourt, granola).\nDéjeuner : Salade grecque, poulet grillé.\nDîner : Poisson grillé, courgettes, maïs.\nCollations : Pastèque, concombre, café froid.',
            de: `Frühstück: Smoothie-Bowl (gefrorene Beeren, Banane, Joghurt, Müsli). 
Mittagessen: Griechischer Salat mit gegrilltem Hähnchen. 
Abendessen: Gegrillter Fisch mit Zucchini und Mais. 
Snacks: Wassermelone, Gurkenstangen, Cold Brew.`,
            es: `Desayuno: Smoothie bowl (frutas congeladas, plátano, yogur, granola). 
Almuerzo: Ensalada griega con pollo a la parrilla. 
Cena: Pescado a la plancha con calabacín y maíz. 
Snacks: Sandía, palitos de pepino, cerveza fría.`
        },
        notFor: null,
        suitableFor: ['seasonal', 'hydration', 'light_eating'],
        notSuitableFor: [],
        allowedFoods: ['berries', 'watermelon', 'cucumber', 'tomatoes', 'zucchini', 'grilled_meat', 'fish', 'salads', 'smoothies'],
        restrictedFoods: ['heavy_cream_sauces', 'fried_foods', 'hot_stews'],
        macroSplit: { protein: 24, carbs: 50, fat: 26 },
        tips: {
            en: ['Stay hydrated - drink before you feel thirsty', 'Eat watermelon and cucumber daily for hydration', 'Grill outdoors to keep kitchen cool'],
            ru: ['Пейте до появления жажды', 'Ешьте арбуз и огурцы ежедневно для гидратации', 'Готовьте на гриле, чтобы не перегревать кухню'],
            kk: ['Шөлдемес бұрын су ішіңіз', 'Гидратация үшін күнделікті қарбыз бен қияр жеңіз', 'Асханаңызды қыздырмау үшін грильде дайындаңыз'],
            fr: ['S\'hydrater avant la soif', 'Pastèque et concombre quotidiens', 'Griller dehors pour garder la cuisine fraîche'],
            de: [
                `Bleiben Sie hydriert – trinken Sie, bevor Sie Durst verspüren`,
                `Essen Sie täglich Wassermelone und Gurke, um sich mit Feuchtigkeit zu versorgen`,
                `Grillen Sie im Freien, um die Küche kühl zu halten`
                ],
            es: [
                `Manténgase hidratado: beba antes de tener sed`,
                `Come sandía y pepino diariamente para hidratarte.`,
                `Asa al aire libre para mantener la cocina fresca`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80',
        color: '#00BCD4',
        isFeatured: false,
        popularityScore: 65,
        tags: ['seasonal', 'summer', 'hydrating', 'light'],
    },

    // ==================== AESTHETIC DIETS ====================

    // 34) Clean Girl Aesthetic
    {
        slug: 'clean-girl',
        name: { en: 'Clean Girl Aesthetic', ru: 'Clean Girl', kk: 'Clean Girl', fr: 'Clean Girl',
            de: `Saubere Mädchenästhetik`,
            es: `Chica Limpia Estética`
        },
        description: { en: 'A clean eating approach inspired by the clean girl aesthetic trend. Focus on simple, whole foods for glowing skin and natural energy.', ru: 'Чистое питание в стиле Clean Girl. Фокус на простых, цельных продуктах для сияющей кожи и естественной энергии.', kk: 'Clean Girl эстетикасынан шабыт алған таза тамақтану. Жарқыраған тері мен табиғи энергия үшін қарапайым, тұтас тағамдарға назар.', fr: 'Alimentation clean, style clean girl. Aliments simples et bruts pour teint lumineux et énergie.',
            de: `Ein Clean-Eating-Ansatz, inspiriert vom Clean-Girl-Ästhetiktrend. Konzentrieren Sie sich auf einfache, vollwertige Lebensmittel für strahlende Haut und natürliche Energie.`,
            es: `Un enfoque de alimentación limpia inspirado en la tendencia estética de las chicas limpias. Concéntrese en alimentos simples e integrales para tener una piel radiante y energía natural.`
        },
        shortDescription: { en: 'Simple, clean eating for natural glow', ru: 'Простое питание для естественного сияния', kk: 'Табиғи жарқырау үшін қарапайым тамақтану', fr: 'Alimentation simple et saine pour glow naturel',
            de: `Einfaches, sauberes Essen für natürlichen Glanz`,
            es: `Alimentación sencilla y limpia para un brillo natural`
        },
        category: 'inspired',
        type: 'LIFESTYLE',
        difficulty: 'EASY',
        duration: 30,
        uiGroup: 'Aesthetic',
        evidenceLevel: 'low',
        disclaimerKey: 'DISCLAIMER_GENERAL',
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'Choose whole, unprocessed foods',
                'Hydrate with water and herbal teas',
                'Focus on foods good for skin: avocado, berries, leafy greens',
                'Minimize sugar and processed snacks',
                'Eat mindfully with simple, beautiful presentation',
            ],
            ru: [
                'Выбирайте цельные, непереработанные продукты',
                'Пейте воду и травяные чаи',
                'Фокус на продуктах для кожи: авокадо, ягоды, зелень',
                'Минимизируйте сахар и переработанные снеки',
                'Ешьте осознанно с простой, красивой подачей',
            ],
            kk: [
                'Тұтас, өңделмеген тағамдарды таңдаңыз',
                'Су және шөп шайларын ішіңіз',
                'Теріге жақсы тағамдарға назар аударыңыз: авокадо, жидектер, жасылдар',
                'Қант пен өңделген тәттілерді азайтыңыз',
                'Қарапайым, әдемі безендірумен саналы тамақтаныңыз',
            ],
            fr: [
                'Aliments bruts, non transformés',
                'Eau et tisanes',
                'Bons pour la peau : avocat, baies, verts',
                'Sucre et snacks transformés minimaux',
                'Repas conscient, présentation soignée',
            ],
            de: [
                `Wählen Sie vollwertige, unverarbeitete Lebensmittel`,
                `Hydratieren Sie mit Wasser und Kräutertees`,
                `Konzentrieren Sie sich auf Lebensmittel, die gut für die Haut sind: Avocado, Beeren, Blattgemüse`,
                `Minimieren Sie Zucker und verarbeitete Snacks`,
                `Essen Sie achtsam mit einer einfachen, schönen Präsentation`
                ],
            es: [
                `Elija alimentos integrales y no procesados`,
                `Hidratarse con agua e infusiones.`,
                `Concéntrese en alimentos buenos para la piel: aguacate, bayas y verduras de hojas verdes.`,
                `Minimizar el azúcar y los snacks procesados`,
                `Coma conscientemente con una presentación sencilla y hermosa`
                ]
        },
        dailyTracker: [
            { key: 'whole_foods', label: { en: 'Ate whole, unprocessed foods', ru: 'Ел цельные продукты', kk: 'Тұтас тағамдар жедім', fr: 'Aliments bruts, non transformés',
                de: `Habe ganze, unverarbeitete Lebensmittel gegessen`,
                es: `Comió alimentos enteros y no procesados.`
            } },
            { key: 'water_8', label: { en: 'Water 8+ glasses', ru: 'Вода 8+ стаканов', kk: 'Су 8+ стақан', fr: 'Eau 8+ verres',
                de: `Wasser 8+ Gläser`,
                es: `Agua 8+ vasos`
            } },
            { key: 'skin_foods', label: { en: 'Skin-healthy foods (greens/berries)', ru: 'Продукты для кожи (зелень/ягоды)', kk: 'Теріге пайдалы тағамдар', fr: 'Aliments peau (verts/baies)',
                de: `Hautgesunde Lebensmittel (Gemüse/Beeren)`,
                es: `Alimentos saludables para la piel (verduras/bayas)`
            } },
            { key: 'no_processed', label: { en: 'No processed snacks', ru: 'Без переработанных снеков', kk: 'Өңделген тәттілерсіз', fr: 'Pas de snacks transformés',
                de: `Keine verarbeiteten Snacks`,
                es: `Sin bocadillos procesados`
            } },
            { key: 'mindful_meal', label: { en: 'Mindful, calm meal', ru: 'Осознанный, спокойный приём', kk: 'Саналы, тыныш тамақтану', fr: 'Repas conscient, calme',
                de: `Achtsames, ruhiges Essen`,
                es: `Comida consciente y tranquila`
            } },
        ],
        sampleDay: {
            en: 'Breakfast: Greek yogurt with berries and honey. Lunch: Avocado toast with poached eggs, side salad. Dinner: Grilled salmon with quinoa and roasted vegetables. Snacks: Green smoothie, almonds.',
            ru: 'Завтрак: греческий йогурт с ягодами и мёдом. Обед: тост с авокадо и яйцом-пашот, салат. Ужин: лосось-гриль с киноа и запечёнными овощами. Перекусы: зелёный смузи, миндаль.',
            kk: 'Таңғы ас: жидек және бал қосылған грек йогурты. Түскі ас: авокадо тосты, пашот жұмыртқа, салат. Кешкі ас: гриль лосось, киноа, пеште піскен көкөніс. Тіскебасар: жасыл смузи, бадам.',
            fr: 'Petit-déj : yaourt grec, baies, miel. Déjeuner : avocat toast, œufs pochés, salade. Dîner : saumon, quinoa, légumes rôtis. Collations : smoothie vert, amandes.',
            de: `Frühstück: Griechischer Joghurt mit Beeren und Honig. Mittagessen: Avocado-Toast mit pochierten Eiern, Beilagensalat. Abendessen: Gegrillter Lachs mit Quinoa und geröstetem Gemüse. Snacks: Grüner Smoothie, Mandeln.`,
            es: `Desayuno: yogur griego con frutos rojos y miel. Almuerzo: Tostada de aguacate con huevos escalfados, ensalada. Cena: Salmón a la plancha con quinoa y verduras asadas. Meriendas: Batido verde, almendras.`
        },
        notFor: null,
        suitableFor: ['skin_health', 'simple_eating', 'glow'],
        notSuitableFor: [],
        allowedFoods: ['avocado', 'berries', 'leafy_greens', 'fish', 'nuts', 'whole_grains', 'yogurt'],
        restrictedFoods: ['processed_foods', 'sugar', 'fried_foods', 'soda'],
        macroSplit: { protein: 20, carbs: 50, fat: 30 },
        tips: {
            en: ['Drink lemon water in the morning', 'Prep simple meals ahead', 'Focus on presentation - eat from nice dishes'],
            ru: ['Пейте воду с лимоном утром', 'Готовьте простые блюда заранее', 'Уделяйте внимание подаче - ешьте из красивой посуды'],
            kk: ['Таңертең лимонды су ішіңіз', 'Қарапайым тағамдарды алдын ала дайындаңыз', 'Безендіруге назар аударыңыз - әдемі ыдыстан жеңіз'],
            fr: ['Eau citronnée le matin', 'Préparer des repas simples', 'Belle présentation, jolie vaisselle'],
            de: [
                `Trinken Sie morgens Zitronenwasser`,
                `Bereiten Sie einfache Mahlzeiten im Voraus zu`,
                `Konzentrieren Sie sich auf die Präsentation – essen Sie von schönen Gerichten`
                ],
            es: [
                `Bebe agua con limón por la mañana.`,
                `Prepare comidas sencillas con antelación`,
                `Céntrese en la presentación: coma platos buenos`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
        color: '#F8BBD9',
        isFeatured: false,
        popularityScore: 70,
        tags: ['aesthetic', 'minimalist', 'clean_eating', 'skin'],
    },

    // 35) Vacation Vibes
    {
        slug: 'vacation-vibes',
        name: { en: 'Vacation Vibes', ru: 'Отпускное настроение', kk: 'Демалыс көңіл-күйі', fr: 'Vibes vacances',
            de: `Urlaubsstimmung`,
            es: `Vibraciones de vacaciones`
        },
        description: { en: 'Balanced eating inspired by Mediterranean vacation style - fresh, colorful, enjoyable. No stress, just pleasure.', ru: 'Сбалансированное питание в стиле средиземноморского отпуска - свежее, яркое, приятное. Без стресса, только удовольствие.', kk: 'Жерорта теңізі демалыс стиліндегі теңгерімді тамақтану - таза, түрлі-түсті, жағымды. Стресссіз, тек рахат.', fr: 'Alimentation type vacances méditerranéennes - frais, coloré, plaisir. Pas de stress.',
            de: `Ausgewogene Ernährung im mediterranen Urlaubsstil – frisch, farbenfroh, genussvoll. Kein Stress, nur Vergnügen.`,
            es: `Alimentación equilibrada inspirada en el estilo vacacional mediterráneo: fresca, colorida y agradable. Sin estrés, sólo placer.`
        },
        shortDescription: { en: 'Vacation-style balanced eating', ru: 'Питание в отпускном стиле', kk: 'Демалыс стиліндегі тамақтану', fr: 'Alimentation équilibrée style vacances',
            de: `Ausgewogenes Essen im Urlaubsstil`,
            es: `Alimentación equilibrada al estilo vacacional`
        },
        category: 'inspired',
        type: 'LIFESTYLE',
        difficulty: 'EASY',
        duration: 30,
        uiGroup: 'Aesthetic',
        evidenceLevel: 'low',
        disclaimerKey: 'DISCLAIMER_GENERAL',
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'Eat fresh, colorful Mediterranean-style foods',
                'Enjoy meals slowly, preferably outdoors or with nice ambiance',
                'Include seafood, olive oil, fresh vegetables',
                'Allow yourself treats in moderation',
                'Focus on enjoyment and relaxation, not restriction',
            ],
            ru: [
                'Ешьте свежие, яркие блюда в средиземноморском стиле',
                'Наслаждайтесь едой медленно, желательно на свежем воздухе',
                'Включайте морепродукты, оливковое масло, свежие овощи',
                'Позволяйте себе угощения в меру',
                'Фокус на удовольствии и расслаблении, не на ограничениях',
            ],
            kk: [
                'Таза, түрлі-түсті Жерорта теңізі стиліндегі тағамдар жеңіз',
                'Тамақты баяу, сыртта немесе жағымды атмосферада жеңіз',
                'Теңіз өнімдері, зәйтүн майы, таза көкөністерді қосыңыз',
                'Өзіңізге тәттілерге қалыпты түрде рұқсат етіңіз',
                'Шектеуге емес, рахат пен демалысқа назар аударыңыз',
            ],
            fr: [
                'Aliments frais, colorés style méditerranéen',
                'Manger lentement, dehors ou ambiance agréable',
                'Fruits de mer, huile d\'olive, légumes frais',
                'Plaisirs avec modération',
                'Plaisir et détente, pas restriction',
            ],
            de: [
                `Essen Sie frische, farbenfrohe Speisen im mediterranen Stil`,
                `Genießen Sie Ihre Mahlzeiten langsam, am besten im Freien oder in angenehmer Atmosphäre`,
                `Dazu gehören Meeresfrüchte, Olivenöl und frisches Gemüse`,
                `Gönnen Sie sich Leckereien in Maßen`,
                `Konzentrieren Sie sich auf Genuss und Entspannung, nicht auf Einschränkung`
                ],
            es: [
                `Consuma alimentos frescos y coloridos al estilo mediterráneo.`,
                `Disfrute de las comidas lentamente, preferiblemente al aire libre o en un ambiente agradable.`,
                `Incluya mariscos, aceite de oliva, verduras frescas.`,
                `Permítete golosinas con moderación`,
                `Céntrese en el disfrute y la relajación, no en las restricciones.`
                ]
        },
        dailyTracker: [
            { key: 'fresh_meal', label: { en: 'Fresh, colorful meal', ru: 'Свежий, яркий приём пищи', kk: 'Таза, түрлі-түсті тамақ', fr: 'Repas frais et coloré',
                de: `Frische, farbenfrohe Mahlzeit`,
                es: `Comida fresca y colorida`
            } },
            { key: 'slow_eating', label: { en: 'Ate slowly, enjoyed', ru: 'Ел медленно, наслаждаясь', kk: 'Баяу, ләззат алып жедім', fr: 'Mangé lentement, savouré',
                de: `Langsam gegessen, genossen`,
                es: `Comí despacio, disfruté`
            } },
            { key: 'seafood_olive', label: { en: 'Seafood or olive oil', ru: 'Морепродукты или оливковое масло', kk: 'Теңіз өнімі немесе зәйтүн майы', fr: 'Fruits de mer ou huile d\'olive',
                de: `Meeresfrüchte oder Olivenöl`,
                es: `Mariscos o aceite de oliva`
            } },
            { key: 'vegetables_3', label: { en: 'Fresh vegetables 3+', ru: 'Свежие овощи 3+', kk: 'Таза көкөністер 3+', fr: 'Légumes frais 3+',
                de: `Frisches Gemüse 3+`,
                es: `Verduras frescas 3+`
            } },
            { key: 'relaxed', label: { en: 'Relaxed, stress-free eating', ru: 'Расслабленный, без стресса', kk: 'Демалған, стресссіз тамақтану', fr: 'Détendu, sans stress',
                de: `Entspanntes, stressfreies Essen`,
                es: `Comer relajado y sin estrés`
            } },
        ],
        sampleDay: {
            en: 'Breakfast: Fresh fruit, croissant, coffee on the terrace. Lunch: Grilled fish with Greek salad, bread, wine. Dinner: Pasta with seafood, side salad. Snacks: Gelato, fresh figs, cheese.',
            ru: 'Завтрак: свежие фрукты, круассан, кофе на террасе. Обед: рыба-гриль с греческим салатом, хлеб, вино. Ужин: паста с морепродуктами, салат. Перекусы: джелато, инжир, сыр.',
            kk: 'Таңғы ас: таза жемістер, круассан, терассада кофе. Түскі ас: гриль балық, грек салаты, нан, шарап. Кешкі ас: теңіз өнімдерімен паста, салат. Тіскебасар: джелато, інжір, ірімшік.',
            fr: 'Petit-déj : fruits, croissant, café terrasse. Déjeuner : poisson grillé, salade grecque, pain, vin. Dîner : pâtes fruits de mer, salade. Collations : gelato, figues, fromage.',
            de: `Frühstück: Frisches Obst, Croissant, Kaffee auf der Terrasse. Mittagessen: Gegrillter Fisch mit griechischem Salat, Brot, Wein. Abendessen: Pasta mit Meeresfrüchten, Beilagensalat. Snacks: Gelato, frische Feigen, Käse.`,
            es: `Desayuno: Fruta fresca, croissant, café en la terraza. Almuerzo: Pescado a la parrilla con ensalada griega, pan, vino. Cena: Pasta con mariscos, ensalada. Snacks: Helado, higos frescos, queso.`
        },
        notFor: null,
        suitableFor: ['relaxed_eating', 'enjoyment', 'mediterranean'],
        notSuitableFor: [],
        allowedFoods: ['seafood', 'olive_oil', 'vegetables', 'fruits', 'bread', 'cheese', 'wine_moderate'],
        restrictedFoods: ['stress_eating', 'fast_food'],
        macroSplit: { protein: 20, carbs: 50, fat: 30 },
        tips: {
            en: ['Set the table nicely even at home', 'Eat outside when possible', 'No phones during meals'],
            ru: ['Красиво сервируйте стол даже дома', 'Ешьте на свежем воздухе когда возможно', 'Без телефонов во время еды'],
            kk: ['Үйде де дастарқанды әдемі жабыңыз', 'Мүмкіндігінше сыртта тамақтаныңыз', 'Тамақ кезінде телефонсыз'],
            fr: ['Bien mettre la table même chez soi', 'Manger dehors si possible', 'Pas de portables pendant les repas'],
            de: [
                `Decken Sie den Tisch auch zu Hause schön ein`,
                `Essen Sie nach Möglichkeit draußen`,
                `Keine Telefone während der Mahlzeiten`
                ],
            es: [
                `Pon la mesa bien incluso en casa`,
                `Coma afuera cuando sea posible`,
                `No hay teléfonos durante las comidas.`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800&q=80',
        color: '#29B6F6',
        isFeatured: false,
        popularityScore: 65,
        tags: ['aesthetic', 'mediterranean', 'relaxed', 'vacation'],
    },

    // ==================== OLD MONEY DIETS ====================

    // 36) Old Money Style
    {
        slug: 'old-money',
        name: { en: 'Old Money Classic', ru: 'Old Money классика', kk: 'Old Money классика', fr: 'Old Money classique',
            de: `Old-Money-Klassiker`,
            es: `Clásico del dinero viejo`
        },
        description: { en: 'Refined eating habits inspired by classic elegance - quality over quantity, proper portions, timeless foods.', ru: 'Изысканные привычки питания в духе классической элегантности - качество важнее количества, правильные порции, вечные продукты.', kk: 'Классикалық талғампаздық рухындағы нәзік тамақтану әдеттері - сан емес сапа, дұрыс порциялар, мәңгілік тағамдар.', fr: 'Qualité avant quantité, portions raisonnables, classiques intemporels.',
            de: `Raffinierte Essgewohnheiten, inspiriert von klassischer Eleganz – Qualität vor Quantität, richtige Portionen, zeitlose Lebensmittel.`,
            es: `Hábitos alimentarios refinados inspirados en la elegancia clásica: calidad sobre cantidad, porciones adecuadas, alimentos atemporales.`
        },
        shortDescription: { en: 'Classic elegant eating style', ru: 'Классический элегантный стиль питания', kk: 'Классикалық талғампаз тамақтану стилі', fr: 'Style alimentaire classique et élégant',
            de: `Klassisch eleganter Essstil`,
            es: `Estilo de comida clásico y elegante.`
        },
        category: 'inspired',
        type: 'LIFESTYLE',
        difficulty: 'EASY',
        duration: 30,
        uiGroup: 'Old Money',
        evidenceLevel: 'low',
        disclaimerKey: 'DISCLAIMER_GENERAL',
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'Choose quality over quantity in every meal',
                'Eat at proper times, no chaotic snacking',
                'Prefer classic, timeless dishes over trendy ones',
                'Practice proper table manners and mindful eating',
                'Moderate portions, never overeating',
            ],
            ru: [
                'Выбирайте качество, а не количество в каждом приёме пищи',
                'Ешьте в определённое время, без хаотичных перекусов',
                'Предпочитайте классические, проверенные блюда модным',
                'Практикуйте хорошие манеры за столом и осознанное питание',
                'Умеренные порции, никогда не переедайте',
            ],
            kk: [
                'Әр тамақта санды емес, сапаны таңдаңыз',
                'Белгілі уақытта тамақтаныңыз, ретсіз тіскебасарсыз',
                'Сәнді емес, классикалық, тексерілген тағамдарды таңдаңыз',
                'Дастарқан мәдениеті мен саналы тамақтануды ұстаныңыз',
                'Қалыпты порциялар, ешқашан артық жемеңіз',
            ],
            fr: [
                'Qualité avant quantité à chaque repas',
                'Heures fixes, pas de grignotage anarchique',
                'Plats classiques plutôt que tendance',
                'Bonne tenue à table, manger en conscience',
                'Portions modérées, jamais d\'excès',
            ],
            de: [
                `Wählen Sie bei jeder Mahlzeit Qualität statt Quantität`,
                `Essen Sie zu den richtigen Zeiten, kein chaotisches Naschen`,
                `Bevorzugen Sie klassische, zeitlose Gerichte gegenüber trendigen`,
                `Üben Sie sich an den richtigen Tischmanieren und achtsamem Essen`,
                `Mäßige Portionen, nie zu viel essen`
                ],
            es: [
                `Elige calidad sobre cantidad en cada comida`,
                `Coma en horarios adecuados, sin refrigerios caóticos.`,
                `Prefiera los platos clásicos y atemporales a los modernos.`,
                `Practique buenos modales en la mesa y una alimentación consciente.`,
                `Porciones moderadas, nunca comer en exceso.`
                ]
        },
        dailyTracker: [
            { key: 'quality_meal', label: { en: 'Quality over quantity', ru: 'Качество важнее количества', kk: 'Сапа санды маңызды', fr: 'Qualité avant quantité',
                de: `Qualität vor Quantität`,
                es: `Calidad sobre cantidad`
            } },
            { key: 'proper_times', label: { en: 'Ate at proper times', ru: 'Ел в определённое время', kk: 'Белгілі уақытта тамақтандым', fr: 'Repas aux heures fixes',
                de: `Zur richtigen Zeit gegessen`,
                es: `Comió en los momentos adecuados`
            } },
            { key: 'no_overeating', label: { en: 'No overeating', ru: 'Без переедания', kk: 'Артық жемедім', fr: 'Pas d\'excès',
                de: `Kein übermäßiges Essen`,
                es: `no comer en exceso`
            } },
            { key: 'table_manners', label: { en: 'Proper table manners', ru: 'Хорошие манеры за столом', kk: 'Дастарқан мәдениеті', fr: 'Bonne tenue à table',
                de: `Richtige Tischmanieren`,
                es: `Buenos modales en la mesa`
            } },
            { key: 'classic_foods', label: { en: 'Classic, quality foods', ru: 'Классические, качественные продукты', kk: 'Классикалық, сапалы тағамдар', fr: 'Plats classiques, qualité',
                de: `Klassische, hochwertige Lebensmittel`,
                es: `Alimentos clásicos y de calidad.`
            } },
        ],
        sampleDay: {
            en: 'Breakfast: Soft-boiled eggs, toast with butter, fresh juice. Lunch: Grilled salmon, steamed vegetables, sparkling water. Dinner: Roast chicken, garden salad, one glass of wine. Snack: Fresh fruit, small cheese plate.',
            ru: 'Завтрак: яйца всмятку, тост с маслом, свежий сок. Обед: лосось-гриль, овощи на пару, минеральная вода. Ужин: запечённая курица, салат из сада, бокал вина. Перекус: свежие фрукты, небольшая сырная тарелка.',
            kk: 'Таңғы ас: жұмсақ пісірілген жұмыртқа, майлы тост, таза шырын. Түскі ас: гриль лосось, бумен піскен көкөніс, минералды су. Кешкі ас: пеште піскен тауық, бақша салаты, бір бокал шарап. Тіскебасар: таза жеміс, кішкене ірімшік табақшасы.',
            fr: 'Petit-déj : œufs mollets, toast beurre, jus. Déjeuner : saumon grillé, légumes vapeur, eau pétillante. Dîner : poulet rôti, salade, un verre de vin. Collation : fruits, plateau fromages.',
            de: `Frühstück: Weichgekochte Eier, Toast mit Butter, frischer Saft. Mittagessen: Gegrillter Lachs, gedünstetes Gemüse, Mineralwasser. Abendessen: Brathähnchen, Gartensalat, ein Glas Wein. Snack: Frisches Obst, kleine Käseplatte.`,
            es: `Desayuno: Huevos pasados ​​por agua, tostadas con mantequilla, jugo natural. Almuerzo: Salmón a la plancha, verduras al vapor, agua con gas. Cena: Pollo asado, ensalada de la huerta, una copa de vino. Merienda: fruta fresca, plato pequeño de queso.`
        },
        notFor: null,
        suitableFor: ['mindful_eating', 'portion_control', 'elegance'],
        notSuitableFor: [],
        allowedFoods: ['quality_proteins', 'vegetables', 'fruits', 'whole_grains', 'cheese', 'wine_moderate'],
        restrictedFoods: ['fast_food', 'processed_foods', 'overeating', 'chaotic_snacking'],
        macroSplit: { protein: 25, carbs: 45, fat: 30 },
        tips: {
            en: ['Use proper cutlery and cloth napkins', 'Never eat standing up', 'Quality restaurants over quantity of meals'],
            ru: ['Используйте правильные приборы и тканевые салфетки', 'Никогда не ешьте стоя', 'Качественные рестораны важнее количества еды'],
            kk: ['Дұрыс аспаптар мен мата майлықтарды пайдаланыңыз', 'Ешқашан тұрып жемеңіз', 'Тамақ санынан сапалы мейрамханалар маңызды'],
            fr: ['Couverts et serviettes en tissu', 'Ne jamais manger debout', 'Qualité des restaurants avant quantité'],
            de: [
                `Verwenden Sie geeignetes Besteck und Stoffservietten`,
                `Essen Sie niemals im Stehen`,
                `Qualitätsrestaurants statt Quantität an Mahlzeiten`
                ],
            es: [
                `Utilice cubiertos y servilletas de tela adecuados.`,
                `Nunca comas de pie`,
                `Restaurantes de calidad sobre cantidad de comidas.`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
        color: '#8D6E63',
        isFeatured: false,
        popularityScore: 70,
        tags: ['old_money', 'elegant', 'mindful', 'classic'],
    },

    // 37) Country Club Breakfast
    {
        slug: 'country-club-breakfast',
        name: { en: 'Country Club Breakfast', ru: 'Завтрак в загородном клубе', kk: 'Country Club таңғы асы', fr: 'Petit-déj Country Club',
            de: `Country-Club-Frühstück`,
            es: `Desayuno en el club de campo`
        },
        description: { en: 'Morning rituals inspired by country club traditions. Proper breakfast as the foundation of a refined day.', ru: 'Утренние ритуалы в духе традиций загородных клубов. Правильный завтрак как основа изысканного дня.', kk: 'Country club дәстүрлерінен шабыт алған таңғы рәсімдер. Талғампаз күннің негізі ретінде дұрыс таңғы ас.', fr: 'Rituels matinaux style country club. Un vrai petit-déj comme base de la journée.',
            de: `Morgenrituale, inspiriert von Country-Club-Traditionen. Das richtige Frühstück als Grundlage für einen gelungenen Tag.`,
            es: `Rituales matutinos inspirados en las tradiciones de los clubes de campo. Un desayuno adecuado como base de un día refinado.`
        },
        shortDescription: { en: 'Elegant morning rituals', ru: 'Элегантные утренние ритуалы', kk: 'Талғампаз таңғы рәсімдер', fr: 'Rituels matinaux élégants',
            de: `Elegante Morgenrituale`,
            es: `Rituales matutinos elegantes`
        },
        category: 'inspired',
        type: 'LIFESTYLE',
        difficulty: 'EASY',
        duration: 21,
        uiGroup: 'Old Money',
        evidenceLevel: 'low',
        disclaimerKey: 'DISCLAIMER_GENERAL',
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'Wake up at a consistent, reasonable hour',
                'Always have a proper sit-down breakfast',
                'Include protein, fruit, and quality carbs',
                'No phones during breakfast - read instead',
                'Take your time, never rush',
            ],
            ru: [
                'Просыпайтесь в одно и то же разумное время',
                'Всегда завтракайте сидя за столом',
                'Включайте белок, фрукты и качественные углеводы',
                'Без телефона за завтраком - лучше читайте',
                'Не торопитесь, ешьте спокойно',
            ],
            kk: [
                'Бір қалыпты, ақылға қонымды уақытта оянсыз',
                'Әрқашан дастарқан басында отырып таңғы ас ішіңіз',
                'Ақуыз, жеміс және сапалы көмірсуларды қосыңыз',
                'Таңғы аста телефонсыз - оның орнына оқыңыз',
                'Асықпаңыз, тыныш тамақтаныңыз',
            ],
            fr: [
                'Réveil à heure régulière',
                'Toujours petit-déj assis à table',
                'Protéines, fruit, glucides de qualité',
                'Pas de téléphone - lire à la place',
                'Prendre son temps, ne pas se presser',
            ],
            de: [
                `Wachen Sie zu einer gleichmäßigen, angemessenen Zeit auf`,
                `Gönnen Sie sich immer ein ordentliches Frühstück im Sitzen`,
                `Fügen Sie Eiweiß, Obst und hochwertige Kohlenhydrate hinzu`,
                `Keine Telefone beim Frühstück – lesen Sie stattdessen`,
                `Nehmen Sie sich Zeit, beeilen Sie sich nicht`
                ],
            es: [
                `Despiértate a una hora constante y razonable.`,
                `Desayuna siempre bien sentado`,
                `Incluye proteínas, frutas y carbohidratos de calidad.`,
                `No hay teléfonos durante el desayuno; mejor lee`,
                `Tómate tu tiempo, nunca te apresures`
                ]
        },
        dailyTracker: [
            { key: 'proper_breakfast', label: { en: 'Proper sit-down breakfast', ru: 'Завтрак сидя за столом', kk: 'Дастарқан басында таңғы ас', fr: 'Petit-déj assis à table',
                de: `Richtiges Frühstück im Sitzen`,
                es: `Desayuno adecuado para sentarse`
            } },
            { key: 'protein_included', label: { en: 'Protein included', ru: 'Белок включён', kk: 'Ақуыз қосылған', fr: 'Protéines incluses',
                de: `Protein enthalten`,
                es: `Proteína incluida`
            } },
            { key: 'no_phone', label: { en: 'No phone during breakfast', ru: 'Без телефона за завтраком', kk: 'Таңғы аста телефонсыз', fr: 'Pas de téléphone au petit-déj',
                de: `Kein Telefon während des Frühstücks`,
                es: `Sin teléfono durante el desayuno.`
            } },
            { key: 'fruit_included', label: { en: 'Fresh fruit included', ru: 'Свежие фрукты включены', kk: 'Таза жеміс қосылған', fr: 'Fruits frais inclus',
                de: `Frisches Obst inklusive`,
                es: `Fruta fresca incluida`
            } },
            { key: 'no_rush', label: { en: 'No rushing', ru: 'Без спешки', kk: 'Асықпау', fr: 'Sans se presser',
                de: `Keine Eile`,
                es: `Sin prisas`
            } },
        ],
        sampleDay: {
            en: 'Breakfast: Eggs Benedict with smoked salmon, fresh orange juice, coffee, fresh berries. Or: Omelette with herbs, toast, fruit plate.',
            ru: 'Завтрак: яйца Бенедикт с копчёным лососем, свежий апельсиновый сок, кофе, свежие ягоды. Или: омлет с травами, тост, фруктовая тарелка.',
            kk: 'Таңғы ас: ысталған лосось қосылған Бенедикт жұмыртқасы, таза апельсин шырыны, кофе, таза жидектер. Немесе: шөптермен омлет, тост, жеміс табағы.',
            fr: 'Œufs Bénédict saumon fumé, jus d\'orange, café, baies. Ou : omelette aux herbes, toast, plateau de fruits.',
            de: `Frühstück: Eggs Benedict mit geräuchertem Lachs, frischer Orangensaft, Kaffee, frische Beeren. Oder: Omelett mit Kräutern, Toast, Obstteller.`,
            es: `Desayuno: huevos benedictinos con salmón ahumado, zumo de naranja natural, café y frutos rojos frescos. O: tortilla con hierbas, tostadas, plato de frutas.`
        },
        notFor: null,
        suitableFor: ['morning_routine', 'elegance', 'mindful'],
        notSuitableFor: [],
        allowedFoods: ['eggs', 'smoked_salmon', 'fresh_juice', 'coffee', 'berries', 'toast', 'butter'],
        restrictedFoods: ['skipping_breakfast', 'fast_food_breakfast', 'eating_standing'],
        macroSplit: { protein: 30, carbs: 40, fat: 30 },
        tips: {
            en: ['Set the table properly even when alone', 'Fresh flowers on the breakfast table', 'Classical music or silence'],
            ru: ['Накрывайте стол правильно даже в одиночестве', 'Свежие цветы на столе', 'Классическая музыка или тишина'],
            kk: ['Жалғыз болсаңыз да дастарқанды дұрыс жабыңыз', 'Дастарқанға таза гүлдер', 'Классикалық музыка немесе тыныштық'],
            fr: ['Mettre la table même seul', 'Fleurs fraîches sur la table', 'Musique classique ou silence'],
            de: [
                `Decken Sie den Tisch auch alleine richtig ein`,
                `Frische Blumen auf dem Frühstückstisch`,
                `Klassische Musik oder Stille`
                ],
            es: [
                `Poner la mesa correctamente incluso cuando esté solo.`,
                `Flores frescas en la mesa del desayuno.`,
                `Música clásica o silencio`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&q=80',
        color: '#795548',
        isFeatured: false,
        popularityScore: 55,
        tags: ['old_money', 'breakfast', 'morning', 'elegant'],
    },

    // 38) Sunday Brunch
    {
        slug: 'sunday-brunch',
        name: { en: 'Sunday Brunch', ru: 'Воскресный бранч', kk: 'Жексенбілік бранч', fr: 'Brunch du dimanche',
            de: `Sonntagsbrunch`,
            es: `Brunch dominical`
        },
        description: {
            en: 'The art of leisurely Sunday brunch - late morning, good company, quality food, no rush.', ru: 'Искусство неспешного воскресного бранча - позднее утро, хорошая компания, качественная еда, без спешки.', kk: 'Баяу жексенбілік бранч өнері - кешкі таң, жақсы серіктестік, сапалы тағам, асықпау.', fr: 'L\'art du brunch dominical tranquille.',
            de: `Die Kunst des gemütlichen Sonntagsbrunchs – am späten Vormittag, in guter Gesellschaft, gutes Essen, keine Hektik.`,
            es: `El arte del tranquilo brunch dominical: tarde en la mañana, buena compañía, comida de calidad, sin prisas.`
        },
        shortDescription: { en: 'Leisurely brunch tradition', ru: 'Традиция неспешного бранча', kk: 'Баяу бранч дәстүрі', fr: 'Tradition brunch tranquille',
            de: `Gemütliche Brunch-Tradition`,
            es: `Tradición de brunch tranquila`
        },
        category: 'inspired',
        type: 'LIFESTYLE',
        difficulty: 'EASY',
        duration: 14,
        uiGroup: 'Old Money',
        evidenceLevel: 'low',
        disclaimerKey: 'DISCLAIMER_GENERAL',
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'Reserve Sunday (or one weekend day) for leisurely brunch',
                'Combine breakfast and lunch into one refined meal',
                'Include both sweet and savory elements',
                'Enjoy with family or close friends',
                'Take at least 1-2 hours for the meal',
            ],
            ru: [
                'Посвятите воскресенье (или один день выходных) неспешному бранчу',
                'Объедините завтрак и обед в один изысканный приём',
                'Включите и сладкое, и солёное',
                'Наслаждайтесь с семьёй или близкими друзьями',
                'Отведите на приём пищи минимум 1-2 часа',
            ],
            kk: [
                'Жексенбіні (немесе бір демалыс күнін) баяу бранчқа арнаңыз',
                'Таңғы ас пен түскі асты бір нәзік тамаққа біріктіріңіз',
                'Тәтті де, тұзды да элементтерді қосыңыз',
                'Отбасымен немесе жақын достарыңызбен ләззат алыңыз',
                'Тамаққа кемінде 1-2 сағат бөліңіз',
            ],
            fr: [
                'Réserver le dimanche (ou un jour weekend) au brunch',
                'Combiner petit-déj et déjeuner en un repas soigné',
                'Sucré et salé',
                'En famille ou entre amis',
                'Au moins 1–2 h pour le repas',
            ],
            de: [
                `Reservieren Sie den Sonntag (oder einen Wochenendtag) für einen gemütlichen Brunch`,
                `Kombinieren Sie Frühstück und Mittagessen zu einer raffinierten Mahlzeit`,
                `Fügen Sie sowohl süße als auch herzhafte Elemente hinzu`,
                `Genießen Sie es mit der Familie oder engen Freunden`,
                `Nehmen Sie sich für die Mahlzeit mindestens 1-2 Stunden Zeit`
                ],
            es: [
                `Reserve el domingo (o un día de fin de semana) para un brunch tranquilo`,
                `Combine el desayuno y el almuerzo en una comida refinada`,
                `Incluye elementos dulces y salados.`,
                `Disfruta con la familia o amigas cercanas`,
                `Tómese al menos 1-2 horas para la comida.`
                ]
        },
        dailyTracker: [
            { key: 'leisurely_meal', label: { en: 'Leisurely, unhurried meal', ru: 'Неспешный приём пищи', kk: 'Баяу, асықпаған тамақ', fr: 'Repas tranquille, sans précipitation',
                de: `Gemütliches, entspanntes Essen`,
                es: `Comida tranquila y sin prisas.`
            } },
            { key: 'quality_food', label: { en: 'Quality, refined food', ru: 'Качественная, изысканная еда', kk: 'Сапалы, нәзік тағам', fr: 'Qualité, raffiné',
                de: `Hochwertiges, raffiniertes Essen`,
                es: `Comida refinada y de calidad.`
            } },
            { key: 'good_company', label: { en: 'Good company', ru: 'Хорошая компания', kk: 'Жақсы серіктестік', fr: 'Bonne compagnie',
                de: `Gute Gesellschaft`,
                es: `buena compañia`
            } },
            { key: 'balanced_plate', label: { en: 'Balanced plate', ru: 'Сбалансированная тарелка', kk: 'Теңгерімді тәрелке', fr: 'Assiette équilibrée',
                de: `Ausgewogene Platte`,
                es: `plato equilibrado`
            } },
            { key: 'no_phones', label: { en: 'No phones at table', ru: 'Без телефонов за столом', kk: 'Дастарқанда телефонсыз', fr: 'Pas de portables à table',
                de: `Keine Telefone am Tisch`,
                es: `No hay teléfonos en la mesa.`
            } },
        ],
        sampleDay: {
            en: 'Brunch: Eggs any style, smoked salmon, fresh bread, cheese selection, fruit plate, pastry, fresh juice, champagne or mimosa (optional). Duration: 2 hours.',
            ru: 'Бранч: яйца в любом виде, копчёный лосось, свежий хлеб, сырная тарелка, фрукты, выпечка, свежий сок, шампанское или мимоза (опционально). Продолжительность: 2 часа.',
            kk: 'Бранч: кез келген түрдегі жұмыртқа, ысталған лосось, таза нан, ірімшік таңдауы, жеміс табағы, тоқаш, таза шырын, шампанское немесе мимоза (қалауы бойынша). Ұзақтығы: 2 сағат.',
            fr: 'Brunch : œufs, saumon fumé, pain, plateau fromages, fruits, viennoiserie, jus, champagne ou mimosa (optionnel). Durée : 2 h.',
            de: `Brunch: Eggs any style, smoked salmon, fresh bread, cheese selection, fruit plate, pastry, fresh juice, champagne or mimosa (optional). Duration: 2 hours.`,
            es: `Brunch: Huevos al gusto, salmón ahumado, pan fresco, selección de quesos, plato de frutas, pastelería, jugo fresco, champagne o mimosa (opcional). Duración: 2 horas.`
        },
        notFor: null,
        suitableFor: ['weekend', 'social', 'relaxed', 'elegance'],
        notSuitableFor: [],
        allowedFoods: ['eggs', 'salmon', 'bread', 'cheese', 'fruits', 'pastry', 'champagne_moderate'],
        restrictedFoods: ['rushing', 'eating_alone_always', 'fast_food'],
        macroSplit: { protein: 25, carbs: 45, fat: 30 },
        tips: {
            en: ['Invite friends or family', 'Use nice tableware', 'Make it a weekly ritual'],
            ru: ['Приглашайте друзей или семью', 'Используйте красивую посуду', 'Сделайте это еженедельным ритуалом'],
            kk: ['Достар немесе отбасын шақырыңыз', 'Әдемі ыдыс-аяқ қолданыңыз', 'Апталық рәсімге айналдырыңыз'],
            fr: ['Inviter amis ou famille', 'Belle vaisselle', 'Rituel hebdomadaire'],
            de: [
                `Laden Sie Freunde oder Familie ein`,
                `Verwenden Sie schönes Geschirr`,
                `Machen Sie daraus ein wöchentliches Ritual`
                ],
            es: [
                `Invitar a amigas o familiares`,
                `Usa vajilla bonita`,
                `Hazlo un ritual semanal`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
        color: '#A1887F',
        isFeatured: false,
        popularityScore: 60,
        tags: ['old_money', 'brunch', 'weekend', 'social'],
    },

    // 39) Yacht Week
    {
        slug: 'yacht-week',
        name: { en: 'Yacht Week', ru: 'Яхт-неделя', kk: 'Яхта апталығы', fr: 'Yacht Week',
            de: `Yachtwoche`,
            es: `Semana del yate`
        },
        description: { en: 'Eating inspired by yacht lifestyle - light, fresh, Mediterranean-influenced, always elegant.', ru: 'Питание в духе яхтенного образа жизни - лёгкое, свежее, со средиземноморским влиянием, всегда элегантно.', kk: 'Яхта өмір салтынан шабыт алған тамақтану - жеңіл, таза, Жерорта теңізі әсерімен, әрқашан талғампаз.', fr: 'Style yacht - léger, frais, influence méditerranéenne, toujours élégant.',
            de: `Essen inspiriert vom Yacht-Lifestyle – leicht, frisch, mediterran beeinflusst, immer elegant.`,
            es: `Comer inspirado en el estilo de vida de los yates: ligero, fresco, con influencia mediterránea, siempre elegante.`
        },
        shortDescription: { en: 'Elegant seaside eating', ru: 'Элегантное питание у моря', kk: 'Талғампаз теңіз жағасы тамағы', fr: 'Alimentation élégante bord de mer',
            de: `Elegantes Essen am Meer`,
            es: `Comer elegante junto al mar`
        },
        category: 'inspired',
        type: 'LIFESTYLE',
        difficulty: 'EASY',
        duration: 14,
        uiGroup: 'Old Money',
        evidenceLevel: 'low',
        disclaimerKey: 'DISCLAIMER_GENERAL',
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'Focus on fresh seafood and fish',
                'Light, small portions throughout the day',
                'Mediterranean-style: olive oil, vegetables, herbs',
                'Stay hydrated in the sun',
                'Elegant but not heavy dinners',
            ],
            ru: [
                'Фокус на свежих морепродуктах и рыбе',
                'Лёгкие, небольшие порции в течение дня',
                'Средиземноморский стиль: оливковое масло, овощи, травы',
                'Пейте много воды на солнце',
                'Элегантные, но не тяжёлые ужины',
            ],
            kk: [
                'Таза теңіз өнімдері мен балыққа назар аударыңыз',
                'Күн бойы жеңіл, кішкене порциялар',
                'Жерорта теңізі стилі: зәйтүн майы, көкөністер, шөптер',
                'Күн астында көп су ішіңіз',
                'Талғампаз, бірақ ауыр емес кешкі астар',
            ],
            fr: [
                'Focus fruits de mer et poisson frais',
                'Portions légères tout au long de la journée',
                'Style méditerranéen : huile d\'olive, légumes, herbes',
                'Bien s\'hydrater au soleil',
                'Dîners élégants mais pas lourds',
            ],
            de: [
                `Konzentrieren Sie sich auf frische Meeresfrüchte und Fisch`,
                `Leichte, kleine Portionen über den Tag verteilt`,
                `Mediterran: Olivenöl, Gemüse, Kräuter`,
                `Bleiben Sie in der Sonne ausreichend hydriert`,
                `Elegante, aber nicht schwere Abendessen`
                ],
            es: [
                `Centrarse en mariscos y pescados frescos.`,
                `Porciones pequeñas y ligeras durante todo el día.`,
                `Estilo mediterráneo: aceite de oliva, verduras, hierbas.`,
                `Mantente hidratada al sol`,
                `Cenas elegantes pero no pesadas`
                ]
        },
        dailyTracker: [
            { key: 'seafood', label: { en: 'Seafood or fish', ru: 'Морепродукты или рыба', kk: 'Теңіз өнімі немесе балық', fr: 'Fruits de mer ou poisson',
                de: `Meeresfrüchte oder Fisch`,
                es: `Mariscos o pescado`
            } },
            { key: 'light_portions', label: { en: 'Light portions', ru: 'Лёгкие порции', kk: 'Жеңіл порциялар', fr: 'Portions légères',
                de: `Leichte Portionen`,
                es: `Porciones ligeras`
            } },
            { key: 'hydrated', label: { en: 'Stayed hydrated', ru: 'Пил достаточно воды', kk: 'Жеткілікті су іштім', fr: 'Bien hydraté',
                de: `Blieb hydriert`,
                es: `Se mantuvo hidratado`
            } },
            { key: 'fresh_vegetables', label: { en: 'Fresh vegetables', ru: 'Свежие овощи', kk: 'Таза көкөністер', fr: 'Légumes frais',
                de: `Frisches Gemüse`,
                es: `Verduras frescas`
            } },
            { key: 'elegant_dinner', label: { en: 'Elegant dinner', ru: 'Элегантный ужин', kk: 'Талғампаз кешкі ас', fr: 'Dîner élégant',
                de: `Elegantes Abendessen`,
                es: `cena elegante`
            } },
        ],
        sampleDay: {
            en: 'Breakfast: Fresh fruit, yogurt, coffee. Lunch: Grilled octopus salad, crusty bread. Snack: Oysters, white wine. Dinner: Grilled sea bass, Greek salad, light pasta.',
            ru: 'Завтрак: свежие фрукты, йогурт, кофе. Обед: салат с осьминогом-гриль, хрустящий хлеб. Перекус: устрицы, белое вино. Ужин: сибас-гриль, греческий салат, лёгкая паста.',
            kk: 'Таңғы ас: таза жемістер, йогурт, кофе. Түскі ас: гриль сегізаяқ салаты, қытырлақ нан. Тіскебасар: устрицалар, ақ шарап. Кешкі ас: гриль сибас, грек салаты, жеңіл паста.',
            fr: 'Petit-déj : fruits, yaourt, café. Déjeuner : salade poulpe grillé, pain. Collation : huîtres, vin blanc. Dîner : bar grillé, salade grecque, pâtes légères.',
            de: `Frühstück: Frisches Obst, Joghurt, Kaffee. Mittagessen: Gegrillter Oktopussalat, knuspriges Brot. Snack: Austern, Weißwein. Abendessen: Gegrillter Wolfsbarsch, griechischer Salat, leichte Pasta.`,
            es: `Desayuno: fruta fresca, yogur, café. Almuerzo: Ensalada de pulpo a la plancha, pan crujiente. Merienda: Ostras, vino blanco. Cena: Lubina a la plancha, ensalada griega, pasta ligera.`
        },
        notFor: null,
        suitableFor: ['summer', 'seaside', 'light_eating', 'elegance'],
        notSuitableFor: [],
        allowedFoods: ['seafood', 'fish', 'vegetables', 'olive_oil', 'wine_moderate', 'fruits'],
        restrictedFoods: ['heavy_foods', 'fried_foods', 'excessive_alcohol'],
        macroSplit: { protein: 30, carbs: 40, fat: 30 },
        tips: {
            en: ['White linen is the dress code', 'Fresh, not frozen seafood', 'Sunset dinners are best'],
            ru: ['Белый лён - дресс-код', 'Свежие, не замороженные морепродукты', 'Ужины на закате - лучшее'],
            kk: ['Ақ зығыр - дресс-код', 'Таза, мұздатылмаған теңіз өнімдері', 'Күн батысындағы кешкі астар - ең жақсы'],
            fr: ['Lin blanc de rigueur', 'Fruits de mer frais, pas surgelés', 'Dîners au coucher de soleil'],
            de: [
                `Weißes Leinen ist die Kleiderordnung`,
                `Frische, nicht gefrorene Meeresfrüchte`,
                `Am besten sind Abendessen bei Sonnenuntergang`
                ],
            es: [
                `El lino blanco es el código de vestimenta`,
                `Mariscos frescos, no congelados`,
                `Las cenas al atardecer son las mejores.`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
        color: '#0277BD',
        isFeatured: false,
        popularityScore: 55,
        tags: ['old_money', 'yacht', 'seafood', 'elegant'],
    },

    // 40) Prep School Lunch
    {
        slug: 'prep-school-lunch',
        name: { en: 'Prep School Lunch', ru: 'Обед в частной школе', kk: 'Prep School түскі асы', fr: 'Déjeuner Prep School',
            de: `Vorbereitungs-Schulmittagessen`,
            es: `Almuerzo escolar preparatorio`
        },
        description: { en: 'Inspired by traditional prep school dining - balanced, nutritious, proper. No skipping meals, no junk food.', ru: 'В духе столовых частных школ - сбалансировано, питательно, правильно. Без пропусков еды, без джанк-фуда.', kk: 'Дәстүрлі prep school асханасынан шабыт алған - теңгерімді, қоректі, дұрыс. Тамақты өткізбей, джанк-фудсыз.', fr: 'Style cantine prep school - équilibré, nutritif, correct. Pas de repas sautés, pas de junk.',
            de: `Inspiriert vom traditionellen Essen in der Vorbereitungsschule – ausgewogen, nahrhaft, richtig. Keine Mahlzeiten auslassen, kein Junk Food.`,
            es: `Inspirado en la comida tradicional de la escuela preparatoria: equilibrada, nutritiva y adecuada. Nada de saltarse comidas, nada de comida chatarra.`
        },
        shortDescription: { en: 'Proper, balanced lunches', ru: 'Правильные, сбалансированные обеды', kk: 'Дұрыс, теңгерімді түскі астар', fr: 'Déjeuners corrects et équilibrés',
            de: `Richtige, ausgewogene Mittagessen`,
            es: `Almuerzos adecuados y equilibrados.`
        },
        category: 'inspired',
        type: 'LIFESTYLE',
        difficulty: 'EASY',
        duration: 21,
        uiGroup: 'Old Money',
        evidenceLevel: 'low',
        disclaimerKey: 'DISCLAIMER_GENERAL',
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'Always have a proper lunch at a set time',
                'Balanced plate: protein, vegetables, complex carbs',
                'No eating at desk or while walking',
                'Water or simple beverages only',
                'Light dessert or fruit to finish',
            ],
            ru: [
                'Всегда обедайте в определённое время',
                'Сбалансированная тарелка: белок, овощи, сложные углеводы',
                'Не ешьте за столом или на ходу',
                'Только вода или простые напитки',
                'Лёгкий десерт или фрукты в конце',
            ],
            kk: [
                'Әрқашан белгілі уақытта түскі ас ішіңіз',
                'Теңгерімді тәрелке: ақуыз, көкөністер, күрделі көмірсулар',
                'Жұмыс үстелінде немесе жүре жемеңіз',
                'Тек су немесе қарапайым сусындар',
                'Соңында жеңіл десерт немесе жеміс',
            ],
            fr: [
                'Toujours un vrai déjeuner à heure fixe',
                'Assiette équilibrée : protéines, légumes, glucides complexes',
                'Pas de repas au bureau ou en marchant',
                'Eau ou boissons simples',
                'Fruit ou petit dessert pour finir',
            ],
            de: [
                `Essen Sie immer zu einer festgelegten Zeit ein ordentliches Mittagessen`,
                `Ausgewogener Teller: Eiweiß, Gemüse, komplexe Kohlenhydrate`,
                `Kein Essen am Schreibtisch oder beim Gehen`,
                `Nur Wasser oder einfache Getränke`,
                `Leichtes Dessert oder Obst zum Abschluss`
                ],
            es: [
                `Tener siempre un almuerzo adecuado a una hora determinada.`,
                `Plato equilibrado: proteínas, verduras, carbohidratos complejos`,
                `No comer en el escritorio o mientras camina`,
                `Solo agua o bebidas simples.`,
                `Postre ligero o fruta para terminar`
                ]
        },
        dailyTracker: [
            { key: 'proper_lunch', label: { en: 'Proper sit-down lunch', ru: 'Правильный обед сидя', kk: 'Отырып дұрыс түскі ас', fr: 'Déjeuner assis correct',
                de: `Richtiges Mittagessen im Sitzen`,
                es: `Almuerzo adecuado`
            } },
            { key: 'balanced_plate', label: { en: 'Balanced plate', ru: 'Сбалансированная тарелка', kk: 'Теңгерімді тәрелке', fr: 'Assiette équilibrée',
                de: `Ausgewogene Platte`,
                es: `plato equilibrado`
            } },
            { key: 'set_time', label: { en: 'Ate at set time', ru: 'Ел в определённое время', kk: 'Белгілі уақытта жедім', fr: 'Repas à heure fixe',
                de: `Zur festgelegten Zeit gegessen`,
                es: `comió a la hora establecida`
            } },
            { key: 'water', label: { en: 'Water with meal', ru: 'Вода к еде', kk: 'Тамақпен бірге су', fr: 'Eau au repas',
                de: `Wasser zum Essen`,
                es: `Agua con comida`
            } },
            { key: 'no_desk_eating', label: { en: 'No eating at desk', ru: 'Не ел за рабочим столом', kk: 'Жұмыс үстелінде жемедім', fr: 'Pas de repas au bureau',
                de: `Kein Essen am Schreibtisch`,
                es: `No comer en el escritorio`
            } },
        ],
        sampleDay: {
            en: 'Lunch: Roasted chicken breast, steamed broccoli, brown rice, side salad, water. Followed by an apple or small dessert.',
            ru: 'Обед: запечённая куриная грудка, брокколи на пару, бурый рис, салат, вода. Затем яблоко или небольшой десерт.',
            kk: 'Түскі ас: пеште піскен тауық төсі, бумен піскен брокколи, қоңыр күріш, салат, су. Соңында алма немесе кішкене десерт.',
            fr: 'Déjeuner : blanc de poulet, brocoli vapeur, riz complet, salade, eau. Puis pomme ou petit dessert.',
            de: `Mittagessen: Gebratene Hähnchenbrust, gedünsteter Brokkoli, brauner Reis, Beilagensalat, Wasser. Anschließend ein Apfel oder ein kleines Dessert.`,
            es: `Almuerzo: pechuga de pollo asada, brócoli al vapor, arroz integral, ensalada y agua. Seguido de una manzana o postre pequeño.`
        },
        notFor: null,
        suitableFor: ['work', 'structure', 'balanced'],
        notSuitableFor: [],
        allowedFoods: ['lean_protein', 'vegetables', 'whole_grains', 'fruits', 'water'],
        restrictedFoods: ['fast_food', 'soda', 'desk_eating', 'skipping_lunch'],
        macroSplit: { protein: 30, carbs: 45, fat: 25 },
        tips: {
            en: ['Pack lunch if needed - but make it proper', 'Set a lunch alarm', 'Eat away from work'],
            ru: ['Берите обед с собой если нужно - но правильный', 'Поставьте напоминание об обеде', 'Ешьте вдали от работы'],
            kk: ['Қажет болса түскі асты өзіңізбен алыңыз - бірақ дұрыс', 'Түскі ас туралы еске салуды қойыңыз', 'Жұмыстан алыс жеңіз'],
            fr: ['Préparer son déjeuner si besoin - mais correct', 'Alarme déjeuner', 'Manger loin du travail'],
            de: [
                `Packen Sie bei Bedarf ein Mittagessen ein – aber machen Sie es richtig`,
                `Stellen Sie einen Mittagswecker ein`,
                `Essen Sie außerhalb der Arbeit`
                ],
            es: [
                `Empaque el almuerzo si es necesario, pero hágalo apropiado`,
                `Poner una alarma para el almuerzo`,
                `Comer fuera del trabajo`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
        color: '#6D4C41',
        isFeatured: false,
        popularityScore: 50,
        tags: ['old_money', 'lunch', 'balanced', 'proper'],
    },

    // 41) French Girl Diet
    {
        slug: 'french-chic',
        name: { en: 'French Girl Diet', ru: 'Французский шик', kk: 'Француз қыз диетасы', fr: 'French Girl',
            de: `Französische Mädchendiät`,
            es: `Dieta de la chica francesa`
        },
        description: {
            en: 'French approach to eating - quality portions, enjoyment, no strict restrictions, natural balance and pleasure.', ru: 'Французский подход к еде - качественные порции, удовольствие, без строгих запретов, естественный баланс и удовольствие.', kk: 'Тамаққа француз көзқарасы - сапалы порциялар, рахат, қатаң тыйымсыз, табиғи тепе-теңдік және рахат.', fr: 'Approche française : portions qualité, plaisir, pas d\'interdits.',
            de: `Französischer Essansatz – hochwertige Portionen, Genuss, keine strengen Einschränkungen, natürliche Ausgewogenheit und Genuss.`,
            es: `Enfoque francés de la alimentación: porciones de calidad, disfrute, sin restricciones estrictas, equilibrio natural y placer.`
        },
        shortDescription: { en: 'French-style intuitive eating', ru: 'Интуитивное питание по-французски', kk: 'Француз интуитивті тамақтануы', fr: 'Alimentation intuitive à la française',
            de: `Intuitives Essen im französischen Stil`,
            es: `Comer intuitivo al estilo francés`
        },
        category: 'inspired',
        type: 'LIFESTYLE',
        difficulty: 'EASY',
        duration: 30,
        uiGroup: 'Aesthetic',
        evidenceLevel: 'low',
        disclaimerKey: 'DISCLAIMER_GENERAL',
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'Eat small portions but enjoy every bite',
                'No forbidden foods - everything in moderation',
                'Eat sitting down, never standing or walking',
                'Quality over quantity - better cheese than more chips',
                'Listen to hunger cues, stop when satisfied',
            ],
            ru: [
                'Ешьте небольшие порции, но наслаждайтесь каждым кусочком',
                'Нет запретных продуктов - всё в меру',
                'Ешьте сидя, никогда стоя или на ходу',
                'Качество важнее количества - лучше хороший сыр, чем много чипсов',
                'Слушайте сигналы голода, останавливайтесь когда насытились',
            ],
            kk: [
                'Кішкене порциялар жеңіз, бірақ әр тістемнен ләззат алыңыз',
                'Тыйым салынған тағам жоқ - бәрі қалыпты',
                'Отырып жеңіз, тұрып немесе жүре жемеңіз',
                'Сапа санды маңызды - көп чипстен жақсы ірімшік артық',
                'Аштық сигналдарын тыңдаңыз, тойғанда тоқтаңыз',
            ],
            fr: [
                'Petites portions, savourer chaque bouchée',
                'Aucun aliment interdit - tout avec modération',
                'Manger assis, jamais debout ou en marchant',
                'Qualité avant quantité',
                'Écouter la faim, s\'arrêter rassasié',
            ],
            de: [
                `Essen Sie kleine Portionen, aber genießen Sie jeden Bissen`,
                `Keine verbotenen Lebensmittel – alles in Maßen`,
                `Essen Sie im Sitzen, niemals im Stehen oder Gehen`,
                `Qualität vor Quantität – besserer Käse als mehr Pommes`,
                `Hören Sie auf Hungersignale und hören Sie auf, wenn Sie zufrieden sind`
                ],
            es: [
                `Come porciones pequeñas pero disfruta cada bocado.`,
                `Nada de alimentos prohibidos, todo con moderación.`,
                `Come sentado, nunca de pie ni caminando.`,
                `Calidad sobre cantidad: mejor queso que más patatas fritas`,
                `Escucha señales de hambre, detente cuando estés satisfecha`
                ]
        },
        dailyTracker: [
            { key: 'small_portions', label: { en: 'Ate small portions', ru: 'Ел небольшие порции', kk: 'Кішкене порциялар жедім', fr: 'Petites portions',
                de: `Kleine Portionen gegessen`,
                es: `Comió porciones pequeñas`
            } },
            { key: 'enjoyed_food', label: { en: 'Truly enjoyed food', ru: 'Получил удовольствие от еды', kk: 'Тамақтан шынымен ләззат алдым', fr: 'Vraiment savouré',
                de: `Wirklich genossenes Essen`,
                es: `Comida realmente disfrutada`
            } },
            { key: 'sat_down', label: { en: 'Ate sitting down', ru: 'Ел сидя', kk: 'Отырып жедім', fr: 'Mangé assis',
                de: `Im Sitzen gegessen`,
                es: `comí sentado`
            } },
            { key: 'quality_choice', label: { en: 'Chose quality over quantity', ru: 'Выбрал качество, не количество', kk: 'Санды емес, сапаны таңдадым', fr: 'Qualité avant quantité',
                de: `Wählen Sie Qualität statt Quantität`,
                es: `Elija calidad sobre cantidad`
            } },
            { key: 'stopped_satisfied', label: { en: 'Stopped when satisfied', ru: 'Остановился когда насытился', kk: 'Тойғанда тоқтадым', fr: 'Arrêté rassasié',
                de: `Habe aufgehört, als ich zufrieden war`,
                es: `Detenido cuando está satisfecha`
            } },
        ],
        sampleDay: {
            en: 'Breakfast: Croissant, coffee, small fruit. Lunch: Salad niçoise, bread. Dinner: Small steak, haricots verts, red wine. Dessert: Two squares of dark chocolate.',
            ru: 'Завтрак: круассан, кофе, немного фруктов. Обед: салат нисуаз, хлеб. Ужин: небольшой стейк, стручковая фасоль, красное вино. Десерт: две дольки тёмного шоколада.',
            kk: 'Таңғы ас: круассан, кофе, аз жеміс. Түскі ас: нисуаз салаты, нан. Кешкі ас: кішкене стейк, бұршақ, қызыл шарап. Десерт: қара шоколадтың екі бөлігі.',
            fr: 'Petit-déj : croissant, café, fruit. Déjeuner : salade niçoise, pain. Dîner : petit steak, haricots verts, vin rouge. Dessert : deux carrés de chocolat noir.',
            de: `Frühstück: Croissant, Kaffee, kleine Früchte. Mittagessen: Salat Niçoise, Brot. Abendessen: Kleines Steak, grüne Bohnen, Rotwein. Nachtisch: Zwei Quadrate dunkle Schokolade.`,
            es: `Desayuno: Croissant, café, fruta pequeña. Almuerzo: Ensalada niçoise, pan. Cena: Filete pequeño, judías verdes, vino tinto. Postre: Dos cuadritos de chocolate amargo.`
        },
        notFor: null,
        suitableFor: ['intuitive_eating', 'enjoyment', 'french'],
        notSuitableFor: [],
        allowedFoods: ['everything_moderate', 'quality_foods', 'cheese', 'bread', 'wine_moderate', 'chocolate'],
        restrictedFoods: ['overeating', 'eating_standing', 'mindless_snacking'],
        macroSplit: { protein: 20, carbs: 45, fat: 35 },
        tips: {
            en: ['Buy less but better', 'Savor every meal', 'Walk after eating'],
            ru: ['Покупайте меньше, но лучше', 'Смакуйте каждый приём пищи', 'Гуляйте после еды'],
            kk: ['Аз, бірақ жақсырақ сатып алыңыз', 'Әр тамақты татыңыз', 'Тамақтан кейін жүріңіз'],
            fr: ['Moins mais mieux', 'Savourer chaque repas', 'Marcher après manger'],
            de: [
                `Kaufen Sie weniger, aber besser`,
                `Genießen Sie jede Mahlzeit`,
                `Gehen Sie nach dem Essen spazieren`
                ],
            es: [
                `Compra menos pero mejor`,
                `Saborea cada comida`,
                `caminar después de comer`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1499028344343-cd173ffc68a9?w=800&q=80',
        color: '#EC407A',
        isFeatured: false,
        popularityScore: 75,
        tags: ['aesthetic', 'french', 'intuitive', 'pleasure'],
    },

    // ==================== VINTAGE / GLAM DIETS ====================

    // 42) 1920s Gatsby
    {
        slug: 'gatsby-twenties',
        name: { en: '1920s Gatsby', ru: 'Гэтсби 1920-х', kk: '1920-жылдар Гэтсби', fr: 'Gatsby années 20',
            de: `Gatsby der 1920er Jahre`,
            es: `Gatsby de los años 20`
        },
        description: { en: 'Inspired by the roaring twenties - glamorous parties, elegant appetizers, champagne, and indulgent but refined tastes.', ru: 'В духе ревущих двадцатых - гламурные вечеринки, элегантные закуски, шампанское и изысканные, но утончённые вкусы.', kk: 'Жиырмасыншы жылдардан шабыт алған - сәнді кештер, талғампаз тәбет ашарлар, шампанское және нәзік дәмдер.', fr: 'Inspiré des années folles - soirées, canapés, champagne, goûts raffinés.',
            de: `Inspiriert von den wilden Zwanzigern – glamouröse Partys, elegante Vorspeisen, Champagner und verwöhnende, aber raffinierte Geschmäcker.`,
            es: `Inspirado en los locos años veinte: fiestas glamorosas, aperitivos elegantes, champán y gustos indulgentes pero refinados.`
        },
        shortDescription: { en: 'Jazz age inspired eating', ru: 'Питание в духе эпохи джаза', kk: 'Джаз дәуірі тамақтануы', fr: 'Alimentation inspirée âge du jazz',
            de: `Vom Jazzzeitalter inspiriertes Essen`,
            es: `Comer inspirado en la era del jazz`
        },
        category: 'inspired',
        type: 'LIFESTYLE',
        difficulty: 'MODERATE',
        duration: 14,
        uiGroup: 'Vintage',
        evidenceLevel: 'low',
        disclaimerKey: 'DISCLAIMER_HISTORICAL',
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'Embrace elegant appetizers and canapés',
                'Small, refined portions over large plates',
                'Champagne or sparkling water with meals',
                'Late dinners, social eating',
                'Focus on presentation and atmosphere',
            ],
            ru: [
                'Примите элегантные закуски и канапе',
                'Маленькие, изысканные порции вместо больших тарелок',
                'Шампанское или газированная вода к еде',
                'Поздние ужины, социальные трапезы',
                'Фокус на подаче и атмосфере',
            ],
            kk: [
                'Талғампаз тәбет ашарлар мен канапелерді қабылдаңыз',
                'Үлкен тәрелкелердің орнына кішкене, нәзік порциялар',
                'Тамаққа шампанское немесе газдалған су',
                'Кешкі асы, әлеуметтік тамақтану',
                'Безендіру мен атмосфераға назар',
            ],
            fr: [
                'Canapés et amuse-bouches élégants',
                'Petites portions raffinées',
                'Champagne ou eau pétillante',
                'Dîners tardifs, repas sociaux',
                'Présentation et atmosphère',
            ],
            de: [
                `Genießen Sie elegante Vorspeisen und Canapés`,
                `Kleine, raffinierte Portionen auf großen Tellern`,
                `Champagner oder Mineralwasser zu den Mahlzeiten`,
                `Spätes Abendessen, geselliges Essen`,
                `Konzentrieren Sie sich auf Präsentation und Atmosphäre`
                ],
            es: [
                `Adopte aperitivos y canapés elegantes`,
                `Porciones pequeñas y refinadas en platos grandes`,
                `Champán o agua con gas con las comidas.`,
                `Cenas tardías, comidas sociales.`,
                `Centrarse en la presentación y la atmósfera.`
                ]
        },
        dailyTracker: [
            { key: 'elegant_appetizer', label: { en: 'Elegant appetizer/canapé', ru: 'Элегантная закуска/канапе', kk: 'Талғампаз тәбет ашар/канапе', fr: 'Amuse-bouche/canapé élégant',
                de: `Elegante Vorspeise/Canapé`,
                es: `Aperitivo/canapé elegante`
            } },
            { key: 'small_portions', label: { en: 'Small, refined portions', ru: 'Маленькие, изысканные порции', kk: 'Кішкене, нәзік порциялар', fr: 'Petites portions raffinées',
                de: `Kleine, raffinierte Portionen`,
                es: `Porciones pequeñas y refinadas`
            } },
            { key: 'social_meal', label: { en: 'Social meal with others', ru: 'Социальная трапеза', kk: 'Басқалармен бірге тамақтану', fr: 'Repas en société',
                de: `Geselliges Essen mit anderen`,
                es: `Comida social con otras`
            } },
            { key: 'presentation', label: { en: 'Nice presentation', ru: 'Красивая подача', kk: 'Әдемі безендіру', fr: 'Belle présentation',
                de: `Schöne Präsentation`,
                es: `Buena presentación`
            } },
            { key: 'sparkling', label: { en: 'Sparkling beverage', ru: 'Газированный напиток', kk: 'Газдалған сусын', fr: 'Boisson pétillante',
                de: `Kohlensäurehaltiges Getränk`,
                es: `bebida espumosa`
            } },
        ],
        sampleDay: {
            en: 'Lunch: Crab canapés, cucumber sandwiches, iced tea. Dinner: Oysters Rockefeller, lobster thermidor, champagne. Dessert: Crème brûlée.',
            ru: 'Обед: крабовые канапе, сэндвичи с огурцом, чай со льдом. Ужин: устрицы Рокфеллер, лобстер термидор, шампанское. Десерт: крем-брюле.',
            kk: 'Түскі ас: шаян канапелері, қияр сэндвичтері, мұзды шай. Кешкі ас: Рокфеллер устрицалары, лобстер термидор, шампанское. Десерт: крем-брюле.',
            fr: 'Déjeuner : canapés crabe, sandwiches concombre, thé glacé. Dîner : huîtres Rockefeller, homard thermidor, champagne. Dessert : crème brûlée.',
            de: `Mittagessen: Krabbenhäppchen, Gurkensandwiches, Eistee. Abendessen: Austern Rockefeller, Hummer Thermidor, Champagner. Nachtisch: Crème Brûlée.`,
            es: `Almuerzo: canapés de cangrejo, sándwiches de pepino, té helado. Cena: Ostras Rockefeller, langosta termidor, champagne. Postre: Crème brûlée.`
        },
        notFor: null,
        suitableFor: ['parties', 'social', 'glamour'],
        notSuitableFor: [],
        allowedFoods: ['seafood', 'canapés', 'champagne', 'elegant_appetizers', 'desserts'],
        restrictedFoods: ['large_portions', 'casual_food', 'eating_alone'],
        macroSplit: { protein: 25, carbs: 40, fat: 35 },
        tips: {
            en: ['Dress for dinner', 'Use vintage glassware', 'Play jazz music'],
            ru: ['Одевайтесь к ужину', 'Используйте винтажную посуду', 'Включите джаз'],
            kk: ['Кешкі асқа киініңіз', 'Винтаж ыдыс қолданыңыз', 'Джаз музыка қосыңыз'],
            fr: ['S\'habiller pour le dîner', 'Vaisselle vintage', 'Jazz en fond'],
            de: [
                `Zieh dich zum Abendessen an`,
                `Verwenden Sie Vintage-Glaswaren`,
                `Spielen Sie Jazzmusik`
                ],
            es: [
                `Vístete para la cena`,
                `Utiliza cristalería antigua`,
                `Tocar musica jazz`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&q=80',
        color: '#D4AF37',
        isFeatured: false,
        popularityScore: 55,
        tags: ['vintage', 'gatsby', '1920s', 'glamour'],
    },

    // 43) 1950s Hollywood
    {
        slug: 'fifties-hollywood',
        name: { en: '1950s Hollywood', ru: 'Голливуд 1950-х', kk: '1950-жылдар Голливуд', fr: 'Hollywood années 50',
            de: `Hollywood der 1950er Jahre`,
            es: `Hollywood de los años 50`
        },
        description: { en: 'Inspired by 1950s Hollywood glamour - balanced, portion-conscious, always camera-ready but enjoying life.', ru: 'В духе голливудского гламура 1950-х - сбалансировано, осознанные порции, всегда готовы к камере, но наслаждаемся жизнью.', kk: '1950-жылдар Голливуд сәнінен шабыт алған - теңгерімді, саналы порциялар, әрқашан камераға дайын, бірақ өмірден ләззат алу.', fr: 'Glamour Hollywood années 50 - équilibré, portions maîtrisées, prêt pour la caméra tout en profitant.',
            de: `Inspiriert vom Hollywood-Glamour der 1950er Jahre – ausgewogen, portionbewusst, immer kamerabereit, aber das Leben genießend.`,
            es: `Inspirado en el glamour de Hollywood de los años 50: equilibrado, consciente de las porciones, siempre listo para la cámara pero disfrutando de la vida.`
        },
        shortDescription: { en: 'Classic Hollywood eating', ru: 'Питание в голливудском стиле', kk: 'Голливуд стиліндегі тамақтану', fr: 'Alimentation style Hollywood classique',
            de: `Klassisches Hollywood-Essen`,
            es: `Comida clásica de Hollywood`
        },
        category: 'inspired',
        type: 'LIFESTYLE',
        difficulty: 'MODERATE',
        duration: 21,
        uiGroup: 'Vintage',
        evidenceLevel: 'low',
        disclaimerKey: 'DISCLAIMER_HISTORICAL',
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'Balanced, camera-ready meals',
                'Light breakfast, proper lunch, elegant dinner',
                'Protein-focused with vegetables',
                'Limited starches, no bloating foods',
                'Occasional indulgence - champagne, chocolate',
            ],
            ru: [
                'Сбалансированные приёмы пищи, готовые к камере',
                'Лёгкий завтрак, правильный обед, элегантный ужин',
                'Белок в приоритете с овощами',
                'Ограничение крахмала, без продуктов вызывающих вздутие',
                'Иногда позволяем себе - шампанское, шоколад',
            ],
            kk: [
                'Камераға дайын теңгерімді тамақ',
                'Жеңіл таңғы ас, дұрыс түскі ас, талғампаз кешкі ас',
                'Көкөністермен бірге ақуызға басымдық',
                'Крахмалды шектеу, ісіну тудыратын тағамсыз',
                'Кейде рұқсат - шампанское, шоколад',
            ],
            fr: [
                'Repas équilibrés, prêts pour la caméra',
                'Petit-déj léger, déjeuner correct, dîner élégant',
                'Protéines + légumes',
                'Féculents limités, pas de ballonnements',
                'Indulgence occasionnelle : champagne, chocolat',
            ],
            de: [
                `Ausgewogene, küchenfertige Mahlzeiten`,
                `Leichtes Frühstück, ordentliches Mittagessen, elegantes Abendessen`,
                `Proteinorientiert mit Gemüse`,
                `Begrenzte Stärke, keine blähenden Lebensmittel`,
                `Gelegentlicher Genuss – Champagner, Schokolade`
                ],
            es: [
                `Comidas equilibradas y listas para la cámara.`,
                `Desayuno ligero, almuerzo adecuado, cena elegante.`,
                `Centrado en proteínas con verduras.`,
                `Almidones limitados, sin alimentos hinchables.`,
                `Un capricho ocasional: champán, chocolate`
                ]
        },
        dailyTracker: [
            { key: 'protein_focused', label: { en: 'Protein-focused meal', ru: 'Белковый приём пищи', kk: 'Ақуызға бағытталған тамақ', fr: 'Repas centré protéines',
                de: `Proteinorientierte Mahlzeit`,
                es: `Comida centrada en proteínas`
            } },
            { key: 'vegetables', label: { en: 'Plenty of vegetables', ru: 'Много овощей', kk: 'Көп көкөніс', fr: 'Beaucoup de légumes',
                de: `Viel Gemüse`,
                es: `muchas verduras`
            } },
            { key: 'light_breakfast', label: { en: 'Light breakfast', ru: 'Лёгкий завтрак', kk: 'Жеңіл таңғы ас', fr: 'Petit-déj léger',
                de: `Leichtes Frühstück`,
                es: `Desayuno ligero`
            } },
            { key: 'no_bloating', label: { en: 'No bloating foods', ru: 'Без продуктов для вздутия', kk: 'Ісіну тудыратын тағамсыз', fr: 'Pas d\'aliments gonflants',
                de: `Keine blähenden Lebensmittel`,
                es: `Sin alimentos hinchables`
            } },
            { key: 'elegant_dinner', label: { en: 'Elegant dinner', ru: 'Элегантный ужин', kk: 'Талғампаз кешкі ас', fr: 'Dîner élégant',
                de: `Elegantes Abendessen`,
                es: `cena elegante`
            } },
        ],
        sampleDay: {
            en: 'Breakfast: Grapefruit, soft-boiled egg, black coffee. Lunch: Grilled chicken salad, iced tea. Dinner: Filet mignon, steamed asparagus, glass of champagne. Dessert: Two squares of chocolate.',
            ru: 'Завтрак: грейпфрут, яйцо всмятку, чёрный кофе. Обед: салат с курицей-гриль, холодный чай. Ужин: филе-миньон, спаржа на пару, бокал шампанского. Десерт: две дольки шоколада.',
            kk: 'Таңғы ас: грейпфрут, жұмсақ пісірілген жұмыртқа, қара кофе. Түскі ас: гриль тауық салаты, суық шай. Кешкі ас: филе-миньон, бумен піскен аспарагус, шампанское бокалы. Десерт: шоколадтың екі бөлігі.',
            fr: 'Petit-déj : pamplemousse, œuf mollet, café noir. Déjeuner : salade poulet grillé, thé glacé. Dîner : filet mignon, asperges vapeur, champagne. Dessert : deux carrés chocolat.',
            de: `Frühstück: Grapefruit, weichgekochtes Ei, schwarzer Kaffee. Mittagessen: Gegrillter Hühnersalat, Eistee. Abendessen: Filet Mignon, gedünsteter Spargel, Glas Champagner. Nachtisch: Zwei Quadrate Schokolade.`,
            es: `Desayuno: pomelo, huevo pasado por agua, café solo. Almuerzo: Ensalada de pollo a la parrilla, té helado. Cena: Filet mignon, espárragos al vapor, copa de champán. Postre: Dos cuadritos de chocolate.`
        },
        notFor: null,
        suitableFor: ['weight_management', 'glamour', 'events'],
        notSuitableFor: [],
        allowedFoods: ['lean_protein', 'vegetables', 'grapefruit', 'champagne_moderate', 'chocolate_dark'],
        restrictedFoods: ['heavy_starches', 'bloating_foods', 'large_portions'],
        macroSplit: { protein: 35, carbs: 30, fat: 35 },
        tips: {
            en: ['Grapefruit before meals', 'Stand up straight', 'Less bread, more protein'],
            ru: ['Грейпфрут перед едой', 'Держите осанку', 'Меньше хлеба, больше белка'],
            kk: ['Тамақ алдында грейпфрут', 'Тік тұрыңыз', 'Аз нан, көп ақуыз'],
            fr: ['Pamplemousse avant les repas', 'Se tenir droit', 'Moins de pain, plus de protéines'],
            de: [
                `Grapefruit vor den Mahlzeiten`,
                `Stehen Sie aufrecht`,
                `Weniger Brot, mehr Protein`
                ],
            es: [
                `Pomelo antes de las comidas`,
                `Ponte de pie derecho`,
                `Menos pan, más proteínas`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1485575301924-6891ef935dcd?w=800&q=80',
        color: '#E91E63',
        isFeatured: false,
        popularityScore: 60,
        tags: ['vintage', 'hollywood', '1950s', 'glamour'],
    },

    // 44) 1960s Twiggy
    {
        slug: 'sixties-twiggy',
        name: { en: '1960s Mod', ru: 'Мод 1960-х', kk: '1960-жылдар Мод', fr: 'Mod années 60',
            de: `1960er-Jahre-Mod`,
            es: `Mod de los años 60`
        },
        description: { en: 'Inspired by 1960s mod culture - light, youthful, colorful, breaking traditional rules while staying elegant.', ru: 'В духе мод-культуры 1960-х - лёгко, молодёжно, ярко, ломаем традиционные правила, оставаясь элегантными.', kk: '1960-жылдар мод мәдениетінен шабыт алған - жеңіл, жасөспірімдік, түрлі-түсті, дәстүрлі ережелерді бұза отырып, талғампаз қалу.', fr: 'Culture mod années 60 - léger, jeune, coloré, casser les règles en restant élégant.',
            de: `Inspiriert von der Mod-Kultur der 1960er Jahre – leicht, jugendlich, farbenfroh, bricht mit traditionellen Regeln und bleibt dabei elegant.`,
            es: `Inspirado en la cultura mod de los años 60: ligero, juvenil, colorido, que rompe las reglas tradicionales sin dejar de ser elegante.`
        },
        shortDescription: { en: 'Youthful mod-style eating', ru: 'Молодёжное питание в стиле мод', kk: 'Жасөспірімдік мод стиліндегі тамақтану', fr: 'Alimentation mod et jeune',
            de: `Essen im jugendlichen Mod-Stil`,
            es: `Comer juvenil al estilo mod`
        },
        category: 'inspired',
        type: 'LIFESTYLE',
        difficulty: 'EASY',
        duration: 21,
        uiGroup: 'Vintage',
        evidenceLevel: 'low',
        disclaimerKey: 'DISCLAIMER_HISTORICAL',
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'Light, colorful meals',
                'Embrace new and trendy foods',
                'Small frequent meals over large traditional ones',
                'Fresh juices and smoothies',
                'Fun presentation, breaking old rules',
            ],
            ru: [
                'Лёгкие, яркие приёмы пищи',
                'Принимайте новые и модные продукты',
                'Частые небольшие приёмы вместо больших традиционных',
                'Свежие соки и смузи',
                'Весёлая подача, ломаем старые правила',
            ],
            kk: [
                'Жеңіл, түрлі-түсті тамақтар',
                'Жаңа және сәнді тағамдарды қабылдаңыз',
                'Үлкен дәстүрлі тамақтардың орнына жиі кішкене тамақтар',
                'Таза шырындар мен смузилер',
                'Көңілді безендіру, ескі ережелерді бұзу',
            ],
            fr: [
                'Repas légers et colorés',
                'Adopter nouveautés et tendances',
                'Petits repas fréquents plutôt que gros traditionnels',
                'Jus frais et smoothies',
                'Présentation fun, casser les vieilles règles',
            ],
            de: [
                `Leichte, farbenfrohe Mahlzeiten`,
                `Genießen Sie neue und trendige Lebensmittel`,
                `Kleine, häufige Mahlzeiten statt großer traditioneller Mahlzeiten`,
                `Frische Säfte und Smoothies`,
                `Unterhaltsame Präsentation, die alte Regeln bricht`
                ],
            es: [
                `Comidas ligeras y coloridas`,
                `Adopte alimentos nuevos y de moda`,
                `Pequeñas comidas frecuentes en lugar de grandes comidas tradicionales.`,
                `Zumos y batidos frescos`,
                `Presentación divertida, rompiendo viejas reglas.`
                ]
        },
        dailyTracker: [
            { key: 'light_meal', label: { en: 'Light, colorful meal', ru: 'Лёгкий, яркий приём', kk: 'Жеңіл, түрлі-түсті тамақ', fr: 'Repas léger et coloré',
                de: `Leichte, farbenfrohe Mahlzeit`,
                es: `Comida ligera y colorida`
            } },
            { key: 'fresh_juice', label: { en: 'Fresh juice or smoothie', ru: 'Свежий сок или смузи', kk: 'Таза шырын немесе смузи', fr: 'Jus frais ou smoothie',
                de: `Frischer Saft oder Smoothie`,
                es: `Jugo o batido fresco`
            } },
            { key: 'small_portions', label: { en: 'Small, frequent portions', ru: 'Маленькие, частые порции', kk: 'Кішкене, жиі порциялар', fr: 'Petites portions fréquentes',
                de: `Kleine, häufige Portionen`,
                es: `Porciones pequeñas y frecuentes`
            } },
            { key: 'something_new', label: { en: 'Tried something new', ru: 'Попробовал что-то новое', kk: 'Жаңа нәрсе көрдім', fr: 'Essayé quelque chose de nouveau',
                de: `Habe etwas Neues ausprobiert`,
                es: `Probé algo nuevo`
            } },
            { key: 'fun_presentation', label: { en: 'Fun presentation', ru: 'Весёлая подача', kk: 'Көңілді безендіру', fr: 'Présentation fun',
                de: `Lustige Präsentation`,
                es: `Presentación divertida`
            } },
        ],
        sampleDay: {
            en: 'Breakfast: Fresh orange juice, toast with jam. Lunch: Colorful salad bowl, sparkling water. Dinner: Fondue with vegetables, wine. Snacks: Fruit smoothie, cheese cubes.',
            ru: 'Завтрак: свежий апельсиновый сок, тост с джемом. Обед: яркий салат-боул, газированная вода. Ужин: фондю с овощами, вино. Перекусы: фруктовый смузи, кубики сыра.',
            kk: 'Таңғы ас: таза апельсин шырыны, джеммен тост. Түскі ас: түрлі-түсті салат боул, газдалған су. Кешкі ас: көкөніспен фондю, шарап. Тіскебасар: жеміс смузиі, ірімшік кубиктері.',
            fr: 'Petit-déj : jus d\'orange, toast confiture. Déjeuner : bowl coloré, eau pétillante. Dîner : fondue légumes, vin. Collations : smoothie fruits, dés de fromage.',
            de: `Frühstück: Frischer Orangensaft, Toast mit Marmelade. Mittagessen: Bunte Salatschüssel, Mineralwasser. Abendessen: Fondue mit Gemüse, Wein. Snacks: Fruchtsmoothie, Käsewürfel.`,
            es: `Desayuno: Zumo de naranja natural, tostadas con mermelada. Almuerzo: Ensaladera colorida, agua con gas. Cena: Fondue de verduras, vino. Meriendas: Batido de frutas, cubitos de queso.`
        },
        notFor: null,
        suitableFor: ['youthful', 'fun', 'light_eating'],
        notSuitableFor: [],
        allowedFoods: ['salads', 'fresh_juice', 'fondue', 'colorful_foods', 'smoothies'],
        restrictedFoods: ['heavy_traditional', 'boring_presentation'],
        macroSplit: { protein: 20, carbs: 50, fat: 30 },
        tips: {
            en: ['Use colorful plates', 'Try new cuisines', 'Music during meals'],
            ru: ['Используйте яркие тарелки', 'Пробуйте новые кухни', 'Музыка во время еды'],
            kk: ['Түрлі-түсті тәрелкелер қолданыңыз', 'Жаңа асханаларды көріңіз', 'Тамақ кезінде музыка'],
            fr: ['Assiettes colorées', 'Nouvelles cuisines', 'Musique pendant les repas'],
            de: [
                `Verwenden Sie bunte Teller`,
                `Probieren Sie neue Küchen aus`,
                `Musik während der Mahlzeiten`
                ],
            es: [
                `Utiliza platos coloridos`,
                `Prueba nuevas cocinas`,
                `Música durante las comidas`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80',
        color: '#FF5722',
        isFeatured: false,
        popularityScore: 50,
        tags: ['vintage', 'mod', '1960s', 'youthful'],
    },

    // 45) 1970s Studio 54
    {
        slug: 'seventies-disco',
        name: { en: '1970s Disco', ru: 'Диско 1970-х', kk: '1970-жылдар Диско', fr: 'Disco années 70',
            de: `Disco der 1970er Jahre`,
            es: `1970s Disco`
        },
        description: { en: 'Inspired by Studio 54 era - light eating to stay energized for parties, quick bites, champagne, staying slim for dance floor.', ru: 'В духе эпохи Studio 54 - лёгкое питание для энергии на вечеринках, быстрые закуски, шампанское, стройность для танцпола.', kk: 'Studio 54 дәуірінен шабыт алған - кешке қуат үшін жеңіл тамақтану, жылдам тәбет ашарлар, шампанское, би алаңына арықтық.', fr: 'Ère Studio 54 - manger léger pour les soirées, canapés, champagne, rester fine pour la piste.',
            de: `Inspiriert von der Studio 54-Ära – leichtes Essen, um für Partys energiegeladen zu bleiben, schnelle Snacks, Champagner, schlank bleiben für die Tanzfläche.`,
            es: `Inspirado en la era Studio 54: comidas ligeras para mantener la energía en las fiestas, bocadillos rápidos, champán y mantenerse delgado para la pista de baile.`
        },
        shortDescription: { en: 'Party-ready eating', ru: 'Питание для вечеринок', kk: 'Кешке дайын тамақтану', fr: 'Alimentation prête à faire la fête',
            de: `Partytaugliches Essen`,
            es: `Comer listo para la fiesta`
        },
        category: 'inspired',
        type: 'LIFESTYLE',
        difficulty: 'MODERATE',
        duration: 14,
        uiGroup: 'Vintage',
        evidenceLevel: 'low',
        disclaimerKey: 'DISCLAIMER_HISTORICAL',
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'Light meals to maintain energy',
                'Small bites and appetizers over heavy meals',
                'Dance and move after eating',
                'Champagne and cocktails (moderate)',
                'Late nights, adjusted eating schedule',
            ],
            ru: [
                'Лёгкие приёмы для поддержания энергии',
                'Маленькие закуски вместо тяжёлых блюд',
                'Танцуйте и двигайтесь после еды',
                'Шампанское и коктейли (умеренно)',
                'Поздние ночи, скорректированный график еды',
            ],
            kk: [
                'Қуатты сақтау үшін жеңіл тамақтар',
                'Ауыр тағамдардың орнына кішкене тәбет ашарлар',
                'Тамақтан кейін биле және қозғал',
                'Шампанское және коктейлдер (қалыпты)',
                'Кеш түндер, түзетілген тамақтану кестесі',
            ],
            fr: [
                'Repas légers pour garder l\'énergie',
                'Canapés et amuse-bouches plutôt que plats lourds',
                'Danser et bouger après manger',
                'Champagne et cocktails (modération)',
                'Soirées tardives, horaires adaptés',
            ],
            de: [
                `Leichte Mahlzeiten zur Aufrechterhaltung der Energie`,
                `Kleine Häppchen und Vorspeisen zu schweren Mahlzeiten`,
                `Tanzen und bewegen Sie sich nach dem Essen`,
                `Champagner und Cocktails (moderat)`,
                `Spätabends, angepasster Essensplan`
                ],
            es: [
                `Comidas ligeras para mantener la energía.`,
                `Bocados pequeños y aperitivos en comidas copiosas.`,
                `Baila y muévete después de comer.`,
                `Champán y cócteles (moderado)`,
                `Tarde en la noche, horario de comidas ajustado`
                ]
        },
        dailyTracker: [
            { key: 'light_eating', label: { en: 'Light eating', ru: 'Лёгкое питание', kk: 'Жеңіл тамақтану', fr: 'Manger léger',
                de: `Leichtes Essen`,
                es: `comer ligero`
            } },
            { key: 'movement', label: { en: 'Danced or moved', ru: 'Танцевал или двигался', kk: 'Биледім немесе қозғалдым', fr: 'Dansé ou bougé',
                de: `Getanzt oder bewegt`,
                es: `Bailado o movido`
            } },
            { key: 'appetizers', label: { en: 'Appetizers over heavy meals', ru: 'Закуски вместо тяжёлого', kk: 'Ауыр тамақтың орнына тәбет ашар', fr: 'Amuse-bouches plutôt que lourd',
                de: `Vorspeisen zu schweren Mahlzeiten`,
                es: `Aperitivos sobre comidas copiosas`
            } },
            { key: 'energy_maintained', label: { en: 'Energy maintained', ru: 'Энергия сохранена', kk: 'Қуат сақталды', fr: 'Énergie maintenue',
                de: `Energie erhalten`,
                es: `Energía mantenida`
            } },
            { key: 'moderate_drinks', label: { en: 'Moderate drinks', ru: 'Умеренные напитки', kk: 'Қалыпты сусындар', fr: 'Boissons avec modération',
                de: `Mäßige Getränke`,
                es: `bebidas moderadas`
            } },
        ],
        sampleDay: {
            en: 'Brunch: Eggs, fresh fruit, coffee. Dinner: Shrimp cocktail, cheese plate, champagne. Late snack: Crackers with caviar. Dance all night!',
            ru: 'Бранч: яйца, свежие фрукты, кофе. Ужин: креветочный коктейль, сырная тарелка, шампанское. Поздний перекус: крекеры с икрой. Танцуй всю ночь!',
            kk: 'Бранч: жұмыртқа, таза жемістер, кофе. Кешкі ас: креветка коктейлі, ірімшік табағы, шампанское. Кешкі тіскебасар: уылдырықпен крекерлер. Түні бойы биле!',
            fr: 'Brunch : œufs, fruits, café. Dîner : cocktail crevettes, plateau fromages, champagne. Collation tardive : crackers caviar. Danser toute la nuit !',
            de: `Brunch: Eier, frisches Obst, Kaffee. Abendessen: Krabbencocktail, Käseplatte, Champagner. Später Snack: Cracker mit Kaviar. Tanze die ganze Nacht!`,
            es: `Brunch: Huevos, fruta fresca, café. Cena: Cóctel de camarones, plato de quesos, champagne. Merienda tardía: galletas saladas con caviar. ¡Baila toda la noche!`
        },
        notFor: null,
        suitableFor: ['parties', 'dancing', 'nightlife'],
        notSuitableFor: [],
        allowedFoods: ['appetizers', 'seafood', 'champagne', 'cheese', 'light_bites'],
        restrictedFoods: ['heavy_meals', 'bloating_foods', 'excessive_alcohol'],
        macroSplit: { protein: 25, carbs: 40, fat: 35 },
        tips: {
            en: ['Eat before going out', 'Stay hydrated between drinks', 'Dance off the calories'],
            ru: ['Ешьте перед выходом', 'Пейте воду между напитками', 'Сжигайте калории танцуя'],
            kk: ['Шықпас бұрын тамақтаныңыз', 'Сусындар арасында су ішіңіз', 'Калорияларды билеп жоғалтыңыз'],
            fr: ['Manger avant de sortir', 'S\'hydrater entre les verres', 'Brûler les calories en dansant'],
            de: [
                `Essen Sie, bevor Sie ausgehen`,
                `Bleiben Sie zwischen den Getränken ausreichend hydriert`,
                `Tanzen Sie die Kalorien ab`
                ],
            es: [
                `comer antes de salir`,
                `Mantente hidratada entre bebidas`,
                `Baila para quitarte las calorías`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
        color: '#9C27B0',
        isFeatured: false,
        popularityScore: 50,
        tags: ['vintage', 'disco', '1970s', 'party'],
    },

    // 46) 1980s Power Lunch
    {
        slug: 'eighties-power',
        name: { en: '1980s Power Lunch', ru: 'Бизнес-ланч 1980-х', kk: '1980-жылдар Power Lunch', fr: 'Power Lunch années 80',
            de: `Power-Lunch der 1980er Jahre`,
            es: `Almuerzo energético de los años 80`
        },
        description: { en: 'Inspired by 1980s corporate culture - power lunches, steak houses, business over meals, confident choices.', ru: 'В духе корпоративной культуры 1980-х - бизнес-ланчи, стейк-хаусы, дела за едой, уверенный выбор.', kk: '1980-жылдар корпоративтік мәдениетінен шабыт алған - бизнес-ланчтар, стейк-хаустар, тамақ үстінде іс, сенімді таңдау.', fr: 'Culture corporate années 80 - power lunches, steak-houses, affaires autour des repas, choix assurés.',
            de: `Inspiriert von der Unternehmenskultur der 1980er Jahre – Power-Lunches, Steakhäuser, Business-Over-Mahlzeiten, selbstbewusste Entscheidungen.`,
            es: `Inspirado en la cultura corporativa de la década de 1980: almuerzos energéticos, asadores, negocios durante las comidas, opciones seguras.`
        },
        shortDescription: { en: 'Power business eating', ru: 'Бизнес-питание', kk: 'Бизнес тамақтануы', fr: 'Alimentation business power',
            de: `Power-Business-Essen`,
            es: `Alimentación empresarial`
        },
        category: 'inspired',
        type: 'LIFESTYLE',
        difficulty: 'MODERATE',
        duration: 21,
        uiGroup: 'Vintage',
        evidenceLevel: 'low',
        disclaimerKey: 'DISCLAIMER_HISTORICAL',
        streakThreshold: 0.7,
        howItWorks: {
            en: [
                'Substantial, protein-rich lunches',
                'Quality steakhouses and business restaurants',
                'Confident, decisive ordering',
                'Networking during meals',
                'Balanced indulgence - work hard, eat well',
            ],
            ru: [
                'Сытные, богатые белком обеды',
                'Качественные стейк-хаусы и бизнес-рестораны',
                'Уверенный, решительный заказ',
                'Нетворкинг во время еды',
                'Сбалансированное удовольствие - много работай, хорошо ешь',
            ],
            kk: [
                'Ақуызға бай тойымды түскі астар',
                'Сапалы стейк-хаустар және бизнес мейрамханалар',
                'Сенімді, батыл тапсырыс',
                'Тамақ кезінде нетворкинг',
                'Теңгерімді рахат - көп жұмыс істе, жақсы тамақтан',
            ],
            fr: [
                'Déjeuners substantiels, riches en protéines',
                'Steak-houses et restaurants d\'affaires de qualité',
                'Commander avec assurance',
                'Networking pendant les repas',
                'Indulgence équilibrée - travailler dur, bien manger',
            ],
            de: [
                `Reichhaltige, proteinreiche Mittagessen`,
                `Hochwertige Steakhäuser und Business-Restaurants`,
                `Souveränes, entschlossenes Bestellen`,
                `Networking während der Mahlzeiten`,
                `Ausgewogener Genuss – hart arbeiten, gut essen`
                ],
            es: [
                `Almuerzos sustanciales y ricos en proteínas.`,
                `Asadores de calidad y restaurantes de negocios.`,
                `Pedido seguro y decisivo`,
                `Networking durante las comidas`,
                `Un capricho equilibrado: trabajar duro, comer bien`
                ]
        },
        dailyTracker: [
            { key: 'protein_lunch', label: { en: 'Protein-rich lunch', ru: 'Белковый обед', kk: 'Ақуызға бай түскі ас', fr: 'Déjeuner riche en protéines',
                de: `Proteinreiches Mittagessen`,
                es: `Almuerzo rico en proteínas`
            } },
            { key: 'quality_restaurant', label: { en: 'Quality restaurant', ru: 'Качественный ресторан', kk: 'Сапалы мейрамхана', fr: 'Restaurant de qualité',
                de: `Qualitätsrestaurant`,
                es: `Restaurante de calidad`
            } },
            { key: 'confident_order', label: { en: 'Ordered confidently', ru: 'Заказал уверенно', kk: 'Сенімді тапсырыс бердім', fr: 'Commandé avec assurance',
                de: `Mit gutem Gewissen bestellt`,
                es: `Ordenado con confianza`
            } },
            { key: 'networking', label: { en: 'Business discussion at meal', ru: 'Деловой разговор за едой', kk: 'Тамақ кезінде іскерлік әңгіме', fr: 'Discussion affaires au repas',
                de: `Geschäftsbesprechung beim Essen`,
                es: `Discusión de negocios en la comida`
            } },
            { key: 'balanced', label: { en: 'Balanced choice', ru: 'Сбалансированный выбор', kk: 'Теңгерімді таңдау', fr: 'Choix équilibré',
                de: `Ausgewogene Wahl`,
                es: `Elección equilibrada`
            } },
        ],
        sampleDay: {
            en: 'Breakfast: Continental - coffee, pastry, fruit. Power Lunch: Caesar salad, 8oz steak, steamed vegetables, sparkling water. Dinner: Light - soup, bread, wine.',
            ru: 'Завтрак: континентальный - кофе, выпечка, фрукты. Бизнес-ланч: салат Цезарь, стейк 250г, овощи на пару, минеральная вода. Ужин: лёгкий - суп, хлеб, вино.',
            kk: 'Таңғы ас: континенталдық - кофе, тоқаш, жеміс. Бизнес-ланч: Цезарь салаты, 250г стейк, бумен піскен көкөніс, минералды су. Кешкі ас: жеңіл - сорпа, нан, шарап.',
            fr: 'Petit-déj continental : café, viennoiserie, fruit. Power lunch : César, steak 250 g, légumes vapeur, eau pétillante. Dîner léger : soupe, pain, vin.',
            de: `Frühstück: Kontinental – Kaffee, Gebäck, Obst. Power-Lunch: Caesar-Salat, 8-Unzen-Steak, gedünstetes Gemüse, Mineralwasser. Abendessen: Leicht – Suppe, Brot, Wein.`,
            es: `Desayuno: Continental: café, pasteles, fruta. Almuerzo energético: ensalada César, bistec de 8 oz, verduras al vapor, agua con gas. Cena: Ligera: sopa, pan, vino.`
        },
        notFor: null,
        suitableFor: ['business', 'protein', 'networking'],
        notSuitableFor: [],
        allowedFoods: ['steak', 'salads', 'seafood', 'wine_moderate', 'quality_protein'],
        restrictedFoods: ['cheap_fast_food', 'eating_at_desk', 'skipping_meals'],
        macroSplit: { protein: 35, carbs: 35, fat: 30 },
        tips: {
            en: ['Always have business cards ready', 'Know the menu beforehand', 'Order decisively'],
            ru: ['Всегда имейте визитки наготове', 'Знайте меню заранее', 'Заказывайте решительно'],
            kk: ['Әрқашан визиткаларыңыз дайын болсын', 'Мәзірді алдын ала біліңіз', 'Батыл тапсырыс беріңіз'],
            fr: ['Cartes de visite prêtes', 'Connaître le menu à l\'avance', 'Commander avec décision'],
            de: [
                `Halten Sie Visitenkarten immer bereit`,
                `Machen Sie sich vorher mit der Speisekarte vertraut`,
                `Bestellen Sie entschieden`
                ],
            es: [
                `Tenga siempre listas las tarjetas de visita`,
                `Conoce el menú de antemano`,
                `Ordenar con decisión`
                ]
        },
        imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
        color: '#37474F',
        isFeatured: false,
        popularityScore: 55,
        tags: ['vintage', 'power', '1980s', 'business'],
    },
];

// Sample meal plans for Mediterranean diet
const mediterraneanMeals = [
    // Day 1
    { dayNumber: 1, mealType: 'breakfast', name: 'Greek Yogurt with Honey and Walnuts', calories: 320, protein: 15, carbs: 35, fat: 14, sortOrder: 1 },
    { dayNumber: 1, mealType: 'lunch', name: 'Mediterranean Salad with Grilled Chicken', calories: 450, protein: 35, carbs: 25, fat: 24, sortOrder: 2 },
    { dayNumber: 1, mealType: 'dinner', name: 'Baked Salmon with Roasted Vegetables', calories: 520, protein: 40, carbs: 30, fat: 28, sortOrder: 3 },
    { dayNumber: 1, mealType: 'snack', name: 'Hummus with Vegetable Sticks', calories: 180, protein: 6, carbs: 18, fat: 10, sortOrder: 4 },
    // Day 2
    { dayNumber: 2, mealType: 'breakfast', name: 'Avocado Toast with Poached Eggs', calories: 380, protein: 18, carbs: 30, fat: 22, sortOrder: 1 },
    { dayNumber: 2, mealType: 'lunch', name: 'Quinoa Bowl with Chickpeas', calories: 420, protein: 18, carbs: 55, fat: 15, sortOrder: 2 },
    { dayNumber: 2, mealType: 'dinner', name: 'Grilled Sea Bass with Herbs', calories: 480, protein: 42, carbs: 20, fat: 25, sortOrder: 3 },
    { dayNumber: 2, mealType: 'snack', name: 'Mixed Nuts and Dried Fruits', calories: 200, protein: 5, carbs: 25, fat: 12, sortOrder: 4 },
    // Day 3
    { dayNumber: 3, mealType: 'breakfast', name: 'Overnight Oats with Berries', calories: 350, protein: 12, carbs: 50, fat: 10, sortOrder: 1 },
    { dayNumber: 3, mealType: 'lunch', name: 'Falafel Wrap with Tahini', calories: 500, protein: 16, carbs: 55, fat: 25, sortOrder: 2 },
    { dayNumber: 3, mealType: 'dinner', name: 'Grilled Lamb Chops with Couscous', calories: 550, protein: 38, carbs: 40, fat: 28, sortOrder: 3 },
    { dayNumber: 3, mealType: 'snack', name: 'Fresh Fruit Plate', calories: 150, protein: 2, carbs: 35, fat: 1, sortOrder: 4 },
];

async function seedDiets() {
    console.log('Seeding diets...');

    for (const dietData of diets) {
        const diet = await prisma.dietProgram.upsert({
            where: { slug: dietData.slug },
            update: dietData as any,
            create: dietData as any,
        });

        console.log(`Created/updated diet: ${diet.slug}`);

        // Add meal plans for Mediterranean diet
        if (diet.slug === 'mediterranean') {
            // Create days first
            for (let dayNum = 1; dayNum <= 3; dayNum++) {
                const dayMeals = mediterraneanMeals.filter(m => m.dayNumber === dayNum);
                const totals = dayMeals.reduce(
                    (acc, m) => ({ cal: acc.cal + m.calories, p: acc.p + m.protein, c: acc.c + m.carbs, f: acc.f + m.fat }),
                    { cal: 0, p: 0, c: 0, f: 0 }
                );

                const day = await prisma.dietProgramDay.upsert({
                    where: { programId_dayNumber: { programId: diet.id, dayNumber: dayNum } },
                    update: {
                        title: `Day ${dayNum}`,
                        totalCalories: totals.cal,
                        totalProtein: totals.p,
                        totalCarbs: totals.c,
                        totalFat: totals.f,
                    },
                    create: {
                        programId: diet.id,
                        dayNumber: dayNum,
                        title: `Day ${dayNum}`,
                        totalCalories: totals.cal,
                        totalProtein: totals.p,
                        totalCarbs: totals.c,
                        totalFat: totals.f,
                    },
                });

                // Create meals for this day
                for (const meal of dayMeals) {
                    await prisma.dietProgramMeal.upsert({
                        where: { id: `${day.id}-${meal.mealType}` },
                        update: {
                            name: meal.name,
                            mealType: meal.mealType,
                            calories: meal.calories,
                            protein: meal.protein,
                            carbs: meal.carbs,
                            fat: meal.fat,
                            sortOrder: meal.sortOrder,
                        },
                        create: {
                            id: `${day.id}-${meal.mealType}`,
                            dayId: day.id,
                            name: meal.name,
                            mealType: meal.mealType,
                            calories: meal.calories,
                            protein: meal.protein,
                            carbs: meal.carbs,
                            fat: meal.fat,
                            sortOrder: meal.sortOrder,
                        },
                    });
                }
            }
            console.log(`Added meal plans for ${diet.slug}`);
        }
    }

    console.log('Diet seeding completed!');
}

seedDiets()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

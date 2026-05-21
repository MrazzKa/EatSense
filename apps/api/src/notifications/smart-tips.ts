// Curated smart-tip pool. 4 categories × 6 locales × ~8 tips each.
// Style guide:
//  - Never prescriptive ("you must"), always suggestive ("consider", "try").
//  - No specific medical claims or dosages without "consult your doctor first".
//  - Short (≤120 chars body) for push-friendly rendering.
//  - Each item: { title, body }. Both localized.

export type SmartTipCategory = 'sleep' | 'stress' | 'energy' | 'digestion';
export type SmartTipLocale = 'en' | 'ru' | 'kk' | 'fr' | 'de' | 'es';

export interface SmartTip {
    title: string;
    body: string;
}

type Pool = Record<SmartTipCategory, Record<SmartTipLocale, SmartTip[]>>;

export const SMART_TIPS: Pool = {
    sleep: {
        en: [
            { title: 'Wind down tonight', body: 'Try dimming screens an hour before bed — your melatonin will thank you.' },
            { title: 'Magnesium-rich dinner', body: 'Add spinach, pumpkin seeds or oats — they support natural sleep onset.' },
            { title: 'Caffeine cutoff', body: 'No coffee or matcha after 2pm helps the body wind down naturally.' },
            { title: 'Consider melatonin', body: 'A low dose (0.3–0.5mg) 30 min before bed may help. Check with your doctor first.' },
            { title: 'Cool & dark room', body: 'A bedroom under 19°C (66°F) tends to improve deep sleep.' },
            { title: 'Carb-protein snack', body: 'A small handful of nuts with a fruit can stabilise blood sugar overnight.' },
            { title: 'Skip late-night alcohol', body: 'Even one drink reduces REM sleep. Try sparkling water with lemon.' },
            { title: 'Consistent wake-time', body: 'Waking at the same time daily — even weekends — anchors your sleep rhythm.' },
        ],
        ru: [
            { title: 'Подготовка ко сну', body: 'Приглушите экраны за час до сна — мелатонин выработается легче.' },
            { title: 'Ужин с магнием', body: 'Шпинат, тыквенные семечки, овсянка — помогают засыпать естественно.' },
            { title: 'Кофеин до 14:00', body: 'Кофе и матча после обеда мешают организму расслабиться вечером.' },
            { title: 'Подумайте про мелатонин', body: 'Низкая доза (0.3–0.5 мг) за 30 мин до сна может помочь. Уточните у врача.' },
            { title: 'Прохладная спальня', body: 'Температура ниже 19°C обычно улучшает глубокий сон.' },
            { title: 'Лёгкий перекус', body: 'Горсть орехов с фруктом стабилизирует сахар в крови ночью.' },
            { title: 'Без алкоголя на ночь', body: 'Даже один бокал снижает REM-фазу. Попробуйте газированную воду с лимоном.' },
            { title: 'Один час подъёма', body: 'Просыпаться в одно время — даже в выходные — настраивает биоритмы.' },
        ],
        kk: [
            { title: 'Ұйықтауға дайындық', body: 'Ұйықтаудан бір сағат бұрын экрандарды күңгірттеңіз — мелатонин жеңіл бөлінеді.' },
            { title: 'Магниймен кешкі ас', body: 'Шпинат, асқабақ дәндері, сұлы — табиғи ұйқыға көмектеседі.' },
            { title: 'Кофеин 14:00-ге дейін', body: 'Түстен кейін кофе мен матча ағзаға кешке тыныштануға кедергі келтіреді.' },
            { title: 'Мелатонин туралы ойланыңыз', body: 'Ұйықтауға 30 мин қалғанда 0.3–0.5 мг доза көмектесуі мүмкін. Дәрігерден сұраңыз.' },
            { title: 'Салқын жатын бөлме', body: '19°C-ден төмен температура терең ұйқыны жақсартады.' },
            { title: 'Жеңіл тағам', body: 'Жаңғақ пен жеміс түнгі қандағы қантты тұрақтандырады.' },
            { title: 'Түнде алкогольсіз', body: 'Бір бокал да REM фазасын азайтады. Лимонмен газды су сынап көріңіз.' },
            { title: 'Бір уақытта ояну', body: 'Күн сайын бір уақытта ояну — биоритмді реттейді.' },
        ],
        fr: [
            { title: 'Préparez la nuit', body: 'Diminuez la luminosité des écrans 1h avant le coucher — la mélatonine vous remerciera.' },
            { title: 'Dîner riche en magnésium', body: 'Épinards, graines de courge, avoine — favorisent l\'endormissement naturel.' },
            { title: 'Caféine avant 14h', body: 'Le café ou le matcha tardifs empêchent le corps de se détendre.' },
            { title: 'Pensez à la mélatonine', body: 'Une faible dose (0.3–0.5mg) 30 min avant peut aider. Parlez-en à votre médecin.' },
            { title: 'Chambre fraîche', body: 'Une chambre sous 19°C améliore le sommeil profond.' },
            { title: 'Encas léger', body: 'Une poignée de noix avec un fruit stabilise la glycémie nocturne.' },
            { title: 'Pas d\'alcool le soir', body: 'Même un verre réduit le sommeil REM. Essayez de l\'eau pétillante au citron.' },
            { title: 'Heure de réveil fixe', body: 'Se réveiller à la même heure — même le week-end — règle l\'horloge interne.' },
        ],
        de: [
            { title: 'Heute Abend runterkommen', body: 'Bildschirme eine Stunde vor dem Schlafen dimmen — gut für das Melatonin.' },
            { title: 'Magnesiumreiches Abendessen', body: 'Spinat, Kürbiskerne oder Hafer fördern natürliches Einschlafen.' },
            { title: 'Koffein vor 14 Uhr', body: 'Kaffee oder Matcha am Nachmittag stören die abendliche Entspannung.' },
            { title: 'Melatonin überlegen', body: 'Niedrige Dosis (0.3–0.5mg) 30 min vor dem Bett kann helfen. Erst mit Arzt sprechen.' },
            { title: 'Kühles Schlafzimmer', body: 'Unter 19°C verbessert sich oft der Tiefschlaf.' },
            { title: 'Leichter Snack', body: 'Eine Handvoll Nüsse mit Obst stabilisiert nachts den Blutzucker.' },
            { title: 'Kein Alkohol abends', body: 'Schon ein Glas reduziert REM-Schlaf. Probieren Sie Sprudel mit Zitrone.' },
            { title: 'Feste Aufstehzeit', body: 'Täglich zur gleichen Zeit aufstehen — auch am Wochenende — fixiert den Rhythmus.' },
        ],
        es: [
            { title: 'Relájate esta noche', body: 'Baja el brillo de las pantallas 1h antes de dormir — la melatonina te lo agradecerá.' },
            { title: 'Cena rica en magnesio', body: 'Espinacas, semillas de calabaza o avena ayudan a conciliar el sueño.' },
            { title: 'Cafeína antes de las 14h', body: 'Café o matcha por la tarde dificultan el descanso nocturno.' },
            { title: 'Considera la melatonina', body: 'Dosis baja (0.3–0.5mg) 30 min antes puede ayudar. Consulta a tu médico primero.' },
            { title: 'Habitación fresca', body: 'Por debajo de 19°C suele mejorar el sueño profundo.' },
            { title: 'Tentempié ligero', body: 'Un puñado de frutos secos con fruta estabiliza la glucosa nocturna.' },
            { title: 'Sin alcohol nocturno', body: 'Una copa ya reduce el sueño REM. Prueba agua con gas y limón.' },
            { title: 'Hora fija de despertar', body: 'Levantarte a la misma hora — incluso fines de semana — fija tu ritmo.' },
        ],
    },
    stress: {
        en: [
            { title: '4-7-8 breathing', body: 'Inhale 4s, hold 7s, exhale 8s. Three rounds drop heart rate fast.' },
            { title: 'Step outside', body: 'Even 10 minutes of daylight lowers cortisol.' },
            { title: 'Magnesium glycinate', body: 'Many find it calming in the evening. Discuss with your doctor.' },
            { title: 'Box breathing', body: '4 in, 4 hold, 4 out, 4 hold — repeat for 2 min before a stressful moment.' },
            { title: 'Skip the second coffee', body: 'A second espresso amplifies anxiety. Try green tea or matcha instead.' },
            { title: 'Walk it off', body: 'A 20-min walk after lunch reduces stress and stabilises blood sugar.' },
            { title: 'Omega-3 dinner', body: 'Salmon, sardines or walnuts support a calmer nervous system.' },
            { title: 'Phone-free hour', body: 'Try one hour offline before bed — your nervous system will downshift.' },
        ],
        ru: [
            { title: 'Дыхание 4-7-8', body: 'Вдох 4 сек, задержка 7 сек, выдох 8 сек. Три цикла снижают пульс.' },
            { title: 'Выйдите на улицу', body: 'Даже 10 минут дневного света снижают кортизол.' },
            { title: 'Магний-глицинат', body: 'Многим помогает успокоиться вечером. Обсудите с врачом.' },
            { title: 'Квадратное дыхание', body: '4 вдох, 4 пауза, 4 выдох, 4 пауза — 2 минуты перед стрессом.' },
            { title: 'Откажитесь от второй чашки', body: 'Второй эспрессо усиливает тревожность. Попробуйте зелёный чай.' },
            { title: 'Прогулка', body: '20 минут после обеда снижают стресс и стабилизируют сахар.' },
            { title: 'Омега-3 на ужин', body: 'Лосось, сардины или грецкие орехи поддерживают нервную систему.' },
            { title: 'Час без телефона', body: 'Час офлайн перед сном — нервная система переключится.' },
        ],
        kk: [
            { title: '4-7-8 тыныс алу', body: 'Дем алу 4 сек, ұстау 7 сек, шығару 8 сек. 3 рет жасасаңыз — пульс түседі.' },
            { title: 'Көшеге шығыңыз', body: '10 минут күн жарығы кортизол деңгейін түсіреді.' },
            { title: 'Магний-глицинат', body: 'Көптеген адамға кешке тыныш етеді. Дәрігермен сөйлесіңіз.' },
            { title: 'Шаршылық тыныс алу', body: '4 дем алу, 4 пауза, 4 шығару, 4 пауза — 2 минут.' },
            { title: 'Екінші кофеден бас тартыңыз', body: 'Екінші эспрессо мазасыздықты күшейтеді. Жасыл шай көріңіз.' },
            { title: 'Серуен', body: 'Түскі астан кейін 20 минут стрессті азайтып, қантты тұрақтандырады.' },
            { title: 'Кешкі омега-3', body: 'Лосось, сардина, жаңғақ — жүйке жүйесін қолдайды.' },
            { title: 'Телефонсыз сағат', body: 'Ұйықтау алдында бір сағат офлайн — жүйке жүйесі сабырға келеді.' },
        ],
        fr: [
            { title: 'Respiration 4-7-8', body: 'Inspirez 4s, retenez 7s, expirez 8s. 3 cycles baissent le rythme cardiaque.' },
            { title: 'Sortez prendre l\'air', body: '10 min de lumière du jour suffisent à baisser le cortisol.' },
            { title: 'Magnésium glycinate', body: 'Beaucoup le trouvent apaisant le soir. Parlez-en à votre médecin.' },
            { title: 'Respiration carrée', body: '4 inspirations, 4 pauses, 4 expirations, 4 pauses — 2 min avant un stress.' },
            { title: 'Évitez le 2e café', body: 'Un 2e espresso amplifie l\'anxiété. Essayez le thé vert ou matcha.' },
            { title: 'Marchez', body: '20 min de marche après déjeuner réduit le stress et stabilise la glycémie.' },
            { title: 'Dîner riche en oméga-3', body: 'Saumon, sardines, noix — soutiennent un système nerveux apaisé.' },
            { title: 'Heure sans téléphone', body: '1h offline avant le coucher — le système nerveux ralentit.' },
        ],
        de: [
            { title: '4-7-8 Atmung', body: '4s einatmen, 7s halten, 8s ausatmen. 3 Runden senken den Puls schnell.' },
            { title: 'Nach draussen gehen', body: '10 Minuten Tageslicht senken den Cortisolspiegel.' },
            { title: 'Magnesium-Glycinat', body: 'Viele empfinden es abends beruhigend. Mit Arzt besprechen.' },
            { title: 'Box-Atmung', body: '4 ein, 4 halten, 4 aus, 4 halten — 2 Minuten vor Stress.' },
            { title: 'Kein zweiter Kaffee', body: 'Ein zweiter Espresso verstärkt Angst. Probieren Sie Grüntee oder Matcha.' },
            { title: 'Spaziergang', body: '20 min nach dem Mittag senken Stress und Blutzucker.' },
            { title: 'Omega-3-Abendessen', body: 'Lachs, Sardinen oder Walnüsse beruhigen das Nervensystem.' },
            { title: 'Eine Stunde ohne Handy', body: '1h offline vor dem Schlafen — das Nervensystem schaltet runter.' },
        ],
        es: [
            { title: 'Respiración 4-7-8', body: 'Inhala 4s, retén 7s, exhala 8s. 3 rondas bajan la frecuencia cardíaca.' },
            { title: 'Sal a la luz', body: '10 min de luz natural bajan el cortisol.' },
            { title: 'Magnesio glicinato', body: 'Muchos lo encuentran relajante por la noche. Consulta a tu médico.' },
            { title: 'Respiración cuadrada', body: '4 inhalas, 4 pausa, 4 exhalas, 4 pausa — 2 minutos antes del estrés.' },
            { title: 'Evita el segundo café', body: 'Un segundo espresso aumenta la ansiedad. Prueba té verde o matcha.' },
            { title: 'Camina', body: '20 min después de comer reduce el estrés y estabiliza la glucosa.' },
            { title: 'Cena con omega-3', body: 'Salmón, sardinas o nueces apoyan el sistema nervioso.' },
            { title: 'Hora sin teléfono', body: '1h offline antes de dormir — el sistema nervioso se calma.' },
        ],
    },
    energy: {
        en: [
            { title: 'Protein-first breakfast', body: '30g protein in the morning stabilises energy for hours.' },
            { title: 'Hydrate before coffee', body: '500ml water on waking — most fatigue is dehydration.' },
            { title: 'Morning sunlight', body: '10 min outside within an hour of waking sets your energy clock.' },
            { title: 'Iron-rich lunch', body: 'Spinach, lentils or red meat help if afternoons feel flat.' },
            { title: 'B-vitamin foods', body: 'Eggs, salmon, leafy greens support energy metabolism.' },
            { title: 'Skip the sugar crash', body: 'Swap a pastry for nuts + fruit — slower glucose curve, longer energy.' },
            { title: 'Movement break', body: 'A 5-min walk every 90 min beats afternoon brain fog.' },
            { title: 'Cold splash', body: '30 sec of cold water on the face activates the vagus nerve.' },
        ],
        ru: [
            { title: 'Белок на завтрак', body: '30 г белка с утра стабилизирует энергию на часы.' },
            { title: 'Сначала вода', body: '500 мл воды после пробуждения — усталость часто из-за обезвоживания.' },
            { title: 'Утреннее солнце', body: '10 минут на улице в первый час — настраивает энергобиоритм.' },
            { title: 'Железо на обед', body: 'Шпинат, чечевица, красное мясо — если днём вялость.' },
            { title: 'B-витамины', body: 'Яйца, лосось, зелень — поддерживают энергетический обмен.' },
            { title: 'Без сахарного провала', body: 'Орехи с фруктом вместо булочки — глюкоза стабильнее, энергии больше.' },
            { title: 'Двигайтесь', body: '5 минут ходьбы каждые 90 минут — против послеобеденного тумана.' },
            { title: 'Холодная вода', body: '30 секунд холодной воды на лицо активирует блуждающий нерв.' },
        ],
        kk: [
            { title: 'Таңертең ақуыз', body: 'Таңертең 30 г ақуыз энергияны сағаттар бойы тұрақтандырады.' },
            { title: 'Алдымен су', body: 'Оянған соң 500 мл су — шаршау көбіне сусыздандырудан.' },
            { title: 'Таңғы күн', body: '10 минут күн — энергия биоритмін реттейді.' },
            { title: 'Темірлі түскі ас', body: 'Шпинат, жасымық, қызыл ет — егер күндіз әлсіз болсаңыз.' },
            { title: 'B-витаминдер', body: 'Жұмыртқа, лосось, көк жапырақтар — энергия алмасуын қолдайды.' },
            { title: 'Қантсыз ас', body: 'Жаңғақ пен жеміс — глюкоза тұрақтырақ, энергия ұзақ.' },
            { title: 'Қимылдаңыз', body: '90 минут сайын 5 минут жүру — түстен кейінгі шаршауға қарсы.' },
            { title: 'Салқын су', body: '30 секунд бетке салқын су — кезеген нервті іске қосады.' },
        ],
        fr: [
            { title: 'Petit-déjeuner protéiné', body: '30g de protéines le matin stabilisent l\'énergie pour des heures.' },
            { title: 'Eau avant café', body: '500ml d\'eau au réveil — la fatigue est souvent une déshydratation.' },
            { title: 'Lumière matinale', body: '10 min dehors dans l\'heure du réveil règle votre horloge énergétique.' },
            { title: 'Déjeuner riche en fer', body: 'Épinards, lentilles, viande rouge — si vos après-midis sont mous.' },
            { title: 'Vitamines B', body: 'Œufs, saumon, feuilles vertes — soutiennent le métabolisme énergétique.' },
            { title: 'Évitez le pic de sucre', body: 'Noix + fruit au lieu d\'une viennoiserie — glycémie plus stable.' },
            { title: 'Bougez', body: '5 min de marche toutes les 90 min combattent le brouillard de l\'après-midi.' },
            { title: 'Eau froide', body: '30 sec d\'eau froide sur le visage active le nerf vague.' },
        ],
        de: [
            { title: 'Eiweiss zum Frühstück', body: '30g Protein am Morgen stabilisieren die Energie stundenlang.' },
            { title: 'Wasser vor Kaffee', body: '500ml Wasser nach dem Aufstehen — Müdigkeit ist oft Dehydrierung.' },
            { title: 'Morgensonne', body: '10 min draussen in der ersten Stunde stellt Ihre Energieuhr ein.' },
            { title: 'Eisenreiches Mittagessen', body: 'Spinat, Linsen, rotes Fleisch — falls Nachmittage flau sind.' },
            { title: 'B-Vitamine', body: 'Eier, Lachs, grüne Blätter — unterstützen den Energiestoffwechsel.' },
            { title: 'Kein Zuckerabsturz', body: 'Nüsse mit Obst statt Gebäck — stabilere Glukose, längere Energie.' },
            { title: 'Bewegen', body: '5 min Spazieren alle 90 min — gegen Nachmittagstief.' },
            { title: 'Kaltes Wasser', body: '30 Sek kaltes Wasser ins Gesicht aktiviert den Vagusnerv.' },
        ],
        es: [
            { title: 'Desayuno con proteína', body: '30g de proteína por la mañana estabilizan la energía durante horas.' },
            { title: 'Agua antes del café', body: '500ml de agua al despertar — la fatiga suele ser deshidratación.' },
            { title: 'Sol matutino', body: '10 min al aire libre tras despertar ajusta tu reloj energético.' },
            { title: 'Comida rica en hierro', body: 'Espinacas, lentejas o carne roja — si por la tarde estás flojo.' },
            { title: 'Vitaminas B', body: 'Huevos, salmón, verdes — apoyan el metabolismo energético.' },
            { title: 'Evita el bajón de azúcar', body: 'Frutos secos + fruta en vez de bollería — glucosa más estable.' },
            { title: 'Muévete', body: '5 min de paseo cada 90 min combaten la niebla mental de la tarde.' },
            { title: 'Agua fría', body: '30 seg de agua fría en la cara activa el nervio vago.' },
        ],
    },
    digestion: {
        en: [
            { title: 'Fiber, slowly', body: 'Add 5g fiber/week — too fast causes bloating. Oats and berries are gentle.' },
            { title: 'Ginger for bloating', body: 'A cup of fresh ginger tea after meals can ease the heavy feeling.' },
            { title: 'Hydrate between meals', body: 'Water during meals can dilute stomach acid. Try sipping between meals.' },
            { title: 'Fermented foods', body: 'A spoonful of kefir, kimchi or sauerkraut daily supports gut flora.' },
            { title: 'Slow down', body: 'Chew each bite 20 times — your stomach has no teeth.' },
            { title: 'Walk after dinner', body: 'A 10-min walk post-meal reduces bloating and improves transit.' },
            { title: 'Trigger awareness', body: 'Track meals for 3 days when you bloat — patterns will show up.' },
            { title: 'Magnesium citrate', body: 'For occasional constipation, 200mg can help. Discuss with your doctor.' },
        ],
        ru: [
            { title: 'Клетчатка плавно', body: 'Добавляйте 5 г/неделю — резко = вздутие. Овсянка и ягоды мягкие.' },
            { title: 'Имбирь от вздутия', body: 'Чашка свежего имбирного чая после еды снимает тяжесть.' },
            { title: 'Вода между приёмами', body: 'Вода во время еды разбавляет желудочный сок. Пейте между приёмами.' },
            { title: 'Ферментированные продукты', body: 'Ложка кефира, кимчи или квашеной капусты — поддержка микрофлоры.' },
            { title: 'Не торопитесь', body: 'Жуйте 20 раз — у желудка нет зубов.' },
            { title: 'Прогулка после ужина', body: '10 минут ходьбы после еды снижают вздутие и улучшают транзит.' },
            { title: 'Триггеры', body: 'Записывайте еду 3 дня при вздутии — закономерность проявится.' },
            { title: 'Цитрат магния', body: 'При запорах иногда 200 мг помогают. Уточните у врача.' },
        ],
        kk: [
            { title: 'Талшықты бірте-бірте', body: 'Аптасына 5 г қосыңыз — тез қосса іш кебеді. Сұлы мен жидек жұмсақ.' },
            { title: 'Зімбір', body: 'Тамақтан кейін бір кесе зімбір шайы ауырлықты жояды.' },
            { title: 'Тамақ арасында су', body: 'Тамақ кезінде су асқазан сөлін сұйылтады. Арасында ішіңіз.' },
            { title: 'Ашытылған тағамдар', body: 'Күнделікті бір қасық кефир, кимчи немесе тұздалған қырыққабат.' },
            { title: 'Асықпаңыз', body: '20 рет шайнаңыз — асқазанда тіс жоқ.' },
            { title: 'Кешкі астан кейін серуен', body: '10 минут жүру іш кебуін азайтып, транзитті жақсартады.' },
            { title: 'Триггерлер', body: 'Іш кеуенде 3 күн тамақты жазыңыз — заңдылық көрінеді.' },
            { title: 'Магний цитраты', body: 'Кейде іш қату кезінде 200 мг көмектеседі. Дәрігерден сұраңыз.' },
        ],
        fr: [
            { title: 'Fibres progressivement', body: '+5g de fibres/semaine — trop vite = ballonnements. Avoine et baies sont douces.' },
            { title: 'Gingembre', body: 'Une tasse de tisane au gingembre après repas soulage la lourdeur.' },
            { title: 'Eau entre les repas', body: 'L\'eau pendant les repas dilue les sucs digestifs. Buvez entre les repas.' },
            { title: 'Aliments fermentés', body: 'Une cuillère de kéfir, kimchi ou choucroute — bon pour la flore.' },
            { title: 'Ralentissez', body: 'Mâchez 20 fois — l\'estomac n\'a pas de dents.' },
            { title: 'Marche après dîner', body: '10 min de marche après le repas réduisent ballonnements et améliorent le transit.' },
            { title: 'Repérez les déclencheurs', body: 'Notez vos repas pendant 3 jours — les patterns apparaîtront.' },
            { title: 'Citrate de magnésium', body: 'Pour constipation occasionnelle, 200mg peut aider. Parlez-en à votre médecin.' },
        ],
        de: [
            { title: 'Ballaststoffe langsam', body: '+5g pro Woche — zu schnell = Blähungen. Hafer und Beeren sind sanft.' },
            { title: 'Ingwer', body: 'Eine Tasse frischer Ingwertee nach den Mahlzeiten lindert das Völlegefühl.' },
            { title: 'Wasser zwischen Mahlzeiten', body: 'Wasser zum Essen verdünnt Magensäure. Lieber zwischendurch trinken.' },
            { title: 'Fermentierte Lebensmittel', body: 'Täglich ein Löffel Kefir, Kimchi oder Sauerkraut für die Darmflora.' },
            { title: 'Langsam essen', body: '20 mal kauen — der Magen hat keine Zähne.' },
            { title: 'Spaziergang nach dem Essen', body: '10 min nach dem Essen reduzieren Blähungen und fördern die Verdauung.' },
            { title: 'Auslöser erkennen', body: 'Mahlzeiten 3 Tage tracken — Muster werden sichtbar.' },
            { title: 'Magnesiumcitrat', body: 'Gelegentlich helfen 200mg bei Verstopfung. Mit Arzt besprechen.' },
        ],
        es: [
            { title: 'Fibra poco a poco', body: '+5g/semana — añadir muy rápido causa hinchazón. La avena y bayas son suaves.' },
            { title: 'Jengibre', body: 'Una taza de té de jengibre tras las comidas alivia la pesadez.' },
            { title: 'Agua entre comidas', body: 'El agua durante las comidas diluye los jugos gástricos. Mejor entre comidas.' },
            { title: 'Alimentos fermentados', body: 'Cucharada de kéfir, kimchi o chucrut al día — apoya la flora intestinal.' },
            { title: 'Despacio', body: 'Mastica 20 veces — el estómago no tiene dientes.' },
            { title: 'Camina tras cenar', body: '10 min después de comer reducen hinchazón y mejoran el tránsito.' },
            { title: 'Detecta los detonantes', body: 'Anota tus comidas 3 días — los patrones aparecerán.' },
            { title: 'Citrato de magnesio', body: 'Para estreñimiento ocasional, 200mg puede ayudar. Consulta a tu médico.' },
        ],
    },
};

/**
 * Pick the next category in rotation given the user's enabled issues and the
 * last category they received. Stable rotation across categories.
 */
export function pickNextCategory(
    enabledIssues: string[],
    lastCategory: string | null,
): SmartTipCategory | null {
    const valid = enabledIssues.filter((i): i is SmartTipCategory =>
        ['sleep', 'stress', 'energy', 'digestion'].includes(i),
    );
    if (!valid.length) return null;
    if (!lastCategory) return valid[0];
    const idx = valid.indexOf(lastCategory as SmartTipCategory);
    if (idx === -1) return valid[0];
    return valid[(idx + 1) % valid.length];
}

/**
 * Pick a tip for the given category + locale. Pseudo-random by current day so
 * the same user gets a different tip each day even with the same category.
 */
export function pickTip(
    category: SmartTipCategory,
    locale: string,
    userId: string,
): SmartTip {
    const loc = (['en', 'ru', 'kk', 'fr', 'de', 'es'] as const).includes(locale as any)
        ? (locale as SmartTipLocale)
        : 'en';
    const pool = SMART_TIPS[category][loc];
    // Stable seed: dayOfYear + first 4 chars of userId hashed via sum.
    const day = Math.floor(Date.now() / 86400000);
    let seed = day;
    for (let i = 0; i < Math.min(userId.length, 8); i++) seed = (seed + userId.charCodeAt(i)) >>> 0;
    return pool[seed % pool.length];
}

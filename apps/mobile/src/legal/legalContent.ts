// src/legal/legalContent.ts
// Centralized legal texts for Privacy Policy and Terms of Use.
// Full translations: EN / RU / KK / FR / DE / ES (all 6 app languages).

export type LegalDocumentType = 'privacy' | 'terms';

export type LegalLangCode = 'en' | 'ru' | 'kk' | 'fr' | 'de' | 'es';
type LangCode = LegalLangCode;

/**
 * Resolve any app language tag (e.g. "fr", "fr-CH", "pt") to a legal language
 * we actually have content for, falling back to English.
 */
export function resolveLegalLang(language?: string | null): LegalLangCode {
  const base = (language || 'en').slice(0, 2).toLowerCase();
  const supported: LegalLangCode[] = ['en', 'ru', 'kk', 'fr', 'de', 'es'];
  return (supported as string[]).includes(base) ? (base as LegalLangCode) : 'en';
}

interface LegalDocumentMap {
  [_key: string]: {
    [K in LangCode]: string;
  };
}

export const legalDocuments: LegalDocumentMap = {
  privacy: {
    en: `
Privacy Policy – EatSense

Last updated: 01 Dec 2025

This Privacy Policy explains how the EatSense mobile application (“App”, “we”, “us”) collects, uses, and protects your personal data. By installing and using the App, you agree to the practices described here.

1. Who controls your data

The data controller is:
TEMONAN Geneva Holdings Sàrl, Rue Vignier 8, 1205 Geneva
Contact email: info@eatsense.ch

2. What data we collect

We may collect and process the following categories of data:

• Account data  
  – email address;  
  – name and (optionally) surname;  
  – interface language.

• Profile and health-related data (non-medical)  
  – age, gender, height, weight;  
  – goals (weight loss, maintenance, muscle gain);  
  – diet type and eating habits (meals per day, snacking, etc.);  
  – body measurements (for example, waist and hip size, approximate body fat);  
  – health focus areas such as blood sugar, cholesterol and others, if you choose to specify them.

• Food tracking and usage data  
  – photos of meals and text descriptions;  
  – AI analysis results (calories, macros, “health” score);  
  – saved meals and recent entries;  
  – daily and monthly nutrition statistics.

• Laboratory results (if you use this feature)  
  – uploaded photos or files of blood tests and other lab reports;  
  – selected type of analysis (for example, complete blood count, biochemistry, lipid profile, etc.) or automatically detected type;  
  – AI-generated comments and explanations based on your results.

• Technical data  
  – device model, OS version, app version;  
  – IP address, request time, internal identifiers;  
  – push notification tokens;  
  – client and server error logs.

• Subscription data  
  – subscription status (Free / Pro);  
  – information about purchases and renewals via App Store / Google Play (we do not store your card number or full payment details).

We do not store data that directly identifies your bank card. Payments are processed by Apple, Google or other payment providers.

3. Why we use your data

We use your data only for legitimate purposes, including:

• Providing the core functionality of the App  
  – account registration and login;  
  – synchronizing your profile and meal history;  
  – displaying statistics, recent entries and insights.

• AI analysis of meals and lab results  
  – recognizing dishes from photos;  
  – calculating approximate calories and macros;  
  – generating nutrition and lifestyle suggestions;  
  – analysing uploaded lab results and producing easy-to-read comments.

• Personalisation and product improvement  
  – selecting relevant educational content and articles;  
  – improving our AI and recommendation models (using anonymised and aggregated data);  
  – usage analytics and debugging.

• Communication with you  
  – service emails and in-app messages (for example, login codes, critical updates);  
  – push notifications and reminders, if enabled;  
  – responses to your support requests.

• Legal compliance and protection  
  – responding to lawful requests from authorities;  
  – preventing fraud, abuse and security incidents.

4. AI providers and third-party services

For image, text and lab-result analysis we may use third-party AI providers and cloud infrastructure.  
Data is transmitted via encrypted channels and used only to provide the App’s features. We do not sell your personal data.

5. Legal bases for processing

Depending on your country, we process your data based on:

• your consent (for example, for uploading photos, lab results, enabling notifications);  
• the need to perform our agreement with you (providing the services of the App);  
• our legitimate interests in improving the service and protecting users, while respecting your rights and expectations.

You may withdraw your consent at any time in the App settings or by contacting support.

6. Sharing your data

We may share data with:

• cloud and infrastructure providers (hosting, storage, logs, analytics);  
• push notification and email delivery services;  
• payment and platform providers (App Store / Google Play);  
• public authorities, only where required by law.

Each partner receives only the data that is necessary for its role.

7. Data retention

We retain your data only as long as necessary:

• account and profile data – while you actively use the App;  
• technical logs – for a limited period (for example 6–24 months);  
• legal and accounting records – for the period required by applicable law.

You may request deletion or anonymisation of your data (see “Your rights” below).

8. Your rights

Depending on applicable law, you may have the right to:

• access your personal data;  
• correct inaccurate information;  
• request deletion of data when it is no longer needed;  
• restrict or object to certain types of processing;  
• receive a copy of your data in a portable format, where technically possible.

To exercise these rights, contact us at info@eatsense.ch. We may ask you to verify your identity.

9. Security

We take reasonable technical and organisational measures to protect your data, including:

• encrypted connections (HTTPS);  
• access control and logging;  
• monitoring for unusual activity.

No online service can guarantee 100% security, so please also protect access to your device and email.

10. Children

The App is not intended for children under 13 (or another minimum age defined by local law).  
We do not knowingly collect data from such users. If you believe a child has provided us with personal data, please contact us so we can delete it.

11. Changes to this Policy

We may update this Privacy Policy from time to time. The latest version will always be available inside the App. When we make significant changes, we may show an additional notice or request renewed consent where required.
`,

    ru: `
Политика конфиденциальности – EatSense

Дата обновления: 01.12.2025

Настоящая Политика конфиденциальности описывает, как мобильное приложение EatSense (далее – «Приложение», «мы») собирает, использует и защищает персональные данные пользователей. Устанавливая и используя Приложение, вы подтверждаете, что ознакомились с данной Политикой и соглашаетесь с её условиями.

1. Оператор персональных данных

Оператором персональных данных является:
TEMONAN Geneva Holdings Sàrl, Rue Vignier 8, 1205 Geneva  
Email для связи: info@eatsense.ch

2. Какие данные мы собираем

Мы можем обрабатывать следующие категории данных:

• Данные аккаунта  
  – адрес электронной почты;  
  – имя и (при желании) фамилия;  
  – язык интерфейса.

• Данные профиля и здоровья (не медицинский диагноз)  
  – возраст, пол, рост, вес;  
  – цели (похудение, поддержание веса, набор массы);  
  – тип диеты и особенности питания (число приёмов пищи в день, перекусы и т.п.);  
  – параметры тела (например, окружность талии и бёдер, ориентировочный процент жира);  
  – приоритетные области здоровья, если вы их указываете (сахар, холестерин и др.).

• Данные о питании и использовании Приложения  
  – фото блюд и текстовые описания;  
  – результаты AI-анализа (калории, БЖУ, оценка «полезности»);  
  – сохранённые записи и недавние блюда;  
  – статистика по питанию за день, неделю, месяц.

• Лабораторные анализы (если вы пользуетесь этой функцией)  
  – загруженные фотографии или файлы анализов (например, ОАК, биохимия, липидный профиль и т.д.);  
  – выбранный или автоматически определённый тип анализа;  
  – текстовые комментарии и объяснения, сгенерированные AI-ассистентом.

• Технические данные  
  – модель устройства, версия ОС, версия Приложения;  
  – IP-адрес, время запросов, внутренние идентификаторы;  
  – токены для push-уведомлений;  
  – логи ошибок клиента и сервера.

• Данные подписки  
  – статус подписки (Free / Pro);  
  – информация о покупке и продлении через App Store / Google Play.  
Мы не храним полные данные банковских карт – ими управляет платёжная платформа.

3. Для чего мы используем данные

Ваши данные используются только для законных и понятных целей:

• Работа Приложения  
  – регистрация и вход в аккаунт;  
  – синхронизация профиля и истории питания;  
  – показ статистики, недавних записей и рекомендаций.

• AI-анализ питания и анализов  
  – распознавание блюд по фотографиям;  
  – расчёт примерных калорий и БЖУ;  
  – рекомендации по питанию и образу жизни;  
  – анализ загруженных лабораторных результатов и формирование понятных пояснений.

• Персонализация и улучшение сервиса  
  – подбор релевантных статей и обучающих материалов;  
  – улучшение алгоритмов и AI-моделей (на основе обезличенных и агрегированных данных);  
  – аналитика использования и поиск ошибок.

• Коммуникация с пользователем  
  – сервисные сообщения (например, коды входа);  
  – push-уведомления и напоминания, если они включены;  
  – ответы службы поддержки.

• Юридические цели и безопасность  
  – выполнение требований законодательства;  
  – защита от мошенничества, злоупотреблений и атак.

4. AI и сторонние сервисы

Для анализа изображений, текстов и лабораторных данных мы можем использовать сторонние AI-провайдеры и облачную инфраструктуру.  
Передача данных происходит по защищённым каналам и только в объёме, необходимом для работы функций Приложения. Мы не продаём ваши персональные данные.

5. Правовые основания обработки

В зависимости от юрисдикции мы обрабатываем данные на следующих основаниях:

• ваше согласие (например, на загрузку фотографий, анализов, получение уведомлений);  
• необходимость исполнения пользовательского соглашения (оказание услуг Приложения);  
• законный интерес в улучшении сервиса и обеспечении безопасности при соблюдении ваших прав.

Вы можете в любой момент отозвать согласие в настройках или обратившись в поддержку.

6. Передача данных третьим лицам

Данные могут передаваться:

• облачным и техническим провайдерам (хостинг, хранение файлов, аналитика, логи);  
• сервисам рассылки и push-уведомлений;  
• платёжным и платформенным провайдерам (App Store / Google Play);  
• государственным органам – только в случаях, предусмотренных законом.

Каждый партнёр получает только тот объём данных, который необходим для его работы.

7. Сроки хранения

Мы храним данные столько, сколько это действительно нужно:

• данные аккаунта и профиля – пока вы пользуетесь Приложением;  
• технические логи – ограниченный срок (обычно 6–24 месяца);  
• данные для отчётности – в сроки, установленные законом.

Вы можете запросить удаление или обезличивание данных.

8. Ваши права

В пределах применимого законодательства вы можете:

• запрашивать информацию о своих данных;  
• исправлять неточные данные;  
• требовать удаления данных, если нет законных оснований хранить их дальше;  
• ограничивать или оспаривать определённые виды обработки;  
• получать копию данных в машиночитаемом виде, если это применимо.

По вопросам реализации прав напишите на info@eatsense.ch. Мы можем запросить подтверждение личности.

9. Безопасность

Мы используем технические и организационные меры защиты:

• шифрование соединения (HTTPS);  
• контроль доступа и логирование;  
• мониторинг подозрительной активности.

Однако ни один онлайн-сервис не может гарантировать абсолютную безопасность, поэтому рекомендуем также защищать доступ к вашему устройству и почте.

10. Дети

Приложение не предназначено для детей младше 13 лет (или иного возраста, установленного местным законом). Мы сознательно не собираем данные таких пользователей. Если вы считаете, что ребёнок предоставил нам свои данные без согласия родителей, сообщите нам – мы удалим эту информацию.

11. Изменения Политики

Мы можем периодически обновлять Политику конфиденциальности. Актуальная версия всегда доступна в Приложении. При существенных изменениях мы можем отобразить дополнительное уведомление или запросить повторное согласие, если это требуется законом.
`,

    kk: `
Құпиялылық саясаты – EatSense

Жаңартылған күні: 01.12.2025

Осы Құпиялылық саясаты EatSense мобильді қосымшасы («Қосымша», «біз») пайдаланушылардың дербес деректерін қалай жинайтынын, қолданатынын және қорғайтынын түсіндіреді. Қосымшаны орнатып, пайдалану арқылы сіз осы Саясатпен танысып, оның шарттарымен келісесіз.

1. Деректер үшін жауапты тұлға

Деректер операторы:  
TEMONAN Geneva Holdings Sàrl, Rue Vignier 8, 1205 Geneva  
Байланыс email: info@eatsense.ch

2. Қандай деректерді жинаймыз

Біз келесі санаттағы деректерді өңдеуіміз мүмкін:

• Аккаунт деректері  
  – электрондық пошта мекенжайы;  
  – аты және (қаласаңыз) тегі;  
  – интерфейс тілі.

• Профиль және денсаулыққа қатысты деректер (медициналық диагноз емес)  
  – жас, жыныс, бой, салмақ;  
  – мақсаттар (салмақ тастау, сақтау, салмақ қосу);  
  – диета түрі және тамақтану әдеттері (күніне қанша рет тамақтану, жеңіл тағамдар және т.б.);  
  – дене көрсеткіштері (мысалы, бел және жамбас көлемі, шамамен май пайызы);  
  – сіз көрсететін басты денсаулық бағыттары (қант, холестерин және т.б.).

• Тамақтану және қосымшаны пайдалану деректері  
  – тағам суреттері және мәтіндік сипаттамалары;  
  – AI-талдау нәтижелері (калория, БЖҚ, «пайдалылық» бағасы);  
  – сақталған жазбалар және соңғы тағамдар;  
  – күндік және айлық статистика.

• Зертханалық анализдер (егер осы функцияны қолдансаңыз)  
  – қан талдаулары мен басқа да анализдердің фотосуреттері немесе файлдары;  
  – анализ түрін таңдау немесе оның автоматты анықталуы;  
  – AI-ассистент жасаған түсініктемелер мен кеңестер.

• Техникалық деректер  
  – құрылғы моделі, ОЖ нұсқасы, Қосымша нұсқасы;  
  – IP-мекенжай, сұрау уақыты, ішкі идентификаторлар;  
  – push-хабарламалар үшін токендер;  
  – клиент пен сервер қателерінің логтары.

• Жазылым деректері  
  – жазылым мәртебесі (Free / Pro);  
  – App Store / Google Play арқылы сатып алу және жаңарту туралы ақпарат.  
Біз банк картасының толық деректерін сақтамаймыз – оларды төлем платформасы өңдейді.

3. Деректерді не үшін қолданамыз

Деректеріңіз келесі заңды мақсаттар үшін пайдаланылады:

• Қосымшаның негізгі жұмысын қамтамасыз ету  
  – аккаунтты тіркеу және жүйеге кіру;  
  – профиль мен тамақтану тарихын синхрондау;  
  – статистика мен ұсыныстарды көрсету.

• Тамақ және анализдерді AI-талдау  
  – фотосуреттерден тағамды анықтау;  
  – шамамен калория мен БЖҚ есептеу;  
  – тамақтану және өмір салты бойынша кеңестер;  
  – зертханалық анализдерге түсініктеме беру.

• Жеке бейімдеу және сервисті жақсарту  
  – сізге пайдалы мақалалар мен материалдарды таңдау;  
  – алгоритмдер мен AI-модельдерді жақсарту (анонимделген және агрегатталған деректер негізінде);  
  – қателерді табу және пайдалану статистикасы.

• Байланыс  
  – қызметтік хабарламалар (мысалы, кіру кодтары);  
  – push-хабарламалар мен еске салғыштар (егер қосулы болса);  
  – қолдау қызметінің жауаптары.

• Заң талаптары және қауіпсіздік  
  – заңды талаптарды орындау;  
  – алаяқтық пен шабуылдардан қорғау.

4. AI және үшінші тарап сервистері

Біз суреттерді, мәтіндерді және анализдер деректерін өңдеу үшін AI-провайдерлер мен бұлттық инфрақұрылымды қолдануымыз мүмкін.  
Деректер шифрланған арналар арқылы беріледі және тек Қосымша функцияларын орындау үшін қолданылады. Біз сіздің дербес деректеріңізді сатпаймыз.

5. Өңдеудің құқықтық негіздері

Еліңізге байланысты біз деректерді келесі негіздерде өңдейміз:

• сіздің келісіміңіз (мысалы, фотоларды, анализдерді жүктеу, хабарламалар алу);  
• сізбен жасалған келісімді орындау (Қосымша қызметтерін көрсету);  
• сервисті жақсарту және қауіпсіздік бойынша заңды мүдде (сіздің құқықтарыңызды ескере отырып).

Келісімді кез келген уақытта Қосымша баптауларында немесе қолдауға жаза отырып кері қайтарып аласыз.

6. Деректерді үшінші тұлғаларға беру

Деректер келесі тұлғаларға берілуі мүмкін:

• бұлттық және техникалық провайдерлерге (хостинг, сақтау, логтар, аналитика);  
• push-хабарлама және email жіберу сервистеріне;  
• төлем және платформа провайдерлеріне (App Store / Google Play);  
• мемлекеттік органдарға – заң талап еткен жағдайда ғана.

Әр серіктес өз міндетін орындау үшін қажетті деректер көлемін ғана алады.

7. Деректерді сақтау мерзімі

Біз деректерді тек қажетті мерзімге сақтаймыз:

• аккаунт және профиль деректері – Қосымшаны белсенді пайдаланған кезде;  
• техникалық логтар – шектеулі уақыт аралығында (әдетте 6–24 ай);  
• заң және есептілік үшін қажет деректер – заңда көрсетілген мерзімге.

Сіз деректерді жоюды немесе анонимдеуді сұрай аласыз.

8. Сіздің құқықтарыңыз

Қолданылатын заңнамаға сәйкес сізде келесі құқықтар болуы мүмкін:

• өз деректеріңізге қол жеткізу;  
• дұрыс емес ақпаратты түзету;  
• деректерді жоюды талап ету (егер олар қажет болмаса);  
• белгілі бір өңдеу түрлеріне шектеу қою немесе қарсы болу;  
• деректердің көшірмесін машиночитілетін форматта алу (техникалық мүмкін болса).

Құқықтарыңызды жүзеге асыру үшін info@eatsense.ch мекенжайына жазыңыз. Біз жеке басыңызды растауды сұрай алуымыз мүмкін.

9. Қауіпсіздік

Біз деректерді қорғау үшін техникалық және ұйымдастырушылық шаралар қолданамыз:

• HTTPS арқылы шифрланған байланыс;  
• қолжетімділікті бақылау және логтау;  
• күмәнді белсенділікті бақылау.

Интернет-қызметтердің ешқайсысы абсолютті қауіпсіздікке кепілдік бере алмайды, сондықтан құрылғыңыз бен поштаңызға кіруді де өзіңіз қорғауыңыз маңызды.

10. Балалар

Қосымша 13 жасқа дейінгі балаларға (немесе жергілікті заңнамадағы басқа жас шегіне) арналмаған. Біз мұндай қолданушылардың деректерін әдейі жинамаймыз. Егер бала бізге ата-анасының рұқсатынсыз деректер берді деп ойласаңыз, бізге хабарласыңыз – біз ол ақпаратты өшіреміз.

11. Осы саясаттағы өзгерістер

Біз Құпиялылық саясатын мезгіл-мезгіл жаңарта аламыз. Ең соңғы нұсқа әрдайым Қосымша ішінде қолжетімді. Маңызды өзгерістер енгізілген жағдайда қосымша хабарлама көрсетуіміз мүмкін.
`,

    fr: `
Politique de confidentialité – EatSense

Dernière mise à jour : 01 déc. 2025

La présente Politique de confidentialité explique comment l’application mobile EatSense (« l’App », « nous ») collecte, utilise et protège vos données personnelles. En installant et en utilisant l’App, vous acceptez les pratiques décrites ci-dessous.

1. Responsable du traitement

Le responsable du traitement est :
TEMONAN Geneva Holdings Sàrl, Rue Vignier 8, 1205 Genève
E-mail de contact : info@eatsense.ch

2. Données que nous collectons

Nous pouvons collecter et traiter les catégories de données suivantes :

• Données de compte
  – adresse e-mail ;
  – prénom et (facultativement) nom ;
  – langue de l’interface.

• Données de profil et liées à la santé (non médicales)
  – âge, sexe, taille, poids ;
  – objectifs (perte de poids, maintien, prise de masse) ;
  – type de régime et habitudes alimentaires (nombre de repas par jour, grignotage, etc.) ;
  – mesures corporelles (par ex. tour de taille et de hanches, pourcentage de graisse approximatif) ;
  – domaines de santé prioritaires tels que la glycémie, le cholestérol, si vous choisissez de les indiquer.

• Données de suivi alimentaire et d’utilisation
  – photos de repas et descriptions textuelles ;
  – résultats de l’analyse IA (calories, macros, score « santé ») ;
  – repas enregistrés et entrées récentes ;
  – statistiques nutritionnelles quotidiennes et mensuelles.

• Résultats de laboratoire (si vous utilisez cette fonction)
  – photos ou fichiers de prises de sang et autres analyses ;
  – type d’analyse sélectionné ou détecté automatiquement ;
  – commentaires et explications générés par l’IA à partir de vos résultats.

• Données techniques
  – modèle d’appareil, version de l’OS, version de l’App ;
  – adresse IP, heure des requêtes, identifiants internes ;
  – jetons de notification push ;
  – journaux d’erreurs client et serveur.

• Données d’abonnement
  – statut d’abonnement (Free / Pro) ;
  – informations sur les achats et renouvellements via App Store / Google Play (nous ne conservons pas votre numéro de carte ni vos coordonnées de paiement complètes).

Nous ne stockons pas de données identifiant directement votre carte bancaire. Les paiements sont traités par Apple, Google ou d’autres prestataires de paiement.

3. Pourquoi nous utilisons vos données

Nous utilisons vos données uniquement à des fins légitimes, notamment :

• Fournir les fonctionnalités essentielles de l’App
  – inscription et connexion au compte ;
  – synchronisation de votre profil et de votre historique de repas ;
  – affichage des statistiques, des entrées récentes et des recommandations.

• Analyse IA des repas et des résultats de laboratoire
  – reconnaissance des plats à partir de photos ;
  – calcul approximatif des calories et des macros ;
  – génération de suggestions nutritionnelles et de mode de vie ;
  – analyse des résultats de laboratoire et production de commentaires faciles à comprendre.

• Personnalisation et amélioration du produit
  – sélection de contenus éducatifs pertinents ;
  – amélioration de nos modèles d’IA et de recommandation (à partir de données anonymisées et agrégées) ;
  – analyses d’utilisation et débogage.

• Communication avec vous
  – e-mails de service et messages dans l’App (par ex. codes de connexion, mises à jour critiques) ;
  – notifications push et rappels, si activés ;
  – réponses à vos demandes d’assistance.

• Conformité légale et protection
  – réponse aux demandes légales des autorités ;
  – prévention de la fraude, des abus et des incidents de sécurité.

4. Fournisseurs d’IA et services tiers

Pour l’analyse des images, des textes et des résultats de laboratoire, nous pouvons recourir à des fournisseurs d’IA tiers et à une infrastructure cloud. Les données sont transmises via des canaux chiffrés et utilisées uniquement pour fournir les fonctionnalités de l’App. Nous ne vendons pas vos données personnelles.

5. Bases légales du traitement

Selon votre pays, nous traitons vos données sur la base de :

• votre consentement (par ex. pour le téléchargement de photos, de résultats de laboratoire, l’activation des notifications) ;
• la nécessité d’exécuter notre contrat avec vous (fourniture des services de l’App) ;
• nos intérêts légitimes à améliorer le service et à protéger les utilisateurs, dans le respect de vos droits.

Vous pouvez retirer votre consentement à tout moment dans les réglages de l’App ou en contactant l’assistance.

6. Partage de vos données

Nous pouvons partager des données avec :

• des fournisseurs cloud et d’infrastructure (hébergement, stockage, journaux, analyses) ;
• des services d’envoi de notifications push et d’e-mails ;
• des prestataires de paiement et de plateforme (App Store / Google Play) ;
• des autorités publiques, uniquement lorsque la loi l’exige.

Chaque partenaire ne reçoit que les données nécessaires à son rôle.

7. Conservation des données

Nous conservons vos données seulement le temps nécessaire :

• données de compte et de profil – tant que vous utilisez activement l’App ;
• journaux techniques – pour une durée limitée (par ex. 6–24 mois) ;
• registres légaux et comptables – pour la durée requise par la loi applicable.

Vous pouvez demander la suppression ou l’anonymisation de vos données (voir « Vos droits » ci-dessous).

8. Vos droits

Selon la loi applicable, vous pouvez avoir le droit de :

• accéder à vos données personnelles ;
• corriger des informations inexactes ;
• demander la suppression des données lorsqu’elles ne sont plus nécessaires ;
• limiter ou vous opposer à certains traitements ;
• recevoir une copie de vos données dans un format portable, lorsque cela est techniquement possible.

Pour exercer ces droits, contactez-nous à info@eatsense.ch. Nous pouvons vous demander de vérifier votre identité.

9. Sécurité

Nous prenons des mesures techniques et organisationnelles raisonnables pour protéger vos données, notamment :

• connexions chiffrées (HTTPS) ;
• contrôle d’accès et journalisation ;
• surveillance des activités inhabituelles.

Aucun service en ligne ne peut garantir une sécurité à 100 %, veillez donc aussi à protéger l’accès à votre appareil et à votre messagerie.

10. Enfants

L’App n’est pas destinée aux enfants de moins de 13 ans (ou un autre âge minimum défini par la loi locale). Nous ne collectons pas sciemment de données de ces utilisateurs. Si vous pensez qu’un enfant nous a fourni des données personnelles, contactez-nous afin que nous puissions les supprimer.

11. Modifications de cette Politique

Nous pouvons mettre à jour cette Politique de confidentialité de temps à autre. La dernière version sera toujours disponible dans l’App. En cas de changements importants, nous pouvons afficher un avis supplémentaire ou demander un nouveau consentement lorsque cela est requis.
`,

    de: `
Datenschutzerklärung – EatSense

Zuletzt aktualisiert: 01. Dez. 2025

Diese Datenschutzerklärung erläutert, wie die mobile App EatSense („App“, „wir“) Ihre personenbezogenen Daten erhebt, verwendet und schützt. Mit der Installation und Nutzung der App erklären Sie sich mit den hier beschriebenen Praktiken einverstanden.

1. Wer Ihre Daten verantwortet

Verantwortlicher ist:
TEMONAN Geneva Holdings Sàrl, Rue Vignier 8, 1205 Genf
Kontakt-E-Mail: info@eatsense.ch

2. Welche Daten wir erheben

Wir können folgende Datenkategorien erheben und verarbeiten:

• Kontodaten
  – E-Mail-Adresse;
  – Vorname und (optional) Nachname;
  – Sprache der Benutzeroberfläche.

• Profil- und gesundheitsbezogene Daten (nicht medizinisch)
  – Alter, Geschlecht, Größe, Gewicht;
  – Ziele (Gewichtsabnahme, Erhaltung, Muskelaufbau);
  – Ernährungsform und Essgewohnheiten (Mahlzeiten pro Tag, Snacking usw.);
  – Körpermaße (z. B. Taillen- und Hüftumfang, ungefährer Körperfettanteil);
  – Gesundheitsschwerpunkte wie Blutzucker, Cholesterin u. a., sofern Sie diese angeben.

• Daten zur Ernährungserfassung und Nutzung
  – Fotos von Mahlzeiten und Textbeschreibungen;
  – Ergebnisse der KI-Analyse (Kalorien, Makros, „Gesundheits“-Score);
  – gespeicherte Mahlzeiten und letzte Einträge;
  – tägliche und monatliche Ernährungsstatistiken.

• Laborergebnisse (wenn Sie diese Funktion nutzen)
  – hochgeladene Fotos oder Dateien von Bluttests und anderen Laborberichten;
  – ausgewählter oder automatisch erkannter Analysetyp;
  – KI-generierte Kommentare und Erläuterungen zu Ihren Ergebnissen.

• Technische Daten
  – Gerätemodell, Betriebssystemversion, App-Version;
  – IP-Adresse, Anfragezeit, interne Kennungen;
  – Push-Benachrichtigungs-Token;
  – Fehlerprotokolle von Client und Server.

• Abonnementdaten
  – Abonnementstatus (Free / Pro);
  – Informationen zu Käufen und Verlängerungen über App Store / Google Play (wir speichern keine Kartennummer oder vollständigen Zahlungsdaten).

Wir speichern keine Daten, die Ihre Bankkarte direkt identifizieren. Zahlungen werden von Apple, Google oder anderen Zahlungsanbietern abgewickelt.

3. Wofür wir Ihre Daten verwenden

Wir verwenden Ihre Daten nur zu legitimen Zwecken, darunter:

• Bereitstellung der Kernfunktionen der App
  – Kontoregistrierung und Anmeldung;
  – Synchronisierung Ihres Profils und Ihrer Mahlzeitenhistorie;
  – Anzeige von Statistiken, letzten Einträgen und Empfehlungen.

• KI-Analyse von Mahlzeiten und Laborergebnissen
  – Erkennung von Gerichten aus Fotos;
  – Berechnung ungefährer Kalorien und Makros;
  – Erstellung von Ernährungs- und Lebensstil-Vorschlägen;
  – Auswertung hochgeladener Laborergebnisse und verständliche Kommentare.

• Personalisierung und Produktverbesserung
  – Auswahl relevanter Lerninhalte;
  – Verbesserung unserer KI- und Empfehlungsmodelle (mit anonymisierten und aggregierten Daten);
  – Nutzungsanalyse und Fehlerbehebung.

• Kommunikation mit Ihnen
  – Service-E-Mails und In-App-Nachrichten (z. B. Anmeldecodes, kritische Updates);
  – Push-Benachrichtigungen und Erinnerungen, sofern aktiviert;
  – Antworten auf Ihre Support-Anfragen.

• Einhaltung gesetzlicher Vorgaben und Schutz
  – Beantwortung rechtmäßiger Anfragen von Behörden;
  – Verhinderung von Betrug, Missbrauch und Sicherheitsvorfällen.

4. KI-Anbieter und Drittdienste

Für die Analyse von Bildern, Texten und Laborergebnissen können wir KI-Anbieter von Drittanbietern und Cloud-Infrastruktur einsetzen. Daten werden über verschlüsselte Kanäle übertragen und nur zur Bereitstellung der App-Funktionen verwendet. Wir verkaufen Ihre personenbezogenen Daten nicht.

5. Rechtsgrundlagen der Verarbeitung

Je nach Land verarbeiten wir Ihre Daten auf Grundlage von:

• Ihrer Einwilligung (z. B. zum Hochladen von Fotos, Laborergebnissen, zur Aktivierung von Benachrichtigungen);
• der Erforderlichkeit zur Erfüllung unseres Vertrags mit Ihnen (Bereitstellung der App-Dienste);
• unseren berechtigten Interessen an der Verbesserung des Dienstes und am Schutz der Nutzer, unter Wahrung Ihrer Rechte.

Sie können Ihre Einwilligung jederzeit in den App-Einstellungen oder durch Kontaktaufnahme mit dem Support widerrufen.

6. Weitergabe Ihrer Daten

Wir können Daten weitergeben an:

• Cloud- und Infrastrukturanbieter (Hosting, Speicherung, Protokolle, Analysen);
• Dienste für Push-Benachrichtigungen und E-Mail-Versand;
• Zahlungs- und Plattformanbieter (App Store / Google Play);
• Behörden, nur soweit gesetzlich vorgeschrieben.

Jeder Partner erhält nur die für seine Rolle erforderlichen Daten.

7. Speicherdauer

Wir speichern Ihre Daten nur so lange wie nötig:

• Konto- und Profildaten – solange Sie die App aktiv nutzen;
• technische Protokolle – für einen begrenzten Zeitraum (z. B. 6–24 Monate);
• rechtliche und buchhalterische Unterlagen – für den gesetzlich vorgeschriebenen Zeitraum.

Sie können die Löschung oder Anonymisierung Ihrer Daten verlangen (siehe „Ihre Rechte“ unten).

8. Ihre Rechte

Je nach geltendem Recht haben Sie möglicherweise das Recht:

• auf Ihre personenbezogenen Daten zuzugreifen;
• unrichtige Informationen zu berichtigen;
• die Löschung von Daten zu verlangen, wenn sie nicht mehr benötigt werden;
• bestimmte Verarbeitungen einzuschränken oder ihnen zu widersprechen;
• eine Kopie Ihrer Daten in einem übertragbaren Format zu erhalten, soweit technisch möglich.

Zur Ausübung dieser Rechte kontaktieren Sie uns unter info@eatsense.ch. Wir können Sie bitten, Ihre Identität zu bestätigen.

9. Sicherheit

Wir treffen angemessene technische und organisatorische Maßnahmen zum Schutz Ihrer Daten, darunter:

• verschlüsselte Verbindungen (HTTPS);
• Zugriffskontrolle und Protokollierung;
• Überwachung auf ungewöhnliche Aktivitäten.

Kein Online-Dienst kann 100 % Sicherheit garantieren; schützen Sie daher auch den Zugang zu Ihrem Gerät und Ihrer E-Mail.

10. Kinder

Die App ist nicht für Kinder unter 13 Jahren (oder ein anderes nach lokalem Recht festgelegtes Mindestalter) bestimmt. Wir erheben wissentlich keine Daten solcher Nutzer. Wenn Sie glauben, dass ein Kind uns personenbezogene Daten übermittelt hat, kontaktieren Sie uns, damit wir diese löschen können.

11. Änderungen dieser Erklärung

Wir können diese Datenschutzerklärung von Zeit zu Zeit aktualisieren. Die neueste Version ist stets in der App verfügbar. Bei wesentlichen Änderungen können wir einen zusätzlichen Hinweis anzeigen oder, sofern erforderlich, eine erneute Einwilligung einholen.
`,

    es: `
Política de Privacidad – EatSense

Última actualización: 01 dic. 2025

Esta Política de Privacidad explica cómo la aplicación móvil EatSense («la App», «nosotros») recopila, utiliza y protege sus datos personales. Al instalar y usar la App, usted acepta las prácticas aquí descritas.

1. Quién controla sus datos

El responsable del tratamiento es:
TEMONAN Geneva Holdings Sàrl, Rue Vignier 8, 1205 Ginebra
Correo de contacto: info@eatsense.ch

2. Qué datos recopilamos

Podemos recopilar y tratar las siguientes categorías de datos:

• Datos de la cuenta
  – dirección de correo electrónico;
  – nombre y (opcionalmente) apellido;
  – idioma de la interfaz.

• Datos de perfil y relacionados con la salud (no médicos)
  – edad, sexo, altura, peso;
  – objetivos (pérdida de peso, mantenimiento, aumento de masa);
  – tipo de dieta y hábitos alimentarios (comidas por día, picoteo, etc.);
  – medidas corporales (por ejemplo, cintura y cadera, porcentaje de grasa aproximado);
  – áreas de salud prioritarias como azúcar en sangre, colesterol y otras, si decide indicarlas.

• Datos de seguimiento de comidas y uso
  – fotos de comidas y descripciones de texto;
  – resultados del análisis de IA (calorías, macros, puntuación de «salud»);
  – comidas guardadas y entradas recientes;
  – estadísticas nutricionales diarias y mensuales.

• Resultados de laboratorio (si usa esta función)
  – fotos o archivos de análisis de sangre y otros informes de laboratorio;
  – tipo de análisis seleccionado o detectado automáticamente;
  – comentarios y explicaciones generados por IA a partir de sus resultados.

• Datos técnicos
  – modelo del dispositivo, versión del sistema operativo, versión de la App;
  – dirección IP, hora de las solicitudes, identificadores internos;
  – tokens de notificaciones push;
  – registros de errores del cliente y del servidor.

• Datos de suscripción
  – estado de la suscripción (Free / Pro);
  – información sobre compras y renovaciones a través de App Store / Google Play (no almacenamos el número de su tarjeta ni los datos completos de pago).

No almacenamos datos que identifiquen directamente su tarjeta bancaria. Los pagos los procesan Apple, Google u otros proveedores de pago.

3. Por qué usamos sus datos

Usamos sus datos únicamente con fines legítimos, entre ellos:

• Proporcionar la funcionalidad básica de la App
  – registro e inicio de sesión en la cuenta;
  – sincronización de su perfil e historial de comidas;
  – mostrar estadísticas, entradas recientes y recomendaciones.

• Análisis de IA de comidas y resultados de laboratorio
  – reconocimiento de platos a partir de fotos;
  – cálculo aproximado de calorías y macros;
  – generación de sugerencias de nutrición y estilo de vida;
  – análisis de resultados de laboratorio y comentarios fáciles de leer.

• Personalización y mejora del producto
  – selección de contenido educativo relevante;
  – mejora de nuestros modelos de IA y recomendación (usando datos anonimizados y agregados);
  – analítica de uso y depuración.

• Comunicación con usted
  – correos de servicio y mensajes en la App (por ejemplo, códigos de acceso, actualizaciones críticas);
  – notificaciones push y recordatorios, si están activados;
  – respuestas a sus solicitudes de soporte.

• Cumplimiento legal y protección
  – respuesta a solicitudes legales de las autoridades;
  – prevención de fraude, abuso e incidentes de seguridad.

4. Proveedores de IA y servicios de terceros

Para el análisis de imágenes, textos y resultados de laboratorio podemos usar proveedores de IA de terceros e infraestructura en la nube. Los datos se transmiten por canales cifrados y se usan solo para ofrecer las funciones de la App. No vendemos sus datos personales.

5. Bases legales del tratamiento

Según su país, tratamos sus datos sobre la base de:

• su consentimiento (por ejemplo, para subir fotos, resultados de laboratorio, activar notificaciones);
• la necesidad de ejecutar nuestro acuerdo con usted (prestación de los servicios de la App);
• nuestros intereses legítimos en mejorar el servicio y proteger a los usuarios, respetando sus derechos.

Puede retirar su consentimiento en cualquier momento en los ajustes de la App o contactando con soporte.

6. Compartir sus datos

Podemos compartir datos con:

• proveedores de nube e infraestructura (hosting, almacenamiento, registros, analítica);
• servicios de notificaciones push y envío de correos;
• proveedores de pago y de plataforma (App Store / Google Play);
• autoridades públicas, solo cuando lo exija la ley.

Cada socio recibe únicamente los datos necesarios para su función.

7. Conservación de los datos

Conservamos sus datos solo el tiempo necesario:

• datos de cuenta y perfil – mientras use activamente la App;
• registros técnicos – durante un período limitado (por ejemplo, 6–24 meses);
• registros legales y contables – durante el período exigido por la ley aplicable.

Puede solicitar la eliminación o anonimización de sus datos (véase «Sus derechos» más abajo).

8. Sus derechos

Según la ley aplicable, puede tener derecho a:

• acceder a sus datos personales;
• corregir información inexacta;
• solicitar la eliminación de datos cuando ya no sean necesarios;
• restringir u oponerse a ciertos tipos de tratamiento;
• recibir una copia de sus datos en un formato portátil, cuando sea técnicamente posible.

Para ejercer estos derechos, contáctenos en info@eatsense.ch. Podemos pedirle que verifique su identidad.

9. Seguridad

Adoptamos medidas técnicas y organizativas razonables para proteger sus datos, entre ellas:

• conexiones cifradas (HTTPS);
• control de acceso y registro;
• supervisión de actividad inusual.

Ningún servicio en línea puede garantizar una seguridad del 100 %, así que proteja también el acceso a su dispositivo y a su correo.

10. Menores

La App no está dirigida a menores de 13 años (u otra edad mínima definida por la ley local). No recopilamos a sabiendas datos de tales usuarios. Si cree que un menor nos ha facilitado datos personales, contáctenos para que podamos eliminarlos.

11. Cambios en esta Política

Podemos actualizar esta Política de Privacidad de vez en cuando. La última versión estará siempre disponible en la App. Cuando hagamos cambios importantes, podremos mostrar un aviso adicional o solicitar un nuevo consentimiento cuando sea necesario.
`,
  },

  terms: {
    en: `
Terms of Use – EatSense

Last updated: 01 Dec 2025

These Terms of Use (“Terms”) govern your use of the EatSense mobile application (“App”, “we”, “us”). By installing or using the App, you agree to these Terms.

1. Purpose of the App and medical disclaimer

EatSense helps you track nutrition, analyse meals and understand your habits.  
The App may also help you store and interpret some laboratory results.

The App is not a medical device and does not replace professional medical advice.

• Information and recommendations are for educational and informational purposes only.  
• The App does not provide diagnoses or treatment.  
• Always consult your doctor or another qualified professional before making decisions about diet, medication or lifestyle.

You are responsible for your own health decisions.

2. Account and access

Some features require creating an account (usually by email login code).

You agree to:

• provide accurate information;  
• keep access to your email and device secure;  
• not share your account with others without our permission.

We may suspend or terminate access if you:

• seriously violate these Terms;  
• attempt to hack, overload or otherwise interfere with the App;  
• use the App for spam, fraud or illegal activities.

3. Subscriptions and payments

The App may offer both free and paid plans (for example, EatSense Pro).

• Payments and renewals are processed by App Store / Google Play or other platform providers.  
• Price, duration and auto-renewal conditions are shown on the purchase screen.  
• You can cancel auto-renewal in your store account settings, usually at least 24 hours before the current period ends.

We do not manage your card details directly and do not store full payment information.

4. Acceptable use

You agree not to use the App to:

• upload illegal, offensive or infringing content;  
• send spam, advertisements or malicious links;  
• try to access data of other users without permission;  
• reverse-engineer, decompile or attempt to bypass technical protections, except where allowed by law.

We may block or remove content, or restrict access, if these rules are violated.

5. User content

You keep ownership of the content you create and upload (photos, notes, lab results, etc.).

By uploading content, you:

• confirm that you have the right to use and share it;  
• grant us a limited, non-exclusive licence to store, process and display this content inside the App, and to use anonymised versions for analytics and product improvement.

We may anonymise and aggregate data so that it cannot reasonably be linked back to you.

6. Limitation of liability

The App is provided “as is”.

• We do our best to keep it stable and accurate, but we do not guarantee that it will always be error-free or available.  
• We are not responsible for decisions you make based on the App’s data and recommendations.  
• To the maximum extent permitted by law, our total liability is limited to the amount you actually paid for paid features during the last 12 months, or zero if you only used the free version.

Nothing in these Terms limits our liability where it cannot be limited by law.

7. Deletion of account and data

You may stop using the App at any time. Where available, you can delete your account in the profile settings or by contacting us at info@eatsense.ch.

After account deletion:

• we may keep some information in anonymised form for analytics and legal records;  
• personal data is deleted or anonymised within a reasonable time, unless we are legally required to keep it longer.

8. Intellectual property

All rights to the App (design, texts, logos, code, databases and other elements), except user content, belong to TEMONAN Geneva Holdings Sàrl, Rue Vignier 8, 1205 Geneva and/or its partners.

You receive a limited licence to use the App under these Terms. You do not receive ownership of the App or its components.

9. Changes to the App and Terms

We may update the App, add or remove features, and update these Terms. The current version of the Terms is always available in the App.

If we make significant changes, we may show an in-app notice or ask you to accept the new version.  
By continuing to use the App after changes, you agree to the updated Terms.

10. Contact

If you have questions about the App, your data or these Terms, please contact us at:  
info@eatsense.ch
`,

    ru: `
Условия использования – EatSense

Дата обновления: 01.12.2025

Настоящие Условия использования (далее – «Условия») регулируют использование мобильного приложения EatSense (далее – «Приложение», «мы»). Устанавливая или используя Приложение, вы соглашаетесь с этими Условиями.

1. Назначение Приложения и отказ от медицинской ответственности

EatSense помогает отслеживать питание, анализировать блюда и лучше понимать свои привычки.  
Приложение также может помочь хранить и интерпретировать некоторые лабораторные показатели.

Приложение не является медицинским изделием и не заменяет консультацию врача.

• Вся информация и рекомендации носят справочный и образовательный характер;  
• Приложение не ставит диагноз и не назначает лечение;  
• Перед изменением рациона, приёма лекарств или образа жизни обязательно консультируйтесь с врачом.

Ответственность за решения, связанные с вашим здоровьем, несёте вы сами.

2. Аккаунт и доступ

Для части функций требуется создать аккаунт (обычно по коду, высылаемому на email).

Вы обязуетесь:

• указывать достоверные данные;  
• обеспечивать конфиденциальность доступа к своей почте и устройству;  
• не передавать аккаунт третьим лицам без нашего разрешения.

Мы можем временно ограничить или заблокировать доступ, если вы:

• грубо нарушаете эти Условия;  
• пытаетесь взломать сервис, вмешаться в работу серверов;  
• используете Приложение для спама, мошенничества или другой незаконной активности.

3. Подписки и оплата

В Приложении доступны бесплатный и платные тарифы (например, EatSense Pro).

• Оплата и автопродление обрабатываются через App Store / Google Play или другие платформы;  
• Стоимость, длительность и условия автопродления указаны на экране покупки;  
• Отменить автопродление можно в настройках аккаунта магазина, обычно не позднее чем за 24 часа до окончания текущего периода.

Мы не храним данные банковских карт и не управляем списаниями напрямую.

4. Допустимое использование

Запрещено использовать Приложение для:

• размещения незаконного, оскорбительного контента или материалов, нарушающих чьи-либо права;  
• рассылки спама, рекламы, вредоносных ссылок;  
• попыток получить несанкционированный доступ к данным других пользователей;  
• обратной разработки, декомпиляции и обхода технических ограничений, кроме случаев, прямо разрешённых законом.

При нарушении этих правил мы вправе ограничить доступ, удалить контент или аккаунт.

5. Пользовательский контент

Права на контент, который вы создаёте и загружаете (фото, заметки, анализы и т.д.), остаются за вами.

Загружая контент, вы:

• подтверждаете, что имеете право им распоряжаться;  
• предоставляете нам ограниченную неисключительную лицензию на хранение, обработку и отображение этого контента в Приложении, а также на использование его обезличенных версий для аналитики и улучшения сервиса.

Мы можем агрегировать и анонимизировать данные так, чтобы они не позволяли идентифицировать конкретного пользователя.

6. Ограничение ответственности

Приложение предоставляется по принципу «как есть».

• Мы стремимся поддерживать его стабильную работу, но не гарантируем отсутствие ошибок и стопроцентную доступность;  
• Мы не отвечаем за решения, которые вы принимаете на основе данных и рекомендаций Приложения;  
• В максимально допустимых законом пределах наша суммарная ответственность ограничивается суммой, фактически уплаченной вами за платный функционал за последние 12 месяцев, либо равна нулю, если вы пользовались только бесплатной версией.

Ничто в этих Условиях не ограничивает нашу ответственность в случаях, когда по закону такое ограничение недопустимо.

7. Удаление аккаунта и данных

Вы можете в любой момент прекратить использование Приложения. При наличии соответствующей функции вы можете удалить аккаунт в настройках профиля или запросить удаление по email info@eatsense.ch.

После удаления аккаунта:

• часть данных может быть сохранена в обезличенной форме для аналитики и отчётности;  
• персональные данные удаляются или анонимизируются в разумный срок, если только закон не требует хранить их дольше.

8. Интеллектуальная собственность

Все права на Приложение (дизайн, логотипы, тексты, программный код, базы данных и др.), за исключением пользовательского контента, принадлежат TEMONAN Geneva Holdings Sàrl, Rue Vignier 8, 1205 Geneva и/или нашим партнёрам.

Вы получаете ограниченную лицензию на использование Приложения в рамках этих Условий. Права собственности на Приложение к вам не переходят.

9. Изменения Приложения и Условий

Мы можем обновлять Приложение, изменять или добавлять функциональность, а также пересматривать эти Условия. Актуальная версия всегда доступна в Приложении.

При существенных изменениях мы можем отобразить дополнительное уведомление и/или запросить согласие с новой редакцией. Продолжая пользоваться Приложением, вы принимаете обновлённые Условия.

10. Контакты

По вопросам работы Приложения, ваших данных или этих Условий вы можете обратиться по адресу:  
info@eatsense.ch
`,

    kk: `
Қолдану шарттары – EatSense

Жаңартылған күні: 01.12.2025

Осы Қолдану шарттары («Шарттар») EatSense мобильді қосымшасын («Қосымша», «біз») пайдалану тәртібін реттейді. Қосымшаны орнатып немесе пайдалана отырып, сіз осы Шарттармен келісесіз.

1. Қосымшаның мақсаты және медициналық жауапкершіліктен бас тарту

EatSense – тамақтануды бақылауға, тағамдарды талдауға және әдеттеріңізді жақсырақ түсінуге көмектесетін құрал.  
Қосымша сонымен қатар кейбір зертханалық анализ нәтижелерін сақтауға және түсіндіруге мүмкіндік береді.

Қосымша медициналық құрылғы болып табылмайды және дәрігер кеңесін алмастырмайды.

• Барлық ақпарат пен ұсыныстар тек ақпараттық және білім беру мақсатында беріледі;  
• Қосымша диагноз қоймайды және ем тағайындамайды;  
• Диетаңызды, дәрі-дәрмек қабылдауды немесе өмір салтыңызды өзгертпес бұрын міндетті түрде дәрігермен кеңесіңіз.

Өз денсаулығыңыз бойынша шешімдер үшін жауапкершілік өзіңізде.

2. Аккаунт және қолжетімділік

Кейбір функцияларды пайдалану үшін аккаунт құру қажет (әдетте email-код арқылы кіру).

Сіз:

• дұрыс және өзекті деректер көрсетуге;  
• поштаңызға және құрылғыңызға қолжетімділікті қорғауға;  
• аккаунтты үшінші тұлғаларға бермеуге келісесіз.

Біз келесі жағдайларда қолжетімділікті уақытша тоқтата немесе бұғаулай аламыз:

• осы Шарттарды өрескел бұзсаңыз;  
• сервисті бұзу, серверлерге шабуыл жасау әрекеттерін жасасаңыз;  
• Қосымшаны спам, алаяқтық немесе заңсыз әрекеттер үшін қолдансаңыз.

3. Жазылымдар және төлемдер

Қосымшада тегін және ақылы тарифтер (мысалы, EatSense Pro) болуы мүмкін.

• Төлемдер мен автожаңарту App Store / Google Play немесе басқа платформалар арқылы өңделеді;  
• Баға, мерзім және автожаңарту шарттары сатып алу экранында көрсетіледі;  
• Автожаңартуды дүкен аккаунты баптауларында, әдетте ағымдағы кезең аяқталғанға дейін кемінде 24 сағат бұрын өшіруге болады.

Біз банк картасы деректерін тікелей өңдемейміз және толық төлем ақпаратын сақтамаймыз.

4. Қолданудың рұқсат етілген ережелері

Сіз Қосымшаны мына мақсатта пайдаланбауға келісесіз:

• заңға қайшы, қорлайтын немесе біреудің құқығын бұзатын контент жүктеу;  
• спам, жарнама, зиянды сілтемелер тарату;  
• басқа пайдаланушылардың деректеріне рұқсатсыз қол жеткізуге тырысу;  
• кері инжиниринг, декомпиляция немесе техникалық шектеулерді айналып өту (заң тікелей рұқсат еткен жағдайларды қоспағанда).

Бұл ережелер бұзылған жағдайда біз контентті жоюға немесе қолжетімділікті шектеуге құқылымыз.

5. Пайдаланушы контенті

Сіз жасаған және жүктеген контентке (фото, жазбалар, анализдер және т.б.) құқық өзіңізде қалады.

Контент жүктей отырып, сіз:

• оны пайдалануға және бөлісуге құқығыңыз бар екенін растайсыз;  
• бізге осы контентті Қосымша ішінде сақтау, өңдеу және көрсетуге, сондай-ақ оның анонимделген нұсқаларын аналитика және сервисті жақсарту үшін қолдануға шектеулі, айрықша емес лицензия бересіз.

Біз деректерді анонимдеу және агрегаттау арқылы оларды жеке тұлғамен байланыстыру мүмкіндігін барынша азайтамыз.

6. Жауапкершілікті шектеу

Қосымша «қалай бар, солай» («as is») принципі бойынша ұсынылады.

• Біз тұрақты және дұрыс жұмыс істеуіне ұмтыламыз, бірақ қателер мүлде болмайды немесе сервистің әрдайым қолжетімді болатынына кепілдік бере алмаймыз;  
• Қосымшадағы деректер мен ұсыныстарға сүйене отырып қабылдаған шешімдер үшін біз жауап бермейміз;  
• Қолданыстағы заңнама рұқсат еткен шекте, біздің жиынтық жауапкершілігіміз соңғы 12 ай ішінде ақылы функциялар үшін сіз төлеген сомамен шектеледі, немесе тек тегін нұсқаны қолдансаңыз – нөлге тең.

Заң бойынша жауапкершілікті шектеуге жол берілмейтін жағдайларда бұл тармақ қолданылмайды.

7. Аккаунт пен деректерді жою

Сіз Қосымшаны кез келген уақытта пайдалануды тоқтата аласыз. Мүмкін болған жағдайда аккаунтты профиль баптауларында өшіруге немесе info@eatsense.ch мекенжайына жаза отырып жоюды сұрауға болады.

Аккаунт жойылғаннан кейін:

• кейбір деректер аналитика және есептілік үшін анонимді түрде сақталуы мүмкін;  
• жеке деректер заң талаптарын ескере отырып, ақылға қонымды мерзімде жойылады немесе анонимделеді.

8. Зияткерлік меншік

Пайдаланушы контентінен басқа, Қосымшаға (дизайн, логотиптер, мәтіндер, код, дерекқорлар және т.б.) барлық құқықтар TEMONAN Geneva Holdings Sàrl, Rue Vignier 8, 1205 Geneva және/немесе біздің серіктестерімізге тиесілі.

Сізге осы Шарттарға сәйкес Қосымшаны пайдалануға шектеулі лицензия беріледі. Қосымшаның немесе оның элементтерінің меншік құқығы сізге өтпейді.

9. Қосымшаны және Шарттарды өзгерту

Біз Қосымшаны жаңарта аламыз, функциялар қосу немесе алып тастауымыз мүмкін, сондай-ақ осы Шарттарды өзгерте аламыз. Ең соңғы нұсқасы әрдайым Қосымша ішінде қолжетімді.

Маңызды өзгерістер енгізілген жағдайда қосымшада хабарлама көрсетуіміз немесе сізден жаңартылған Шарттармен келісуді сұрауымыз мүмкін. Қосымшаны әрі қарай пайдалану – жаңа нұсқамен келісім білдіруді білдіреді.

10. Байланыс

Қосымша, деректеріңіз немесе осы Шарттар туралы сұрақтарыңыз болса, бізге мына мекенжайға жазыңыз:
info@eatsense.ch
`,

    fr: `
Conditions d’utilisation – EatSense

Dernière mise à jour : 01 déc. 2025

Les présentes Conditions d’utilisation (« Conditions ») régissent votre utilisation de l’application mobile EatSense (« l’App », « nous »). En installant ou en utilisant l’App, vous acceptez ces Conditions.

1. Objet de l’App et avertissement médical

EatSense vous aide à suivre votre alimentation, analyser vos repas et comprendre vos habitudes. L’App peut aussi vous aider à stocker et interpréter certains résultats de laboratoire.

L’App n’est pas un dispositif médical et ne remplace pas un avis médical professionnel.

• Les informations et recommandations sont fournies à des fins éducatives et informatives uniquement.
• L’App ne fournit pas de diagnostic ni de traitement.
• Consultez toujours votre médecin ou un autre professionnel qualifié avant de prendre des décisions concernant votre alimentation, vos médicaments ou votre mode de vie.

Vous êtes responsable de vos propres décisions de santé.

2. Compte et accès

Certaines fonctions nécessitent la création d’un compte (généralement par code de connexion envoyé par e-mail).

Vous vous engagez à :

• fournir des informations exactes ;
• protéger l’accès à votre messagerie et à votre appareil ;
• ne pas partager votre compte sans notre autorisation.

Nous pouvons suspendre ou résilier l’accès si vous :

• enfreignez gravement ces Conditions ;
• tentez de pirater, surcharger ou perturber l’App ;
• utilisez l’App à des fins de spam, fraude ou activités illégales.

3. Abonnements et paiements

L’App peut proposer des formules gratuites et payantes (par ex. EatSense Pro).

• Les paiements et renouvellements sont traités par App Store / Google Play ou d’autres plateformes.
• Le prix, la durée et les conditions de renouvellement automatique sont indiqués sur l’écran d’achat.
• Vous pouvez annuler le renouvellement automatique dans les réglages de votre compte de boutique, généralement au moins 24 heures avant la fin de la période en cours.

Nous ne gérons pas directement vos coordonnées bancaires et ne stockons pas vos informations de paiement complètes.

4. Utilisation acceptable

Vous vous engagez à ne pas utiliser l’App pour :

• téléverser du contenu illégal, offensant ou portant atteinte aux droits d’autrui ;
• envoyer du spam, des publicités ou des liens malveillants ;
• tenter d’accéder aux données d’autres utilisateurs sans autorisation ;
• faire de l’ingénierie inverse, décompiler ou contourner les protections techniques, sauf si la loi l’autorise.

Nous pouvons bloquer ou supprimer du contenu, ou restreindre l’accès, en cas de violation de ces règles.

5. Contenu de l’utilisateur

Vous conservez la propriété du contenu que vous créez et téléversez (photos, notes, résultats de laboratoire, etc.).

En téléversant du contenu, vous :

• confirmez avoir le droit de l’utiliser et de le partager ;
• nous accordez une licence limitée et non exclusive pour stocker, traiter et afficher ce contenu dans l’App, ainsi que pour utiliser des versions anonymisées à des fins d’analyse et d’amélioration du produit.

Nous pouvons anonymiser et agréger les données afin qu’elles ne puissent raisonnablement pas vous être rattachées.

6. Limitation de responsabilité

L’App est fournie « telle quelle ».

• Nous faisons de notre mieux pour la maintenir stable et exacte, mais ne garantissons pas qu’elle sera toujours exempte d’erreurs ou disponible.
• Nous ne sommes pas responsables des décisions que vous prenez sur la base des données et recommandations de l’App.
• Dans la mesure maximale permise par la loi, notre responsabilité totale est limitée au montant que vous avez effectivement payé pour les fonctions payantes au cours des 12 derniers mois, ou à zéro si vous n’avez utilisé que la version gratuite.

Rien dans ces Conditions ne limite notre responsabilité lorsque la loi l’interdit.

7. Suppression du compte et des données

Vous pouvez cesser d’utiliser l’App à tout moment. Lorsque cela est possible, vous pouvez supprimer votre compte dans les réglages du profil ou en nous contactant à info@eatsense.ch.

Après la suppression du compte :

• nous pouvons conserver certaines informations sous forme anonymisée à des fins d’analyse et de conformité légale ;
• les données personnelles sont supprimées ou anonymisées dans un délai raisonnable, sauf obligation légale de les conserver plus longtemps.

8. Propriété intellectuelle

Tous les droits sur l’App (design, textes, logos, code, bases de données et autres éléments), à l’exception du contenu de l’utilisateur, appartiennent à TEMONAN Geneva Holdings Sàrl, Rue Vignier 8, 1205 Genève et/ou à ses partenaires.

Vous recevez une licence limitée d’utilisation de l’App selon ces Conditions. Vous n’acquérez pas la propriété de l’App ni de ses composants.

9. Modifications de l’App et des Conditions

Nous pouvons mettre à jour l’App, ajouter ou supprimer des fonctions et modifier ces Conditions. La version actuelle des Conditions est toujours disponible dans l’App.

En cas de changements importants, nous pouvons afficher un avis dans l’App ou vous demander d’accepter la nouvelle version. En continuant à utiliser l’App après les modifications, vous acceptez les Conditions mises à jour.

10. Contact

Pour toute question sur l’App, vos données ou ces Conditions, contactez-nous à :
info@eatsense.ch
`,

    de: `
Nutzungsbedingungen – EatSense

Zuletzt aktualisiert: 01. Dez. 2025

Diese Nutzungsbedingungen („Bedingungen“) regeln Ihre Nutzung der mobilen App EatSense („App“, „wir“). Mit der Installation oder Nutzung der App stimmen Sie diesen Bedingungen zu.

1. Zweck der App und medizinischer Hinweis

EatSense hilft Ihnen, Ihre Ernährung zu erfassen, Mahlzeiten zu analysieren und Ihre Gewohnheiten zu verstehen. Die App kann Ihnen auch helfen, bestimmte Laborergebnisse zu speichern und zu interpretieren.

Die App ist kein Medizinprodukt und ersetzt keine professionelle medizinische Beratung.

• Informationen und Empfehlungen dienen ausschließlich Bildungs- und Informationszwecken.
• Die App stellt keine Diagnosen und keine Behandlungen bereit.
• Konsultieren Sie immer Ihren Arzt oder eine andere qualifizierte Fachperson, bevor Sie Entscheidungen zu Ernährung, Medikamenten oder Lebensstil treffen.

Sie sind für Ihre eigenen Gesundheitsentscheidungen verantwortlich.

2. Konto und Zugang

Einige Funktionen erfordern ein Konto (in der Regel per E-Mail-Anmeldecode).

Sie verpflichten sich:

• korrekte Angaben zu machen;
• den Zugang zu Ihrer E-Mail und Ihrem Gerät zu schützen;
• Ihr Konto nicht ohne unsere Erlaubnis weiterzugeben.

Wir können den Zugang sperren oder beenden, wenn Sie:

• diese Bedingungen schwerwiegend verletzen;
• versuchen, die App zu hacken, zu überlasten oder anderweitig zu stören;
• die App für Spam, Betrug oder illegale Aktivitäten nutzen.

3. Abonnements und Zahlungen

Die App kann kostenlose und kostenpflichtige Pläne anbieten (z. B. EatSense Pro).

• Zahlungen und Verlängerungen werden über App Store / Google Play oder andere Plattformanbieter abgewickelt.
• Preis, Laufzeit und Bedingungen der automatischen Verlängerung werden auf dem Kaufbildschirm angezeigt.
• Sie können die automatische Verlängerung in den Kontoeinstellungen des Stores kündigen, in der Regel mindestens 24 Stunden vor Ende des laufenden Zeitraums.

Wir verwalten Ihre Kartendaten nicht direkt und speichern keine vollständigen Zahlungsinformationen.

4. Zulässige Nutzung

Sie verpflichten sich, die App nicht zu nutzen, um:

• illegale, beleidigende oder rechtsverletzende Inhalte hochzuladen;
• Spam, Werbung oder schädliche Links zu versenden;
• ohne Erlaubnis auf Daten anderer Nutzer zuzugreifen;
• Reverse Engineering, Dekompilierung oder Umgehung technischer Schutzmaßnahmen vorzunehmen, außer soweit gesetzlich erlaubt.

Bei Verstößen gegen diese Regeln können wir Inhalte sperren oder entfernen oder den Zugang einschränken.

5. Nutzerinhalte

Sie behalten das Eigentum an den Inhalten, die Sie erstellen und hochladen (Fotos, Notizen, Laborergebnisse usw.).

Mit dem Hochladen von Inhalten:

• bestätigen Sie, dass Sie das Recht haben, diese zu nutzen und zu teilen;
• gewähren Sie uns eine begrenzte, nicht ausschließliche Lizenz, diese Inhalte in der App zu speichern, zu verarbeiten und anzuzeigen sowie anonymisierte Versionen für Analysen und Produktverbesserung zu nutzen.

Wir können Daten anonymisieren und aggregieren, sodass sie nicht mehr vernünftigerweise auf Sie zurückgeführt werden können.

6. Haftungsbeschränkung

Die App wird „wie besehen“ bereitgestellt.

• Wir bemühen uns um Stabilität und Genauigkeit, garantieren jedoch nicht, dass die App stets fehlerfrei oder verfügbar ist.
• Wir sind nicht verantwortlich für Entscheidungen, die Sie auf Grundlage der Daten und Empfehlungen der App treffen.
• Im gesetzlich zulässigen Höchstmaß ist unsere Gesamthaftung auf den Betrag begrenzt, den Sie in den letzten 12 Monaten tatsächlich für kostenpflichtige Funktionen gezahlt haben, oder null, wenn Sie nur die kostenlose Version genutzt haben.

Nichts in diesen Bedingungen beschränkt unsere Haftung, soweit dies gesetzlich nicht zulässig ist.

7. Löschung von Konto und Daten

Sie können die Nutzung der App jederzeit beenden. Sofern verfügbar, können Sie Ihr Konto in den Profileinstellungen löschen oder uns unter info@eatsense.ch kontaktieren.

Nach der Kontolöschung:

• können wir bestimmte Informationen in anonymisierter Form für Analysen und gesetzliche Aufzeichnungen aufbewahren;
• werden personenbezogene Daten innerhalb angemessener Zeit gelöscht oder anonymisiert, sofern wir nicht gesetzlich zur längeren Aufbewahrung verpflichtet sind.

8. Geistiges Eigentum

Alle Rechte an der App (Design, Texte, Logos, Code, Datenbanken und andere Elemente), mit Ausnahme der Nutzerinhalte, gehören TEMONAN Geneva Holdings Sàrl, Rue Vignier 8, 1205 Genf und/oder ihren Partnern.

Sie erhalten eine begrenzte Lizenz zur Nutzung der App gemäß diesen Bedingungen. Sie erwerben kein Eigentum an der App oder ihren Komponenten.

9. Änderungen der App und der Bedingungen

Wir können die App aktualisieren, Funktionen hinzufügen oder entfernen und diese Bedingungen aktualisieren. Die aktuelle Fassung der Bedingungen ist stets in der App verfügbar.

Bei wesentlichen Änderungen können wir einen Hinweis in der App anzeigen oder Sie bitten, die neue Version zu akzeptieren. Durch die weitere Nutzung der App nach Änderungen stimmen Sie den aktualisierten Bedingungen zu.

10. Kontakt

Bei Fragen zur App, zu Ihren Daten oder zu diesen Bedingungen kontaktieren Sie uns bitte unter:
info@eatsense.ch
`,

    es: `
Términos de Uso – EatSense

Última actualización: 01 dic. 2025

Estos Términos de Uso («Términos») regulan el uso de la aplicación móvil EatSense («la App», «nosotros»). Al instalar o usar la App, usted acepta estos Términos.

1. Finalidad de la App y aviso médico

EatSense le ayuda a registrar su alimentación, analizar sus comidas y entender sus hábitos. La App también puede ayudarle a guardar e interpretar algunos resultados de laboratorio.

La App no es un dispositivo médico y no sustituye el consejo médico profesional.

• La información y las recomendaciones tienen únicamente fines educativos e informativos.
• La App no proporciona diagnósticos ni tratamientos.
• Consulte siempre a su médico u otro profesional cualificado antes de tomar decisiones sobre dieta, medicación o estilo de vida.

Usted es responsable de sus propias decisiones de salud.

2. Cuenta y acceso

Algunas funciones requieren crear una cuenta (normalmente mediante un código de acceso enviado por correo).

Usted se compromete a:

• proporcionar información veraz;
• mantener seguro el acceso a su correo y dispositivo;
• no compartir su cuenta sin nuestro permiso.

Podemos suspender o cancelar el acceso si usted:

• infringe gravemente estos Términos;
• intenta piratear, sobrecargar o interferir de otro modo con la App;
• usa la App para spam, fraude o actividades ilegales.

3. Suscripciones y pagos

La App puede ofrecer planes gratuitos y de pago (por ejemplo, EatSense Pro).

• Los pagos y renovaciones los procesan App Store / Google Play u otros proveedores de plataforma.
• El precio, la duración y las condiciones de renovación automática se muestran en la pantalla de compra.
• Puede cancelar la renovación automática en los ajustes de su cuenta de la tienda, normalmente al menos 24 horas antes de que finalice el período actual.

No gestionamos directamente los datos de su tarjeta ni almacenamos información de pago completa.

4. Uso aceptable

Usted se compromete a no usar la App para:

• subir contenido ilegal, ofensivo o que infrinja derechos;
• enviar spam, anuncios o enlaces maliciosos;
• intentar acceder a datos de otros usuarios sin permiso;
• aplicar ingeniería inversa, descompilar o eludir protecciones técnicas, salvo cuando la ley lo permita.

Podemos bloquear o eliminar contenido, o restringir el acceso, si se incumplen estas reglas.

5. Contenido del usuario

Usted conserva la propiedad del contenido que crea y sube (fotos, notas, resultados de laboratorio, etc.).

Al subir contenido, usted:

• confirma que tiene derecho a usarlo y compartirlo;
• nos concede una licencia limitada y no exclusiva para almacenar, procesar y mostrar este contenido dentro de la App, y para usar versiones anonimizadas con fines de analítica y mejora del producto.

Podemos anonimizar y agregar los datos de modo que no puedan vincularse razonablemente con usted.

6. Limitación de responsabilidad

La App se proporciona «tal cual».

• Hacemos lo posible por mantenerla estable y precisa, pero no garantizamos que esté siempre libre de errores o disponible.
• No somos responsables de las decisiones que tome basándose en los datos y recomendaciones de la App.
• En la máxima medida permitida por la ley, nuestra responsabilidad total se limita al importe que efectivamente pagó por funciones de pago durante los últimos 12 meses, o cero si solo usó la versión gratuita.

Nada en estos Términos limita nuestra responsabilidad cuando la ley no lo permite.

7. Eliminación de cuenta y datos

Puede dejar de usar la App en cualquier momento. Cuando esté disponible, puede eliminar su cuenta en los ajustes del perfil o contactándonos en info@eatsense.ch.

Tras la eliminación de la cuenta:

• podemos conservar cierta información de forma anonimizada con fines de analítica y registros legales;
• los datos personales se eliminan o anonimizan en un plazo razonable, salvo que la ley nos obligue a conservarlos más tiempo.

8. Propiedad intelectual

Todos los derechos sobre la App (diseño, textos, logotipos, código, bases de datos y otros elementos), excepto el contenido del usuario, pertenecen a TEMONAN Geneva Holdings Sàrl, Rue Vignier 8, 1205 Ginebra y/o sus socios.

Usted recibe una licencia limitada para usar la App conforme a estos Términos. No adquiere la propiedad de la App ni de sus componentes.

9. Cambios en la App y en los Términos

Podemos actualizar la App, añadir o eliminar funciones y actualizar estos Términos. La versión actual de los Términos está siempre disponible en la App.

Si realizamos cambios importantes, podemos mostrar un aviso en la App o pedirle que acepte la nueva versión. Al seguir usando la App tras los cambios, acepta los Términos actualizados.

10. Contacto

Si tiene preguntas sobre la App, sus datos o estos Términos, contáctenos en:
info@eatsense.ch
`,
  },
};



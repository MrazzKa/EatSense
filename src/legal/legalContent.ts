// src/legal/legalContent.ts
// Centralized legal texts for Privacy Policy and Terms of Use in EN / RU / KK.

export type LegalDocumentType = 'privacy' | 'terms';

type LangCode = 'en' | 'ru' | 'kk';

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
  },
};



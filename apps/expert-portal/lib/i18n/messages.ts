export const LOCALES = ['en', 'ru', 'kk', 'de', 'fr', 'es'] as const;
export type Locale = typeof LOCALES[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  ru: 'Русский',
  kk: 'Қазақша',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
};

export const DEFAULT_LOCALE: Locale = 'en';

export const OFFER_LOCALES: Locale[] = ['en', 'ru', 'kk', 'de', 'fr', 'es'];

export const SPECIALIZATION_KEYS = [
  'weightManagement', 'sportsNutrition', 'clinicalNutrition', 'pediatricNutrition',
  'eatingDisorders', 'diabetesManagement', 'foodAllergies', 'vegetarianVegan',
  'pregnancyNutrition', 'geriatricNutrition', 'gutHealth', 'mentalHealthNutrition',
] as const;
export type SpecializationKey = typeof SPECIALIZATION_KEYS[number];

type MessagesShape = {
  nav: {
    dashboard: string;
    chats: string;
    offers: string;
    reviews: string;
    profile: string;
    signOut: string;
  };
  common: {
    save: string;
    saving: string;
    saved: string;
    cancel: string;
    delete: string;
    deleting: string;
    edit: string;
    create: string;
    creating: string;
    loading: string;
    upload: string;
    uploading: string;
    view: string;
    back: string;
    close: string;
    yes: string;
    no: string;
    confirm: string;
    error: string;
    retry: string;
    pending: string;
    approved: string;
    rejected: string;
    hidden: string;
    visible: string;
    published: string;
    draft: string;
    optional: string;
    language: string;
    saveFailed: string;
    deleteFailed: string;
    uploadFailed: string;
    confirmDelete: string;
  };
  login: {
    title: string;
    subtitle: string;
    emailPlaceholder: string;
    send: string;
    sending: string;
    checkEmail: string;
    sentTo: string;
    useDifferent: string;
    notExpert: string;
    notExpertBody: string;
  };
  auth: {
    signingIn: string;
    signInFailed: string;
    tryAgain: string;
    noToken: string;
    linkExpired: string;
    authFailed: string;
    somethingWrong: string;
  };
  dashboard: {
    title: string;
    activeChats: string;
    totalClients: string;
    newMessages: string;
    avgRating: string;
    statusPublished: string;
    statusRejected: string;
    statusPending: string;
    yourProfile: string;
    rejectedTitle: string;
    rejectedBody: string;
    underReviewTitle: string;
    underReviewBody: string;
    quickActions: string;
    viewChats: string;
    editProfile: string;
  };
  chats: {
    title: string;
    empty: string;
    noMessages: string;
    photo: string;
    sharedMeals: string;
    sharedReport: string;
    yesterday: string;
    typeMessage: string;
    send: string;
    markComplete: string;
    reopen: string;
    complete: string;
    cancelled: string;
    confirmComplete: string;
    completeBtn: string;
    viewData: string;
    requestData: string;
    grantedDataAccess: string;
    revokedDataAccess: string;
    dataAccessRequest: string;
    dataAccessGranted: string;
    startConversation: string;
    completedBanner: string;
    confirmRequestData: string;
    requestDataMessage: string;
    clientFallback: string;
    reportRequest: string;
    reportGrant: string;
    reportRevoke: string;
    templates: string;
    templateGreeting: string;
    templateGoals: string;
    templateAllergies: string;
    templateTypicalDay: string;
    templateNextSteps: string;
    templateFollowUp: string;
    templateGreetingLabel: string;
    templateGoalsLabel: string;
    templateAllergiesLabel: string;
    templateTypicalDayLabel: string;
    templateNextStepsLabel: string;
    templateFollowUpLabel: string;
  };
  clients: {
    title: string;
    backToChat: string;
    noAccess: string;
    meals: string;
    labs: string;
    health: string;
    noMeals: string;
    noLabs: string;
    noHealth: string;
    metric: string;
    value: string;
    reference: string;
    mealLabel: string;
    name: string;
    age: string;
    height: string;
    weight: string;
    gender: string;
    goal: string;
    dailyCalories: string;
    preferences: string;
    loadFailed: string;
  };
  offers: {
    title: string;
    newOffer: string;
    edit: string;
    create: string;
    empty: string;
    emptyHint: string;
    name: string;
    nameFor: string;
    description: string;
    descriptionFor: string;
    nameRequired: string;
    format: string;
    duration: string;
    durationHint: string;
    free: string;
    confirmDelete: string;
    togglePublishFailed: string;
  };
  reviews: {
    title: string;
    empty: string;
    emptyHint: string;
    total: string;
    visible: string;
    avgRating: string;
    noComment: string;
    clientFallback: string;
  };
  profile: {
    title: string;
    displayName: string;
    type: string;
    nutritionist: string;
    dietitian: string;
    bio: string;
    bioPlaceholder: string;
    education: string;
    educationPlaceholder: string;
    experienceYears: string;
    specializations: string;
    languages: string;
    credentials: string;
    credentialsHint: string;
    credentialName: string;
    credentialNamePlaceholder: string;
    characters: string;
    confirmDeleteCredential: string;
    uploadOnlyImageOrPdf: string;
    uploadMaxSize: string;
    credentialNameRequired: string;
  };
  specializations: Record<SpecializationKey, string>;
  languageNames: Record<Locale, string>;
  formats: {
    CHAT_CONSULTATION: string;
    MEAL_PLAN: string;
    REPORT_REVIEW: string;
    MONTHLY_SUPPORT: string;
    CUSTOM: string;
  };
};

const en: MessagesShape = {
  nav: { dashboard: 'Dashboard', chats: 'Chats', offers: 'Offers', reviews: 'Reviews', profile: 'My Profile', signOut: 'Sign out' },
  common: {
    save: 'Save changes', saving: 'Saving...', saved: 'Saved!', cancel: 'Cancel', delete: 'Delete', deleting: 'Deleting...',
    edit: 'Edit', create: 'Create', creating: 'Creating...', loading: 'Loading...', upload: 'Upload', uploading: 'Uploading...',
    view: 'View', back: 'Back', close: 'Close', yes: 'Yes', no: 'No', confirm: 'Confirm', error: 'Error', retry: 'Retry',
    pending: 'Pending', approved: 'Approved', rejected: 'Rejected', hidden: 'Hidden', visible: 'Visible',
    published: 'Published', draft: 'Draft', optional: 'optional', language: 'Language',
    saveFailed: 'Failed to save. Please try again.',
    deleteFailed: 'Failed to delete. Please try again.',
    uploadFailed: 'Failed to upload. Please try again.',
    confirmDelete: 'Delete this item?',
  },
  login: {
    title: 'EatSense Expert Portal', subtitle: 'Sign in to manage your expert profile',
    emailPlaceholder: 'your@email.com', send: 'Send Magic Link', sending: 'Sending...',
    checkEmail: 'Check your email', sentTo: 'We sent a magic link to',
    useDifferent: 'Use a different email',
    notExpert: 'Not an expert', notExpertBody: 'This portal is for registered experts only. Register as an expert in the EatSense app first.',
  },
  auth: {
    signingIn: 'Signing you in...',
    signInFailed: 'Sign-in failed',
    tryAgain: 'Try again',
    noToken: 'No token provided',
    linkExpired: 'Invalid or expired link',
    authFailed: 'Authentication failed',
    somethingWrong: 'Something went wrong',
  },
  dashboard: {
    title: 'Dashboard', activeChats: 'Active chats', totalClients: 'Total clients', newMessages: 'New messages', avgRating: 'Avg rating',
    statusPublished: 'Published & Verified', statusRejected: 'Rejected', statusPending: 'Pending Review',
    yourProfile: 'Your Profile',
    rejectedTitle: 'Profile rejected.',
    rejectedBody: 'Please update your profile in the EatSense app and resubmit for review.',
    underReviewTitle: 'Under review.',
    underReviewBody: 'Your profile is being reviewed by our team. You will receive a notification once it is approved.',
    quickActions: 'Quick Actions', viewChats: 'View Chats', editProfile: 'Edit Profile',
  },
  chats: {
    title: 'Chats', empty: 'No conversations yet', noMessages: 'No messages yet',
    photo: 'Photo', sharedMeals: 'Shared meals', sharedReport: 'Shared report', yesterday: 'Yesterday',
    typeMessage: 'Type a message...', send: 'Send', markComplete: 'Mark complete', reopen: 'Reopen',
    complete: 'Completed', cancelled: 'Cancelled', confirmComplete: 'Mark this consultation as complete?',
    completeBtn: 'Complete', viewData: 'View Data', requestData: 'Request Data',
    grantedDataAccess: 'Client granted data access', revokedDataAccess: 'Client revoked data access',
    dataAccessRequest: 'Data access request',
    dataAccessGranted: 'Data access granted',
    startConversation: 'No messages yet. Start the conversation!',
    completedBanner: 'This consultation has been completed.',
    confirmRequestData: 'Request access to client nutrition and health data?',
    requestDataMessage: 'I would like to access your nutrition data and health reports to better assist you. Please grant access if you agree.',
    clientFallback: 'Client',
    reportRequest: 'Requested data access',
    reportGrant: 'Granted data access',
    reportRevoke: 'Revoked data access',
    templates: 'Templates',
    templateGreeting: 'Hi! Thanks for reaching out. Let me know when you\'d like to start.',
    templateGoals: 'What are your main nutrition and health goals?',
    templateAllergies: 'Do you have any allergies or food restrictions I should be aware of?',
    templateTypicalDay: 'Could you describe a typical day of eating — breakfast, lunch, dinner, and snacks?',
    templateNextSteps: 'Great progress! Let\'s discuss the next steps for your plan.',
    templateFollowUp: 'How have you been feeling since our last conversation?',
    templateGreetingLabel: 'Greeting', templateGoalsLabel: 'Goals', templateAllergiesLabel: 'Allergies',
    templateTypicalDayLabel: 'Typical day', templateNextStepsLabel: 'Next steps', templateFollowUpLabel: 'Follow-up',
  },
  clients: {
    title: 'Client Data', backToChat: 'Back to chat',
    noAccess: 'The client may not have granted data access yet.',
    meals: 'Meals', labs: 'Lab Results', health: 'Health Profile',
    noMeals: 'No meal data available.', noLabs: 'No lab results available.', noHealth: 'No health profile data available.',
    metric: 'Metric', value: 'Value', reference: 'Reference', mealLabel: 'Meal',
    name: 'Name', age: 'Age', height: 'Height', weight: 'Weight', gender: 'Gender', goal: 'Goal',
    dailyCalories: 'Daily Calories Target', preferences: 'Preferences',
    loadFailed: 'Failed to load client data',
  },
  offers: {
    title: 'Offers', newOffer: 'New offer', edit: 'Edit offer', create: 'New offer',
    empty: 'No offers yet', emptyHint: 'Create one so clients can start a consultation with you.',
    name: 'Name', nameFor: 'Name ({lang})',
    description: 'Description', descriptionFor: 'Description ({lang})',
    nameRequired: 'Please provide a name in at least one language.',
    format: 'Format', duration: 'Duration (days, optional)', durationHint: '',
    free: 'Free', confirmDelete: 'Delete this offer? Existing conversations will keep working but new clients will no longer see it.',
    togglePublishFailed: 'Failed to update visibility.',
  },
  reviews: {
    title: 'Reviews', empty: 'No reviews yet', emptyHint: 'Completed consultations can leave you a rating.',
    total: 'Total', visible: 'Visible', avgRating: 'Average rating', noComment: 'No comment',
    clientFallback: 'Client',
  },
  profile: {
    title: 'My Profile', displayName: 'Display Name', type: 'Type',
    nutritionist: 'Nutritionist', dietitian: 'Dietitian', bio: 'Bio',
    bioPlaceholder: 'Tell clients about your expertise and approach...',
    education: 'Education', educationPlaceholder: 'e.g. MSc in Nutrition Science, ETH Zurich',
    experienceYears: 'Years of Experience', specializations: 'Specializations', languages: 'Languages',
    credentials: 'Credentials',
    credentialsHint: 'Upload a diploma, certification, or license. Images are compressed; PDFs stored as-is. Max 15MB. Credentials stay pending until approved by the EatSense team.',
    credentialName: 'Credential name',
    credentialNamePlaceholder: 'Credential name (e.g. MSc Nutrition, ETH)',
    characters: 'characters',
    confirmDeleteCredential: 'Delete this credential?',
    uploadOnlyImageOrPdf: 'Only images and PDFs are supported.',
    uploadMaxSize: 'File must be smaller than 15MB.',
    credentialNameRequired: 'Please enter a credential name first.',
  },
  specializations: {
    weightManagement: 'Weight Management',
    sportsNutrition: 'Sports Nutrition',
    clinicalNutrition: 'Clinical Nutrition',
    pediatricNutrition: 'Pediatric Nutrition',
    eatingDisorders: 'Eating Disorders',
    diabetesManagement: 'Diabetes Management',
    foodAllergies: 'Food Allergies',
    vegetarianVegan: 'Vegetarian & Vegan',
    pregnancyNutrition: 'Pregnancy Nutrition',
    geriatricNutrition: 'Geriatric Nutrition',
    gutHealth: 'Gut Health',
    mentalHealthNutrition: 'Mental Health & Nutrition',
  },
  languageNames: {
    en: 'English', ru: 'Russian', kk: 'Kazakh', de: 'German', fr: 'French', es: 'Spanish',
  },
  formats: {
    CHAT_CONSULTATION: 'Chat consultation', MEAL_PLAN: 'Meal plan', REPORT_REVIEW: 'Report review',
    MONTHLY_SUPPORT: 'Monthly support', CUSTOM: 'Custom',
  },
};

const ru: MessagesShape = {
  nav: { dashboard: 'Обзор', chats: 'Чаты', offers: 'Услуги', reviews: 'Отзывы', profile: 'Мой профиль', signOut: 'Выйти' },
  common: {
    save: 'Сохранить', saving: 'Сохранение...', saved: 'Сохранено!', cancel: 'Отмена', delete: 'Удалить', deleting: 'Удаление...',
    edit: 'Изменить', create: 'Создать', creating: 'Создание...', loading: 'Загрузка...', upload: 'Загрузить', uploading: 'Загрузка...',
    view: 'Посмотреть', back: 'Назад', close: 'Закрыть', yes: 'Да', no: 'Нет', confirm: 'Подтвердить', error: 'Ошибка', retry: 'Повторить',
    pending: 'На проверке', approved: 'Одобрено', rejected: 'Отклонено', hidden: 'Скрыт', visible: 'Виден',
    published: 'Опубликовано', draft: 'Черновик', optional: 'необязательно', language: 'Язык',
    saveFailed: 'Не удалось сохранить. Попробуйте ещё раз.',
    deleteFailed: 'Не удалось удалить. Попробуйте ещё раз.',
    uploadFailed: 'Не удалось загрузить. Попробуйте ещё раз.',
    confirmDelete: 'Удалить элемент?',
  },
  login: {
    title: 'Портал экспертов EatSense', subtitle: 'Войдите, чтобы управлять профилем эксперта',
    emailPlaceholder: 'ваш@email.com', send: 'Отправить magic link', sending: 'Отправка...',
    checkEmail: 'Проверьте почту', sentTo: 'Мы отправили magic link на',
    useDifferent: 'Использовать другой email',
    notExpert: 'Не эксперт', notExpertBody: 'Этот портал только для зарегистрированных экспертов. Сначала зарегистрируйтесь как эксперт в приложении EatSense.',
  },
  auth: {
    signingIn: 'Выполняется вход...',
    signInFailed: 'Вход не выполнен',
    tryAgain: 'Попробовать ещё раз',
    noToken: 'Токен не передан',
    linkExpired: 'Ссылка недействительна или истекла',
    authFailed: 'Ошибка аутентификации',
    somethingWrong: 'Что-то пошло не так',
  },
  dashboard: {
    title: 'Обзор', activeChats: 'Активные чаты', totalClients: 'Всего клиентов', newMessages: 'Новые сообщения', avgRating: 'Средний рейтинг',
    statusPublished: 'Опубликован и верифицирован', statusRejected: 'Отклонён', statusPending: 'На проверке',
    yourProfile: 'Ваш профиль',
    rejectedTitle: 'Профиль отклонён.',
    rejectedBody: 'Пожалуйста, обновите профиль в приложении EatSense и отправьте на повторную проверку.',
    underReviewTitle: 'На проверке.',
    underReviewBody: 'Ваш профиль проверяется нашей командой. Вы получите уведомление, как только он будет одобрен.',
    quickActions: 'Быстрые действия', viewChats: 'Перейти к чатам', editProfile: 'Изменить профиль',
  },
  chats: {
    title: 'Чаты', empty: 'Пока нет консультаций', noMessages: 'Пока нет сообщений',
    photo: 'Фото', sharedMeals: 'Поделились приёмами пищи', sharedReport: 'Поделились отчётом', yesterday: 'Вчера',
    typeMessage: 'Введите сообщение...', send: 'Отправить', markComplete: 'Завершить', reopen: 'Возобновить',
    complete: 'Завершена', cancelled: 'Отменена', confirmComplete: 'Отметить консультацию как завершённую?',
    completeBtn: 'Завершить', viewData: 'Посмотреть данные', requestData: 'Запросить доступ',
    grantedDataAccess: 'Клиент предоставил доступ к данным', revokedDataAccess: 'Клиент отозвал доступ к данным',
    dataAccessRequest: 'Запрос доступа к данным',
    dataAccessGranted: 'Доступ к данным предоставлен',
    startConversation: 'Пока нет сообщений. Начните разговор!',
    completedBanner: 'Эта консультация завершена.',
    confirmRequestData: 'Запросить доступ к данным о питании и здоровье клиента?',
    requestDataMessage: 'Я хотел бы получить доступ к вашим данным о питании и отчётам о здоровье, чтобы лучше помогать вам. Пожалуйста, предоставьте доступ, если согласны.',
    clientFallback: 'Клиент',
    reportRequest: 'Запросил доступ',
    reportGrant: 'Предоставил доступ',
    reportRevoke: 'Отозвал доступ',
    templates: 'Шаблоны',
    templateGreeting: 'Здравствуйте! Спасибо, что обратились. Сообщите, когда будете готовы начать.',
    templateGoals: 'Какие у вас главные цели по питанию и здоровью?',
    templateAllergies: 'Есть ли у вас аллергии или пищевые ограничения, о которых мне нужно знать?',
    templateTypicalDay: 'Опишите, пожалуйста, типичный день питания — завтрак, обед, ужин и перекусы.',
    templateNextSteps: 'Отличный прогресс! Давайте обсудим следующие шаги вашего плана.',
    templateFollowUp: 'Как вы себя чувствуете со времени нашего последнего разговора?',
    templateGreetingLabel: 'Приветствие', templateGoalsLabel: 'Цели', templateAllergiesLabel: 'Аллергии',
    templateTypicalDayLabel: 'Типичный день', templateNextStepsLabel: 'След. шаги', templateFollowUpLabel: 'Follow-up',
  },
  clients: {
    title: 'Данные клиента', backToChat: 'Вернуться к чату',
    noAccess: 'Клиент ещё не предоставил доступ к данным.',
    meals: 'Приёмы пищи', labs: 'Результаты анализов', health: 'Профиль здоровья',
    noMeals: 'Нет данных о приёмах пищи.', noLabs: 'Нет результатов анализов.', noHealth: 'Нет данных профиля здоровья.',
    metric: 'Показатель', value: 'Значение', reference: 'Норма', mealLabel: 'Приём пищи',
    name: 'Имя', age: 'Возраст', height: 'Рост', weight: 'Вес', gender: 'Пол', goal: 'Цель',
    dailyCalories: 'Целевая норма калорий', preferences: 'Предпочтения',
    loadFailed: 'Не удалось загрузить данные клиента',
  },
  offers: {
    title: 'Услуги', newOffer: 'Новая услуга', edit: 'Редактировать услугу', create: 'Новая услуга',
    empty: 'Пока нет услуг', emptyHint: 'Создайте услугу, чтобы клиенты могли начать с вами консультацию.',
    name: 'Название', nameFor: 'Название ({lang})',
    description: 'Описание', descriptionFor: 'Описание ({lang})',
    nameRequired: 'Пожалуйста, укажите название хотя бы на одном языке.',
    format: 'Формат', duration: 'Длительность (дни, опционально)', durationHint: '',
    free: 'Бесплатно', confirmDelete: 'Удалить услугу? Существующие консультации продолжат работу, но новые клиенты её больше не увидят.',
    togglePublishFailed: 'Не удалось изменить видимость.',
  },
  reviews: {
    title: 'Отзывы', empty: 'Пока нет отзывов', emptyHint: 'Завершённые консультации могут оставить вам оценку.',
    total: 'Всего', visible: 'Видимых', avgRating: 'Средний рейтинг', noComment: 'Без комментария',
    clientFallback: 'Клиент',
  },
  profile: {
    title: 'Мой профиль', displayName: 'Отображаемое имя', type: 'Тип',
    nutritionist: 'Нутрициолог', dietitian: 'Диетолог', bio: 'О себе',
    bioPlaceholder: 'Расскажите клиентам о своём опыте и подходе...',
    education: 'Образование', educationPlaceholder: 'например, MSc в нутрициологии, ETH Zurich',
    experienceYears: 'Лет опыта', specializations: 'Специализации', languages: 'Языки',
    credentials: 'Документы',
    credentialsHint: 'Загрузите диплом, сертификат или лицензию. Изображения сжимаются, PDF сохраняются как есть. Максимум 15 МБ. Документы остаются на проверке до одобрения командой EatSense.',
    credentialName: 'Название документа',
    credentialNamePlaceholder: 'Название документа (например, MSc Нутрициология, ETH)',
    characters: 'символов',
    confirmDeleteCredential: 'Удалить этот документ?',
    uploadOnlyImageOrPdf: 'Поддерживаются только изображения и PDF.',
    uploadMaxSize: 'Файл должен быть меньше 15 МБ.',
    credentialNameRequired: 'Сначала укажите название документа.',
  },
  specializations: {
    weightManagement: 'Управление весом',
    sportsNutrition: 'Спортивное питание',
    clinicalNutrition: 'Клиническая нутрициология',
    pediatricNutrition: 'Детское питание',
    eatingDisorders: 'Расстройства пищевого поведения',
    diabetesManagement: 'Управление диабетом',
    foodAllergies: 'Пищевые аллергии',
    vegetarianVegan: 'Вегетарианство и веганство',
    pregnancyNutrition: 'Питание при беременности',
    geriatricNutrition: 'Питание пожилых',
    gutHealth: 'Здоровье ЖКТ',
    mentalHealthNutrition: 'Ментальное здоровье и питание',
  },
  languageNames: {
    en: 'Английский', ru: 'Русский', kk: 'Казахский', de: 'Немецкий', fr: 'Французский', es: 'Испанский',
  },
  formats: {
    CHAT_CONSULTATION: 'Консультация в чате', MEAL_PLAN: 'План питания', REPORT_REVIEW: 'Разбор отчёта',
    MONTHLY_SUPPORT: 'Месячное сопровождение', CUSTOM: 'Индивидуальный',
  },
};

const kk: MessagesShape = {
  nav: { dashboard: 'Шолу', chats: 'Чаттар', offers: 'Қызметтер', reviews: 'Пікірлер', profile: 'Менің профилім', signOut: 'Шығу' },
  common: {
    save: 'Сақтау', saving: 'Сақталуда...', saved: 'Сақталды!', cancel: 'Бас тарту', delete: 'Жою', deleting: 'Жойылуда...',
    edit: 'Өзгерту', create: 'Жасау', creating: 'Жасалуда...', loading: 'Жүктелуде...', upload: 'Жүктеу', uploading: 'Жүктелуде...',
    view: 'Қарау', back: 'Артқа', close: 'Жабу', yes: 'Иә', no: 'Жоқ', confirm: 'Растау', error: 'Қате', retry: 'Қайталау',
    pending: 'Тексеруде', approved: 'Мақұлданды', rejected: 'Қабылданбады', hidden: 'Жасырулы', visible: 'Көрінеді',
    published: 'Жарияланды', draft: 'Жоба', optional: 'міндетті емес', language: 'Тіл',
    saveFailed: 'Сақтау мүмкін болмады. Қайта көріңіз.',
    deleteFailed: 'Жою мүмкін болмады. Қайта көріңіз.',
    uploadFailed: 'Жүктеу мүмкін болмады. Қайта көріңіз.',
    confirmDelete: 'Осы элементті жою керек пе?',
  },
  login: {
    title: 'EatSense Сарапшы порталы', subtitle: 'Сарапшы профиліңізді басқару үшін кіріңіз',
    emailPlaceholder: 'сіздің@email.com', send: 'Magic сілтеме жіберу', sending: 'Жіберілуде...',
    checkEmail: 'Поштаңызды тексеріңіз', sentTo: 'Біз magic сілтемені келесі мекенжайға жібердік',
    useDifferent: 'Басқа email пайдалану',
    notExpert: 'Сарапшы емес', notExpertBody: 'Бұл портал тек тіркелген сарапшыларға арналған. Алдымен EatSense қолданбасында сарапшы ретінде тіркеліңіз.',
  },
  auth: {
    signingIn: 'Кіру жүргізілуде...',
    signInFailed: 'Кіру сәтсіз',
    tryAgain: 'Қайта көру',
    noToken: 'Токен берілмеді',
    linkExpired: 'Сілтеме жарамсыз немесе мерзімі өтіп кеткен',
    authFailed: 'Аутентификация қатесі',
    somethingWrong: 'Бірдеңе дұрыс болмады',
  },
  dashboard: {
    title: 'Шолу', activeChats: 'Белсенді чаттар', totalClients: 'Клиенттер саны', newMessages: 'Жаңа хабарламалар', avgRating: 'Орташа рейтинг',
    statusPublished: 'Жарияланды және расталды', statusRejected: 'Қабылданбады', statusPending: 'Тексеруде',
    yourProfile: 'Сіздің профиліңіз',
    rejectedTitle: 'Профиль қабылданбады.',
    rejectedBody: 'EatSense қолданбасында профиліңізді жаңартып, қайта тексеруге жіберіңіз.',
    underReviewTitle: 'Тексеруде.',
    underReviewBody: 'Профиліңіз біздің командамен тексерілуде. Мақұлданған кезде хабарлама аласыз.',
    quickActions: 'Жылдам әрекеттер', viewChats: 'Чаттарға өту', editProfile: 'Профильді өзгерту',
  },
  chats: {
    title: 'Чаттар', empty: 'Әзірге сұхбаттар жоқ', noMessages: 'Әзірге хабарламалар жоқ',
    photo: 'Фото', sharedMeals: 'Тамақтармен бөлісті', sharedReport: 'Есеппен бөлісті', yesterday: 'Кеше',
    typeMessage: 'Хабарлама жазыңыз...', send: 'Жіберу', markComplete: 'Аяқталды деп белгілеу', reopen: 'Қайта ашу',
    complete: 'Аяқталды', cancelled: 'Бас тартылды', confirmComplete: 'Осы кеңесті аяқталды деп белгілеу керек пе?',
    completeBtn: 'Аяқтау', viewData: 'Деректерді көру', requestData: 'Рұқсат сұрау',
    grantedDataAccess: 'Клиент деректерге рұқсат берді', revokedDataAccess: 'Клиент деректерге рұқсатты кері алды',
    dataAccessRequest: 'Деректерге рұқсат сұрауы',
    dataAccessGranted: 'Деректерге рұқсат берілді',
    startConversation: 'Әзірге хабарламалар жоқ. Әңгімені бастаңыз!',
    completedBanner: 'Бұл кеңес аяқталды.',
    confirmRequestData: 'Клиенттің тамақтану және денсаулық деректеріне рұқсат сұрау керек пе?',
    requestDataMessage: 'Сізге жақсырақ көмектесу үшін тамақтану деректеріңізге және денсаулық есептеріңізге қол жеткізгім келеді. Келісетін болсаңыз, рұқсат беріңіз.',
    clientFallback: 'Клиент',
    reportRequest: 'Рұқсат сұрады',
    reportGrant: 'Рұқсат берді',
    reportRevoke: 'Рұқсатты кері алды',
    templates: 'Үлгілер',
    templateGreeting: 'Сәлем! Хабарласқаныңыз үшін рахмет. Қашан бастағыңыз келетінін айтыңыз.',
    templateGoals: 'Тамақтану мен денсаулық бойынша негізгі мақсаттарыңыз қандай?',
    templateAllergies: 'Менің білуім керек аллергияларыңыз немесе тағамдық шектеулеріңіз бар ма?',
    templateTypicalDay: 'Әдеттегі тамақтану күнін сипаттап бере аласыз ба — таңғы, түскі, кешкі және жеңіл тағамдар?',
    templateNextSteps: 'Керемет жетістік! Жоспарыңыздың келесі қадамдарын талқылайық.',
    templateFollowUp: 'Соңғы әңгімемізден бері қалай сезініп жүрсіз?',
    templateGreetingLabel: 'Сәлемдесу', templateGoalsLabel: 'Мақсаттар', templateAllergiesLabel: 'Аллергиялар',
    templateTypicalDayLabel: 'Әдеттегі күн', templateNextStepsLabel: 'Келесі қадамдар', templateFollowUpLabel: 'Follow-up',
  },
  clients: {
    title: 'Клиент деректері', backToChat: 'Чатқа оралу',
    noAccess: 'Клиент әлі деректерге рұқсат бермеген болуы мүмкін.',
    meals: 'Тамақтар', labs: 'Талдау нәтижелері', health: 'Денсаулық профилі',
    noMeals: 'Тамақ деректері жоқ.', noLabs: 'Талдау нәтижелері жоқ.', noHealth: 'Денсаулық профилі деректері жоқ.',
    metric: 'Көрсеткіш', value: 'Мән', reference: 'Норма', mealLabel: 'Тамақ',
    name: 'Аты', age: 'Жасы', height: 'Бойы', weight: 'Салмағы', gender: 'Жынысы', goal: 'Мақсаты',
    dailyCalories: 'Күнделікті калория мақсаты', preferences: 'Қалаулар',
    loadFailed: 'Клиент деректерін жүктеу мүмкін болмады',
  },
  offers: {
    title: 'Қызметтер', newOffer: 'Жаңа қызмет', edit: 'Қызметті өзгерту', create: 'Жаңа қызмет',
    empty: 'Әзірге қызметтер жоқ', emptyHint: 'Клиенттер сізбен кеңес бастай алатындай бір қызмет жасаңыз.',
    name: 'Атауы', nameFor: 'Атауы ({lang})',
    description: 'Сипаттамасы', descriptionFor: 'Сипаттамасы ({lang})',
    nameRequired: 'Кемінде бір тілде атау көрсетіңіз.',
    format: 'Формат', duration: 'Ұзақтығы (күн, міндетті емес)', durationHint: '',
    free: 'Тегін', confirmDelete: 'Осы қызметті жою керек пе? Бар сұхбаттар жалғасады, бірақ жаңа клиенттер оны көрмейді.',
    togglePublishFailed: 'Көрінуді өзгерту мүмкін болмады.',
  },
  reviews: {
    title: 'Пікірлер', empty: 'Әзірге пікірлер жоқ', emptyHint: 'Аяқталған кеңестер сізге баға қалдыра алады.',
    total: 'Барлығы', visible: 'Көрінеді', avgRating: 'Орташа рейтинг', noComment: 'Пікір жоқ',
    clientFallback: 'Клиент',
  },
  profile: {
    title: 'Менің профилім', displayName: 'Көрсетілетін есім', type: 'Түрі',
    nutritionist: 'Нутрициолог', dietitian: 'Диетолог', bio: 'Өзі туралы',
    bioPlaceholder: 'Клиенттерге тәжірибеңіз бен тәсіліңіз туралы айтыңыз...',
    education: 'Білімі', educationPlaceholder: 'мысалы, MSc нутрициология, ETH Zurich',
    experienceYears: 'Тәжірибе жылдары', specializations: 'Мамандықтар', languages: 'Тілдер',
    credentials: 'Құжаттар',
    credentialsHint: 'Диплом, сертификат немесе лицензия жүктеңіз. Суреттер қысылады, PDF файлдары сол күйінде сақталады. Максимум 15 МБ. Құжаттар EatSense командасы мақұлдағанша тексеруде тұрады.',
    credentialName: 'Құжат атауы',
    credentialNamePlaceholder: 'Құжат атауы (мысалы, MSc Нутрициология, ETH)',
    characters: 'таңба',
    confirmDeleteCredential: 'Осы құжатты жою керек пе?',
    uploadOnlyImageOrPdf: 'Тек суреттер мен PDF қолданылады.',
    uploadMaxSize: 'Файл 15 МБ-дан кіші болуы керек.',
    credentialNameRequired: 'Алдымен құжат атауын енгізіңіз.',
  },
  specializations: {
    weightManagement: 'Салмақты басқару',
    sportsNutrition: 'Спорттық тамақтану',
    clinicalNutrition: 'Клиникалық нутрициология',
    pediatricNutrition: 'Балалар тамақтануы',
    eatingDisorders: 'Тамақтану бұзылыстары',
    diabetesManagement: 'Диабетті басқару',
    foodAllergies: 'Тамақ аллергиялары',
    vegetarianVegan: 'Вегетарианшылық және веганшылық',
    pregnancyNutrition: 'Жүктілік кезіндегі тамақтану',
    geriatricNutrition: 'Қарт адамдар тамақтануы',
    gutHealth: 'Ішек денсаулығы',
    mentalHealthNutrition: 'Психикалық денсаулық және тамақтану',
  },
  languageNames: {
    en: 'Ағылшын', ru: 'Орыс', kk: 'Қазақ', de: 'Неміс', fr: 'Француз', es: 'Испан',
  },
  formats: {
    CHAT_CONSULTATION: 'Чат арқылы кеңес', MEAL_PLAN: 'Тамақтану жоспары', REPORT_REVIEW: 'Есеп талдау',
    MONTHLY_SUPPORT: 'Айлық қолдау', CUSTOM: 'Жеке',
  },
};

const de: MessagesShape = {
  nav: { dashboard: 'Übersicht', chats: 'Chats', offers: 'Angebote', reviews: 'Bewertungen', profile: 'Mein Profil', signOut: 'Abmelden' },
  common: {
    save: 'Änderungen speichern', saving: 'Speichern...', saved: 'Gespeichert!', cancel: 'Abbrechen', delete: 'Löschen', deleting: 'Löschen...',
    edit: 'Bearbeiten', create: 'Erstellen', creating: 'Erstellen...', loading: 'Laden...', upload: 'Hochladen', uploading: 'Hochladen...',
    view: 'Ansehen', back: 'Zurück', close: 'Schließen', yes: 'Ja', no: 'Nein', confirm: 'Bestätigen', error: 'Fehler', retry: 'Erneut versuchen',
    pending: 'Ausstehend', approved: 'Genehmigt', rejected: 'Abgelehnt', hidden: 'Verborgen', visible: 'Sichtbar',
    published: 'Veröffentlicht', draft: 'Entwurf', optional: 'optional', language: 'Sprache',
    saveFailed: 'Speichern fehlgeschlagen. Bitte erneut versuchen.',
    deleteFailed: 'Löschen fehlgeschlagen. Bitte erneut versuchen.',
    uploadFailed: 'Hochladen fehlgeschlagen. Bitte erneut versuchen.',
    confirmDelete: 'Diesen Eintrag löschen?',
  },
  login: {
    title: 'EatSense Experten-Portal', subtitle: 'Melden Sie sich an, um Ihr Experten-Profil zu verwalten',
    emailPlaceholder: 'ihre@email.com', send: 'Magic Link senden', sending: 'Senden...',
    checkEmail: 'Prüfen Sie Ihr E-Mail-Postfach', sentTo: 'Wir haben einen Magic Link gesendet an',
    useDifferent: 'Andere E-Mail verwenden',
    notExpert: 'Kein Experte', notExpertBody: 'Dieses Portal ist nur für registrierte Experten. Registrieren Sie sich zuerst als Experte in der EatSense-App.',
  },
  auth: {
    signingIn: 'Anmeldung läuft...',
    signInFailed: 'Anmeldung fehlgeschlagen',
    tryAgain: 'Erneut versuchen',
    noToken: 'Kein Token vorhanden',
    linkExpired: 'Ungültiger oder abgelaufener Link',
    authFailed: 'Authentifizierung fehlgeschlagen',
    somethingWrong: 'Etwas ist schiefgelaufen',
  },
  dashboard: {
    title: 'Übersicht', activeChats: 'Aktive Chats', totalClients: 'Gesamtkunden', newMessages: 'Neue Nachrichten', avgRating: 'Ø Bewertung',
    statusPublished: 'Veröffentlicht & Verifiziert', statusRejected: 'Abgelehnt', statusPending: 'In Prüfung',
    yourProfile: 'Ihr Profil',
    rejectedTitle: 'Profil abgelehnt.',
    rejectedBody: 'Bitte aktualisieren Sie Ihr Profil in der EatSense-App und senden Sie es erneut zur Prüfung ein.',
    underReviewTitle: 'In Prüfung.',
    underReviewBody: 'Ihr Profil wird von unserem Team geprüft. Sie erhalten eine Benachrichtigung, sobald es genehmigt ist.',
    quickActions: 'Schnellaktionen', viewChats: 'Chats anzeigen', editProfile: 'Profil bearbeiten',
  },
  chats: {
    title: 'Chats', empty: 'Noch keine Konversationen', noMessages: 'Noch keine Nachrichten',
    photo: 'Foto', sharedMeals: 'Geteilte Mahlzeiten', sharedReport: 'Geteilter Bericht', yesterday: 'Gestern',
    typeMessage: 'Nachricht eingeben...', send: 'Senden', markComplete: 'Als abgeschlossen markieren', reopen: 'Wieder öffnen',
    complete: 'Abgeschlossen', cancelled: 'Abgebrochen', confirmComplete: 'Diese Konsultation als abgeschlossen markieren?',
    completeBtn: 'Abschließen', viewData: 'Daten ansehen', requestData: 'Daten anfordern',
    grantedDataAccess: 'Kunde hat Datenzugriff gewährt', revokedDataAccess: 'Kunde hat Datenzugriff widerrufen',
    dataAccessRequest: 'Anfrage für Datenzugriff',
    dataAccessGranted: 'Datenzugriff gewährt',
    startConversation: 'Noch keine Nachrichten. Starten Sie die Konversation!',
    completedBanner: 'Diese Konsultation wurde abgeschlossen.',
    confirmRequestData: 'Zugriff auf Ernährungs- und Gesundheitsdaten des Kunden anfordern?',
    requestDataMessage: 'Ich möchte auf Ihre Ernährungsdaten und Gesundheitsberichte zugreifen, um Sie besser unterstützen zu können. Bitte gewähren Sie den Zugriff, wenn Sie einverstanden sind.',
    clientFallback: 'Kunde',
    reportRequest: 'Datenzugriff angefordert',
    reportGrant: 'Datenzugriff gewährt',
    reportRevoke: 'Datenzugriff widerrufen',
    templates: 'Vorlagen',
    templateGreeting: 'Hallo! Vielen Dank für Ihre Kontaktaufnahme. Lassen Sie mich wissen, wann Sie starten möchten.',
    templateGoals: 'Was sind Ihre wichtigsten Ernährungs- und Gesundheitsziele?',
    templateAllergies: 'Haben Sie Allergien oder Ernährungseinschränkungen, die ich kennen sollte?',
    templateTypicalDay: 'Können Sie einen typischen Tag Ihrer Ernährung beschreiben — Frühstück, Mittagessen, Abendessen und Snacks?',
    templateNextSteps: 'Tolle Fortschritte! Lassen Sie uns die nächsten Schritte für Ihren Plan besprechen.',
    templateFollowUp: 'Wie haben Sie sich seit unserem letzten Gespräch gefühlt?',
    templateGreetingLabel: 'Begrüßung', templateGoalsLabel: 'Ziele', templateAllergiesLabel: 'Allergien',
    templateTypicalDayLabel: 'Typischer Tag', templateNextStepsLabel: 'Nächste Schritte', templateFollowUpLabel: 'Follow-up',
  },
  clients: {
    title: 'Kundendaten', backToChat: 'Zurück zum Chat',
    noAccess: 'Der Kunde hat möglicherweise noch keinen Datenzugriff gewährt.',
    meals: 'Mahlzeiten', labs: 'Laborergebnisse', health: 'Gesundheitsprofil',
    noMeals: 'Keine Mahlzeitendaten verfügbar.', noLabs: 'Keine Laborergebnisse verfügbar.', noHealth: 'Keine Gesundheitsprofildaten verfügbar.',
    metric: 'Kennzahl', value: 'Wert', reference: 'Referenz', mealLabel: 'Mahlzeit',
    name: 'Name', age: 'Alter', height: 'Größe', weight: 'Gewicht', gender: 'Geschlecht', goal: 'Ziel',
    dailyCalories: 'Tägliches Kalorienziel', preferences: 'Vorlieben',
    loadFailed: 'Kundendaten konnten nicht geladen werden',
  },
  offers: {
    title: 'Angebote', newOffer: 'Neues Angebot', edit: 'Angebot bearbeiten', create: 'Neues Angebot',
    empty: 'Noch keine Angebote', emptyHint: 'Erstellen Sie eines, damit Kunden eine Beratung mit Ihnen starten können.',
    name: 'Name', nameFor: 'Name ({lang})',
    description: 'Beschreibung', descriptionFor: 'Beschreibung ({lang})',
    nameRequired: 'Bitte geben Sie einen Namen in mindestens einer Sprache an.',
    format: 'Format', duration: 'Dauer (Tage, optional)', durationHint: '',
    free: 'Kostenlos', confirmDelete: 'Dieses Angebot löschen? Bestehende Konversationen funktionieren weiter, aber neue Kunden sehen es nicht mehr.',
    togglePublishFailed: 'Sichtbarkeit konnte nicht aktualisiert werden.',
  },
  reviews: {
    title: 'Bewertungen', empty: 'Noch keine Bewertungen', emptyHint: 'Abgeschlossene Konsultationen können Ihnen eine Bewertung hinterlassen.',
    total: 'Gesamt', visible: 'Sichtbar', avgRating: 'Durchschnittsbewertung', noComment: 'Kein Kommentar',
    clientFallback: 'Kunde',
  },
  profile: {
    title: 'Mein Profil', displayName: 'Anzeigename', type: 'Typ',
    nutritionist: 'Ernährungsberater', dietitian: 'Diätassistent', bio: 'Biografie',
    bioPlaceholder: 'Erzählen Sie Kunden von Ihrer Expertise und Ihrem Ansatz...',
    education: 'Ausbildung', educationPlaceholder: 'z.B. MSc Ernährungswissenschaft, ETH Zürich',
    experienceYears: 'Jahre Erfahrung', specializations: 'Spezialisierungen', languages: 'Sprachen',
    credentials: 'Qualifikationen',
    credentialsHint: 'Laden Sie ein Diplom, Zertifikat oder eine Lizenz hoch. Bilder werden komprimiert, PDFs unverändert gespeichert. Max. 15 MB. Qualifikationen bleiben ausstehend, bis das EatSense-Team sie genehmigt.',
    credentialName: 'Name der Qualifikation',
    credentialNamePlaceholder: 'Name der Qualifikation (z.B. MSc Ernährung, ETH)',
    characters: 'Zeichen',
    confirmDeleteCredential: 'Diese Qualifikation löschen?',
    uploadOnlyImageOrPdf: 'Nur Bilder und PDFs werden unterstützt.',
    uploadMaxSize: 'Die Datei muss kleiner als 15 MB sein.',
    credentialNameRequired: 'Bitte geben Sie zuerst einen Namen ein.',
  },
  specializations: {
    weightManagement: 'Gewichtsmanagement',
    sportsNutrition: 'Sporternährung',
    clinicalNutrition: 'Klinische Ernährung',
    pediatricNutrition: 'Kinderernährung',
    eatingDisorders: 'Essstörungen',
    diabetesManagement: 'Diabetes-Management',
    foodAllergies: 'Lebensmittelallergien',
    vegetarianVegan: 'Vegetarisch & Vegan',
    pregnancyNutrition: 'Schwangerschaftsernährung',
    geriatricNutrition: 'Seniorenernährung',
    gutHealth: 'Darmgesundheit',
    mentalHealthNutrition: 'Psychische Gesundheit & Ernährung',
  },
  languageNames: {
    en: 'Englisch', ru: 'Russisch', kk: 'Kasachisch', de: 'Deutsch', fr: 'Französisch', es: 'Spanisch',
  },
  formats: {
    CHAT_CONSULTATION: 'Chat-Beratung', MEAL_PLAN: 'Ernährungsplan', REPORT_REVIEW: 'Bericht-Analyse',
    MONTHLY_SUPPORT: 'Monatliche Betreuung', CUSTOM: 'Individuell',
  },
};

const fr: MessagesShape = {
  nav: { dashboard: 'Tableau de bord', chats: 'Messages', offers: 'Offres', reviews: 'Avis', profile: 'Mon Profil', signOut: 'Se déconnecter' },
  common: {
    save: 'Enregistrer', saving: 'Enregistrement...', saved: 'Enregistré !', cancel: 'Annuler', delete: 'Supprimer', deleting: 'Suppression...',
    edit: 'Modifier', create: 'Créer', creating: 'Création...', loading: 'Chargement...', upload: 'Téléverser', uploading: 'Téléversement...',
    view: 'Voir', back: 'Retour', close: 'Fermer', yes: 'Oui', no: 'Non', confirm: 'Confirmer', error: 'Erreur', retry: 'Réessayer',
    pending: 'En attente', approved: 'Approuvé', rejected: 'Rejeté', hidden: 'Caché', visible: 'Visible',
    published: 'Publié', draft: 'Brouillon', optional: 'facultatif', language: 'Langue',
    saveFailed: 'Échec de l\'enregistrement. Veuillez réessayer.',
    deleteFailed: 'Échec de la suppression. Veuillez réessayer.',
    uploadFailed: 'Échec du téléversement. Veuillez réessayer.',
    confirmDelete: 'Supprimer cet élément ?',
  },
  login: {
    title: 'Portail Expert EatSense', subtitle: 'Connectez-vous pour gérer votre profil d\'expert',
    emailPlaceholder: 'votre@email.com', send: 'Envoyer le lien magique', sending: 'Envoi...',
    checkEmail: 'Vérifiez votre email', sentTo: 'Nous avons envoyé un lien magique à',
    useDifferent: 'Utiliser un autre email',
    notExpert: 'Non expert', notExpertBody: 'Ce portail est réservé aux experts enregistrés. Inscrivez-vous d\'abord comme expert dans l\'application EatSense.',
  },
  auth: {
    signingIn: 'Connexion en cours...',
    signInFailed: 'Échec de la connexion',
    tryAgain: 'Réessayer',
    noToken: 'Aucun jeton fourni',
    linkExpired: 'Lien invalide ou expiré',
    authFailed: 'Échec de l\'authentification',
    somethingWrong: 'Une erreur est survenue',
  },
  dashboard: {
    title: 'Tableau de bord', activeChats: 'Chats actifs', totalClients: 'Total clients', newMessages: 'Nouveaux messages', avgRating: 'Note moyenne',
    statusPublished: 'Publié et vérifié', statusRejected: 'Rejeté', statusPending: 'En cours d\'examen',
    yourProfile: 'Votre Profil',
    rejectedTitle: 'Profil rejeté.',
    rejectedBody: 'Veuillez mettre à jour votre profil dans l\'application EatSense et le soumettre à nouveau.',
    underReviewTitle: 'En cours d\'examen.',
    underReviewBody: 'Votre profil est examiné par notre équipe. Vous recevrez une notification dès son approbation.',
    quickActions: 'Actions rapides', viewChats: 'Voir les chats', editProfile: 'Modifier le profil',
  },
  chats: {
    title: 'Messages', empty: 'Aucune conversation pour le moment', noMessages: 'Aucun message pour le moment',
    photo: 'Photo', sharedMeals: 'Repas partagés', sharedReport: 'Rapport partagé', yesterday: 'Hier',
    typeMessage: 'Tapez un message...', send: 'Envoyer', markComplete: 'Marquer comme terminé', reopen: 'Rouvrir',
    complete: 'Terminée', cancelled: 'Annulée', confirmComplete: 'Marquer cette consultation comme terminée ?',
    completeBtn: 'Terminer', viewData: 'Voir les données', requestData: 'Demander l\'accès',
    grantedDataAccess: 'Le client a accordé l\'accès aux données', revokedDataAccess: 'Le client a révoqué l\'accès aux données',
    dataAccessRequest: 'Demande d\'accès aux données',
    dataAccessGranted: 'Accès aux données accordé',
    startConversation: 'Aucun message pour le moment. Démarrez la conversation !',
    completedBanner: 'Cette consultation a été terminée.',
    confirmRequestData: 'Demander l\'accès aux données de nutrition et de santé du client ?',
    requestDataMessage: 'Je souhaite accéder à vos données nutritionnelles et à vos rapports de santé pour mieux vous accompagner. Veuillez accorder l\'accès si vous acceptez.',
    clientFallback: 'Client',
    reportRequest: 'Accès demandé',
    reportGrant: 'Accès accordé',
    reportRevoke: 'Accès révoqué',
    templates: 'Modèles',
    templateGreeting: 'Bonjour ! Merci de m\'avoir contacté. Dites-moi quand vous souhaitez commencer.',
    templateGoals: 'Quels sont vos principaux objectifs nutritionnels et de santé ?',
    templateAllergies: 'Avez-vous des allergies ou des restrictions alimentaires que je devrais connaître ?',
    templateTypicalDay: 'Pourriez-vous décrire une journée typique — petit-déjeuner, déjeuner, dîner et collations ?',
    templateNextSteps: 'Excellents progrès ! Discutons des prochaines étapes de votre plan.',
    templateFollowUp: 'Comment vous sentez-vous depuis notre dernière conversation ?',
    templateGreetingLabel: 'Salutation', templateGoalsLabel: 'Objectifs', templateAllergiesLabel: 'Allergies',
    templateTypicalDayLabel: 'Journée type', templateNextStepsLabel: 'Étapes suivantes', templateFollowUpLabel: 'Suivi',
  },
  clients: {
    title: 'Données du client', backToChat: 'Retour au chat',
    noAccess: 'Le client n\'a peut-être pas encore accordé l\'accès aux données.',
    meals: 'Repas', labs: 'Résultats d\'analyse', health: 'Profil de santé',
    noMeals: 'Aucune donnée de repas disponible.', noLabs: 'Aucun résultat d\'analyse disponible.', noHealth: 'Aucune donnée de profil de santé disponible.',
    metric: 'Paramètre', value: 'Valeur', reference: 'Référence', mealLabel: 'Repas',
    name: 'Nom', age: 'Âge', height: 'Taille', weight: 'Poids', gender: 'Sexe', goal: 'Objectif',
    dailyCalories: 'Objectif calorique journalier', preferences: 'Préférences',
    loadFailed: 'Échec du chargement des données client',
  },
  offers: {
    title: 'Offres', newOffer: 'Nouvelle offre', edit: 'Modifier l\'offre', create: 'Nouvelle offre',
    empty: 'Aucune offre pour le moment', emptyHint: 'Créez-en une pour que les clients puissent démarrer une consultation.',
    name: 'Nom', nameFor: 'Nom ({lang})',
    description: 'Description', descriptionFor: 'Description ({lang})',
    nameRequired: 'Veuillez fournir un nom dans au moins une langue.',
    format: 'Format', duration: 'Durée (jours, facultatif)', durationHint: '',
    free: 'Gratuit', confirmDelete: 'Supprimer cette offre ? Les conversations existantes continueront, mais les nouveaux clients ne la verront plus.',
    togglePublishFailed: 'Impossible de modifier la visibilité.',
  },
  reviews: {
    title: 'Avis', empty: 'Aucun avis pour le moment', emptyHint: 'Les consultations terminées peuvent vous laisser une note.',
    total: 'Total', visible: 'Visibles', avgRating: 'Note moyenne', noComment: 'Aucun commentaire',
    clientFallback: 'Client',
  },
  profile: {
    title: 'Mon Profil', displayName: 'Nom d\'affichage', type: 'Type',
    nutritionist: 'Nutritionniste', dietitian: 'Diététicien', bio: 'Biographie',
    bioPlaceholder: 'Parlez aux clients de votre expertise et de votre approche...',
    education: 'Formation', educationPlaceholder: 'ex. MSc en sciences de la nutrition, EPF Zurich',
    experienceYears: 'Années d\'expérience', specializations: 'Spécialisations', languages: 'Langues',
    credentials: 'Diplômes',
    credentialsHint: 'Téléversez un diplôme, une certification ou une licence. Les images sont compressées, les PDF conservés tels quels. Max 15 Mo. Les diplômes restent en attente jusqu\'à approbation par l\'équipe EatSense.',
    credentialName: 'Nom du diplôme',
    credentialNamePlaceholder: 'Nom du diplôme (ex. MSc Nutrition, EPF)',
    characters: 'caractères',
    confirmDeleteCredential: 'Supprimer ce diplôme ?',
    uploadOnlyImageOrPdf: 'Seules les images et les PDF sont pris en charge.',
    uploadMaxSize: 'Le fichier doit faire moins de 15 Mo.',
    credentialNameRequired: 'Veuillez d\'abord saisir un nom.',
  },
  specializations: {
    weightManagement: 'Gestion du poids',
    sportsNutrition: 'Nutrition sportive',
    clinicalNutrition: 'Nutrition clinique',
    pediatricNutrition: 'Nutrition pédiatrique',
    eatingDisorders: 'Troubles alimentaires',
    diabetesManagement: 'Gestion du diabète',
    foodAllergies: 'Allergies alimentaires',
    vegetarianVegan: 'Végétarien & Végan',
    pregnancyNutrition: 'Nutrition pendant la grossesse',
    geriatricNutrition: 'Nutrition gériatrique',
    gutHealth: 'Santé intestinale',
    mentalHealthNutrition: 'Santé mentale & Nutrition',
  },
  languageNames: {
    en: 'Anglais', ru: 'Russe', kk: 'Kazakh', de: 'Allemand', fr: 'Français', es: 'Espagnol',
  },
  formats: {
    CHAT_CONSULTATION: 'Consultation par chat', MEAL_PLAN: 'Plan alimentaire', REPORT_REVIEW: 'Analyse de rapport',
    MONTHLY_SUPPORT: 'Accompagnement mensuel', CUSTOM: 'Personnalisé',
  },
};

const es: MessagesShape = {
  nav: { dashboard: 'Panel', chats: 'Chats', offers: 'Servicios', reviews: 'Reseñas', profile: 'Mi Perfil', signOut: 'Cerrar sesión' },
  common: {
    save: 'Guardar cambios', saving: 'Guardando...', saved: '¡Guardado!', cancel: 'Cancelar', delete: 'Eliminar', deleting: 'Eliminando...',
    edit: 'Editar', create: 'Crear', creating: 'Creando...', loading: 'Cargando...', upload: 'Subir', uploading: 'Subiendo...',
    view: 'Ver', back: 'Volver', close: 'Cerrar', yes: 'Sí', no: 'No', confirm: 'Confirmar', error: 'Error', retry: 'Reintentar',
    pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado', hidden: 'Oculto', visible: 'Visible',
    published: 'Publicado', draft: 'Borrador', optional: 'opcional', language: 'Idioma',
    saveFailed: 'No se pudo guardar. Inténtalo de nuevo.',
    deleteFailed: 'No se pudo eliminar. Inténtalo de nuevo.',
    uploadFailed: 'No se pudo subir. Inténtalo de nuevo.',
    confirmDelete: '¿Eliminar este elemento?',
  },
  login: {
    title: 'Portal de Expertos EatSense', subtitle: 'Inicia sesión para gestionar tu perfil de experto',
    emailPlaceholder: 'tu@email.com', send: 'Enviar enlace mágico', sending: 'Enviando...',
    checkEmail: 'Revisa tu correo', sentTo: 'Hemos enviado un enlace mágico a',
    useDifferent: 'Usar otro email',
    notExpert: 'No es experto', notExpertBody: 'Este portal es solo para expertos registrados. Regístrate primero como experto en la aplicación EatSense.',
  },
  auth: {
    signingIn: 'Iniciando sesión...',
    signInFailed: 'Error al iniciar sesión',
    tryAgain: 'Reintentar',
    noToken: 'No se proporcionó token',
    linkExpired: 'Enlace inválido o caducado',
    authFailed: 'Error de autenticación',
    somethingWrong: 'Algo salió mal',
  },
  dashboard: {
    title: 'Panel', activeChats: 'Chats activos', totalClients: 'Total de clientes', newMessages: 'Mensajes nuevos', avgRating: 'Valoración media',
    statusPublished: 'Publicado y verificado', statusRejected: 'Rechazado', statusPending: 'En revisión',
    yourProfile: 'Tu Perfil',
    rejectedTitle: 'Perfil rechazado.',
    rejectedBody: 'Por favor, actualiza tu perfil en la aplicación EatSense y envíalo de nuevo para revisión.',
    underReviewTitle: 'En revisión.',
    underReviewBody: 'Tu perfil está siendo revisado por nuestro equipo. Recibirás una notificación cuando sea aprobado.',
    quickActions: 'Acciones rápidas', viewChats: 'Ver chats', editProfile: 'Editar perfil',
  },
  chats: {
    title: 'Chats', empty: 'Aún no hay conversaciones', noMessages: 'Aún no hay mensajes',
    photo: 'Foto', sharedMeals: 'Comidas compartidas', sharedReport: 'Informe compartido', yesterday: 'Ayer',
    typeMessage: 'Escribe un mensaje...', send: 'Enviar', markComplete: 'Marcar como completada', reopen: 'Reabrir',
    complete: 'Completada', cancelled: 'Cancelada', confirmComplete: '¿Marcar esta consulta como completada?',
    completeBtn: 'Completar', viewData: 'Ver datos', requestData: 'Solicitar acceso',
    grantedDataAccess: 'El cliente concedió acceso a los datos', revokedDataAccess: 'El cliente revocó el acceso a los datos',
    dataAccessRequest: 'Solicitud de acceso a datos',
    dataAccessGranted: 'Acceso a datos concedido',
    startConversation: 'Aún no hay mensajes. ¡Inicia la conversación!',
    completedBanner: 'Esta consulta ha sido completada.',
    confirmRequestData: '¿Solicitar acceso a los datos de nutrición y salud del cliente?',
    requestDataMessage: 'Me gustaría acceder a tus datos de nutrición e informes de salud para poder ayudarte mejor. Por favor, concede el acceso si estás de acuerdo.',
    clientFallback: 'Cliente',
    reportRequest: 'Acceso solicitado',
    reportGrant: 'Acceso concedido',
    reportRevoke: 'Acceso revocado',
    templates: 'Plantillas',
    templateGreeting: '¡Hola! Gracias por contactarme. Dime cuándo te gustaría empezar.',
    templateGoals: '¿Cuáles son tus principales objetivos de nutrición y salud?',
    templateAllergies: '¿Tienes alergias o restricciones alimentarias que deba conocer?',
    templateTypicalDay: '¿Podrías describir un día típico de alimentación — desayuno, almuerzo, cena y snacks?',
    templateNextSteps: '¡Excelente progreso! Hablemos de los próximos pasos de tu plan.',
    templateFollowUp: '¿Cómo te has sentido desde nuestra última conversación?',
    templateGreetingLabel: 'Saludo', templateGoalsLabel: 'Objetivos', templateAllergiesLabel: 'Alergias',
    templateTypicalDayLabel: 'Día típico', templateNextStepsLabel: 'Próximos pasos', templateFollowUpLabel: 'Seguimiento',
  },
  clients: {
    title: 'Datos del cliente', backToChat: 'Volver al chat',
    noAccess: 'Puede que el cliente aún no haya concedido acceso a los datos.',
    meals: 'Comidas', labs: 'Resultados de laboratorio', health: 'Perfil de salud',
    noMeals: 'No hay datos de comidas disponibles.', noLabs: 'No hay resultados de laboratorio disponibles.', noHealth: 'No hay datos del perfil de salud.',
    metric: 'Indicador', value: 'Valor', reference: 'Referencia', mealLabel: 'Comida',
    name: 'Nombre', age: 'Edad', height: 'Altura', weight: 'Peso', gender: 'Género', goal: 'Objetivo',
    dailyCalories: 'Objetivo calórico diario', preferences: 'Preferencias',
    loadFailed: 'No se pudieron cargar los datos del cliente',
  },
  offers: {
    title: 'Servicios', newOffer: 'Nuevo servicio', edit: 'Editar servicio', create: 'Nuevo servicio',
    empty: 'Aún no hay servicios', emptyHint: 'Crea uno para que los clientes puedan iniciar una consulta contigo.',
    name: 'Nombre', nameFor: 'Nombre ({lang})',
    description: 'Descripción', descriptionFor: 'Descripción ({lang})',
    nameRequired: 'Por favor, proporciona un nombre al menos en un idioma.',
    format: 'Formato', duration: 'Duración (días, opcional)', durationHint: '',
    free: 'Gratis', confirmDelete: '¿Eliminar este servicio? Las conversaciones existentes seguirán funcionando, pero los nuevos clientes ya no lo verán.',
    togglePublishFailed: 'No se pudo actualizar la visibilidad.',
  },
  reviews: {
    title: 'Reseñas', empty: 'Aún no hay reseñas', emptyHint: 'Las consultas completadas pueden dejarte una valoración.',
    total: 'Total', visible: 'Visibles', avgRating: 'Valoración media', noComment: 'Sin comentario',
    clientFallback: 'Cliente',
  },
  profile: {
    title: 'Mi Perfil', displayName: 'Nombre público', type: 'Tipo',
    nutritionist: 'Nutricionista', dietitian: 'Dietista', bio: 'Biografía',
    bioPlaceholder: 'Cuéntales a los clientes sobre tu experiencia y enfoque...',
    education: 'Formación', educationPlaceholder: 'ej. MSc en Nutrición, ETH Zúrich',
    experienceYears: 'Años de experiencia', specializations: 'Especializaciones', languages: 'Idiomas',
    credentials: 'Credenciales',
    credentialsHint: 'Sube un diploma, certificación o licencia. Las imágenes se comprimen, los PDFs se guardan tal cual. Máx. 15MB. Las credenciales quedan pendientes hasta que el equipo de EatSense las apruebe.',
    credentialName: 'Nombre de la credencial',
    credentialNamePlaceholder: 'Nombre de la credencial (ej. MSc Nutrición, ETH)',
    characters: 'caracteres',
    confirmDeleteCredential: '¿Eliminar esta credencial?',
    uploadOnlyImageOrPdf: 'Solo se admiten imágenes y PDFs.',
    uploadMaxSize: 'El archivo debe ser menor de 15 MB.',
    credentialNameRequired: 'Introduce primero un nombre de credencial.',
  },
  specializations: {
    weightManagement: 'Control de peso',
    sportsNutrition: 'Nutrición deportiva',
    clinicalNutrition: 'Nutrición clínica',
    pediatricNutrition: 'Nutrición pediátrica',
    eatingDisorders: 'Trastornos alimentarios',
    diabetesManagement: 'Manejo de la diabetes',
    foodAllergies: 'Alergias alimentarias',
    vegetarianVegan: 'Vegetariano y Vegano',
    pregnancyNutrition: 'Nutrición durante el embarazo',
    geriatricNutrition: 'Nutrición geriátrica',
    gutHealth: 'Salud intestinal',
    mentalHealthNutrition: 'Salud mental y Nutrición',
  },
  languageNames: {
    en: 'Inglés', ru: 'Ruso', kk: 'Kazajo', de: 'Alemán', fr: 'Francés', es: 'Español',
  },
  formats: {
    CHAT_CONSULTATION: 'Consulta por chat', MEAL_PLAN: 'Plan de comidas', REPORT_REVIEW: 'Análisis de informe',
    MONTHLY_SUPPORT: 'Acompañamiento mensual', CUSTOM: 'Personalizado',
  },
};

export const MESSAGES: Record<Locale, MessagesShape> = { en, ru, kk, de, fr, es };
export type { MessagesShape };

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
    clients: string;
    calendar: string;
    consultations: string;
    offers: string;
    earnings: string;
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
    openFailed: string;
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
    scheduleBtn: string;
    contactBtn: string;
    liveNow: string;
    shouldHaveStarted: string;
    nextConsultation: string;
    startBtn: string;
    viewAll: string;
    minutesShort: string;
    hoursShort: string;
    minShort: string;
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
    startVideo: string;
    awaitingPayment: string;
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
    translated: string;
  };
  calendar: {
    title: string;
    save: string;
    subscribeTitle: string;
    subscribeHint: string;
    copy: string;
    copied: string;
    vacationTitle: string;
    vacationHint: string;
    awayUntil: string;
    vacationMessage: string;
    vacationPlaceholder: string;
    clear: string;
    exceptionsTitle: string;
    exceptionsHint: string;
    addClosedDay: string;
    noExceptions: string;
    closed: string;
    custom: string;
    timezone: string;
    timezoneHint: string;
    off: string;
    addBlock: string;
    failed: string;
    meetings: string;
    history: string;
    noMeetings: string;
    manage: string;
    waiting: string;
    start: string;
    chat: string;
    pageTitle: string;
    availability: string;
    upcoming: string;
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
    ingredient: string;
    searchPlaceholder: string;
    filter_all: string;
    filter_code: string;
    filter_manual: string;
    emptyState: string;
    noMatches: string;
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
    durationMinutes: string;
    days: string;
    minutes: string;
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
    obgyn: string;
    pediatrician: string;
    gp: string;
    psychologist: string;
    endocrinologist: string;
    other: string;
    bio: string;
    bioPlaceholder: string;
    education: string;
    educationPlaceholder: string;
    experienceYears: string;
    specializations: string;
    languages: string;
    videoCalls: string;
    videoCallsBody: string;
    videoCallsEnabled: string;
    videoCallsDisabled: string;
    profileTools: string;
    profileToolsBody: string;
    manageOffers: string;
    manageReviews: string;
    contactSupport: string;
    credentials: string;
    credentialsHint: string;
    credentialName: string;
    credentialNamePlaceholder: string;
    characters: string;
    confirmDeleteCredential: string;
    uploadOnlyImageOrPdf: string;
    uploadMaxSize: string;
    credentialNameRequired: string;
    expertCodeTitle: string;
    expertCodeBody: string;
    expertCodeUnavailable: string;
    copyCode: string;
    regenerateCode: string;
    regenerateCodeConfirm: string;
    codeCopied: string;
    codeUsage: string;
    dietsSoonTitle: string;
    dietsSoonBody: string;
  };
  specializations: Record<SpecializationKey, string>;
  languageNames: Record<Locale, string>;
  formats: {
    CHAT_CONSULTATION: string;
    VIDEO_CONSULTATION: string;
    MEAL_PLAN: string;
    REPORT_REVIEW: string;
    MONTHLY_SUPPORT: string;
    CUSTOM: string;
  };
  call: {
    connecting: string;
    unavailable: string;
    tryAgainLater: string;
    notConfigured: string;
    reconnecting: string;
    reconnectingHint: string;
    inProgress: string;
    inProgressHint: string;
    end: string;
  };
  support: {
    title: string;
    subject: string;
    expertSupport: string;
    body: string;
    bodyFull: string;
  };
  earnings: {
    bannerCta: string;
    thisMonth: string;
    pendingPayout: string;
    lifetime: string;
    comingSoon: string;
    body: string;
    stripeConnected: string;
    payoutsAuto: string;
    updateStripe: string;
    finishSetup: string;
    finishSetupBody: string;
    continueStripe: string;
    connectStripeTitle: string;
    connectStripeBody: string;
    connectStripeBtn: string;
    stripeFeeBefore: string;
    paymentsDisabled: string;
  };
  sidebarMobile: {
    home: string;
    schedule: string;
  };
  onboardingTour: {
    skip: string;
    next: string;
    done: string;
    closeAria: string;
    slide1Title: string;
    slide1Body: string;
    slide2Title: string;
    slide2Body: string;
    slide3Title: string;
    slide3Body: string;
    slide4Title: string;
    slide4Body: string;
  };
  consultations: {
    title: string;
    tabAvailability: string;
    tabBookings: string;
    newButton: string;
    pickClientAndTime: string;
    cancelConfirm: string;
    completeConfirm: string;
    noShowConfirm: string;
    upcoming: string;
    past: string;
    empty: string;
    startBtn: string;
    chatBtn: string;
    rescheduleBtn: string;
    completeBtn: string;
    cancelBtn: string;
    noShowBtn: string;
    newConsultation: string;
    client: string;
    when: string;
    duration: string;
    modalCancel: string;
    modalCreate: string;
    modalSend: string;
    rescheduleTitle: string;
    rescheduleBody: string;
    newTime: string;
    accept: string;
    decline: string;
    youProposed: string;
    clientProposed: string;
  };
};

const en: MessagesShape = {
  nav: { dashboard: 'Dashboard', chats: 'Chats', clients: 'Clients', calendar: 'Calendar', consultations: 'Bookings', offers: 'Offers', earnings: 'Earnings', reviews: 'Reviews', profile: 'My Profile', signOut: 'Sign out' },
  common: {
    save: 'Save changes', saving: 'Saving...', saved: 'Saved!', cancel: 'Cancel', delete: 'Delete', deleting: 'Deleting...',
    edit: 'Edit', create: 'Create', creating: 'Creating...', loading: 'Loading...', upload: 'Upload', uploading: 'Uploading...',
    view: 'View', back: 'Back', close: 'Close', yes: 'Yes', no: 'No', confirm: 'Confirm', error: 'Error', retry: 'Retry',
    pending: 'Pending', approved: 'Approved', rejected: 'Rejected', hidden: 'Hidden', visible: 'Visible',
    published: 'Published', draft: 'Draft', optional: 'optional', language: 'Language',
    saveFailed: 'Failed to save. Please try again.',
    deleteFailed: 'Failed to delete. Please try again.',
    uploadFailed: 'Failed to upload. Please try again.',
    openFailed: 'Failed to open the document. Please try again.',
    confirmDelete: 'Delete this item?',
  },
  login: {
    title: 'EatSense Expert Portal', subtitle: 'Enter your email to receive a one-time sign-in link.',
    emailPlaceholder: 'your@email.com', send: 'Send sign-in link', sending: 'Sending...',
    checkEmail: 'Check your email', sentTo: 'We sent a sign-in link to',
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
    scheduleBtn: 'Schedule', contactBtn: 'Contact', liveNow: 'Live now', shouldHaveStarted: 'Should have started', nextConsultation: 'Next consultation', startBtn: 'Start', viewAll: 'View all', minutesShort: 'min', hoursShort: 'h', minShort: 'm',
  },
  chats: {
    title: 'Chats', empty: 'No conversations yet', noMessages: 'No messages yet',
    photo: 'Photo', sharedMeals: 'Shared meals', sharedReport: 'Shared report', yesterday: 'Yesterday',
    typeMessage: 'Type a message...', send: 'Send', markComplete: 'Mark complete', reopen: 'Reopen',
    complete: 'Completed', cancelled: 'Cancelled', confirmComplete: 'Mark this consultation as complete?',
    completeBtn: 'Complete', viewData: 'View Data', requestData: 'Request Data', startVideo: 'Video call', awaitingPayment: 'Awaiting payment',
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
    templateTypicalDayLabel: 'Typical day', templateNextStepsLabel: 'Next steps', templateFollowUpLabel: 'Follow-up', translated: 'Translated',
  },
  calendar: {
    title: 'Availability',
    save: 'Save',
    subscribeTitle: 'Subscribe to calendar',
    subscribeHint: 'Add this URL to Google Calendar or Apple Calendar to see consultations.',
    copy: 'Copy',
    copied: 'Copied',
    vacationTitle: 'Out of office',
    vacationHint: 'While active, new bookings are blocked.',
    awayUntil: 'Away until',
    vacationMessage: 'Message (optional)',
    vacationPlaceholder: 'Back on July 1',
    clear: 'Clear',
    exceptionsTitle: 'Exceptions (closed days)',
    exceptionsHint: 'Specific dates when you do not accept consultations.',
    addClosedDay: 'Add closed day',
    noExceptions: 'No exceptions added.',
    closed: 'closed',
    custom: 'custom',
    timezone: 'Timezone',
    timezoneHint: 'IANA timezone (e.g. Europe/Zurich, Asia/Almaty)',
    off: 'Off',
    addBlock: 'Add block',
    failed: 'Failed',
    meetings: 'Meetings', history: 'History', noMeetings: 'No consultations in this section', manage: 'Open all', waiting: 'Waiting room', start: 'Start', chat: 'Chat', pageTitle: 'Schedule', availability: 'Availability', upcoming: 'Upcoming',
  },
  clients: {
    title: 'Client Data', backToChat: 'Back to chat',
    noAccess: 'The client may not have granted data access yet.',
    meals: 'Meals', labs: 'Lab Results', health: 'Health Profile',
    noMeals: 'No meal data available.', noLabs: 'No lab results available.', noHealth: 'No health profile data available.',
    metric: 'Metric', value: 'Value', reference: 'Reference', mealLabel: 'Meal',
    name: 'Name', age: 'Age', height: 'Height', weight: 'Weight', gender: 'Gender', goal: 'Goal',
    dailyCalories: 'Daily Calories Target', preferences: 'Preferences',
    loadFailed: 'Failed to load client data', ingredient: 'Ingredient', searchPlaceholder: 'Search by name or email', filter_all: 'All', filter_code: 'By code', filter_manual: 'Manual', emptyState: 'No clients yet. Share your access code to invite people.', noMatches: 'No clients match your filters.',
  },
  offers: {
    title: 'Offers', newOffer: 'New offer', edit: 'Edit offer', create: 'New offer',
    empty: 'No offers yet', emptyHint: 'Create one so clients can start a consultation with you.',
    name: 'Name', nameFor: 'Name ({lang})',
    description: 'Description', descriptionFor: 'Description ({lang})',
    nameRequired: 'Please provide a name in at least one language.',
    format: 'Format', duration: 'Duration (days, optional)', durationMinutes: 'Session duration (minutes, optional)', days: 'days', minutes: 'min',
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
    nutritionist: 'Nutritionist', dietitian: 'Dietitian', obgyn: 'OB-GYN', pediatrician: 'Pediatrician', gp: 'General practitioner', psychologist: 'Psychologist', endocrinologist: 'Endocrinologist', other: 'Other', bio: 'Bio',
    bioPlaceholder: 'Tell clients about your expertise and approach...',
    education: 'Education', educationPlaceholder: 'e.g. MSc in Nutrition Science, ETH Zurich',
    experienceYears: 'Years of Experience', specializations: 'Specializations', languages: 'Languages',
    videoCalls: 'Video calls',
    videoCallsBody: 'When disabled, clients and you keep the chat, but video rooms cannot be opened for consultations.',
    videoCallsEnabled: 'Video consultations enabled',
    videoCallsDisabled: 'Video consultations disabled',
    profileTools: 'Profile tools',
    profileToolsBody: 'Offers, reviews, and support now live with your profile settings.',
    manageOffers: 'Manage offers',
    manageReviews: 'Reviews',
    contactSupport: 'Support',
    credentials: 'Credentials',
    credentialsHint: 'Upload a diploma, certification, or license. Images are compressed; PDFs stored as-is. Max 15MB. Credentials stay pending until approved by the EatSense team.',
    credentialName: 'Credential name',
    credentialNamePlaceholder: 'Credential name (e.g. MSc Nutrition, ETH)',
    characters: 'characters',
    confirmDeleteCredential: 'Delete this credential?',
    uploadOnlyImageOrPdf: 'Only images and PDFs are supported.',
    uploadMaxSize: 'File must be smaller than 15MB.',
    credentialNameRequired: 'Please enter a credential name first.',
    expertCodeTitle: 'Specialist code',
    expertCodeBody: 'Share this private code with clients who should add you directly in EatSense.',
    expertCodeUnavailable: 'Your profile must be published before clients can use this code.',
    copyCode: 'Copy code',
    regenerateCode: 'Regenerate',
    regenerateCodeConfirm: 'Regenerate this code? The old code will stop working.',
    codeCopied: 'Code copied.',
    codeUsage: 'Uses',
    dietsSoonTitle: 'Client diets',
    dietsSoonBody: 'Soon you will be able to create a structured diet plan and send it to a client.',
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
    CHAT_CONSULTATION: 'Chat consultation', VIDEO_CONSULTATION: 'Video consultation', MEAL_PLAN: 'Meal plan', REPORT_REVIEW: 'Report review',
    MONTHLY_SUPPORT: 'Monthly support', CUSTOM: 'Custom',
  },
  call: {
    connecting: 'Connecting to video room…',
    unavailable: 'Video unavailable',
    tryAgainLater: 'Try again later.',
    notConfigured: 'Video calls are not configured yet on the server.',
    reconnecting: 'Reconnecting…',
    reconnectingHint: 'Keep this page open while we restore the connection.',
    inProgress: 'Video consultation in progress',
    inProgressHint: 'Use the red button when you are ready to end the call.',
    end: 'End',
  },
  support: {
    title: 'Contact EatSense', subject: 'EatSense expert support', expertSupport: 'Expert support', body: 'Email us about schedule, clients, payouts, profile changes, or technical issues.', bodyFull: 'Email us about schedule, clients, payouts, profile changes, or technical issues. We usually reply within one business day.',
  },
  earnings: {
    bannerCta: 'Connect Stripe to receive automatic payouts for consultations.', thisMonth: 'This month', pendingPayout: 'Pending payout', lifetime: 'Lifetime', comingSoon: 'Coming soon', body: 'Earnings reporting is in beta. For exact balances and transfers check Stripe Connect.', stripeConnected: 'Stripe Connect connected', payoutsAuto: 'Payouts will appear in your account after consultations complete.', updateStripe: 'Update on Stripe', finishSetup: 'Finish Stripe setup', finishSetupBody: 'Submit your details on Stripe to enable payouts.', continueStripe: 'Continue on Stripe', connectStripeTitle: 'Connect Stripe to receive payouts', connectStripeBody: 'Stripe Connect handles payouts automatically when clients pay for a consultation.', connectStripeBtn: 'Connect Stripe', stripeFeeBefore: 'EatSense uses Stripe Connect Express. Onboarding takes 5–10 minutes. The platform fee is', paymentsDisabled: 'Payments are temporarily disabled by the admin. Stripe linking will be available once enabled.',
  },
  sidebarMobile: {
    home: 'Home', schedule: 'Schedule',
  },
  onboardingTour: {
    skip: 'Skip', next: 'Next', done: 'Got it', closeAria: 'Close',
    slide1Title: 'Your access code',
    slide1Body: 'Share this code with clients — they enter it in the mobile app to start a consultation with you. You can copy or regenerate it in Profile.',
    slide2Title: 'Set your availability',
    slide2Body: 'Open Availability and mark when you accept consultations. Clients only see free slots. Out-of-office mode pauses bookings.',
    slide3Title: 'Pricing & offers',
    slide3Body: 'Add 30/60/90-min offers with prices in your local currency. Stripe Connect handles payouts automatically (set up in Earnings).',
    slide4Title: 'Chat & client notes',
    slide4Body: 'Each client conversation lives in Chats. Open a client card to see meals, lab results, and add private notes — visible only to you.',
  },
  consultations: {
    title: 'Consultations', tabAvailability: 'Availability', tabBookings: 'Bookings', newButton: 'New',
    pickClientAndTime: 'Pick a client and a time',
    cancelConfirm: 'Cancel consultation?', completeConfirm: 'Complete consultation?', noShowConfirm: 'Mark as no-show?',
    upcoming: 'Upcoming', past: 'Past', empty: 'No consultations',
    startBtn: 'Start', chatBtn: 'Chat', rescheduleBtn: 'Reschedule',
    completeBtn: 'Complete', cancelBtn: 'Cancel', noShowBtn: 'No-show',
    newConsultation: 'New consultation', client: 'Client', when: 'When', duration: 'Duration', modalCancel: 'Cancel', modalCreate: 'Create', modalSend: 'Send', rescheduleTitle: 'Reschedule', rescheduleBody: 'Pick a new time to propose to the client.', newTime: 'New time', accept: 'Accept', decline: 'Decline', youProposed: 'You proposed reschedule to:', clientProposed: 'Client proposed reschedule to:',
  },
};

const ru: MessagesShape = {
  nav: { dashboard: 'Обзор', chats: 'Чаты', clients: 'Клиенты', calendar: 'Календарь', consultations: 'Встречи', offers: 'Услуги', earnings: 'Выплаты', reviews: 'Отзывы', profile: 'Мой профиль', signOut: 'Выйти' },
  common: {
    save: 'Сохранить', saving: 'Сохранение...', saved: 'Сохранено!', cancel: 'Отмена', delete: 'Удалить', deleting: 'Удаление...',
    edit: 'Изменить', create: 'Создать', creating: 'Создание...', loading: 'Загрузка...', upload: 'Загрузить', uploading: 'Загрузка...',
    view: 'Посмотреть', back: 'Назад', close: 'Закрыть', yes: 'Да', no: 'Нет', confirm: 'Подтвердить', error: 'Ошибка', retry: 'Повторить',
    pending: 'На проверке', approved: 'Одобрено', rejected: 'Отклонено', hidden: 'Скрыт', visible: 'Виден',
    published: 'Опубликовано', draft: 'Черновик', optional: 'необязательно', language: 'Язык',
    saveFailed: 'Не удалось сохранить. Попробуйте ещё раз.',
    deleteFailed: 'Не удалось удалить. Попробуйте ещё раз.',
    uploadFailed: 'Не удалось загрузить. Попробуйте ещё раз.',
    openFailed: 'Не удалось открыть документ. Попробуйте ещё раз.',
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
    scheduleBtn: 'Расписание', contactBtn: 'Связаться', liveNow: 'Идёт сейчас', shouldHaveStarted: 'Должна была начаться', nextConsultation: 'Ближайшая консультация', startBtn: 'Начать', viewAll: 'Все', minutesShort: 'мин', hoursShort: 'ч', minShort: 'м',
  },
  chats: {
    title: 'Чаты', empty: 'Пока нет консультаций', noMessages: 'Пока нет сообщений',
    photo: 'Фото', sharedMeals: 'Поделились приёмами пищи', sharedReport: 'Поделились отчётом', yesterday: 'Вчера',
    typeMessage: 'Введите сообщение...', send: 'Отправить', markComplete: 'Завершить', reopen: 'Возобновить',
    complete: 'Завершена', cancelled: 'Отменена', confirmComplete: 'Отметить консультацию как завершённую?',
    completeBtn: 'Завершить', viewData: 'Посмотреть данные', requestData: 'Запросить доступ', startVideo: 'Видеозвонок', awaitingPayment: 'Ожидает оплаты',
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
    templateTypicalDayLabel: 'Типичный день', templateNextStepsLabel: 'След. шаги', templateFollowUpLabel: 'Follow-up', translated: 'Переведено',
  },
  calendar: {
    title: 'Доступность',
    save: 'Сохранить',
    subscribeTitle: 'Подписка на календарь',
    subscribeHint: 'Добавьте этот URL в Google Calendar или Apple Calendar чтобы видеть консультации.',
    copy: 'Копировать',
    copied: 'Скопировано',
    vacationTitle: 'Режим отпуска',
    vacationHint: 'Пока активен, бронирование слотов заблокировано.',
    awayUntil: 'До какого числа',
    vacationMessage: 'Сообщение (необязательно)',
    vacationPlaceholder: 'Вернусь 1 июля',
    clear: 'Сбросить',
    exceptionsTitle: 'Исключения (нерабочие дни)',
    exceptionsHint: 'Конкретные даты, когда вы не принимаете консультации.',
    addClosedDay: 'Добавить',
    noExceptions: 'Нет добавленных исключений.',
    closed: 'закрыт',
    custom: 'нестандарт',
    timezone: 'Часовой пояс',
    timezoneHint: 'IANA timezone (например, Europe/Zurich, Asia/Almaty)',
    off: 'Выходной',
    addBlock: 'Добавить блок',
    failed: 'Ошибка',
    meetings: 'Встречи', history: 'История', noMeetings: 'Нет консультаций в этом разделе', manage: 'Открыть все', waiting: 'Комната ожидания', start: 'Начать', chat: 'Чат', pageTitle: 'Расписание', availability: 'Доступность', upcoming: 'Предстоящие',
  },
  clients: {
    title: 'Данные клиента', backToChat: 'Вернуться к чату',
    noAccess: 'Клиент ещё не предоставил доступ к данным.',
    meals: 'Приёмы пищи', labs: 'Результаты анализов', health: 'Профиль здоровья',
    noMeals: 'Нет данных о приёмах пищи.', noLabs: 'Нет результатов анализов.', noHealth: 'Нет данных профиля здоровья.',
    metric: 'Показатель', value: 'Значение', reference: 'Норма', mealLabel: 'Приём пищи',
    name: 'Имя', age: 'Возраст', height: 'Рост', weight: 'Вес', gender: 'Пол', goal: 'Цель',
    dailyCalories: 'Целевая норма калорий', preferences: 'Предпочтения',
    loadFailed: 'Не удалось загрузить данные клиента', ingredient: 'Ингредиент', searchPlaceholder: 'Поиск по имени или email', filter_all: 'Все', filter_code: 'По коду', filter_manual: 'Вручную', emptyState: 'Пока нет клиентов. Поделитесь кодом доступа, чтобы пригласить людей.', noMatches: 'Нет клиентов, соответствующих фильтру.',
  },
  offers: {
    title: 'Услуги', newOffer: 'Новая услуга', edit: 'Редактировать услугу', create: 'Новая услуга',
    empty: 'Пока нет услуг', emptyHint: 'Создайте услугу, чтобы клиенты могли начать с вами консультацию.',
    name: 'Название', nameFor: 'Название ({lang})',
    description: 'Описание', descriptionFor: 'Описание ({lang})',
    nameRequired: 'Пожалуйста, укажите название хотя бы на одном языке.',
    format: 'Формат', duration: 'Длительность (дни, опционально)', durationMinutes: 'Длительность встречи (минуты, опционально)', days: 'дн.', minutes: 'мин',
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
    nutritionist: 'Нутрициолог', dietitian: 'Диетолог', obgyn: 'Акушер-гинеколог', pediatrician: 'Педиатр', gp: 'Врач общей практики', psychologist: 'Психолог', endocrinologist: 'Эндокринолог', other: 'Другое', bio: 'О себе',
    bioPlaceholder: 'Расскажите клиентам о своём опыте и подходе...',
    education: 'Образование', educationPlaceholder: 'например, MSc в нутрициологии, ETH Zurich',
    experienceYears: 'Лет опыта', specializations: 'Специализации', languages: 'Языки',
    videoCalls: 'Видеозвонки',
    videoCallsBody: 'Если выключить, чат останется доступен, но видеокомнаты для консультаций открыть нельзя.',
    videoCallsEnabled: 'Видеоконсультации включены',
    videoCallsDisabled: 'Видеоконсультации выключены',
    profileTools: 'Инструменты профиля',
    profileToolsBody: 'Услуги, отзывы и связь теперь собраны рядом с настройками профиля.',
    manageOffers: 'Управлять услугами',
    manageReviews: 'Отзывы',
    contactSupport: 'Связь',
    credentials: 'Документы',
    credentialsHint: 'Загрузите диплом, сертификат или лицензию. Изображения сжимаются, PDF сохраняются как есть. Максимум 15 МБ. Документы остаются на проверке до одобрения командой EatSense.',
    credentialName: 'Название документа',
    credentialNamePlaceholder: 'Название документа (например, MSc Нутрициология, ETH)',
    characters: 'символов',
    confirmDeleteCredential: 'Удалить этот документ?',
    uploadOnlyImageOrPdf: 'Поддерживаются только изображения и PDF.',
    uploadMaxSize: 'Файл должен быть меньше 15 МБ.',
    credentialNameRequired: 'Сначала укажите название документа.',
    expertCodeTitle: 'Код специалиста',
    expertCodeBody: 'Поделитесь этим приватным кодом с клиентами, которые должны добавить вас напрямую в EatSense.',
    expertCodeUnavailable: 'Профиль должен быть опубликован, прежде чем клиенты смогут использовать этот код.',
    copyCode: 'Скопировать код',
    regenerateCode: 'Сгенерировать заново',
    regenerateCodeConfirm: 'Сгенерировать код заново? Старый код перестанет работать.',
    codeCopied: 'Код скопирован.',
    codeUsage: 'Использований',
    dietsSoonTitle: 'Диеты клиентов',
    dietsSoonBody: 'Скоро вы сможете создавать структурированный план питания и отправлять его клиенту.',
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
    CHAT_CONSULTATION: 'Консультация в чате', VIDEO_CONSULTATION: 'Видеоконсультация', MEAL_PLAN: 'План питания', REPORT_REVIEW: 'Разбор отчёта',
    MONTHLY_SUPPORT: 'Месячное сопровождение', CUSTOM: 'Индивидуальный',
  },
  call: {
    connecting: 'Подключение к видеокомнате…',
    unavailable: 'Видео недоступно',
    tryAgainLater: 'Попробуйте позже.',
    notConfigured: 'Видеозвонки пока не настроены на сервере.',
    reconnecting: 'Переподключение…',
    reconnectingHint: 'Оставьте страницу открытой, пока мы восстанавливаем соединение.',
    inProgress: 'Видеоконсультация идет',
    inProgressHint: 'Нажмите красную кнопку, когда консультацию нужно завершить.',
    end: 'Завершить',
  },
  support: {
    title: 'Связаться с EatSense', subject: 'Вопрос эксперта EatSense', expertSupport: 'Помощь для экспертов', body: 'Напишите нам по вопросам расписания, клиентов, выплат, профиля или технических ошибок.', bodyFull: 'Напишите нам по вопросам расписания, клиентов, выплат, профиля или технических ошибок. Обычно отвечаем в течение одного рабочего дня.',
  },
  earnings: {
    bannerCta: 'Подключите Stripe Connect для автоматических выплат за консультации.', thisMonth: 'Этот месяц', pendingPayout: 'Ожидает выплаты', lifetime: 'За всё время', comingSoon: 'Скоро', body: 'Отчёты по выплатам в бета-режиме. Для точных балансов и переводов смотрите Stripe Connect.', stripeConnected: 'Stripe Connect подключён', payoutsAuto: 'Платежи приходят на ваш счёт автоматически после завершения консультаций.', updateStripe: 'Обновить данные на Stripe', finishSetup: 'Завершите настройку Stripe', finishSetupBody: 'Подтвердите ваши данные в Stripe чтобы начать получать выплаты.', continueStripe: 'Продолжить на Stripe', connectStripeTitle: 'Подключите Stripe для приёма выплат', connectStripeBody: 'Stripe Connect автоматически проводит выплаты, когда клиент оплачивает консультацию.', connectStripeBtn: 'Подключить Stripe', stripeFeeBefore: 'EatSense использует Stripe Connect Express. Onboarding занимает 5–10 минут. Платформа удерживает', paymentsDisabled: 'Платежи временно отключены администратором. Связка со Stripe станет доступна после включения.',
  },
  sidebarMobile: {
    home: 'Обзор', schedule: 'Расписание',
  },
  onboardingTour: {
    skip: 'Пропустить', next: 'Далее', done: 'Готово', closeAria: 'Закрыть',
    slide1Title: 'Ваш код доступа',
    slide1Body: 'Поделитесь этим кодом с клиентами — они вводят его в приложении, чтобы начать консультацию. Скопировать или сгенерировать заново можно в Профиле.',
    slide2Title: 'Задайте доступность',
    slide2Body: 'В разделе «Доступность» отметьте время приёма. Клиенты видят только свободные слоты. Режим отпуска приостанавливает бронирование.',
    slide3Title: 'Цены и услуги',
    slide3Body: 'Создайте офферы 30/60/90 минут с ценами в вашей валюте. Stripe Connect автоматически проводит выплаты (подключите в разделе «Доходы»).',
    slide4Title: 'Чат и заметки',
    slide4Body: 'Каждый разговор живёт в «Чатах». На карточке клиента видны приёмы пищи и анализы, можно вести приватные заметки.',
  },
  consultations: {
    title: 'Консультации', tabAvailability: 'Доступность', tabBookings: 'Встречи', newButton: 'Назначить',
    pickClientAndTime: 'Выберите клиента и время',
    cancelConfirm: 'Отменить консультацию?', completeConfirm: 'Завершить консультацию?', noShowConfirm: 'Отметить как no-show?',
    upcoming: 'Предстоящие', past: 'Прошлые', empty: 'Нет консультаций',
    startBtn: 'Начать', chatBtn: 'Чат', rescheduleBtn: 'Перенести',
    completeBtn: 'Завершить', cancelBtn: 'Отменить', noShowBtn: 'Не пришёл',
    newConsultation: 'Назначить консультацию', client: 'Клиент', when: 'Когда', duration: 'Длительность', modalCancel: 'Отмена', modalCreate: 'Создать', modalSend: 'Отправить', rescheduleTitle: 'Перенести консультацию', rescheduleBody: 'Выберите новое время для предложения клиенту.', newTime: 'Новое время', accept: 'Принять', decline: 'Отклонить', youProposed: 'Вы предложили перенос на:', clientProposed: 'Клиент предложил перенос на:',
  },
};

const kk: MessagesShape = {
  nav: { dashboard: 'Шолу', chats: 'Чаттар', clients: 'Клиенттер', calendar: 'Күнтізбе', consultations: 'Кездесулер', offers: 'Қызметтер', earnings: 'Төлемдер', reviews: 'Пікірлер', profile: 'Менің профилім', signOut: 'Шығу' },
  common: {
    save: 'Сақтау', saving: 'Сақталуда...', saved: 'Сақталды!', cancel: 'Бас тарту', delete: 'Жою', deleting: 'Жойылуда...',
    edit: 'Өзгерту', create: 'Жасау', creating: 'Жасалуда...', loading: 'Жүктелуде...', upload: 'Жүктеу', uploading: 'Жүктелуде...',
    view: 'Қарау', back: 'Артқа', close: 'Жабу', yes: 'Иә', no: 'Жоқ', confirm: 'Растау', error: 'Қате', retry: 'Қайталау',
    pending: 'Тексеруде', approved: 'Мақұлданды', rejected: 'Қабылданбады', hidden: 'Жасырулы', visible: 'Көрінеді',
    published: 'Жарияланды', draft: 'Жоба', optional: 'міндетті емес', language: 'Тіл',
    saveFailed: 'Сақтау мүмкін болмады. Қайта көріңіз.',
    deleteFailed: 'Жою мүмкін болмады. Қайта көріңіз.',
    uploadFailed: 'Жүктеу мүмкін болмады. Қайта көріңіз.',
    openFailed: 'Құжатты ашу мүмкін болмады. Қайта көріңіз.',
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
    scheduleBtn: 'Кесте', contactBtn: 'Хабарласу', liveNow: 'Қазір өтуде', shouldHaveStarted: 'Басталуы керек еді', nextConsultation: 'Жақын консультация', startBtn: 'Бастау', viewAll: 'Барлығы', minutesShort: 'мин', hoursShort: 'сағ', minShort: 'мин',
  },
  chats: {
    title: 'Чаттар', empty: 'Әзірге сұхбаттар жоқ', noMessages: 'Әзірге хабарламалар жоқ',
    photo: 'Фото', sharedMeals: 'Тамақтармен бөлісті', sharedReport: 'Есеппен бөлісті', yesterday: 'Кеше',
    typeMessage: 'Хабарлама жазыңыз...', send: 'Жіберу', markComplete: 'Аяқталды деп белгілеу', reopen: 'Қайта ашу',
    complete: 'Аяқталды', cancelled: 'Бас тартылды', confirmComplete: 'Осы кеңесті аяқталды деп белгілеу керек пе?',
    completeBtn: 'Аяқтау', viewData: 'Деректерді көру', requestData: 'Рұқсат сұрау', startVideo: 'Видеоқоңырау', awaitingPayment: 'Төлемді күтуде',
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
    templateTypicalDayLabel: 'Әдеттегі күн', templateNextStepsLabel: 'Келесі қадамдар', templateFollowUpLabel: 'Follow-up', translated: 'Аударылды',
  },
  calendar: {
    title: 'Қолжетімділік',
    save: 'Сақтау',
    subscribeTitle: 'Күнтізбеге жазылу',
    subscribeHint: 'Кеңестерді көру үшін бұл URL-ді Google Calendar немесе Apple Calendar-ға қосыңыз.',
    copy: 'Көшіру',
    copied: 'Көшірілді',
    vacationTitle: 'Демалыс режимі',
    vacationHint: 'Белсенді болған кезде жаңа жазылулар бұғатталады.',
    awayUntil: 'Қайтсам дейін',
    vacationMessage: 'Хабар (міндетті емес)',
    vacationPlaceholder: '1 шілдеде қайтамын',
    clear: 'Тазалау',
    exceptionsTitle: 'Ерекшеліктер (жұмыс емес күндер)',
    exceptionsHint: 'Кеңес қабылдамайтын нақты күндер.',
    addClosedDay: 'Қосу',
    noExceptions: 'Қосылған ерекшеліктер жоқ.',
    closed: 'жабық',
    custom: 'арнайы',
    timezone: 'Уақыт белдеуі',
    timezoneHint: 'IANA уақыт белдеуі (мысалы, Asia/Almaty, Europe/Zurich)',
    off: 'Демалыс',
    addBlock: 'Блок қосу',
    failed: 'Қате',
    meetings: 'Кездесулер', history: 'Тарих', noMeetings: 'Бұл бөлімде консультациялар жоқ', manage: 'Барлығын ашу', waiting: 'Күту бөлмесі', start: 'Бастау', chat: 'Чат', pageTitle: 'Кесте', availability: 'Қол жетімділік', upcoming: 'Алдағы',
  },
  clients: {
    title: 'Клиент деректері', backToChat: 'Чатқа оралу',
    noAccess: 'Клиент әлі деректерге рұқсат бермеген болуы мүмкін.',
    meals: 'Тамақтар', labs: 'Талдау нәтижелері', health: 'Денсаулық профилі',
    noMeals: 'Тамақ деректері жоқ.', noLabs: 'Талдау нәтижелері жоқ.', noHealth: 'Денсаулық профилі деректері жоқ.',
    metric: 'Көрсеткіш', value: 'Мән', reference: 'Норма', mealLabel: 'Тамақ',
    name: 'Аты', age: 'Жасы', height: 'Бойы', weight: 'Салмағы', gender: 'Жынысы', goal: 'Мақсаты',
    dailyCalories: 'Күнделікті калория мақсаты', preferences: 'Қалаулар',
    loadFailed: 'Клиент деректерін жүктеу мүмкін болмады', ingredient: 'Ингредиент', searchPlaceholder: 'Аты немесе email бойынша іздеу', filter_all: 'Барлығы', filter_code: 'Код бойынша', filter_manual: 'Қолмен', emptyState: 'Әзірге клиент жоқ. Адамдарды шақыру үшін кодыңызбен бөлісіңіз.', noMatches: 'Сүзгіге сәйкес клиент жоқ.',
  },
  offers: {
    title: 'Қызметтер', newOffer: 'Жаңа қызмет', edit: 'Қызметті өзгерту', create: 'Жаңа қызмет',
    empty: 'Әзірге қызметтер жоқ', emptyHint: 'Клиенттер сізбен кеңес бастай алатындай бір қызмет жасаңыз.',
    name: 'Атауы', nameFor: 'Атауы ({lang})',
    description: 'Сипаттамасы', descriptionFor: 'Сипаттамасы ({lang})',
    nameRequired: 'Кемінде бір тілде атау көрсетіңіз.',
    format: 'Формат', duration: 'Ұзақтығы (күн, міндетті емес)', durationMinutes: 'Сессия ұзақтығы (минут, міндетті емес)', days: 'күн', minutes: 'мин',
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
    nutritionist: 'Нутрициолог', dietitian: 'Диетолог', obgyn: 'Акушер-гинеколог', pediatrician: 'Педиатр', gp: 'Жалпы практика дәрігері', psychologist: 'Психолог', endocrinologist: 'Эндокринолог', other: 'Басқа', bio: 'Өзі туралы',
    bioPlaceholder: 'Клиенттерге тәжірибеңіз бен тәсіліңіз туралы айтыңыз...',
    education: 'Білімі', educationPlaceholder: 'мысалы, MSc нутрициология, ETH Zurich',
    experienceYears: 'Тәжірибе жылдары', specializations: 'Мамандықтар', languages: 'Тілдер',
    videoCalls: 'Бейнеқоңыраулар',
    videoCallsBody: 'Өшірілген кезде чат қолжетімді болады, бірақ кеңестер үшін бейне бөлмелер ашылмайды.',
    videoCallsEnabled: 'Бейне кеңестер қосулы',
    videoCallsDisabled: 'Бейне кеңестер өшірулі',
    profileTools: 'Профиль құралдары',
    profileToolsBody: 'Қызметтер, пікірлер және қолдау профиль баптауларында жиналды.',
    manageOffers: 'Қызметтерді басқару',
    manageReviews: 'Пікірлер',
    contactSupport: 'Қолдау',
    credentials: 'Құжаттар',
    credentialsHint: 'Диплом, сертификат немесе лицензия жүктеңіз. Суреттер қысылады, PDF файлдары сол күйінде сақталады. Максимум 15 МБ. Құжаттар EatSense командасы мақұлдағанша тексеруде тұрады.',
    credentialName: 'Құжат атауы',
    credentialNamePlaceholder: 'Құжат атауы (мысалы, MSc Нутрициология, ETH)',
    characters: 'таңба',
    confirmDeleteCredential: 'Осы құжатты жою керек пе?',
    uploadOnlyImageOrPdf: 'Тек суреттер мен PDF қолданылады.',
    uploadMaxSize: 'Файл 15 МБ-дан кіші болуы керек.',
    credentialNameRequired: 'Алдымен құжат атауын енгізіңіз.',
    expertCodeTitle: 'Маман коды',
    expertCodeBody: 'EatSense ішінде сізді тікелей қосуы керек клиенттермен осы жеке кодты бөлісіңіз.',
    expertCodeUnavailable: 'Клиенттер бұл кодты қолдануы үшін профиліңіз жарияланған болуы керек.',
    copyCode: 'Кодты көшіру',
    regenerateCode: 'Қайта жасау',
    regenerateCodeConfirm: 'Кодты қайта жасау керек пе? Ескі код жұмысын тоқтатады.',
    codeCopied: 'Код көшірілді.',
    codeUsage: 'Қолданулар',
    dietsSoonTitle: 'Клиент диеталары',
    dietsSoonBody: 'Жақында сіз құрылымдалған тамақтану жоспарын жасап, оны клиентке жібере аласыз.',
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
    CHAT_CONSULTATION: 'Чат арқылы кеңес', VIDEO_CONSULTATION: 'Видео кеңес', MEAL_PLAN: 'Тамақтану жоспары', REPORT_REVIEW: 'Есеп талдау',
    MONTHLY_SUPPORT: 'Айлық қолдау', CUSTOM: 'Жеке',
  },
  call: {
    connecting: 'Бейне бөлмесіне қосылу…',
    unavailable: 'Видео қол жетімді емес',
    tryAgainLater: 'Кейінірек қайталап көріңіз.',
    notConfigured: 'Видеоқоңыраулар серверде әлі реттелмеген.',
    reconnecting: 'Қайта қосылуда…',
    reconnectingHint: 'Байланыс қалпына келгенше бетті ашық қалдырыңыз.',
    inProgress: 'Видео кеңес жүріп жатыр',
    inProgressHint: 'Кеңесті аяқтау үшін қызыл батырманы басыңыз.',
    end: 'Аяқтау',
  },
  support: {
    title: 'EatSense-пен байланысу', subject: 'EatSense сарапшысының сұрағы', expertSupport: 'Сарапшыларға көмек', body: 'Кесте, клиенттер, төлемдер, профиль немесе техникалық мәселелер бойынша хат жазыңыз.', bodyFull: 'Кесте, клиенттер, төлемдер, профиль немесе техникалық мәселелер бойынша жазыңыз. Әдетте бір жұмыс күні ішінде жауап береміз.',
  },
  earnings: {
    bannerCta: 'Консультациялар үшін автоматты төлемдер алу үшін Stripe Connect-ке қосылыңыз.', thisMonth: 'Осы ай', pendingPayout: 'Күтудегі төлем', lifetime: 'Барлық уақытта', comingSoon: 'Жақын арада', body: 'Кірістер есебі бета-режимінде. Нақты балансты Stripe Connect-те қараңыз.', stripeConnected: 'Stripe Connect қосылған', payoutsAuto: 'Консультациялар аяқталғаннан кейін төлемдер автоматты түрде келеді.', updateStripe: 'Stripe-тегі деректерді жаңарту', finishSetup: 'Stripe орнатуын аяқтаңыз', finishSetupBody: 'Төлемдер үшін Stripe-те деректерді растаңыз.', continueStripe: 'Stripe-те жалғастыру', connectStripeTitle: 'Төлем алу үшін Stripe-ке қосылыңыз', connectStripeBody: 'Клиент консультацияны төлегенде Stripe Connect төлемдерді автоматты түрде өңдейді.', connectStripeBtn: 'Stripe-ке қосылу', stripeFeeBefore: 'EatSense Stripe Connect Express пайдаланады. Орнату 5–10 минут алады. Платформа комиссиясы', paymentsDisabled: 'Төлемдер әкімші тарапынан уақытша өшірілген. Қосылған соң Stripe қол жетімді болады.',
  },
  sidebarMobile: {
    home: 'Басты', schedule: 'Кесте',
  },
  onboardingTour: {
    skip: 'Өткізіп жіберу', next: 'Әрі қарай', done: 'Дайын', closeAria: 'Жабу',
    slide1Title: 'Сіздің кіру кодыңыз',
    slide1Body: 'Бұл кодты клиенттермен бөлісіңіз — олар сізбен консультация бастау үшін мобильді қосымшаға енгізеді. Профильде көшіруге немесе қайта жасауға болады.',
    slide2Title: 'Қол жетімділікті орнатыңыз',
    slide2Body: 'Қол жетімділік бөлімінде консультация қабылдайтын уақытыңызды белгілеңіз. Клиенттер тек бос уақытты көреді. Демалыс режимі брондауларды тоқтатады.',
    slide3Title: 'Бағалар мен қызметтер',
    slide3Body: '30/60/90 мин ұсыныстарын жергілікті валютада қосыңыз. Stripe Connect төлемдерді автоматты түрде жасайды (Кірістерде орнатыңыз).',
    slide4Title: 'Чат пен жазбалар',
    slide4Body: 'Әрбір клиент әңгімесі Чаттарда. Клиент картасын ашып тағамдар мен талдауларды көріп, тек өзіңізге көрінетін жеке жазбалар қоса аласыз.',
  },
  consultations: {
    title: 'Консультациялар', tabAvailability: 'Қол жетімділік', tabBookings: 'Кездесулер', newButton: 'Тағайындау',
    pickClientAndTime: 'Клиент пен уақытты таңдаңыз',
    cancelConfirm: 'Консультацияны болдырмау керек пе?', completeConfirm: 'Консультацияны аяқтау керек пе?', noShowConfirm: 'Келмеген деп белгілеу керек пе?',
    upcoming: 'Алдағы', past: 'Өткен', empty: 'Консультациялар жоқ',
    startBtn: 'Бастау', chatBtn: 'Чат', rescheduleBtn: 'Ауыстыру',
    completeBtn: 'Аяқтау', cancelBtn: 'Болдырмау', noShowBtn: 'Келмеді',
    newConsultation: 'Консультация тағайындау', client: 'Клиент', when: 'Қашан', duration: 'Ұзақтығы', modalCancel: 'Болдырмау', modalCreate: 'Жасау', modalSend: 'Жіберу', rescheduleTitle: 'Консультацияны ауыстыру', rescheduleBody: 'Клиентке ұсыну үшін жаңа уақытты таңдаңыз.', newTime: 'Жаңа уақыт', accept: 'Қабылдау', decline: 'Қабылдамау', youProposed: 'Сіз ауыстыруды ұсындыңыз:', clientProposed: 'Клиент ауыстыруды ұсынды:',
  },
};

const de: MessagesShape = {
  nav: { dashboard: 'Übersicht', chats: 'Chats', clients: 'Klienten', calendar: 'Kalender', consultations: 'Termine', offers: 'Angebote', earnings: 'Einnahmen', reviews: 'Bewertungen', profile: 'Mein Profil', signOut: 'Abmelden' },
  common: {
    save: 'Änderungen speichern', saving: 'Speichern...', saved: 'Gespeichert!', cancel: 'Abbrechen', delete: 'Löschen', deleting: 'Löschen...',
    edit: 'Bearbeiten', create: 'Erstellen', creating: 'Erstellen...', loading: 'Laden...', upload: 'Hochladen', uploading: 'Hochladen...',
    view: 'Ansehen', back: 'Zurück', close: 'Schließen', yes: 'Ja', no: 'Nein', confirm: 'Bestätigen', error: 'Fehler', retry: 'Erneut versuchen',
    pending: 'Ausstehend', approved: 'Genehmigt', rejected: 'Abgelehnt', hidden: 'Verborgen', visible: 'Sichtbar',
    published: 'Veröffentlicht', draft: 'Entwurf', optional: 'optional', language: 'Sprache',
    saveFailed: 'Speichern fehlgeschlagen. Bitte erneut versuchen.',
    deleteFailed: 'Löschen fehlgeschlagen. Bitte erneut versuchen.',
    uploadFailed: 'Hochladen fehlgeschlagen. Bitte erneut versuchen.',
    openFailed: 'Dokument konnte nicht geöffnet werden. Bitte erneut versuchen.',
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
    scheduleBtn: 'Zeitplan', contactBtn: 'Kontakt', liveNow: 'Läuft jetzt', shouldHaveStarted: 'Hätte beginnen sollen', nextConsultation: 'Nächste Beratung', startBtn: 'Starten', viewAll: 'Alle ansehen', minutesShort: 'Min.', hoursShort: 'Std.', minShort: 'm',
  },
  chats: {
    title: 'Chats', empty: 'Noch keine Konversationen', noMessages: 'Noch keine Nachrichten',
    photo: 'Foto', sharedMeals: 'Geteilte Mahlzeiten', sharedReport: 'Geteilter Bericht', yesterday: 'Gestern',
    typeMessage: 'Nachricht eingeben...', send: 'Senden', markComplete: 'Als abgeschlossen markieren', reopen: 'Wieder öffnen',
    complete: 'Abgeschlossen', cancelled: 'Abgebrochen', confirmComplete: 'Diese Konsultation als abgeschlossen markieren?',
    completeBtn: 'Abschließen', viewData: 'Daten ansehen', requestData: 'Daten anfordern', startVideo: 'Videoanruf', awaitingPayment: 'Zahlung ausstehend',
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
    templateTypicalDayLabel: 'Typischer Tag', templateNextStepsLabel: 'Nächste Schritte', templateFollowUpLabel: 'Follow-up', translated: 'Übersetzt',
  },
  calendar: {
    title: 'Verfügbarkeit',
    save: 'Speichern',
    subscribeTitle: 'Kalender abonnieren',
    subscribeHint: 'Fügen Sie diese URL zu Google Calendar oder Apple Calendar hinzu, um Termine zu sehen.',
    copy: 'Kopieren',
    copied: 'Kopiert',
    vacationTitle: 'Abwesend',
    vacationHint: 'Während aktiv, sind neue Buchungen blockiert.',
    awayUntil: 'Abwesend bis',
    vacationMessage: 'Nachricht (optional)',
    vacationPlaceholder: 'Zurück am 1. Juli',
    clear: 'Zurücksetzen',
    exceptionsTitle: 'Ausnahmen (geschlossene Tage)',
    exceptionsHint: 'Bestimmte Daten, an denen Sie keine Beratungen annehmen.',
    addClosedDay: 'Hinzufügen',
    noExceptions: 'Keine Ausnahmen hinzugefügt.',
    closed: 'geschlossen',
    custom: 'individuell',
    timezone: 'Zeitzone',
    timezoneHint: 'IANA-Zeitzone (z. B. Europe/Zurich, Asia/Almaty)',
    off: 'Frei',
    addBlock: 'Block hinzufügen',
    failed: 'Fehler',
    meetings: 'Termine', history: 'Verlauf', noMeetings: 'Keine Beratungen in diesem Abschnitt', manage: 'Alle öffnen', waiting: 'Warteraum', start: 'Starten', chat: 'Chat', pageTitle: 'Zeitplan', availability: 'Verfügbarkeit', upcoming: 'Bevorstehend',
  },
  clients: {
    title: 'Kundendaten', backToChat: 'Zurück zum Chat',
    noAccess: 'Der Kunde hat möglicherweise noch keinen Datenzugriff gewährt.',
    meals: 'Mahlzeiten', labs: 'Laborergebnisse', health: 'Gesundheitsprofil',
    noMeals: 'Keine Mahlzeitendaten verfügbar.', noLabs: 'Keine Laborergebnisse verfügbar.', noHealth: 'Keine Gesundheitsprofildaten verfügbar.',
    metric: 'Kennzahl', value: 'Wert', reference: 'Referenz', mealLabel: 'Mahlzeit',
    name: 'Name', age: 'Alter', height: 'Größe', weight: 'Gewicht', gender: 'Geschlecht', goal: 'Ziel',
    dailyCalories: 'Tägliches Kalorienziel', preferences: 'Vorlieben',
    loadFailed: 'Kundendaten konnten nicht geladen werden', ingredient: 'Zutat', searchPlaceholder: 'Nach Name oder E-Mail suchen', filter_all: 'Alle', filter_code: 'Per Code', filter_manual: 'Manuell', emptyState: 'Noch keine Klienten. Teilen Sie Ihren Zugangscode, um Personen einzuladen.', noMatches: 'Keine Klienten entsprechen den Filtern.',
  },
  offers: {
    title: 'Angebote', newOffer: 'Neues Angebot', edit: 'Angebot bearbeiten', create: 'Neues Angebot',
    empty: 'Noch keine Angebote', emptyHint: 'Erstellen Sie eines, damit Kunden eine Beratung mit Ihnen starten können.',
    name: 'Name', nameFor: 'Name ({lang})',
    description: 'Beschreibung', descriptionFor: 'Beschreibung ({lang})',
    nameRequired: 'Bitte geben Sie einen Namen in mindestens einer Sprache an.',
    format: 'Format', duration: 'Dauer (Tage, optional)', durationMinutes: 'Sitzungsdauer (Minuten, optional)', days: 'Tage', minutes: 'Min.',
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
    nutritionist: 'Ernährungsberater', dietitian: 'Diätassistent', obgyn: 'Gynäkologe', pediatrician: 'Kinderarzt', gp: 'Hausarzt', psychologist: 'Psychologe', endocrinologist: 'Endokrinologe', other: 'Andere', bio: 'Biografie',
    bioPlaceholder: 'Erzählen Sie Kunden von Ihrer Expertise und Ihrem Ansatz...',
    education: 'Ausbildung', educationPlaceholder: 'z.B. MSc Ernährungswissenschaft, ETH Zürich',
    experienceYears: 'Jahre Erfahrung', specializations: 'Spezialisierungen', languages: 'Sprachen',
    videoCalls: 'Videoanrufe',
    videoCallsBody: 'Wenn deaktiviert, bleibt der Chat verfügbar, aber Videoräume für Beratungen können nicht geöffnet werden.',
    videoCallsEnabled: 'Videoberatungen aktiviert',
    videoCallsDisabled: 'Videoberatungen deaktiviert',
    profileTools: 'Profilwerkzeuge',
    profileToolsBody: 'Angebote, Bewertungen und Support sind jetzt bei den Profileinstellungen.',
    manageOffers: 'Angebote verwalten',
    manageReviews: 'Bewertungen',
    contactSupport: 'Support',
    credentials: 'Qualifikationen',
    credentialsHint: 'Laden Sie ein Diplom, Zertifikat oder eine Lizenz hoch. Bilder werden komprimiert, PDFs unverändert gespeichert. Max. 15 MB. Qualifikationen bleiben ausstehend, bis das EatSense-Team sie genehmigt.',
    credentialName: 'Name der Qualifikation',
    credentialNamePlaceholder: 'Name der Qualifikation (z.B. MSc Ernährung, ETH)',
    characters: 'Zeichen',
    confirmDeleteCredential: 'Diese Qualifikation löschen?',
    uploadOnlyImageOrPdf: 'Nur Bilder und PDFs werden unterstützt.',
    uploadMaxSize: 'Die Datei muss kleiner als 15 MB sein.',
    credentialNameRequired: 'Bitte geben Sie zuerst einen Namen ein.',
    expertCodeTitle: 'Spezialistencode',
    expertCodeBody: 'Teilen Sie diesen privaten Code mit Kunden, die Sie direkt in EatSense hinzufügen sollen.',
    expertCodeUnavailable: 'Ihr Profil muss veröffentlicht sein, bevor Kunden diesen Code verwenden können.',
    copyCode: 'Code kopieren',
    regenerateCode: 'Neu generieren',
    regenerateCodeConfirm: 'Diesen Code neu generieren? Der alte Code funktioniert danach nicht mehr.',
    codeCopied: 'Code kopiert.',
    codeUsage: 'Nutzungen',
    dietsSoonTitle: 'Kundendiäten',
    dietsSoonBody: 'Bald können Sie einen strukturierten Ernährungsplan erstellen und an einen Kunden senden.',
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
    CHAT_CONSULTATION: 'Chat-Beratung', VIDEO_CONSULTATION: 'Video-Beratung', MEAL_PLAN: 'Ernährungsplan', REPORT_REVIEW: 'Bericht-Analyse',
    MONTHLY_SUPPORT: 'Monatliche Betreuung', CUSTOM: 'Individuell',
  },
  call: {
    connecting: 'Verbindung zum Videoraum…',
    unavailable: 'Video nicht verfügbar',
    tryAgainLater: 'Versuchen Sie es später erneut.',
    notConfigured: 'Videoanrufe sind auf dem Server noch nicht konfiguriert.',
    reconnecting: 'Verbindung wird wiederhergestellt…',
    reconnectingHint: 'Lassen Sie diese Seite geöffnet, während die Verbindung wiederhergestellt wird.',
    inProgress: 'Video-Beratung läuft',
    inProgressHint: 'Nutzen Sie die rote Schaltfläche, wenn Sie den Anruf beenden möchten.',
    end: 'Beenden',
  },
  support: {
    title: 'EatSense kontaktieren', subject: 'EatSense Experten-Support', expertSupport: 'Experten-Support', body: 'Schreiben Sie uns zu Zeitplan, Klienten, Auszahlungen, Profil oder technischen Problemen.', bodyFull: 'Schreiben Sie uns zu Zeitplan, Klienten, Auszahlungen, Profil oder technischen Problemen. Wir antworten in der Regel innerhalb eines Werktags.',
  },
  earnings: {
    bannerCta: 'Verbinden Sie Stripe Connect für automatische Beratungs-Auszahlungen.', thisMonth: 'Diesen Monat', pendingPayout: 'Ausstehende Auszahlung', lifetime: 'Gesamt', comingSoon: 'Demnächst', body: 'Einnahmen-Reporting ist in der Beta. Für genaue Salden und Überweisungen siehe Stripe Connect.', stripeConnected: 'Stripe Connect verbunden', payoutsAuto: 'Auszahlungen erscheinen nach Abschluss der Beratungen auf Ihrem Konto.', updateStripe: 'Bei Stripe aktualisieren', finishSetup: 'Stripe-Einrichtung abschließen', finishSetupBody: 'Bestätigen Sie Ihre Daten bei Stripe, um Auszahlungen zu erhalten.', continueStripe: 'Bei Stripe fortsetzen', connectStripeTitle: 'Stripe verbinden, um Auszahlungen zu erhalten', connectStripeBody: 'Stripe Connect verarbeitet Auszahlungen automatisch, wenn Klienten zahlen.', connectStripeBtn: 'Stripe verbinden', stripeFeeBefore: 'EatSense verwendet Stripe Connect Express. Onboarding dauert 5–10 Minuten. Die Plattform-Gebühr beträgt', paymentsDisabled: 'Zahlungen sind vom Admin vorübergehend deaktiviert. Stripe-Verknüpfung wird nach Aktivierung verfügbar.',
  },
  sidebarMobile: {
    home: 'Start', schedule: 'Zeitplan',
  },
  onboardingTour: {
    skip: 'Überspringen', next: 'Weiter', done: 'Verstanden', closeAria: 'Schließen',
    slide1Title: 'Ihr Zugangscode',
    slide1Body: 'Teilen Sie diesen Code mit Klienten — sie geben ihn in der Mobile-App ein, um eine Beratung mit Ihnen zu starten. Im Profil kopieren oder neu generieren.',
    slide2Title: 'Verfügbarkeit festlegen',
    slide2Body: 'Öffnen Sie „Verfügbarkeit" und markieren Sie, wann Sie Beratungen annehmen. Klienten sehen nur freie Slots. Abwesenheitsmodus pausiert Buchungen.',
    slide3Title: 'Preise & Angebote',
    slide3Body: 'Fügen Sie 30/60/90-Minuten-Angebote mit Preisen in Ihrer Währung hinzu. Stripe Connect übernimmt Auszahlungen automatisch (in „Einnahmen" einrichten).',
    slide4Title: 'Chat & Notizen',
    slide4Body: 'Jedes Klientengespräch lebt in Chats. Öffnen Sie eine Klientenkarte für Mahlzeiten, Laborergebnisse und private Notizen — nur für Sie sichtbar.',
  },
  consultations: {
    title: 'Beratungen', tabAvailability: 'Verfügbarkeit', tabBookings: 'Termine', newButton: 'Neu',
    pickClientAndTime: 'Klient und Zeit auswählen',
    cancelConfirm: 'Beratung absagen?', completeConfirm: 'Beratung abschließen?', noShowConfirm: 'Als „nicht erschienen" markieren?',
    upcoming: 'Bevorstehend', past: 'Vergangen', empty: 'Keine Beratungen',
    startBtn: 'Starten', chatBtn: 'Chat', rescheduleBtn: 'Verschieben',
    completeBtn: 'Abschließen', cancelBtn: 'Absagen', noShowBtn: 'Nicht erschienen',
    newConsultation: 'Neue Beratung', client: 'Klient', when: 'Wann', duration: 'Dauer', modalCancel: 'Abbrechen', modalCreate: 'Erstellen', modalSend: 'Senden', rescheduleTitle: 'Verschieben', rescheduleBody: 'Wählen Sie eine neue Zeit zur Vorlage beim Klienten.', newTime: 'Neue Zeit', accept: 'Annehmen', decline: 'Ablehnen', youProposed: 'Sie haben verschoben auf:', clientProposed: 'Klient hat verschoben auf:',
  },
};

const fr: MessagesShape = {
  nav: { dashboard: 'Tableau de bord', chats: 'Messages', clients: 'Clients', calendar: 'Calendrier', consultations: 'Rendez-vous', offers: 'Offres', earnings: 'Revenus', reviews: 'Avis', profile: 'Mon Profil', signOut: 'Se déconnecter' },
  common: {
    save: 'Enregistrer', saving: 'Enregistrement...', saved: 'Enregistré !', cancel: 'Annuler', delete: 'Supprimer', deleting: 'Suppression...',
    edit: 'Modifier', create: 'Créer', creating: 'Création...', loading: 'Chargement...', upload: 'Téléverser', uploading: 'Téléversement...',
    view: 'Voir', back: 'Retour', close: 'Fermer', yes: 'Oui', no: 'Non', confirm: 'Confirmer', error: 'Erreur', retry: 'Réessayer',
    pending: 'En attente', approved: 'Approuvé', rejected: 'Rejeté', hidden: 'Caché', visible: 'Visible',
    published: 'Publié', draft: 'Brouillon', optional: 'facultatif', language: 'Langue',
    saveFailed: 'Échec de l\'enregistrement. Veuillez réessayer.',
    deleteFailed: 'Échec de la suppression. Veuillez réessayer.',
    uploadFailed: 'Échec du téléversement. Veuillez réessayer.',
    openFailed: 'Impossible d’ouvrir le document. Veuillez réessayer.',
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
    scheduleBtn: 'Planning', contactBtn: 'Contact', liveNow: 'En cours', shouldHaveStarted: 'Aurait dû commencer', nextConsultation: 'Prochaine consultation', startBtn: 'Démarrer', viewAll: 'Voir tout', minutesShort: 'min', hoursShort: 'h', minShort: 'm',
  },
  chats: {
    title: 'Messages', empty: 'Aucune conversation pour le moment', noMessages: 'Aucun message pour le moment',
    photo: 'Photo', sharedMeals: 'Repas partagés', sharedReport: 'Rapport partagé', yesterday: 'Hier',
    typeMessage: 'Tapez un message...', send: 'Envoyer', markComplete: 'Marquer comme terminé', reopen: 'Rouvrir',
    complete: 'Terminée', cancelled: 'Annulée', confirmComplete: 'Marquer cette consultation comme terminée ?',
    completeBtn: 'Terminer', viewData: 'Voir les données', requestData: 'Demander l\'accès', startVideo: 'Appel vidéo', awaitingPayment: 'En attente de paiement',
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
    templateTypicalDayLabel: 'Journée type', templateNextStepsLabel: 'Étapes suivantes', templateFollowUpLabel: 'Suivi', translated: 'Traduit',
  },
  calendar: {
    title: 'Disponibilité',
    save: 'Enregistrer',
    subscribeTitle: 'S\'abonner au calendrier',
    subscribeHint: 'Ajoutez cette URL à Google Calendar ou Apple Calendar pour voir les consultations.',
    copy: 'Copier',
    copied: 'Copié',
    vacationTitle: 'Absent du bureau',
    vacationHint: 'Lorsqu\'il est actif, les nouvelles réservations sont bloquées.',
    awayUntil: 'Absent jusqu\'au',
    vacationMessage: 'Message (facultatif)',
    vacationPlaceholder: 'De retour le 1er juillet',
    clear: 'Effacer',
    exceptionsTitle: 'Exceptions (jours fermés)',
    exceptionsHint: 'Dates spécifiques où vous n\'acceptez pas de consultations.',
    addClosedDay: 'Ajouter',
    noExceptions: 'Aucune exception ajoutée.',
    closed: 'fermé',
    custom: 'personnalisé',
    timezone: 'Fuseau horaire',
    timezoneHint: 'Fuseau horaire IANA (par ex. Europe/Zurich, Asia/Almaty)',
    off: 'Repos',
    addBlock: 'Ajouter un bloc',
    failed: 'Échec',
    meetings: 'Réunions', history: 'Historique', noMeetings: 'Aucune consultation dans cette section', manage: 'Tout ouvrir', waiting: 'Salle d\'attente', start: 'Démarrer', chat: 'Chat', pageTitle: 'Planning', availability: 'Disponibilité', upcoming: 'À venir',
  },
  clients: {
    title: 'Données du client', backToChat: 'Retour au chat',
    noAccess: 'Le client n\'a peut-être pas encore accordé l\'accès aux données.',
    meals: 'Repas', labs: 'Résultats d\'analyse', health: 'Profil de santé',
    noMeals: 'Aucune donnée de repas disponible.', noLabs: 'Aucun résultat d\'analyse disponible.', noHealth: 'Aucune donnée de profil de santé disponible.',
    metric: 'Paramètre', value: 'Valeur', reference: 'Référence', mealLabel: 'Repas',
    name: 'Nom', age: 'Âge', height: 'Taille', weight: 'Poids', gender: 'Sexe', goal: 'Objectif',
    dailyCalories: 'Objectif calorique journalier', preferences: 'Préférences',
    loadFailed: 'Échec du chargement des données client', ingredient: 'Ingrédient', searchPlaceholder: 'Rechercher par nom ou e-mail', filter_all: 'Tous', filter_code: 'Par code', filter_manual: 'Manuel', emptyState: "Aucun client pour le moment. Partagez votre code d'accès pour inviter des personnes.", noMatches: 'Aucun client ne correspond aux filtres.',
  },
  offers: {
    title: 'Offres', newOffer: 'Nouvelle offre', edit: 'Modifier l\'offre', create: 'Nouvelle offre',
    empty: 'Aucune offre pour le moment', emptyHint: 'Créez-en une pour que les clients puissent démarrer une consultation.',
    name: 'Nom', nameFor: 'Nom ({lang})',
    description: 'Description', descriptionFor: 'Description ({lang})',
    nameRequired: 'Veuillez fournir un nom dans au moins une langue.',
    format: 'Format', duration: 'Durée (jours, facultatif)', durationMinutes: 'Durée de session (minutes, facultatif)', days: 'jours', minutes: 'min',
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
    nutritionist: 'Nutritionniste', dietitian: 'Diététicien', obgyn: 'Gynécologue-obstétricien', pediatrician: 'Pédiatre', gp: 'Médecin généraliste', psychologist: 'Psychologue', endocrinologist: 'Endocrinologue', other: 'Autre', bio: 'Biographie',
    bioPlaceholder: 'Parlez aux clients de votre expertise et de votre approche...',
    education: 'Formation', educationPlaceholder: 'ex. MSc en sciences de la nutrition, EPF Zurich',
    experienceYears: 'Années d\'expérience', specializations: 'Spécialisations', languages: 'Langues',
    videoCalls: 'Appels vidéo',
    videoCallsBody: 'Si désactivé, le chat reste disponible, mais les salles vidéo des consultations ne peuvent pas être ouvertes.',
    videoCallsEnabled: 'Consultations vidéo activées',
    videoCallsDisabled: 'Consultations vidéo désactivées',
    profileTools: 'Outils du profil',
    profileToolsBody: 'Les offres, avis et le support sont maintenant regroupés avec les paramètres du profil.',
    manageOffers: 'Gérer les offres',
    manageReviews: 'Avis',
    contactSupport: 'Support',
    credentials: 'Diplômes',
    credentialsHint: 'Téléversez un diplôme, une certification ou une licence. Les images sont compressées, les PDF conservés tels quels. Max 15 Mo. Les diplômes restent en attente jusqu\'à approbation par l\'équipe EatSense.',
    credentialName: 'Nom du diplôme',
    credentialNamePlaceholder: 'Nom du diplôme (ex. MSc Nutrition, EPF)',
    characters: 'caractères',
    confirmDeleteCredential: 'Supprimer ce diplôme ?',
    uploadOnlyImageOrPdf: 'Seules les images et les PDF sont pris en charge.',
    uploadMaxSize: 'Le fichier doit faire moins de 15 Mo.',
    credentialNameRequired: 'Veuillez d\'abord saisir un nom.',
    expertCodeTitle: 'Code spécialiste',
    expertCodeBody: 'Partagez ce code privé avec les clients qui doivent vous ajouter directement dans EatSense.',
    expertCodeUnavailable: 'Votre profil doit être publié avant que les clients puissent utiliser ce code.',
    copyCode: 'Copier le code',
    regenerateCode: 'Régénérer',
    regenerateCodeConfirm: 'Régénérer ce code ? L’ancien code cessera de fonctionner.',
    codeCopied: 'Code copié.',
    codeUsage: 'Utilisations',
    dietsSoonTitle: 'Régimes clients',
    dietsSoonBody: 'Bientôt, vous pourrez créer un plan alimentaire structuré et l’envoyer à un client.',
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
    CHAT_CONSULTATION: 'Consultation par chat', VIDEO_CONSULTATION: 'Consultation vidéo', MEAL_PLAN: 'Plan alimentaire', REPORT_REVIEW: 'Analyse de rapport',
    MONTHLY_SUPPORT: 'Accompagnement mensuel', CUSTOM: 'Personnalisé',
  },
  call: {
    connecting: 'Connexion à la salle vidéo…',
    unavailable: 'Vidéo indisponible',
    tryAgainLater: 'Réessayez plus tard.',
    notConfigured: 'Les appels vidéo ne sont pas encore configurés sur le serveur.',
    reconnecting: 'Reconnexion…',
    reconnectingHint: 'Gardez cette page ouverte pendant que nous rétablissons la connexion.',
    inProgress: 'Consultation vidéo en cours',
    inProgressHint: 'Utilisez le bouton rouge lorsque vous souhaitez terminer l’appel.',
    end: 'Terminer',
  },
  support: {
    title: 'Contacter EatSense', subject: 'Support expert EatSense', expertSupport: 'Support expert', body: 'Écrivez-nous pour des questions sur le planning, les clients, paiements, profil ou problèmes techniques.', bodyFull: 'Écrivez-nous pour le planning, les clients, paiements, profil ou problèmes techniques. Nous répondons en général sous un jour ouvré.',
  },
  earnings: {
    bannerCta: 'Connectez Stripe Connect pour recevoir vos paiements automatiquement.', thisMonth: 'Ce mois', pendingPayout: 'Paiement en attente', lifetime: 'Total', comingSoon: 'Bientôt', body: 'Les rapports de revenus sont en bêta. Pour les soldes exacts, consultez Stripe Connect.', stripeConnected: 'Stripe Connect connecté', payoutsAuto: 'Les paiements arrivent sur votre compte après chaque consultation.', updateStripe: 'Mettre à jour sur Stripe', finishSetup: 'Terminer la configuration Stripe', finishSetupBody: 'Validez vos informations chez Stripe pour activer les paiements.', continueStripe: 'Continuer sur Stripe', connectStripeTitle: 'Connectez Stripe pour recevoir les paiements', connectStripeBody: "Stripe Connect gère les paiements automatiquement lorsqu'un client paie une consultation.", connectStripeBtn: 'Connecter Stripe', stripeFeeBefore: 'EatSense utilise Stripe Connect Express. L’onboarding prend 5–10 minutes. La commission de la plateforme est', paymentsDisabled: 'Les paiements sont temporairement désactivés par l\'admin. La liaison Stripe sera disponible une fois activée.',
  },
  sidebarMobile: {
    home: 'Accueil', schedule: 'Planning',
  },
  onboardingTour: {
    skip: 'Passer', next: 'Suivant', done: 'Compris', closeAria: 'Fermer',
    slide1Title: 'Votre code d\'accès',
    slide1Body: 'Partagez ce code avec vos clients — ils le saisissent dans l\'app mobile pour démarrer une consultation. Vous pouvez le copier ou le régénérer dans Profil.',
    slide2Title: 'Définir vos disponibilités',
    slide2Body: 'Dans Disponibilités, indiquez quand vous acceptez des consultations. Les clients ne voient que les créneaux libres. Le mode absence met en pause les réservations.',
    slide3Title: 'Tarifs & offres',
    slide3Body: 'Ajoutez des offres 30/60/90 min avec des prix dans votre devise. Stripe Connect gère les paiements automatiquement (à configurer dans Revenus).',
    slide4Title: 'Chat & notes',
    slide4Body: 'Chaque conversation client est dans Chats. Ouvrez une fiche client pour voir les repas, analyses et ajouter des notes privées — visibles uniquement par vous.',
  },
  consultations: {
    title: 'Consultations', tabAvailability: 'Disponibilités', tabBookings: 'Rendez-vous', newButton: 'Nouveau',
    pickClientAndTime: 'Choisissez un client et un créneau',
    cancelConfirm: 'Annuler la consultation ?', completeConfirm: 'Terminer la consultation ?', noShowConfirm: 'Marquer comme absent ?',
    upcoming: 'À venir', past: 'Passées', empty: 'Aucune consultation',
    startBtn: 'Démarrer', chatBtn: 'Chat', rescheduleBtn: 'Reprogrammer',
    completeBtn: 'Terminer', cancelBtn: 'Annuler', noShowBtn: 'Absent',
    newConsultation: 'Nouvelle consultation', client: 'Client', when: 'Quand', duration: 'Durée', modalCancel: 'Annuler', modalCreate: 'Créer', modalSend: 'Envoyer', rescheduleTitle: 'Reprogrammer', rescheduleBody: 'Choisissez un nouveau créneau à proposer au client.', newTime: 'Nouveau créneau', accept: 'Accepter', decline: 'Refuser', youProposed: 'Vous avez proposé pour :', clientProposed: 'Le client a proposé pour :',
  },
};

const es: MessagesShape = {
  nav: { dashboard: 'Panel', chats: 'Chats', clients: 'Clientes', calendar: 'Calendario', consultations: 'Citas', offers: 'Servicios', earnings: 'Ingresos', reviews: 'Reseñas', profile: 'Mi Perfil', signOut: 'Cerrar sesión' },
  common: {
    save: 'Guardar cambios', saving: 'Guardando...', saved: '¡Guardado!', cancel: 'Cancelar', delete: 'Eliminar', deleting: 'Eliminando...',
    edit: 'Editar', create: 'Crear', creating: 'Creando...', loading: 'Cargando...', upload: 'Subir', uploading: 'Subiendo...',
    view: 'Ver', back: 'Volver', close: 'Cerrar', yes: 'Sí', no: 'No', confirm: 'Confirmar', error: 'Error', retry: 'Reintentar',
    pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado', hidden: 'Oculto', visible: 'Visible',
    published: 'Publicado', draft: 'Borrador', optional: 'opcional', language: 'Idioma',
    saveFailed: 'No se pudo guardar. Inténtalo de nuevo.',
    deleteFailed: 'No se pudo eliminar. Inténtalo de nuevo.',
    uploadFailed: 'No se pudo subir. Inténtalo de nuevo.',
    openFailed: 'No se pudo abrir el documento. Inténtalo de nuevo.',
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
    scheduleBtn: 'Agenda', contactBtn: 'Contacto', liveNow: 'En curso', shouldHaveStarted: 'Debería haber empezado', nextConsultation: 'Próxima consulta', startBtn: 'Iniciar', viewAll: 'Ver todo', minutesShort: 'min', hoursShort: 'h', minShort: 'm',
  },
  chats: {
    title: 'Chats', empty: 'Aún no hay conversaciones', noMessages: 'Aún no hay mensajes',
    photo: 'Foto', sharedMeals: 'Comidas compartidas', sharedReport: 'Informe compartido', yesterday: 'Ayer',
    typeMessage: 'Escribe un mensaje...', send: 'Enviar', markComplete: 'Marcar como completada', reopen: 'Reabrir',
    complete: 'Completada', cancelled: 'Cancelada', confirmComplete: '¿Marcar esta consulta como completada?',
    completeBtn: 'Completar', viewData: 'Ver datos', requestData: 'Solicitar acceso', startVideo: 'Videollamada', awaitingPayment: 'Pago pendiente',
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
    templateTypicalDayLabel: 'Día típico', templateNextStepsLabel: 'Próximos pasos', templateFollowUpLabel: 'Seguimiento', translated: 'Traducido',
  },
  calendar: {
    title: 'Disponibilidad',
    save: 'Guardar',
    subscribeTitle: 'Suscribirse al calendario',
    subscribeHint: 'Añade esta URL a Google Calendar o Apple Calendar para ver las consultas.',
    copy: 'Copiar',
    copied: 'Copiado',
    vacationTitle: 'Fuera de la oficina',
    vacationHint: 'Mientras esté activo, las nuevas reservas estarán bloqueadas.',
    awayUntil: 'Ausente hasta',
    vacationMessage: 'Mensaje (opcional)',
    vacationPlaceholder: 'Vuelvo el 1 de julio',
    clear: 'Limpiar',
    exceptionsTitle: 'Excepciones (días cerrados)',
    exceptionsHint: 'Fechas específicas en las que no aceptas consultas.',
    addClosedDay: 'Añadir',
    noExceptions: 'No hay excepciones añadidas.',
    closed: 'cerrado',
    custom: 'personalizado',
    timezone: 'Zona horaria',
    timezoneHint: 'Zona horaria IANA (p. ej. Europe/Zurich, Asia/Almaty)',
    off: 'Descanso',
    addBlock: 'Añadir bloque',
    failed: 'Error',
    meetings: 'Reuniones', history: 'Historial', noMeetings: 'No hay consultas en esta sección', manage: 'Abrir todo', waiting: 'Sala de espera', start: 'Iniciar', chat: 'Chat', pageTitle: 'Agenda', availability: 'Disponibilidad', upcoming: 'Próximas',
  },
  clients: {
    title: 'Datos del cliente', backToChat: 'Volver al chat',
    noAccess: 'Puede que el cliente aún no haya concedido acceso a los datos.',
    meals: 'Comidas', labs: 'Resultados de laboratorio', health: 'Perfil de salud',
    noMeals: 'No hay datos de comidas disponibles.', noLabs: 'No hay resultados de laboratorio disponibles.', noHealth: 'No hay datos del perfil de salud.',
    metric: 'Indicador', value: 'Valor', reference: 'Referencia', mealLabel: 'Comida',
    name: 'Nombre', age: 'Edad', height: 'Altura', weight: 'Peso', gender: 'Género', goal: 'Objetivo',
    dailyCalories: 'Objetivo calórico diario', preferences: 'Preferencias',
    loadFailed: 'No se pudieron cargar los datos del cliente', ingredient: 'Ingrediente', searchPlaceholder: 'Buscar por nombre o correo', filter_all: 'Todos', filter_code: 'Por código', filter_manual: 'Manual', emptyState: 'Aún no hay clientes. Comparte tu código de acceso para invitar personas.', noMatches: 'Ningún cliente coincide con los filtros.',
  },
  offers: {
    title: 'Servicios', newOffer: 'Nuevo servicio', edit: 'Editar servicio', create: 'Nuevo servicio',
    empty: 'Aún no hay servicios', emptyHint: 'Crea uno para que los clientes puedan iniciar una consulta contigo.',
    name: 'Nombre', nameFor: 'Nombre ({lang})',
    description: 'Descripción', descriptionFor: 'Descripción ({lang})',
    nameRequired: 'Por favor, proporciona un nombre al menos en un idioma.',
    format: 'Formato', duration: 'Duración (días, opcional)', durationMinutes: 'Duración de sesión (minutos, opcional)', days: 'días', minutes: 'min',
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
    nutritionist: 'Nutricionista', dietitian: 'Dietista', obgyn: 'Ginecólogo-obstetra', pediatrician: 'Pediatra', gp: 'Médico general', psychologist: 'Psicólogo', endocrinologist: 'Endocrinólogo', other: 'Otro', bio: 'Biografía',
    bioPlaceholder: 'Cuéntales a los clientes sobre tu experiencia y enfoque...',
    education: 'Formación', educationPlaceholder: 'ej. MSc en Nutrición, ETH Zúrich',
    experienceYears: 'Años de experiencia', specializations: 'Especializaciones', languages: 'Idiomas',
    videoCalls: 'Videollamadas',
    videoCallsBody: 'Si se desactiva, el chat seguirá disponible, pero no se podrán abrir salas de vídeo para consultas.',
    videoCallsEnabled: 'Consultas por vídeo activadas',
    videoCallsDisabled: 'Consultas por vídeo desactivadas',
    profileTools: 'Herramientas de perfil',
    profileToolsBody: 'Servicios, reseñas y soporte ahora están junto a los ajustes del perfil.',
    manageOffers: 'Gestionar servicios',
    manageReviews: 'Reseñas',
    contactSupport: 'Soporte',
    credentials: 'Credenciales',
    credentialsHint: 'Sube un diploma, certificación o licencia. Las imágenes se comprimen, los PDFs se guardan tal cual. Máx. 15MB. Las credenciales quedan pendientes hasta que el equipo de EatSense las apruebe.',
    credentialName: 'Nombre de la credencial',
    credentialNamePlaceholder: 'Nombre de la credencial (ej. MSc Nutrición, ETH)',
    characters: 'caracteres',
    confirmDeleteCredential: '¿Eliminar esta credencial?',
    uploadOnlyImageOrPdf: 'Solo se admiten imágenes y PDFs.',
    uploadMaxSize: 'El archivo debe ser menor de 15 MB.',
    credentialNameRequired: 'Introduce primero un nombre de credencial.',
    expertCodeTitle: 'Código de especialista',
    expertCodeBody: 'Comparte este código privado con los clientes que deben añadirte directamente en EatSense.',
    expertCodeUnavailable: 'Tu perfil debe estar publicado antes de que los clientes puedan usar este código.',
    copyCode: 'Copiar código',
    regenerateCode: 'Regenerar',
    regenerateCodeConfirm: '¿Regenerar este código? El código anterior dejará de funcionar.',
    codeCopied: 'Código copiado.',
    codeUsage: 'Usos',
    dietsSoonTitle: 'Dietas de clientes',
    dietsSoonBody: 'Pronto podrás crear un plan de alimentación estructurado y enviarlo a un cliente.',
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
    CHAT_CONSULTATION: 'Consulta por chat', VIDEO_CONSULTATION: 'Videoconsulta', MEAL_PLAN: 'Plan de comidas', REPORT_REVIEW: 'Análisis de informe',
    MONTHLY_SUPPORT: 'Acompañamiento mensual', CUSTOM: 'Personalizado',
  },
  call: {
    connecting: 'Conectando a la sala de video…',
    unavailable: 'Video no disponible',
    tryAgainLater: 'Inténtalo más tarde.',
    notConfigured: 'Las videollamadas aún no están configuradas en el servidor.',
    reconnecting: 'Reconectando…',
    reconnectingHint: 'Mantén esta página abierta mientras restauramos la conexión.',
    inProgress: 'Videoconsulta en curso',
    inProgressHint: 'Usa el botón rojo cuando quieras finalizar la llamada.',
    end: 'Finalizar',
  },
  support: {
    title: 'Contactar a EatSense', subject: 'Soporte experto EatSense', expertSupport: 'Soporte experto', body: 'Escríbenos sobre agenda, clientes, pagos, perfil o incidencias técnicas.', bodyFull: 'Escríbenos sobre agenda, clientes, pagos, perfil o incidencias técnicas. Solemos responder en menos de un día laborable.',
  },
  earnings: {
    bannerCta: 'Conecta Stripe Connect para recibir pagos automáticos por consultas.', thisMonth: 'Este mes', pendingPayout: 'Pago pendiente', lifetime: 'Total histórico', comingSoon: 'Próximamente', body: 'Los informes de ingresos están en beta. Para saldos exactos consulta Stripe Connect.', stripeConnected: 'Stripe Connect conectado', payoutsAuto: 'Los pagos aparecerán en tu cuenta tras completar las consultas.', updateStripe: 'Actualizar en Stripe', finishSetup: 'Termina la configuración de Stripe', finishSetupBody: 'Confirma tus datos en Stripe para activar los pagos.', continueStripe: 'Continuar en Stripe', connectStripeTitle: 'Conecta Stripe para recibir pagos', connectStripeBody: 'Stripe Connect gestiona los pagos automáticamente cuando un cliente paga una consulta.', connectStripeBtn: 'Conectar Stripe', stripeFeeBefore: 'EatSense usa Stripe Connect Express. El onboarding tarda 5–10 minutos. La comisión de la plataforma es', paymentsDisabled: 'Los pagos están temporalmente deshabilitados por el administrador. La conexión a Stripe estará disponible al activarse.',
  },
  sidebarMobile: {
    home: 'Inicio', schedule: 'Agenda',
  },
  onboardingTour: {
    skip: 'Saltar', next: 'Siguiente', done: 'Entendido', closeAria: 'Cerrar',
    slide1Title: 'Tu código de acceso',
    slide1Body: 'Comparte este código con tus clientes — lo introducen en la app móvil para iniciar una consulta contigo. Puedes copiarlo o regenerarlo en Perfil.',
    slide2Title: 'Configura tu disponibilidad',
    slide2Body: 'Abre Disponibilidad y marca cuándo aceptas consultas. Los clientes solo ven las franjas libres. El modo ausente pausa las reservas.',
    slide3Title: 'Precios y ofertas',
    slide3Body: 'Añade ofertas de 30/60/90 min con precios en tu moneda. Stripe Connect gestiona los pagos automáticamente (configúralo en Ingresos).',
    slide4Title: 'Chat y notas',
    slide4Body: 'Cada conversación con un cliente vive en Chats. Abre la ficha del cliente para ver comidas, análisis y añadir notas privadas — solo visibles para ti.',
  },
  consultations: {
    title: 'Consultas', tabAvailability: 'Disponibilidad', tabBookings: 'Citas', newButton: 'Nueva',
    pickClientAndTime: 'Elige un cliente y una hora',
    cancelConfirm: '¿Cancelar consulta?', completeConfirm: '¿Completar consulta?', noShowConfirm: '¿Marcar como no asistió?',
    upcoming: 'Próximas', past: 'Pasadas', empty: 'Sin consultas',
    startBtn: 'Iniciar', chatBtn: 'Chat', rescheduleBtn: 'Reprogramar',
    completeBtn: 'Completar', cancelBtn: 'Cancelar', noShowBtn: 'No asistió',
    newConsultation: 'Nueva consulta', client: 'Cliente', when: 'Cuándo', duration: 'Duración', modalCancel: 'Cancelar', modalCreate: 'Crear', modalSend: 'Enviar', rescheduleTitle: 'Reprogramar', rescheduleBody: 'Elige una nueva hora para proponer al cliente.', newTime: 'Nueva hora', accept: 'Aceptar', decline: 'Rechazar', youProposed: 'Has propuesto reprogramar a:', clientProposed: 'El cliente propuso reprogramar a:',
  },
};

export const MESSAGES: Record<Locale, MessagesShape> = { en, ru, kk, de, fr, es };
export type { MessagesShape };

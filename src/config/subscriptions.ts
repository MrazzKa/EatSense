// src/config/subscriptions.ts
// Product IDs configured in App Store Connect

export const SUBSCRIPTION_SKUS = {
    MONTHLY: 'eatsense.pro.monthly',
    YEARLY: 'eatsense.pro.yearly',
    STUDENT: 'eatsense.pro.yearly.student',
};

export const NON_CONSUMABLE_SKUS = {
    FOUNDERS: 'eatsense.founder.pass',
};

export const ALL_PRODUCT_SKUS = [
    ...Object.values(SUBSCRIPTION_SKUS),
    ...Object.values(NON_CONSUMABLE_SKUS),
];

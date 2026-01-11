import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Exchange rates relative to USD (approximate)
const exchangeRates: Record<string, number> = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    KZT: 450,
    RUB: 90,
    UAH: 37,
    BYN: 3.2,
    UZS: 12500,
    CAD: 1.35,
    AUD: 1.53,
    JPY: 149,
    CNY: 7.2,
    INR: 83,
    BRL: 4.9,
    TRY: 32,
    PLN: 4.0,
    CZK: 23,
    CHF: 0.88,
    KRW: 1300,
};

// Price formatting
function formatPrice(amount: number, currency: string): string {
    const formatters: Record<string, (n: number) => string> = {
        USD: (n) => `$${n.toFixed(2)}`,
        EUR: (n) => `${n.toFixed(2)} €`,
        GBP: (n) => `£${n.toFixed(2)}`,
        KZT: (n) => `${Math.round(n).toLocaleString('ru')} ₸`,
        RUB: (n) => `${Math.round(n).toLocaleString('ru')} ₽`,
        UAH: (n) => `${Math.round(n).toLocaleString('ru')} ₴`,
        BYN: (n) => `${n.toFixed(2)} Br`,
        UZS: (n) => `${Math.round(n).toLocaleString('ru')} сум`,
        CAD: (n) => `CA$${n.toFixed(2)}`,
        AUD: (n) => `A$${n.toFixed(2)}`,
        JPY: (n) => `¥${Math.round(n).toLocaleString()}`,
        CNY: (n) => `¥${n.toFixed(2)}`,
        INR: (n) => `₹${Math.round(n).toLocaleString('en-IN')}`,
        BRL: (n) => `R$${n.toFixed(2).replace('.', ',')}`,
        TRY: (n) => `${n.toFixed(2).replace('.', ',')} ₺`,
        PLN: (n) => `${n.toFixed(2).replace('.', ',')} zł`,
        CZK: (n) => `${Math.round(n).toLocaleString('cs')} Kč`,
        CHF: (n) => `CHF ${n.toFixed(2)}`,
        KRW: (n) => `₩${Math.round(n).toLocaleString()}`,
    };

    return formatters[currency]?.(amount) || `${amount.toFixed(2)} ${currency}`;
}

// Subscription plans
const plans = [
    {
        name: 'weekly',
        basePriceUsd: 4.99,
        durationDays: 7,
        features: [
            'unlimited_analyses',
            'basic_reports',
            'meal_history',
        ],
        displayOrder: 1,
        requiresVerification: false,
    },
    {
        name: 'monthly',
        basePriceUsd: 9.99,
        durationDays: 30,
        features: [
            'unlimited_analyses',
            'detailed_reports',
            'meal_history',
            'ai_chat',
            'export_data',
        ],
        displayOrder: 2,
        requiresVerification: false,
    },
    {
        name: 'yearly',
        basePriceUsd: 69.99,
        durationDays: 365,
        features: [
            'unlimited_analyses',
            'detailed_reports',
            'meal_history',
            'ai_chat',
            'export_data',
            'priority_support',
            'expert_access',
            'family_sharing',
        ],
        displayOrder: 3,
        requiresVerification: false,
    },
    {
        name: 'student',
        basePriceUsd: 49.00,
        durationDays: 365,
        features: [
            'unlimited_analyses',
            'detailed_reports',
            'meal_history',
            'ai_chat',
            'export_data',
            'priority_support',
            'expert_access',
        ],
        displayOrder: 4,
        requiresVerification: true,
    },
];

async function seedSubscriptions() {
    console.log('🚀 Seeding subscription plans...\n');

    for (const planData of plans) {
        // Create or update plan
        const plan = await prisma.subscriptionPlan.upsert({
            where: { name: planData.name },
            update: {
                basePriceUsd: planData.basePriceUsd,
                durationDays: planData.durationDays,
                features: planData.features,
                requiresVerification: planData.requiresVerification,
                displayOrder: planData.displayOrder,
                isActive: true,
            },
            create: {
                name: planData.name,
                basePriceUsd: planData.basePriceUsd,
                durationDays: planData.durationDays,
                features: planData.features,
                requiresVerification: planData.requiresVerification,
                displayOrder: planData.displayOrder,
                isActive: true,
            },
        });

        console.log(`✅ Plan: ${plan.name} ($${planData.basePriceUsd})`);

        // Create prices for all currencies
        for (const [currency, rate] of Object.entries(exchangeRates)) {
            const price = planData.basePriceUsd * rate;

            // Round to "nice" numbers
            let roundedPrice: number;
            if (currency === 'KZT' || currency === 'UZS' || currency === 'JPY' || currency === 'KRW') {
                // Round to nearest hundred/thousand
                const divisor = currency === 'UZS' || currency === 'KRW' ? 1000 : 100;
                roundedPrice = Math.round(price / divisor) * divisor;
            } else if (currency === 'RUB' || currency === 'UAH' || currency === 'INR' || currency === 'CZK') {
                // Round to whole numbers
                roundedPrice = Math.round(price);
            } else {
                // Round to .99
                roundedPrice = Math.floor(price) + 0.99;
            }

            // Calculate per-month price and savings for yearly plans
            let pricePerMonth: number | null = null;
            let savingsPercent: number | null = null;

            if (planData.durationDays === 365) {
                pricePerMonth = roundedPrice / 12;

                // Find monthly plan for savings calculation
                const monthlyPlan = plans.find(p => p.name === 'monthly');
                if (monthlyPlan) {
                    const monthlyPrice = monthlyPlan.basePriceUsd * rate * 12;
                    savingsPercent = Math.round((1 - roundedPrice / monthlyPrice) * 100);
                }
            }

            await prisma.subscriptionPrice.upsert({
                where: {
                    planId_currencyCode: {
                        planId: plan.id,
                        currencyCode: currency,
                    },
                },
                update: {
                    price: roundedPrice,
                    priceFormatted: formatPrice(roundedPrice, currency),
                    pricePerMonth,
                    pricePerMonthFormatted: pricePerMonth ? formatPrice(pricePerMonth, currency) : null,
                    savingsPercent,
                },
                create: {
                    planId: plan.id,
                    currencyCode: currency,
                    price: roundedPrice,
                    priceFormatted: formatPrice(roundedPrice, currency),
                    pricePerMonth,
                    pricePerMonthFormatted: pricePerMonth ? formatPrice(pricePerMonth, currency) : null,
                    savingsPercent,
                },
            });
        }

        console.log(`   └─ Created prices for ${Object.keys(exchangeRates).length} currencies`);
    }

    console.log('\n✨ Subscription seeding completed!');
}

seedSubscriptions()
    .catch((error) => {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());

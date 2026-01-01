import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seeds specialists and sample diet programs for the Experts Marketplace.
 */
async function main() {
    console.log('🌱 Seeding specialists and diet programs...');

    // Create test users first (if they don't exist)
    const specialistUsers = await Promise.all([
        prisma.user.upsert({
            where: { email: 'dr.smith@eatsense.ch' },
            update: {},
            create: {
                email: 'dr.smith@eatsense.ch',
                password: '', // Empty string for NOT NULL constraint
            },
        }),
        prisma.user.upsert({
            where: { email: 'lisa.brown@eatsense.ch' },
            update: {},
            create: {
                email: 'lisa.brown@eatsense.ch',
                password: '', // Empty string for NOT NULL constraint
            },
        }),
        prisma.user.upsert({
            where: { email: 'dr.martinez@eatsense.ch' },
            update: {},
            create: {
                email: 'dr.martinez@eatsense.ch',
                password: '', // Empty string for NOT NULL constraint
            },
        }),
    ]);

    // Create specialists
    const specialists = [
        {
            userId: specialistUsers[0].id,
            type: 'dietitian',
            displayName: 'Dr. Sarah Smith',
            bio: 'Board-certified dietitian with 10+ years of experience in clinical nutrition and metabolic health. Specializing in diabetes management and weight loss.',
            credentials: 'RD, CDE, MS in Nutrition Science',
            languages: ['en', 'de'],
            pricePerWeek: 149,
            currency: 'CHF',
            isVerified: true,
            isActive: true,
            rating: 4.8,
            reviewCount: 42,
        },
        {
            userId: specialistUsers[1].id,
            type: 'nutritionist',
            displayName: 'Lisa Brown',
            bio: 'Certified nutritionist focused on practical meal planning and building sustainable healthy habits. I help busy professionals achieve their health goals without strict dieting.',
            credentials: 'Certified Nutritionist, Health Coach',
            languages: ['en', 'ru'],
            pricePerWeek: 99,
            currency: 'CHF',
            isVerified: true,
            isActive: true,
            rating: 4.6,
            reviewCount: 28,
        },
        {
            userId: specialistUsers[2].id,
            type: 'dietitian',
            displayName: 'Dr. Carlos Martinez',
            bio: 'Sports dietitian working with athletes and fitness enthusiasts. Specialized in performance nutrition, body composition, and recovery optimization.',
            credentials: 'RD, CSSD, MS in Sports Nutrition',
            languages: ['en', 'es'],
            pricePerWeek: 179,
            currency: 'CHF',
            isVerified: true,
            isActive: true,
            rating: 4.9,
            reviewCount: 56,
        },
    ];

    for (const spec of specialists) {
        await prisma.specialist.upsert({
            where: { userId: spec.userId },
            update: spec,
            create: spec,
        });
    }

    console.log(`✅ Created ${specialists.length} specialists`);

    // Create diet programs
    const dietPrograms = [
        {
            slug: 'mediterranean-week',
            name: 'Mediterranean Week',
            subtitle: 'Heart-healthy eating made easy',
            description:
                'Experience the flavors and health benefits of the Mediterranean diet. This 7-day program includes fresh vegetables, olive oil, fish, and whole grains.',
            category: 'modern',
            duration: 7,
            dailyCalories: 1800,
            difficulty: 'easy',
            tags: ['heart-healthy', 'anti-inflammatory', 'beginner-friendly'],
            isActive: true,
            isFeatured: true,
            sortOrder: 1,
        },
        {
            slug: 'athletic-performance',
            name: 'Athletic Performance',
            subtitle: 'Fuel your training',
            description:
                'Designed for athletes and fitness enthusiasts. Optimize your nutrition for training, recovery, and peak performance with this 14-day program.',
            category: 'athletes',
            duration: 14,
            dailyCalories: 2500,
            difficulty: 'medium',
            tags: ['sports', 'muscle-building', 'recovery'],
            isActive: true,
            isFeatured: true,
            sortOrder: 2,
        },
        {
            slug: 'marilyn-monroe',
            name: 'Marilyn Monroe Diet',
            subtitle: 'Classic Hollywood glamour',
            description:
                'Discover the eating habits of the iconic Marilyn Monroe. A balanced approach focused on protein-rich breakfasts and moderate portions.',
            category: 'hollywood',
            duration: 7,
            dailyCalories: 1600,
            difficulty: 'easy',
            tags: ['vintage', 'celebrity', 'balanced'],
            isActive: true,
            isFeatured: false,
            sortOrder: 3,
        },
        {
            slug: 'roman-gladiator',
            name: 'Roman Gladiator Diet',
            subtitle: 'Eat like a warrior',
            description:
                'Based on archaeological findings about ancient gladiator nutrition. Heavy on grains, legumes, and plant-based proteins.',
            category: 'historical',
            duration: 7,
            dailyCalories: 2200,
            difficulty: 'hard',
            tags: ['ancient', 'plant-based', 'high-carb'],
            isActive: true,
            isFeatured: false,
            sortOrder: 4,
        },
    ];

    for (const program of dietPrograms) {
        const created = await prisma.dietProgram.upsert({
            where: { slug: program.slug },
            update: program,
            create: program,
        });

        // Add sample day 1 for each program
        await prisma.dietProgramDay.upsert({
            where: {
                programId_dayNumber: { programId: created.id, dayNumber: 1 },
            },
            update: {},
            create: {
                programId: created.id,
                dayNumber: 1,
                title: 'Day 1 - Getting Started',
                description: 'Your first day on the program. Focus on hydration and balanced meals.',
                totalCalories: program.dailyCalories,
                totalProtein: 80,
                totalCarbs: 200,
                totalFat: 60,
            },
        });
    }

    console.log(`✅ Created ${dietPrograms.length} diet programs`);
    console.log('🎉 Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

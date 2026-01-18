
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Checking database content...');

    const count = await prisma.food.count();
    console.log(`Total foods in DB: ${count}`);

    const terms = ['burger', 'onion', 'kebab', 'tomato', 'apple'];

    for (const term of terms) {
        const found = await prisma.food.findMany({
            where: {
                description: {
                    contains: term,
                    mode: 'insensitive'
                }
            },
            take: 3,
            select: {
                id: true,
                description: true,
                dataType: true,
                fdcId: true
            }
        });

        console.log(`\nResults for "${term}": ${found.length}`);
        found.forEach(f => console.log(` - [${f.dataType}] ${f.description} (ID: ${f.fdcId})`));
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });

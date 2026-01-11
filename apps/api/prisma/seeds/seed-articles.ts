import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SOURCE_NAME = 'EatSense Editorial';

// Import seedArticlesRu using require (CommonJS) to avoid ESM/CJS mixing issues
const { seedArticlesRu } = require('./seed-articles-ru');

const articles = [
  {
    title: 'Fueling Your Morning: High-Protein Breakfast Ideas',
    excerpt: 'Kickstart your metabolism with these satisfying, protein-packed breakfast combinations designed for energy and satiety.',
    tags: ['breakfast', 'protein', 'meal-planning'],
    coverUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8',
    coverAlt: 'Healthy breakfast with eggs and avocado toast',
    sourceName: 'EatSense Editorial',
    readingMinutes: 6,
    contentMd: `
Breakfast is an opportunity to nourish your body and mind. Adding protein provides lasting satiety, stabilises blood sugar, and supports muscle recovery.

## Why Protein Matters in the Morning
- **Steady Energy:** Protein slows digestion which keeps energy levels balanced.
- **Reduced Cravings:** Adequate protein minimises mid-morning sugar cravings.
- **Muscle Support:** Overnight fasting increases protein needs for muscle repair.

## Sample Breakfast Plates
1. *Greek Yogurt Bowl*  
   Layer unsweetened Greek yogurt with mixed berries, chia seeds, and a drizzle of almond butter.  
   **Macros:** ~28 g protein, 35 g carbs, 12 g fat

2. *Savory Egg & Veggie Wrap*  
   Scramble two eggs with spinach and cherry tomatoes, wrap in a whole-grain tortilla, and add a sprinkle of feta.  
   **Macros:** ~22 g protein, 30 g carbs, 14 g fat

3. *Protein Oats*  
   Stir vanilla protein powder into cooked oats, top with sliced banana, walnuts, and cinnamon.  
   **Macros:** ~24 g protein, 45 g carbs, 15 g fat

## Quick Tips
- Prepare ingredients the night before to streamline mornings.
- Pair complex carbs with protein for balanced energy.
- Keep portable protein options (boiled eggs, shakes) for busy days.
    `,
  },
  {
    title: 'Smart Snacking: 10 Options Under 200 Calories',
    excerpt: 'Keep hunger at bay with nutrient-dense snacks that fit into any calorie budget.',
    tags: ['snacks', 'calorie-control', 'weight-loss'],
    coverUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
    coverAlt: 'Fresh fruit and nuts on a table',
    sourceName: SOURCE_NAME,
    readingMinutes: 5,
    contentMd: `
Snacks can help you maintain energy and prevent overeating at the next meal. Focus on whole foods that blend fiber, protein, and healthy fats.

### Top Picks
1. Apple slices with 1 tbsp peanut butter  
2. 12 almonds + a clementine  
3. Cottage cheese with cucumber slices  
4. Rice cake topped with avocado and tomato  
5. Plain Greek yogurt with cacao nibs  
6. Edamame (steamed, lightly salted)  
7. Baby carrots with hummus  
8. Hard-boiled egg with paprika  
9. Roasted chickpeas (¼ cup)  
10. Fresh berries with a sprinkle of chia seeds

### Snacking Guidelines
- Aim for at least 5 g of protein or 3 g of fiber to enhance satiety.
- Pre-portion snacks to avoid mindless eating straight from the bag.
- Hydrate: thirst is often mistaken for hunger.
    `,
  },
  {
    title: 'Hydration Hacks for Active Professionals',
    excerpt: 'Simple strategies to stay hydrated throughout long work days and workouts.',
    tags: ['hydration', 'wellness', 'productivity'],
    coverUrl: 'https://images.unsplash.com/photo-1502741338009-cac2772e18bc',
    coverAlt: 'Reusable water bottle on a desk',
    sourceName: SOURCE_NAME,
    readingMinutes: 4,
    contentMd: `
Hydration influences focus, digestion, and exercise performance. Adults typically need 30–35 ml of water per kg bodyweight, but activity and environment increase needs.

### Daily Strategies
- **Morning Hydration:** Drink 500 ml upon waking to replenish overnight losses.
- **Set Reminders:** Use phone alarms or hydration apps to nudge sips every hour.
- **Flavor Boost:** Infuse water with lemon, cucumber, or berries for variety.

### Workout Considerations
- Drink 200–300 ml 20 minutes before activity.
- During workouts longer than 60 minutes, consider electrolyte beverages.
- Weigh yourself pre/post workout—every 0.5 kg lost ≈ 500 ml fluid deficit.
    `,
  },
  {
    title: 'Understanding Portion Sizes Without a Scale',
    excerpt: 'Visual cues to estimate portion sizes accurately when measuring tools aren’t available.',
    tags: ['portion-control', 'education'],
    coverUrl: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929',
    coverAlt: 'Balanced meal portions on a plate',
    sourceName: SOURCE_NAME,
    readingMinutes: 7,
    contentMd: `
Learning visual cues for portion sizes empowers you to make informed decisions everywhere—restaurants, cafeterias, or home dinners.

### Quick Reference Guide
- **Palm:** Protein (fish, chicken) — ~100 g
- **Fist:** Vegetables or fruit — ~1 cup
- **Cupped Hand:** Whole grains or legumes — ~½ cup
- **Thumb:** Nut butter or oils — ~1 tbsp

### Tips
- Use smaller plates to encourage appropriate portions.
- Focus on half the plate being vegetables for volume with minimal calories.
- Practice mindful eating: pause halfway through your plate to assess fullness.
    `,
  },
  {
    title: 'Plant-Based Protein Sources You Should Know',
    excerpt: 'Explore versatile plant proteins that help you meet your macro goals without meat.',
    tags: ['plant-based', 'protein', 'nutrition'],
    coverUrl: 'https://images.unsplash.com/photo-1452195100486-9cc805987862',
    coverAlt: 'Assorted legumes and seeds',
    sourceName: SOURCE_NAME,
    readingMinutes: 6,
    contentMd: `
Plant proteins can deliver all essential amino acids when combined smartly.

### Top Staples
- **Lentils:** 18 g protein per cooked cup, rich in iron.
- **Firm Tofu:** 20 g protein per cup, adaptable to sweet or savoury dishes.
- **Quinoa:** 8 g protein per cup, complete amino acid profile.
- **Tempeh:** 31 g per cup, fermented for gut support.
- **Chickpeas:** 15 g per cup, high in fiber.

### Pairings for Complete Proteins
- Rice + beans
- Whole grain bread + nut butter
- Hummus + whole wheat pita

### Cooking Tips
- Marinate tofu or tempeh overnight for flavour.
- Roast chickpeas for a crunchy snack.
- Batch-cook legumes and freeze for convenience.
    `,
  },
  {
    title: 'Evening Meals for Restorative Sleep',
    excerpt: 'Create dinner plates that promote relaxation and support overnight recovery.',
    tags: ['sleep', 'dinner', 'recovery'],
    coverUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
    coverAlt: 'Evening dinner setting',
    sourceName: SOURCE_NAME,
    readingMinutes: 5,
    contentMd: `
What you eat at night matters for sleep quality. Focus on balanced macros, calming nutrients, and appropriate timing.

### Key Nutrients
- **Tryptophan:** Found in turkey, dairy, and pumpkin seeds; supports melatonin.
- **Magnesium:** Present in leafy greens, nuts; relaxes muscles.
- **Complex Carbs:** Whole grains help transport tryptophan into the brain.

### Dinner Ideas
- Salmon with quinoa and roasted vegetables.
- Turkey meatballs with buckwheat noodles and spinach.
- Chickpea curry with brown rice and steamed broccoli.

### Timing
- Finish meals 2–3 hours before bedtime to aid digestion.
- Limit caffeine and excessive sugar in the evening.
    `,
  },
  {
    title: 'Weekend Meal Prep Blueprint',
    excerpt: 'An actionable template to prepare balanced meals for the entire week in under two hours.',
    tags: ['meal-prep', 'planning', 'productivity'],
    coverUrl: 'https://images.unsplash.com/photo-1484980972926-edee96e0960d',
    coverAlt: 'Meal prep containers on a table',
    sourceName: SOURCE_NAME,
    readingMinutes: 8,
    contentMd: `
Meal prep streamlines nutrition decisions and reduces weekday stress.

### Step-by-Step
1. **Plan 3 Core Proteins:** e.g., chicken breast, lentil stew, tofu.
2. **Batch Cook Grains:** Brown rice, quinoa, farro.
3. **Roast Vegetables:** Mix colours for diverse nutrients.
4. **Prepare Sauces:** Tahini dressing, pesto, salsa verde.
5. **Portion snacks:** Greek yogurt cups, hummus, veggie sticks.

### Storage Tips
- Use clear containers for visibility.
- Label with dates.
- Freeze portions for the end of the week.
    `,
  },
  {
    title: 'Macro Tracking: A Beginner’s Guide',
    excerpt: 'Understand macronutrients, daily targets, and practical ways to log your intake accurately.',
    tags: ['macros', 'education', 'tracking'],
    coverUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
    coverAlt: 'Notebook with diet tracking notes',
    sourceName: SOURCE_NAME,
    readingMinutes: 7,
    contentMd: `
Tracking macros helps align your intake with fitness goals. Start with a daily calorie target, then divide into protein, carb, and fat percentages based on objectives.

### Macro Basics
- **Protein:** 1.6–2.2 g per kg body weight for active individuals.
- **Fats:** 25–35% of total calories to support hormones.
- **Carbs:** Fill remaining calories for energy.

### Tracking Tips
- Weigh key ingredients until you build intuition.
- Log meals immediately to avoid forgetting.
- Review weekly trends, not just single days.
    `,
  },
  {
    title: 'Lunchbox Solutions for Busy Professionals',
    excerpt: 'Packable lunches that deliver on taste, nutrition, and convenience.',
    tags: ['lunch', 'meal-prep', 'work-life'],
    coverUrl: 'https://images.unsplash.com/photo-1432139555190-58524dae6a55',
    coverAlt: 'Lunchbox with balanced meal',
    sourceName: SOURCE_NAME,
    readingMinutes: 5,
    contentMd: `
Skip the midday slump with nourishing lunches that travel well and reheat beautifully.

### Pack & Go Ideas
- **Mediterranean Farro Bowl:** Farro, roasted peppers, olives, chickpeas, feta.
- **Grilled Chicken Wrap:** Whole-wheat tortilla, chicken, hummus, greens.
- **Tofu Stir-Fry:** Brown rice, edamame, snap peas, sesame sauce.
- **Soup Duo:** Lentil soup with a side salad.

### Packing Tips
- Store dressings separately to keep greens crisp.
- Include a protein-rich snack to extend satiety.
- Use insulated containers to maintain temperature.
    `,
  },
  {
    title: 'How to Balance Carbs for Endurance Training',
    excerpt: 'Timing carbohydrates around workouts to maximise performance and recovery.',
    tags: ['endurance', 'training', 'carbohydrates'],
    coverUrl: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19',
    coverAlt: 'Runner tying shoes before workout',
    sourceName: SOURCE_NAME,
    readingMinutes: 6,
    contentMd: `
Endurance athletes rely on carbohydrates as their main fuel. Strategic timing ensures glycogen stores are available when needed most.

### Pre-Workout
- Consume 1–4 g of carbs per kg body weight 1–4 hours before long sessions.
- Include easy-to-digest options like oats, banana, or rice cakes.

### During Effort
- For workouts over 90 minutes, aim for 30–60 g carbs per hour via gels, chews, or sports drinks.

### Post-Workout
- Replenish with 1–1.2 g carbs per kg and 20–30 g protein within 60 minutes to restore glycogen and support muscles.
    `,
  },
  {
    title: 'Recovery Meals After Strength Training',
    excerpt: 'Support muscle repair with meals that blend protein, carbohydrates, and micronutrients.',
    tags: ['strength', 'recovery', 'protein'],
    coverUrl: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17',
    coverAlt: 'Strength athlete preparing a meal',
    sourceName: SOURCE_NAME,
    readingMinutes: 5,
    contentMd: `
Strength sessions create micro-tears that need amino acids and glycogen to rebuild stronger tissue.

### Plate Blueprint
- Lean protein (chicken, tofu, fish): 30–40 g
- Complex carbs (sweet potato, quinoa): replenish glycogen
- Colourful vegetables: deliver antioxidants for inflammation modulation

### Meal Examples
- Grilled salmon, roasted sweet potatoes, sautéed kale.
- Beef stir-fry with quinoa and bell peppers.
- Tofu buddha bowl with brown rice and tahini sauce.

Drink 500–700 ml of fluids post-session and add electrolytes if sweating heavily.
    `,
  },
  {
    title: 'Gut Health Basics: Fermented Foods to Try',
    excerpt: 'Introduce beneficial bacteria with simple fermented foods and pairing ideas.',
    tags: ['gut-health', 'fermented', 'wellness'],
    coverUrl: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314',
    coverAlt: 'Fermented vegetables in jars',
    sourceName: SOURCE_NAME,
    readingMinutes: 4,
    contentMd: `
Balanced gut flora assists digestion, immunity, and mood regulation. Fermented foods deliver probiotics naturally.

### Starter Ferments
- **Kefir:** add to smoothies or overnight oats.
- **Sauerkraut:** top grain bowls or roasted potatoes.
- **Kimchi:** combine with eggs or fried rice.
- **Tempeh:** grill or bake for sandwiches.
- **Kombucha:** enjoy 120–180 ml with meals.

Introduce slowly (1–2 tbsp/day) to avoid bloating. Pair with prebiotic fibers (bananas, onions, oats) to feed friendly bacteria.
    `,
  },
  {
    title: 'Desk Stretch Circuit for Office Athletes',
    excerpt: 'Five-minute mobility routine to keep joints happy during long workdays.',
    tags: ['mobility', 'office', 'wellness'],
    coverUrl: 'https://images.unsplash.com/photo-1518611012118-f0c5d4782181',
    coverAlt: 'Person stretching at a desk',
    sourceName: SOURCE_NAME,
    readingMinutes: 3,
    contentMd: `
Sedentary days can tighten hips, shoulders, and neck muscles. Reset every 90 minutes with this mini-circuit:

1. **Neck Rolls:** 3 circles each direction.
2. **Chest Opener:** Clasp hands behind back, squeeze shoulder blades.
3. **Seated Twist:** Rotate torso gently, hold 15 seconds per side.
4. **Hip Flexor Lunge:** Stand, step one foot back, sink hips forward.
5. **Calf Raises:** 15 reps to pump blood flow.

Combine with hydration and short walks to reduce stiffness and increase focus.
    `,
  },
  {
    title: 'Low-Sugar Desserts That Satisfy',
    excerpt: 'Sweet treats with minimal added sugar and a focus on whole ingredients.',
    tags: ['dessert', 'low-sugar', 'recipes'],
    coverUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
    coverAlt: 'Chocolate dessert with berries',
    sourceName: SOURCE_NAME,
    readingMinutes: 5,
    contentMd: `
Dessert can fit into a balanced plan when portions and ingredients are considered.

### Ideas
- **Greek Yogurt Parfait:** Layers of yogurt, roasted strawberries, and crushed pistachios.
- **Dark Chocolate Bark:** Melt 85% chocolate, top with almonds and freeze-dried raspberries.
- **Coconut Chia Pudding:** Mix coconut milk, chia seeds, vanilla, refrigerate overnight.
- **Baked Cinnamon Apples:** Core apples, fill with oats, nuts, and bake.

Add spices (cinnamon, cardamom) to intensify flavour without sugar.
    `,
  },
  {
    title: 'Mindful Eating Check-In',
    excerpt: 'A three-step approach to slow down, tune in to hunger cues, and enjoy meals more fully.',
    tags: ['mindful-eating', 'habits'],
    coverUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
    coverAlt: 'Person eating calmly at a table',
    sourceName: SOURCE_NAME,
    readingMinutes: 4,
    contentMd: `
Mindful eating helps you recognise hunger, fullness, and satisfaction, preventing overeating and supporting digestion.

### Three-Step Check-In
1. **Pause:** Before eating, rate hunger on a scale of 1–10.
2. **Observe:** Note flavours, textures, and emotions mid-meal.
3. **Reflect:** After eating, assess fullness and energy levels.

Practice without judgment. Use a journal to track patterns and triggers.
    `,
  },
  {
    title: 'Travel Nutrition: Staying on Track in Hotels',
    excerpt: 'Portable strategies to maintain balanced eating when you’re away from home.',
    tags: ['travel', 'planning', 'resilience'],
    coverUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
    coverAlt: 'Traveler preparing a meal on the go',
    sourceName: SOURCE_NAME,
    readingMinutes: 6,
    contentMd: `
Travel disrupts routines. Plan ahead to maintain energy and avoid defaulting to fast food.

### Essentials to Pack
- Protein powder sachets or shelf-stable shakes.
- Portion packs of nuts, seeds, or jerky.
- Collapsible water bottle and electrolytes.
- Instant oats or whole-grain crackers.

### Hotel Hacks
- Request a mini-fridge and stock yogurt, salad kits, and fruit.
- Scout local grocery stores before arrival.
- Prioritise protein and vegetables when dining out; share rich dishes.
    `,
  },
  {
    title: 'Fiber Boost: Build a 30g Day',
    excerpt: 'Sample menu that delivers 30 grams of fiber using accessible foods.',
    tags: ['fiber', 'digestion', 'meal-planning'],
    coverUrl: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6',
    coverAlt: 'Bowl of vegetables and legumes',
    sourceName: SOURCE_NAME,
    readingMinutes: 4,
    contentMd: `
Fiber supports digestion, blood sugar balance, and satiety. Adults need 25–38 g daily, yet most fall short.

### Sample Fiber Day
- *Breakfast:* Oatmeal with raspberries and flaxseed (10 g)
- *Snack:* Pear + 12 almonds (5 g)
- *Lunch:* Lentil soup with side salad (8 g)
- *Dinner:* Quinoa bowl with black beans, roasted veggies (9 g)

Increase intake gradually and hydrate well to avoid discomfort.
    `,
  },
  {
    title: 'Immune Support Grocery List',
    excerpt: 'Whole foods rich in vitamins C, D, zinc, and antioxidants to keep your immune system resilient.',
    tags: ['immune-health', 'shopping', 'seasonal'],
    coverUrl: 'https://images.unsplash.com/photo-1484980972926-edee96e0960d',
    coverAlt: 'Fresh produce in a market',
    sourceName: SOURCE_NAME,
    readingMinutes: 5,
    contentMd: `
Immune function depends on nutrient sufficiency. Build grocery lists with these staples:

- Citrus fruits, kiwi, and bell peppers (vitamin C)
- Fatty fish, egg yolks, mushrooms (vitamin D)
- Pumpkin seeds, chickpeas (zinc)
- Leafy greens, berries, garlic, ginger (phytonutrients)

Aim for colour diversity and include fermented foods for gut support.
    `,
  },
  {
    title: 'Batch Cooking Soups for Cold Weather',
    excerpt: 'Four hearty soup templates you can batch-cook and freeze for quick lunches.',
    tags: ['meal-prep', 'soups', 'comfort-food'],
    coverUrl: 'https://images.unsplash.com/photo-1447078806655-40579c2520d6',
    coverAlt: 'Bowl of hearty soup',
    sourceName: SOURCE_NAME,
    readingMinutes: 6,
    contentMd: `
Soups deliver hydration, vegetables, and comfort. Batch-cook on weekends and portion for busy days.

### Templates
- **Mediterranean Lentil:** Lentils, tomatoes, spinach, olive oil.
- **Thai Coconut Curry:** Chicken or tofu, coconut milk, lemongrass, veggies.
- **Minestrone:** Beans, pasta, mixed vegetables, pesto finish.
- **Butternut Squash Bisque:** Roasted squash, ginger, cashew cream.

Freeze in single servings. Reheat gently and add fresh herbs before serving.
    `,
  },
  {
    title: 'Sustainable Seafood Choices for Better Nutrition',
    excerpt: 'Select seafood that balances omega-3 benefits with responsible sourcing.',
    tags: ['seafood', 'sustainability', 'omega-3'],
    coverUrl: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f',
    coverAlt: 'Fresh seafood on ice',
    sourceName: SOURCE_NAME,
    readingMinutes: 5,
    contentMd: `
Seafood provides EPA/DHA omega-3s essential for heart and brain health. Opt for species that are both nutritious and responsibly harvested.

### Smart Picks
- Wild Alaskan salmon
- Sardines and anchovies
- Farmed arctic char or barramundi (responsible systems)
- Mussels and oysters (filter feeders, low impact)

Check resources like the Monterey Bay Aquarium Seafood Watch for regional guidance.
    `,
  },
  {
    title: 'Fueling Outdoor Workouts in Hot Weather',
    excerpt: 'Hydration, electrolytes, and snack strategies for training in the heat.',
    tags: ['hydration', 'summer', 'sports-nutrition'],
    coverUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211',
    coverAlt: 'Runner hydrating outdoors',
    sourceName: SOURCE_NAME,
    readingMinutes: 4,
    contentMd: `
Heat increases fluid and electrolyte losses. Prepare accordingly to maintain performance and safety.

### Before
- Drink 500–700 ml water plus electrolytes within 2 hours of start time.
- Eat a light snack with carbs + sodium (banana with peanut butter and salt).

### During
- Sip 150–250 ml every 15 minutes.
- Use sports drinks or electrolyte tabs for sessions over 60 minutes.

### After
- Rehydrate with fluids equal to 150% of sweat loss.
- Include sodium-rich foods (broth, pickles) alongside protein and carbs.
    `,
  },
  {
    title: 'Reading Food Labels 101',
    excerpt: 'Decode serving sizes, added sugars, and ingredients to make informed choices.',
    tags: ['education', 'labels', 'shopping'],
    coverUrl: 'https://images.unsplash.com/photo-1456945926143-7d4aa6e547b6',
    coverAlt: 'Person reading a food label in a store',
    sourceName: SOURCE_NAME,
    readingMinutes: 7,
    contentMd: `
Food labels reveal nutrient density and ingredient quality. Knowing how to interpret them empowers smart decisions.

### Key Sections
- **Serving Size:** The base for listed nutrients. Compare to actual portion.
- **Calories:** Consider in context of your goals.
- **Macronutrients:** Note fiber, protein, and added sugars.
- **Ingredients:** Listed by weight. Watch for ultra-processed additives.

### Quick Tips
- Fewer ingredients generally indicate less processing.
- Aim for <10 g added sugar per serving in packaged snacks.
- Check sodium levels, especially in soups and sauces.
    `,
  },
];

async function main() {
  console.log('🌱 Starting articles seed...');

  // Run Russian articles seed first
  await seedArticlesRu();

  console.log('🌱 Seeding legacy articles...');

  const now = new Date();

  for (let index = 0; index < articles.length; index++) {
    const base = articles[index];
    const slug =
      base.title
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') + `-${index + 1}`;

    // Try to find existing article by slug and locale
    const existingArticle = await prisma.article.findFirst({
      where: {
        slug,
        locale: 'en',
      },
    });

    // Build where clause using slug_locale compound unique
    const whereClause = { slug_locale: { slug, locale: 'en' } };

    try {
      // CLEANUP: Delete any existing article with this slug but in 'ru' locale
      // This fixes the issue where legacy English articles were seeded as 'ru'
      await prisma.article.deleteMany({
        where: {
          slug,
          locale: 'ru',
        },
      });

      await prisma.article.upsert({
        where: whereClause,
        update: {
          locale: 'en', // Set locale for legacy articles
          title: base.title,
          excerpt: base.excerpt,
          tags: base.tags,
          bodyMarkdown: base.contentMd.trim(),
          contentHtml: null,
          heroImageUrl: base.coverUrl,
          coverUrl: base.coverUrl, // Legacy field
          coverAlt: base.coverAlt,
          sourceName: base.sourceName,
          readingMinutes: base.readingMinutes,
          isFeatured: index < 5,
          isActive: true,
          isPublished: true, // Legacy field
          publishedAt: new Date(now.getTime() - index * 86400000),
        },
        create: {
          slug,
          locale: 'en', // Legacy articles are in English
          title: base.title,
          excerpt: base.excerpt,
          tags: base.tags,
          bodyMarkdown: base.contentMd.trim(),
          contentHtml: null,
          heroImageUrl: base.coverUrl,
          coverUrl: base.coverUrl, // Legacy field
          coverAlt: base.coverAlt,
          sourceName: base.sourceName,
          readingMinutes: base.readingMinutes,
          isFeatured: index < 5,
          isActive: true,
          isPublished: true, // Legacy field
          publishedAt: new Date(now.getTime() - index * 86400000),
        },
      });
      console.log(`✅ Seeded legacy article: ${slug} (en)`);
    } catch (error) {
      console.error(`❌ Error seeding legacy article ${slug}:`, error);
      // Continue with next article instead of failing completely
    }
  }

  console.log(`✅ Seeded ${articles.length} legacy articles`);
}

main()
  .then(() => {
    console.log('✅ All articles seeded successfully');
  })
  .catch((error) => {
    console.error('❌ Seed articles error', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


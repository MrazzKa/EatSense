/**
 * Food Catalog for Personalized Suggestions
 * Static database of ~60 foods with localization, tags, and allergens
 */

import { SupportedLocale } from './suggestions.types';

export interface CatalogFood {
    id: string;
    nameEn: string;
    nameRu: string;
    nameKk?: string;
    category: 'protein' | 'fiber' | 'complex_carb' | 'healthy_fat' | 'snack';
    tags: ('vegan' | 'vegetarian' | 'gluten_free' | 'budget' | 'no_cook' | 'quick')[];
    allergens: string[]; // 'milk', 'nuts', 'fish', 'eggs', 'gluten', 'soy'
    prepTimeMin?: number;
    kcalPer100g?: number;
    proteinPer100g?: number;
}

export const FOOD_CATALOG: CatalogFood[] = [
    // === PROTEIN ===
    { id: 'cottage_cheese', nameEn: 'Cottage cheese', nameRu: 'Творог', nameKk: 'Iрімшік', category: 'protein', tags: ['vegetarian', 'no_cook', 'quick'], allergens: ['milk'], kcalPer100g: 98, proteinPer100g: 11 },
    { id: 'greek_yogurt', nameEn: 'Greek yogurt', nameRu: 'Греческий йогурт', nameKk: 'Грек йогурты', category: 'protein', tags: ['vegetarian', 'no_cook', 'quick'], allergens: ['milk'], kcalPer100g: 59, proteinPer100g: 10 },
    { id: 'eggs', nameEn: 'Eggs', nameRu: 'Яйца', nameKk: 'Жұмыртқа', category: 'protein', tags: ['vegetarian', 'quick', 'budget'], allergens: ['eggs'], kcalPer100g: 155, proteinPer100g: 13 },
    { id: 'chicken_breast', nameEn: 'Chicken breast', nameRu: 'Куриная грудка', nameKk: 'Тауық кеудесі', category: 'protein', tags: ['gluten_free'], allergens: [], kcalPer100g: 165, proteinPer100g: 31 },
    { id: 'salmon', nameEn: 'Salmon', nameRu: 'Лосось', nameKk: 'Лосось', category: 'protein', tags: ['gluten_free'], allergens: ['fish'], kcalPer100g: 208, proteinPer100g: 20 },
    { id: 'tuna', nameEn: 'Tuna', nameRu: 'Тунец', nameKk: 'Тунец', category: 'protein', tags: ['gluten_free', 'quick'], allergens: ['fish'], kcalPer100g: 132, proteinPer100g: 29 },
    { id: 'turkey', nameEn: 'Turkey', nameRu: 'Индейка', nameKk: 'Күркетауық', category: 'protein', tags: ['gluten_free'], allergens: [], kcalPer100g: 135, proteinPer100g: 29 },
    { id: 'tofu', nameEn: 'Tofu', nameRu: 'Тофу', nameKk: 'Тофу', category: 'protein', tags: ['vegan', 'vegetarian', 'gluten_free'], allergens: ['soy'], kcalPer100g: 76, proteinPer100g: 8 },
    { id: 'lentils', nameEn: 'Lentils', nameRu: 'Чечевица', nameKk: 'Жасымық', category: 'protein', tags: ['vegan', 'vegetarian', 'gluten_free', 'budget'], allergens: [], kcalPer100g: 116, proteinPer100g: 9 },
    { id: 'chickpeas', nameEn: 'Chickpeas', nameRu: 'Нут', nameKk: 'Нұт', category: 'protein', tags: ['vegan', 'vegetarian', 'gluten_free', 'budget'], allergens: [], kcalPer100g: 164, proteinPer100g: 9 },
    { id: 'beef_lean', nameEn: 'Lean beef', nameRu: 'Постная говядина', nameKk: 'Арық сиыр еті', category: 'protein', tags: ['gluten_free'], allergens: [], kcalPer100g: 250, proteinPer100g: 26 },

    // === FIBER ===
    { id: 'oats', nameEn: 'Oats', nameRu: 'Овсянка', nameKk: 'Сұлы', category: 'fiber', tags: ['vegan', 'vegetarian', 'budget'], allergens: ['gluten'], kcalPer100g: 68, proteinPer100g: 2.5 },
    { id: 'broccoli', nameEn: 'Broccoli', nameRu: 'Брокколи', nameKk: 'Брокколи', category: 'fiber', tags: ['vegan', 'vegetarian', 'gluten_free', 'budget'], allergens: [], kcalPer100g: 34, proteinPer100g: 2.8 },
    { id: 'spinach', nameEn: 'Spinach', nameRu: 'Шпинат', nameKk: 'Шпинат', category: 'fiber', tags: ['vegan', 'vegetarian', 'gluten_free', 'quick'], allergens: [], kcalPer100g: 23, proteinPer100g: 2.9 },
    { id: 'beans', nameEn: 'Beans', nameRu: 'Фасоль', nameKk: 'Бұршақ', category: 'fiber', tags: ['vegan', 'vegetarian', 'gluten_free', 'budget'], allergens: [], kcalPer100g: 127, proteinPer100g: 8.7 },
    { id: 'berries', nameEn: 'Berries', nameRu: 'Ягоды', nameKk: 'Жидектер', category: 'fiber', tags: ['vegan', 'vegetarian', 'gluten_free', 'no_cook'], allergens: [], kcalPer100g: 57, proteinPer100g: 0.7 },
    { id: 'apple', nameEn: 'Apple', nameRu: 'Яблоко', nameKk: 'Алма', category: 'fiber', tags: ['vegan', 'vegetarian', 'gluten_free', 'no_cook', 'budget'], allergens: [], kcalPer100g: 52, proteinPer100g: 0.3 },
    { id: 'pear', nameEn: 'Pear', nameRu: 'Груша', nameKk: 'Алмұрт', category: 'fiber', tags: ['vegan', 'vegetarian', 'gluten_free', 'no_cook'], allergens: [], kcalPer100g: 57, proteinPer100g: 0.4 },
    { id: 'cabbage', nameEn: 'Cabbage', nameRu: 'Капуста', nameKk: 'Қырыққабат', category: 'fiber', tags: ['vegan', 'vegetarian', 'gluten_free', 'budget'], allergens: [], kcalPer100g: 25, proteinPer100g: 1.3 },
    { id: 'carrots', nameEn: 'Carrots', nameRu: 'Морковь', nameKk: 'Сәбіз', category: 'fiber', tags: ['vegan', 'vegetarian', 'gluten_free', 'budget'], allergens: [], kcalPer100g: 41, proteinPer100g: 0.9 },

    // === COMPLEX CARBS ===
    { id: 'buckwheat', nameEn: 'Buckwheat', nameRu: 'Гречка', nameKk: 'Қарақұмық', category: 'complex_carb', tags: ['vegan', 'vegetarian', 'gluten_free', 'budget'], allergens: [], kcalPer100g: 110, proteinPer100g: 4 },
    { id: 'quinoa', nameEn: 'Quinoa', nameRu: 'Киноа', nameKk: 'Киноа', category: 'complex_carb', tags: ['vegan', 'vegetarian', 'gluten_free'], allergens: [], kcalPer100g: 120, proteinPer100g: 4.4 },
    { id: 'brown_rice', nameEn: 'Brown rice', nameRu: 'Бурый рис', nameKk: 'Қоңыр күріш', category: 'complex_carb', tags: ['vegan', 'vegetarian', 'gluten_free', 'budget'], allergens: [], kcalPer100g: 111, proteinPer100g: 2.6 },
    { id: 'sweet_potato', nameEn: 'Sweet potato', nameRu: 'Батат', nameKk: 'Тәтті картоп', category: 'complex_carb', tags: ['vegan', 'vegetarian', 'gluten_free'], allergens: [], kcalPer100g: 86, proteinPer100g: 1.6 },
    { id: 'whole_grain_bread', nameEn: 'Whole grain bread', nameRu: 'Цельнозерновой хлеб', nameKk: 'Толық дәнді нан', category: 'complex_carb', tags: ['vegan', 'vegetarian', 'budget'], allergens: ['gluten'], kcalPer100g: 247 },
    { id: 'pasta_whole', nameEn: 'Whole wheat pasta', nameRu: 'Цельнозерновые макароны', nameKk: 'Толық дәнді макарон', category: 'complex_carb', tags: ['vegan', 'vegetarian'], allergens: ['gluten'], kcalPer100g: 124 },

    // === HEALTHY FATS ===
    { id: 'avocado', nameEn: 'Avocado', nameRu: 'Авокадо', nameKk: 'Авокадо', category: 'healthy_fat', tags: ['vegan', 'vegetarian', 'gluten_free', 'no_cook'], allergens: [], kcalPer100g: 160, proteinPer100g: 2 },
    { id: 'almonds', nameEn: 'Almonds', nameRu: 'Миндаль', nameKk: 'Бадам', category: 'healthy_fat', tags: ['vegan', 'vegetarian', 'gluten_free', 'no_cook'], allergens: ['nuts'], kcalPer100g: 579, proteinPer100g: 21 },
    { id: 'walnuts', nameEn: 'Walnuts', nameRu: 'Грецкие орехи', nameKk: 'Грек жаңғағы', category: 'healthy_fat', tags: ['vegan', 'vegetarian', 'gluten_free', 'no_cook'], allergens: ['nuts'], kcalPer100g: 654, proteinPer100g: 15 },
    { id: 'olive_oil', nameEn: 'Olive oil', nameRu: 'Оливковое масло', nameKk: 'Зәйтүн майы', category: 'healthy_fat', tags: ['vegan', 'vegetarian', 'gluten_free'], allergens: [], kcalPer100g: 884 },
    { id: 'flax_seeds', nameEn: 'Flax seeds', nameRu: 'Семена льна', nameKk: 'Зығыр тұқымы', category: 'healthy_fat', tags: ['vegan', 'vegetarian', 'gluten_free', 'no_cook'], allergens: [], kcalPer100g: 534, proteinPer100g: 18 },
    { id: 'chia_seeds', nameEn: 'Chia seeds', nameRu: 'Семена чиа', nameKk: 'Чиа тұқымы', category: 'healthy_fat', tags: ['vegan', 'vegetarian', 'gluten_free', 'no_cook'], allergens: [], kcalPer100g: 486, proteinPer100g: 17 },

    // === SNACKS ===
    { id: 'dark_chocolate', nameEn: 'Dark chocolate (70%+)', nameRu: 'Темный шоколад (70%+)', nameKk: 'Қара шоколад', category: 'snack', tags: ['vegetarian', 'gluten_free', 'no_cook'], allergens: ['milk'], kcalPer100g: 598 },
    { id: 'hummus', nameEn: 'Hummus', nameRu: 'Хумус', nameKk: 'Хумус', category: 'snack', tags: ['vegan', 'vegetarian', 'gluten_free'], allergens: [], kcalPer100g: 166, proteinPer100g: 8 },
];

export interface RecipeTemplate {
    id: string;
    titleEn: string;
    titleRu: string;
    descriptionEn: string;
    descriptionRu: string;
    ingredients: string[]; // catalog food IDs
    category: 'protein' | 'fiber' | 'balanced' | 'healthy_fat';
    tags: string[];
    prepTimeMin: number;
}

export const RECIPE_TEMPLATES: RecipeTemplate[] = [
    // Protein recipes
    {
        id: 'cottage_berries',
        titleEn: 'Cottage cheese with berries',
        titleRu: 'Творог с ягодами',
        descriptionEn: 'Mix cottage cheese with fresh berries. Add honey if desired.',
        descriptionRu: 'Смешай творог с ягодами. Добавь мёд по вкусу.',
        ingredients: ['cottage_cheese', 'berries'],
        category: 'protein',
        tags: ['5min', 'no_cook', 'high_protein'],
        prepTimeMin: 5,
    },
    {
        id: 'eggs_avocado',
        titleEn: 'Scrambled eggs with avocado',
        titleRu: 'Яичница с авокадо',
        descriptionEn: 'Scramble 2-3 eggs, serve with sliced avocado.',
        descriptionRu: 'Приготовь яичницу из 2-3 яиц, подавай с нарезанным авокадо.',
        ingredients: ['eggs', 'avocado'],
        category: 'protein',
        tags: ['10min', 'high_protein', 'keto'],
        prepTimeMin: 10,
    },
    {
        id: 'greek_yogurt_nuts',
        titleEn: 'Greek yogurt with nuts',
        titleRu: 'Греческий йогурт с орехами',
        descriptionEn: 'Top Greek yogurt with a handful of almonds or walnuts.',
        descriptionRu: 'Добавь горсть миндаля или грецких орехов в греческий йогурт.',
        ingredients: ['greek_yogurt', 'almonds'],
        category: 'protein',
        tags: ['5min', 'no_cook', 'high_protein'],
        prepTimeMin: 5,
    },
    {
        id: 'chicken_buckwheat',
        titleEn: 'Chicken with buckwheat',
        titleRu: 'Курица с гречкой',
        descriptionEn: 'Grill chicken breast, serve with cooked buckwheat and vegetables.',
        descriptionRu: 'Обжарь куриную грудку, подавай с варёной гречкой и овощами.',
        ingredients: ['chicken_breast', 'buckwheat', 'broccoli'],
        category: 'balanced',
        tags: ['20min', 'high_protein', 'budget'],
        prepTimeMin: 20,
    },
    // Fiber recipes
    {
        id: 'oatmeal_berries',
        titleEn: 'Oatmeal with berries',
        titleRu: 'Овсянка с ягодами',
        descriptionEn: 'Cook oats with water or milk, top with fresh berries.',
        descriptionRu: 'Свари овсянку на воде или молоке, добавь ягоды сверху.',
        ingredients: ['oats', 'berries'],
        category: 'fiber',
        tags: ['10min', 'high_fiber', 'budget'],
        prepTimeMin: 10,
    },
    {
        id: 'veggie_salad',
        titleEn: 'Green vegetable salad',
        titleRu: 'Зелёный овощной салат',
        descriptionEn: 'Mix spinach, broccoli, and carrots. Dress with olive oil.',
        descriptionRu: 'Смешай шпинат, брокколи и морковь. Заправь оливковым маслом.',
        ingredients: ['spinach', 'broccoli', 'carrots', 'olive_oil'],
        category: 'fiber',
        tags: ['10min', 'high_fiber', 'vegan'],
        prepTimeMin: 10,
    },
    {
        id: 'apple_almonds',
        titleEn: 'Apple with almond butter',
        titleRu: 'Яблоко с миндальной пастой',
        descriptionEn: 'Slice apple and dip in almond butter for a quick snack.',
        descriptionRu: 'Нарежь яблоко и макай в миндальную пасту.',
        ingredients: ['apple', 'almonds'],
        category: 'fiber',
        tags: ['5min', 'no_cook', 'high_fiber'],
        prepTimeMin: 5,
    },
    // Healthy fat recipes
    {
        id: 'salmon_quinoa',
        titleEn: 'Salmon with quinoa',
        titleRu: 'Лосось с киноа',
        descriptionEn: 'Bake salmon, serve with quinoa and steamed vegetables.',
        descriptionRu: 'Запеки лосось, подавай с киноа и тушёными овощами.',
        ingredients: ['salmon', 'quinoa', 'broccoli'],
        category: 'healthy_fat',
        tags: ['25min', 'omega3', 'gluten_free'],
        prepTimeMin: 25,
    },
    {
        id: 'avocado_toast',
        titleEn: 'Avocado toast with eggs',
        titleRu: 'Тост с авокадо и яйцом',
        descriptionEn: 'Mash avocado on whole grain toast, top with poached egg.',
        descriptionRu: 'Разомни авокадо на цельнозерновом тосте, добавь яйцо.',
        ingredients: ['avocado', 'whole_grain_bread', 'eggs'],
        category: 'healthy_fat',
        tags: ['10min', 'vegetarian'],
        prepTimeMin: 10,
    },
    {
        id: 'chia_pudding',
        titleEn: 'Chia pudding',
        titleRu: 'Чиа-пудинг',
        descriptionEn: 'Mix chia seeds with milk, refrigerate overnight. Top with berries.',
        descriptionRu: 'Смешай семена чиа с молоком, оставь на ночь в холодильнике. Добавь ягоды.',
        ingredients: ['chia_seeds', 'berries'],
        category: 'healthy_fat',
        tags: ['5min', 'no_cook', 'meal_prep'],
        prepTimeMin: 5,
    },
];

/**
 * Get localized food name
 */
export function getFoodName(food: CatalogFood, locale: SupportedLocale): string {
    switch (locale) {
        case 'ru': return food.nameRu;
        case 'kk': return food.nameKk || food.nameRu;
        default: return food.nameEn;
    }
}

/**
 * Get localized recipe title
 */
export function getRecipeTitle(recipe: RecipeTemplate, locale: SupportedLocale): string {
    return locale === 'ru' || locale === 'kk' ? recipe.titleRu : recipe.titleEn;
}

/**
 * Get localized recipe description
 */
export function getRecipeDescription(recipe: RecipeTemplate, locale: SupportedLocale): string {
    return locale === 'ru' || locale === 'kk' ? recipe.descriptionRu : recipe.descriptionEn;
}

/**
 * Filter catalog foods by user preferences and allergies
 */
export function filterCatalogFoods(
    foods: CatalogFood[],
    dietaryPreferences: string[],
    allergies: string[],
    recentFoodIds: Set<string>,
): CatalogFood[] {
    return foods.filter((food) => {
        // Skip if recently consumed (but allow 1 repeat if list gets too short)
        if (recentFoodIds.has(food.id)) return false;

        // Vegetarian filter
        if (dietaryPreferences.includes('vegetarian') && !food.tags.includes('vegetarian')) {
            return false;
        }

        // Vegan filter
        if (dietaryPreferences.includes('vegan') && !food.tags.includes('vegan')) {
            return false;
        }

        // Gluten-free filter
        if (dietaryPreferences.includes('gluten_free') && !food.tags.includes('gluten_free')) {
            return false;
        }

        // Allergy filter
        for (const allergy of allergies) {
            if (food.allergens.includes(allergy.toLowerCase())) {
                return false;
            }
        }

        return true;
    });
}

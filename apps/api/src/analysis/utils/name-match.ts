/**
 * Name Matching Utilities for Nutrition Provider Validation
 * 
 * Provides deterministic text matching to validate that provider results
 * semantically match the original query. Used to filter out irrelevant
 * processed/packaged foods when searching for ingredients.
 */

// =============================================================================
// TEXT NORMALIZATION
// =============================================================================

/**
 * Normalize text for matching: lowercase, remove punctuation, collapse spaces
 */
export function normalizeText(s: string): string {
    if (!s) return '';
    return s
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')  // Replace non-letter/number with space
        .replace(/\s+/g, ' ')               // Collapse multiple spaces
        .trim();
}

/**
 * Tokenize text into words, dropping very short tokens
 */
export function tokenize(s: string): string[] {
    const normalized = normalizeText(s);
    const tokens = normalized.split(' ').filter(t => t.length > 0);

    // Keep short tokens if they're common food words
    const shortFoodWords = new Set(['egg', 'ham', 'nut', 'oil', 'tea', 'pea', 'rye', 'fig', 'cod', 'eel']);

    return tokens.filter(t => t.length >= 3 || shortFoodWords.has(t));
}

/**
 * Simple English singularization (minimal, no external deps)
 */
export function singularizeEn(token: string): string {
    if (token.length < 4) return token;

    // Special cases
    const irregulars: Record<string, string> = {
        'tomatoes': 'tomato',
        'potatoes': 'potato',
        'mushrooms': 'mushroom',
        'champignons': 'champignon',
        'vegetables': 'vegetable',
        'berries': 'berry',
        'cherries': 'cherry',
        'leaves': 'leaf',
    };

    if (irregulars[token]) return irregulars[token];

    // ies -> y (berries -> berry)
    if (token.endsWith('ies') && token.length > 4) {
        return token.slice(0, -3) + 'y';
    }

    // es -> e for some words (tomatoes -> tomato handled above)
    if (token.endsWith('es') && token.length > 4) {
        const base = token.slice(0, -2);
        // Only for -oes, -shes, -ches, -xes, -sses
        if (token.endsWith('oes') || token.endsWith('shes') ||
            token.endsWith('ches') || token.endsWith('xes') || token.endsWith('sses')) {
            return base;
        }
        return token.slice(0, -1); // Just remove 's'
    }

    // Simple trailing 's' removal
    if (token.endsWith('s') && !token.endsWith('ss')) {
        return token.slice(0, -1);
    }

    return token;
}

/**
 * Normalize and singularize tokens
 */
export function normalizeTokens(tokens: string[]): string[] {
    return tokens.map(singularizeEn);
}

// =============================================================================
// SYNONYMS
// =============================================================================

const SYNONYM_MAP: Record<string, string[]> = {
    'mushroom': ['champignon', 'champignons', 'mushrooms'],
    'champignon': ['mushroom', 'mushrooms'],
    'tomato': ['tomatoes'],
    'tomatoes': ['tomato'],
    'cucumber': ['cucumbers'],
    'cucumbers': ['cucumber'],
    'pepper': ['peppers', 'capsicum'],
    'peppers': ['pepper', 'capsicum'],
    'corn': ['maize', 'sweetcorn'],
    'maize': ['corn', 'sweetcorn'],
    'eggplant': ['aubergine'],
    'aubergine': ['eggplant'],
    'zucchini': ['courgette'],
    'courgette': ['zucchini'],
    'cilantro': ['coriander'],
    'coriander': ['cilantro'],
    'chicken': ['poultry'],
    'beef': ['steak'],
    'pork': ['ham', 'bacon'],
    // Russian synonyms
    'грибы': ['шампиньоны', 'гриб'],
    'шампиньоны': ['грибы', 'шампиньон'],
    'помидоры': ['томаты', 'помидор', 'томат'],
    'томаты': ['помидоры', 'помидор', 'томат'],
    'огурцы': ['огурец'],
    'морковь': ['морковка'],
    'картофель': ['картошка'],
    'курица': ['курятина', 'куриц'],
};

/**
 * Get synonym variants for a token
 */
export function getSynonyms(token: string): string[] {
    const singular = singularizeEn(token);
    const synonyms = new Set<string>([token, singular]);

    if (SYNONYM_MAP[token]) {
        SYNONYM_MAP[token].forEach(s => synonyms.add(s));
    }
    if (SYNONYM_MAP[singular]) {
        SYNONYM_MAP[singular].forEach(s => synonyms.add(s));
    }

    return Array.from(synonyms);
}

/**
 * Apply synonyms to tokens array
 */
export function applySynonyms(tokens: string[]): string[] {
    const result = new Set<string>();
    for (const token of tokens) {
        getSynonyms(token).forEach(s => result.add(s));
    }
    return Array.from(result);
}

// =============================================================================
// COOKING ADJECTIVES TO REMOVE
// =============================================================================

const COOKING_ADJECTIVES = new Set([
    'cooked', 'raw', 'boiled', 'fried', 'grilled', 'baked', 'roasted',
    'steamed', 'poached', 'sauteed', 'braised', 'stew', 'stewed',
    'fresh', 'dried', 'frozen', 'canned', 'organic', 'natural',
    'sliced', 'diced', 'chopped', 'minced', 'grated', 'whole',
    // Russian
    'вареный', 'жареный', 'тушеный', 'запеченный', 'сырой', 'свежий',
    'отварной', 'припущенный', 'нарезанный', 'тертый',
]);

/**
 * Remove cooking adjectives from tokens
 */
export function removeCookingAdjectives(tokens: string[]): string[] {
    return tokens.filter(t => !COOKING_ADJECTIVES.has(t));
}

// =============================================================================
// QUERY VARIANTS
// =============================================================================

/**
 * Build multiple query variants for matching
 */
export function buildQueryVariants(query: string): string[] {
    const variants = new Set<string>();

    // 1. Base normalized query
    const normalized = normalizeText(query);
    variants.add(normalized);

    // 2. Tokenize
    const tokens = tokenize(query);
    const normalizedTokens = normalizeTokens(tokens);

    // 3. Version without cooking adjectives
    const withoutCooking = removeCookingAdjectives(normalizedTokens);
    if (withoutCooking.length > 0) {
        variants.add(withoutCooking.join(' '));
    }

    // 4. Singularized variant
    variants.add(normalizedTokens.join(' '));

    // 5. Synonym variants (for main food token - first non-cooking token)
    const mainToken = withoutCooking[0] || normalizedTokens[0];
    if (mainToken) {
        const synonymTokens = getSynonyms(mainToken);
        for (const syn of synonymTokens) {
            if (syn !== mainToken) {
                const synVariant = [syn, ...withoutCooking.slice(1)].join(' ');
                variants.add(synVariant);
            }
        }
    }

    return Array.from(variants).filter(v => v.length > 0);
}

// =============================================================================
// NAME MATCH SCORING
// =============================================================================

/**
 * Calculate name match score between query and candidate (0 to 1)
 * 
 * Uses token Jaccard similarity + bonuses for substring and head matches.
 */
export function nameMatchScore(query: string, candidate: string): number {
    if (!query || !candidate) return 0;

    const qTokens = new Set(normalizeTokens(tokenize(query)));
    const cTokens = new Set(normalizeTokens(tokenize(candidate)));

    if (qTokens.size === 0) return 0;

    // Token intersection
    const intersection = new Set([...qTokens].filter(t => cTokens.has(t)));

    // Also check synonyms for intersection
    for (const qt of qTokens) {
        const synonyms = getSynonyms(qt);
        for (const syn of synonyms) {
            if (cTokens.has(syn)) {
                intersection.add(qt);
            }
        }
    }

    // Token Jaccard: |q∩c| / |q|
    const tokenJaccard = intersection.size / qTokens.size;

    // Substring bonus: if candidate contains the full normalized query
    const normalizedQuery = normalizeText(query);
    const normalizedCandidate = normalizeText(candidate);
    let substringBonus = 0;
    if (normalizedCandidate.includes(normalizedQuery) || intersection.size >= 2) {
        substringBonus = 0.15;
    }

    // Head match bonus: if candidate starts with one of query tokens
    let headMatchBonus = 0;
    const candidateWords = normalizedCandidate.split(' ');
    if (candidateWords.length > 0) {
        const firstWord = singularizeEn(candidateWords[0]);
        for (const qt of qTokens) {
            if (firstWord === qt || getSynonyms(qt).includes(firstWord)) {
                headMatchBonus = 0.10;
                break;
            }
        }
    }

    // Final score
    const score = tokenJaccard + substringBonus + headMatchBonus;
    return Math.min(1, Math.max(0, score));
}

// =============================================================================
// PROCESSED FOOD DETECTION
// =============================================================================

const PROCESSED_FOOD_KEYWORDS = new Set([
    // English
    'pasta', 'fettuccine', 'spaghetti', 'penne', 'noodle', 'noodles',
    'sauce', 'chilli', 'chili', 'ketchup', 'mayonnaise', 'dressing',
    'pizza', 'lasagna', 'lasagne', 'burger', 'hamburger', 'sandwich',
    'nugget', 'nuggets', 'fingers', 'strips',
    'ready', 'meal', 'prepared', 'instant', 'frozen',
    'soup', 'broth', 'stock',
    'salad', 'mix', 'blend',
    'chips', 'crisps', 'snack',
    'cereal', 'granola', 'bar',
    'drink', 'beverage', 'juice',
    // Product indicators
    'brand', 'chef', 'plant', 'vegan', 'organic', 'bio',
]);

const PROCESSED_CATEGORY_KEYWORDS = [
    'sauce', 'ready', 'meal', 'prepared', 'snack', 'beverage', 'pasta',
];

/**
 * Check if a product name/category indicates processed/packaged food
 */
export function isLikelyProcessedFood(name: string, categoriesText?: string): boolean {
    const nameLower = normalizeText(name);
    const tokens = tokenize(nameLower);

    // Check name tokens
    for (const token of tokens) {
        if (PROCESSED_FOOD_KEYWORDS.has(token)) {
            return true;
        }
    }

    // Check categories
    if (categoriesText) {
        const catLower = categoriesText.toLowerCase();
        for (const keyword of PROCESSED_CATEGORY_KEYWORDS) {
            if (catLower.includes(keyword)) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Keywords that indicate the query ITSELF is for a processed food
 */
const PROCESSED_QUERY_KEYWORDS = new Set([
    'pasta', 'sauce', 'soup', 'salad', 'burger', 'nuggets', 'pizza',
    'sandwich', 'wrap', 'lasagna', 'noodle', 'chips',
    'паста', 'соус', 'суп', 'салат', 'бургер', 'пицца', 'лапша',
]);

/**
 * Check if the query itself implies a processed food
 */
export function queryImpliesProcessed(query: string): boolean {
    const tokens = tokenize(query);
    for (const token of tokens) {
        if (PROCESSED_QUERY_KEYWORDS.has(token) || PROCESSED_QUERY_KEYWORDS.has(singularizeEn(token))) {
            return true;
        }
    }
    return false;
}

// =============================================================================
// CONTEXT MODE
// =============================================================================

export type LookupMode = 'ingredient' | 'packaged';

/**
 * Determine lookup mode from context
 */
export function getLookupMode(context: { mode?: LookupMode; isBarcode?: boolean }): LookupMode {
    if (context.mode) return context.mode;
    if (context.isBarcode) return 'packaged';
    return 'ingredient'; // Default for image analysis
}

// =============================================================================
// MATCH VALIDATION THRESHOLDS
// =============================================================================

export const MATCH_THRESHOLDS = {
    /** Below this, reject in ingredient mode */
    HARD_REJECT: 0.55,  // Must-tokens provides additional validation
    /** Below this but above HARD_REJECT, mark as suspicious */
    SUSPICIOUS: 0.70,
    /** Minimum confidence to accept a result */
    MIN_CONFIDENCE: 0.55,
};

// =============================================================================
// MUST-TOKENS VALIDATION
// =============================================================================

/**
 * Generic stopwords to filter from must-tokens
 */
const MUST_TOKEN_STOPWORDS = new Set([
    // English
    'mixed', 'restaurant', 'homemade', 'style', 'type', 'kind',
    'small', 'medium', 'large', 'big', 'little',
    'piece', 'pieces', 'serving', 'portion', 'cup', 'cups',
    'gram', 'grams', 'ounce', 'ounces', 'lb', 'lbs',
    // Already filtered by COOKING_ADJECTIVES, but ensure:
    'cooked', 'raw', 'fresh', 'organic', 'natural',
    // Russian
    'смешанный', 'домашний', 'ресторанный', 'порция',
]);

/**
 * Extract must-tokens: key tokens that MUST appear in matching candidate
 * Filters out cooking adjectives, stopwords, and very short tokens
 */
export function extractMustTokens(query: string): string[] {
    const tokens = normalizeTokens(tokenize(query));
    const withoutCooking = removeCookingAdjectives(tokens);

    // Filter stopwords and keep substantive tokens
    const mustTokens = withoutCooking.filter(t =>
        t.length >= 3 && !MUST_TOKEN_STOPWORDS.has(t)
    );

    // If nothing left, fall back to first token from original
    if (mustTokens.length === 0 && tokens.length > 0) {
        return [tokens[0]];
    }

    return mustTokens;
}

/**
 * Check if candidate contains at least one must-token (or synonym) from query
 * 
 * @returns true if at least one must-token matches
 */
export function mustTokensMatch(query: string, candidate: string): boolean {
    const mustTokens = extractMustTokens(query);
    if (mustTokens.length === 0) return true; // No must-tokens = accept anything

    const candTokens = normalizeTokens(tokenize(candidate));
    const candTokenSet = new Set(candTokens);

    // Expand candidate tokens with synonyms
    const candWithSynonyms = new Set<string>();
    for (const t of candTokens) {
        candWithSynonyms.add(t);
        getSynonyms(t).forEach(s => candWithSynonyms.add(s));
    }

    // Check if ANY must-token (or its synonym) is in candidate
    for (const mt of mustTokens) {
        if (candWithSynonyms.has(mt)) return true;
        // Also check synonyms of must-token
        for (const syn of getSynonyms(mt)) {
            if (candWithSynonyms.has(syn)) return true;
        }
    }

    return false;
}

/**
 * Combined validation: score threshold + must-tokens
 * 
 * @returns { isValid, reason }
 */
export function validateMatch(
    query: string,
    candidate: string,
    mode: 'ingredient' | 'packaged' = 'ingredient'
): { isValid: boolean; isSuspicious: boolean; reason?: string; matchScore: number; mustTokensHit: boolean } {
    const matchScore = nameMatchScore(query, candidate);
    const mustTokensHit = mustTokensMatch(query, candidate);

    // =========================================================================
    // STAGE 5 FIX: Category constraint for paste/sauce/chili queries
    // Prevent "red chili paste" → "Cabbage, red, raw" mismatches
    // =========================================================================
    const PASTE_SAUCE_KEYWORDS = ['paste', 'sauce', 'chili', 'chilli', 'gochujang', 'sriracha', 'harissa', 'sambal'];
    const VEGETABLE_KEYWORDS = ['cabbage', 'lettuce', 'salad', 'carrot', 'broccoli', 'spinach', 'kale', 'celery'];

    const queryLower = query.toLowerCase();
    const candidateLower = candidate.toLowerCase();

    const queryIsPasteSauce = PASTE_SAUCE_KEYWORDS.some(kw => queryLower.includes(kw));
    const candidateIsVegetable = VEGETABLE_KEYWORDS.some(kw => candidateLower.includes(kw));

    if (queryIsPasteSauce && candidateIsVegetable) {
        return {
            isValid: false,
            isSuspicious: true,
            reason: `Category mismatch: paste/sauce query "${query}" cannot match vegetable "${candidate}"`,
            matchScore,
            mustTokensHit,
        };
    }

    // In packaged mode, be more lenient (barcode lookups)
    if (mode === 'packaged') {
        return {
            isValid: matchScore >= 0.40,
            isSuspicious: matchScore < 0.60,
            matchScore,
            mustTokensHit,
        };
    }

    // Ingredient mode: strict validation
    if (!mustTokensHit) {
        return {
            isValid: false,
            isSuspicious: true,
            reason: 'No must-token overlap',
            matchScore,
            mustTokensHit: false,
        };
    }

    if (matchScore < MATCH_THRESHOLDS.HARD_REJECT) {
        return {
            isValid: false,
            isSuspicious: true,
            reason: `matchScore ${matchScore.toFixed(2)} < ${MATCH_THRESHOLDS.HARD_REJECT}`,
            matchScore,
            mustTokensHit,
        };
    }

    return {
        isValid: true,
        isSuspicious: matchScore < MATCH_THRESHOLDS.SUSPICIOUS,
        matchScore,
        mustTokensHit,
    };
}

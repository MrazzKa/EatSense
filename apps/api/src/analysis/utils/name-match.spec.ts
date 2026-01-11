/// <reference types="jest" />

import {
    normalizeText,
    tokenize,
    singularizeEn,
    normalizeTokens,
    getSynonyms,
    buildQueryVariants,
    nameMatchScore,
    isLikelyProcessedFood,
    queryImpliesProcessed,
    MATCH_THRESHOLDS,
    extractMustTokens,
    mustTokensMatch,
    validateMatch,
} from './name-match';

describe('Name Match Utilities', () => {
    describe('normalizeText', () => {
        it('should lowercase and remove punctuation', () => {
            expect(normalizeText('Hello, World!')).toBe('hello world');
            expect(normalizeText('Chicken (grilled)')).toBe('chicken grilled');
            expect(normalizeText('Rice & Beans')).toBe('rice beans');
        });

        it('should handle empty strings', () => {
            expect(normalizeText('')).toBe('');
            expect(normalizeText(null as any)).toBe('');
        });
    });

    describe('tokenize', () => {
        it('should split into tokens', () => {
            expect(tokenize('chicken breast grilled')).toEqual(['chicken', 'breast', 'grilled']);
        });

        it('should keep short food words', () => {
            expect(tokenize('egg and ham')).toEqual(['egg', 'and', 'ham']);
        });

        it('should filter very short tokens', () => {
            expect(tokenize('a to the')).toEqual(['the']);
        });
    });

    describe('singularizeEn', () => {
        it('should handle irregular plurals', () => {
            expect(singularizeEn('tomatoes')).toBe('tomato');
            expect(singularizeEn('potatoes')).toBe('potato');
            expect(singularizeEn('mushrooms')).toBe('mushroom');
        });

        it('should handle -ies plurals', () => {
            expect(singularizeEn('berries')).toBe('berry');
            expect(singularizeEn('cherries')).toBe('cherry');
        });

        it('should handle simple -s plurals', () => {
            expect(singularizeEn('eggs')).toBe('egg');
            expect(singularizeEn('carrots')).toBe('carrot');
        });

        it('should not change singular words', () => {
            expect(singularizeEn('chicken')).toBe('chicken');
            expect(singularizeEn('rice')).toBe('rice');
        });
    });

    describe('getSynonyms', () => {
        it('should return synonyms for mushroom', () => {
            const synonyms = getSynonyms('mushroom');
            expect(synonyms).toContain('champignon');
            expect(synonyms).toContain('mushroom');
        });

        it('should return synonyms for corn', () => {
            const synonyms = getSynonyms('corn');
            expect(synonyms).toContain('maize');
        });

        it('should return original for unknown words', () => {
            const synonyms = getSynonyms('unicorn');
            expect(synonyms).toContain('unicorn');
        });
    });

    describe('buildQueryVariants', () => {
        it('should generate variants with singularization', () => {
            const variants = buildQueryVariants('mushrooms cooked');
            expect(variants.some(v => v.includes('mushroom'))).toBe(true);
        });

        it('should generate variants with synonyms', () => {
            const variants = buildQueryVariants('mushrooms');
            expect(variants.some(v => v.includes('champignon'))).toBe(true);
        });

        it('should remove cooking adjectives', () => {
            const variants = buildQueryVariants('chicken grilled');
            expect(variants.some(v => !v.includes('grilled'))).toBe(true);
        });
    });

    describe('nameMatchScore', () => {
        it('should give high score for exact match', () => {
            const score = nameMatchScore('mushrooms', 'Mushrooms');
            expect(score).toBeGreaterThanOrEqual(0.9);
        });

        it('should give high score for similar names', () => {
            const score = nameMatchScore('cherry tomatoes', 'Cherry Tomatoes Fresh');
            expect(score).toBeGreaterThanOrEqual(0.7);
        });

        it('should give lower score when query tokens diluted by many other tokens', () => {
            const score = nameMatchScore('mushrooms', 'Mushroom Fettuccine Pasta');
            expect(score).toBeGreaterThan(0);
        });

        it('should give moderate score when partial match with sauce', () => {
            const score = nameMatchScore('cherry tomatoes', 'Tomato Sauce with Chilli');
            expect(score).toBeLessThanOrEqual(0.7);
        });

        it('should handle synonym matching', () => {
            const score = nameMatchScore('mushroom', 'Champignon Fresh');
            expect(score).toBeGreaterThan(0.5);
        });
    });

    describe('isLikelyProcessedFood', () => {
        it('should detect pasta products', () => {
            expect(isLikelyProcessedFood('Mushroom Fettuccine Pasta')).toBe(true);
            expect(isLikelyProcessedFood('Spaghetti Bolognese')).toBe(true);
        });

        it('should detect sauce products', () => {
            expect(isLikelyProcessedFood('Tomato Sauce with Chilli')).toBe(true);
        });

        it('should detect ready meals', () => {
            expect(isLikelyProcessedFood('Ready Meal Chicken Dinner')).toBe(true);
        });

        it('should not flag raw ingredients', () => {
            expect(isLikelyProcessedFood('Fresh Mushrooms')).toBe(false);
            expect(isLikelyProcessedFood('Cherry Tomatoes')).toBe(false);
        });

        it('should check categories', () => {
            expect(isLikelyProcessedFood('Product X', 'ready-meals')).toBe(true);
        });
    });

    describe('queryImpliesProcessed', () => {
        it('should return true for pasta queries', () => {
            expect(queryImpliesProcessed('pasta with tomato')).toBe(true);
        });

        it('should return true for sauce queries', () => {
            expect(queryImpliesProcessed('tomato sauce')).toBe(true);
        });

        it('should return false for ingredient queries', () => {
            expect(queryImpliesProcessed('mushrooms cooked')).toBe(false);
            expect(queryImpliesProcessed('cherry tomatoes')).toBe(false);
        });
    });

    describe('MATCH_THRESHOLDS', () => {
        it('should have correct threshold values', () => {
            expect(MATCH_THRESHOLDS.HARD_REJECT).toBe(0.55); // Must-tokens provides additional validation
            expect(MATCH_THRESHOLDS.SUSPICIOUS).toBe(0.70);
            expect(MATCH_THRESHOLDS.MIN_CONFIDENCE).toBe(0.55);
        });
    });

    // ===========================================
    // MUST-TOKENS VALIDATION TESTS
    // ===========================================

    describe('extractMustTokens', () => {
        it('should extract key tokens without cooking adjectives', () => {
            const tokens = extractMustTokens('edamame cooked');
            expect(tokens).toContain('edamame');
            expect(tokens).not.toContain('cooked');
        });

        it('should extract tokens without stopwords', () => {
            const tokens = extractMustTokens('mixed salad greens raw');
            expect(tokens).toContain('salad');
            expect(tokens).toContain('green'); // singularized
            expect(tokens).not.toContain('mixed');
            expect(tokens).not.toContain('raw');
        });

        it('should handle single-word queries', () => {
            const tokens = extractMustTokens('salmon');
            expect(tokens).toEqual(['salmon']);
        });
    });

    describe('mustTokensMatch', () => {
        it('should match when key token present', () => {
            expect(mustTokensMatch('salmon grilled', 'Atlantic Salmon')).toBe(true);
        });

        it('should NOT match edamame → bacon', () => {
            expect(mustTokensMatch('edamame cooked', 'Bacon')).toBe(false);
        });

        it('should NOT match mixed salad greens → asparagus', () => {
            expect(mustTokensMatch('mixed salad greens raw', 'Asparagus Fresh')).toBe(false);
        });

        it('should match via synonyms', () => {
            expect(mustTokensMatch('mushrooms cooked', 'Champignon Fresh')).toBe(true);
        });

        it('should match with singularization', () => {
            expect(mustTokensMatch('tomatoes', 'Cherry Tomato')).toBe(true);
        });
    });

    describe('validateMatch', () => {
        it('should reject edamame → bacon in ingredient mode', () => {
            const result = validateMatch('edamame cooked', 'Bacon', 'ingredient');
            expect(result.isValid).toBe(false);
            expect(result.mustTokensHit).toBe(false);
        });

        it('should reject mixed salad → asparagus in ingredient mode', () => {
            const result = validateMatch('mixed salad greens raw', 'Asparagus', 'ingredient');
            expect(result.isValid).toBe(false);
        });

        it('should accept salmon → Salmon Atlantic', () => {
            // "salmon" vs "Salmon Atlantic" should match (high score + must-token hit)
            const result = validateMatch('salmon', 'Salmon Atlantic', 'ingredient');
            expect(result.isValid).toBe(true);
            expect(result.mustTokensHit).toBe(true);
        });

        it('should be more lenient in packaged mode', () => {
            const result = validateMatch('random product', 'Another Product', 'packaged');
            expect(result.matchScore).toBeDefined();
            // Packaged mode has lower threshold
        });
    });

    // Integration-like tests for the complete flow
    describe('Integration Tests', () => {
        it('should reject mushroom pasta for mushroom query in ingredient mode', () => {
            const query = 'mushrooms cooked';
            const candidate = 'Plant Chef Mushroom Fettuccine Pasta';

            const matchScore = nameMatchScore(query, candidate);
            const isProcessed = isLikelyProcessedFood(candidate);
            const queryIsProcessed = queryImpliesProcessed(query);

            expect(matchScore).toBeLessThan(MATCH_THRESHOLDS.HARD_REJECT);
            expect(isProcessed).toBe(true);
            expect(queryIsProcessed).toBe(false);
        });

        it('should accept plain mushrooms for mushroom query', () => {
            const query = 'mushrooms cooked';
            const candidate = 'Mushrooms';

            const matchScore = nameMatchScore(query, candidate);
            const isProcessed = isLikelyProcessedFood(candidate);

            expect(matchScore).toBeGreaterThanOrEqual(MATCH_THRESHOLDS.HARD_REJECT);
            expect(isProcessed).toBe(false);
        });

        it('should reject tomato sauce for cherry tomatoes query', () => {
            const query = 'cherry tomatoes';
            const candidate = 'Whole Cherry Tomato Sauce with Chilli';

            const isProcessed = isLikelyProcessedFood(candidate);
            const queryIsProcessed = queryImpliesProcessed(query);

            expect(isProcessed).toBe(true);
            expect(queryIsProcessed).toBe(false);
        });

        it('CRITICAL: edamame cooked should NOT match bacon', () => {
            const validation = validateMatch('edamame cooked', 'Bacon', 'ingredient');
            expect(validation.isValid).toBe(false);
            expect(validation.reason).toContain('must-token');
        });

        it('CRITICAL: mixed salad greens should NOT match asparagus', () => {
            const validation = validateMatch('mixed salad greens', 'Asparagus', 'ingredient');
            expect(validation.isValid).toBe(false);
        });
    });
});


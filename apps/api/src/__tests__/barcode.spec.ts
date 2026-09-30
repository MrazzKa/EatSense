/// <reference types="jest" />

import { BadRequestException } from '@nestjs/common';
import { BarcodeService } from '../../food/barcode.service';
import {
  OpenFoodFactsProvider,
  hasValidCheckDigit,
  normaliseBarcode,
  toPackagedProduct,
} from '../analysis/providers/openfoodfacts.provider';

/**
 * Three things here fail silently rather than loudly.
 *
 * A misread barcode that still happens to exist logs somebody else's product. A
 * unit left in grams where the rest of the codebase means milligrams multiplies
 * a sodium figure by a thousand. And a product whose label nobody has filled in
 * looks exactly like a zero-calorie food unless it is told apart on purpose.
 */

describe('normaliseBarcode', () => {
  it('keeps the digits and drops the rest', () => {
    expect(normaliseBarcode(' 3017-620 422003 ')).toBe('3017620422003');
  });

  it('rejects anything too short or too long to be a barcode', () => {
    expect(normaliseBarcode('1234567')).toBeNull();
    expect(normaliseBarcode('123456789012345')).toBeNull();
    expect(normaliseBarcode('')).toBeNull();
    expect(normaliseBarcode('not a barcode')).toBeNull();
  });
});

describe('hasValidCheckDigit', () => {
  it('accepts real EAN-13 codes', () => {
    expect(hasValidCheckDigit('3017620422003')).toBe(true); // Nutella 400 g
    expect(hasValidCheckDigit('5449000000996')).toBe(true); // Coca-Cola 330 ml
  });

  it('accepts a real EAN-8', () => {
    expect(hasValidCheckDigit('96385074')).toBe(true);
  });

  it('rejects a single wrong digit', () => {
    expect(hasValidCheckDigit('3017620422004')).toBe(false);
    expect(hasValidCheckDigit('3017620422013')).toBe(false);
  });

  it('rejects a transposition, which is what a bad scan usually looks like', () => {
    expect(hasValidCheckDigit('3017620242003')).toBe(false);
  });

  it('rejects anything that is not 8 to 14 digits', () => {
    expect(hasValidCheckDigit('123')).toBe(false);
    expect(hasValidCheckDigit('30176204220a3')).toBe(false);
  });
});

describe('toPackagedProduct', () => {
  const raw = {
    product_name: 'Nutella',
    product_name_ru: 'Нутелла',
    brands: 'Ferrero, Nutella',
    quantity: '400 g',
    serving_quantity: '15',
    image_front_small_url: 'https://images.example/nutella.jpg',
    categories_tags: ['en:spreads', 'en:sweet-spreads'],
    ingredients_text: 'Sugar, palm oil, hazelnuts',
    allergens_tags: ['en:milk', 'en:nuts'],
    additives_tags: ['en:e322'],
    nutriscore_grade: 'e',
    nova_group: 4,
    nutriments: {
      'energy-kcal_100g': 539,
      proteins_100g: 6.3,
      carbohydrates_100g: 57.5,
      fat_100g: 30.9,
      fiber_100g: 0,
      sugars_100g: 56.3,
      'saturated-fat_100g': 10.6,
      sodium_100g: 0.0428,
    },
  };

  it('converts sodium from grams to milligrams', () => {
    const product = toPackagedProduct('3017620422003', raw);
    // 0.0428 g is 42.8 mg, not 0.0428 of anything the rest of the app understands.
    expect(product.per100g.sodium).toBe(43);
  });

  it('derives sodium from salt when sodium itself is missing', () => {
    const product = toPackagedProduct('3017620422003', {
      ...raw,
      nutriments: { ...raw.nutriments, sodium_100g: undefined, salt_100g: 1 },
    });
    expect(product.per100g.sodium).toBe(400);
  });

  it('prefers the name in the requested language', () => {
    expect(toPackagedProduct('3017620422003', raw, 'ru').name).toBe('Нутелла');
    expect(toPackagedProduct('3017620422003', raw, 'de').name).toBe('Nutella');
  });

  it('takes the first brand rather than the whole comma-separated list', () => {
    expect(toPackagedProduct('3017620422003', raw).brand).toBe('Ferrero');
  });

  it('strips the language prefix from tags', () => {
    const product = toPackagedProduct('3017620422003', raw);
    expect(product.allergens).toEqual(['milk', 'nuts']);
    expect(product.additives).toEqual(['e322']);
  });

  it('converts kilojoules when kilocalories are absent', () => {
    const product = toPackagedProduct('3017620422003', {
      nutriments: { energy_100g: 2255, proteins_100g: 6.3, carbohydrates_100g: 57.5, fat_100g: 30.9 },
    });
    expect(product.per100g.calories).toBe(539);
  });

  it('falls back to the macros when the energy figure is absurd', () => {
    const product = toPackagedProduct('3017620422003', {
      nutriments: {
        'energy-kcal_100g': 5,
        proteins_100g: 6.3,
        carbohydrates_100g: 57.5,
        fat_100g: 30.9,
      },
    });
    // 6.3*4 + 57.5*4 + 30.9*9 ≈ 533, which is what the label should have said.
    expect(product.per100g.calories).toBe(533);
  });

  it('marks an empty label as having no nutrition instead of zero calories', () => {
    const product = toPackagedProduct('3017620422003', {
      product_name: 'Mystery jar',
      nutriments: {},
    });
    expect(product.hasNutrition).toBe(false);
    expect(product.per100g.calories).toBe(0);
  });

  it('reads a drink as a drink', () => {
    const product = toPackagedProduct('5449000000996', {
      product_name: 'Coca-Cola',
      categories_tags: ['en:beverages', 'en:carbonated-drinks'],
      nutriments: { 'energy-kcal_100g': 42, carbohydrates_100g: 10.6, proteins_100g: 0, fat_100g: 0 },
    });
    expect(product.category).toBe('drink');
  });

  it('ignores a nutriscore that is not a letter grade', () => {
    expect(toPackagedProduct('1', { nutriscore_grade: 'unknown', nutriments: {} }).nutriScore).toBeNull();
    expect(toPackagedProduct('1', { nutriscore_grade: 'b', nutriments: {} }).nutriScore).toBe('B');
  });

  it('falls back to the barcode when the product has no name at all', () => {
    expect(toPackagedProduct('3017620422003', { nutriments: {} }).name).toBe('3017620422003');
  });
});

describe('BarcodeService', () => {
  const build = (lookup: jest.Mock) =>
    new BarcodeService({ lookup } as unknown as OpenFoodFactsProvider);

  it('refuses a number that is not a barcode without asking the network', async () => {
    const lookup = jest.fn();
    await expect(build(lookup).lookup('12')).rejects.toBeInstanceOf(BadRequestException);
    expect(lookup).not.toHaveBeenCalled();
  });

  it('refuses a failed check digit without asking the network', async () => {
    const lookup = jest.fn();
    await expect(build(lookup).lookup('3017620422004')).rejects.toBeInstanceOf(BadRequestException);
    expect(lookup).not.toHaveBeenCalled();
  });

  it('reports an unknown barcode as not found rather than as an error', async () => {
    const lookup = jest.fn().mockResolvedValue(null);
    const result = await build(lookup).lookup('3017620422003');
    expect(result).toEqual({ status: 'not_found', barcode: '3017620422003' });
  });

  it('tells a known product with an empty label apart from a usable one', async () => {
    const withLabel = { barcode: '3017620422003', hasNutrition: true } as any;
    const withoutLabel = { barcode: '3017620422003', hasNutrition: false } as any;

    expect((await build(jest.fn().mockResolvedValue(withLabel)).lookup('3017620422003')).status).toBe(
      'found',
    );
    expect(
      (await build(jest.fn().mockResolvedValue(withoutLabel)).lookup('3017620422003')).status,
    ).toBe('no_nutrition');
  });

  it('passes the locale through so the name comes back translated', async () => {
    const lookup = jest.fn().mockResolvedValue({ hasNutrition: true } as any);
    await build(lookup).lookup(' 3017620422003 ', 'ru');
    expect(lookup).toHaveBeenCalledWith('3017620422003', 'ru');
  });
});

import { Injectable, Logger } from '@nestjs/common';
import {
  CanonicalNutrients,
  INutritionProvider,
  NutritionCategory,
  NutritionLookupContext,
  NutritionProviderId,
  NutritionProviderResult,
} from './nutrition-provider.interface';
import { CacheService } from '../../cache/cache.service';

/** A packaged product as it is printed on the label, plus what we know about it. */
export interface PackagedProduct {
  barcode: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  /** Net contents exactly as printed, e.g. "500 g". Not parsed on purpose. */
  quantity: string | null;
  /** One serving in grams or millilitres, when the label declares one. */
  servingG: number | null;
  category: NutritionCategory;
  per100g: CanonicalNutrients;
  /**
   * False when the entry exists but carries no usable nutrition facts. The app
   * needs to tell those two cases apart: "we do not know this barcode" invites a
   * retry, "we know it but nobody has filled in the label" invites typing.
   */
  hasNutrition: boolean;
  ingredientsText: string | null;
  allergens: string[];
  additives: string[];
  /** Nutri-Score letter, as published. We show it; we do not compute it. */
  nutriScore: string | null;
  novaGroup: number | null;
}

const API_BASE = 'https://world.openfoodfacts.org/api/v2/product';
const TIMEOUT_MS = Number(process.env.OPENFOODFACTS_TIMEOUT_MS || 4000);

/**
 * Open Food Facts asks callers to identify themselves, and rate-limits the ones
 * that do not. A contact address in here is cheaper than being blocked.
 */
const USER_AGENT = 'EatSense/1.0 (https://eatsense.ch; info@eatsense.ch)';

const FIELDS = [
  'code',
  'product_name',
  'product_name_en',
  'product_name_ru',
  'product_name_de',
  'product_name_fr',
  'product_name_es',
  'brands',
  'image_front_small_url',
  'image_url',
  'quantity',
  'serving_quantity',
  'nutriments',
  'categories_tags',
  'ingredients_text',
  'allergens_tags',
  'additives_tags',
  'nutriscore_grade',
  'nova_group',
].join(',');

/**
 * Packaged products by barcode, from Open Food Facts.
 *
 * Two consumers, one network call: `lookup` answers the scanner screen, which
 * wants the label as printed, and `getByBarcode` adapts the same result for the
 * nutrition pipeline, which wants a canonical food or nothing. Giving each its
 * own request would double the traffic and let the two disagree.
 *
 * The data is crowd-sourced, so it is treated as a claim rather than a fact:
 * energy is cross-checked against the macros, and a product whose label nobody
 * has filled in is reported as such instead of as a zero-calorie food.
 */
@Injectable()
export class OpenFoodFactsProvider implements INutritionProvider {
  readonly id: NutritionProviderId = 'openfoodfacts';
  private readonly logger = new Logger(OpenFoodFactsProvider.name);

  constructor(private readonly cache: CacheService) {}

  isAvailable(_context: NutritionLookupContext): boolean {
    return process.env.OPENFOODFACTS_ENABLED !== 'false';
  }

  getPriority(context: NutritionLookupContext): number {
    // Best European coverage of packaged goods by a wide margin, and Switzerland
    // is the home market. USDA barely covers a Swiss supermarket shelf.
    const region = context.region || 'OTHER';
    return region === 'CH' || region === 'EU' ? 140 : 100;
  }

  /**
   * Open Food Facts is a barcode database. Its free-text search returns brands
   * ranked by popularity, which is the wrong answer for "how much protein is in
   * chicken breast" — that question belongs to USDA and the local catalogue.
   */
  async findByText(): Promise<NutritionProviderResult | null> {
    return null;
  }

  async getByBarcode(
    barcode: string,
    context: NutritionLookupContext,
  ): Promise<NutritionProviderResult | null> {
    const product = await this.lookup(barcode, context.locale);
    if (!product || !product.hasNutrition) return null;

    return {
      food: {
        providerId: this.id,
        providerFoodId: product.barcode,
        displayName: product.brand ? `${product.name} (${product.brand})` : product.name,
        originalQuery: barcode,
        category: product.category,
        per100g: product.per100g,
        defaultPortionG: product.servingG ?? undefined,
        meta: {
          barcode: product.barcode,
          brand: product.brand,
          imageUrl: product.imageUrl,
          nutriScore: product.nutriScore,
          novaGroup: product.novaGroup,
        },
      },
      // A scanned barcode is an exact identifier, not a guess at a name. What is
      // uncertain is the crowd-sourced label, not which product it belongs to.
      confidence: 0.95,
    };
  }

  /** The product as printed, or null when the barcode is unknown to the database. */
  async lookup(barcode: string, locale?: string): Promise<PackagedProduct | null> {
    const code = normaliseBarcode(barcode);
    if (!code) return null;

    const key = `barcode:${code}:${locale || 'en'}`;
    // `null` is a legitimate answer, and the cache cannot hold it — so a miss
    // and a known-absent product look the same here. Re-asking about a barcode
    // nobody has entered yet is cheap; caching absence would keep a product
    // hidden for a day after somebody adds it.
    const cached = await this.cache.get<PackagedProduct>(key, 'nutrition:lookup').catch(() => null);
    if (cached) return cached;

    const raw = await this.fetchProduct(code);
    if (!raw) return null;

    const product = toPackagedProduct(code, raw, locale);
    await this.cache.set(key, product, 'nutrition:lookup').catch(() => undefined);
    return product;
  }

  private async fetchProduct(code: string): Promise<any | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(`${API_BASE}/${code}.json?fields=${FIELDS}`, {
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      });

      // 404 is the documented answer for an unknown barcode, not a failure.
      if (response.status === 404) return null;
      if (!response.ok) {
        this.logger.warn(`[OFF] ${code} → HTTP ${response.status}`);
        return null;
      }

      const body: any = await response.json();
      if (body?.status !== 1 || !body?.product) return null;
      return body.product;
    } catch (error: any) {
      const reason = error?.name === 'AbortError' ? `timed out after ${TIMEOUT_MS}ms` : error?.message;
      this.logger.warn(`[OFF] ${code} → ${reason}`);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Digits only, and long enough to be a real symbology. */
export function normaliseBarcode(input: string): string | null {
  const digits = String(input ?? '').replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 14) return null;
  return digits;
}

/**
 * The GS1 check digit, which every EAN/UPC carries as its last digit.
 *
 * Worth verifying before spending a request: a camera that misreads one bar
 * produces a plausible-looking number, and a wrong number that happens to exist
 * would put somebody else's product in the user's diary.
 */
export function hasValidCheckDigit(code: string): boolean {
  if (!/^\d{8,14}$/.test(code)) return false;
  const digits = code.split('').map(Number);
  const check = digits.pop()!;
  // Weights run 3,1,3,1… counting from the digit next to the check digit.
  const sum = digits
    .reverse()
    .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

const number = (value: any): number | undefined => {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

/** Strips the language prefix Open Food Facts puts on its tags ("en:milk"). */
const untag = (tags: any): string[] =>
  Array.isArray(tags)
    ? tags.map((tag) => String(tag).replace(/^[a-z]{2}:/, '').trim()).filter(Boolean)
    : [];

function localisedName(raw: any, locale?: string): string {
  const candidates = [
    locale ? raw?.[`product_name_${locale}`] : undefined,
    raw?.product_name,
    raw?.product_name_en,
  ];
  for (const candidate of candidates) {
    const name = typeof candidate === 'string' ? candidate.trim() : '';
    if (name) return name;
  }
  return '';
}

function toNutrients(nutriments: any): { per100g: CanonicalNutrients; hasNutrition: boolean } {
  const source = nutriments || {};

  const protein = number(source.proteins_100g) ?? 0;
  const carbs = number(source.carbohydrates_100g) ?? 0;
  const fat = number(source.fat_100g) ?? 0;

  let calories = number(source['energy-kcal_100g']);
  if (calories === undefined) {
    const kJ = number(source['energy-kj_100g']) ?? number(source.energy_100g);
    if (kJ !== undefined) calories = Math.round(kJ / 4.184);
  }

  const derived = Math.round(protein * 4 + carbs * 4 + fat * 9);
  if (calories === undefined || calories === 0) {
    calories = derived;
  } else if (derived > 5) {
    // Same sanity check the USDA provider applies: a label typed in by hand is
    // as likely to be wrong about energy as about anything else, and the macros
    // are the more reliable pair.
    const ratio = calories / derived;
    if (ratio < 0.6 || ratio > 1.6) calories = derived;
  }

  // Open Food Facts reports sodium and salt in GRAMS per 100 g; the rest of the
  // codebase carries sodium in milligrams, as USDA does.
  const sodiumG = number(source.sodium_100g);
  const saltG = number(source.salt_100g);
  const sodium =
    sodiumG !== undefined
      ? Math.round(sodiumG * 1000)
      : saltG !== undefined
        ? Math.round(saltG * 400) // salt → sodium, 1 g NaCl ≈ 0.4 g Na
        : undefined;

  return {
    per100g: {
      calories,
      protein,
      carbs,
      fat,
      fiber: number(source.fiber_100g),
      sugars: number(source.sugars_100g),
      satFat: number(source['saturated-fat_100g']),
      sodium,
    },
    // Anything without energy AND without macros is an empty label, not a
    // zero-calorie food.
    hasNutrition: (calories ?? 0) > 0 || protein > 0 || carbs > 0 || fat > 0,
  };
}

function detectCategory(raw: any): NutritionCategory {
  const tags = untag(raw?.categories_tags).map((tag) => tag.toLowerCase());
  if (tags.some((tag) => tag.includes('beverage') || tag.includes('drink') || tag.includes('water'))) {
    return 'drink';
  }
  return tags.length > 0 ? 'solid' : 'unknown';
}

export function toPackagedProduct(code: string, raw: any, locale?: string): PackagedProduct {
  const { per100g, hasNutrition } = toNutrients(raw?.nutriments);
  const brands = typeof raw?.brands === 'string' ? raw.brands.split(',')[0].trim() : '';
  const ingredients = typeof raw?.ingredients_text === 'string' ? raw.ingredients_text.trim() : '';

  return {
    barcode: code,
    name: localisedName(raw, locale) || code,
    brand: brands || null,
    imageUrl: raw?.image_front_small_url || raw?.image_url || null,
    quantity: typeof raw?.quantity === 'string' && raw.quantity.trim() ? raw.quantity.trim() : null,
    servingG: number(raw?.serving_quantity) ?? null,
    category: detectCategory(raw),
    per100g,
    hasNutrition,
    ingredientsText: ingredients || null,
    allergens: untag(raw?.allergens_tags),
    additives: untag(raw?.additives_tags),
    nutriScore:
      typeof raw?.nutriscore_grade === 'string' && /^[a-e]$/i.test(raw.nutriscore_grade)
        ? raw.nutriscore_grade.toUpperCase()
        : null,
    novaGroup: number(raw?.nova_group) ?? null,
  };
}

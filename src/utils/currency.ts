/**
 * Currency utility for EatSense
 * Handles region-based currency formatting and pricing
 */

import * as Localization from 'expo-localization';

interface CurrencyConfig {
  symbol: string;
  position: 'before' | 'after';
  monthly: number;
  yearly: number;
  student: number;
}

interface PricingMap {
  [key: string]: CurrencyConfig;
}

const PRICING: PricingMap = {
  KZT: {
    symbol: '₸',
    position: 'after', // 3990 ₸
    monthly: 3990,
    yearly: 29990,
    student: 19990,
  },
  USD: {
    symbol: '$',
    position: 'before', // $9.99
    monthly: 9.99,
    yearly: 79.99,
    student: 39.99,
  },
  EUR: {
    symbol: '€',
    position: 'after', // 9.99 €
    monthly: 8.99,
    yearly: 69.99,
    student: 34.99,
  },
  RUB: {
    symbol: '₽',
    position: 'after',
    monthly: 799,
    yearly: 5999,
    student: 2999,
  },
  CHF: {
    symbol: 'CHF',
    position: 'before', // CHF 9.99
    monthly: 9.99,
    yearly: 80.00,
    student: 45.00,
  },
  GBP: {
    symbol: '£',
    position: 'before', // £9.99
    monthly: 7.99,
    yearly: 64.99,
    student: 32.99,
  },
  CAD: {
    symbol: 'CA$',
    position: 'before', // CA$9.99
    monthly: 12.99,
    yearly: 99.99,
    student: 49.99,
  },
  UAH: {
    symbol: '₴',
    position: 'after', // 399 ₴
    monthly: 399,
    yearly: 2999,
    student: 1499,
  },
  BYN: {
    symbol: 'Br',
    position: 'after', // 29.99 Br
    monthly: 29.99,
    yearly: 229.99,
    student: 114.99,
  },
  UZS: {
    symbol: "so'm",
    position: 'after', // 99000 so'm
    monthly: 99000,
    yearly: 749000,
    student: 374000,
  },
};

// Region to currency mapping (primary detection method)
const REGION_TO_CURRENCY: Record<string, string> = {
  // Europe
  'CH': 'CHF', // Switzerland
  'DE': 'EUR',
  'FR': 'EUR',
  'AT': 'EUR', // Austria
  'IT': 'EUR', // Italy
  'ES': 'EUR', // Spain
  'NL': 'EUR', // Netherlands
  'BE': 'EUR', // Belgium
  'PT': 'EUR', // Portugal
  'IE': 'EUR', // Ireland
  'FI': 'EUR', // Finland
  'GR': 'EUR', // Greece
  'LU': 'EUR', // Luxembourg
  'GB': 'GBP', // United Kingdom
  'UK': 'GBP', // United Kingdom (alternative code)
  // CIS
  'KZ': 'KZT', // Kazakhstan
  'RU': 'RUB', // Russia
  'BY': 'BYN', // Belarus
  'UA': 'UAH', // Ukraine
  'UZ': 'UZS', // Uzbekistan
  // Americas
  'US': 'USD', // United States
  'CA': 'CAD', // Canada
  // Asia & Others default to USD
};

// Language fallback (only used if region detection fails)
const LANGUAGE_TO_CURRENCY: Record<string, string> = {
  'kk': 'KZT', // Kazakh -> KZT
  // Note: 'ru' is NOT mapped here to avoid wrong currency for Russian speakers in other countries
};

export type PlanId = 'monthly' | 'yearly' | 'student';

/**
 * Get currency code based on device region (primary) or language (fallback)
 */
export function getCurrencyCode(): string {
  try {
    const locales = Localization.getLocales();
    const primaryLocale = locales[0];

    // 0. Use currency code directly if available (new API)
    if (primaryLocale?.currencyCode && PRICING[primaryLocale.currencyCode]) {
      return primaryLocale.currencyCode;
    }

    // 1. Try device region (most accurate)
    const region = primaryLocale?.regionCode; // e.g., 'CH', 'US', 'KZ'
    if (region && REGION_TO_CURRENCY[region.toUpperCase()]) {
      return REGION_TO_CURRENCY[region.toUpperCase()];
    }

    // 2. Try to extract region from languageTag (e.g., 'en-CH' -> 'CH')
    const languageTag = primaryLocale?.languageTag; // e.g., 'en-CH'
    if (languageTag) {
      const localeParts = languageTag.split('-');
      if (localeParts.length > 1) {
        const regionFromLocale = localeParts[1].toUpperCase();
        if (REGION_TO_CURRENCY[regionFromLocale]) {
          return REGION_TO_CURRENCY[regionFromLocale];
        }
      }

      // 3. Language-based fallback
      const language = localeParts[0].toLowerCase();
      if (LANGUAGE_TO_CURRENCY[language]) {
        return LANGUAGE_TO_CURRENCY[language];
      }
    }
  } catch (error) {
    console.warn('[currency] Error detecting region:', error);
  }

  // 4. Default fallback to USD
  return 'USD';
}

/**
 * Get current currency config based on device region
 */
export function getCurrency(): CurrencyConfig & { code: string } {
  const currencyCode = getCurrencyCode();
  const config = PRICING[currencyCode] || PRICING['USD'];
  return { code: currencyCode, ...config };
}

/**
 * Format price with currency symbol
 */
export function formatPrice(planId: PlanId): string {
  const currency = getCurrency();
  const price = currency[planId];
  if (price === undefined) return '';

  // Format number with proper decimal places
  const formattedPrice = needsDecimals(currency.code)
    ? price.toFixed(2)
    : Math.round(price).toString();

  if (currency.position === 'before') {
    return `${currency.symbol}${formattedPrice}`;
  } else {
    return `${formattedPrice} ${currency.symbol}`;
  }
}

/**
 * Check if currency needs decimal places
 */
function needsDecimals(code: string): boolean {
  // Currencies that typically use decimals
  return ['USD', 'EUR', 'CHF', 'GBP', 'CAD', 'BYN'].includes(code);
}

/**
 * Get raw price value for a plan
 */
export function getPriceValue(planId: PlanId): number {
  const currency = getCurrency();
  return currency[planId];
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(): string {
  return getCurrency().symbol;
}

/**
 * Format any amount in current currency
 */
export function formatAmount(amount: number): string {
  const currency = getCurrency();

  const formattedAmount = needsDecimals(currency.code)
    ? amount.toFixed(2)
    : Math.round(amount).toString();

  if (currency.position === 'before') {
    return `${currency.symbol}${formattedAmount}`;
  } else {
    return `${formattedAmount} ${currency.symbol}`;
  }
}

/**
 * Get detected region for debugging
 */
export function getDetectedRegion(): { region: string | null; locale: string; currencyCode: string } {
  const primaryLocale = Localization.getLocales()[0];
  return {
    region: primaryLocale?.regionCode || null,
    locale: primaryLocale?.languageTag || 'en-US',
    currencyCode: getCurrencyCode(),
  };
}

export default {
  getCurrency,
  getCurrencyCode,
  formatPrice,
  getPriceValue,
  getCurrencySymbol,
  formatAmount,
  getDetectedRegion,
};

/**
 * Currency utility for EatSense
 * Handles locale-based currency formatting and pricing
 */

import i18n from '../../app/i18n/config';

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
};

const LOCALE_TO_CURRENCY: { [key: string]: string } = {
  'ru': 'KZT', // Kazakhstan default for Russian
  'kk': 'KZT',
  'en': 'USD',
  'de': 'EUR',
  'fr': 'EUR',
  'es': 'EUR',
  'ja': 'USD',
  'ko': 'USD',
  'zh': 'USD',
};

export type PlanId = 'monthly' | 'yearly' | 'student';

/**
 * Get current currency config based on app locale
 */
export function getCurrency(): CurrencyConfig & { code: string } {
  const locale = i18n.language || 'en';
  const currencyCode = LOCALE_TO_CURRENCY[locale] || 'USD';
  return { code: currencyCode, ...PRICING[currencyCode] };
}

/**
 * Get currency code based on locale
 */
export function getCurrencyCode(): string {
  const locale = i18n.language || 'en';
  return LOCALE_TO_CURRENCY[locale] || 'USD';
}

/**
 * Format price with currency symbol
 */
export function formatPrice(planId: PlanId): string {
  const currency = getCurrency();
  const price = currency[planId];
  if (price === undefined) return '';

  // Format number with proper decimal places
  const formattedPrice = currency.code === 'USD' || currency.code === 'EUR'
    ? price.toFixed(2)
    : price.toString();

  if (currency.position === 'before') {
    return `${currency.symbol}${formattedPrice}`;
  } else {
    return `${formattedPrice} ${currency.symbol}`;
  }
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

  const formattedAmount = currency.code === 'USD' || currency.code === 'EUR'
    ? amount.toFixed(2)
    : Math.round(amount).toString();

  if (currency.position === 'before') {
    return `${currency.symbol}${formattedAmount}`;
  } else {
    return `${formattedAmount} ${currency.symbol}`;
  }
}

export default {
  getCurrency,
  getCurrencyCode,
  formatPrice,
  getPriceValue,
  getCurrencySymbol,
  formatAmount,
};

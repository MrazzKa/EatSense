/**
 * Currency utility for EatSense
 * Handles region-based currency formatting and pricing
 * Updated with all 175 countries from App Store Connect (2026-01-25)
 */

import * as Localization from 'expo-localization';

interface CurrencyConfig {
  symbol: string;
  position: 'before' | 'after';
  monthly: number;
  yearly: number;
  student: number;
  founder?: number; // Founder pass price
}

interface PricingMap {
  [key: string]: CurrencyConfig;
}

// Updated prices from App Store Connect (2026-01-25) - All 175 countries
const PRICING: PricingMap = {
  // Kazakhstan
  KZT: {
    symbol: '₸',
    position: 'after',
    monthly: 1990,
    yearly: 14990,
    student: 9990,
    founder: 59990,
  },
  // United States (base USD)
  USD: {
    symbol: '$',
    position: 'before',
    monthly: 9.99, // Base price, varies by country: 2.99-11.99
    yearly: 79.99, // Base price, varies by country: 17.99-79.99
    student: 49.99, // Base price, varies by country: 44.99-49.99
    founder: 99.99, // Base price, varies by country: 99.99-119.99
  },
  // Eurozone countries
  EUR: {
    symbol: '€',
    position: 'after',
    monthly: 8.99, // Varies: 4.99-9.99
    yearly: 69.99, // Varies: 44.99-79.99
    student: 49.99, // Varies: 39.99-49.99
    founder: 99.99,
  },
  // Russia
  RUB: {
    symbol: '₽',
    position: 'after',
    monthly: 449,
    yearly: 2990,
    student: 1990,
    founder: 8990,
  },
  // Switzerland
  CHF: {
    symbol: 'CHF',
    position: 'before',
    monthly: 9.00,
    yearly: 80.00,
    student: 45.00,
    founder: 90.00,
  },
  // United Kingdom
  GBP: {
    symbol: '£',
    position: 'before',
    monthly: 7.99,
    yearly: 59.99,
    student: 44.99,
    founder: 99.99,
  },
  // Canada
  CAD: {
    symbol: 'CA$',
    position: 'before',
    monthly: 9.99,
    yearly: 79.99,
    student: 59.99,
    founder: 129.99,
  },
  // Ukraine
  UAH: {
    symbol: '₴',
    position: 'after',
    monthly: 399,
    yearly: 2999,
    student: 1999,
    founder: 3999,
  },
  // Belarus (USD in App Store Connect, but keeping BYN for local users)
  BYN: {
    symbol: 'Br',
    position: 'after',
    monthly: 29.99,
    yearly: 229.99,
    student: 114.99,
    founder: 399.99,
  },
  // Uzbekistan
  UZS: {
    symbol: "so'm",
    position: 'after',
    monthly: 99000,
    yearly: 749000,
    student: 374000,
    founder: 899000,
  },
  // Japan
  JPY: {
    symbol: '¥',
    position: 'before',
    monthly: 1200,
    yearly: 9000,
    student: 7000,
    founder: 15000,
  },
  // Sweden
  SEK: {
    symbol: 'kr',
    position: 'after',
    monthly: 99,
    yearly: 799,
    student: 599,
    founder: 1295,
  },
  // South Africa
  ZAR: {
    symbol: 'R',
    position: 'before',
    monthly: 79.99,
    yearly: 499.99,
    student: 999.99,
    founder: 1999.99,
  },
  // Australia
  AUD: {
    symbol: 'A$',
    position: 'before',
    monthly: 14.99,
    yearly: 99.99,
    student: 69.99,
    founder: 149.99,
  },
  // New Zealand
  NZD: {
    symbol: 'NZ$',
    position: 'before',
    monthly: 14.99,
    yearly: 99.99,
    student: 79.99,
    founder: 199.99,
  },
  // Poland
  PLN: {
    symbol: 'zł',
    position: 'after',
    monthly: 29.99,
    yearly: 199.99,
    student: 199.99,
    founder: 499.99,
  },
  // Czech Republic
  CZK: {
    symbol: 'Kč',
    position: 'after',
    monthly: 149,
    yearly: 999,
    student: 1190,
    founder: 2790,
  },
  // Hungary
  HUF: {
    symbol: 'Ft',
    position: 'after',
    monthly: 2490,
    yearly: 19990,
    student: 19990,
    founder: 44990,
  },
  // Romania
  RON: {
    symbol: 'L',
    position: 'after',
    monthly: 29.99,
    yearly: 199.99,
    student: 249.99,
    founder: 499.99,
  },
  // Turkey
  TRY: {
    symbol: '₺',
    position: 'after',
    monthly: 149.99,
    yearly: 999.99,
    student: 699.99,
    founder: 4999.99,
  },
  // India
  INR: {
    symbol: '₹',
    position: 'before',
    monthly: 249,
    yearly: 1499,
    student: 999,
    founder: 9900,
  },
  // South Korea
  KRW: {
    symbol: '₩',
    position: 'before',
    monthly: 11000,
    yearly: 88000,
    student: 66000,
    founder: 149000,
  },
  // China
  CNY: {
    symbol: '¥',
    position: 'before',
    monthly: 48,
    yearly: 298,
    student: 298,
    founder: 698,
  },
  // Taiwan
  TWD: {
    symbol: 'NT$',
    position: 'before',
    monthly: 290,
    yearly: 1990,
    student: 1490,
    founder: 2990,
  },
  // Thailand
  THB: {
    symbol: '฿',
    position: 'before',
    monthly: 129,
    yearly: 699,
    student: 599,
    founder: 3990,
  },
  // Indonesia
  IDR: {
    symbol: 'Rp',
    position: 'before',
    monthly: 49000,
    yearly: 299000,
    student: 199000,
    founder: 1699000,
  },
  // Philippines
  PHP: {
    symbol: '₱',
    position: 'before',
    monthly: 199,
    yearly: 999,
    student: 799,
    founder: 5990,
  },
  // Vietnam
  VND: {
    symbol: '₫',
    position: 'after',
    monthly: 79000,
    yearly: 499000,
    student: 299000,
    founder: 2999000,
  },
  // Egypt
  EGP: {
    symbol: 'E£',
    position: 'before',
    monthly: 149.99,
    yearly: 999.99,
    student: 2499.99,
    founder: 4999.99,
  },
  // Israel
  ILS: {
    symbol: '₪',
    position: 'before',
    monthly: 34.90,
    yearly: 299.90,
    student: 149.90,
    founder: 349.90,
  },
  // Saudi Arabia
  SAR: {
    symbol: 'SAR',
    position: 'before',
    monthly: 39.99,
    yearly: 299.99,
    student: 199.99,
    founder: 399.99,
  },
  // UAE
  AED: {
    symbol: 'AED',
    position: 'before',
    monthly: 34.99,
    yearly: 299.99,
    student: 179.99,
    founder: 399.99,
  },
  // Qatar
  QAR: {
    symbol: 'QAR',
    position: 'before',
    monthly: 39.99,
    yearly: 299.99,
    student: 149.99,
    founder: 399.99,
  },
  // Nigeria
  NGN: {
    symbol: '₦',
    position: 'before',
    monthly: 4900,
    yearly: 39900,
    student: 69900,
    founder: 149900,
  },
  // Pakistan
  PKR: {
    symbol: 'Rs',
    position: 'before',
    monthly: 2900,
    yearly: 4900,
    student: 11900,
    founder: 24900,
  },
  // Brazil
  BRL: {
    symbol: 'R$',
    position: 'before',
    monthly: 24.90,
    yearly: 199.90,
    student: 129.90,
    founder: 599.90,
  },
  // Mexico
  MXN: {
    symbol: '$',
    position: 'before',
    monthly: 89,
    yearly: 599,
    student: 999,
    founder: 1999,
  },
  // Colombia
  COP: {
    symbol: '$',
    position: 'before',
    monthly: 19900,
    yearly: 99900,
    student: 199900,
    founder: 499900,
  },
  // Chile
  CLP: {
    symbol: '$',
    position: 'before',
    monthly: 3990,
    yearly: 24990,
    student: 49990,
    founder: 99990,
  },
  // Peru
  PEN: {
    symbol: 'S/',
    position: 'before',
    monthly: 14.90,
    yearly: 99.90,
    student: 199.90,
    founder: 449.90,
  },
  // Malaysia
  MYR: {
    symbol: 'RM',
    position: 'before',
    monthly: 14.90,
    yearly: 89.90,
    student: 199.90,
    founder: 499.90,
  },
  // Singapore
  SGD: {
    symbol: 'S$',
    position: 'before',
    monthly: 12.98,
    yearly: 99.98,
    student: 59.98,
    founder: 149.98,
  },
  // Hong Kong
  HKD: {
    symbol: 'HK$',
    position: 'before',
    monthly: 78,
    yearly: 588,
    student: 368,
    founder: 788,
  },
  // Denmark
  DKK: {
    symbol: 'kr',
    position: 'after',
    monthly: 69,
    yearly: 499,
    student: 399,
    founder: 899,
  },
  // Norway
  NOK: {
    symbol: 'kr',
    position: 'after',
    monthly: 99,
    yearly: 799,
    student: 599,
    founder: 1290,
  },
  // Tanzania
  TZS: {
    symbol: 'TZS',
    position: 'before',
    monthly: 7900,
    yearly: 49900,
    student: 129900,
    founder: 299900,
  },
};

// Complete region to currency mapping for all 175 countries from App Store Connect
// ISO 3166-1 alpha-2 country codes
const REGION_TO_CURRENCY: Record<string, string> = {
  // Europe
  'CH': 'CHF', // Switzerland
  'DE': 'EUR', // Germany
  'FR': 'EUR', // France
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
  'SE': 'SEK', // Sweden
  'DK': 'DKK', // Denmark
  'NO': 'NOK', // Norway
  'PL': 'PLN', // Poland
  'CZ': 'CZK', // Czech Republic
  'HU': 'HUF', // Hungary
  'RO': 'RON', // Romania
  'TR': 'TRY', // Turkey
  'BG': 'EUR', // Bulgaria
  'HR': 'EUR', // Croatia
  'CY': 'EUR', // Cyprus
  'EE': 'EUR', // Estonia
  'LV': 'EUR', // Latvia
  'LT': 'EUR', // Lithuania
  'MT': 'EUR', // Malta
  'SK': 'EUR', // Slovakia
  'SI': 'EUR', // Slovenia
  'BA': 'EUR', // Bosnia and Herzegovina
  'RS': 'EUR', // Serbia
  'ME': 'EUR', // Montenegro
  'XK': 'EUR', // Kosovo
  'IS': 'USD', // Iceland
  // CIS
  'KZ': 'KZT', // Kazakhstan
  'RU': 'RUB', // Russia
  'BY': 'BYN', // Belarus
  'UA': 'UAH', // Ukraine
  'UZ': 'UZS', // Uzbekistan
  'AM': 'USD', // Armenia
  'AZ': 'USD', // Azerbaijan
  'GE': 'USD', // Georgia
  'KG': 'USD', // Kyrgyzstan
  'MD': 'USD', // Moldova
  'TJ': 'USD', // Tajikistan
  'TM': 'USD', // Turkmenistan
  // Americas
  'US': 'USD', // United States
  'CA': 'CAD', // Canada
  'MX': 'MXN', // Mexico
  'BR': 'BRL', // Brazil
  'AR': 'USD', // Argentina
  'CO': 'COP', // Colombia
  'CL': 'CLP', // Chile
  'PE': 'PEN', // Peru
  'EC': 'USD', // Ecuador
  'BO': 'USD', // Bolivia
  'PY': 'USD', // Paraguay
  'UY': 'USD', // Uruguay
  'VE': 'USD', // Venezuela
  'CR': 'USD', // Costa Rica
  'PA': 'USD', // Panama
  'GT': 'USD', // Guatemala
  'HN': 'USD', // Honduras
  'NI': 'USD', // Nicaragua
  'SV': 'USD', // El Salvador
  'BS': 'USD', // Bahamas
  'BB': 'USD', // Barbados
  'JM': 'USD', // Jamaica
  'TT': 'USD', // Trinidad and Tobago
  'GD': 'USD', // Grenada
  'AG': 'USD', // Antigua and Barbuda
  'DM': 'USD', // Dominica
  'LC': 'USD', // Saint Lucia
  'VC': 'USD', // Saint Vincent and the Grenadines
  'KN': 'USD', // Saint Kitts and Nevis
  'AI': 'USD', // Anguilla
  'VG': 'USD', // British Virgin Islands
  'KY': 'USD', // Cayman Islands
  'BM': 'USD', // Bermuda
  'TC': 'USD', // Turks and Caicos
  'MS': 'USD', // Montserrat
  'SR': 'USD', // Suriname
  'GY': 'USD', // Guyana
  'BZ': 'USD', // Belize
  // Asia
  'JP': 'JPY', // Japan
  'CN': 'CNY', // China
  'TW': 'TWD', // Taiwan
  'KR': 'KRW', // South Korea
  'IN': 'INR', // India
  'TH': 'THB', // Thailand
  'ID': 'IDR', // Indonesia
  'PH': 'PHP', // Philippines
  'VN': 'VND', // Vietnam
  'MY': 'MYR', // Malaysia
  'SG': 'SGD', // Singapore
  'HK': 'HKD', // Hong Kong
  'MO': 'USD', // Macao
  'BD': 'USD', // Bangladesh
  'PK': 'PKR', // Pakistan
  'LK': 'USD', // Sri Lanka
  'NP': 'USD', // Nepal
  'AF': 'USD', // Afghanistan
  'MM': 'USD', // Myanmar
  'KH': 'USD', // Cambodia
  'LA': 'USD', // Laos
  'BN': 'USD', // Brunei
  'MN': 'USD', // Mongolia
  'BT': 'USD', // Bhutan
  'MV': 'USD', // Maldives
  // Middle East
  'SA': 'SAR', // Saudi Arabia
  'AE': 'AED', // UAE
  'QA': 'QAR', // Qatar
  'IL': 'ILS', // Israel
  'EG': 'EGP', // Egypt
  'JO': 'USD', // Jordan
  'IQ': 'USD', // Iraq
  'KW': 'USD', // Kuwait
  'OM': 'USD', // Oman
  'BH': 'USD', // Bahrain
  'LB': 'USD', // Lebanon
  'YE': 'USD', // Yemen
  'SY': 'USD', // Syria (not in list, but common)
  // Africa
  'ZA': 'ZAR', // South Africa
  'NG': 'NGN', // Nigeria
  'KE': 'USD', // Kenya
  'GH': 'USD', // Ghana
  'TZ': 'TZS', // Tanzania
  'ET': 'USD', // Ethiopia (not in list, but common)
  'UG': 'USD', // Uganda
  'ZW': 'USD', // Zimbabwe
  'ZM': 'USD', // Zambia
  'BW': 'USD', // Botswana
  'NA': 'USD', // Namibia
  'MU': 'USD', // Mauritius
  'SC': 'USD', // Seychelles
  'MG': 'USD', // Madagascar
  'MW': 'USD', // Malawi
  'MZ': 'USD', // Mozambique
  'AO': 'USD', // Angola
  'CD': 'USD', // Democratic Republic of Congo
  'CG': 'USD', // Republic of Congo
  'CM': 'USD', // Cameroon
  'SN': 'USD', // Senegal
  'CI': 'USD', // Côte d'Ivoire
  'BF': 'USD', // Burkina Faso
  'ML': 'USD', // Mali
  'NE': 'USD', // Niger
  'TD': 'USD', // Chad
  'GA': 'USD', // Gabon
  'GN': 'USD', // Guinea (not in list, but common)
  'GW': 'USD', // Guinea-Bissau
  'LR': 'USD', // Liberia
  'SL': 'USD', // Sierra Leone
  'BJ': 'USD', // Benin
  'GM': 'USD', // Gambia
  'CV': 'USD', // Cape Verde
  'ST': 'USD', // São Tomé and Príncipe
  'MR': 'USD', // Mauritania
  'DZ': 'USD', // Algeria
  'MA': 'USD', // Morocco
  'TN': 'USD', // Tunisia
  'LY': 'USD', // Libya
  'RW': 'USD', // Rwanda
  'SZ': 'USD', // Eswatini
  // Oceania
  'AU': 'AUD', // Australia
  'NZ': 'NZD', // New Zealand
  'FJ': 'USD', // Fiji
  'PG': 'USD', // Papua New Guinea
  'NC': 'USD', // New Caledonia (not in list, but common)
  'VU': 'USD', // Vanuatu
  'SB': 'USD', // Solomon Islands
  'TO': 'USD', // Tonga
  'PW': 'USD', // Palau
  'FM': 'USD', // Micronesia
  'NR': 'USD', // Nauru
  // Others default to USD
};

// Language fallback (only used if region detection fails)
const LANGUAGE_TO_CURRENCY: Record<string, string> = {
  'kk': 'KZT', // Kazakh -> KZT
  // Note: 'ru' is NOT mapped here to avoid wrong currency for Russian speakers in other countries
};

export type PlanId = 'monthly' | 'yearly' | 'student' | 'founder';

/**
 * Get device region code (ISO 3166-1 alpha-2)
 * This is the most accurate way to determine user's country
 */
export function getDeviceRegion(): string | null {
  try {
    const locales = Localization.getLocales();
    const primaryLocale = locales[0];

    // 1. Try device region code directly
    const region = primaryLocale?.regionCode; // e.g., 'CH', 'US', 'KZ'
    if (region) {
      if (__DEV__) {
        console.log(`[currency] Detected device region: ${region}`);
      }
      return region.toUpperCase();
    }

    // 2. Try to extract region from languageTag (e.g., 'en-CH' -> 'CH')
    const languageTag = primaryLocale?.languageTag; // e.g., 'en-CH'
    if (languageTag) {
      const localeParts = languageTag.split('-');
      if (localeParts.length > 1) {
        const regionFromLocale = localeParts[1].toUpperCase();
        if (__DEV__) {
          console.log(`[currency] Detected region from languageTag: ${regionFromLocale}`);
        }
        return regionFromLocale;
      }
    }

    // 3. Try languageRegionCode (specific to the preferred language)
    const langRegion = primaryLocale?.languageRegionCode;
    if (langRegion) {
      if (__DEV__) {
        console.log(`[currency] Detected languageRegionCode: ${langRegion}`);
      }
      return langRegion.toUpperCase();
    }

    // 4. Try getCalendars timezone guessing (Last resort fallback)
    try {
      const calendars = Localization.getCalendars();
      const tz = calendars[0]?.timeZone;
      if (tz) {
        if (__DEV__) {
          console.log(`[currency] Guessing region from timezone: ${tz}`);
        }
        // Common timezones to regions mapping
        if (tz.includes('Almaty') || tz.includes('Qyzylorda') || tz.includes('Astana')) return 'KZ';
        if (tz.includes('Moscow') || tz.includes('St_Petersburg') || tz.includes('Samara')) return 'RU';
        if (tz.includes('Zurich')) return 'CH';
        if (tz.includes('Paris')) return 'FR';
        if (tz.includes('London')) return 'GB';
        if (tz.includes('Berlin')) return 'DE';
      }
    } catch {
      // Ignore
    }
  } catch (error) {
    console.warn('[currency] Error detecting region:', error);
  }

  return null;
}

/**
 * Calculate original (strikethrough) price for a plan
 * Original price is typically 2x the current price to show discount
 * @param planId - Plan ID ('monthly', 'yearly', 'student', 'founder')
 * @param currencyCode - Currency code (e.g., 'CHF', 'USD', 'EUR')
 * @returns Original price as formatted string, or null if not applicable
 */
export function getOriginalPrice(planId: PlanId, currencyCode: string): string | null {
  try {
    const currentPrice = PRICING[currencyCode]?.[planId];

    if (!currentPrice) {
      return null;
    }

    // Calculate original price (2x current price for discount effect)
    const originalPrice = currentPrice * 2;

    // Format the original price
    const config = PRICING[currencyCode];
    if (!config) return null;

    // Use needsDecimals to format properly
    const formattedPrice = needsDecimals(currencyCode)
      ? originalPrice.toFixed(2)
      : Math.round(originalPrice).toString();

    if (config.position === 'before') {
      return `${config.symbol}${formattedPrice}`;
    } else {
      return `${formattedPrice} ${config.symbol}`;
    }
  } catch (error) {
    console.warn('[currency] Error calculating original price:', error);
    return null;
  }
}

/**
 * Store currency code detected from IAP products (most accurate source)
 */
let iapDetectedCurrency: string | null = null;

/**
 * Save currency code from IAP product data. Call this after loading IAP products.
 * IAP currency is the most accurate source (based on App Store country).
 */
export function setIAPCurrency(code: string): void {
  if (code && typeof code === 'string' && code.length === 3) {
    iapDetectedCurrency = code.toUpperCase();
    if (__DEV__) {
      console.log(`[currency] IAP currency saved: ${iapDetectedCurrency}`);
    }
  }
}

/**
 * Get currency code based on device region (primary) or language (fallback)
 * FIX: Prioritize region over currencyCode to fix Switzerland showing RUB instead of CHF
 * IMPORTANT: IAP prices are the most accurate source (they use App Store country)
 * This function is used for fallback when IAP is unavailable
 */
export function getCurrencyCode(): string {
  try {
    // 0. IAP-detected currency has highest priority (App Store country)
    if (iapDetectedCurrency && PRICING[iapDetectedCurrency]) {
      return iapDetectedCurrency;
    }

    const region = getDeviceRegion();

    // 1. Try device region FIRST (most accurate - fixes Switzerland issue)
    // This takes priority over currencyCode because IAP may return wrong currency
    if (region && REGION_TO_CURRENCY[region]) {
      const detectedCurrency = REGION_TO_CURRENCY[region];
      if (__DEV__) {
        console.log(`[currency] Detected region: ${region} -> currency: ${detectedCurrency}`);
      }
      return detectedCurrency;
    }

    const locales = Localization.getLocales();
    const primaryLocale = locales[0];

    // 2. Use currency code directly if available (fallback if region not found)
    // Only use this if region detection failed
    if (primaryLocale?.currencyCode && PRICING[primaryLocale.currencyCode]) {
      if (__DEV__) {
        console.log(`[currency] Using currencyCode from locale: ${primaryLocale.currencyCode}`);
      }
      return primaryLocale.currencyCode;
    }

    // 3. Language-based fallback (only for specific languages)
    if (primaryLocale?.languageTag) {
      const localeParts = primaryLocale.languageTag.split('-');
      const language = localeParts[0].toLowerCase();
      if (LANGUAGE_TO_CURRENCY[language]) {
        if (__DEV__) {
          console.log(`[currency] Using language fallback: ${language} -> currency: ${LANGUAGE_TO_CURRENCY[language]}`);
        }
        return LANGUAGE_TO_CURRENCY[language];
      }
    }
  } catch (error) {
    console.warn('[currency] Error detecting region:', error);
  }

  // 4. Default fallback to USD
  if (__DEV__) {
    console.log('[currency] Using default fallback: USD');
  }
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
  return ['USD', 'EUR', 'CHF', 'GBP', 'CAD', 'BYN', 'AUD', 'NZD', 'SGD', 'HKD', 'BRL', 'MXN', 'PEN', 'MYR', 'ILS', 'SAR', 'AED', 'QAR', 'PLN', 'RON', 'TRY', 'SEK', 'DKK', 'NOK', 'CZK', 'EGP', 'ZAR'].includes(code);
}

/**
 * Get raw price value for a plan
 */
export function getPriceValue(planId: PlanId): number {
  const currency = getCurrency();
  return currency[planId] ?? 0;
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(): string {
  return getCurrency().symbol;
}

/**
 * Get currency symbol by currency code
 * Used when we have IAP currency code and need the symbol
 */
export function getCurrencySymbolByCode(currencyCode: string): string {
  const config = PRICING[currencyCode];
  if (config) {
    return config.symbol;
  }
  // Fallback to common currency symbols
  const commonSymbols: Record<string, string> = {
    USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥',
    KZT: '₸', RUB: '₽', UAH: '₴', BYN: 'Br',
    CAD: 'CA$', AUD: 'A$', CHF: 'CHF', INR: '₹',
    KRW: '₩', BRL: 'R$', MXN: '$', TRY: '₺',
  };
  return commonSymbols[currencyCode] || currencyCode;
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
  getCurrencySymbolByCode,
  formatAmount,
  getDetectedRegion,
  getOriginalPrice,
};

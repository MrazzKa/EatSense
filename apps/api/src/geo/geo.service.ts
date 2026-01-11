import { Injectable, Logger } from '@nestjs/common';

interface CurrencyInfo {
    code: string;
    symbol: string;
    symbolPosition: 'before' | 'after';
    decimalSeparator: string;
    thousandSeparator: string;
    decimals: number;
}

interface CountryInfo {
    countryCode: string;
    countryName: string;
    currency: CurrencyInfo;
}

@Injectable()
export class GeoService {
    private readonly logger = new Logger(GeoService.name);

    // Mapping countries to currencies
    private readonly countryCurrencyMap: Record<string, CurrencyInfo> = {
        // CIS countries
        'KZ': {
            code: 'KZT',
            symbol: '₸',
            symbolPosition: 'after',
            decimalSeparator: ',',
            thousandSeparator: ' ',
            decimals: 0,
        },
        'RU': {
            code: 'RUB',
            symbol: '₽',
            symbolPosition: 'after',
            decimalSeparator: ',',
            thousandSeparator: ' ',
            decimals: 0,
        },
        'UA': {
            code: 'UAH',
            symbol: '₴',
            symbolPosition: 'after',
            decimalSeparator: ',',
            thousandSeparator: ' ',
            decimals: 0,
        },
        'BY': {
            code: 'BYN',
            symbol: 'Br',
            symbolPosition: 'after',
            decimalSeparator: ',',
            thousandSeparator: ' ',
            decimals: 2,
        },
        'UZ': {
            code: 'UZS',
            symbol: 'сум',
            symbolPosition: 'after',
            decimalSeparator: ',',
            thousandSeparator: ' ',
            decimals: 0,
        },

        // Europe (EUR)
        'DE': { code: 'EUR', symbol: '€', symbolPosition: 'after', decimalSeparator: ',', thousandSeparator: '.', decimals: 2 },
        'FR': { code: 'EUR', symbol: '€', symbolPosition: 'after', decimalSeparator: ',', thousandSeparator: ' ', decimals: 2 },
        'IT': { code: 'EUR', symbol: '€', symbolPosition: 'after', decimalSeparator: ',', thousandSeparator: '.', decimals: 2 },
        'ES': { code: 'EUR', symbol: '€', symbolPosition: 'after', decimalSeparator: ',', thousandSeparator: '.', decimals: 2 },
        'NL': { code: 'EUR', symbol: '€', symbolPosition: 'before', decimalSeparator: ',', thousandSeparator: '.', decimals: 2 },
        'AT': { code: 'EUR', symbol: '€', symbolPosition: 'after', decimalSeparator: ',', thousandSeparator: '.', decimals: 2 },
        'PT': { code: 'EUR', symbol: '€', symbolPosition: 'after', decimalSeparator: ',', thousandSeparator: '.', decimals: 2 },
        'FI': { code: 'EUR', symbol: '€', symbolPosition: 'after', decimalSeparator: ',', thousandSeparator: ' ', decimals: 2 },
        'IE': { code: 'EUR', symbol: '€', symbolPosition: 'before', decimalSeparator: '.', thousandSeparator: ',', decimals: 2 },
        'GR': { code: 'EUR', symbol: '€', symbolPosition: 'after', decimalSeparator: ',', thousandSeparator: '.', decimals: 2 },
        'BE': { code: 'EUR', symbol: '€', symbolPosition: 'after', decimalSeparator: ',', thousandSeparator: '.', decimals: 2 },

        // UK
        'GB': {
            code: 'GBP',
            symbol: '£',
            symbolPosition: 'before',
            decimalSeparator: '.',
            thousandSeparator: ',',
            decimals: 2,
        },

        // Americas
        'US': {
            code: 'USD',
            symbol: '$',
            symbolPosition: 'before',
            decimalSeparator: '.',
            thousandSeparator: ',',
            decimals: 2,
        },
        'CA': {
            code: 'CAD',
            symbol: 'CA$',
            symbolPosition: 'before',
            decimalSeparator: '.',
            thousandSeparator: ',',
            decimals: 2,
        },
        'BR': {
            code: 'BRL',
            symbol: 'R$',
            symbolPosition: 'before',
            decimalSeparator: ',',
            thousandSeparator: '.',
            decimals: 2,
        },

        // Asia-Pacific
        'AU': {
            code: 'AUD',
            symbol: 'A$',
            symbolPosition: 'before',
            decimalSeparator: '.',
            thousandSeparator: ',',
            decimals: 2,
        },
        'JP': {
            code: 'JPY',
            symbol: '¥',
            symbolPosition: 'before',
            decimalSeparator: '.',
            thousandSeparator: ',',
            decimals: 0,
        },
        'CN': {
            code: 'CNY',
            symbol: '¥',
            symbolPosition: 'before',
            decimalSeparator: '.',
            thousandSeparator: ',',
            decimals: 2,
        },
        'IN': {
            code: 'INR',
            symbol: '₹',
            symbolPosition: 'before',
            decimalSeparator: '.',
            thousandSeparator: ',',
            decimals: 0,
        },
        'KR': {
            code: 'KRW',
            symbol: '₩',
            symbolPosition: 'before',
            decimalSeparator: '.',
            thousandSeparator: ',',
            decimals: 0,
        },

        // Other
        'TR': {
            code: 'TRY',
            symbol: '₺',
            symbolPosition: 'after',
            decimalSeparator: ',',
            thousandSeparator: '.',
            decimals: 2,
        },
        'PL': {
            code: 'PLN',
            symbol: 'zł',
            symbolPosition: 'after',
            decimalSeparator: ',',
            thousandSeparator: ' ',
            decimals: 2,
        },
        'CZ': {
            code: 'CZK',
            symbol: 'Kč',
            symbolPosition: 'after',
            decimalSeparator: ',',
            thousandSeparator: ' ',
            decimals: 0,
        },
        'CH': {
            code: 'CHF',
            symbol: 'CHF',
            symbolPosition: 'before',
            decimalSeparator: '.',
            thousandSeparator: "'",
            decimals: 2,
        },
    };

    // Default currency
    private readonly defaultCurrency: CurrencyInfo = {
        code: 'USD',
        symbol: '$',
        symbolPosition: 'before',
        decimalSeparator: '.',
        thousandSeparator: ',',
        decimals: 2,
    };

    /**
     * Detect country by IP address
     */
    detectCountry(ip: string): CountryInfo {
        try {
            // For local development
            if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
                return {
                    countryCode: 'US',
                    countryName: 'United States',
                    currency: this.defaultCurrency,
                };
            }

            // Try to detect via geoip-lite (optional dependency)
            try {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const geoip = require('geoip-lite');
                const geo = geoip.lookup(ip);

                if (geo && geo.country) {
                    const currency = this.countryCurrencyMap[geo.country] || this.defaultCurrency;

                    this.logger.debug(`Detected country for IP ${ip.substring(0, 8)}...: ${geo.country}`);

                    return {
                        countryCode: geo.country,
                        countryName: geo.country,
                        currency,
                    };
                }
            } catch {
                // geoip-lite not installed, continue with default
                this.logger.debug('geoip-lite not available, using default currency');
            }
        } catch (error) {
            this.logger.warn(`Failed to detect country for IP: ${error.message}`);
        }

        return {
            countryCode: 'US',
            countryName: 'United States',
            currency: this.defaultCurrency,
        };
    }

    /**
     * Get currency info by country code
     */
    getCurrencyByCountry(countryCode: string): CurrencyInfo {
        return this.countryCurrencyMap[countryCode.toUpperCase()] || this.defaultCurrency;
    }

    /**
     * Get currency info by currency code
     */
    getCurrencyByCode(currencyCode: string): CurrencyInfo | null {
        for (const currency of Object.values(this.countryCurrencyMap)) {
            if (currency.code === currencyCode) {
                return currency;
            }
        }
        return currencyCode === 'USD' ? this.defaultCurrency : null;
    }

    /**
     * Format price in the given currency
     */
    formatPrice(amount: number, currencyInfo: CurrencyInfo): string {
        // Round to required decimal places
        const rounded = currencyInfo.decimals === 0
            ? Math.round(amount)
            : Math.round(amount * Math.pow(10, currencyInfo.decimals)) / Math.pow(10, currencyInfo.decimals);

        // Format number
        const parts = rounded.toFixed(currencyInfo.decimals).split('.');
        const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, currencyInfo.thousandSeparator);
        const formattedNumber = currencyInfo.decimals > 0
            ? `${integerPart}${currencyInfo.decimalSeparator}${parts[1]}`
            : integerPart;

        // Add currency symbol
        if (currencyInfo.symbolPosition === 'before') {
            return `${currencyInfo.symbol}${formattedNumber}`;
        } else {
            return `${formattedNumber} ${currencyInfo.symbol}`;
        }
    }

    /**
     * Get list of supported currencies
     */
    getSupportedCurrencies(): string[] {
        const currencies = new Set<string>();
        for (const info of Object.values(this.countryCurrencyMap)) {
            currencies.add(info.code);
        }
        return Array.from(currencies);
    }
}

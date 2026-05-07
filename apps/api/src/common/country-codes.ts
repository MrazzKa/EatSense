export const SUPPORTED_COUNTRY_CODES = new Set([
  'RU', 'KZ', 'UA', 'BY', 'US', 'DE', 'FR', 'ES', 'IT', 'GB',
  'PL', 'TR', 'NL', 'CZ', 'KG', 'UZ', 'AZ', 'GE', 'AM', 'MD',
  'EE', 'LV', 'LT', 'IL', 'AE', 'CA', 'AU', 'BR', 'JP', 'KR',
]);

export function normalizeSupportedCountryCode(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const normalized = input.trim().toUpperCase();
  if (normalized === 'OTHER') return null;
  if (!/^[A-Z]{2}$/.test(normalized)) return null;
  return SUPPORTED_COUNTRY_CODES.has(normalized) ? normalized : null;
}

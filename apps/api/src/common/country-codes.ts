export function normalizeSupportedCountryCode(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const normalized = input.trim().toUpperCase();
  if (normalized === 'OTHER') return null;
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

/**
 * Shared formatting utilities for nutrition values
 * Used across Dashboard, Analysis Results, Recent screens
 */

/**
 * Format calories as integer with locale-aware thousands separator
 * @param value - Calories value
 * @returns Formatted string like "1,250 kcal" or "42 kcal"
 */
export const formatCalories = (value: number | null | undefined): string => {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) {
    return '0 kcal';
  }
  const rounded = Math.round(value);
  return `${rounded.toLocaleString()} kcal`;
};

/**
 * Format macro values (protein, carbs, fat) with 1 decimal place
 * Avoids scientific notation and long decimal tails
 * @param value - Macro value in grams
 * @returns Formatted string like "5.3 g" or "0 g"
 */
export const formatMacro = (value: number | null | undefined): string => {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) {
    return '0 g';
  }
  // Round to 1 decimal place, avoiding floating point issues
  const rounded = Math.round(value * 10) / 10;
  // If rounded value is effectively an integer, show as integer
  if (Math.abs(rounded - Math.round(rounded)) < 0.01) {
    return `${Math.round(rounded)} g`;
  }
  return `${rounded.toFixed(1)} g`;
};

/**
 * Format percentage with capping (e.g., max 500%)
 * @param value - Percentage value (0-1 or 0-100)
 * @param maxPercent - Maximum percentage to display (default 500)
 * @returns Formatted string like "85%" or "500+%"
 */
export const formatPercentage = (
  value: number | null | undefined,
  maxPercent: number = 500,
): string => {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) {
    return '0%';
  }
  // If value is between 0-1, treat as decimal (0.85 = 85%)
  // If value > 1, treat as percentage (85 = 85%)
  const percent = value <= 1 ? value * 100 : value;
  const capped = Math.min(percent, maxPercent);
  const rounded = Math.round(capped);
  
  if (rounded >= maxPercent) {
    return `${maxPercent}+%`;
  }
  return `${rounded}%`;
};


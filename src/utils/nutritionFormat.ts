/**
 * Utility functions for formatting nutrition values
 * Ensures consistent formatting across the app (no floating point errors)
 */

/**
 * Format a macro value (protein, carbs, fat) to one decimal place
 * @param value - The numeric value to format
 * @returns Formatted string (e.g., "25.5" or "0.0")
 */
export function formatMacro(value: number | null | undefined): string {
  if (value == null || isNaN(value)) {
    return '0.0';
  }
  // Round to 1 decimal place to avoid floating point errors
  const rounded = Math.round(value * 10) / 10;
  return rounded.toFixed(1);
}

/**
 * Format calories to whole number
 * @param value - The numeric value to format
 * @returns Formatted string (e.g., "250" or "0")
 */
export function formatCalories(value: number | null | undefined): string {
  if (value == null || isNaN(value)) {
    return '0';
  }
  // Round to nearest integer
  const rounded = Math.round(value);
  return rounded.toString();
}

/**
 * Format percentage value
 * @param value - The numeric value (0-100)
 * @returns Formatted string (e.g., "85.5%" or "0%")
 */
export function formatPercentage(value: number | null | undefined): string {
  if (value == null || isNaN(value)) {
    return '0%';
  }
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toFixed(1)}%`;
}

/**
 * Format weight in grams
 * @param value - The weight in grams
 * @returns Formatted string (e.g., "150.0 g" or "0.0 g")
 */
export function formatWeight(value: number | null | undefined): string {
  if (value == null || isNaN(value)) {
    return '0.0 g';
  }
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toFixed(1)} g`;
}

/**
 * Format energy density (kcal per 100g)
 * @param value - Energy density value
 * @returns Formatted string (e.g., "250.5 kcal/100g")
 */
export function formatEnergyDensity(value: number | null | undefined): string {
  if (value == null || isNaN(value)) {
    return '0.0 kcal/100g';
  }
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toFixed(1)} kcal/100g`;
}

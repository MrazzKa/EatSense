import { severityBand } from './catalog';

/**
 * The pain-severity ramp.
 *
 * Fixed hex values rather than theme tokens on purpose: this is semantic data
 * colour, not chrome. A "7 out of 10" has to look like the same amount of
 * trouble in light mode, in dark mode, and on the day someone changes the brand
 * palette.
 *
 * It lives in its own module because two screens draw it — the body map and the
 * diary — and a severity ramp that disagrees with itself between two screens is
 * worse than no colour at all.
 */
export const SEVERITY_COLORS = {
  mild: '#4ADE80',
  moderate: '#FACC15',
  severe: '#FB923C',
  extreme: '#EF4444',
} as const;

export type SeverityBand = keyof typeof SEVERITY_COLORS;

/** Colour for a 1–10 severity, via its band. */
export function severityColor(severity: number): string {
  return SEVERITY_COLORS[severityBand(severity)];
}

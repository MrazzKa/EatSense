/**
 * Help / "How it works" demo videos.
 *
 * Each topic can point to a video in one of two ways:
 *  - a remote URL:   { uri: 'https://cdn.eatsense.ch/help/meal-analysis.mp4' }
 *  - a bundled file: require('../../assets/help/meal-analysis.mp4')
 *
 * Leave `null` when there is no video yet — the Help screen shows the written
 * steps with a friendly "video coming soon" placeholder instead of breaking.
 *
 * HOW TO ADD A VIDEO (no code beyond this file):
 *  1. Record a 15-30s screen capture on the phone (iOS: Control Center → screen
 *     record). Trim it.
 *  2a. Cheapest: upload to any static host / object storage and paste the URL:
 *        mealAnalysis: { uri: 'https://.../meal-analysis.mp4' }
 *  2b. Or drop the file in assets/help/ and:
 *        mealAnalysis: require('../../assets/help/meal-analysis.mp4')
 *
 * Keep clips short (<30s) and ideally <5 MB if bundling, to keep the app slim.
 */
export type HelpVideoSource = { uri: string } | number | null;

export const HELP_VIDEOS: Record<string, HelpVideoSource> = {
  // Bundled screen recording of the meal-analysis flow (assets/help/).
  mealAnalysis: require('../../assets/help/meal-analysis.mp4'),
  medications: null,
  experts: null,
  pharmacy: null,
};

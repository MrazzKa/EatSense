/**
 * Health feature configuration.
 *
 * ENABLE_HEALTH controls whether the "My Health" hub (medical test analyses with
 * AI insights, reached from Profile) is exposed in the app.
 *
 * It is temporarily hidden for the current release while the medical-analyses
 * flow is paused. The HealthScreen route stays registered in App.tsx — only the
 * user-facing entry point in Profile is gated behind this flag so the feature
 * can be brought back without a code change.
 *
 * Flip via EXPO_PUBLIC_ENABLE_HEALTH=true to re-enable the medical analyses UI.
 */
export const ENABLE_HEALTH =
  (process.env.EXPO_PUBLIC_ENABLE_HEALTH ?? 'false') === 'true';

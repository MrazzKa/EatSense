/**
 * Pharmacy feature configuration.
 *
 * ENABLE_PHARMACY controls whether the pharmacy hub (map of nearby pharmacies,
 * connecting to a pharmacy, ordering refills) is exposed in the app.
 *
 * For the current release the pharmacy + map experience is hidden while the
 * partner pilot (Geneva) is finalised. The backend, deep-links and the
 * PharmacyScreen route stay in place — only the user-facing entry points are
 * gated behind this flag so the feature can be re-enabled without a code change.
 *
 * Flip via EXPO_PUBLIC_ENABLE_PHARMACY=true to bring the pharmacy UI back.
 */
export const ENABLE_PHARMACY =
  (process.env.EXPO_PUBLIC_ENABLE_PHARMACY ?? 'false') === 'true';

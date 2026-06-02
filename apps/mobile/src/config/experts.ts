/**
 * Experts feature configuration.
 *
 * EXPERT_APPLICATIONS_ENABLED controls whether regular users can apply to
 * become an expert via the in-app questionnaire (BecomeExpertScreen).
 *
 * Pilot model: experts are onboarded manually by the team and patients attach
 * to them ONLY via an access code. Self-service applications are therefore
 * turned OFF — the "Become an Expert" CTA is hidden in Profile and the
 * marketplace banner. Existing experts (approved / pending / unpublished) can
 * still see their status entry and open the portal.
 *
 * Flip via EXPO_PUBLIC_ENABLE_EXPERT_APPLICATIONS=true when opening public
 * self-service onboarding.
 */
export const EXPERT_APPLICATIONS_ENABLED =
  (process.env.EXPO_PUBLIC_ENABLE_EXPERT_APPLICATIONS ?? 'false') === 'true';

/** Expert statuses that mean the user already has an expert profile. */
export const EXISTING_EXPERT_STATUSES = ['approved', 'pending', 'unpublished'];

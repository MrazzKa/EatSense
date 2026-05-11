import { useAuth } from '../contexts/AuthContext';

/**
 * Returns true only when the user has an approved + published expert profile.
 *
 * NOTE: `User.expertsRole === 'EXPERT'` is set at profile-create time (before
 * admin review) and never demoted, so it's not a reliable gate for marketplace
 * UX. The marketplace "Become an Expert" banner should only hide for actual
 * approved experts — not for applicants in pending/rejected/unpublished state.
 */
export function useIsExpert(): boolean {
    const { user } = useAuth();
    return (user as any)?.expertStatus === 'approved';
}

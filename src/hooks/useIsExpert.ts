import { useAuth } from '../contexts/AuthContext';

export function useIsExpert(): boolean {
    const { user } = useAuth();
    return user?.expertsRole === 'EXPERT';
}

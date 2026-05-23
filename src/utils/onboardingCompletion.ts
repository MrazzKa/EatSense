import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'eatsense_onboarding_completed:';

function idsFrom(value: any): string[] {
  return [value?.userId, value?.id]
    .map((id) => (id == null ? '' : String(id)))
    .filter(Boolean);
}

export async function markOnboardingCompletedLocally(userLike: any): Promise<void> {
  const ids = idsFrom(userLike);
  if (ids.length === 0) return;
  await Promise.all(ids.map((id) => AsyncStorage.setItem(`${KEY_PREFIX}${id}`, '1')));
}

export async function applyLocalOnboardingCompletion<T extends any>(profile: T): Promise<T> {
  if (!profile || typeof profile !== 'object') return profile;
  if ((profile as any).isOnboardingCompleted) return profile;
  const ids = idsFrom(profile);
  if (ids.length === 0) return profile;
  const values = await Promise.all(ids.map((id) => AsyncStorage.getItem(`${KEY_PREFIX}${id}`).catch(() => null)));
  return values.some((value) => value === '1')
    ? ({ ...(profile as any), isOnboardingCompleted: true } as T)
    : profile;
}

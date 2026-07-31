import { nullHealthProvider } from './types';

/**
 * Fallback for platforms Metro has no `.ios` / `.android` variant for (web, and
 * anything running under Jest). Metro picks `provider.ios.ts` / `provider.android.ts`
 * ahead of this file on the two platforms that have a health store.
 */
export default nullHealthProvider;

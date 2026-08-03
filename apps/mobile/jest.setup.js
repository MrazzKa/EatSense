import 'react-native-gesture-handler/jestSetup';

/**
 * Initialise i18n for the whole test run.
 *
 * Almost every component renders through `t()`. Without this, i18next is never
 * initialised, `t('upload.status.uploading')` returns the key itself, and any
 * test asserting on visible text fails — while the component is in fact working
 * perfectly. The English catalogue is the source of truth these assertions are
 * written against, so loading the real config keeps tests honest rather than
 * papering over missing keys with a stub that echoes them back.
 *
 * Importing the module is not enough — it initialises lazily behind
 * `ensureI18nReady()`, which is what the app calls on startup.
 */
import { ensureI18nReady } from './app/i18n/config';

beforeAll(async () => {
  await ensureI18nReady();
});

/**
 * Reanimated ships its own Jest mock; without it every animated component throws
 * on render because the worklet runtime does not exist under Jest.
 */
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  // Older Reanimated versions expected callers to no-op this. Guarded so the
  // mock keeps working across versions that no longer expose `default`.
  if (Reanimated?.default) {
    Reanimated.default.call = () => {};
  }
  return Reanimated;
});

/**
 * NativeAnimatedHelper moved out of Libraries/Animated in React Native 0.76 and
 * now lives under src/private. The old path was still mocked here, which threw
 * "Cannot find module" out of setup and took down every suite in the run — not
 * just the animation ones.
 *
 * React Native's own Jest preset already mocks the module at its current path,
 * so there is nothing left to do here. This note exists so the line does not get
 * "restored" from an older tutorial.
 */

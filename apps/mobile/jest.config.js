/**
 * Jest configuration for the mobile app.
 *
 * This file did not exist. `jest-expo` was installed and listed in devDependencies,
 * but nothing pointed Jest at it, so `pnpm test` ran with stock defaults: no
 * transform for React Native's ESM entry point, no Expo module mocks, and
 * `jest.setup.js` never loaded at all. 27 of 48 suites failed on
 * "Cannot use import statement outside a module" from react-native/index.js —
 * failures that said nothing about the code under test, which is the same as
 * having no tests.
 */
const expoPreset = require('jest-expo/jest-preset');

/**
 * Scoped packages this app depends on that ship untranspiled ESM and are not in
 * jest-expo's allowlist. Unscoped `react-native-*` names already match its
 * `react-native` prefix, so they do not need listing.
 */
const EXTRA_TRANSFORMED_PACKAGES = ['@kingstinct', '@livekit', '@shopify', 'livekit-client'];

module.exports = {
  preset: 'jest-expo',

  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // The repo is a pnpm workspace with node-linker=hoisted, so dependencies
  // resolve to <repo>/node_modules while rootDir is apps/mobile. Without this,
  // Jest would look for react-native under apps/mobile/node_modules only.
  roots: ['<rootDir>/src', '<rootDir>/app'],
  modulePaths: ['<rootDir>/node_modules', '<rootDir>/../../node_modules'],

  // Extend jest-expo's allowlist rather than replace it: its own list is what
  // makes expo-modules-core and friends transformable, and an overriding regex
  // silently drops all of that. Only packages it does not already cover are
  // added here.
  transformIgnorePatterns: [
    expoPreset.transformIgnorePatterns[0].replace(
      '|native-base',
      `|native-base|${EXTRA_TRANSFORMED_PACKAGES.join('|')}`,
    ),
    ...expoPreset.transformIgnorePatterns.slice(1),
  ],

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Detox drives a real build; running its specs under Jest would only ever fail.
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/android/', '/ios/'],

  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
  ],

  clearMocks: true,
};

// Expo config plugin: resolve react-native-iap's product-flavor ambiguity.
//
// react-native-iap (12.x) declares a `store` flavor dimension with `amazon` and
// `play` variants. Under Gradle 9 (Expo SDK 55) the app module must explicitly
// pick one, otherwise the build fails with:
//   "cannot choose between amazonReleaseRuntimeElements / playReleaseRuntimeElements"
// We inject `missingDimensionStrategy 'store', 'play'` into the app's
// defaultConfig so the Google Play variant is always selected.
//
// This runs on every prebuild (the android/ folder is generated, not committed).

const { withAppBuildGradle } = require('expo/config-plugins');

const FLAVOR_LINE = "missingDimensionStrategy 'store', 'play'";

module.exports = function withIapStoreFlavor(config) {
  return withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;

    // Idempotent: skip if already present (any quote style).
    if (src.includes("missingDimensionStrategy 'store'") || src.includes('missingDimensionStrategy "store"')) {
      return cfg;
    }

    // Insert as the first line inside `defaultConfig { ... }`.
    const replaced = src.replace(/defaultConfig\s*\{/, (match) => `${match}\n        ${FLAVOR_LINE}`);

    if (replaced === src) {
      throw new Error("[withIapStoreFlavor] Could not find 'defaultConfig {' in app/build.gradle to inject the IAP flavor strategy.");
    }

    cfg.modResults.contents = replaced;
    return cfg;
  });
};

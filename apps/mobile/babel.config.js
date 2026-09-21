module.exports = function (api) {
  // NOT api.cache(true). The plugin list below branches on NODE_ENV/BABEL_ENV, and
  // `cache(true)` tells Babel the config can never change — so the first result is
  // reused for every later call, env change or not. That is how a "production"
  // build quietly ships with console.log still in it. Keying the cache on the env
  // makes the branch and the cache agree.
  api.cache.using(() => `${process.env.NODE_ENV}:${process.env.BABEL_ENV}`);

  const plugins = [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        blocklist: null,
        allowlist: null,
        safe: false,
        allowUndefined: true,
      },
    ],
    'react-native-reanimated/plugin', // Must be last plugin
  ];

  // Remove console.log in production builds (keep console.error & console.warn)
  if (process.env.NODE_ENV === 'production' ||
    process.env.BABEL_ENV === 'production') {
    // Insert before reanimated (must stay last)
    plugins.splice(plugins.length - 1, 0,
      ['transform-remove-console', { exclude: ['error', 'warn'] }]
    );
  }

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
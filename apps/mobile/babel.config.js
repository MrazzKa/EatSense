module.exports = function (api) {
  api.cache(true);

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
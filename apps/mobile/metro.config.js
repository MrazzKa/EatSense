const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// For Metro 0.83+, use blockList directly as an array
// All patterns must have the same flags (case-insensitive 'i' flag)
config.resolver = {
  ...config.resolver,
  blockList: [
    /apps\/api\/.*/i,
    /.*\.(mp4|mov|mkv|zip|psd|7z|rar)$/i,
    /logs\/.*/i,
  ],
};

// Configure Metro to use specific host if needed
// This helps when running in WSL2 with hotspot
config.server = {
  ...config.server,
  // Enable all interfaces
  enhanceMiddleware: (middleware) => {
    return middleware;
  },
};

module.exports = config;
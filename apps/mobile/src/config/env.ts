import safeEnv from '../utils/env';

declare const __DEV__: boolean | undefined;

// Re-export safe normalized values from safeEnv helper
export const API_BASE_URL = safeEnv.apiBaseUrl;
export const DEV_TOKEN = safeEnv.devToken;
export const DEV_REFRESH_TOKEN = safeEnv.devRefreshToken;

// Log env state on startup (only in debug mode)
if (safeEnv.isDevelopment()) {
  safeEnv.logState();
}

export const URLS = {
  API_BASE_URL,
};

export const CONFIG = {
  API_BASE_URL,
  ENVIRONMENT: safeEnv.environment,
  DISABLE_UPLOADS: safeEnv.disableUploads,
};

// Re-export safeEnv for direct access to all safe env values
export { safeEnv };
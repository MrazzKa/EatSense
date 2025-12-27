/**
 * Safe environment variables helper
 * Normalizes all ENV values to prevent "undefined is not a function" errors
 */

declare const __DEV__: boolean | undefined;

const safeEnv = {
  // API Configuration
  // Priority: EXPO_PUBLIC_API_BASE_URL > default production URL
  // For local dev: set EXPO_PUBLIC_API_BASE_URL=http://localhost:3000 (iOS Simulator)
  // For real device: set EXPO_PUBLIC_API_BASE_URL=http://<LAN_IP>:3000
  // For ngrok: set EXPO_PUBLIC_API_BASE_URL=https://<ngrok>.ngrok-free.app
  apiBaseUrl:
    String(process.env.EXPO_PUBLIC_API_BASE_URL ?? '').trim() ||
    'https://caloriecam-production.up.railway.app',
  
  // Google OAuth Client IDs - safely normalized
  googleIosClientId: String(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '').trim(),
  googleAndroidClientId: String(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '').trim(),
  googleWebClientId: String(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '').trim(),
  // Legacy fallback (deprecated, but kept for backward compatibility)
  googleClientId: String(process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '').trim(),
  
  // Development tokens
  devToken: String(process.env.EXPO_PUBLIC_DEV_TOKEN ?? '').trim(),
  devRefreshToken: String(process.env.EXPO_PUBLIC_DEV_REFRESH_TOKEN ?? '').trim(),
  
  // Environment
  environment: String(process.env.EXPO_PUBLIC_ENV ?? '').trim() || 'development',
  
  // Build number (from app.config.js, accessed via Constants in runtime)
  buildNumber: String(process.env.EXPO_PUBLIC_BUILD_NUMBER ?? '').trim() || 'unknown',
  
  // Feature flags
  disableUploads: String(process.env.EXPO_PUBLIC_DISABLE_UPLOADS ?? '').trim() === 'true',
  
  // Helper to check if running in development
  isDevelopment: (): boolean => {
    return safeEnv.environment === 'development' || __DEV__ === true;
  },
  
  // Helper to log env state (for debugging, shows last 12 chars of sensitive values)
  logState: (): void => {
    if (safeEnv.isDevelopment()) {
      console.log('[ENV] Configuration:', {
        apiBaseUrl: safeEnv.apiBaseUrl,
        googleIosClientId: safeEnv.googleIosClientId ? `${safeEnv.googleIosClientId.slice(0, 12)}...` : '(empty)',
        googleAndroidClientId: safeEnv.googleAndroidClientId ? `${safeEnv.googleAndroidClientId.slice(0, 12)}...` : '(empty)',
        googleWebClientId: safeEnv.googleWebClientId ? `${safeEnv.googleWebClientId.slice(0, 12)}...` : '(empty)',
        environment: safeEnv.environment,
        disableUploads: safeEnv.disableUploads,
      });
    }
  },
};

export default safeEnv;

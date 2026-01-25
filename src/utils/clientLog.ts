import { Platform } from 'react-native';
import Constants from 'expo-constants';
import safeEnv from './env';

const API_BASE_URL = safeEnv.apiBaseUrl || 'https://eatsense-production.up.railway.app';

/**
 * Client-side logging utility that sends logs to backend
 * Useful for debugging production issues when dev-client is not available
 */
export async function clientLog(
  stage: string,
  extra?: Record<string, any>,
): Promise<void> {
  try {
    // Get build number from Constants if available
    const buildNumber = 
      Constants.expoConfig?.ios?.buildNumber || 
      Constants.expoConfig?.android?.versionCode || 
      safeEnv.buildNumber || 
      'unknown';

    await fetch(`${API_BASE_URL}/debug/client-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stage,
        platform: Platform.OS,
        build: buildNumber,
        env: safeEnv.environment || 'unknown',
        extra: extra ?? null,
      }),
    });
  } catch {
    // В проде просто молча глотаем ошибки
    // Не хотим добавлять дополнительную нагрузку на ошибки сетевых запросов
  }
}


import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { AnalysisProvider } from '../contexts/AnalysisContext';
import { usePushNotifications } from '../hooks/usePushNotifications';
import ApiService from '../services/apiService';
import Constants from 'expo-constants';

function AppContent({ children }) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { expoPushToken, permissionStatus, requestPermission } = usePushNotifications();

  // Register push token when available and user is authenticated
  useEffect(() => {
    if (expoPushToken && user?.id) {
      const deviceId = Constants.deviceId || Constants.installationId || 'unknown';
      const appVersion = Constants.expoConfig?.version || Constants.nativeAppVersion || '1.0.0';
      const platform = Platform.OS;

      ApiService.registerPushToken(expoPushToken, deviceId, platform, appVersion).catch((error) => {
        console.error('[AppWrapper] Failed to register push token:', error);
      });
    }
  }, [expoPushToken, user?.id]);

  // Request permission on mount if not granted
  useEffect(() => {
    if (user?.id && permissionStatus?.status !== 'granted' && permissionStatus?.canAskAgain) {
      requestPermission().catch((error) => {
        console.error('[AppWrapper] Failed to request notification permission:', error);
      });
    }
  }, [user?.id, permissionStatus, requestPermission]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {children}
    </>
  );
}

export function AppWrapper({ children }) {
  console.log('[BOOT:AppWrapper] Rendering AppWrapper');
  return (
    <ThemeProvider>
      {(() => {
        console.log('[BOOT:AppWrapper] Inside ThemeProvider, rendering AuthProvider');
        return (
          <AuthProvider>
            <AnalysisProvider>
              {(() => {
                console.log('[BOOT:AppWrapper] Inside AuthProvider, rendering AppContent');
                return <AppContent>{children}</AppContent>;
              })()}
            </AnalysisProvider>
          </AuthProvider>
        );
      })()}
    </ThemeProvider>
  );
}


import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View, Image } from 'react-native';
import { Asset } from 'expo-asset';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';

export function SplashLogo() {
  const [logoUri, setLogoUri] = useState(null);
  const [isDownloading, setIsDownloading] = useState(true);
  
  // Hooks must be called unconditionally
  // Use try-catch in render to handle errors gracefully
  let tokens, colors, isDark, t;
  
  try {
    const theme = useTheme();
    tokens = theme?.tokens;
    colors = theme?.colors;
    isDark = theme?.isDark;
  } catch (error) {
    console.warn('[SplashLogo] Theme error, using defaults:', error.message);
  }
  
  // Fallback values if theme failed
  if (!tokens) {
    tokens = { spacing: { xxl: 32, xl: 24, md: 16 }, radii: { xl: 16 } };
  }
  if (!colors) {
    colors = { surface: '#FFFFFF', textPrimary: '#000000', primary: '#007AFF' };
  }
  if (isDark === undefined) {
    isDark = false;
  }
  
  try {
    const i18n = useI18n();
    t = i18n?.t;
  } catch (error) {
    console.warn('[SplashLogo] i18n error, using fallback:', error.message);
  }
  
  // Fallback translation function
  if (!t || typeof t !== 'function') {
    t = (key) => key === 'common.loading' ? 'Loading...' : key;
  }

  useEffect(() => {
    let isMounted = true;

    const loadLogo = async () => {
      try {
        // Safely require the asset
        let assetModule;
        try {
          assetModule = require('../../assets/logo/Logo.jpeg');
        } catch (requireError) {
          console.warn('[SplashLogo] Logo file not found, using fallback:', requireError.message);
          if (isMounted) {
            setLogoUri(null);
            setIsDownloading(false);
          }
          return;
        }
        
        const asset = Asset.fromModule(assetModule);
        if (!asset.downloaded) {
          await asset.downloadAsync();
        }
        if (isMounted) {
          setLogoUri(asset.localUri ?? asset.uri);
        }
      } catch (error) {
        console.error('[SplashLogo] Failed to load logo asset:', error);
        // Fallback to a simple loading indicator if logo fails
        if (isMounted) {
          setLogoUri(null);
        }
      } finally {
        if (isMounted) {
          setIsDownloading(false);
        }
      }
    };

    loadLogo();

    return () => {
      isMounted = false;
    };
  }, []);

  const indicatorColor = useMemo(() => {
    return isDark ? colors.textPrimary : colors.primary;
  }, [isDark, colors]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          paddingHorizontal: tokens.spacing.xxl,
        },
      ]}
    >
      <View
        style={[
          styles.logoContainer,
          {
            borderRadius: tokens.radii.xl,
            padding: tokens.spacing.xl,
            backgroundColor: isDark ? colors.surfaceMuted : colors.surfaceElevated,
            shadowColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.1)',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: Platform.OS === 'ios' ? 0.4 : 0,
            shadowRadius: 20,
            elevation: Platform.OS === 'android' ? 12 : 0,
          },
        ]}
      >
        {logoUri ? (
          <Image 
            source={{ uri: logoUri }} 
            style={{ width: 200, height: 200 }}
            resizeMode="contain"
          />
        ) : (
          <ActivityIndicator size="large" color={indicatorColor} />
        )}
      </View>

      {(isDownloading || !logoUri) && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={indicatorColor} />
          <Text
            style={[
              styles.loadingText,
              {
                marginLeft: tokens.spacing.md,
                color: colors.textPrimary,
                fontSize: tokens.typography.body.fontSize,
                lineHeight: tokens.typography.body.lineHeight,
                fontWeight: tokens.typography.body.fontWeight,
              },
            ]}
          >
            {t('common.loading')}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
  },
  loadingText: {
    letterSpacing: 0.2,
  },
});

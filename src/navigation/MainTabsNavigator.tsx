import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../../app/i18n/hooks';
import ApiService from '../services/apiService';

// Import screens
import DashboardScreen from '../screens/DashboardScreen';
import DietsScreen from '../screens/DietsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ExpertsScreen from '../screens/ExpertsScreen';
import ReportsScreen from '../screens/ReportsScreen';
// MedicationScheduleScreen moved to ProfileScreen

const Tab = createBottomTabNavigator();

export function MainTabsNavigator() {
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const insets = useSafeAreaInsets();

  // Calculate safe tab bar height
  const tabBarPaddingBottom = Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + tabBarPaddingBottom;

  // Preload diets bundle when navigator mounts (background, non-blocking)
  useEffect(() => {
    // Preload bundle in background to warm up cache
    // This ensures data is ready when user navigates to Diets tab
    const preloadBundle = async () => {
      try {
        // Check if we already have cache
        const cacheKey = 'diets_bundle_cache_v1';
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const cached = await AsyncStorage.getItem(cacheKey);
        
        // Only preload if cache is missing or expired (older than 4 minutes)
        if (!cached) {
          // Preload in background (non-blocking)
          ApiService.getDietsBundle(language).catch(() => {
            // Silently fail - user will load it when they navigate
          });
        }
      } catch {
        // Silently fail - not critical
      }
    };

    // Delay preload slightly to not block initial render
    const timer = setTimeout(preloadBundle, 1000);
    return () => clearTimeout(timer);
  }, [language]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary || '#007AFF',
        tabBarInactiveTintColor: colors.textTertiary || '#8E8E93',
        tabBarStyle: {
          backgroundColor: colors.surface || '#FFFFFF',
          borderTopColor: colors.border || '#E5E5EA',
          borderTopWidth: 1,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: 5,
          height: tabBarHeight,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginBottom: 2,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: t('tabs.dashboard'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size || 24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Diets"
        component={DietsScreen}
        options={{
          tabBarLabel: t('tabs.diets') || 'Diets',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="nutrition" size={size || 24} color={color} />
          ),
        }}
        listeners={{
          tabPress: () => {
            // Preload bundle when user taps on Diets tab (before navigation)
            // This makes navigation feel instant
            ApiService.getDietsBundle(language).catch(() => {
              // Silently fail - screen will load it anyway
            });
          },
        }}
      />
      <Tab.Screen
        name="Experts"
        component={ExpertsScreen}
        options={{
          tabBarLabel: t('tabs.experts'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size || 24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          tabBarLabel: t('tabs.reports'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size || 24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size || 24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}


import React, { useEffect, useState, useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useI18n } from '../../app/i18n/hooks';
import ApiService from '../services/apiService';
import { GlassTabBar } from './GlassTabBar';

// Import screens
import DashboardScreen from '../screens/DashboardScreen';
import DietsScreen from '../screens/DietsScreen';
import ExpertsScreen from '../screens/ExpertsScreen';
import ExpertsComingSoonScreen from '../screens/ExpertsComingSoonScreen';
import TrackerScreen from '../screens/TrackerScreen';
import CommunityScreen from '../screens/CommunityScreen';

// Feature flag — when false, the Experts tab shows a Coming Soon screen instead
// of the full marketplace. Toggle in eas.json / .env without a code change.
const EXPERTS_ENABLED = (process.env.EXPO_PUBLIC_ENABLE_EXPERTS ?? 'false') === 'true';
// ProfileScreen moved to stack navigator

const Tab = createBottomTabNavigator();

const COMMUNITY_LAST_SEEN_KEY = 'community_last_seen_ts';

export function MainTabsNavigator() {
  const { t, language } = useI18n();
  const [communityHasNew, setCommunityHasNew] = useState(false);

  // Check for new community posts
  useEffect(() => {
    const checkNewPosts = async () => {
      try {
        const lastSeen = await AsyncStorage.getItem(COMMUNITY_LAST_SEEN_KEY);
        const feed = await ApiService.getCommunityFeed(1, 1);
        const posts = feed?.data || feed || [];
        if (posts.length > 0 && lastSeen) {
          const latestTs = new Date(posts[0].createdAt).getTime();
          const lastSeenTs = parseInt(lastSeen, 10);
          setCommunityHasNew(latestTs > lastSeenTs);
        } else if (posts.length > 0 && !lastSeen) {
          setCommunityHasNew(true);
        }
      } catch {}
    };
    const timer = setTimeout(checkNewPosts, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Preload diets bundle when navigator mounts (background, non-blocking)
  useEffect(() => {
    // Preload bundle in background to warm up cache
    // This ensures data is ready when user navigates to Diets tab
    const preloadBundle = async () => {
      try {
        // Check if we already have cache
        const cacheKey = 'diets_bundle_cache_v1';
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
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
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
        component={EXPERTS_ENABLED ? ExpertsScreen : ExpertsComingSoonScreen}
        options={{
          tabBarLabel: t('tabs.experts'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size || 24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Tracker"
        component={TrackerScreen}
        options={{
          tabBarLabel: t('tabs.myDay') || 'My Day',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="today-outline" size={size || 24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Community"
        component={CommunityScreen}
        options={{
          tabBarLabel: t('tabs.community') || 'Community',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="people-outline" size={size || 24} color={color} />
              {communityHasNew && (
                <View style={badgeStyles.dot} />
              )}
            </View>
          ),
        }}
        listeners={{
          tabPress: () => {
            if (communityHasNew) {
              setCommunityHasNew(false);
              AsyncStorage.setItem(COMMUNITY_LAST_SEEN_KEY, String(Date.now())).catch(() => {});
            }
          },
        }}
      />
    </Tab.Navigator>
  );
}

const badgeStyles = StyleSheet.create({
  dot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
});


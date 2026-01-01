import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { AccessibilityInfo } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokens as baseTokens, palettes } from '../design/tokens';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    console.warn('[ThemeContext] useTheme called outside ThemeProvider, returning fallback');
    // Return fallback theme instead of throwing
    return {
      isDark: false,
      themeMode: 'light',
      colors: palettes.light,
      tokens: baseTokens,
      toggleTheme: () => { },
      reduceMotion: false,
      getColor: (key) => palettes.light[key] ?? key,
    };
  }
  return context;
};

export const useDesignTokens = () => {
  const { tokens } = useTheme();
  return tokens;
};

export const ThemeProvider = ({ children }) => {
  // const systemColorScheme = useColorScheme(); // Unused
  const [themeMode, setThemeMode] = useState('light'); // 'light', 'dark', 'monochrome'
  const [isDark, setIsDark] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const loadThemePreference = React.useCallback(async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('themeMode');
      if (savedTheme) {
        setThemeMode(savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  }, []);

  useEffect(() => {
    loadThemePreference();
  }, [loadThemePreference]);

  useEffect(() => {
    setIsDark(themeMode === 'dark');
  }, [themeMode]);

  useEffect(() => {
    const loadReduceMotion = async () => {
      try {
        const value = await AccessibilityInfo.isReduceMotionEnabled();
        setReduceMotion(value);
      } catch {
        setReduceMotion(false);
      }
    };

    loadReduceMotion();

    const handleReduceMotionChange = (enabled) => setReduceMotion(enabled);

    const subscription = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      handleReduceMotionChange,
    );

    return () => {
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      } else if (AccessibilityInfo.removeEventListener) {
        AccessibilityInfo.removeEventListener('reduceMotionChanged', handleReduceMotionChange);
      }
    };
  }, []);

  const toggleTheme = async (mode) => {
    try {
      setThemeMode(mode);
      await AsyncStorage.setItem('themeMode', mode);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const palette = useMemo(() => {
    if (themeMode === 'monochrome') {
      return palettes?.monochrome || palettes?.light || {};
    }
    if (themeMode === 'rose') {
      return palettes?.rose || palettes?.light || {};
    }
    if (themeMode === 'beige') {
      return palettes?.beige || palettes?.light || {};
    }
    return isDark ? (palettes?.dark || palettes?.light || {}) : (palettes?.light || {});
  }, [isDark, themeMode]);
  const themeTokens = useMemo(() => {
    try {
      const { states: stateTokens, ...restTokens } = baseTokens || {};
      let resolvedStates = {};
      if (stateTokens) {
        if (themeMode === 'monochrome') {
          resolvedStates = stateTokens.monochrome || {};
        } else if (themeMode === 'rose') {
          resolvedStates = stateTokens.rose || {};
        } else if (themeMode === 'beige') {
          resolvedStates = stateTokens.beige || {};
        } else {
          resolvedStates = isDark ? stateTokens.dark : stateTokens.light;
        }
      }

      return {
        ...restTokens,
        colors: palette,
        states: resolvedStates,
      };
    } catch (error) {
      console.warn('[ThemeContext] Error creating theme tokens:', error);
      return {
        colors: palette,
        states: {},
      };
    }
  }, [isDark, palette, themeMode]);

  const getColor = (key) => palette[key] ?? key;

  const value = {
    isDark,
    themeMode,
    colors: palette,
    tokens: themeTokens,
    toggleTheme,
    reduceMotion,
    getColor,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};


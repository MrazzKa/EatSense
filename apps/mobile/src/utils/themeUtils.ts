import { Platform } from 'react-native';

export const isDarkMode = (): boolean => {
  // This would typically use a theme context or system appearance
  return false;
};

export const getStatusBarStyle = (): 'light-content' | 'dark-content' => {
  return isDarkMode() ? 'light-content' : 'dark-content';
};

export const getStatusBarBackgroundColor = (): string => {
  return isDarkMode() ? '#000000' : '#FFFFFF';
};

export const getNavigationBarStyle = (): 'light-content' | 'dark-content' => {
  return isDarkMode() ? 'light-content' : 'dark-content';
};

export const getNavigationBarBackgroundColor = (): string => {
  return isDarkMode() ? '#000000' : '#FFFFFF';
};

export const getSafeAreaInsets = (): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} => {
  // This would typically use react-native-safe-area-context
  return {
    top: Platform.OS === 'ios' ? 44 : 24,
    bottom: Platform.OS === 'ios' ? 34 : 0,
    left: 0,
    right: 0,
  };
};

export const getHeaderHeight = (): number => {
  const insets = getSafeAreaInsets();
  return insets.top + 44; // 44 is the standard header height
};

export const getTabBarHeight = (): number => {
  const insets = getSafeAreaInsets();
  return insets.bottom + 49; // 49 is the standard tab bar height
};
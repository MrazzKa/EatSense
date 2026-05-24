import { Platform, Dimensions, PixelRatio } from 'react-native';

export const getDeviceInfo = () => {
  const { width, height } = Dimensions.get('window');
  const { width: screenWidth, height: screenHeight } = Dimensions.get('screen');
  
  return {
    platform: Platform.OS,
    version: Platform.Version,
    width,
    height,
    screenWidth,
    screenHeight,
    pixelRatio: PixelRatio.get(),
    fontScale: PixelRatio.getFontScale(),
  };
};

export const isIOS = (): boolean => {
  return Platform.OS === 'ios';
};

export const isAndroid = (): boolean => {
  return Platform.OS === 'android';
};

export const isWeb = (): boolean => {
  return Platform.OS === 'web';
};

export const getScreenSize = (): 'small' | 'medium' | 'large' | 'xlarge' => {
  const { width, height } = Dimensions.get('window');
  const diagonal = Math.sqrt(width * width + height * height);
  
  if (diagonal < 600) return 'small';
  if (diagonal < 900) return 'medium';
  if (diagonal < 1200) return 'large';
  return 'xlarge';
};

export const isTablet = (): boolean => {
  const { width, height } = Dimensions.get('window');
  const diagonal = Math.sqrt(width * width + height * height);
  return diagonal >= 900;
};

export const isPhone = (): boolean => {
  return !isTablet();
};

export const getOrientation = (): 'portrait' | 'landscape' => {
  const { width, height } = Dimensions.get('window');
  return width > height ? 'landscape' : 'portrait';
};

export const isPortrait = (): boolean => {
  return getOrientation() === 'portrait';
};

export const isLandscape = (): boolean => {
  return getOrientation() === 'landscape';
};

export const getStatusBarHeight = (): number => {
  if (Platform.OS === 'ios') {
    return 44;
  }
  return 24;
};

export const getNavigationBarHeight = (): number => {
  if (Platform.OS === 'ios') {
    return 44;
  }
  return 56;
};

export const getTabBarHeight = (): number => {
  if (Platform.OS === 'ios') {
    return 49;
  }
  return 56;
};

export const getSafeAreaInsets = (): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} => {
  const statusBarHeight = getStatusBarHeight();
  const navigationBarHeight = getNavigationBarHeight();
  
  return {
    top: statusBarHeight,
    bottom: navigationBarHeight,
    left: 0,
    right: 0,
  };
};

export const getHeaderHeight = (): number => {
  const insets = getSafeAreaInsets();
  return insets.top + 44;
};

export const getContentHeight = (): number => {
  const { height } = Dimensions.get('window');
  const headerHeight = getHeaderHeight();
  const tabBarHeight = getTabBarHeight();
  return height - headerHeight - tabBarHeight;
};

export const getContentWidth = (): number => {
  const { width } = Dimensions.get('window');
  return width;
};

export const getContentDimensions = (): { width: number; height: number } => {
  return {
    width: getContentWidth(),
    height: getContentHeight(),
  };
};

export const getPixelRatio = (): number => {
  return PixelRatio.get();
};

export const getFontScale = (): number => {
  return PixelRatio.getFontScale();
};

export const getPixelSize = (size: number): number => {
  return PixelRatio.getPixelSizeForLayoutSize(size);
};

export const getLayoutSize = (size: number): number => {
  return PixelRatio.roundToNearestPixel(size);
};

export const getFontSize = (size: number): number => {
  return PixelRatio.getFontScale() * size;
};

export const getResponsiveSize = (size: number): number => {
  const { width } = Dimensions.get('window');
  const scale = width / 375; // Base width for iPhone
  return Math.round(size * scale);
};

export const getResponsiveFontSize = (size: number): number => {
  const { width } = Dimensions.get('window');
  const scale = width / 375; // Base width for iPhone
  return Math.round(size * scale);
};

export const getResponsivePadding = (size: number): number => {
  const { width } = Dimensions.get('window');
  const scale = width / 375; // Base width for iPhone
  return Math.round(size * scale);
};

export const getResponsiveMargin = (size: number): number => {
  const { width } = Dimensions.get('window');
  const scale = width / 375; // Base width for iPhone
  return Math.round(size * scale);
};

export const getResponsiveWidth = (percentage: number): number => {
  const { width } = Dimensions.get('window');
  return (width * percentage) / 100;
};

export const getResponsiveHeight = (percentage: number): number => {
  const { height } = Dimensions.get('window');
  return (height * percentage) / 100;
};
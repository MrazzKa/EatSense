export const spacing = {
  xxxs: 2,
  xxs: 3,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  gutter: 40,
};

export const radii = {
  none: 0,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  pill: 999,
  full: 9999,
};

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export const typography = {
  headingXL: { fontSize: 32, lineHeight: 40, fontWeight: fontWeights.bold },
  headingL: { fontSize: 24, lineHeight: 32, fontWeight: fontWeights.bold },
  headingM: { fontSize: 20, lineHeight: 28, fontWeight: fontWeights.semibold },
  headingS: { fontSize: 16, lineHeight: 24, fontWeight: fontWeights.semibold },
  body: { fontSize: 15, lineHeight: 22, fontWeight: fontWeights.regular },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: fontWeights.semibold },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: fontWeights.medium },
  micro: { fontSize: 11, lineHeight: 16, fontWeight: fontWeights.medium },
};

export const opacities = {
  disabled: 0.38,
  overlay: 0.64,
  scrim: 0.72,
  focus: 0.32,
};

export const elevations = {
  xs: {
    shadowColor: 'rgba(15, 23, 42, 0.05)',
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: 'rgba(15, 23, 42, 0.08)',
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  md: {
    shadowColor: 'rgba(15, 23, 42, 0.12)',
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 6,
  },
};

export const motion = {
  durations: {
    extraFast: 120,
    fast: 180,
    base: 240,
    slow: 320,
  },
  easings: {
    standard: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    entrance: 'cubic-bezier(0.16, 1, 0.3, 1)',
    exit: 'cubic-bezier(0.7, 0, 0.84, 0)',
  },
};

const neutralPaletteLight = {
  0: '#FFFFFF',
  25: '#F9FAFB',
  50: '#F4F5F7',
  100: '#E2E8F0',
  200: '#CBD5F5',
  300: '#94A3B8',
  400: '#64748B',
  500: '#475569',
  600: '#334155',
  700: '#1E293B',
  800: '#0F172A',
  900: '#020617',
};

const neutralPaletteDark = {
  0: '#020617',
  25: '#0B1120',
  50: '#101B33',
  100: '#14213C',
  200: '#1F2937',
  300: '#273244',
  400: '#2F3B52',
  500: '#3B465F',
  600: '#4C5A78',
  700: '#A5B4FC',
  800: '#C7D2FE',
  900: '#E0E7FF',
};

// Monochrome (Black & White) palette
const monochromePalette = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#FAFAFA',
  surfaceContrast: '#000000',
  surfaceElevated: '#FFFFFF',
  overlay: '#FFFFFF',
  primary: '#000000',
  primaryTint: '#F5F5F5',
  onPrimary: '#FFFFFF',
  secondary: '#000000',
  secondaryTint: '#F5F5F5',
  text: '#000000',
  textPrimary: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textMuted: '#999999',
  textSubdued: '#CCCCCC',
  textDisabled: 'rgba(0, 0, 0, 0.4)',
  inverseText: '#FFFFFF',
  border: '#E5E5E5',
  borderMuted: '#F0F0F0',
  borderStrong: '#CCCCCC',
  success: '#000000',
  successTint: '#F5F5F5',
  warning: '#666666',
  warningTint: '#F5F5F5',
  error: '#000000',
  errorTint: '#F5F5F5',
  info: '#000000',
  infoTint: '#F5F5F5',
  card: '#FFFFFF',
  inputBackground: '#FAFAFA',
  icon: '#000000',
  iconMuted: '#999999',
  overlayTint: 'rgba(0, 0, 0, 0.08)',
  scrim: 'rgba(0, 0, 0, 0.55)',
  focusRing: 'rgba(0, 0, 0, 0.35)',
  neutrals: neutralPaletteLight,
};

export const palettes = {
  light: {
    background: '#F4F5F7',
    surface: '#FFFFFF',
    surfaceMuted: '#F8FAFC',
    surfaceContrast: '#0F172A',
    surfaceElevated: '#FFFFFF',
    overlay: '#FBFBFD',
    primary: '#2563EB',
    primaryTint: '#E0E7FF',
    onPrimary: '#FFFFFF',
    secondary: '#7C3AED',
    secondaryTint: '#EDE9FE',
    text: '#111827',
    textPrimary: '#111827',
    textSecondary: '#4B5563',
    textTertiary: '#6B7280',
    textMuted: '#6B7280',
    textSubdued: '#9CA3AF',
    textDisabled: 'rgba(17, 24, 39, 0.4)',
    inverseText: '#F9FAFB',
    border: '#E5E7EB',
    borderMuted: '#E2E8F0',
    borderStrong: '#CBD5F5',
    success: '#10B981',
    successTint: '#DCFCE7',
    warning: '#F59E0B',
    warningTint: '#FFF4E5',
    error: '#EF4444',
    errorTint: '#FEE2E2',
    info: '#0EA5E9',
    infoTint: '#E0F2FE',
    card: '#FFFFFF',
    inputBackground: '#F8FAFC',
    icon: '#1F2937',
    iconMuted: '#6B7280',
    overlayTint: 'rgba(15, 23, 42, 0.08)',
    scrim: 'rgba(15, 23, 42, 0.55)',
    focusRing: 'rgba(37, 99, 235, 0.35)',
    neutrals: neutralPaletteLight,
  },
  rose: {
    // Soft pastel pink theme - gentle and pleasant
    background: '#FDF2F8',      // Pink-50
    surface: '#FFFFFF',
    surfaceMuted: '#FCE7F3',     // Pink-100
    surfaceContrast: '#831843',  // Pink-900
    surfaceElevated: '#FFFFFF',
    overlay: '#FDF2F8',
    primary: '#EC4899',          // Pink-500 (softer than Rose)
    primaryTint: '#FBCFE8',      // Pink-200
    onPrimary: '#FFFFFF',
    secondary: '#F472B6',        // Pink-400
    secondaryTint: '#FCE7F3',
    text: '#831843',             // Pink-900
    textPrimary: '#9D174D',      // Pink-800
    textSecondary: '#BE185D',    // Pink-700
    textTertiary: '#DB2777',     // Pink-600
    textMuted: '#F9A8D4',        // Pink-300
    textSubdued: '#FBCFE8',      // Pink-200
    textDisabled: 'rgba(131, 24, 67, 0.4)',
    inverseText: '#FDF2F8',
    border: '#FBCFE8',           // Pink-200
    borderMuted: '#FCE7F3',      // Pink-100
    borderStrong: '#F9A8D4',     // Pink-300
    success: '#10B981',
    successTint: '#D1FAE5',
    warning: '#F59E0B',
    warningTint: '#FEF3C7',
    error: '#EF4444',
    errorTint: '#FEE2E2',
    info: '#0EA5E9',
    infoTint: '#E0F2FE',
    card: '#FFFFFF',
    inputBackground: '#FDF2F8',
    icon: '#DB2777',             // Pink-600
    iconMuted: '#F472B6',        // Pink-400
    overlayTint: 'rgba(131, 24, 67, 0.06)',
    scrim: 'rgba(131, 24, 67, 0.45)',
    focusRing: 'rgba(236, 72, 153, 0.35)',
    neutrals: neutralPaletteLight,
  },
  beige: {
    // Warm beige/cream theme - cozy and natural
    background: '#FEFBF6',       // Warm cream white
    surface: '#FFFFFF',
    surfaceMuted: '#FAF5EF',     // Light beige
    surfaceContrast: '#44403C',  // Stone-700
    surfaceElevated: '#FFFFFF',
    overlay: '#FEFBF6',
    primary: '#A16207',          // Amber-700 (warm brown-gold)
    primaryTint: '#FEF3C7',      // Amber-100
    onPrimary: '#FFFFFF',
    secondary: '#CA8A04',        // Yellow-600
    secondaryTint: '#FEF9C3',
    text: '#44403C',             // Stone-700
    textPrimary: '#57534E',      // Stone-600
    textSecondary: '#78716C',    // Stone-500
    textTertiary: '#A8A29E',     // Stone-400
    textMuted: '#D6D3D1',        // Stone-300
    textSubdued: '#E7E5E4',      // Stone-200
    textDisabled: 'rgba(68, 64, 60, 0.4)',
    inverseText: '#FAFAF9',
    border: '#E7E5E4',           // Stone-200
    borderMuted: '#F5F5F4',      // Stone-100
    borderStrong: '#D6D3D1',     // Stone-300
    success: '#16A34A',
    successTint: '#DCFCE7',
    warning: '#CA8A04',
    warningTint: '#FEF9C3',
    error: '#DC2626',
    errorTint: '#FEE2E2',
    info: '#0284C7',
    infoTint: '#E0F2FE',
    card: '#FFFFFF',
    inputBackground: '#FAF5EF',
    icon: '#78716C',             // Stone-500
    iconMuted: '#A8A29E',        // Stone-400
    overlayTint: 'rgba(68, 64, 60, 0.06)',
    scrim: 'rgba(68, 64, 60, 0.45)',
    focusRing: 'rgba(161, 98, 7, 0.35)',
    neutrals: neutralPaletteLight,
  },
  dark: {
    background: '#020617',
    surface: '#0B1120',
    surfaceMuted: '#111827',
    surfaceContrast: '#F8FAFC',
    surfaceElevated: '#16213A',
    overlay: '#16213A',
    primary: '#3B82F6',
    primaryTint: 'rgba(59, 130, 246, 0.18)',
    onPrimary: '#0B1120',
    secondary: '#A855F7',
    secondaryTint: 'rgba(168, 85, 247, 0.24)',
    text: '#F9FAFB',
    textPrimary: '#F8FAFC',
    textSecondary: '#CBD5F5',
    textTertiary: '#94A3B8',
    textMuted: '#94A3B8',
    textSubdued: '#64748B',
    textDisabled: 'rgba(226, 232, 240, 0.4)',
    inverseText: '#0F172A',
    border: '#1F2937',
    borderMuted: '#1E293B',
    borderStrong: '#334155',
    success: '#34D399',
    successTint: 'rgba(22, 101, 52, 0.28)',
    warning: '#FBBF24',
    warningTint: 'rgba(251, 191, 36, 0.18)',
    error: '#F87171',
    errorTint: 'rgba(248, 113, 113, 0.18)',
    info: '#38BDF8',
    infoTint: 'rgba(56, 189, 248, 0.2)',
    card: '#111D32',
    inputBackground: '#111827',
    icon: '#E2E8F0',
    iconMuted: '#94A3B8',
    overlayTint: 'rgba(15, 23, 42, 0.24)',
    scrim: 'rgba(2, 6, 23, 0.75)',
    focusRing: 'rgba(148, 163, 184, 0.5)',
    neutrals: neutralPaletteDark,
  },
  monochrome: monochromePalette,
};

export const states = {
  light: {
    focusRing: 'rgba(37, 99, 235, 0.35)',
    overlay: 'rgba(15, 23, 42, 0.08)',
    scrim: 'rgba(15, 23, 42, 0.55)',
    primary: {
      base: '#2563EB',
      hover: '#1D4ED8',
      pressed: '#1E40AF',
      disabled: '#C7D2FE',
      border: '#1D4ED8',
      on: '#FFFFFF',
      disabledText: '#F1F5F9',
      disabledBorder: '#E0E7FF',
    },
    surface: {
      base: '#FFFFFF',
      elevated: '#FFFFFF',
      hovered: '#F8FAFC',
      pressed: '#E2E8F0',
      border: '#E2E8F0',
    },
    cardShadow: {
      shadowColor: 'rgba(15, 23, 42, 0.12)',
      shadowOpacity: 1,
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 20,
      elevation: 6,
    },
  },
  rose: {
    // Updated to match pastel pink palette
    focusRing: 'rgba(236, 72, 153, 0.35)',
    overlay: 'rgba(131, 24, 67, 0.06)',
    scrim: 'rgba(131, 24, 67, 0.45)',
    primary: {
      base: '#EC4899',
      hover: '#DB2777',
      pressed: '#BE185D',
      disabled: '#FBCFE8',
      border: '#DB2777',
      on: '#FFFFFF',
      disabledText: '#FDF2F8',
      disabledBorder: '#FCE7F3',
    },
    surface: {
      base: '#FFFFFF',
      elevated: '#FFFFFF',
      hovered: '#FDF2F8',
      pressed: '#FCE7F3',
      border: '#FCE7F3',
    },
    cardShadow: {
      shadowColor: 'rgba(131, 24, 67, 0.10)',
      shadowOpacity: 1,
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 20,
      elevation: 6,
    },
  },
  dark: {
    focusRing: 'rgba(148, 163, 184, 0.5)',
    overlay: 'rgba(15, 23, 42, 0.28)',
    scrim: 'rgba(2, 6, 23, 0.75)',
    primary: {
      base: '#3B82F6',
      hover: '#2563EB',
      pressed: '#1D4ED8',
      disabled: '#1E3A8A',
      border: '#2563EB',
      on: '#0B1120',
      disabledText: '#64748B',
      disabledBorder: '#1E3A8A',
    },
    surface: {
      base: '#0B1120',
      elevated: '#16213A',
      hovered: '#1F2937',
      pressed: '#1E293B',
      border: '#1F2937',
    },
    cardShadow: {
      shadowColor: 'rgba(0, 0, 0, 0.35)',
      shadowOpacity: 1,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 14,
      elevation: 6,
    },
  },
  monochrome: {
    focusRing: 'rgba(0, 0, 0, 0.35)',
    overlay: 'rgba(0, 0, 0, 0.08)',
    scrim: 'rgba(0, 0, 0, 0.55)',
    primary: {
      base: '#000000',
      hover: '#333333',
      pressed: '#666666',
      disabled: '#CCCCCC',
      border: '#000000',
      on: '#FFFFFF',
      disabledText: '#999999',
      disabledBorder: '#E5E5E5',
    },
    surface: {
      base: '#FFFFFF',
      elevated: '#FFFFFF',
      hovered: '#FAFAFA',
      pressed: '#F5F5F5',
      border: '#E5E5E5',
    },
    cardShadow: {
      shadowColor: 'rgba(0, 0, 0, 0.12)',
      shadowOpacity: 1,
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 20,
      elevation: 6,
    },
  },
  beige: {
    // Warm beige/Stone theme states
    focusRing: 'rgba(161, 98, 7, 0.35)',
    overlay: 'rgba(68, 64, 60, 0.06)',
    scrim: 'rgba(68, 64, 60, 0.45)',
    primary: {
      base: '#A16207',
      hover: '#92400E',
      pressed: '#78350F',
      disabled: '#FEF3C7',
      border: '#92400E',
      on: '#FFFFFF',
      disabledText: '#FEFBF6',
      disabledBorder: '#FEF3C7',
    },
    surface: {
      base: '#FFFFFF',
      elevated: '#FFFFFF',
      hovered: '#FEFBF6',
      pressed: '#FAF5EF',
      border: '#E7E5E4',
    },
    cardShadow: {
      shadowColor: 'rgba(68, 64, 60, 0.10)',
      shadowOpacity: 1,
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 20,
      elevation: 6,
    },
  },
};

export const tokens = {
  spacing,
  radii,
  fontWeights,
  typography,
  opacities,
  elevations,
  motion,
  colors: palettes,
  states,
};

export default tokens;

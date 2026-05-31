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
  // Soft black for body text (18.4:1) — keeps the B&W identity but is gentler
  // than pure #000000 (21:1). Buttons/icons stay pure black via `primary`.
  text: '#1A1A1A',
  textPrimary: '#1A1A1A',
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
    // Softened from near-black #111827 (17.7:1, slightly harsh on white) to
    // slate-800 — still ~14:1 (very readable) but easier on the eyes.
    text: '#1F2937',
    textPrimary: '#1F2937',
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
    textMuted: '#EC4899',        // Pink-500 (was Pink-300 #F9A8D4 — 1.81 contrast, unreadable)
    textSubdued: '#F472B6',      // Pink-400 (was Pink-200 #FBCFE8 — 1.38)
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
    textTertiary: '#857E78',     // darkened Stone (was Stone-400 #A8A29E — 2.52 contrast)
    textMuted: '#A8A29E',        // Stone-400 (was Stone-300 #D6D3D1 — 1.49)
    textSubdued: '#B0AAA5',      // (was Stone-200 #E7E5E4 — 1.26)
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
    // Softer, more cohesive dark palette inspired by Linear / Notion / Apple.
    // Previous palette used near-pitch background (#020617) + light grey
    // surfaceMuted (#111827) which created harsh "acid" contrast on stat
    // chips and tab bars. Goal: every surface sits one subtle notch above
    // the background, no surface ever looks pale grey on dark.
    background: '#0B1220',          // deep slate-blue, not pitch
    surface: '#141C2E',             // +1 step from bg — cards
    surfaceMuted: '#1A2336',        // +2 step — stat chips, muted blocks
    surfaceContrast: '#F8FAFC',
    surfaceElevated: '#1F2940',     // modals, sheets
    overlay: '#1A2336',
    primary: '#6366F1',             // indigo-500 — softer than electric blue
    primaryTint: 'rgba(99, 102, 241, 0.18)',
    onPrimary: '#FFFFFF',
    secondary: '#A78BFA',           // violet-400
    secondaryTint: 'rgba(167, 139, 250, 0.20)',
    text: '#E5E7EB',                // soft white, not pure white
    textPrimary: '#F1F5F9',
    textSecondary: '#9CA3AF',       // neutral grey (less acid blue tint)
    textTertiary: '#7E8899',        // lifted to pass AA on dark surface (was #6B7280 — 3.52)
    textMuted: '#7E8899',
    textSubdued: '#737B88',         // was #4B5563 — 2.25
    textDisabled: 'rgba(229, 231, 235, 0.4)',
    inverseText: '#0B1220',
    border: '#1F2940',              // matches elevated surface — invisible borders
    borderMuted: '#1A2336',
    borderStrong: '#334155',
    success: '#34D399',
    successTint: 'rgba(52, 211, 153, 0.16)',
    warning: '#FBBF24',
    warningTint: 'rgba(251, 191, 36, 0.16)',
    error: '#F87171',
    errorTint: 'rgba(248, 113, 113, 0.16)',
    info: '#60A5FA',
    infoTint: 'rgba(96, 165, 250, 0.18)',
    card: '#141C2E',                // same as surface — single elevation
    inputBackground: '#1A2336',
    icon: '#E5E7EB',
    iconMuted: '#9CA3AF',
    overlayTint: 'rgba(11, 18, 32, 0.24)',
    scrim: 'rgba(11, 18, 32, 0.75)',
    focusRing: 'rgba(99, 102, 241, 0.45)',
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
    // Kept in sync with palettes.dark (redesigned 2026-05-30). The previous
    // values were stale: surface.base sat at the background colour (#0B1120),
    // making AppCard / Profile cards blend into the background, and primary was
    // the old electric blue instead of the new indigo.
    focusRing: 'rgba(99, 102, 241, 0.45)',
    overlay: 'rgba(11, 18, 32, 0.28)',
    scrim: 'rgba(11, 18, 32, 0.75)',
    primary: {
      base: '#6366F1',
      hover: '#4F46E5',
      pressed: '#4338CA',
      disabled: '#312E81',
      border: '#4F46E5',
      on: '#FFFFFF',
      disabledText: '#64748B',
      disabledBorder: '#312E81',
    },
    surface: {
      base: '#141C2E',      // palette surface (cards)
      elevated: '#1F2940',  // palette surfaceElevated (modals/sheets)
      hovered: '#1A2336',   // palette surfaceMuted
      pressed: '#1A2336',
      border: '#1F2940',    // palette border
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

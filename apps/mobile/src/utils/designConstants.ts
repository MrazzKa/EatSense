import { spacing, radii, typography, elevations, motion } from '../design/tokens';

/**
 * Bridge constants for legacy components.
 * Prefer using `useTheme` tokens directly in new code.
 */

export const SPACING = {
  xxxs: spacing.xxxs,
  xxs: spacing.xxs,
  xs: spacing.xs,
  sm: spacing.sm,
  md: spacing.md,
  lg: spacing.lg,
  xl: spacing.xl,
  xxl: spacing.xxl,
  xxxl: spacing.xxxl,
  huge: spacing.gutter,
} as const;

export const BORDER_RADIUS = {
  none: radii.none,
  xs: radii.xs,
  sm: radii.sm,
  md: radii.md,
  lg: radii.lg,
  xl: radii.xl,
  pill: radii.pill,
  full: radii.full,
} as const;

export const PADDING = {
  xs: spacing.xs,
  sm: spacing.sm,
  md: spacing.md,
  lg: spacing.lg,
  xl: spacing.xl,
  xxl: spacing.xxl,
  xxxl: spacing.xxxl,
  huge: spacing.gutter,
  screen: spacing.xl,
  card: spacing.lg,
  section: spacing.xl,
  button: {
    horizontal: spacing.xl + spacing.xs,
    vertical: spacing.md,
  },
} as const;

export const MARGIN = {
  xs: spacing.xs,
  sm: spacing.sm,
  md: spacing.md,
  lg: spacing.lg,
  xl: spacing.xl,
  xxl: spacing.xxl,
  section: spacing.xxxl,
} as const;

export const FONT_SIZE = {
  xs: typography.caption.fontSize,
  sm: typography.body.fontSize,
  md: typography.headingS.fontSize,
  lg: typography.headingM.fontSize,
  xl: typography.headingL.fontSize,
  xxl: typography.headingXL.fontSize,
  xxxl: typography.headingXL.fontSize + 6,
  huge: typography.headingXL.fontSize + 10,
} as const;

export const ICON_SIZE = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 40,
} as const;

export const SHADOW = {
  xs: elevations.xs,
  sm: elevations.sm,
  md: elevations.md,
} as const;

export const MOTION = {
  durations: motion.durations,
  easings: motion.easings,
} as const;


/**
 * Bridger Design System — React Native Tokens
 * Extracted from BDS/src/styles/bridger-tokens.css
 *
 * Single source of truth for colors, typography, spacing, radius, and shadows.
 * Supports light and dark mode via the ThemeProvider.
 */

// ── Reference Tokens (raw palette) ──────────────────────────

export const palette = {
  primary: {
    50: '#EDF0FF',
    100: '#D4DBFF',
    200: '#B0BBFF',
    300: '#8B9AFF',
    400: '#6B7CFF',
    500: '#4B5EFC',
    600: '#3344D1',
    700: '#242FA6',
    800: '#1A2280',
    900: '#101559',
  },
  secondary: {
    50: '#F0FAFB',
    100: '#D0F0F4',
    200: '#A3E2EB',
    300: '#6DCEDE',
    400: '#3AB6CC',
    500: '#1E97AD',
    600: '#17788B',
    700: '#115B6A',
    800: '#0B3F4A',
    900: '#06262D',
  },
  neutral: {
    0: '#FFFFFF',
    50: '#F8F9FA',
    100: '#F1F3F5',
    200: '#E9ECEF',
    300: '#DEE2E6',
    400: '#CED4DA',
    500: '#ADB5BD',
    600: '#6C757D',
    700: '#495057',
    800: '#343A40',
    900: '#212529',
    950: '#0D1117',
  },
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    400: '#34D399',
    600: '#059669',
    800: '#065F46',
  },
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    400: '#FBBF24',
    600: '#D97706',
    800: '#92400E',
  },
  danger: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    400: '#F87171',
    600: '#DC2626',
    800: '#991B1B',
  },
} as const;

// ── Semantic Color Tokens ───────────────────────────────────

export const lightColors = {
  primary: palette.primary[500],
  primaryHover: palette.primary[400],
  primaryActive: palette.primary[600],
  onPrimary: '#FFFFFF',
  primaryContainer: palette.primary[50],
  onPrimaryContainer: palette.primary[800],

  secondary: palette.secondary[500],
  secondaryHover: palette.secondary[400],
  secondaryActive: palette.secondary[600],
  onSecondary: '#FFFFFF',
  secondaryContainer: palette.secondary[50],
  onSecondaryContainer: palette.secondary[800],

  surface: palette.neutral[0],
  surfaceVariant: palette.neutral[50],
  surfaceElevated: palette.neutral[0],
  onSurface: palette.neutral[900],
  onSurfaceVariant: palette.neutral[600],
  onSurfaceMuted: palette.neutral[500],

  outline: palette.neutral[200],
  outlineVariant: palette.neutral[100],
  outlineStrong: palette.neutral[300],

  skeleton: palette.neutral[200],

  success: palette.success[600],
  successContainer: palette.success[50],
  onSuccessContainer: palette.success[800],

  warning: palette.warning[600],
  warningContainer: palette.warning[50],
  onWarningContainer: palette.warning[800],

  danger: palette.danger[600],
  dangerContainer: palette.danger[50],
  onDangerContainer: palette.danger[800],

  info: palette.primary[500],
  infoContainer: palette.primary[50],
  onInfoContainer: palette.primary[800],
} as const;

export const darkColors = {
  primary: palette.primary[400],
  primaryHover: palette.primary[300],
  primaryActive: palette.primary[500],
  onPrimary: palette.primary[900],
  primaryContainer: palette.primary[900],
  onPrimaryContainer: palette.primary[100],

  secondary: palette.secondary[400],
  secondaryHover: palette.secondary[300],
  secondaryActive: palette.secondary[500],
  onSecondary: palette.secondary[900],
  secondaryContainer: palette.secondary[900],
  onSecondaryContainer: palette.secondary[100],

  surface: palette.neutral[950],
  surfaceVariant: '#1a1f2e',
  surfaceElevated: '#161b22',
  onSurface: palette.neutral[100],
  onSurfaceVariant: palette.neutral[500],
  onSurfaceMuted: palette.neutral[600],

  outline: palette.neutral[800],
  outlineVariant: palette.neutral[900],
  outlineStrong: palette.neutral[700],

  skeleton: palette.neutral[800],

  success: palette.success[400],
  successContainer: '#0a2e1f',
  onSuccessContainer: palette.success[200],

  warning: palette.warning[400],
  warningContainer: '#2e1f07',
  onWarningContainer: palette.warning[200],

  danger: palette.danger[400],
  dangerContainer: '#2e0a0a',
  onDangerContainer: palette.danger[200],

  info: palette.primary[300],
  infoContainer: palette.primary[900],
  onInfoContainer: palette.primary[200],
} as const;

export type ColorTokens = { [K in keyof typeof lightColors]: string };

// ── Typography ──────────────────────────────────────────────

// Space Grotesk weight → loaded font family name. Matches the exports from
// `@expo-google-fonts/space-grotesk` — kept here so components (Text, Input,
// PriceChart SVG) can resolve the right family without re-importing the pkg.
export const spaceGroteskByWeight = {
  '300': 'SpaceGrotesk_300Light',
  '400': 'SpaceGrotesk_400Regular',
  '500': 'SpaceGrotesk_500Medium',
  '600': 'SpaceGrotesk_600SemiBold',
  '700': 'SpaceGrotesk_700Bold',
} as const;

export type SpaceGroteskWeight = keyof typeof spaceGroteskByWeight;

export function fontFamilyForWeight(weight: string | number | undefined): string {
  const key = String(weight ?? '400') as SpaceGroteskWeight;
  return spaceGroteskByWeight[key] ?? spaceGroteskByWeight['400'];
}

export const typography = {
  fontFamily: {
    sans: 'SpaceGrotesk_400Regular',
    mono: 'JetBrainsMono',
  },
  displayLg: { fontSize: 48, fontWeight: '700' as const, lineHeight: 48 * 1.1, letterSpacing: -1.5 },
  displayMd: { fontSize: 36, fontWeight: '700' as const, lineHeight: 36 * 1.15, letterSpacing: -0.75 },
  displaySm: { fontSize: 30, fontWeight: '600' as const, lineHeight: 30 * 1.2, letterSpacing: -0.5 },
  headingLg: { fontSize: 24, fontWeight: '600' as const, lineHeight: 24 * 1.3, letterSpacing: -0.25 },
  headingMd: { fontSize: 20, fontWeight: '600' as const, lineHeight: 20 * 1.35 },
  headingSm: { fontSize: 16, fontWeight: '600' as const, lineHeight: 16 * 1.4 },
  bodyLg:    { fontSize: 18, fontWeight: '400' as const, lineHeight: 18 * 1.6 },
  bodyMd:    { fontSize: 16, fontWeight: '400' as const, lineHeight: 16 * 1.6 },
  bodySm:    { fontSize: 14, fontWeight: '400' as const, lineHeight: 14 * 1.5 },
  labelLg:   { fontSize: 14, fontWeight: '500' as const, lineHeight: 14 * 1.4, letterSpacing: 0.1 },
  labelMd:   { fontSize: 12, fontWeight: '500' as const, lineHeight: 12 * 1.4, letterSpacing: 0.25 },
  labelSm:   { fontSize: 11, fontWeight: '500' as const, lineHeight: 11 * 1.3, letterSpacing: 0.5 },
  caption:   { fontSize: 12, fontWeight: '400' as const, lineHeight: 12 * 1.4, letterSpacing: 0.4 },
  overline:  { fontSize: 11, fontWeight: '600' as const, lineHeight: 11 * 1.3, letterSpacing: 1.5 },
} as const;

// ── Spacing (4px grid) ──────────────────────────────────────

export const spacing = {
  0: 0,
  '0.5': 2,
  1: 4,
  '1.5': 6,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
  32: 128,
} as const;

// ── Border Radius ───────────────────────────────────────────

export const radius = {
  none: 0,
  sm: 6,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
} as const;

// ── Shadows (React Native format) ──────────────────────────

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
    elevation: 12,
  },
  glass: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
} as const;

// ── Glass tokens ───────────────────────────────────────────

export const glass = {
  light: {
    background: 'rgba(200, 210, 230, 0.25)',        // Subtle cool tint
    border: 'rgba(255, 255, 255, 0.5)',              // Light edge catch
    backgroundStrong: 'rgba(200, 210, 230, 0.35)',   // Nav bar
  },
  dark: {
    background: 'rgba(120, 140, 180, 0.08)',         // Very subtle light tint on dark
    border: 'rgba(160, 180, 220, 0.15)',             // Thin light border — key to the look
    backgroundStrong: 'rgba(120, 140, 180, 0.12)',   // Nav bar — slightly more visible
  },
  blur: 4,
} as const;

// ── Gradient backgrounds ───────────────────────────────────

export const gradients = {
  light: {
    colors: ['#E8ECFF', '#F3E8FF', '#E8F4FF'] as const,
    // Soft purple-blue morph — visible but not overwhelming
  },
  dark: {
    colors: ['#0D1117', '#151025', '#0D1822'] as const,
    // Deep navy-purple morph
  },
} as const;

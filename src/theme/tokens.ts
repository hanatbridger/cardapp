/**
 * CardPulse Design Tokens
 *
 * Source of truth for color, typography, spacing, radius, shadow, and glass.
 * Aligned to Brand Book v1.1 (April 2026, WCAG AAA). When the book and the
 * code disagree, the book wins — update here and every consumer rebinds.
 */

// ── Reference Tokens (raw palette) ──────────────────────────

export const palette = {
  // Brand indigo — the one brand color. Book locks 500 as "Indigo" and 200-ish
  // as "Indigo Lift" (#A5B0FF) for the logo facet.
  primary: {
    50: '#EDF0FF',
    100: '#D4DBFF',
    200: '#A5B0FF', // Indigo Lift (brand book)
    300: '#8B9AFF',
    400: '#6B7CFF',
    500: '#4B5EFC', // Indigo (brand book primary)
    600: '#3344D1',
    700: '#242FA6',
    800: '#1A2280',
    900: '#101559',
  },
  // Tailwind-slate-aligned neutrals so book-specified surface/text hex values
  // are addressable by name. Book values: canvas 0D1117, surface 161B22,
  // elevated 1F2937, text 1 F9FAFB, text 2 D1D5DB, text 3 9CA3AF.
  neutral: {
    0: '#FFFFFF',
    50: '#F9FAFB',   // text 1 (primary on dark)
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',  // text 2 (secondary on dark)
    400: '#9CA3AF',  // text 3 (tertiary on dark)
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',  // elevated surface
    900: '#111827',
    925: '#161B22',  // surface (1-up from canvas)
    950: '#0D1117',  // canvas
  },
  // Price movement / gain / undervalued — 200 for text, 400 at 18% alpha for fill.
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    400: '#34D399',
    600: '#059669',
    800: '#065F46',
  },
  // Price movement / loss / overvalued — same recipe.
  danger: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    400: '#F87171',
    600: '#DC2626',
    800: '#991B1B',
  },
  // Amber — graded tier (PSA 10). Book tier 3.
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    400: '#FBBF24',
    600: '#D97706',
    800: '#92400E',
  },
  // Violet — signal / scarcity (Live, Trophy). Book tier 4.
  violet: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    400: '#A78BFA',
    600: '#7C3AED',
    800: '#5B21B6',
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

  indigoLift: palette.primary[200], // #A5B0FF — logo facet, subtle highlights

  surface: palette.neutral[0],      // canvas (light mode: pure white)
  surfaceVariant: palette.neutral[50],
  surfaceElevated: palette.neutral[0],
  onSurface: '#111827',             // text 1 on light
  onSurfaceVariant: '#4B5563',      // text 2 on light
  onSurfaceMuted: '#6B7280',        // text 3 on light

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

  indigoLift: palette.primary[200], // #A5B0FF — logo facet, used in brand contexts

  // Surface tiers, exactly per brand book v1.1:
  surface: palette.neutral[950],        // canvas #0D1117
  surfaceVariant: palette.neutral[925], // surface #161B22
  surfaceElevated: palette.neutral[800], // elevated #1F2937
  onSurface: palette.neutral[50],       // text 1 #F9FAFB (16:1 AAA)
  onSurfaceVariant: palette.neutral[300], // text 2 #D1D5DB (10.9:1 AAA)
  onSurfaceMuted: palette.neutral[400], // text 3 #9CA3AF (7.2:1 AAA)

  outline: palette.neutral[800],
  outlineVariant: palette.neutral[925],
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
//
// Brand book locks Space Grotesk, three weights (400/500/700 — NO 600), and
// six named scales. The legacy display*/heading*/body*/label* variants below
// stay for migration but all now use book-compliant weights.

// Space Grotesk weight → PostScript family loaded by @expo-google-fonts.
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
  },

  // ── Brand book v1.1 scales (canonical) ────────────────────
  // Use these for new screens. Each scale carries a single meaning.
  display:  { fontSize: 56, fontWeight: '700' as const, lineHeight: 56 * 1.05, letterSpacing: -2.4 },
  headline: { fontSize: 32, fontWeight: '700' as const, lineHeight: 32 * 1.15, letterSpacing: -1.2 },
  title:    { fontSize: 20, fontWeight: '500' as const, lineHeight: 20 * 1.35, letterSpacing: -0.4 },
  body:     { fontSize: 15, fontWeight: '400' as const, lineHeight: 15 * 1.55 },
  numerals: { fontSize: 24, fontWeight: '500' as const, lineHeight: 24 * 1.2, letterSpacing: -0.2, fontVariant: ['tabular-nums'] as ['tabular-nums'] },

  // ── Legacy phone-ergonomic ramp (still in use across screens) ────
  // Weights normalized to book-compliant 400/500/700. When updating a screen,
  // prefer the canonical scales above.
  displayLg: { fontSize: 48, fontWeight: '700' as const, lineHeight: 48 * 1.1, letterSpacing: -1.5 },
  displayMd: { fontSize: 36, fontWeight: '700' as const, lineHeight: 36 * 1.15, letterSpacing: -0.75 },
  displaySm: { fontSize: 30, fontWeight: '700' as const, lineHeight: 30 * 1.2, letterSpacing: -0.5 },
  headingLg: { fontSize: 24, fontWeight: '700' as const, lineHeight: 24 * 1.3, letterSpacing: -0.25 },
  headingMd: { fontSize: 20, fontWeight: '700' as const, lineHeight: 20 * 1.35 },
  headingSm: { fontSize: 16, fontWeight: '700' as const, lineHeight: 16 * 1.4 },
  bodyLg:    { fontSize: 18, fontWeight: '400' as const, lineHeight: 18 * 1.6 },
  bodyMd:    { fontSize: 16, fontWeight: '400' as const, lineHeight: 16 * 1.6 },
  bodySm:    { fontSize: 14, fontWeight: '400' as const, lineHeight: 14 * 1.5 },
  labelLg:   { fontSize: 14, fontWeight: '500' as const, lineHeight: 14 * 1.4, letterSpacing: 0.1 },
  labelMd:   { fontSize: 12, fontWeight: '500' as const, lineHeight: 12 * 1.4, letterSpacing: 0.25 },
  labelSm:   { fontSize: 11, fontWeight: '500' as const, lineHeight: 11 * 1.3, letterSpacing: 0.5 },
  caption:   { fontSize: 12, fontWeight: '500' as const, lineHeight: 12 * 1.4, letterSpacing: 0.4 },
  overline:  { fontSize: 11, fontWeight: '500' as const, lineHeight: 11 * 1.3, letterSpacing: 1.5 },
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
//
// Brand book corner-radius system:
//   inline 6 · chips 12 · cards 16 · sheets 24 · buttons pill
export const radius = {
  none: 0,
  sm: 6,      // inline elements (divider caps, small indicators)
  md: 12,     // chips, pulse chips
  lg: 16,     // cards (default)
  xl: 20,     // legacy card size
  '2xl': 24,  // modals, sheets
  '3xl': 32,  // hero surfaces
  full: 9999, // pill buttons, avatars
} as const;

// ── Shadows (React Native format) ──────────────────────────
//
// Dark-mode-first design uses borders + glass instead of shadows for most
// elevation cues. Reserve shadows for modals, floating tab bar, dropdowns.

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
//
// Brand book UI motif #1: glass cards are 4% white fill, 0.5px border, 16px
// radius. RN can't render sub-pixel borders so we use 1px hairlines at low
// opacity — visually indistinguishable at device pixel ratios we target.

export const glass = {
  light: {
    background: 'rgba(17, 24, 39, 0.04)',         // 4% dark ink on light canvas
    border: 'rgba(17, 24, 39, 0.08)',             // faint hairline
    backgroundStrong: 'rgba(17, 24, 39, 0.06)',   // nav bar, slightly denser
  },
  dark: {
    background: 'rgba(255, 255, 255, 0.04)',      // 4% white fill (book)
    border: 'rgba(255, 255, 255, 0.10)',          // 10% white hairline
    backgroundStrong: 'rgba(255, 255, 255, 0.06)',// nav bar
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
    // Deep navy-purple morph — brand book canvas
  },
} as const;

import React from 'react';
import { View, type ViewProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';
import { palette, spacing, radius } from '../theme/tokens';
import { withAlpha } from '../utils/withAlpha';

// Brand book v1.1 chip recipe:
//   background = {ramp-400} at 18% alpha
//   color      = {ramp-200}
//   padding    = 4px 10px in the book. CardPulse overrides to 4px 12px
//                (spacing[1] / spacing[3]) at the owner's request,
//                2026-09-20, so every pill shares roomier side padding.
//   radius     = 12px
//   font       = SG 500, 12px, letterSpacing -0.1
//
// Every chip carries categorical meaning. Tiers defined on page 05:
//   Tier 1 — Price Movement: gain, loss
//   Tier 2 — Valuation:      undervalued, overvalued (reuse gain/loss colors)
//   Tier 3 — Grading Status: graded (PSA 10 etc), ungraded
//   Tier 4 — Signals / Scarcity: live, trophy

/**
 * Single source of pill geometry. Badge spreads it; any pill that must keep
 * its own View (solid promo fill etc.) spreads it too, so every pill in the
 * app shares one padding, radius and gap.
 */
export const pillGeometry = {
  flexDirection: 'row',
  alignItems: 'center',
  alignSelf: 'flex-start',
  paddingHorizontal: spacing[3],
  paddingVertical: spacing[1],
  borderRadius: radius.md, // 12px per book
  gap: spacing[1],
} as const;

/** Pill label style — pair with `<Text variant={pillTextVariant}>`. */
export const pillTextVariant = 'caption' as const;
export const pillTextStyle = { letterSpacing: -0.1, fontWeight: '500' } as const;

/**
 * Interactive selector chips (filters, pickers, range toggles). They share
 * the pill's horizontal padding so both read as one family, but deliberately
 * keep per-site vertical padding and text variant: each sits in a different
 * density context and sizes its touch target (with hitSlop) locally.
 */
export const chipGeometry = {
  paddingHorizontal: spacing[3],
  borderRadius: radius.full,
} as const;

type BookVariant =
  | 'gain'
  | 'loss'
  | 'undervalued'
  | 'overvalued'
  | 'graded'
  | 'ungraded'
  | 'live'
  | 'trophy';

// Legacy variants kept for back-compat across the app. Map to the book's
// semantic tiers so old call sites still get brand-aligned styling.
type LegacyVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

type Variant = BookVariant | LegacyVariant;

// Resolve any variant (book or legacy) to a single { fill, text } ramp pair
// drawn from the palette. `fill` is the 400-level color (chip applies 18%
// alpha); `text` is the 200-level color rendered on top. For neutrals the
// ramp is pulled from the surface stack directly since we don't carry a full
// neutral 200/400 with brand-book values in the palette — surfaceElevated
// reads close enough for a tonal neutral chip on dark canvases.
function rampFor(variant: Variant, isDark: boolean): { fill: string; text: string } {
  switch (variant) {
    case 'gain':
    case 'undervalued':
    case 'success':
      return { fill: palette.success[400], text: palette.success[200] };

    case 'loss':
    case 'overvalued':
    case 'danger':
      return { fill: palette.danger[400], text: palette.danger[200] };

    case 'graded':
    case 'warning':
      return { fill: palette.warning[400], text: palette.warning[200] };

    case 'live':
    case 'trophy':
      return { fill: palette.violet[400], text: palette.violet[200] };

    case 'info':
      return { fill: palette.primary[400], text: palette.primary[200] };

    case 'ungraded':
    case 'neutral':
    default:
      // Neutral chip: use text 2 as fill-source (still clears contrast with
      // text 1 rendered atop an 18%-alpha tint on dark canvas).
      return isDark
        ? { fill: '#9CA3AF', text: '#F9FAFB' }
        : { fill: '#6B7280', text: '#111827' };
  }
}

interface BadgeProps extends ViewProps {
  variant?: Variant;
  /** Show a leading status dot at the fill color (used by `live`). */
  dot?: boolean;
  children: string;
}

export function Badge({
  variant = 'neutral',
  dot = false,
  children,
  style,
  ...props
}: BadgeProps) {
  const { isDark } = useTheme();
  const ramp = rampFor(variant, isDark);

  return (
    <View
      style={[
        {
          ...pillGeometry,
          backgroundColor: withAlpha(ramp.fill, 0.18),
        },
        style,
      ]}
      {...props}
    >
      {(dot || variant === 'live') && (
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: radius.full,
            backgroundColor: ramp.fill,
          }}
        />
      )}
      <Text variant={pillTextVariant} color={ramp.text} style={pillTextStyle}>
        {children}
      </Text>
    </View>
  );
}

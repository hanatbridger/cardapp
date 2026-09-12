import React from 'react';
import { View, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import { useTheme } from '../theme/ThemeProvider';
import { spacing } from '../theme/tokens';
import { withAlpha } from '../utils/withAlpha';

interface ScrimCtaProps {
  /** "View more", "Upgrade to view", "Upgrade to view AI predictions". */
  label: string;
  onPress?: () => void;
  /**
   * Card background the ramp lands on. Must be the ACTUAL background of
   * the card this sits in — an elevated card ends on a different colour,
   * and a ramp to the wrong one leaves a visible seam.
   */
  background: string;
  /** Ramp height. 125 over a section card, 73 over the price card. */
  height?: number;
  /**
   * Padding of the card this is dropped into. Absolute insets resolve
   * against the parent's padding box, so this negative bleed is what
   * takes the ramp out to the card's own edges.
   */
  inset?: number;
  /** Animated opacity for the gradient — omit for a static scrim. */
  gradientStyle?: StyleProp<ViewStyle>;
  /** Announced state when the scrim belongs to a collapsible section. */
  expanded?: boolean;
  accessibilityHint?: string;
}

/** Height of the strip that carries the label and takes the tap. */
const CTA_HEIGHT = 48;

/**
 * The gradient over a cut plus the label inside it — the one control a
 * collapsed or gated card has. Lives here rather than in CollapsibleCard
 * because the price card runs the same treatment inside a card it builds
 * itself, and two copies of a gradient would drift.
 */
export function ScrimCta({
  label,
  onPress,
  background,
  height = 120,
  inset = 0,
  gradientStyle,
  expanded,
  accessibilityHint,
}: ScrimCtaProps) {
  const { colors } = useTheme();
  // withAlpha(…, 0) rather than the 'transparent' keyword: that keyword
  // is rgba(0,0,0,0), and on both native platforms the ramp would travel
  // through grey to reach it.
  const colorsRamp: readonly [string, string] = [withAlpha(background, 0), background];

  return (
    <View
      style={{
        position: 'absolute',
        left: -inset,
        right: -inset,
        bottom: -inset,
        height,
        justifyContent: 'flex-end',
        pointerEvents: 'box-none',
      }}
    >
      <Animated.View style={[StyleSheet.absoluteFill, gradientStyle, { pointerEvents: 'none' }]}>
        <LinearGradient colors={colorsRamp} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={expanded === undefined ? undefined : { expanded }}
        style={{ height: CTA_HEIGHT, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text
          variant="labelSm"
          // Same weight and colour gated or not, per the design — the
          // label says which it is, the styling doesn't shout.
          color={colors.onSurface}
          // 0.5 tracking, from the design's CTA text style.
          style={{ letterSpacing: 0.5 }}
        >
          {label}
        </Text>
      </Pressable>
    </View>
  );
}

/** Exported so callers can reserve the same strip when expanded. */
export const SCRIM_CTA_HEIGHT = CTA_HEIGHT;
/** Default ramp height, matching the section cards in the design. */
export const SCRIM_HEIGHT = 120;
/** Bleed for a card at the default padding. */
export const SCRIM_CARD_INSET = spacing[6];

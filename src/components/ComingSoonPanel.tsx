import React, { useEffect, useRef } from 'react';
import { Animated, View, Easing } from 'react-native';
import { IconLock } from '@tabler/icons-react-native';
import { Text } from './Text';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius } from '../theme/tokens';
import { withAlpha } from '../utils/withAlpha';

interface ComingSoonPanelProps {
  title: string;
  body: string;
  /** Stable key — when this changes the slide-up animation re-runs. */
  reanimateKey?: string;
}

/**
 * Inline "coming soon" panel that replaces a content section while a
 * feature isn't ready yet. Today: PSA 10 prices on the card detail
 * screen, where the segmented control allows the toggle but the price
 * area swaps in this panel until the eBay live proxy ships.
 *
 * Slides up + fades in on mount (and on `reanimateKey` changes) so the
 * tab swap feels intentional rather than abrupt.
 */
export function ComingSoonPanel({ title, body, reanimateKey }: ComingSoonPanelProps) {
  const { colors } = useTheme();
  const translateY = useRef(new Animated.Value(28)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    translateY.setValue(28);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [reanimateKey, translateY, opacity]);

  return (
    <Animated.View
      style={{
        transform: [{ translateY }],
        opacity,
        padding: spacing[6],
        borderRadius: radius.xl,
        // Glassy primary-tinted surface so the panel reads as
        // "intentional empty" rather than "error" — different visual
        // language from the existing "Price data unavailable" card.
        backgroundColor: withAlpha(colors.primary, 0.08),
        borderWidth: 1,
        borderColor: withAlpha(colors.primary, 0.18),
        gap: spacing[3],
        alignItems: 'flex-start',
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: radius.full,
          backgroundColor: withAlpha(colors.primary, 0.18),
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <IconLock size={20} color={colors.primary} />
      </View>
      <View style={{ gap: spacing[1] }}>
        <Text variant="headingSm">{title}</Text>
        <Text variant="bodySm" color={colors.onSurfaceVariant} style={{ lineHeight: 20 }}>
          {body}
        </Text>
      </View>
    </Animated.View>
  );
}

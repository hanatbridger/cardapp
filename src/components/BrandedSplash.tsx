import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { BrandMark } from './BrandMark';
import { Text } from './Text';
import { useTheme } from '../theme/ThemeProvider';
import { spacing } from '../theme/tokens';

const MIN_DISPLAY_MS = 1100;
const FADE_OUT_MS = 320;

/**
 * Full-screen branded splash rendered on top of the app for the first
 * ~1.1s after fonts load. The native Expo splash (assets/splash-icon.png)
 * already shows the logomark on the dark brand canvas — this overlay
 * picks up where it leaves off by adding the "CardPulse" wordmark and
 * tagline, then fades into the app. Matches the native splash's
 * `#0D1117` background so there's no visible swap.
 */
export function BrandedSplash({ ready }: { ready: boolean }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(1)).current;
  const [visible, setVisible] = useState(true);
  const mountedAt = useRef(Date.now()).current;

  useEffect(() => {
    if (!ready) return;
    const elapsed = Date.now() - mountedAt;
    const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
    const t = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_OUT_MS,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }, remaining);
    return () => clearTimeout(t);
  }, [ready, opacity, mountedAt]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        StyleSheet.absoluteFillObject,
        {
          // Match expo splash backgroundColor exactly (#0D1117) so the
          // crossfade has no seam. Hardcoded here — this is a brand
          // surface pinned by the native splash config, not themeable.
          backgroundColor: '#0D1117',
          alignItems: 'center',
          justifyContent: 'center',
          opacity,
        },
      ]}
    >
      <View style={{ alignItems: 'center', gap: spacing[4] }}>
        <BrandMark size={96} variant="color" />
        <View style={{ alignItems: 'center', gap: spacing[2] }}>
          <Text
            variant="display"
            color="#F9FAFB"
            style={{ fontSize: 40, letterSpacing: -1.2 }}
          >
            CardPulse
          </Text>
          <Text
            variant="body"
            color="#9CA3AF"
            style={{ letterSpacing: 0.2 }}
          >
            The pulse of the card market.
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

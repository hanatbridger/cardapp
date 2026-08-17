import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { BrandMark } from './BrandMark';
import { Text } from './Text';
import { useTheme } from '../theme/ThemeProvider';
import { spacing } from '../theme/tokens';

const MIN_DISPLAY_MS = 350;
const FADE_OUT_MS = 200;

/**
 * Full-screen branded splash rendered on top of the app for a short
 * beat after fonts load. The native Expo splash (assets/splash-icon.png)
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
    // pointerEvents lives in style (not as a prop) so it works on
    // React Native Fabric / New Architecture. Without this in style,
    // the fading splash overlay (mounted for its full display+fade
    // window and absolutely positioned to fill the screen) silently
    // captured every touch on the underlying app surface — leaving
    // the home screen un-tappable for the first second after launch.
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        StyleSheet.absoluteFillObject,
        {
          pointerEvents: 'none',
          // Must equal app.json expo.splash.backgroundColor exactly so
          // the native-to-JS handoff has no seam. Hardcoded — this is a
          // brand surface pinned by the native splash, not themeable.
          backgroundColor: '#5739FF',
          alignItems: 'center',
          justifyContent: 'center',
          opacity,
        },
      ]}
    >
      <View style={{ alignItems: 'center', gap: spacing[5] }}>
        <BrandMark size={64} variant="inverse" />
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
            color="#F9FAFB"
            style={{ letterSpacing: 0.2 }}
          >
            The pulse of the card market.
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

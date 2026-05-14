import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeProvider';
import { Text } from '../../src/components';
import { spacing, radius } from '../../src/theme/tokens';
import { HORIZONTAL_PADDING } from '../../src/constants/layout';

/**
 * Diagnostic home — entry point for the watchlist-tap bug isolation
 * walkthrough. Each linked screen below adds ONE layer of the
 * production home rendering chain on top of a stripped baseline.
 *
 * Methodology:
 *   1. Cold-launch the app (force-quit first, then reopen).
 *   2. Open this screen.
 *   3. Visit each diagnostic screen IN ORDER (1 → 5).
 *   4. On each screen, tap the first sample card row.
 *   5. The screen's "Tap counter" should increment AND the router
 *      should navigate to /card/{id}. If counter increments but no
 *      navigation, that's a router bug. If counter doesn't
 *      increment, the touch was eaten before Pressable saw it.
 *   6. Report back which screen first fails to register a tap on
 *      cold launch. That layer is the culprit.
 *
 * The screens are intentionally minimal — no styling beyond what's
 * needed to make rows tappable. Visual polish is irrelevant for
 * diagnosis.
 */

const SCREENS = [
  {
    title: '1. Bare',
    description: 'View + FlatList + Pressable. No background, no carousel, no swipe, no live price queries.',
    path: '/dev/watchlist-1-bare',
  },
  {
    title: '2. + ScreenBackground',
    description: 'Adds the animated gradient wrapper. Reanimated UI thread.',
    path: '/dev/watchlist-2-bg',
  },
  {
    title: '3. + TrendingCarousel header',
    description: 'Adds the auto-scrolling header that competes for the JS thread.',
    path: '/dev/watchlist-3-trending',
  },
  {
    title: '4. + SwipeToDelete wrap',
    description: 'Wraps each row in ReanimatedSwipeable — gesture-handler Tap+Pan conflict with Pressable.',
    path: '/dev/watchlist-4-swipe',
  },
  {
    title: '5. + useCardPrice queries',
    description: 'Each row fires a React Query on mount. Closest to production.',
    path: '/dev/watchlist-5-pricequery',
  },
];

export default function DiagnosticHome() {
  const { colors } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Diagnostic — Watchlist Tap' }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ padding: HORIZONTAL_PADDING, gap: spacing[4] }}>
          <Text variant="bodyMd" color={colors.onSurfaceVariant}>
            Cold-launch the app (force-quit + reopen), then visit each screen below in
            order. On each, tap the first row and check whether the tap counter
            increments AND whether the card detail opens.
          </Text>
          <Text variant="bodyMd" color={colors.onSurfaceVariant}>
            The first screen where taps fail to register on cold launch is the layer
            that's swallowing touches.
          </Text>

          <View style={{ gap: spacing[2] }}>
            {SCREENS.map((s) => (
              <Pressable
                key={s.path}
                onPress={() => router.push(s.path as any)}
                style={({ pressed }) => ({
                  padding: spacing[4],
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.outline,
                  backgroundColor: pressed ? colors.surfaceVariant : colors.surface,
                  gap: spacing[1],
                })}
                accessibilityRole="link"
              >
                <Text variant="labelLg">{s.title}</Text>
                <Text variant="caption" color={colors.onSurfaceVariant}>
                  {s.description}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

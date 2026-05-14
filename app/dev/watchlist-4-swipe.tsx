import React, { useState } from 'react';
import { View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { spacing } from '../../src/theme/tokens';
import { HORIZONTAL_PADDING } from '../../src/constants/layout';
import { SAMPLE_CARDS } from '../../src/dev/diagnostic-data';
import { DiagnosticRow, TapCounterBanner } from '../../src/dev/DiagnosticRow';
import { ScreenBackground, TrendingCarousel, SwipeToDelete } from '../../src/components';
import { Text } from '../../src/components';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useTrendingMovers } from '../../src/hooks';
import type { TrendingTile } from '../../src/services/trending';

/**
 * Layer 4: + SwipeToDelete.
 *
 * Wraps each row in ReanimatedSwipeable. This is the highest-
 * suspect layer per the gesture-handler source inspection —
 * ReanimatedSwipeable internally creates BOTH a Gesture.Tap() and
 * a Gesture.Pan(), and on cold launch gesture-handler's
 * initialization can race with the inner Pressable's onPress
 * registration.
 *
 * If taps register at layer 3 but break here, SwipeToDelete is
 * the bug. Fix candidates: simultaneousWithExternalGesture, switch
 * to gesture-handler's RectButton inside, or different swipe lib.
 */
export default function WithSwipe() {
  const { colors } = useTheme();
  const [tapCount, setTapCount] = useState(0);
  const { data: liveTrending } = useTrendingMovers(12);
  const trendingItems: TrendingTile[] = liveTrending?.items ?? [];

  return (
    <>
      <Stack.Screen options={{ title: '4. + SwipeToDelete' }} />
      <ScreenBackground>
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
          <FlatList
            data={SAMPLE_CARDS}
            keyExtractor={(item) => item.cardId}
            ListHeaderComponent={
              <View style={{ gap: spacing[3], marginBottom: spacing[3] }}>
                <TapCounterBanner count={tapCount} />
                <Text variant="labelLg" color={colors.onSurfaceVariant}>
                  Trending now (auto-scroll)
                </Text>
                {trendingItems.length > 0 && (
                  <TrendingCarousel items={trendingItems} />
                )}
              </View>
            }
            renderItem={({ item }) => (
              <View style={{ marginTop: spacing[2] }}>
                <SwipeToDelete onDelete={() => {}}>
                  <DiagnosticRow card={item} onTap={() => setTapCount((c) => c + 1)} />
                </SwipeToDelete>
              </View>
            )}
            contentContainerStyle={{ padding: HORIZONTAL_PADDING }}
          />
        </SafeAreaView>
      </ScreenBackground>
    </>
  );
}

import React, { useState } from 'react';
import { View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { spacing } from '../../src/theme/tokens';
import { HORIZONTAL_PADDING } from '../../src/constants/layout';
import { SAMPLE_CARDS } from '../../src/dev/diagnostic-data';
import { DiagnosticRow, TapCounterBanner } from '../../src/dev/DiagnosticRow';
import { ScreenBackground, TrendingCarousel } from '../../src/components';
import { Text } from '../../src/components';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useTrendingMovers } from '../../src/hooks';
import type { TrendingTile } from '../../src/services/trending';

/**
 * Layer 3: + TrendingCarousel.
 *
 * Adds the auto-scrolling trending header. TrendingCarousel was
 * migrated to Reanimated useFrameCallback in Build 18 — animation
 * runs on the UI thread — but on cold launch its useFrameCallback
 * activation timing might still compete with the FlatList children's
 * Pressables during the first frames.
 *
 * If taps register fine at layer 2 but break here, the carousel is
 * the culprit.
 */
export default function WithTrending() {
  const { colors } = useTheme();
  const [tapCount, setTapCount] = useState(0);
  const { data: liveTrending } = useTrendingMovers(12);
  const trendingItems: TrendingTile[] = liveTrending?.items ?? [];

  return (
    <>
      <Stack.Screen options={{ title: '3. + TrendingCarousel' }} />
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
                <DiagnosticRow card={item} onTap={() => setTapCount((c) => c + 1)} />
              </View>
            )}
            contentContainerStyle={{ padding: HORIZONTAL_PADDING }}
          />
        </SafeAreaView>
      </ScreenBackground>
    </>
  );
}

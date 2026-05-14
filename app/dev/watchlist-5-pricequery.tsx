import React, { useState } from 'react';
import { View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { spacing } from '../../src/theme/tokens';
import { HORIZONTAL_PADDING } from '../../src/constants/layout';
import { SAMPLE_CARDS, type DiagnosticCard } from '../../src/dev/diagnostic-data';
import { DiagnosticRow, TapCounterBanner } from '../../src/dev/DiagnosticRow';
import { ScreenBackground, TrendingCarousel, SwipeToDelete } from '../../src/components';
import { Text } from '../../src/components';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useTrendingMovers } from '../../src/hooks';
import type { TrendingTile } from '../../src/services/trending';
import { useCardPrice } from '../../src/hooks/use-card-price';

/**
 * Layer 5: + useCardPrice queries per row.
 *
 * Each row fires the same useCardPrice React Query hook the
 * production WatchlistCard uses. This is the closest the
 * diagnostic gets to the actual production rendering chain.
 *
 * If taps register fine at layer 4 but break here on cold launch,
 * the bug is in the price-query side effect — likely a render
 * storm during initial query firing that disrupts touch.
 */

function RowWithPriceQuery({
  card,
  onTap,
}: {
  card: DiagnosticCard;
  onTap: () => void;
}) {
  // Fire the same query the production row fires. The result is
  // intentionally unused — we only care whether firing the query
  // disrupts touch handling on the parent row.
  useCardPrice({
    cardName: card.cardName,
    grade: 'UNGRADED',
    cardId: card.cardId,
    setName: card.setName,
  });
  return <DiagnosticRow card={card} onTap={onTap} />;
}

export default function WithPriceQuery() {
  const { colors } = useTheme();
  const [tapCount, setTapCount] = useState(0);
  const { data: liveTrending } = useTrendingMovers(12);
  const trendingItems: TrendingTile[] = liveTrending?.items ?? [];

  return (
    <>
      <Stack.Screen options={{ title: '5. + useCardPrice' }} />
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
                  <RowWithPriceQuery
                    card={item}
                    onTap={() => setTapCount((c) => c + 1)}
                  />
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

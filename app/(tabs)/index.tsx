import React, { useState, useCallback } from 'react';
import { View, FlatList, Pressable, RefreshControl, Alert } from 'react-native';
import { Haptics } from '../../src/utils/haptics';
import { IconSearch } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../src/theme/ThemeProvider';
import {
  Text,
  TrendingCarousel,
  WatchlistCard,
  EmptyState,
  AnimatedListItem,
  ScreenBackground,
  Badge,
  withErrorBoundary,
} from '../../src/components';
import { spacing, radius } from '../../src/theme/tokens';
import { HORIZONTAL_PADDING } from '../../src/constants/layout';
import { useWatchlistStore, useUserStore } from '../../src/stores';
import { MOCK_CARDS, getPrice } from '../../src/mocks';
import type { CardPrice } from '../../src/types/card';

function WatchlistScreen() {
  const { colors } = useTheme();
  const { items, maxFreeItems } = useWatchlistStore();
  const isPremium = useUserStore((s) => s.isPremium);
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Invalidate every price query so each card re-fetches live data.
    // useCardPrice is keyed `['prices', ...]` so this catches all of them.
    await queryClient.invalidateQueries({ queryKey: ['prices'] });
    setRefreshing(false);
  }, [queryClient]);

  // Trending rail — raw (UNGRADED) cards only, with % change from the
  // seeded mock dataset. Filtered to cards that have an UNGRADED price
  // entry so every tile shows a real number.
  const trendingItems = MOCK_CARDS
    .map((card) => ({ card, price: getPrice(card.id, 'UNGRADED') }))
    .filter((item): item is { card: typeof item.card; price: CardPrice } => !!item.price)
    .slice(0, 8);

  return (
    <ScreenBackground>
      <FlatList
        data={items}
        keyExtractor={(item) => `${item.cardId}-${item.grade}`}
        ListHeaderComponent={
          <View style={{ gap: spacing[4] }}>
            {/* Header — 56-pt row matches CollapsingHeader on the Explore
                tab so the title sits at the same y-offset across all four
                tab landing screens (no jump when switching tabs). */}
            <View
              style={{
                height: 56,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: HORIZONTAL_PADDING,
              }}
            >
              <Text variant="headingLg">Home</Text>
              <Pressable
                // `focus=1` opens Explore directly into the X-style focused
                // search overlay. `from=home` tells Explore that Cancel
                // should pop back to Home rather than leaving the user on
                // the Explore tab. See app/(tabs)/search.tsx.
                onPress={() => router.push('/(tabs)/search?focus=1&from=home')}
                hitSlop={8}
                accessibilityLabel="Search"
                accessibilityRole="button"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: radius.full,
                  backgroundColor: colors.surfaceVariant,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconSearch size={20} color={colors.onSurfaceVariant} />
              </Pressable>
            </View>

            {/* Demo data notice — prices shown are from a seeded dataset
                until the live eBay pricing service is deployed. Tapping
                the chip explains this to users and App Store reviewers. */}
            <View style={{ paddingHorizontal: HORIZONTAL_PADDING }}>
              <Pressable
                onPress={() =>
                  Alert.alert(
                    'Sample data',
                    'CardPulse is in early access. Prices, trends, and recent sales shown here come from a curated sample dataset. Live eBay pricing turns on soon — your watchlist and alerts will keep working the whole time.',
                    [{ text: 'Got it' }],
                  )
                }
                accessibilityRole="button"
                accessibilityLabel="Sample data notice. Tap for details."
                hitSlop={8}
              >
                <Badge variant="info">Sample data — tap for details</Badge>
              </Pressable>
            </View>

            {/* Trending — raw card movers */}
            <View style={{ gap: spacing[2] }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: HORIZONTAL_PADDING,
                  gap: spacing[1],
                }}
              >
                <Text variant="labelLg" color={colors.onSurfaceVariant}>
                  Trending now
                </Text>
              </View>
              <TrendingCarousel items={trendingItems} />
            </View>

            {/* Watchlist count — hidden on first launch (empty list shows
                its own EmptyState below with a Search CTA) */}
            {items.length > 0 && (
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: HORIZONTAL_PADDING,
                }}
              >
                <Text variant="labelLg" color={colors.onSurfaceVariant}>
                  {items.length === 1 ? '1 card tracked' : `${items.length} cards tracked`}
                </Text>
                {!isPremium && (
                  <Text variant="caption" color={colors.onSurfaceMuted}>
                    {items.length}/{maxFreeItems}
                  </Text>
                )}
              </View>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <AnimatedListItem index={index}>
          <View style={{ paddingHorizontal: HORIZONTAL_PADDING, marginTop: spacing[2] }}>
            <WatchlistCard
              cardId={item.cardId}
              cardName={item.cardName}
              cardImageUrl={item.cardImageUrl}
              setName={item.setName}
              setNumber={item.setNumber}
              grade={item.grade}
              language={item.language}
              rarity={item.rarity ?? MOCK_CARDS.find(c => c.id === item.cardId)?.rarity}
              // Fallback shown only briefly while the live query loads, or if it fails.
              // The real price comes from useCardPrice inside WatchlistCard — same
              // source as the detail screen, so numbers always agree.
              fallbackPrice={getPrice(item.cardId, item.grade) ?? (item.lastPrice && item.lastPriceChange !== undefined ? {
                cardName: item.cardName,
                grade: item.grade,
                currentPrice: item.lastPrice,
                previousPrice: item.lastPrice,
                percentChange: item.lastPriceChange,
                lastSaleDate: '',
                lastSalePrice: item.lastPrice,
                averagePrice: item.lastPrice,
                highPrice: item.lastPrice,
                lowPrice: item.lastPrice,
                salesCount: 0,
              } : undefined)}
            />
          </View>
          </AnimatedListItem>
        )}
        ListEmptyComponent={
          <EmptyState
            icon={<IconSearch size={40} color={colors.onSurfaceMuted} />}
            title="No cards yet"
            description="Search for Pokemon cards and add them to your watchlist to track prices."
            actionLabel="Search Cards"
            onAction={() => router.push('/(tabs)/search')}
          />
        }
        contentContainerStyle={{ paddingBottom: spacing[24], gap: spacing[1] }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      />
    </ScreenBackground>
  );
}

export default withErrorBoundary(WatchlistScreen, 'Home');

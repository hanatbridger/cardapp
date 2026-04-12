import React, { useState, useCallback } from 'react';
import { View, FlatList, Pressable, RefreshControl } from 'react-native';
import * as Haptics from 'expo-haptics';
import { IconSearch } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeProvider';
import {
  Text,
  TrendingCarousel,
  WatchlistCard,
  EmptyState,
  AnimatedListItem,
  ScreenBackground,
  withErrorBoundary,
} from '../../src/components';
import { spacing, radius } from '../../src/theme/tokens';
import { HORIZONTAL_PADDING } from '../../src/constants/layout';
import { useWatchlistStore } from '../../src/stores';
import { MOCK_CARDS, MOCK_PRICES, getPrice } from '../../src/mocks';

function WatchlistScreen() {
  const { colors } = useTheme();
  const { items, isPremium, maxFreeItems } = useWatchlistStore();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Simulate price refresh — will be real API call with JustTCG integration
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  }, []);

  const trendingItems = MOCK_CARDS.slice(0, 8).map((card) => ({
    card,
    price: MOCK_PRICES[card.id],
  }));

  return (
    <ScreenBackground>
      <FlatList
        data={items}
        keyExtractor={(item) => `${item.cardId}-${item.grade}`}
        ListHeaderComponent={
          <View style={{ gap: spacing[4] }}>
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: HORIZONTAL_PADDING,
                paddingTop: spacing[4],
              }}
            >
              <Text variant="headingLg">Home</Text>
              <Pressable
                onPress={() => router.push('/(tabs)/search')}
                hitSlop={8}
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

            {/* Trending */}
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

            {/* Watchlist count */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: HORIZONTAL_PADDING,
              }}
            >
              <Text variant="labelLg" color={colors.onSurfaceVariant}>
                {items.length} cards tracked
              </Text>
              {!isPremium && (
                <Text variant="caption" color={colors.onSurfaceMuted}>
                  {items.length}/{maxFreeItems}
                </Text>
              )}
            </View>
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
              grade={item.grade}
              rarity={item.rarity ?? MOCK_CARDS.find(c => c.id === item.cardId)?.rarity}
              price={getPrice(item.cardId, item.grade) ?? (item.lastPrice && item.lastPriceChange !== undefined ? {
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

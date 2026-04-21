import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, FlatList, Pressable, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Haptics } from '../../src/utils/haptics';
import { IconSearch } from '@tabler/icons-react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../src/theme/ThemeProvider';
import {
  Text,
  TrendingCarousel,
  WatchlistCard,
  SealedWatchlistCard,
  EmptyState,
  ScreenBackground,
  Badge,
  BrandMark,
  withErrorBoundary,
} from '../../src/components';
import { spacing, radius } from '../../src/theme/tokens';
import { HORIZONTAL_PADDING } from '../../src/constants/layout';
import { useWatchlistStore, useUserStore } from '../../src/stores';
import type { WatchlistItem } from '../../src/stores';
import { MOCK_CARDS, getPrice } from '../../src/mocks';
import type { CardPrice } from '../../src/types/card';

// Floating tab bar occupies 64pt + safe-area bottom + offset. Pad the
// list enough that the last card clears the glass pill — otherwise its
// middle sits under the bar and the bar's Pressables steal the tap.
const TAB_BAR_CLEARANCE = 64 + 4;

function WatchlistScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
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
  // seeded mock dataset. Ranks every card with an UNGRADED price by the
  // magnitude of its % move, pools the top 24, then picks 8 deterministic
  // picks seeded by today's UTC date. Same day = same rail (so refresh
  // doesn't reshuffle while the user scrolls); new day = new rail (so it
  // tracks what's moving right now). Memoized on `dayKey` so the rail
  // recomputes exactly once per day without forcing a re-render on
  // every keystroke or scroll event elsewhere on Home.
  //
  // When the live eBay/TCGPlayer pricing service ships, this same shape
  // ranks live movers — the selection logic stays, only the data source
  // swaps. That's why we sort by |%change| instead of a static "trending"
  // flag: it generalizes to live data without reshaping callers.
  // Tick forward to the next UTC date when it rolls over. Kept as state
  // (not a memo) so a user who leaves the app open past midnight still
  // sees a fresh trending rail — otherwise useMemo([]) would freeze the
  // key at launch-day forever. Invalidate live price queries at the same
  // boundary so carousel numbers don't trail a day behind their ranking.
  const [dayKey, setDayKey] = useState(() => {
    const d = new Date();
    return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
  });

  useEffect(() => {
    const scheduleNextTick = () => {
      const now = new Date();
      const next = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0, 0, 5, // 5s past midnight UTC to dodge any clock-drift race
      ));
      return next.getTime() - now.getTime();
    };
    const timer = setTimeout(() => {
      const d = new Date();
      setDayKey(`${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`);
      // Refresh live prices too — the new rail should show live numbers,
      // not yesterday's cached % moves.
      queryClient.invalidateQueries({ queryKey: ['prices'] });
    }, scheduleNextTick());
    return () => clearTimeout(timer);
  }, [dayKey, queryClient]);

  const trendingItems = useMemo(() => {
    // Hash the day key into a 32-bit seed, then drive a deterministic
    // PRNG (mulberry32). Same seed every render of the same day; fresh
    // shuffle at midnight UTC. Inlined so this file doesn't grow a
    // utility import for 10 lines of number-crunching.
    let h = 2166136261;
    for (let i = 0; i < dayKey.length; i++) {
      h ^= dayKey.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    let seed = h >>> 0;
    const rand = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const pool = MOCK_CARDS
      .map((card) => ({ card, price: getPrice(card.id, 'UNGRADED') }))
      .filter((item): item is { card: typeof item.card; price: CardPrice } => !!item.price)
      // Biggest absolute movers surface first — a -12% drop is as
      // newsworthy as a +12% pop. Ties broken by card id so ranking is
      // stable when prices coincide.
      .sort((a, b) => {
        const da = Math.abs(b.price.percentChange) - Math.abs(a.price.percentChange);
        return da !== 0 ? da : a.card.id.localeCompare(b.card.id);
      });

    // Take the top ~24 and Fisher-Yates-shuffle them with the day-seeded
    // PRNG. Then slice 8. This way users see a rotating mix of the day's
    // hottest movers instead of the same 8 names every day.
    const top = pool.slice(0, Math.min(24, pool.length));
    for (let i = top.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [top[i], top[j]] = [top[j], top[i]];
    }
    return top.slice(0, 8);
  }, [dayKey]);

  return (
    <ScreenBackground>
      <FlatList
        data={items}
        keyExtractor={(item: WatchlistItem) =>
          item.kind === 'sealed'
            ? `sealed-${item.productId}`
            : `card-${item.cardId}-${item.grade}`
        }
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                <BrandMark size={24} />
                <Text variant="title">CardPulse</Text>
              </View>
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
                its own EmptyState below with a Search CTA). The label
                flexes to "items" when the list mixes sealed products with
                cards, since "cards tracked" would misrepresent the row. */}
            {items.length > 0 && (() => {
              const hasSealed = items.some((i) => i.kind === 'sealed');
              const noun = hasSealed
                ? items.length === 1 ? 'item' : 'items'
                : items.length === 1 ? 'card' : 'cards';
              return (
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingHorizontal: HORIZONTAL_PADDING,
                  }}
                >
                  <Text variant="labelLg" color={colors.onSurfaceVariant}>
                    {items.length} {noun} tracked
                  </Text>
                  {!isPremium && (
                    <Text variant="caption" color={colors.onSurfaceMuted}>
                      {items.length}/{maxFreeItems}
                    </Text>
                  )}
                </View>
              );
            })()}
          </View>
        }
        renderItem={({ item }: { item: WatchlistItem }) => (
          // No AnimatedListItem wrapper here — on iOS, the Reanimated
          // opacity/translateY transforms on a FlatList row inside a
          // virtualized list were eating touches on the WatchlistCard's
          // TouchableOpacity. The subtle fade-in isn't worth the dead
          // rows. Search keeps the animation — its rows are far shorter.
          <View style={{ paddingHorizontal: HORIZONTAL_PADDING, marginTop: spacing[2] }}>
            {item.kind === 'sealed' ? (
              <SealedWatchlistCard
                productId={item.productId}
                productName={item.productName}
                productType={item.productType}
                setName={item.setName}
                imageUrl={item.imageUrl}
                fallbackPrice={item.lastPrice}
                fallbackPriceChange={item.lastPriceChange}
              />
            ) : (
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
            )}
          </View>
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
        contentContainerStyle={{
          paddingBottom: TAB_BAR_CLEARANCE + insets.bottom + spacing[6],
          gap: spacing[1],
        }}
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

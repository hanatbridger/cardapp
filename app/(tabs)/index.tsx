import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Haptics } from '../../src/utils/haptics';
import { IconSearch } from '@tabler/icons-react-native';
import { router, useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../src/theme/ThemeProvider';
import {
  Text,
  TrendingCarousel,
  WatchlistCard,
  SealedWatchlistCard,
  EmptyState,
  ScreenBackground,
  BrandMark,
  MarketIndexBar,
  SinceAddedLabel,
  Touchable,
  withErrorBoundary,
} from '../../src/components';
import { spacing, radius } from '../../src/theme/tokens';
import { HORIZONTAL_PADDING } from '../../src/constants/layout';
import { useWatchlistStore, useUserStore } from '../../src/stores';
import type { WatchlistItem } from '../../src/stores';
import { MOCK_CARDS, getPrice } from '../../src/mocks';
import type { CardPrice } from '../../src/types/card';
import { useTrendingMovers, useBatchPrices } from '../../src/hooks';
import {
  maybeRequestReview,
  sessionActiveMs,
  MIN_SESSION_ACTIVE_MS,
} from '../../src/utils/review-prompt';
import { sinceAddedReturn, averageSinceAdded } from '../../src/services/since-added';
import { isSealedPriceLive } from '../../src/services/tcgplayer';
import type { TrendingTile } from '../../src/services/trending';

/**
 * Memoized card row — builds the fallbackPrice object HERE, keyed on the
 * item's stamped price fields. Building it inline in renderItem minted a
 * fresh object every Home render, which defeated WatchlistCard's
 * React.memo and re-rendered every row (score + valuation + image) on
 * any screen-level state change.
 */
const HomeCardRow = React.memo(function HomeCardRow({
  item,
  livePrice,
  showSinceAdded,
}: {
  item: Extract<WatchlistItem, { kind: 'card' }>;
  livePrice: { currentPrice: number; percentChange: number } | null | undefined;
  showSinceAdded: boolean;
}) {
  // Last-known price ONLY — never the seeded mock. This fallback paints
  // on every cold start, on every watchlist add/remove, and forever for
  // a card the batch can't price, so a sample number here reads as the
  // user's real holding. No stamp yet means the row shows `--` until the
  // first live price lands.
  const fallbackPrice = useMemo(
    () =>
      item.lastPrice && item.lastPriceChange !== undefined
        ? {
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
          }
        : undefined,
    [item],
  );
  const rarity = useMemo(
    () => item.rarity ?? MOCK_CARDS.find((c) => c.id === item.cardId)?.rarity,
    [item],
  );
  return (
    <WatchlistCard
      cardId={item.cardId}
      cardName={item.cardName}
      cardImageUrl={item.cardImageUrl}
      setName={item.setName}
      setNumber={item.setNumber}
      grade={item.grade}
      language={item.language}
      rarity={rarity}
      livePrice={livePrice}
      fallbackPrice={fallbackPrice}
      baselinePrice={item.baselinePrice}
      baselineAt={item.baselineAt}
      showSinceAdded={showSinceAdded}
    />
  );
});

// Floating tab bar occupies 64pt + safe-area bottom + offset. Pad the
// list enough that the last card clears the glass pill — otherwise its
// middle sits under the bar and the bar's Pressables steal the tap.
const TAB_BAR_CLEARANCE = 64 + 4;

function WatchlistScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // Field selectors, not a whole-store destructure — Home sits mounted
  // behind every pushed screen, and any watchlist write re-rendered the
  // entire tree mid-transition.
  const rawItems = useWatchlistStore((s) => s.items);
  const maxFreeItems = useWatchlistStore((s) => s.maxFreeItems);
  // PSA 10 tracking is gated until the eBay live proxy ships — hide
  // any previously-saved PSA 10 cards from the list and the count.
  // The store keeps the data intact, so they reappear automatically
  // when the gate lifts. Sealed products and Raw cards always show.
  const items = useMemo(
    () => rawItems.filter((i) => !(i.kind === 'card' && i.grade === 'PSA10')),
    [rawItems],
  );
  const isPremium = useUserStore((s) => s.isPremium);
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  // One batched price request for every visible card row instead of a
  // per-row /api/tcgplayer/price call (the old N+1). PSA10 rows are
  // already filtered out above, so every id here is UNGRADED —
  // TCGPlayer territory.
  const watchlistCardIds = useMemo(
    () => items.filter((i) => i.kind === 'card').map((i) => i.cardId),
    [items],
  );
  const batchQuery = useBatchPrices(watchlistCardIds);
  const batchPrices = batchQuery.data;

  // Since-added baselines for rows that have none — added before the
  // feature shipped, or before their price loaded. Batch prices are live
  // TCGPlayer only (no sample fallback), so they are safe to anchor on.
  const stampBaselines = useWatchlistStore((s) => s.stampBaselines);
  useEffect(() => {
    if (!batchPrices) return;
    const entries = items.flatMap((i) => {
      if (i.kind !== 'card' || i.baselineAt) return [];
      const p = batchPrices[i.cardId]?.currentPrice;
      return typeof p === 'number' && p > 0 ? [{ id: i.cardId, grade: i.grade, price: p }] : [];
    });
    if (entries.length > 0) stampBaselines(entries);
  }, [batchPrices, items, stampBaselines]);

  // Persist the batch as each row's last-known price. Without this the
  // stamp only ever came from opening card detail, so a cold start showed
  // a dash (or a days-old number) until the network answered.
  const stampBatchPrices = useWatchlistStore((s) => s.stampBatchPrices);
  useEffect(() => {
    if (!batchPrices || batchQuery.isPlaceholderData) return;
    stampBatchPrices(batchPrices);
  }, [batchPrices, batchQuery.isPlaceholderData, stampBatchPrices]);

  // Watchlist return since added (Premium): equal-weighted mean of the
  // rows that have one. Cards read the live batch; sealed read their
  // live-refreshed stamp, and only for live-priced products.
  const avgSinceAdded = useMemo(() => {
    if (!isPremium) return null;
    return averageSinceAdded(
      items.map((i) =>
        i.kind === 'card'
          ? sinceAddedReturn(i, batchPrices?.[i.cardId]?.currentPrice)
          : isSealedPriceLive(i.productId)
            ? sinceAddedReturn(i, i.lastPrice)
            : null,
      ),
    );
  }, [isPremium, items, batchPrices]);

  // Rating prompt — second trigger. The alert-fired moment in
  // Notifications is the better one but most users never reach it, so
  // an engaged user who has been in the app a couple of minutes counts
  // too.
  //
  // Engagement is the whole gate: three or more tracked items. An
  // earlier version also required a card to be UP, which would have
  // meant never — raw prices come from TCGPlayer's bundled market
  // price, which carries no prior value, so percentChange is 0 for
  // every card and lastPriceChange is only ever stamped from card
  // detail. Re-add a "good news" condition only when a real
  // day-over-day change exists to test.
  //
  // maybeRequestReview owns every throttle (launch count, 120-day
  // cooldown, once per version) and iOS caps it again at three a year,
  // so extra call sites cannot turn into prompt spam.
  useFocusEffect(
    useCallback(() => {
      if (items.length < 3) return;
      // Wait out the rest of the session minimum rather than asking on
      // arrival. Leaving Home cancels the timer and returning
      // re-schedules it against the updated clock, so the prompt always
      // lands on Home rather than mid-task on another screen.
      const remaining = Math.max(0, MIN_SESSION_ACTIVE_MS - sessionActiveMs());
      const timer = setTimeout(() => {
        maybeRequestReview();
      }, remaining + 1000);
      return () => clearTimeout(timer);
    }, [items.length]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Invalidate every price query so each card re-fetches live data.
    // useCardPrice is keyed `['prices', ...]`; the Home batch is keyed
    // `['batch-prices', ...]`; the index strip is `['market-index', ...]`
    // — pulling down should refresh what the screen actually shows.
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['prices'] }),
      queryClient.invalidateQueries({ queryKey: ['batch-prices'] }),
      queryClient.invalidateQueries({ queryKey: ['market-index'] }),
    ]);
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
      queryClient.invalidateQueries({ queryKey: ['batch-prices'] });
    }, scheduleNextTick());
    return () => clearTimeout(timer);
  }, [dayKey, queryClient]);

  // Live trending — proxied from collectrics.com via /api/trending. The
  // upstream feed publishes one snapshot per day with day-over-day
  // % change, which is exactly what we want to surface. Cached at the
  // edge for 6h, so refreshes are cheap.
  const { data: liveTrending } = useTrendingMovers(12);

  // Fallback rail — date-seeded shuffle of MOCK_CARDS by |% change|. Used
  // on the very first paint before the trending fetch resolves and as a
  // safety net if the upstream is down. Same data shape as live so the
  // carousel doesn't have to branch.
  const fallbackTrending: TrendingTile[] = useMemo(() => {
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
      .sort((a, b) => {
        const da = Math.abs(b.price.percentChange) - Math.abs(a.price.percentChange);
        return da !== 0 ? da : a.card.id.localeCompare(b.card.id);
      });

    const top = pool.slice(0, Math.min(24, pool.length));
    for (let i = top.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [top[i], top[j]] = [top[j], top[i]];
    }
    return top.slice(0, 8).map<TrendingTile>(({ card, price }) => ({
      productId: card.id,
      // MOCK_CARDS use real Pokemon TCG card ids as `card.id` (e.g.
      // "sv3pt5-199"), so the fallback can populate cardId directly.
      // Without this, fallback tiles rendered during the cold-launch
      // window (before the live /api/trending fetch resolves) would
      // tap-through to search instead of /card/{id}. Now both the
      // fallback and live paths route directly to detail.
      cardId: card.id,
      name: card.name,
      setName: card.set.name,
      rarity: card.rarity ?? '',
      imageUrl: card.images.small,
      rawPrice: price.currentPrice,
      percentChange: price.percentChange,
    }));
  }, [dayKey]);

  // Prefer live, fall back to seeded shuffle.
  const trendingItems: TrendingTile[] =
    liveTrending?.items && liveTrending.items.length > 0
      ? liveTrending.items
      : fallbackTrending;

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
                {/* Logomark sized to track the headingLg cap height
                    (24/700) so the wordmark + mark optical weight
                    matches Notifications/Profile/Explore titles. 28pt
                    keeps the 1.16x mark-to-text ratio that reads as
                    balanced — same ratio Material 3 uses for app-bar
                    leading icons. */}
                <BrandMark size={28} />
                <Text variant="headingLg">CardPulse</Text>
              </View>
              {/* Touchable = RectButton on native (Fabric-reliable),
                  Pressable on web (real onClick). See
                  components/Touchable.tsx. */}
              <Touchable
                onPress={() => router.push('/(tabs)/search?focus=1&from=home')}
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
              </Touchable>
            </View>

            {/* Market index — three horizons on one matched basket of
                the cards our daily cron tracks. Sits under the header
                like a broker app's index tickers. */}
            <MarketIndexBar />

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
                  {isPremium ? (
                    avgSinceAdded !== null ? (
                      <SinceAddedLabel pct={avgSinceAdded} prefix="Avg" />
                    ) : null
                  ) : (
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
          //
          // SwipeToDelete REMOVED in v1.0.5 — see commit message for the
          // full diagnosis. Short version: ReanimatedSwipeable's internal
          // Gesture.Tap arbitrated against RectButton's gesture and won
          // every time, cancelling the row's onPress before it fired.
          // HUD evidence (v1.0.4 diagnostic build) captured the cancel
          // sequence: active=true → outerView.onTouchStart →
          // outerView.onTouchEnd → active=false, no onPress. Removing
          // the swipe wrapper removes the parent gesture; RectButton's
          // press now fires uninterrupted.
          //
          // Users delete from card detail (heart icon). Swipe-to-delete
          // returns in a future release using a swipe library that
          // doesn't internally claim taps (or a different UX entirely
          // like a long-press menu).
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
                baselinePrice={item.baselinePrice}
                baselineAt={item.baselineAt}
                showSinceAdded={isPremium}
              />
            ) : (
              // Batched live price for this row. Passing null (batch
              // loading, or no price for this card) keeps the row's
              // internal per-row query DISABLED and renders the
              // fallback — that's the whole point of the batch. If the
              // batch request itself errored, pass undefined so rows
              // fall back to their own per-row fetch as a safety net.
              <HomeCardRow
                item={item}
                livePrice={batchQuery.isError ? undefined : batchPrices?.[item.cardId] ?? null}
                showSinceAdded={isPremium}
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

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, ScrollView, FlatList, useWindowDimensions, Pressable, Linking, Share, Alert, Platform, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { IconChevronLeft, IconShare, IconPlus, IconMinus, IconBellRinging, IconBellFilled, IconExternalLink, IconCirclePlus, IconCircleCheck, IconRefresh, IconAlertCircle, IconLock } from '@tabler/icons-react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import {
  Text,
  Card,
  Button,
  SegmentedControl,
  PriceChange,
  PriceChart,
  AIValuation,
  CardFundamentals,
  MarketDynamics,
  PriceAlertModal,
  WatchlistFullModal,
  CardDetailSkeleton,
  Skeleton,
  ComingSoonPanel,
  withErrorBoundary,
} from '../../src/components';
import { spacing, radius } from '../../src/theme/tokens';
import { formatRelativeTime } from '../../src/utils/format';
import { withAlpha } from '../../src/utils/withAlpha';
import { HORIZONTAL_PADDING, LARGE_CARD_BORDER_RADIUS } from '../../src/constants/layout';
import { cardShareUrl } from '../../src/constants/links';
// Card data/valuation handled internally by AIValuation component
import { GRADE_OPTIONS, GRADES } from '../../src/constants/grades';
import { useWatchlistStore } from '../../src/stores';
import { useAlertsStore, MAX_FREE_ALERTS } from '../../src/stores/alerts-store';
import { requestNotificationPermission } from '../../src/services/notifications';
import { useCardDetail, useCardPrice, usePriceHistory, useMoney, useRelatedCards, useCardStats } from '../../src/hooks';

// No 1D: history is one snapshot per day, so a 1-day window can never
// hold the 3 points the chart needs — it only ever showed the
// "building history" placeholder.
const TIME_RANGES = ['1W', '1M', '3M'];
const RANGE_DAYS = [7, 30, 90];
const DAY_MS = 86400000;

// Shared by the raw and PSA 10 chart series. Falls back to the full
// series when the window holds fewer than 2 points — a sparse chart
// beats an empty one.
function filterHistoryByRange<T extends { date: string }>(
  series: T[] | undefined,
  timeRangeIndex: number,
): T[] {
  if (!series || series.length === 0) return [];
  const cutoff = Date.now() - RANGE_DAYS[timeRangeIndex] * DAY_MS;
  const filtered = series.filter((p) => new Date(p.date).getTime() >= cutoff);
  return filtered.length >= 2 ? filtered : series;
}

function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  // Module-scope Dimensions.get is 0 on web before first layout and
  // stale after rotation — it fed PriceChart a negative width.
  const { width: screenWidth } = useWindowDimensions();
  const formatMoney = useMoney();
  const { items, addItem, removeItem, updatePrice, canAddMore, maxFreeItems } = useWatchlistStore();
  // Always open on Raw. PSA 10 only has real data for collectrics-
  // tracked cards, so landing there (as the old persisted defaultGrade
  // preference made many users do) could show a dead tab and hide
  // fundamentals/valuation until the user discovers the toggle. Raw is
  // where the primary live data is.
  const [gradeIndex, setGradeIndex] = useState(() => GRADE_OPTIONS.indexOf('UNGRADED'));
  const [timeRangeIndex, setTimeRangeIndex] = useState(1); // default 1M
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [watchlistFullVisible, setWatchlistFullVisible] = useState(false);
  // Pops a coming-soon overlay every time the user flips TO PSA 10.
  // Tracked via a ref of the previous grade so the trigger fires on
  // the transition only, not on initial mount when the user lands on
  // a PSA 10 default. Using `psaModalSuppressedOnMount` lets us skip
  // that very-first auto-fire so the popup feels like a response to
  // an action rather than a screen-load surprise.
  const [psaModalVisible, setPsaModalVisible] = useState(false);
  const prevGradeRef = useRef(GRADE_OPTIONS[gradeIndex]);
  const [refreshing, setRefreshing] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const { alerts: allAlerts, addAlert, removeAlert } = useAlertsStore();

  // Tick once a minute so the "Updated Xm ago" label stays fresh
  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Fetch card from API (checks mocks first, then Pokemon TCG API)
  const {
    data: card,
    isLoading: cardLoading,
    isError: cardError,
    refetch: refetchCard,
  } = useCardDetail(id ?? '');
  const selectedGrade = GRADE_OPTIONS[gradeIndex];

  // Real eBay prices with mock fallback — includes set name + number for exact matching
  const {
    data: price,
    isLoading: priceLoading,
    isFetching: priceFetching,
    dataUpdatedAt: priceUpdatedAt,
    refetch: refetchPrice,
  } = useCardPrice({
    cardName: card?.name ?? '',
    grade: selectedGrade,
    cardId: id,
    setName: card?.set.name,
    cardNumber: card?.number,
    language: card?.language,
    tcgPlayerPrice: card?.tcgPlayerPrice,
    tcgPlayerMidPrice: card?.tcgPlayerMidPrice,
  });
  const { data: history } = usePriceHistory({
    cardName: card?.name ?? '',
    grade: selectedGrade,
    cardId: id,
    setName: card?.set.name,
    cardNumber: card?.number,
    language: card?.language,
  });
  // Other printings of this character for the Similar-cards rail.
  const { data: related } = useRelatedCards(card);
  const relatedCards = related ?? [];
  // Real eBay market dynamics + daily sold aggregates + PSA 10 graded
  // prices (collectrics proxy). Null for unmapped cards and outages;
  // sections fall back.
  const { data: cardStats } = useCardStats(card?.name, card?.number);
  const recentSales = cardStats?.sales ?? [];
  const psa10 = cardStats?.psa10 ?? null;
  // undefined = query still resolving; null = settled with no stats.
  const statsSettled = cardStats !== undefined;

  // Fire the coming-soon popup when the toggle transitions UNGRADED →
  // PSA10 — but only for cards with no real graded data. While the
  // stats query is still resolving we stay quiet (the inline panel
  // covers the gap) rather than popping a sheet that real data may
  // immediately contradict.
  useEffect(() => {
    // Don't consume the transition while stats are still resolving —
    // advancing the ref here would permanently swallow the popup for
    // no-data cards whose fetch settles after the flip.
    if (selectedGrade === 'PSA10' && !statsSettled) return;
    if (
      prevGradeRef.current !== 'PSA10' &&
      selectedGrade === 'PSA10' &&
      !psa10
    ) {
      setPsaModalVisible(true);
    }
    prevGradeRef.current = selectedGrade;
  }, [selectedGrade, statsSettled, psa10]);

  // Filter raw + PSA 10 history by the selected time range
  const filteredHistory = useMemo(
    () => filterHistoryByRange(history, timeRangeIndex),
    [history, timeRangeIndex],
  );
  const filteredPsaHistory = useMemo(
    () => filterHistoryByRange(psa10?.history, timeRangeIndex),
    [psa10, timeRangeIndex],
  );

  // Bell reflects whether the *current grade tab* has an active alert.
  // A triggered alert is treated as inactive (filled bell only means
  // "watching" — once it's fired the user needs to reset it).
  const existingAlert = allAlerts.find(
    (a) => a.cardId === id && a.grade === selectedGrade && !a.triggered,
  );
  const hasAlert = Boolean(existingAlert);

  // Open the alert modal, gating new alerts behind the free cap.
  // Editing/removing an EXISTING alert is always allowed; only a NEW
  // alert beyond MAX_FREE_ALERTS on the free tier triggers the upsell.
  const openAlertModal = () => {
    if (existingAlert || useAlertsStore.getState().canAddAlert()) {
      setAlertModalVisible(true);
      return;
    }
    Alert.alert(
      'Alert limit reached',
      `Free accounts can keep ${MAX_FREE_ALERTS} active price alerts. Upgrade to Premium for unlimited alerts, or remove an existing alert first.`,
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Upgrade', onPress: () => router.push('/paywall') },
      ],
    );
  };

  const isInWatchlist = items.some(
    (i) => i.kind === 'card' && i.cardId === id,
  );

  // Sync price to watchlist — only update if the grade matches what's saved
  useEffect(() => {
    if (price && isInWatchlist && id) {
      const savedItem = items.find((i) => i.kind === 'card' && i.cardId === id);
      if (savedItem && savedItem.kind === 'card' && savedItem.grade === selectedGrade) {
        updatePrice(id, price.currentPrice, price.percentChange, selectedGrade);
      }
    }
  }, [price?.currentPrice, isInWatchlist, id, selectedGrade]);

  if (cardLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
        {/* Nav placeholder so back button is reachable while loading */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: HORIZONTAL_PADDING,
            paddingTop: spacing[4],
            paddingBottom: spacing[2],
          }}
        >
          <Pressable onPress={() => router.back()} hitSlop={8} style={{ padding: spacing[1] }}>
            <IconChevronLeft size={24} color={colors.onSurface} />
          </Pressable>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: HORIZONTAL_PADDING, paddingBottom: spacing[12] }}
        >
          <CardDetailSkeleton imageWidth={screenWidth * 0.6} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (cardError || !card) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: HORIZONTAL_PADDING,
            paddingTop: spacing[4],
            paddingBottom: spacing[2],
          }}
        >
          <Pressable onPress={() => router.back()} hitSlop={8} style={{ padding: spacing[1] }}>
            <IconChevronLeft size={24} color={colors.onSurface} />
          </Pressable>
        </View>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing[8],
            gap: spacing[4],
          }}
        >
          <IconAlertCircle size={48} color={colors.onSurfaceMuted} />
          <Text variant="headingSm" style={{ textAlign: 'center' }}>
            {cardError ? "Couldn't load this card" : 'Card not found'}
          </Text>
          <Text
            variant="bodySm"
            color={colors.onSurfaceMuted}
            style={{ textAlign: 'center', maxWidth: 320 }}
          >
            {cardError
              ? 'Check your connection and try again.'
              : "We couldn't find this card in our database."}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing[2], justifyContent: 'center' }}>
            {cardError && (
              <Button variant="filled" onPress={() => refetchCard()}>
                Try again
              </Button>
            )}
            <Button variant="outlined" onPress={() => router.back()}>
              Go back
            </Button>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const handleToggleWatchlist = () => {
    if (isInWatchlist) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const existing = items.find((i) => i.kind === 'card' && i.cardId === card.id);
      if (existing && existing.kind === 'card') removeItem(card.id, existing.grade);
    } else {
      if (!canAddMore()) {
        setWatchlistFullVisible(true);
        return;
      }
      const success = addItem({
        kind: 'card',
        cardId: card.id,
        cardName: card.name,
        cardImageUrl: card.images.small,
        setName: card.set.name,
        setNumber: card.number,
        grade: selectedGrade,
        lastPrice: price?.currentPrice,
        lastPriceChange: price?.percentChange,
        rarity: card.rarity,
        language: card.language,
      });
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  // The Price History card is shared between grade tabs — only the
  // series (and its availability gate) swaps.
  const chartHistory = selectedGrade === 'PSA10' ? filteredPsaHistory : filteredHistory;
  const showChart =
    selectedGrade === 'PSA10'
      ? Boolean(psa10) && filteredPsaHistory.length > 2
      : Boolean(price) && filteredHistory.length > 2;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing[12] }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              await refetchPrice();
              setRefreshing(false);
            }}
            tintColor={colors.primary}
          />
        }
      >
        {/* Nav bar — matches Home screen top padding per BDS spacing[4] = 16px */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: HORIZONTAL_PADDING,
            paddingTop: spacing[4],
            paddingBottom: spacing[2],
          }}
        >
          <Pressable onPress={() => router.back()} hitSlop={8} style={{ padding: spacing[1] }}>
            <IconChevronLeft size={24} color={colors.onSurface} />
          </Pressable>
          <View style={{ flexDirection: 'row', gap: spacing[3] }}>
            {/* Watchlist add/remove is hidden on the PSA10 tab: graded
                tracking is still gated (the tab shows only ComingSoon),
                Home filters PSA10 rows out, and adding one here created a
                silent invisible entry that still consumed a free slot. */}
            {selectedGrade !== 'PSA10' && (
              <Pressable
                onPress={handleToggleWatchlist}
                hitSlop={8}
                style={{ padding: spacing[1] }}
                accessibilityRole="button"
                accessibilityLabel={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
              >
                {/* IconCirclePlus / IconCircleCheck mirror the iOS Music
                    "Add to Library" pattern — circle-plus communicates
                    the add affordance clearly, circle-check confirms the
                    added state and still reads as "tap to remove". */}
                {isInWatchlist
                  ? <IconCircleCheck size={24} color={colors.primary} strokeWidth={2} />
                  : <IconCirclePlus size={24} color={colors.onSurface} strokeWidth={2} />}
              </Pressable>
            )}
            <Pressable onPress={openAlertModal} hitSlop={8} style={{ padding: spacing[1] }}>
              {hasAlert
                ? <IconBellFilled size={22} color={colors.primary} />
                : <IconBellRinging size={22} color={colors.onSurfaceMuted} />}
            </Pressable>
            <Pressable
              hitSlop={8}
              style={{ padding: spacing[1] }}
              onPress={async () => {
                try {
                  const url = cardShareUrl(id);
                  const priceLine = price ? ` — currently ${formatMoney(price.currentPrice)}` : '';
                  await Share.share({
                    // iOS uses `url` for the rich link target; Android folds it
                    // into the message body. We include it in `message` too so
                    // both platforms always send a tappable URL.
                    message: `Check out ${card?.name} on CardPulse${priceLine}\n${url}`,
                    url,
                  });
                } catch {}
              }}
            >
              <IconShare size={22} color={colors.onSurfaceMuted} />
            </Pressable>
          </View>
        </View>

        {/* Card image */}
        <View style={{ alignItems: 'center', paddingVertical: spacing[4] }}>
          {/* The small variant is almost always already in expo-image's
              disk cache from whatever list the user tapped, so it paints
              immediately while the ~1MB hi-res PNG streams in. */}
          <Image
            source={{ uri: card.images.large }}
            placeholder={{ uri: card.images.small }}
            placeholderContentFit="contain"
            priority="high"
            cachePolicy="memory-disk"
            accessibilityLabel={`${card.name} card from ${card.set.name}`}
            style={{
              width: screenWidth * 0.6,
              height: screenWidth * 0.6 * 1.4,
              borderRadius: LARGE_CARD_BORDER_RADIUS,
            }}
            contentFit="contain"
          />
        </View>

        <View style={{ paddingHorizontal: HORIZONTAL_PADDING, gap: spacing[4] }}>
          {/* Card info */}
          <View style={{ gap: spacing[1] }}>
            <Text variant="headingLg">{card.name}</Text>
            <Text variant="bodySm" color={colors.onSurfaceVariant}>
              {card.set.name} · #{card.number}
            </Text>
            {card.rarity && (
              <Text variant="caption" color={colors.onSurfaceMuted}>
                {card.rarity}
              </Text>
            )}
          </View>

          {/* Grade selector — both segments tappable. PSA 10 swaps the
              price section for a "coming soon" panel instead of being
              locked at the toggle level (see ComingSoonPanel below). */}
          <SegmentedControl
            options={GRADE_OPTIONS.map((g) => GRADES[g].shortLabel)}
            selected={gradeIndex}
            onSelect={(i) => {
              // Session-only: every card opens on Raw (see gradeIndex
              // init) — persisting the toggle used to strand users on
              // the PSA 10 coming-soon tab by default.
              setGradeIndex(i);
            }}
          />

          {/* Price section + alert. PSA 10 shows real graded prices
              when the collectrics proxy tracks this card; untracked
              cards keep the slide-up coming-soon panel. The toggle
              still works so the user can flip back to Raw with one
              tap. */}
          {selectedGrade === 'PSA10' ? (
            psa10 ? (
              <Card elevated>
                <View style={{ gap: spacing[3] }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing[2] }}>
                    <Text variant="displaySm">{formatMoney(psa10.latestPrice)}</Text>
                    <PriceChange percent={psa10.percentChange} size="md" />
                  </View>
                  <Text variant="caption" color={colors.onSurfaceMuted}>
                    PSA 10 · eBay sold data
                  </Text>
                </View>
              </Card>
            ) : (
              <ComingSoonPanel
                reanimateKey={selectedGrade}
                title="PSA 10 prices — coming soon"
                body="We’re shipping live raw prices first. Graded card tracking lights up after our eBay sales pipeline launches. Tap Raw above to see the live TCGPlayer Market Price."
              />
            )
          ) : priceLoading ? (
            <Card elevated>
              <View style={{ gap: spacing[3] }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                  <Skeleton width={140} height={32} />
                  <Skeleton width={64} height={20} />
                </View>
                <Skeleton width="70%" height={12} />
              </View>
            </Card>
          ) : price ? (
            <View style={{ gap: spacing[2] }}>
              <Card elevated>
                <View style={{ gap: spacing[3] }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing[2] }}>
                    <Text variant="displaySm">{formatMoney(price.currentPrice)}</Text>
                    <PriceChange percent={price.percentChange} size="md" />
                  </View>
                  <Text variant="caption" color={colors.onSurfaceMuted}>
                    {price.lastSaleDate
                      ? `Last sale ${formatMoney(price.lastSalePrice)} on ${price.lastSaleDate} via `
                      : 'Price via '}
                    <Text
                      variant="caption"
                      color={colors.primary}
                      onPress={() => {
                        // PSA 10 path is short-circuited above by the
                        // ComingSoonPanel — selectedGrade is always
                        // UNGRADED here, so the eBay sold-listings
                        // URL doesn't need a grade suffix.
                        const cardSearch = `${card.name} ${card.set.name} ${card.number}`;
                        const sourceUrl =
                          price.source === 'tcgplayer'
                            ? `https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(card.name + ' ' + card.number)}&view=grid`
                            : price.source === 'ebay'
                              ? `https://www.ebay.com/sch/183454/i.html?_nkw=${encodeURIComponent(cardSearch)}&LH_Sold=1&LH_Complete=1&_sop=13`
                              : price.source === 'pricecharting'
                                ? `https://www.pricecharting.com/search-products?q=${encodeURIComponent(cardSearch)}&type=prices`
                                : `https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(card.name + ' ' + card.number)}&view=grid`;
                        Linking.openURL(sourceUrl).catch(() => {});
                      }}
                    >
                      {price.source === 'tcgplayer' ? 'TCGPlayer' :
                       price.source === 'ebay' ? 'eBay' :
                       price.source === 'pricecharting' ? 'PriceCharting' :
                       'Market Data'}
                    </Text>
                  </Text>
                  {priceUpdatedAt > 0 && (
                    <Pressable
                      onPress={() => refetchPrice()}
                      disabled={priceFetching}
                      hitSlop={6}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}
                    >
                      <IconRefresh
                        size={11}
                        color={colors.onSurfaceMuted}
                      />
                      <Text variant="caption" color={colors.onSurfaceMuted}>
                        {priceFetching
                          ? 'Updating…'
                          : `Updated ${formatRelativeTime(priceUpdatedAt, nowTick)}`}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </Card>
              <Pressable
                onPress={openAlertModal}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing[2],
                  paddingVertical: spacing[3],
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.outline,
                }}
              >
                <IconBellRinging size={16} color={colors.primary} />
                <Text variant="labelLg" color={colors.primary}>Set Price Alert</Text>
              </Pressable>
            </View>
          ) : (
            <Card>
              {/* Empty state — only reachable on UNGRADED. PSA 10 is
                  short-circuited above by ComingSoonPanel. */}
              <View style={{ gap: spacing[3] }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                  <IconAlertCircle size={18} color={colors.onSurfaceMuted} />
                  <Text variant="labelLg">Price data unavailable</Text>
                </View>
                <Text variant="caption" color={colors.onSurfaceMuted}>
                  Raw prices come from TCGPlayer Market Price. Try again in a moment, or check TCGPlayer directly for the latest market value.
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing[2], flexWrap: 'wrap' }}>
                  <Pressable
                    onPress={() => refetchPrice()}
                    disabled={priceFetching}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing[1],
                      paddingHorizontal: spacing[3],
                      paddingVertical: spacing[2],
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: colors.outline,
                      opacity: priceFetching ? 0.5 : 1,
                    }}
                  >
                    <IconRefresh size={14} color={colors.primary} />
                    <Text variant="labelSm" color={colors.primary}>
                      {priceFetching ? 'Retrying…' : 'Try again'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      const url = card.tcgPlayerUrl
                        ?? `https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(card.name + ' ' + card.number)}&view=grid`;
                      Linking.openURL(url).catch(() => {});
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing[1],
                      paddingHorizontal: spacing[3],
                      paddingVertical: spacing[2],
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: colors.outline,
                    }}
                  >
                    <IconExternalLink size={14} color={colors.onSurfaceVariant} />
                    <Text variant="labelSm" color={colors.onSurfaceVariant}>
                      Check TCGPlayer
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Card>
          )}

          {/* "Building history" placeholder — shown when raw history is
              still bootstrapping (fewer than 3 snapshots accumulated for
              this card). Hidden on PSA 10 since the ComingSoonPanel
              above already explains that gate. */}
          {selectedGrade !== 'PSA10' && price && (!history || history.length < 3) && (
            <Card>
              <View style={{ gap: spacing[2], alignItems: 'center', paddingVertical: spacing[4] }}>
                <Text variant="labelLg">Price history is building</Text>
                <Text
                  variant="caption"
                  color={colors.onSurfaceVariant}
                  style={{ textAlign: 'center', maxWidth: 280 }}
                >
                  {history && history.length > 0
                    ? `We have ${history.length} ${history.length === 1 ? 'day' : 'days'} of price data so far. The chart unlocks at 3 days and fills in over the next 90.`
                    : 'We snapshot card prices once a day. Charts will start showing real history within a few days of this card entering the daily tracker.'}
                </Text>
              </View>
            </Card>
          )}

          {/* Chart with time range toggle. On PSA 10 it renders the
              real graded sold-price series when the card is tracked;
              untracked cards show no chart (the ComingSoonPanel above
              already explains the gate). */}
          {showChart && (
            <Card>
              <View style={{ gap: spacing[3] }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text variant="labelLg">Price History</Text>
                  <View style={{ flexDirection: 'row', gap: spacing[1] }}>
                    {TIME_RANGES.map((range, i) => (
                      <Pressable
                        key={range}
                        onPress={() => setTimeRangeIndex(i)}
                        style={{
                          paddingHorizontal: spacing[2],
                          paddingVertical: spacing[1],
                          borderRadius: radius.md,
                          backgroundColor: i === timeRangeIndex ? withAlpha(colors.primary, 0.12) : 'transparent',
                        }}
                      >
                        <Text
                          variant="labelSm"
                          color={i === timeRangeIndex ? colors.primary : colors.onSurfaceMuted}
                          style={{ fontWeight: i === timeRangeIndex ? '600' : '400' }}
                        >
                          {range}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <PriceChart
                  data={chartHistory}
                  height={200}
                  width={screenWidth - HORIZONTAL_PADDING * 2 - spacing[6] * 2}
                  interactive
                  formatValue={formatMoney}
                />
              </View>
            </Card>
          )}

          {/* PSA Population — graded census for tracked cards on the
              PSA 10 tab. Counts and gem rate come from the latest
              history-psa snapshot in the collectrics proxy. */}
          {selectedGrade === 'PSA10' && psa10?.pop && (
            <Card>
              <View style={{ gap: spacing[3] }}>
                <Text variant="labelLg">PSA Population</Text>
                <View style={{ flexDirection: 'row' }}>
                  <View style={{ flex: 1, gap: spacing[1] }}>
                    <Text variant="caption" color={colors.onSurfaceMuted}>PSA 10 POP</Text>
                    <Text variant="headingSm" style={{ fontVariant: ['tabular-nums'] }}>
                      {psa10.pop.psa10.toLocaleString()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: spacing[1] }}>
                    <Text variant="caption" color={colors.onSurfaceMuted}>TOTAL GRADED</Text>
                    <Text variant="headingSm" style={{ fontVariant: ['tabular-nums'] }}>
                      {psa10.pop.total.toLocaleString()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: spacing[1] }}>
                    <Text variant="caption" color={colors.onSurfaceMuted}>GEM RATE</Text>
                    <Text variant="headingSm" style={{ fontVariant: ['tabular-nums'] }}>
                      {`${psa10.pop.gemPct.toFixed(1)}%`}
                    </Text>
                  </View>
                </View>
                <Text variant="caption" color={colors.onSurfaceMuted}>
                  PSA-graded population for this card. Gem rate is the share of graded copies earning a 10.
                </Text>
              </View>
            </Card>
          )}

          {/* Price-derived sections — AI valuation, fundamentals,
              market dynamics. All hide on PSA 10 since their numbers
              would either be missing or, worse, mock data that
              contradicts the graded view above. They come back when
              the user flips to Raw. */}
          {selectedGrade !== 'PSA10' && (
            <>
              {/* Prediction — AI valuation + market signals */}
              <AIValuation card={card} marketPrice={price?.currentPrice} liveDynamics={cardStats?.dynamics} />

              {/* Fundamentals — StockTwits-style data table */}
              <CardFundamentals card={card} marketPrice={price?.currentPrice} />

              {/* eBay Market Dynamics — demand pressure & supply saturation */}
              <MarketDynamics cardId={card.id} live={cardStats?.dynamics} />
            </>
          )}

          {/* Recent sales — daily sold aggregates from the card-stats
              proxy when the card is tracked, otherwise a link-out (we
              never fabricate listings; Apple Guideline 4.1 treats fake
              data presented as real as grounds for rejection). Hidden
              on PSA 10 along with the rest of the price section. */}
          {selectedGrade !== 'PSA10' && (price || recentSales.length > 0) && (
            <Card>
              <View style={{ gap: spacing[3] }}>
                <Text variant="labelLg">Recent sales</Text>
                {recentSales.length > 0 ? (
                  <View>
                    {/* Daily eBay raw-sold aggregates, newest first —
                        real counts and outlier-adjusted average prices,
                        refreshed daily upstream. */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: spacing[2] }}>
                      <Text variant="caption" color={colors.onSurfaceMuted}>DATE</Text>
                      <View style={{ flexDirection: 'row', gap: spacing[6] }}>
                        <Text variant="caption" color={colors.onSurfaceMuted}>SOLD</Text>
                        <Text variant="caption" color={colors.onSurfaceMuted} style={{ minWidth: 76, textAlign: 'right' }}>AVG PRICE</Text>
                      </View>
                    </View>
                    {recentSales.map((s, i) => (
                      <View
                        key={s.date}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingVertical: spacing[2],
                          borderTopWidth: i === 0 ? 0 : 1,
                          borderTopColor: colors.outlineVariant,
                        }}
                      >
                        <Text variant="bodySm" color={colors.onSurfaceVariant}>
                          {new Date(s.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: spacing[6], alignItems: 'center' }}>
                          <Text variant="bodySm" color={colors.onSurfaceVariant}>{s.count}</Text>
                          <Text variant="labelLg" style={{ minWidth: 76, textAlign: 'right', fontVariant: ['tabular-nums'] }}>
                            {formatMoney(s.avgPrice)}
                          </Text>
                        </View>
                      </View>
                    ))}
                    <Text variant="caption" color={colors.onSurfaceMuted} style={{ paddingTop: spacing[2] }}>
                      Daily averages from ended eBay raw listings, adjusted for outliers.
                    </Text>
                  </View>
                ) : (
                  <Text variant="bodySm" color={colors.onSurfaceVariant} style={{ lineHeight: 20 }}>
                    No tracked sales for this card yet. Browse the latest {card.name} #{card.number} sales on eBay or TCGPlayer.
                  </Text>
                )}
                <View style={{ flexDirection: 'row', gap: spacing[2], flexWrap: 'wrap' }}>
                  <Pressable
                    onPress={() => {
                      const cardSearch = `${card.name} ${card.set.name} ${card.number}`;
                      Linking.openURL(
                        `https://www.ebay.com/sch/183454/i.html?_nkw=${encodeURIComponent(cardSearch)}&LH_Sold=1&LH_Complete=1&_sop=13`,
                      ).catch(() => {});
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing[1] + 2,
                      paddingHorizontal: spacing[3],
                      paddingVertical: spacing[2],
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: colors.outline,
                    }}
                  >
                    <IconExternalLink size={14} color={colors.onSurfaceVariant} />
                    <Text variant="labelSm" color={colors.onSurfaceVariant}>eBay sold listings</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      const url = card.tcgPlayerUrl
                        ?? `https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(card.name + ' ' + card.number)}&view=grid`;
                      Linking.openURL(url).catch(() => {});
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing[1] + 2,
                      paddingHorizontal: spacing[3],
                      paddingVertical: spacing[2],
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: colors.outline,
                    }}
                  >
                    <IconExternalLink size={14} color={colors.onSurfaceVariant} />
                    <Text variant="labelSm" color={colors.onSurfaceVariant}>TCGPlayer page</Text>
                  </Pressable>
                </View>
              </View>
            </Card>
          )}

          {/* Similar cards — other printings of the same character, newest
              first. Catalog data, so it shows on every grade tab. Hidden
              entirely (no header, no skeleton) when the lookup finds
              nothing or hasn't resolved, so the screen never ends on an
              empty section. */}
          {relatedCards.length > 0 && (
            <View style={{ gap: spacing[3] }}>
              <Text variant="overline" color={colors.onSurfaceVariant}>SIMILAR CARDS</Text>
              <FlatList
                horizontal
                data={relatedCards}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                // Full bleed: cancel the section's horizontal padding so
                // cards scroll under the screen edges; inset the content
                // so the first card still aligns with the page grid.
                style={{ marginHorizontal: -HORIZONTAL_PADDING }}
                contentContainerStyle={{ gap: spacing[3], paddingHorizontal: HORIZONTAL_PADDING }}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => router.push(`/card/${item.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.name}, ${item.set.name}`}
                    style={({ pressed }) => ({ width: 120, opacity: pressed ? 0.7 : 1 })}
                  >
                    <Image
                      source={{ uri: item.images.small }}
                      style={{
                        width: 120,
                        height: 120 / 0.72,
                        borderRadius: radius.md,
                        backgroundColor: colors.surfaceVariant,
                      }}
                      contentFit="cover"
                    />
                    <View style={{ marginTop: spacing[2], gap: spacing['0.5'] }}>
                      <Text variant="labelSm" numberOfLines={1}>{item.name}</Text>
                      <Text variant="caption" color={colors.onSurfaceMuted} numberOfLines={1}>
                        {item.set.name}
                      </Text>
                    </View>
                  </Pressable>
                )}
              />
            </View>
          )}

        </View>
      </ScrollView>

      {/* Modals */}
      {card && (
        <>
          <PriceAlertModal
            visible={alertModalVisible}
            onClose={() => setAlertModalVisible(false)}
            cardName={card.name}
            currentPrice={price?.currentPrice}
            existingAlert={existingAlert}
            onRemove={
              existingAlert
                ? () => {
                    removeAlert(existingAlert.id);
                    setAlertModalVisible(false);
                  }
                : undefined
            }
            onSubmit={async (type, targetPrice) => {
              // openAlertModal already gated the cap, but re-check at
              // submit time in case state changed while the modal was
              // open (e.g. an alert fired). addAlert upserts on
              // card+grade, so editing never trips the cap.
              const result = addAlert({
                cardId: id ?? '',
                cardName: card.name,
                grade: selectedGrade,
                type,
                targetPrice,
              });
              if (!result.ok) {
                Alert.alert(
                  'Alert limit reached',
                  `Free accounts can keep ${MAX_FREE_ALERTS} active price alerts. Upgrade to Premium for unlimited alerts.`,
                  [
                    { text: 'Not now', style: 'cancel' },
                    { text: 'Upgrade', onPress: () => router.push('/paywall') },
                  ],
                );
                return;
              }
              // Ask for OS permission the first time the user creates an
              // alert. We still record the alert even if denied — the
              // in-app notifications screen works without OS permission.
              const granted = await requestNotificationPermission();
              if (!granted && Platform.OS !== 'web') {
                Alert.alert(
                  'Notifications disabled',
                  "We saved your alert, but you'll only see it inside the app. Enable notifications in Settings to get banners.",
                );
              }
            }}
          />
          <WatchlistFullModal
            visible={watchlistFullVisible}
            onClose={() => setWatchlistFullVisible(false)}
            currentCount={items.filter((i) => !(i.kind === 'card' && i.grade === 'PSA10')).length}
            maxCount={maxFreeItems}
          />
        </>
      )}

      {/* PSA 10 coming-soon popup — fires when the user flips the
          segmented control to PSA 10 on a card WITHOUT tracked graded
          data (tracked cards render the real price/chart instead).
          Lives at the screen root (outside the loading-gated branch)
          so it can pop even on the first render if the user lands on
          PSA 10 default. Backdrop tap dismisses; "Got it" closes. */}
      <Modal
        visible={psaModalVisible}
        transparent
        // RN Modals "slide" animationType slides up from the bottom on
        // show and back down on dismiss — matches the user-requested
        // "slide up then slide down" affordance natively without us
        // having to manage Animated values for the inner card.
        animationType="slide"
        onRequestClose={() => setPsaModalVisible(false)}
      >
        <Pressable
          onPress={() => setPsaModalVisible(false)}
          // Bottom-sheet layout — backdrop fills the screen, sheet
          // anchors to the bottom edge so the slide-up animation reads
          // as a sheet rising rather than a centered alert appearing.
          style={{
            flex: 1,
            backgroundColor: withAlpha('#000000', 0.5),
            justifyContent: 'flex-end',
          }}
        >
          {/* Inner pressable swallows taps so the modal doesn't dismiss
              when the user taps the card itself. */}
          <Pressable
            onPress={(e) => e.stopPropagation?.()}
            style={{
              width: '100%',
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius['3xl'],
              borderTopRightRadius: radius['3xl'],
              paddingHorizontal: spacing[6],
              paddingTop: spacing[3],
              paddingBottom: spacing[8],
              gap: spacing[4],
              alignItems: 'center',
              borderTopWidth: 1,
              borderColor: colors.outline,
            }}
          >
            {/* Drag-handle pip — universal "this is a sheet" affordance. */}
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: radius.full,
                backgroundColor: colors.outlineStrong,
                marginBottom: spacing[2],
              }}
            />
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: radius.full,
                backgroundColor: withAlpha(colors.primary, 0.18),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconLock size={28} color={colors.primary} />
            </View>
            <View style={{ alignItems: 'center', gap: spacing[2] }}>
              <Text variant="headingMd" style={{ textAlign: 'center' }}>
                PSA 10 prices — coming soon
              </Text>
              <Text
                variant="bodySm"
                color={colors.onSurfaceVariant}
                style={{ textAlign: 'center', lineHeight: 20 }}
              >
                We’re shipping live raw prices from TCGPlayer first. Graded card tracking lights up after our eBay sales pipeline launches — stay tuned.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing[2], alignSelf: 'stretch' }}>
              <Button
                variant="outlined"
                fullWidth
                onPress={() => {
                  // Switch back to Raw and close the modal — the
                  // most useful next action since PSA 10 is empty.
                  const ungradedIdx = GRADE_OPTIONS.indexOf('UNGRADED');
                  setGradeIndex(ungradedIdx);
                  setPsaModalVisible(false);
                }}
              >
                See Raw price
              </Button>
              <Button
                variant="filled"
                fullWidth
                onPress={() => setPsaModalVisible(false)}
              >
                Got it
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

export default withErrorBoundary(CardDetailScreen, 'Card Detail');

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { View, ScrollView, FlatList, useWindowDimensions, Pressable, Linking, Share, Alert, Platform, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
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
  Badge,
  AIValuation,
  CardFundamentals,
  MarketDynamics,
  DynamicsChip,
  CollapsibleCard,
  ReturnsSinceAdded,
  PriceAlertModal,
  WatchlistFullModal,
  CardDetailSkeleton,
  GradingVerdict,
  EbayListingsBlock,
  Skeleton,
  ComingSoonPanel,
  BottomSheet,
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
import { useUserStore } from '../../src/stores/user-store';
import {
  useAlertsStore,
  MAX_FREE_ALERTS,
  isPriceAlert,
  type PriceAlert,
} from '../../src/stores/alerts-store';
import { requestNotificationPermission } from '../../src/services/notifications';
import { useCardDetail, useCardPrice, usePriceHistory, useMoney, useRelatedCards, useCardStats, useEbayListings } from '../../src/hooks';

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

// pokemontcg.io reports the bundled price's refresh date as YYYY/MM/DD.
// Parsed field by field on purpose: Hermes doesn't accept that shape in
// Date.parse, and normalising it to ISO would land on the previous day
// for anyone west of UTC. Null when there is no usable date — we say
// nothing rather than dating the price wrong.
function formatAsOf(asOf: string | undefined): string | null {
  if (!asOf) return null;
  const [y, m, d] = asOf.split('/').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * The three sections that collapse. Price History, the returns card,
 * Recent sales and Similar cards stay open — they are either the reason
 * the screen exists or short enough not to cost anything.
 */
type SectionId = 'fundamentals' | 'dynamics' | 'grading';

function CardDetailScreen() {
  // `section` arrives from a notification tap — see app/_layout.tsx.
  const { id, section } = useLocalSearchParams<{ id: string; section?: string }>();
  const { colors } = useTheme();
  // Module-scope Dimensions.get is 0 on web before first layout and
  // stale after rotation — it fed PriceChart a negative width.
  const { width: screenWidth } = useWindowDimensions();
  const formatMoney = useMoney();
  // Field selectors — a whole-store destructure re-rendered this 1100-line
  // screen (and every stacked copy of it) on any watchlist write anywhere.
  const items = useWatchlistStore((s) => s.items);
  const addItem = useWatchlistStore((s) => s.addItem);
  const removeItem = useWatchlistStore((s) => s.removeItem);
  const updatePrice = useWatchlistStore((s) => s.updatePrice);
  const canAddMore = useWatchlistStore((s) => s.canAddMore);
  const maxFreeItems = useWatchlistStore((s) => s.maxFreeItems);
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
  // Accordion: at most one of the three collapsing sections is open, so
  // the page stops being a mile of stacked analysis. Starts closed unless
  // a notification tap named a section.
  const [openSection, setOpenSection] = useState<SectionId | null>(() =>
    section === 'grading' ? 'grading' : null,
  );
  const toggleSection = useCallback((next: SectionId) => {
    setOpenSection((cur) => (cur === next ? null : next));
    if (Platform.OS !== 'web') Haptics.selectionAsync();
  }, []);
  const [refreshing, setRefreshing] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const isPremium = useUserStore((s) => s.isPremium);
  const allAlerts = useAlertsStore((s) => s.alerts);
  const addAlert = useAlertsStore((s) => s.addAlert);
  const removeAlert = useAlertsStore((s) => s.removeAlert);

  // Below-the-fold sections mount after the push transition finishes.
  // A fixed delay, not InteractionManager: the native-stack push runs on
  // the native side where InteractionManager sees no handle, so
  // runAfterInteractions fired on the next tick and the deferral was
  // ~zero. 350ms ≈ the iOS push animation. Web has no push to protect.
  const [belowFoldReady, setBelowFoldReady] = useState(Platform.OS === 'web');
  useEffect(() => {
    if (belowFoldReady) return;
    const t = setTimeout(() => setBelowFoldReady(true), 350);
    return () => clearTimeout(t);
  }, [belowFoldReady]);

  // Tick once a minute so the "Updated Xm ago" label stays fresh —
  // focused screens only. An unconditional interval kept every card
  // detail buried in the navigation stack re-rendering forever.
  useFocusEffect(
    useCallback(() => {
      setNowTick(Date.now());
      const interval = setInterval(() => setNowTick(Date.now()), 60_000);
      return () => clearInterval(interval);
    }, []),
  );

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
    tcgPlayerUpdatedAt: card?.tcgPlayerUpdatedAt,
    tcgPlayerMidPrice: card?.tcgPlayerMidPrice,
  });
  const { data: history, isLoading: historyLoading } = usePriceHistory({
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

  // Live eBay asking prices, fetched ONLY where the tracked feed has
  // nothing: raw listings when there are no sold aggregates, PSA 10
  // listings when the card has no graded feed. Real listings, labeled
  // as asking prices — never presented as sales.
  const ebayArgs = {
    name: card?.name,
    number: card?.number,
    setName: card?.set.name,
    language: card?.language,
  };
  const { data: rawListings } = useEbayListings(
    { ...ebayArgs, grade: 'raw' },
    Boolean(card) && statsSettled && recentSales.length === 0 && selectedGrade !== 'PSA10',
  );
  const { data: psaListings } = useEbayListings(
    { ...ebayArgs, grade: 'psa10' },
    Boolean(card) && statsSettled && !psa10 && selectedGrade === 'PSA10',
  );

  // Collapse everything when the grade toggle flips. All three sections
  // hide on PSA 10, so an open one would silently reopen on the way back
  // to Raw — with numbers the user never asked to see again.
  useEffect(() => {
    setOpenSection(null);
  }, [selectedGrade]);

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

  // Bell reflects whether the *current grade tab* has an active PRICE
  // alert. A triggered alert is treated as inactive (filled bell only
  // means "watching" — once it's fired the user needs to reset it).
  // Grading alerts live on the GradingVerdict card, not the bell.
  const existingAlert = allAlerts.find(
    (a): a is PriceAlert =>
      isPriceAlert(a) && a.cardId === id && a.grade === selectedGrade && !a.triggered,
  );
  const hasAlert = Boolean(existingAlert);

  // Open the alert modal, gating new alerts behind the free cap.
  // Editing/removing an EXISTING alert is always allowed; only a NEW
  // alert beyond MAX_FREE_ALERTS on the free tier triggers the upsell.
  const openAlertModal = () => {
    // Graded alerts have no price feed behind them — neither the live
    // checker nor the daily server sweep can evaluate a PSA 10 target.
    // Offering the modal here produced alerts that silently never fired
    // (or worse, fired off seeded mock prices). Say so instead of
    // taking the tap.
    if (selectedGrade === 'PSA10' && !existingAlert) {
      Alert.alert(
        'Raw alerts only',
        'Price alerts run on raw, ungraded prices. Switch to the Raw tab to set one for this card.',
      );
      return;
    }
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

  // Scoped to the grade tab on screen. Matching on cardId alone let a
  // hidden legacy PSA10 row (Home filters those out) show the added state
  // on the Raw tab, and the toggle then deleted that invisible row
  // instead of adding the raw one.
  const isInWatchlist = items.some(
    (i) => i.kind === 'card' && i.cardId === id && i.grade === selectedGrade,
  );

  // Sync price to the watched row for this grade. updatePrice already
  // scopes by grade and bails when nothing would change.
  useEffect(() => {
    if (price && isInWatchlist && id) {
      updatePrice(id, price.currentPrice, price.percentChange, selectedGrade);
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

  // Gated on missing DATA, not isError: a failed background refetch
  // (stale cache + a pokemontcg.io 500) still has the full card in hand,
  // and tearing the rendered screen down to this error view also
  // unmounted whatever sheet the user had open. cardError only picks the
  // copy below, which is reached solely when there is nothing to show.
  if (!card) {
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
      // The toggle only renders on the Raw tab, so this removes the raw
      // row and leaves any hidden legacy PSA10 row for when that gate
      // lifts — the store's canAddMore already ignores those.
      removeItem(card.id, selectedGrade);
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

  // Only a payload price carries its own as-of date; the JP catalog
  // reports none, so that case gets no freshness line at all.
  const asOfLabel = price?.freshness === 'payload' ? formatAsOf(price.asOf) : null;

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
              // The card payload carries the raw price for most cards, so
              // refetching the price alone re-reads the same number. Both,
              // in parallel: the new payload price flows in through the
              // price query's key on the next render.
              await Promise.all([refetchCard(), refetchPrice()]);
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
              <View style={{ gap: spacing[3] }}>
                <ComingSoonPanel
                  reanimateKey={selectedGrade}
                  title="PSA 10 — not tracked for this card yet"
                  body={
                    psaListings && psaListings.count > 0
                      ? 'No graded sold-price feed for this card yet, but PSA 10 copies are listed on eBay right now — asking prices below.'
                      : 'Graded price tracking covers a growing set of cards, focused on recent sets. Tap Raw above for the live TCGPlayer price, or check sold PSA 10 listings on eBay from the Recent sales section.'
                  }
                />
                {psaListings && psaListings.count > 0 && (
                  <Card>
                    <EbayListingsBlock heading="PSA 10 listed on eBay now" data={psaListings} />
                  </Card>
                )}
              </View>
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
                    {/* A snapshot price has no movement data — a hard
                        0.00% read as a fabricated number, the one fake-
                        looking figure on the screen. Show the chip only
                        when there is real change data behind it. */}
                    {!(price.percentChange === 0 && price.salesCount === 0) && (
                      <PriceChange percent={price.percentChange} size="md" />
                    )}
                  </View>
                  {/* Real listed-price spread from the card payload —
                      present for virtually every card, tracked or not. */}
                  {card.tcgPlayerLowPrice !== undefined && card.tcgPlayerHighPrice !== undefined && (
                    <Text variant="caption" color={colors.onSurfaceMuted}>
                      Listed {formatMoney(card.tcgPlayerLowPrice)} – {formatMoney(card.tcgPlayerHighPrice)} on TCGPlayer
                    </Text>
                  )}
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
                  {/* A payload price is TCGPlayer's own cached snapshot,
                      1-7 days behind, and refetching re-reads the same
                      bundled number — so "Updated just now" and a refresh
                      control both overstate it. Date it instead, and keep
                      the relative label + retry for the sources a refetch
                      can actually move (proxy read, stored fallback).
                      Pull-to-refresh still refetches the card payload. */}
                  {price.freshness === 'payload' ? (
                    asOfLabel ? (
                      <Text variant="caption" color={colors.onSurfaceMuted}>
                        {`Market price as of ${asOfLabel}`}
                      </Text>
                    ) : null
                  ) : priceUpdatedAt > 0 ? (
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
                          : price.freshness === 'stored'
                            ? 'Last saved price'
                            : `Updated ${formatRelativeTime(priceUpdatedAt, nowTick)}`}
                      </Text>
                    </Pressable>
                  ) : null}
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
          {/* Prediction — AI valuation + market signals. Sits above the
              chart: it's the takeaway, the chart is the evidence. Slim
              enough to mount with the fold. */}
          {selectedGrade !== 'PSA10' && (
            <AIValuation
              card={card}
              marketPrice={price?.currentPrice}
              liveDynamics={cardStats?.dynamics}
              statsSettled={statsSettled}
              locked={!isPremium}
            />
          )}

          {/* Chart-sized skeleton while the raw history query resolves —
              holds the slot so the section doesn't pop in and shift
              everything below it when data lands. */}
          {selectedGrade !== 'PSA10' && price && historyLoading && (
            <Card>
              <Skeleton width="100%" height={200} borderRadius={radius.md} />
            </Card>
          )}

          {/* Gated on the history query having SETTLED — rendering this
              while the fetch was still in flight flashed "building" for a
              beat and then swapped to the chart, a visible layout jump on
              every card open. */}
          {selectedGrade !== 'PSA10' && price && !historyLoading && (!history || history.length < 3) && (
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
                        // Visual chip is ~28x30pt; hitSlop brings the
                        // effective target to the 44pt HIG minimum.
                        hitSlop={8}
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
                          style={{ fontWeight: i === timeRangeIndex ? '500' : '400' }}
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

          {/* Track your returns since added — Premium. Sits under the
              chart because it answers the same question the chart does,
              but for this user's own entry price. Raw only, like the rest
              of the price sections. */}
          {selectedGrade !== 'PSA10' && (
            <ReturnsSinceAdded
              cardId={card.id}
              grade={selectedGrade}
              currentPrice={price?.currentPrice}
              previousPrice={price?.previousPrice}
              previousDate={price?.previousDate}
            />
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

          {/* Below-the-fold analysis — deferred until the push animation
              settles. On a warm cache all of these mounted in the same
              commit as the hero content, and that one big commit ran
              during the transition — the main "slow open" cost. Each
              section already self-hides while its data resolves, so the
              one-frame-later mount is indistinguishable from a query
              settling. */}
          {belowFoldReady && (
          <>
          {/* Price-derived sections — fundamentals, market dynamics.
              All hide on PSA 10 since their numbers would either be
              missing or, worse, mock data that contradicts the graded
              view above. They come back when the user flips to Raw.
              (Prediction moved above the Price History chart.) */}
          {selectedGrade !== 'PSA10' && (
            <>
              {/* Fundamentals — StockTwits-style data table. Collapsed by
                  default: seven rows of context below the numbers people
                  actually came for. */}
              <CollapsibleCard
                title="Fundamentals"
                expanded={openSection === 'fundamentals'}
                onToggle={() => toggleSection('fundamentals')}
                collapsedHeight={112}
              >
                <CardFundamentals
                  bare
                  card={card}
                  marketPrice={price?.currentPrice}
                  livePop={psa10?.pop ?? null}
                />
              </CollapsibleCard>

              {/* eBay Market Dynamics — demand pressure & supply
                  saturation. The chip and the sample-data badge move to
                  the collapsible header, which is the only title now. */}
              <CollapsibleCard
                title="eBay Market Dynamics"
                expanded={openSection === 'dynamics'}
                onToggle={() => toggleSection('dynamics')}
                collapsedHeight={120}
                headerRight={
                  <>
                    <DynamicsChip />
                    {!cardStats?.dynamics && <Badge variant="neutral">Sample data</Badge>}
                  </>
                }
              >
                <MarketDynamics bare cardId={card.id} live={cardStats?.dynamics} />
              </CollapsibleCard>
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
                ) : rawListings && rawListings.count > 0 ? (
                  // No sold aggregates for this card — show what IS
                  // real right now: live raw listings, labeled as asking
                  // prices.
                  <EbayListingsBlock heading="Listed on eBay now" data={rawListings} />
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

          {/* Worth grading? — EV verdict over the PSA outcome
              distribution. Only for cards where BOTH sides of the trade
              are real: a live raw price and a live PSA 10 sold price
              (collectrics-tracked). Untracked cards get nothing rather
              than a verdict built on guesses. Sits last before Similar
              cards — it's a decision aid, not price data. */}
          {selectedGrade !== 'PSA10' && price && psa10 && psa10.latestPrice > 0 && (
            // No title on the wrapper: the verdict's own "Grade it" /
            // "Sell it raw" plus the letter grade IS the headline, and it
            // is what the collapsed peek shows. A grading-ROI alert tap
            // lands here already open.
            <CollapsibleCard
              expanded={openSection === 'grading'}
              onToggle={() => toggleSection('grading')}
              collapsedHeight={148}
            >
              <GradingVerdict
                bare
                cardId={card.id}
                cardName={card.name}
                cardNumber={card.number}
                rawPrice={price.currentPrice}
                psa10Price={psa10.latestPrice}
                pop={psa10.pop}
              />
            </CollapsibleCard>
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
                removeClippedSubviews
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
          </>
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

      {/* PSA 10 coming-soon sheet — fires when the user flips the
          segmented control to PSA 10 on a card WITHOUT tracked graded
          data (tracked cards render the real price/chart instead).
          Lives at the screen root (outside the loading-gated branch)
          so it can pop even on the first render if the user lands on
          PSA 10 default. Backdrop tap dismisses; "Got it" closes. */}
      <BottomSheet visible={psaModalVisible} onClose={() => setPsaModalVisible(false)}>
        <View style={{ alignItems: 'center', gap: spacing[4] }}>
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
              PSA 10 — not tracked for this card
            </Text>
            <Text
              variant="bodySm"
              color={colors.onSurfaceVariant}
              style={{ textAlign: 'center', lineHeight: 20 }}
            >
              Graded price tracking covers a growing set of cards, focused on recent sets — this one isn’t tracked yet. Raw prices are live for every card.
            </Text>
          </View>
          <View style={{ alignSelf: 'stretch' }}>
            <Button
              variant="filled"
              fullWidth
              onPress={() => setPsaModalVisible(false)}
            >
              Got it
            </Button>
          </View>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

export default withErrorBoundary(CardDetailScreen, 'Card Detail');

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, ScrollView, Dimensions, Pressable, Linking, Share, Alert, Platform, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { IconChevronLeft, IconShare, IconPlus, IconMinus, IconBellRinging, IconBellFilled, IconExternalLink, IconBookmark, IconBookmarkFilled, IconRefresh, IconAlertCircle, IconLock } from '@tabler/icons-react-native';
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
import { formatPrice, formatRelativeTime } from '../../src/utils/format';
import { withAlpha } from '../../src/utils/withAlpha';
import { HORIZONTAL_PADDING, LARGE_CARD_BORDER_RADIUS } from '../../src/constants/layout';
import { cardShareUrl } from '../../src/constants/links';
// Card data/valuation handled internally by AIValuation component
import { GRADE_OPTIONS, GRADES } from '../../src/constants/grades';
import { useWatchlistStore, useUserStore } from '../../src/stores';
import { useAlertsStore } from '../../src/stores/alerts-store';
import { requestNotificationPermission } from '../../src/services/notifications';
import { useCardDetail, useCardPrice, usePriceHistory } from '../../src/hooks';

const screenWidth = Dimensions.get('window').width;
const TIME_RANGES = ['1D', '1W', '1M', '3M'];

/**
 * Mock recent sold listings — will be replaced by real eBay API data.
 * When real data flows:
 *   - Each item has a viewItemURL linking to the specific sold listing (ebay.com/itm/...)
 *   - Search uses full card title + set + language + grade
 *   - Filtered to Completed + Sold items only
 *   - Price comes from the most recent sale
 */
function generateMockSoldListings(
  cardName: string,
  setName: string,
  cardNumber: string,
  price: number,
  language: 'EN' | 'JP' = 'EN',
) {
  const now = Date.now();
  const lang = language === 'JP' ? 'Japanese' : 'English';
  // Mock individual listing IDs — real API returns actual viewItemURL per listing
  const mockItemIds = ['306854682927', '305478921034', '304912873456'];
  return [
    {
      title: `${cardName} ${cardNumber} ${setName} ${lang} PSA 10 GEM MINT Pokemon Card`,
      price: price * (0.95 + Math.random() * 0.1),
      date: new Date(now - 2 * 3600000).toISOString(),
      seller: 'pokecollector_99',
      url: `https://www.ebay.com/itm/${mockItemIds[0]}`,
    },
    {
      title: `${cardName} ${cardNumber} ${setName} ${lang} Near Mint Pokemon TCG`,
      price: price * (0.88 + Math.random() * 0.1),
      date: new Date(now - 8 * 3600000).toISOString(),
      seller: 'tcg_deals',
      url: `https://www.ebay.com/itm/${mockItemIds[1]}`,
    },
    {
      title: `Pokemon ${cardName} ${cardNumber} ${setName} Special Art Rare ${lang}`,
      price: price * (0.92 + Math.random() * 0.1),
      date: new Date(now - 18 * 3600000).toISOString(),
      seller: 'card_vault_store',
      url: `https://www.ebay.com/itm/${mockItemIds[2]}`,
    },
  ];
}

function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { items, addItem, removeItem, updatePrice, canAddMore, isPremium, maxFreeItems } = useWatchlistStore();
  // Default grade comes from user preferences and is persisted across
  // sessions — pick whatever the user last viewed so they don't have to
  // re-tap PSA 10 / Raw on every card.
  const defaultGrade = useUserStore((s) => s.preferences.defaultGrade);
  const updatePreference = useUserStore((s) => s.updatePreference);
  const [gradeIndex, setGradeIndex] = useState(() =>
    Math.max(0, GRADE_OPTIONS.indexOf(defaultGrade)),
  );
  const [timeRangeIndex, setTimeRangeIndex] = useState(2);
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
  const { alerts: allAlerts, addAlert } = useAlertsStore();

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

  // Fire the coming-soon popup when the toggle transitions UNGRADED → PSA10.
  useEffect(() => {
    if (prevGradeRef.current !== 'PSA10' && selectedGrade === 'PSA10') {
      setPsaModalVisible(true);
    }
    prevGradeRef.current = selectedGrade;
  }, [selectedGrade]);

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

  // Filter history by selected time range
  const filteredHistory = useMemo(() => {
    if (!history || history.length === 0) return [];
    const now = Date.now();
    const dayMs = 86400000;
    const rangeDays = [1, 7, 30, 90][timeRangeIndex];
    const cutoff = now - rangeDays * dayMs;
    const filtered = history.filter((p) => new Date(p.date).getTime() >= cutoff);
    return filtered.length >= 2 ? filtered : history;
  }, [history, timeRangeIndex]);

  // Bell reflects whether the *current grade tab* has an active alert.
  // A triggered alert is treated as inactive (filled bell only means
  // "watching" — once it's fired the user needs to reset it).
  const hasAlert = allAlerts.some(
    (a) => a.cardId === id && a.grade === GRADE_OPTIONS[gradeIndex] && !a.triggered,
  );

  const isInWatchlist = items.some(
    (i) => i.kind === 'card' && i.cardId === id,
  );

  // Sync price to watchlist — only update if the grade matches what's saved
  useEffect(() => {
    if (price && isInWatchlist && id) {
      const savedItem = items.find((i) => i.kind === 'card' && i.cardId === id);
      if (savedItem && savedItem.kind === 'card' && savedItem.grade === selectedGrade) {
        updatePrice(id, price.currentPrice, price.percentChange);
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
            <Pressable onPress={handleToggleWatchlist} hitSlop={8} style={{ padding: spacing[1] }}>
              {isInWatchlist
                ? <IconBookmarkFilled size={22} color={colors.primary} />
                : <IconBookmark size={22} color={colors.onSurfaceMuted} />}
            </Pressable>
            <Pressable onPress={() => setAlertModalVisible(true)} hitSlop={8} style={{ padding: spacing[1] }}>
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
                  const priceLine = price ? ` — currently ${formatPrice(price.currentPrice)}` : '';
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
          <Image
            source={{ uri: card.images.large }}
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
              setGradeIndex(i);
              // Persist so the next card the user opens defaults to the
              // same grade tab — saves a tap on every navigation.
              updatePreference('defaultGrade', GRADE_OPTIONS[i]);
            }}
          />

          {/* Price section + alert. PSA 10 is gated until the eBay
              live proxy ships — show the slide-up coming-soon panel
              instead of the price card / loading skeleton / empty
              state. The toggle still works so the user can flip back
              to Raw with one tap. */}
          {selectedGrade === 'PSA10' ? (
            <ComingSoonPanel
              reanimateKey={selectedGrade}
              title="PSA 10 prices — coming soon"
              body="We’re shipping live raw prices first. Graded card tracking lights up after our eBay sales pipeline launches. Tap Raw above to see the live TCGPlayer Market Price."
            />
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
                    <Text variant="displaySm">{formatPrice(price.currentPrice)}</Text>
                    <PriceChange percent={price.percentChange} size="md" />
                  </View>
                  <Text variant="caption" color={colors.onSurfaceMuted}>
                    {price.lastSaleDate
                      ? `Last sale ${formatPrice(price.lastSalePrice)} on ${price.lastSaleDate} via `
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
                        Linking.openURL(sourceUrl);
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
                onPress={() => setAlertModalVisible(true)}
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
                      Linking.openURL(url);
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

          {/* Chart with time range toggle. Hidden on PSA 10 — the
              ComingSoonPanel above already explains the gate, and the
              chart would render mock graded history while the price
              card says "coming soon" — inconsistent. */}
          {selectedGrade !== 'PSA10' && filteredHistory && filteredHistory.length > 2 && price && (
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
                  data={filteredHistory}
                  height={200}
                  width={screenWidth - HORIZONTAL_PADDING * 2 - spacing[6] * 2}
                  interactive
                />
              </View>
            </Card>
          )}

          {/* Price-derived sections — AI valuation, fundamentals,
              market dynamics. All hide on PSA 10 since their numbers
              would either be missing or, worse, mock data that
              contradicts the "coming soon" panel above. They come
              back automatically when PSA 10 launches. */}
          {selectedGrade !== 'PSA10' && (
            <>
              {/* Prediction — AI valuation + market signals */}
              <AIValuation card={card} marketPrice={price?.currentPrice} />

              {/* Fundamentals — StockTwits-style data table */}
              <CardFundamentals card={card} marketPrice={price?.currentPrice} />

              {/* eBay Market Dynamics — demand pressure & supply saturation */}
              <MarketDynamics cardId={card.id} />
            </>
          )}

          {/* Recent eBay Sold Listings — same PSA 10 gate as the chart. */}
          {selectedGrade !== 'PSA10' && price && (
            <Card>
              <View style={{ gap: spacing[3] }}>
                <Text variant="labelLg">Recent eBay Sales</Text>
                {generateMockSoldListings(card.name, card.set.name, card.number, price.currentPrice, card.language).map((sale, i) => {
                  const timeAgo = Math.round((Date.now() - new Date(sale.date).getTime()) / 3600000);
                  return (
                    <Pressable
                      key={i}
                      onPress={() => sale.url && Linking.openURL(sale.url)}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingVertical: spacing[2],
                        borderTopWidth: i > 0 ? 1 : 0,
                        borderTopColor: colors.outlineVariant,
                        opacity: pressed ? 0.6 : 1,
                      })}
                    >
                      <View style={{ flex: 1, gap: spacing['0.5'] }}>
                        <Text variant="bodySm" numberOfLines={1}>{sale.title}</Text>
                        <Text variant="caption" color={colors.onSurfaceMuted}>
                          {sale.seller} · {timeAgo}h ago
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: spacing['0.5'] }}>
                        <Text variant="labelLg" color={colors.success}>
                          {formatPrice(sale.price)}
                        </Text>
                        <IconExternalLink size={12} color={colors.onSurfaceMuted} />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </Card>
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
            onSubmit={async (type, targetPrice) => {
              // Ask for OS permission the first time the user creates an
              // alert. We still record the alert even if denied — the
              // in-app notifications screen works without OS permission.
              const granted = await requestNotificationPermission();
              addAlert({
                cardId: id ?? '',
                cardName: card.name,
                grade: selectedGrade,
                type,
                targetPrice,
              });
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
            currentCount={items.length}
            maxCount={maxFreeItems}
          />
        </>
      )}

      {/* PSA 10 coming-soon popup — fires every time the user flips
          the segmented control to PSA 10. Lives at the screen root
          (outside the loading-gated branch) so it can pop even on the
          first render if the user lands on PSA 10 default. Persistent
          backdrop tap dismisses; "Got it" returns the user to Raw. */}
      <Modal
        visible={psaModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPsaModalVisible(false)}
      >
        <Pressable
          onPress={() => setPsaModalVisible(false)}
          style={{
            flex: 1,
            backgroundColor: withAlpha('#000000', 0.65),
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: spacing[6],
          }}
        >
          {/* Inner pressable swallows taps so the modal doesn't dismiss
              when the user taps the card itself. */}
          <Pressable
            onPress={(e) => e.stopPropagation?.()}
            style={{
              width: '100%',
              maxWidth: 360,
              backgroundColor: colors.surface,
              borderRadius: radius['2xl'],
              padding: spacing[6],
              gap: spacing[4],
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.outline,
            }}
          >
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
                  updatePreference('defaultGrade', 'UNGRADED');
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

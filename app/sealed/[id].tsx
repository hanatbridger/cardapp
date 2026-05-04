import React from 'react';
import { View, ScrollView, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import {
  IconChevronLeft,
  IconExternalLink,
  IconBookmark,
  IconBookmarkFilled,
  IconAlertCircle,
} from '@tabler/icons-react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import {
  Text,
  Card,
  Button,
  Badge,
  PriceChange,
  ScreenBackground,
  Skeleton,
  withErrorBoundary,
} from '../../src/components';
import { spacing, radius } from '../../src/theme/tokens';
import { withAlpha } from '../../src/utils/withAlpha';
import { formatPrice, formatRelativeTime } from '../../src/utils/format';
import { HORIZONTAL_PADDING } from '../../src/constants/layout';
import { SEALED_TYPE_LABEL } from '../../src/mocks/sealed';
import { useSealedProduct, useSealedPrice } from '../../src/hooks';
import { useWatchlistStore } from '../../src/stores';

function SealedDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const productQuery = useSealedProduct(id);
  const product = productQuery.data ?? null;
  const priceQuery = useSealedPrice(id, product?.tcgplayerProductId);
  const price = priceQuery.data ?? null;

  const { items, addItem, removeItem } = useWatchlistStore();
  const isWatched = product ? items.some((i) => i.kind === 'sealed' && i.productId === product.id) : false;

  const handleToggleWatch = () => {
    if (!product) return;
    if (isWatched) {
      removeItem(product.id);
    } else {
      addItem({
        kind: 'sealed',
        productId: product.id,
        productName: product.name,
        productType: product.type,
        setName: product.setName,
        imageUrl: product.imageUrl,
        lastPrice: price?.currentPrice,
        lastPriceChange: price?.percentChange,
      });
    }
  };

  const openTcgPlayer = () => {
    if (!product) return;
    Linking.openURL(product.tcgplayerUrl).catch(() => {
      // Soft-fail on web where Linking may be blocked by popup rules —
      // nothing to do; the user can long-press to copy.
    });
  };

  if (productQuery.isLoading) {
    return (
      <ScreenBackground>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ padding: HORIZONTAL_PADDING, gap: spacing[4] }}>
            <Skeleton height={220} borderRadius={radius.xl} />
            <Skeleton height={28} width={240} />
            <Skeleton height={80} borderRadius={radius.lg} />
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  if (!product) {
    return (
      <ScreenBackground>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[8] }}>
          <IconAlertCircle size={32} color={colors.onSurfaceMuted} />
          <Text variant="bodyLg" color={colors.onSurfaceMuted} style={{ marginTop: spacing[2] }}>
            Product not found
          </Text>
          <Button variant="tonal" onPress={() => router.back()} style={{ marginTop: spacing[4] }}>
            Go back
          </Button>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  // MSRP anchor — shows how far Market Price has moved off retail. Useful
  // shorthand for sealed collectors since "still at MSRP" vs "2× MSRP"
  // tells them everything about the product's state.
  const vsMsrp = price && product.msrp > 0 ? ((price.currentPrice - product.msrp) / product.msrp) * 100 : null;

  return (
    <ScreenBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Top bar — minimal chevron-back + bookmark. No title in the bar;
            the hero below owns the product title. Matches the card detail
            screen's chrome budget. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: HORIZONTAL_PADDING,
            paddingTop: spacing[2],
            paddingBottom: spacing[2],
          }}
        >
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? colors.surfaceVariant : 'transparent',
            })}
          >
            <IconChevronLeft size={24} color={colors.onSurface} />
          </Pressable>
          <Pressable
            onPress={handleToggleWatch}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? colors.surfaceVariant : 'transparent',
            })}
          >
            {isWatched ? (
              <IconBookmarkFilled size={22} color={colors.primary} />
            ) : (
              <IconBookmark size={22} color={colors.onSurface} />
            )}
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: HORIZONTAL_PADDING,
            paddingBottom: spacing[24],
            gap: spacing[5],
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero — set logo on tonal surface. Real product photography
              will slot in here once we have a licensed source; logos are
              a reliable placeholder because they're tied to the set id
              and the CDN URL is stable. */}
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              padding: spacing[6],
              borderRadius: radius.xl,
              backgroundColor: colors.surfaceVariant,
              borderWidth: 1,
              borderColor: colors.outlineVariant,
              gap: spacing[3],
            }}
          >
            <Image
              source={{ uri: product.imageUrl }}
              style={{ width: 220, height: 120 }}
              contentFit="contain"
            />
            <Badge variant="info">{SEALED_TYPE_LABEL[product.type]}</Badge>
          </View>

          {/* Title block */}
          <View style={{ gap: spacing[1] }}>
            <Text variant="headingLg">{product.name}</Text>
            <Text variant="bodySm" color={colors.onSurfaceVariant}>
              {product.setName} · {product.contents}
            </Text>
            {product.releaseDate ? (
              <Text variant="caption" color={colors.onSurfaceMuted}>
                Released {product.releaseDate}
              </Text>
            ) : null}
          </View>

          {/* Market Price card — TCGPlayer Market Price + delta vs MSRP.
              When live data isn't wired yet (USE_LIVE_TCGPLAYER === false)
              we render seeded numbers and flag them as Sample data in the
              badge so the user knows not to trust the decimal places. */}
          <Card padding={spacing[5]}>
            <View style={{ gap: spacing[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <Text variant="overline" color={colors.onSurfaceVariant}>
                  TCGPLAYER MARKET
                </Text>
                <Badge variant="neutral">Sample data</Badge>
              </View>

              {priceQuery.isLoading ? (
                <Skeleton height={48} width={180} />
              ) : price ? (
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing[3] }}>
                  <Text
                    variant="display"
                    style={{ fontVariant: ['tabular-nums'] as any }}
                  >
                    {formatPrice(price.currentPrice)}
                  </Text>
                  <PriceChange percent={price.percentChange} size="md" />
                </View>
              ) : (
                <Text variant="bodyMd" color={colors.onSurfaceMuted}>
                  No pricing available yet
                </Text>
              )}

              {price ? (
                <View style={{ flexDirection: 'row', gap: spacing[6] }}>
                  <View style={{ flex: 1, gap: spacing['0.5'] }}>
                    <Text variant="caption" color={colors.onSurfaceVariant}>MSRP</Text>
                    <Text variant="bodyMd" style={{ fontVariant: ['tabular-nums'] as any }}>
                      {formatPrice(product.msrp)}
                    </Text>
                  </View>
                  {vsMsrp !== null ? (
                    <View style={{ flex: 1, gap: spacing['0.5'] }}>
                      <Text variant="caption" color={colors.onSurfaceVariant}>vs MSRP</Text>
                      <Text
                        variant="bodyMd"
                        color={vsMsrp >= 0 ? colors.success : colors.danger}
                        style={{ fontVariant: ['tabular-nums'] as any }}
                      >
                        {vsMsrp >= 0 ? '+' : ''}{vsMsrp.toFixed(1)}%
                      </Text>
                    </View>
                  ) : null}
                  <View style={{ flex: 1, gap: spacing['0.5'] }}>
                    <Text variant="caption" color={colors.onSurfaceVariant}>Sales (14d)</Text>
                    <Text variant="bodyMd" style={{ fontVariant: ['tabular-nums'] as any }}>
                      {price.salesCount}
                    </Text>
                  </View>
                </View>
              ) : null}

              {price?.lastSaleDate ? (
                <Text variant="caption" color={colors.onSurfaceMuted}>
                  Last sale {formatRelativeTime(new Date(price.lastSaleDate).getTime())} ·{' '}
                  <Text variant="caption" style={{ fontVariant: ['tabular-nums'] as any }}>
                    {formatPrice(price.lastSalePrice)}
                  </Text>
                </Text>
              ) : null}
            </View>
          </Card>

          {/* Price range card — low / avg / high over the 14-day window.
              Flat grid so the numbers read quickly. Skip the card when no
              price data exists rather than showing a block of zeros. */}
          {price ? (
            <Card padding={spacing[5]}>
              <View style={{ gap: spacing[3] }}>
                <Text variant="overline" color={colors.onSurfaceVariant}>14-DAY RANGE</Text>
                <View style={{ flexDirection: 'row', gap: spacing[4] }}>
                  <View style={{ flex: 1, gap: spacing['0.5'] }}>
                    <Text variant="caption" color={colors.onSurfaceVariant}>Low</Text>
                    <Text variant="headingMd" style={{ fontVariant: ['tabular-nums'] as any }}>
                      {formatPrice(price.lowPrice)}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: spacing['0.5'] }}>
                    <Text variant="caption" color={colors.onSurfaceVariant}>Avg</Text>
                    <Text variant="headingMd" style={{ fontVariant: ['tabular-nums'] as any }}>
                      {formatPrice(price.averagePrice)}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: spacing['0.5'] }}>
                    <Text variant="caption" color={colors.onSurfaceVariant}>High</Text>
                    <Text variant="headingMd" style={{ fontVariant: ['tabular-nums'] as any }}>
                      {formatPrice(price.highPrice)}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          ) : null}

          {/* Primary action row — Watch + Open on TCGPlayer. Keeping both
              buttons visible (not behind a sheet) because sealed buyers
              consistently cross-reference live TCGPlayer listings before
              pulling the trigger. */}
          <View style={{ flexDirection: 'row', gap: spacing[2] }}>
            <Button
              variant={isWatched ? 'tonal' : 'filled'}
              icon={
                isWatched ? (
                  <IconBookmarkFilled size={16} color={colors.onPrimary} />
                ) : (
                  <IconBookmark size={16} color={colors.onPrimary} />
                )
              }
              onPress={handleToggleWatch}
              style={{ flex: 1 }}
            >
              {isWatched ? 'Watching' : 'Add to Watchlist'}
            </Button>
            <Button
              variant="outlined"
              icon={<IconExternalLink size={16} color={colors.primary} />}
              onPress={openTcgPlayer}
              style={{ flex: 1 }}
            >
              TCGPlayer
            </Button>
          </View>

          {/* Sealed collecting context — short marketing blurb tailored to
              the product type. Sits at the bottom so it doesn't compete
              with the price above but gives first-time sealed buyers
              enough scaffolding to know why they'd care about the SKU. */}
          <View
            style={{
              padding: spacing[5],
              borderRadius: radius.lg,
              backgroundColor: withAlpha(colors.primary, 0.08),
              borderWidth: 1,
              borderColor: withAlpha(colors.primary, 0.20),
              gap: spacing[1],
            }}
          >
            <Text variant="labelLg" color={colors.primary}>
              Why track sealed?
            </Text>
            <Text variant="bodySm" color={colors.onSurfaceVariant}>
              Factory-sealed {SEALED_TYPE_LABEL[product.type].toLowerCase()}s tend to move as one
              unit — every copy is identical, so price is a single number rather than the 7-grade
              matrix we compute for singles. Watching a sealed SKU gives you the cleanest signal
              on how the {product.setName} set is trending overall.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

export default withErrorBoundary(SealedDetailScreen, 'SealedDetail');

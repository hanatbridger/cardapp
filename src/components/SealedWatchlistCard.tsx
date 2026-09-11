import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Touchable } from './Touchable';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Text } from './Text';
import { Badge } from './Badge';
import { PriceChange } from './PriceChange';
import { SinceAddedLabel } from './SinceAddedLabel';
import { sinceAddedReturn } from '../services/since-added';
import { useWatchlistStore } from '../stores/watchlist-store';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius } from '../theme/tokens';
import { CARD_BORDER_RADIUS } from '../constants/layout';
import { useMoney } from '../hooks/use-money';
import { useSealedPrice } from '../hooks/use-sealed';
import { isSealedPriceLive } from '../services/tcgplayer';
import { SEALED_TYPE_LABEL } from '../mocks/sealed';
import type { SealedType } from '../types/sealed';

interface SealedWatchlistCardProps {
  productId: string;
  productName: string;
  productType: SealedType;
  setName: string;
  imageUrl: string;
  fallbackPrice?: number;
  fallbackPriceChange?: number;
  /** Since-added baseline (Premium); see services/since-added.ts. */
  baselinePrice?: number;
  baselineAt?: string;
  /** Premium gate for the since-added line. */
  showSinceAdded?: boolean;
}

/**
 * Sealed-product row on the Home watchlist. Shares the 96-pt vertical
 * rhythm with WatchlistCard so the list feels uniform even when mixing
 * singles and sealed products. No grade badge — sealed products have a
 * single "new/sealed" price — but we surface the product type chip in
 * the same spot so the row is still visually parsable at a glance.
 */
export const SealedWatchlistCard = React.memo(function SealedWatchlistCard({
  productId,
  productName,
  productType,
  setName,
  imageUrl,
  fallbackPrice,
  fallbackPriceChange,
  baselinePrice,
  baselineAt,
  showSinceAdded,
}: SealedWatchlistCardProps) {
  const { colors, isDark } = useTheme();
  const formatMoney = useMoney();

  // Shares the React Query cache with the detail screen so the same
  // sealed product always reads the same Market Price across the app.
  const { data: livePrice } = useSealedPrice(productId);
  const currentPrice = livePrice?.currentPrice ?? fallbackPrice;
  const percentChange = livePrice?.percentChange ?? fallbackPriceChange;

  // Only collectrics-backed products price live; the curated catalog
  // prices from seeds ("Sample data" below) and must never set, or be
  // measured against, a since-added baseline.
  const isLive = isSealedPriceLive(productId);
  const liveCurrent = isLive ? livePrice?.currentPrice : undefined;
  const liveChange = isLive ? livePrice?.percentChange : undefined;
  const updatePrice = useWatchlistStore((s) => s.updatePrice);
  const stampBaselines = useWatchlistStore((s) => s.stampBaselines);
  useEffect(() => {
    if (liveCurrent === undefined || !(liveCurrent > 0)) return;
    // Keeps the persisted fallback fresh (the watchlist aggregate reads
    // it) and gives a pre-baseline row its start. Both bail unchanged.
    updatePrice(productId, liveCurrent, liveChange ?? 0);
    stampBaselines([{ id: productId, price: liveCurrent }]);
  }, [productId, liveCurrent, liveChange, updatePrice, stampBaselines]);
  const sinceAdded =
    showSinceAdded && liveCurrent !== undefined
      ? sinceAddedReturn({ baselinePrice, baselineAt }, liveCurrent)
      : null;

  // Touchable = RectButton on native, Pressable on web (see
  // components/Touchable.tsx) — reliable taps on both.
  return (
    <Touchable
      onPress={() => router.push(`/sealed/${productId}`)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${productName}`}
      style={{
        flexDirection: 'row',
        padding: spacing[3],
        // Light: Trending-tile grey (white cards vanished on the white
        // canvas). Dark: unchanged.
        backgroundColor: isDark ? colors.surface : colors.surfaceVariant,
        borderRadius: CARD_BORDER_RADIUS,
        borderWidth: 1,
        borderColor: colors.outline,
        gap: spacing[3],
        alignItems: 'center',
      }}
    >
      {/* Logo in a 64×90 letterbox so the row height matches WatchlistCard
          (which renders a 64×90 card portrait). Keeps mixed feeds visually
          uniform — no jumpy row heights between cards and sealed. */}
      <View
        style={{
          width: 64,
          height: 90,
          borderRadius: radius.sm,
          backgroundColor: colors.surfaceVariant,
          borderWidth: 1,
          borderColor: colors.outlineVariant,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <Image
          source={{ uri: imageUrl }}
          style={{ width: 52, height: 52 }}
          contentFit="contain"
        />
      </View>

      <View style={{ flex: 1, gap: spacing[1] }}>
        <Text variant="labelLg" numberOfLines={1}>{productName}</Text>
        <Text variant="caption" color={colors.onSurfaceVariant} numberOfLines={1}>
          {setName}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1], flexWrap: 'wrap' }}>
          <Badge variant="info">{SEALED_TYPE_LABEL[productType]}</Badge>
          {/* Sealed products off the curated catalog still price from
              seeded mocks (tcgplayer.ts LIVE.sealedPrice). The detail
              screen has always said so; the watchlist row did not, which
              left a fabricated number sitting unlabelled in the list the
              app is now named after. */}
          {isSealedPriceLive(productId) ? null : (
            <Badge variant="neutral">Sample data</Badge>
          )}
        </View>
      </View>

      <View style={{ alignItems: 'flex-end', gap: spacing[1] }}>
        {currentPrice !== undefined ? (
          <>
            <Text variant="headingSm" style={{ fontVariant: ['tabular-nums'] as any }}>
              {formatMoney(currentPrice)}
            </Text>
            {percentChange !== undefined ? <PriceChange percent={percentChange} size="sm" /> : null}
            {sinceAdded ? (
              <SinceAddedLabel pct={sinceAdded.pct} baselineAt={sinceAdded.baselineAt} />
            ) : null}
          </>
        ) : (
          <Text variant="bodySm" color={colors.onSurfaceMuted}>--</Text>
        )}
      </View>
    </Touchable>
  );
});

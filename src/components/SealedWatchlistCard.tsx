import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Text } from './Text';
import { Badge } from './Badge';
import { PriceChange } from './PriceChange';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius } from '../theme/tokens';
import { CARD_BORDER_RADIUS } from '../constants/layout';
import { formatPrice } from '../utils/format';
import { useSealedPrice } from '../hooks/use-sealed';
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
}: SealedWatchlistCardProps) {
  const { colors } = useTheme();

  // Shares the React Query cache with the detail screen so the same
  // sealed product always reads the same Market Price across the app.
  const { data: livePrice } = useSealedPrice(productId);
  const currentPrice = livePrice?.currentPrice ?? fallbackPrice;
  const percentChange = livePrice?.percentChange ?? fallbackPriceChange;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => router.push(`/sealed/${productId}`)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${productName}`}
      style={{
        flexDirection: 'row',
        padding: spacing[3],
        backgroundColor: colors.surface,
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
        </View>
      </View>

      <View style={{ alignItems: 'flex-end', gap: spacing[1] }}>
        {currentPrice !== undefined ? (
          <>
            <Text variant="headingSm" style={{ fontVariant: ['tabular-nums'] as any }}>
              {formatPrice(currentPrice)}
            </Text>
            {percentChange !== undefined ? <PriceChange percent={percentChange} size="sm" /> : null}
          </>
        ) : (
          <Text variant="bodySm" color={colors.onSurfaceMuted}>--</Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

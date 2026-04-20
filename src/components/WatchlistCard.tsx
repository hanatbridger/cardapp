import React from 'react';
import { View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { IconTrendingUp, IconTrendingDown } from '@tabler/icons-react-native';
import { Text } from './Text';
import { GradeBadge } from './GradeBadge';
import { PriceChange } from './PriceChange';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius } from '../theme/tokens';
import { CARD_BORDER_RADIUS } from '../constants/layout';
import { formatPrice } from '../utils/format';
import { withAlpha } from '../utils/withAlpha';
import { getCardScore } from '../data/card-scores';
import { getValuation } from '../services/price-prediction';
import { useCardPrice } from '../hooks/use-card-price';
import type { GradeType } from '../constants/grades';
import type { CardPrice } from '../types/card';

interface WatchlistCardProps {
  cardId: string;
  cardName: string;
  cardImageUrl: string;
  setName: string;
  /** Card number within set — needed to query the right eBay listings */
  setNumber?: string;
  grade: GradeType;
  rarity?: string;
  language?: 'EN' | 'JP';
  /** Fallback price (mock / last-known) shown while live price loads or if it fails */
  fallbackPrice?: CardPrice;
}

export const WatchlistCard = React.memo(function WatchlistCard({
  cardId,
  cardName,
  cardImageUrl,
  setName,
  setNumber,
  grade,
  rarity,
  language,
  fallbackPrice,
}: WatchlistCardProps) {
  const { colors } = useTheme();

  // Fetch live price — shares React Query cache with the detail screen,
  // so the same card always shows the same number across the app.
  const { data: livePrice } = useCardPrice({
    cardName,
    grade,
    cardId,
    setName,
    cardNumber: setNumber,
    language,
  });
  const price = livePrice ?? fallbackPrice;

  // AI valuation
  const score = getCardScore(cardId);
  let valuationLabel: 'undervalued' | 'overvalued' | null = null;
  let valuationPercent = 0;
  if (score && price) {
    const v = getValuation(score, price.currentPrice);
    if (v.label !== 'fair') {
      valuationLabel = v.label;
      valuationPercent = Math.abs(v.gapPercent);
    }
  }

  return (
    <Pressable
      onPress={() => router.push(`/card/${cardId}`)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        padding: spacing[3],
        backgroundColor: pressed ? colors.surfaceVariant : colors.surface,
        borderRadius: CARD_BORDER_RADIUS,
        borderWidth: 1,
        borderColor: colors.outline,
        gap: spacing[3],
        alignItems: 'center',
      })}
    >
      <Image
        source={{ uri: cardImageUrl }}
        style={{ width: 64, height: 90, borderRadius: radius.sm }}
        contentFit="cover"
      />

      <View style={{ flex: 1, gap: spacing[1] }}>
        <Text variant="labelLg" numberOfLines={1}>{cardName}</Text>
        <Text variant="caption" color={colors.onSurfaceVariant} numberOfLines={1}>
          {setName}
        </Text>
        {rarity && (
          <Text variant="caption" color={colors.onSurfaceVariant} numberOfLines={1}>
            {rarity}
          </Text>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1], flexWrap: 'wrap' }}>
          <GradeBadge grade={grade} size="sm" />
          {valuationLabel && (
            <View
              style={{
                backgroundColor: valuationLabel === 'undervalued'
                  ? withAlpha(colors.success, 0.12)
                  : withAlpha(colors.danger, 0.12),
                borderRadius: radius.full,
                paddingHorizontal: spacing[2],
                paddingVertical: spacing['0.5'],
              }}
            >
              <Text
                variant="labelSm"
                color={valuationLabel === 'undervalued' ? colors.success : colors.danger}
              >
                {valuationLabel === 'undervalued' ? 'Undervalued' : 'Overvalued'}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={{ alignItems: 'flex-end', gap: spacing[1] }}>
        {price ? (
          <>
            <Text variant="headingSm">
              {formatPrice(price.currentPrice)}
            </Text>
            <PriceChange percent={price.percentChange} size="sm" />
          </>
        ) : (
          <Text variant="bodySm" color={colors.onSurfaceMuted}>--</Text>
        )}
      </View>
    </Pressable>
  );
});

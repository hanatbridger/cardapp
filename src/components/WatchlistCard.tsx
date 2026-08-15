import React from 'react';
import { View } from 'react-native';
import { Touchable } from './Touchable';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { IconTrendingUp, IconTrendingDown } from '@tabler/icons-react-native';
import { Text } from './Text';
import { GradeBadge } from './GradeBadge';
import { PriceChange } from './PriceChange';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius } from '../theme/tokens';
import { CARD_BORDER_RADIUS } from '../constants/layout';
import { useMoney } from '../hooks/use-money';
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
  const { colors, isDark } = useTheme();
  const formatMoney = useMoney();

  // Fetch live price — shares React Query cache with the detail screen,
  // so the same card always shows the same number across the app.
  // Empty cardName disables the query for PSA10 rows (rendered null
  // below): the hook must still be CALLED for rules-of-hooks, but a
  // never-rendered row shouldn't pay for a price fetch.
  const { data: livePrice } = useCardPrice({
    cardName: grade === 'PSA10' ? '' : cardName,
    grade,
    cardId,
    setName,
    cardNumber: setNumber,
    language,
  });
  const price = livePrice ?? fallbackPrice;

  // Belt-and-suspenders launch gate — PSA 10 graded cards are hidden
  // from every watchlist surface until the eBay live proxy ships.
  // The home tab also filters them out at the FlatList data prop, but
  // this guarantees no PSA 10 row leaks through any other caller (or
  // a stale deploy where the upstream filter wasn't yet live).
  // NOTE: kept BELOW all hooks (same pattern as PriceChart) — returning
  // earlier would skip useCardPrice and violate the Rules of Hooks if
  // `grade` changes while mounted.
  if (grade === 'PSA10') return null;

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

  // Touchable = RectButton on native, Pressable on web (see
  // components/Touchable.tsx). Native needs gesture-handler here, not
  // RN's TouchableOpacity / Pressable.
  // Reason: this row is wrapped by ReanimatedSwipeable (in app/(tabs)/
  // index.tsx via SwipeToDelete), which uses gesture-handler's Tap +
  // Pan gestures. RN's Touchable system and gesture-handler's gesture
  // system don't coordinate — on cold launch, gesture-handler's
  // internal Tap can capture the touch before TouchableOpacity sees
  // it, silently swallowing the press. RectButton lives in the same
  // gesture system as the swipe and yields properly to it. This was
  // the root cause that previous symptom-level fixes (removing fade-
  // in wrapper, swapping Pressable for TouchableOpacity, migrating
  // TrendingCarousel to UI-thread Reanimated) never addressed.
  return (
    <Touchable
      onPress={() => router.push(`/card/${cardId}`)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${cardName}`}
      style={{
        flexDirection: 'row',
        padding: spacing[3],
        // Light mode: surfaceVariant (the Trending tiles' light grey) —
        // on the white canvas, `surface` cards disappeared into the bg.
        // Dark mode: keep `surface` as before.
        backgroundColor: isDark ? colors.surface : colors.surfaceVariant,
        borderRadius: CARD_BORDER_RADIUS,
        borderWidth: 1,
        borderColor: colors.outline,
        gap: spacing[3],
        alignItems: 'center',
      }}
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
              {formatMoney(price.currentPrice)}
            </Text>
            <PriceChange percent={price.percentChange} size="sm" />
          </>
        ) : (
          <Text variant="bodySm" color={colors.onSurfaceMuted}>--</Text>
        )}
      </View>
    </Touchable>
  );
});

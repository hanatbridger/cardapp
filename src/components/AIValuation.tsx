import React from 'react';
import { View } from 'react-native';
import { IconBrain, IconTrendingUp, IconTrendingDown, IconMinus } from '@tabler/icons-react-native';
import { Text } from './Text';
import { Card } from './Card';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius } from '../theme/tokens';
import { withAlpha } from '../utils/withAlpha';
import { getCardScore } from '../data/card-scores';
import { getMarketDynamics } from '../data/ebay-market-dynamics';
import { getValuation, type Valuation } from '../services/price-prediction';
import { formatPrice } from '../utils/format';
import type { PokemonCard } from '../types/card';

interface AIValuationProps {
  card: PokemonCard;
  marketPrice?: number;
}

type MarketSignal = 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';

interface MarketSignalResult {
  signal: MarketSignal;
  label: string;
  reason: string;
}

/**
 * Combine valuation gap + demand pressure + supply saturation
 * into a single actionable market signal.
 */
function computeMarketSignal(
  valuation: Valuation,
  demandPressure: number,
  supplySaturation: number,
): MarketSignalResult {
  // Score from -2 to +2 based on three factors
  let score = 0;

  // Factor 1: Valuation gap (most important)
  if (valuation.gapPercent > 15) score += 2;
  else if (valuation.gapPercent > 7) score += 1;
  else if (valuation.gapPercent < -15) score -= 2;
  else if (valuation.gapPercent < -7) score -= 1;

  // Factor 2: Demand pressure
  if (demandPressure > 8) score += 1;      // Tight market = bullish
  else if (demandPressure < 2.5) score -= 1; // Heavy supply = bearish

  // Factor 3: Supply saturation shift
  if (supplySaturation < 0.8) score += 1;   // Tightening = bullish
  else if (supplySaturation > 1.3) score -= 1; // Loosening = bearish

  // Build reason string
  const reasons: string[] = [];
  if (demandPressure > 8) reasons.push('high demand');
  else if (demandPressure < 2.5) reasons.push('weak demand');

  if (supplySaturation < 0.8) reasons.push('tightening supply');
  else if (supplySaturation > 1.3) reasons.push('rising supply');

  if (valuation.gapPercent > 7) reasons.push('undervalued');
  else if (valuation.gapPercent < -7) reasons.push('overvalued');

  const reason = reasons.length > 0
    ? reasons.join(' + ')
    : 'balanced market conditions';

  if (score >= 3) return { signal: 'strong_buy', label: 'Strong Buy', reason };
  if (score >= 1) return { signal: 'buy', label: 'Buy', reason };
  if (score <= -3) return { signal: 'strong_sell', label: 'Strong Sell', reason };
  if (score <= -1) return { signal: 'sell', label: 'Sell', reason };
  return { signal: 'hold', label: 'Hold', reason };
}

export function AIValuation({ card, marketPrice }: AIValuationProps) {
  const { colors } = useTheme();

  const score = getCardScore(card.id);
  const dynamics = getMarketDynamics(card.id);

  // Compute valuation if we have score + market price
  let valuation: Valuation | null = null;
  if (score && marketPrice) {
    valuation = getValuation(score, marketPrice);
  }

  // Nothing to render without a valuation
  if (!valuation) return null;

  const isUndervalued = valuation.label === 'undervalued';
  const isOvervalued = valuation.label === 'overvalued';
  const accentColor = isUndervalued
    ? colors.success
    : isOvervalued
      ? colors.danger
      : colors.onSurfaceMuted;
  const labelText = isUndervalued
    ? `Undervalued by ${Math.abs(valuation.gapPercent).toFixed(1)}%`
    : isOvervalued
      ? `Overvalued by ${Math.abs(valuation.gapPercent).toFixed(1)}%`
      : 'Fairly Priced';

  // Compute market signal if we have dynamics data
  const marketSignal = dynamics
    ? computeMarketSignal(valuation, dynamics.demandPressure, dynamics.supplySaturation)
    : null;

  const signalColor = marketSignal
    ? marketSignal.signal === 'strong_buy' || marketSignal.signal === 'buy'
      ? colors.success
      : marketSignal.signal === 'strong_sell' || marketSignal.signal === 'sell'
        ? colors.danger
        : colors.warning
    : colors.onSurfaceMuted;

  const SignalIcon = marketSignal
    ? marketSignal.signal === 'strong_buy' || marketSignal.signal === 'buy'
      ? IconTrendingUp
      : marketSignal.signal === 'strong_sell' || marketSignal.signal === 'sell'
        ? IconTrendingDown
        : IconMinus
    : IconMinus;

  return (
    <Card>
      <View style={{ gap: spacing[3] }}>
        <Text variant="labelLg">Prediction</Text>

        {/* Valuation signal */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: withAlpha(accentColor, 0.12),
            borderRadius: radius.md,
            padding: spacing[3],
            gap: spacing[2],
          }}
        >
          <IconBrain size={20} color={accentColor} />
          <View style={{ flex: 1 }}>
            <Text variant="labelLg" color={accentColor}>
              {labelText}
            </Text>
            <Text variant="caption" color={colors.onSurfaceMuted}>
              AI predicted fair value: {formatPrice(valuation.predictedPrice)}
            </Text>
          </View>
        </View>

        {/* Market Signal — combines valuation + supply/demand */}
        {marketSignal && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: withAlpha(signalColor, 0.12),
              borderRadius: radius.md,
              padding: spacing[3],
              gap: spacing[2],
            }}
          >
            <SignalIcon size={20} color={signalColor} />
            <View style={{ flex: 1 }}>
              <Text variant="labelLg" color={signalColor}>
                Market Signal: {marketSignal.label}
              </Text>
              <Text variant="caption" color={colors.onSurfaceMuted}>
                {marketSignal.reason}
              </Text>
            </View>
          </View>
        )}

        <Text variant="caption" color={colors.onSurfaceMuted}>
          Based on pull cost, desirability{dynamics ? ', and eBay market data' : ' analysis'}. Not financial advice.
        </Text>
      </View>
    </Card>
  );
}

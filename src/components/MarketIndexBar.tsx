import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { PriceChange } from './PriceChange';
import { useTheme } from '../theme/ThemeProvider';
import { spacing } from '../theme/tokens';
import { HORIZONTAL_PADDING } from '../constants/layout';
import { useMarketIndex } from '../hooks/use-market-index';
import type { IndexWindow } from '../services/market-index';

const WINDOWS: { key: 'd1' | 'd7' | 'd30'; label: string; spoken: string }[] = [
  { key: 'd1', label: '1D', spoken: '1 day' },
  { key: 'd7', label: '7D', spoken: '7 day' },
  { key: 'd30', label: '30D', spoken: '30 day' },
];

/**
 * Market index strip — sits directly under the Home header, the way a
 * broker app puts index tickers under its logo. One equal-dollar basket
 * of the ~1,800 cards our daily cron tracks, read over three horizons.
 *
 * Renders nothing until the index resolves: the strip is one row, and a
 * skeleton that swaps to content shifts the whole list under it. The
 * reserved minHeight keeps that swap from moving anything.
 */
export function MarketIndexBar() {
  const { colors } = useTheme();
  const { data } = useMarketIndex();

  const cells = WINDOWS.map((w) => ({ ...w, value: data?.windows?.[w.key] ?? null }));
  const hasAny = cells.some((c) => c.value !== null);

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: HORIZONTAL_PADDING,
          paddingBottom: spacing[3],
          minHeight: spacing[10],
        }}
      >
        {hasAny
          ? cells.map(({ key, label, spoken, value }) => (
              <View
                key={key}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] }}
                accessibilityLabel={
                  value
                    ? `Card market index, ${spoken}, ${value.changePct >= 0 ? 'up' : 'down'} ${Math.abs(value.changePct).toFixed(2)} percent`
                    : `Card market index, ${spoken}, unavailable`
                }
              >
                <Text variant="caption" color={colors.onSurfaceMuted}>
                  {label}
                </Text>
                {value ? (
                  <PriceChange percent={value.changePct} size="sm" />
                ) : (
                  <Text variant="labelSm" color={colors.onSurfaceMuted}>
                    —
                  </Text>
                )}
              </View>
            ))
          : null}
      </View>
      {hasAny ? <View style={{ height: 1, backgroundColor: colors.outline }} /> : null}
    </View>
  );
}

export type { IndexWindow };

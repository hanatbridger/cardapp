import React, { useState } from 'react';
import { View } from 'react-native';
import { IconChevronDown, IconCheck } from '@tabler/icons-react-native';
import { Text } from './Text';
import { PriceChange } from './PriceChange';
import { BottomSheet } from './BottomSheet';
import { Touchable } from './Touchable';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius } from '../theme/tokens';
import { HORIZONTAL_PADDING } from '../constants/layout';
import { useMarketIndex } from '../hooks/use-market-index';
import type { IndexSeries, IndexWindowKey } from '../services/market-index';

const WINDOWS: { key: IndexWindowKey; label: string; spoken: string }[] = [
  { key: 'd1', label: '1D', spoken: '1 day' },
  { key: 'd7', label: '7D', spoken: '7 days' },
  { key: 'd30', label: '30D', spoken: '30 days' },
];

/**
 * Market trends strip — sits directly under the Home header, the way a
 * broker app puts index tickers under its logo. Three equal-dollar
 * matched baskets (everything, singles, sealed) read over one
 * selectable horizon, on one line.
 *
 * No trend arrows and no chip around the picker: at 375pt three
 * baskets plus the control only fit without them, and colour and sign
 * already carry direction. Renders nothing until an index resolves,
 * since a skeleton that swaps to content shifts the list under it.
 */
export function MarketIndexBar() {
  const { colors } = useTheme();
  const { data } = useMarketIndex();
  const [windowKey, setWindowKey] = useState<IndexWindowKey>('d1');
  const [pickerOpen, setPickerOpen] = useState(false);

  const active = WINDOWS.find((w) => w.key === windowKey) ?? WINDOWS[0];
  // Every series shares one anchor date; surface it so "1D" is never
  // mistaken for "since yesterday" when the source lags a day.
  const asOf = data?.market?.asOf ?? data?.card?.asOf ?? data?.sealed?.asOf ?? null;
  const asOfLabel = asOf
    ? new Date(`${asOf}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : '';
  const cardBasket = (data?.card?.basketSize ?? 0).toLocaleString();
  const sealedBasket = (data?.sealed?.basketSize ?? 0).toLocaleString();
  const series: { label: string; spoken: string; value: IndexSeries | null }[] = [
    { label: 'INDEX', spoken: 'Index', value: data?.market ?? null },
    { label: 'CARDS', spoken: 'Cards', value: data?.card ?? null },
    { label: 'SEALED', spoken: 'Sealed', value: data?.sealed ?? null },
  ];
  if (!series.some((x) => x.value)) return null;

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: HORIZONTAL_PADDING,
          paddingBottom: spacing[3],
          gap: spacing[2],
        }}
      >
        {series.map(({ label, spoken, value }) => {
          const w = value?.windows?.[windowKey] ?? null;
          return (
            <View
              key={label}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}
              // Without `accessible` iOS ignores the label and reads the
              // child Texts instead — the bare percent, no horizon, no
              // direction word.
              accessible
              accessibilityLabel={
                w
                  ? `${spoken} index, ${active.spoken}, ${w.changePct >= 0 ? 'up' : 'down'} ${Math.abs(w.changePct).toFixed(2)} percent`
                  : `${spoken} index, ${active.spoken}, unavailable`
              }
            >
              <Text variant="caption" color={colors.onSurfaceMuted}>
                {label}
              </Text>
              {w ? (
                <PriceChange percent={w.changePct} size="sm" showIcon={false} />
              ) : (
                <Text variant="labelSm" color={colors.onSurfaceMuted}>
                  —
                </Text>
              )}
            </View>
          );
        })}

        {/* Touchable, not Pressable: in this header RN's Pressable drops
            the tap on iOS (Fabric) — the same failure the search button
            beside it had. See Touchable.tsx. */}
        <Touchable
          onPress={() => setPickerOpen(true)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={`Market trends window, ${active.spoken}${asOfLabel ? `, prices through ${asOfLabel}` : ''}. Change`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}
        >
          <Text variant="labelSm" color={colors.onSurfaceVariant}>
            {active.label}
          </Text>
          <IconChevronDown size={12} color={colors.onSurfaceMuted} />
        </Touchable>
      </View>

      <View style={{ height: 1, backgroundColor: colors.outline }} />

      <BottomSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Market trends"
      >
        {asOf ? (
          <Text variant="caption" color={colors.onSurfaceMuted}>
            Prices through {asOfLabel}. Cards: {cardBasket} tracked singles, value-weighted.
            Sealed: {sealedBasket} products. Index: both combined.
          </Text>
        ) : null}
        {WINDOWS.map((w) => {
          const selected = w.key === windowKey;
          return (
            <Touchable
              key={w.key}
              onPress={() => {
                setWindowKey(w.key);
                setPickerOpen(false);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Show ${w.spoken} change`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: spacing[3],
                paddingHorizontal: spacing[2],
                borderRadius: radius.md,
              }}
            >
              <Text variant="bodyMd" color={selected ? colors.primary : colors.onSurface}>
                Last {w.spoken}
              </Text>
              {selected ? <IconCheck size={20} color={colors.primary} /> : null}
            </Touchable>
          );
        })}
      </BottomSheet>
    </View>
  );
}

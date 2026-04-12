import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { Card } from './Card';
import { Badge } from './Badge';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius } from '../theme/tokens';
import { withAlpha } from '../utils/withAlpha';
import { getMarketDynamics, type MarketDynamicsData } from '../data/ebay-market-dynamics';

interface MarketDynamicsProps {
  cardId: string;
}

/** Format a percentage change with sign */
function formatChange(current: number, baseline: number): { text: string; isPositive: boolean } {
  const pct = ((current - baseline) / baseline) * 100;
  const sign = pct >= 0 ? '+' : '';
  return {
    text: `${sign}${pct.toFixed(0)}%`,
    isPositive: pct >= 0,
  };
}

/** Single metric in the 3-stat summary row */
function StatCell({
  label,
  value,
  baseline,
  invertColor,
}: {
  label: string;
  value: number;
  baseline: number;
  /** If true, a positive change is bad (e.g. active listings going up = more supply) */
  invertColor?: boolean;
}) {
  const { colors } = useTheme();
  const change = formatChange(value, baseline);
  const isGood = invertColor ? !change.isPositive : change.isPositive;

  return (
    <View style={{ flex: 1, alignItems: 'center', gap: spacing['0.5'] }}>
      <Text variant="caption" color={colors.onSurfaceMuted}>{label}</Text>
      <Text variant="labelLg">{value.toFixed(value >= 100 ? 0 : 1)}</Text>
      <View
        style={{
          backgroundColor: withAlpha(isGood ? colors.success : colors.danger, 0.15),
          borderRadius: radius.full,
          paddingHorizontal: spacing[1],
          paddingVertical: 1,
        }}
      >
        <Text variant="caption" color={isGood ? colors.success : colors.danger}>
          {change.text} vs 30d
        </Text>
      </View>
    </View>
  );
}

/** Horizontal gauge meter with indicator */
function GaugeMeter({
  value,
  min,
  max,
  labels,
  colorStops,
}: {
  value: number;
  min: number;
  max: number;
  labels: string[];
  /** Colors from left to right */
  colorStops: string[];
}) {
  const { colors } = useTheme();
  const clamped = Math.max(min, Math.min(max, value));
  const pct = ((clamped - min) / (max - min)) * 100;

  // Pick color based on position
  const colorIndex = Math.min(
    Math.floor((pct / 100) * colorStops.length),
    colorStops.length - 1,
  );
  const indicatorColor = colorStops[colorIndex];

  return (
    <View style={{ gap: spacing[1] }}>
      {/* Track */}
      <View style={{ height: 8, borderRadius: radius.full, overflow: 'hidden', flexDirection: 'row' }}>
        {colorStops.map((color, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              backgroundColor: withAlpha(color, 0.3),
            }}
          />
        ))}
      </View>

      {/* Indicator */}
      <View style={{ position: 'relative', height: 16 }}>
        <View
          style={{
            position: 'absolute',
            left: `${pct}%`,
            marginLeft: -6,
            width: 12,
            height: 12,
            borderRadius: radius.full,
            backgroundColor: indicatorColor,
            borderWidth: 2,
            borderColor: colors.surface,
            top: 0,
          }}
        />
      </View>

      {/* Labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {labels.map((label) => (
          <Text key={label} variant="caption" color={colors.onSurfaceMuted}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** Gauge section with title, value, and meter */
function GaugeSection({
  title,
  value,
  formattedValue,
  min,
  max,
  labels,
  colorStops,
}: {
  title: string;
  value: number;
  formattedValue: string;
  min: number;
  max: number;
  labels: string[];
  colorStops: string[];
}) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: spacing[2] }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="bodySm" color={colors.onSurfaceVariant}>{title}</Text>
        <Text variant="labelLg">{formattedValue}</Text>
      </View>
      <GaugeMeter
        value={value}
        min={min}
        max={max}
        labels={labels}
        colorStops={colorStops}
      />
    </View>
  );
}

export function MarketDynamics({ cardId }: MarketDynamicsProps) {
  const { colors } = useTheme();
  const dynamics = getMarketDynamics(cardId);

  if (!dynamics) return null;

  return (
    <Card>
      <View style={{ gap: spacing[4] }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
          <Text variant="labelLg">eBay Market Dynamics</Text>
          <View
            style={{
              backgroundColor: withAlpha(colors.primary, 0.12),
              borderRadius: radius.full,
              paddingHorizontal: spacing[1],
              paddingVertical: 1,
            }}
          >
            <Text variant="caption" color={colors.primary}>7d avg</Text>
          </View>
        </View>

        {/* 3-stat summary row */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: withAlpha(colors.surfaceVariant, 0.5),
            borderRadius: radius.lg,
            paddingVertical: spacing[3],
            paddingHorizontal: spacing[2],
          }}
        >
          <StatCell
            label="Active"
            value={dynamics.activeListings7d}
            baseline={dynamics.activeListings30d}
            invertColor
          />
          <View style={{ width: 1, backgroundColor: colors.outlineVariant }} />
          <StatCell
            label="New/Day"
            value={dynamics.newPerDay7d}
            baseline={dynamics.newPerDay30d}
            invertColor
          />
          <View style={{ width: 1, backgroundColor: colors.outlineVariant }} />
          <StatCell
            label="Sold/Day"
            value={dynamics.soldPerDay7d}
            baseline={dynamics.soldPerDay30d}
          />
        </View>

        {/* Demand Pressure gauge */}
        <GaugeSection
          title="Demand Pressure"
          value={dynamics.demandPressure}
          formattedValue={`${dynamics.demandPressure.toFixed(1)}%`}
          min={0}
          max={18}
          labels={['Heavy Supply', 'Moderate', 'Tight', 'Very Tight']}
          colorStops={[colors.danger, colors.warning, colors.success, colors.primary]}
        />

        {/* Supply Saturation Shift gauge */}
        <GaugeSection
          title="Supply Saturation"
          value={dynamics.supplySaturation}
          formattedValue={`${dynamics.supplySaturation.toFixed(2)}×`}
          min={0.4}
          max={2.0}
          labels={['Tightening', 'Stable', 'Loosening']}
          colorStops={[colors.success, colors.warning, colors.danger]}
        />

        {/* Disclaimer */}
        <Text variant="caption" color={colors.onSurfaceMuted}>
          Based on eBay listing data. Directionally accurate, not exact.
        </Text>
      </View>
    </Card>
  );
}

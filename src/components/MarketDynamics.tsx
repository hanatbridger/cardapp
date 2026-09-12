import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import { Card } from './Card';
import { Badge } from './Badge';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius, palette } from '../theme/tokens';
import { withAlpha } from '../utils/withAlpha';
import { getMarketDynamics, type MarketDynamicsData } from '../data/ebay-market-dynamics';
import type { LiveMarketDynamics } from '../services/card-stats';

interface MarketDynamicsProps {
  cardId: string;
  /**
   * Real collectrics-backed metrics from useCardStats. When present the
   * section renders live data with no Sample badge; when absent it falls
   * back to the seeded dataset (still badged) for the handful of
   * showcase cards, and hides entirely for everything else.
   */
  live?: LiveMarketDynamics | null;
  /**
   * Render without the Card shell and without the title row — for use
   * inside CollapsibleCard, which supplies the card, the title and the
   * header chips.
   */
  bare?: boolean;
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
  /** One label per end of the track — left edge, right edge. */
  labels: [string, string];
  /** Gradient stops from left to right. Tuple so LinearGradient's
      two-colour minimum is checked at the call site. */
  colorStops: readonly [string, string, ...string[]];
}) {
  const { colors } = useTheme();
  const clamped = Math.max(min, Math.min(max, value));
  const pct = ((clamped - min) / (max - min)) * 100;

  return (
    <View style={{ gap: spacing[1] }}>
      {/* Track + marker. The row is as tall as the marker so the marker
          centres on the 8pt track, and it sits OUTSIDE the gradient —
          the track's rounded ends need no overflow clip to eat it. */}
      <View style={{ height: 12, justifyContent: 'center' }}>
        <LinearGradient
          colors={colorStops}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ height: 8, borderRadius: radius.full }}
        />
        <View
          style={{
            position: 'absolute',
            left: `${pct}%`,
            marginLeft: -6,
            top: 0,
            width: 12,
            height: 12,
            borderRadius: radius.full,
            // Pure white from the palette (mode-independent, unlike
            // colors.surface): the marker rides a fully saturated
            // gradient, so it needs the same fill in both themes. The
            // dark ring is what separates it from the amber midpoint.
            backgroundColor: palette.neutral[0],
            borderWidth: 2,
            borderColor: withAlpha(palette.neutral[950], 0.25),
          }}
        />
      </View>

      {/* Labels — one per end, so the pair reads as the track's range */}
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
  labels: [string, string];
  colorStops: readonly [string, string, ...string[]];
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

/**
 * The "7d avg" pill from the section header. Exported because a bare
 * MarketDynamics has no header of its own — the screen hands this to
 * CollapsibleCard's headerRight so the qualifier stays next to the title
 * instead of disappearing.
 */
export function DynamicsChip() {
  const { colors } = useTheme();
  return (
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
  );
}

export function MarketDynamics({ cardId, live, bare }: MarketDynamicsProps) {
  const { colors } = useTheme();
  const isLive = Boolean(live);
  const dynamics: MarketDynamicsData | LiveMarketDynamics | undefined =
    live ?? getMarketDynamics(cardId);

  if (!dynamics) return null;

  const body = (
      <View style={{ gap: spacing[4] }}>
        {/* Header */}
        {!bare && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
          <Text variant="headingSm">eBay Market Dynamics</Text>
          <DynamicsChip />
          {/* Seeded fallback keeps the disclosure badge (same
              convention as app/sealed/[id].tsx); live data drops it. */}
          {!isLive && <Badge variant="neutral">Sample data</Badge>}
        </View>
        )}

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
          labels={['Heavy Supply', 'Very Tight']}
          colorStops={[colors.danger, colors.warning, colors.success, colors.primary]}
        />

        {/* Supply Saturation Shift gauge */}
        <GaugeSection
          title="Supply Saturation"
          value={dynamics.supplySaturation}
          formattedValue={`${dynamics.supplySaturation.toFixed(2)}×`}
          min={0.4}
          max={2.0}
          labels={['Tightening', 'Loosening']}
          colorStops={[colors.success, colors.warning, colors.danger]}
        />

        {/* Disclaimer */}
        <Text variant="caption" color={colors.onSurfaceMuted}>
          Based on eBay listing data. Directionally accurate, not exact.
        </Text>
      </View>
  );

  return bare ? body : <Card>{body}</Card>;
}

import React, { useState, useCallback, useRef } from 'react';
import { View, Platform } from 'react-native';
import Svg, { Polyline, Defs, LinearGradient, Stop, Polygon, Line, Circle, Text as SvgText } from 'react-native-svg';
import { Text } from './Text';
import { useTheme } from '../theme/ThemeProvider';
import { spacing } from '../theme/tokens';
import type { PriceHistoryPoint } from '../types/card';

interface PriceChartProps {
  data: PriceHistoryPoint[];
  height?: number;
  width?: number;
  color?: string;
  showGradient?: boolean;
  interactive?: boolean;
  /**
   * Formats a (USD) value for the crosshair + axis labels. Defaults to
   * plain USD; the card screen passes a currency-aware formatter so chart
   * labels follow the user's display currency. The line geometry uses raw
   * values and is scale-invariant, so only the labels need converting.
   */
  formatValue?: (value: number) => string;
}

interface TouchInfo {
  x: number;
  y: number;
  price: number;
  date: string;
}

const LABEL_HEIGHT = 20; // space for month labels at bottom
const PRICE_LABEL_WIDTH = 50; // space for high/low labels on right

export function PriceChart({
  data,
  height: totalHeight = 200,
  width: totalWidth = 340,
  color: colorOverride,
  showGradient = true,
  interactive = false,
  formatValue = (v) => `$${v.toFixed(2)}`,
}: PriceChartProps) {
  const { colors } = useTheme();
  const [activePoint, setActivePoint] = useState<TouchInfo | null>(null);
  const containerRef = useRef<View>(null);

  // NOTE: the `data.length < 2` early return lives AFTER all hooks below.
  // Returning here would skip the four useCallback hooks and violate the
  // Rules of Hooks if this component ever re-renders across the 2-point
  // boundary while mounted. The geometry consts compute harmless
  // NaN/empty values for short data — they're never rendered because the
  // guard returns null before the JSX.

  // Chart area dimensions (excluding labels). Clamped: callers derive
  // width from window/layout measurements that can be 0 before first
  // layout on web, going negative after padding subtraction — SVG
  // rejects negative width/height attributes.
  const safeHeight = Math.max(0, totalHeight);
  const safeWidth = Math.max(0, totalWidth);
  const chartHeight = Math.max(0, interactive ? safeHeight - LABEL_HEIGHT : safeHeight);
  const chartWidth = Math.max(0, interactive ? safeWidth - PRICE_LABEL_WIDTH : safeWidth);

  const prices = data.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice || 1;
  const pad = 4;

  const isPositive = prices[prices.length - 1] >= prices[0];
  const chartColor = colorOverride ?? (isPositive ? colors.success : colors.danger);

  const chartPoints = data.map((d, i) => ({
    x: pad + (i / (data.length - 1)) * (chartWidth - pad * 2),
    y: pad + (1 - (d.price - minPrice) / range) * (chartHeight - pad * 2),
    price: d.price,
    date: d.date,
  }));

  const polylinePoints = chartPoints.map((p) => `${p.x},${p.y}`).join(' ');
  const fillPoints = `${pad},${chartHeight} ${polylinePoints} ${chartWidth - pad},${chartHeight}`;

  // Month labels for X axis
  const monthLabels: { label: string; x: number }[] = [];
  if (interactive) {
    const seenMonths = new Set<string>();
    for (const p of chartPoints) {
      const d = new Date(p.date);
      const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
      const label = d.toLocaleDateString('en-US', { month: 'short' });
      if (!seenMonths.has(monthKey)) {
        seenMonths.add(monthKey);
        monthLabels.push({ label, x: p.x });
      }
    }
  }

  const findClosestPoint = useCallback(
    (touchX: number): TouchInfo | null => {
      if (chartPoints.length === 0) return null;
      let closest = chartPoints[0];
      let minDist = Math.abs(touchX - closest.x);
      for (const p of chartPoints) {
        const dist = Math.abs(touchX - p.x);
        if (dist < minDist) {
          minDist = dist;
          closest = p;
        }
      }
      return closest;
    },
    [chartPoints],
  );

  const getRelativeX = useCallback((evt: any): number => {
    const nativeEvt = evt.nativeEvent || evt;
    if (Platform.OS === 'web') {
      if (nativeEvt.offsetX !== undefined) return nativeEvt.offsetX;
      if (nativeEvt.clientX !== undefined) {
        // clientX is viewport-relative; the onLayout x is parent-relative
        // and drifts with scroll/nesting — use the live bounding rect.
        const node = containerRef.current as any;
        const rect = node?.getBoundingClientRect?.();
        return rect ? nativeEvt.clientX - rect.left : nativeEvt.clientX;
      }
    }
    return nativeEvt.locationX ?? 0;
  }, []);

  const handleInteraction = useCallback(
    (evt: any) => {
      if (!interactive) return;
      const x = getRelativeX(evt);
      const point = findClosestPoint(x);
      setActivePoint(point);
    },
    [interactive, findClosestPoint, getRelativeX],
  );

  const handleEnd = useCallback(() => {
    setActivePoint(null);
  }, []);

  // All hooks are declared above this point — safe to bail now.
  if (data.length < 2) return null;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const svgHeight = safeHeight;
  const svgWidth = safeWidth;

  const webProps = Platform.OS === 'web' && interactive
    ? {
        onMouseDown: (e: any) => { handleInteraction(e); },
        onMouseMove: (e: any) => { if (activePoint) handleInteraction(e); },
        onMouseUp: handleEnd,
        onMouseLeave: handleEnd,
        style: { height: svgHeight, width: svgWidth, cursor: 'crosshair' } as any,
      }
    : { style: { height: svgHeight, width: svgWidth } };

  return (
    <View>
      {/* Fixed-height tooltip area — always reserved so container doesn't shift */}
      {interactive && (
        <View
          style={{
            height: 28,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: spacing[1],
          }}
        >
          {activePoint ? (
            <>
              <Text variant="headingMd">{formatValue(activePoint.price)}</Text>
              <Text variant="caption" color={colors.onSurfaceMuted}>
                {formatDate(activePoint.date)}
              </Text>
            </>
          ) : (
            <Text variant="caption" color={colors.onSurfaceMuted}>
              Touch chart to see prices
            </Text>
          )}
        </View>
      )}

      <View
        ref={containerRef}
        onStartShouldSetResponder={() => interactive}
        onMoveShouldSetResponder={() => interactive}
        onResponderGrant={handleInteraction}
        onResponderMove={handleInteraction}
        onResponderRelease={handleEnd}
        onResponderTerminate={handleEnd}
        {...webProps}
      >
        <Svg height={svgHeight} width={svgWidth} style={{ pointerEvents: 'none' } as any}>
          <Defs>
            <LinearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={chartColor} stopOpacity={0.25} />
              <Stop offset="1" stopColor={chartColor} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {/* High/Low dashed lines */}
          {interactive && (
            <>
              <Line
                x1={0} y1={pad} x2={chartWidth} y2={pad}
                stroke={colors.onSurfaceMuted} strokeWidth={1} strokeDasharray="4,4" opacity={0.25}
              />
              <Line
                x1={0} y1={chartHeight - pad} x2={chartWidth} y2={chartHeight - pad}
                stroke={colors.onSurfaceMuted} strokeWidth={1} strokeDasharray="4,4" opacity={0.25}
              />
              {/* High label */}
              <SvgText
                x={chartWidth + 8} y={pad + 4}
                fill={colors.onSurfaceMuted} fontSize={10} fontFamily="SpaceGrotesk_400Regular"
              >
                {formatValue(maxPrice)}
              </SvgText>
              {/* Low label */}
              <SvgText
                x={chartWidth + 8} y={chartHeight - pad + 4}
                fill={colors.onSurfaceMuted} fontSize={10} fontFamily="SpaceGrotesk_400Regular"
              >
                {formatValue(minPrice)}
              </SvgText>
            </>
          )}

          {showGradient && (
            <Polygon points={fillPoints} fill="url(#chartGrad)" />
          )}
          <Polyline
            points={polylinePoints}
            fill="none"
            stroke={chartColor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Month labels on X axis */}
          {interactive && monthLabels.map((m) => (
            <SvgText
              key={m.label + m.x}
              x={m.x} y={chartHeight + LABEL_HEIGHT - 4}
              fill={colors.onSurfaceMuted} fontSize={10} fontFamily="SpaceGrotesk_400Regular"
            >
              {m.label}
            </SvgText>
          ))}

          {/* Crosshair + dot */}
          {interactive && activePoint && (
            <>
              <Line
                x1={activePoint.x} y1={0} x2={activePoint.x} y2={chartHeight}
                stroke={colors.onSurfaceMuted} strokeWidth={1} strokeDasharray="4,4" opacity={0.5}
              />
              <Line
                x1={0} y1={activePoint.y} x2={chartWidth} y2={activePoint.y}
                stroke={colors.onSurfaceMuted} strokeWidth={1} strokeDasharray="4,4" opacity={0.3}
              />
              <Circle
                cx={activePoint.x} cy={activePoint.y} r={5}
                fill={chartColor} stroke={colors.surface} strokeWidth={2}
              />
            </>
          )}
        </Svg>
      </View>
    </View>
  );
}

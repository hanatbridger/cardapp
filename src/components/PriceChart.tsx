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
}: PriceChartProps) {
  const { colors } = useTheme();
  const [activePoint, setActivePoint] = useState<TouchInfo | null>(null);
  const containerRef = useRef<View>(null);
  const layoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  if (data.length < 2) return null;

  // Chart area dimensions (excluding labels)
  const chartHeight = interactive ? totalHeight - LABEL_HEIGHT : totalHeight;
  const chartWidth = interactive ? totalWidth - PRICE_LABEL_WIDTH : totalWidth;

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
    if (Platform.OS === 'web') {
      const nativeEvt = evt.nativeEvent || evt;
      if (nativeEvt.offsetX !== undefined) return nativeEvt.offsetX;
      if (nativeEvt.clientX !== undefined) {
        return nativeEvt.clientX - layoutRef.current.x;
      }
    }
    const nativeEvt = evt.nativeEvent || evt;
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

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const svgHeight = interactive ? totalHeight : totalHeight;
  const svgWidth = totalWidth;

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
              <Text variant="headingMd">${activePoint.price.toFixed(2)}</Text>
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
        onLayout={(e) => { layoutRef.current = e.nativeEvent.layout; }}
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
                ${maxPrice.toFixed(0)}
              </SvgText>
              {/* Low label */}
              <SvgText
                x={chartWidth + 8} y={chartHeight - pad + 4}
                fill={colors.onSurfaceMuted} fontSize={10} fontFamily="SpaceGrotesk_400Regular"
              >
                ${minPrice.toFixed(0)}
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

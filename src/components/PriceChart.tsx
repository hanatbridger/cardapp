import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Platform } from 'react-native';
import Svg, { Polyline, Defs, LinearGradient, Stop, Polygon, Line, Circle, Text as SvgText } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
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
const PAD = 4; // inset so the stroke and dots aren't clipped by the viewport

// Crosshair primitives driven from the UI thread via animatedProps —
// scrubbing must not wait on the JS thread (see gesture setup below).
const ALine = Animated.createAnimatedComponent(Line);
const ACircle = Animated.createAnimatedComponent(Circle);

export const PriceChart = React.memo(function PriceChart({
  data,
  height: totalHeight = 200,
  width: totalWidth = 340,
  color: colorOverride,
  showGradient = true,
  interactive = false,
  formatValue = (v) => `$${v.toFixed(2)}`,
}: PriceChartProps) {
  const { colors } = useTheme();
  // Web keeps the mouse-driven state path; native mirrors the UI-thread
  // index into this state ONLY for the tooltip text.
  const [activePoint, setActivePoint] = useState<TouchInfo | null>(null);
  const containerRef = useRef<View>(null);

  // NOTE: the `data.length < 2` early return lives AFTER all hooks below.
  // Returning here would skip the memo/callback hooks and violate the
  // Rules of Hooks if this component ever re-renders across the 2-point
  // boundary while mounted. The geometry memo computes harmless
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

  // Geometry is memoized: the polyline must never rebuild during a scrub.
  const geometry = useMemo(() => {
    const prices = data.map((d) => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice || 1;
    const isPositive = prices[prices.length - 1] >= prices[0];

    const chartPoints = data.map((d, i) => ({
      x: PAD + (i / (data.length - 1)) * (chartWidth - PAD * 2),
      y: PAD + (1 - (d.price - minPrice) / range) * (chartHeight - PAD * 2),
      price: d.price,
      date: d.date,
    }));

    const polylinePoints = chartPoints.map((p) => `${p.x},${p.y}`).join(' ');
    const fillPoints = `${PAD},${chartHeight} ${polylinePoints} ${chartWidth - PAD},${chartHeight}`;

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

    // Plain arrays for the UI-thread snap worklet.
    const xs = chartPoints.map((p) => p.x);
    const ys = chartPoints.map((p) => p.y);

    return { minPrice, maxPrice, isPositive, chartPoints, polylinePoints, fillPoints, monthLabels, xs, ys };
  }, [data, chartWidth, chartHeight, interactive]);

  const { minPrice, maxPrice, chartPoints, polylinePoints, fillPoints, monthLabels, xs, ys } = geometry;
  const chartColor = colorOverride ?? (geometry.isPositive ? colors.success : colors.danger);

  /* ---------- Native scrub: entirely on the UI thread ----------
   * The old path was responder events → JS dispatch → setState → React
   * render + SVG commit per finger move, so the crosshair stuttered
   * whenever the JS thread was busy (query refetches, below-fold
   * mounts) — and the responder claimed the touch at press-down, so
   * vertical scrolls that started on the chart were eaten.
   *
   * Now: a Pan gesture that only activates on horizontal intent
   * (activeOffsetX ±8, failOffsetY ±14 hands vertical drags to the
   * ScrollView), snapping to a point index in a worklet and driving the
   * crosshair Lines/Circle through animatedProps. The JS thread is only
   * pinged when the snapped INDEX changes, to update the tooltip text.
   * A Tap shows the crosshair for stationary presses.
   */
  const activeIdx = useSharedValue(-1);
  const pointCount = chartPoints.length;
  const step = pointCount > 1 ? (chartWidth - PAD * 2) / (pointCount - 1) : 1;

  const [nativeIdx, setNativeIdx] = useState(-1);
  useAnimatedReaction(
    () => activeIdx.value,
    (idx, prev) => {
      if (idx !== prev) runOnJS(setNativeIdx)(idx);
    },
    [],
  );

  // New data/range: drop any stale crosshair.
  useEffect(() => {
    activeIdx.value = -1;
    setNativeIdx(-1);
    setActivePoint(null);
  }, [data, activeIdx]);

  const nativeGesture = useMemo(() => {
    if (!interactive || Platform.OS === 'web') return null;
    const pan = Gesture.Pan()
      .activeOffsetX([-8, 8])
      .failOffsetY([-14, 14])
      .onStart((e) => {
        'worklet';
        activeIdx.value = Math.min(pointCount - 1, Math.max(0, Math.round((e.x - PAD) / step)));
      })
      .onUpdate((e) => {
        'worklet';
        activeIdx.value = Math.min(pointCount - 1, Math.max(0, Math.round((e.x - PAD) / step)));
      })
      .onFinalize(() => {
        'worklet';
        activeIdx.value = -1;
      });
    const tap = Gesture.Tap()
      .maxDuration(300)
      .onEnd((e, success) => {
        'worklet';
        if (success) {
          activeIdx.value = Math.min(pointCount - 1, Math.max(0, Math.round((e.x - PAD) / step)));
        }
      });
    return Gesture.Exclusive(pan, tap);
    // step/pointCount fully derive from geometry inputs.
  }, [interactive, pointCount, step, activeIdx]);

  const vLineProps = useAnimatedProps(() => {
    const i = activeIdx.value;
    const x = i >= 0 && i < xs.length ? xs[i] : 0;
    return { x1: x, x2: x, opacity: i >= 0 ? 0.5 : 0 };
  }, [xs]);
  const hLineProps = useAnimatedProps(() => {
    const i = activeIdx.value;
    const y = i >= 0 && i < ys.length ? ys[i] : 0;
    return { y1: y, y2: y, opacity: i >= 0 ? 0.3 : 0 };
  }, [ys]);
  const dotProps = useAnimatedProps(() => {
    const i = activeIdx.value;
    const inRange = i >= 0 && i < xs.length;
    return {
      cx: inRange ? xs[i] : 0,
      cy: inRange ? ys[i] : 0,
      opacity: inRange ? 1 : 0,
    };
  }, [xs, ys]);

  /* ---------- Web scrub: unchanged mouse-driven state path ---------- */

  // Labels are keyed into the memo below as strings, not as `formatValue` —
  // the default formatter is a fresh closure on every render and would
  // invalidate the memo each time, while the text it produces does not.
  const mutedColor = colors.onSurfaceMuted;
  const highLabel = formatValue(maxPrice);
  const lowLabel = formatValue(minPrice);

  const staticLayers = useMemo(
    () => (
      <>
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
              x1={0} y1={PAD} x2={chartWidth} y2={PAD}
              stroke={mutedColor} strokeWidth={1} strokeDasharray="4,4" opacity={0.25}
            />
            <Line
              x1={0} y1={chartHeight - PAD} x2={chartWidth} y2={chartHeight - PAD}
              stroke={mutedColor} strokeWidth={1} strokeDasharray="4,4" opacity={0.25}
            />
            {/* High label */}
            <SvgText
              x={chartWidth + 8} y={PAD + 4}
              fill={mutedColor} fontSize={10} fontFamily="SpaceGrotesk_400Regular"
            >
              {highLabel}
            </SvgText>
            {/* Low label */}
            <SvgText
              x={chartWidth + 8} y={chartHeight - PAD + 4}
              fill={mutedColor} fontSize={10} fontFamily="SpaceGrotesk_400Regular"
            >
              {lowLabel}
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
            fill={mutedColor} fontSize={10} fontFamily="SpaceGrotesk_400Regular"
          >
            {m.label}
          </SvgText>
        ))}
      </>
    ),
    [
      chartColor,
      chartHeight,
      chartWidth,
      fillPoints,
      highLabel,
      interactive,
      lowLabel,
      monthLabels,
      mutedColor,
      polylinePoints,
      showGradient,
    ],
  );

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
    if (nativeEvt.offsetX !== undefined) return nativeEvt.offsetX;
    if (nativeEvt.clientX !== undefined) {
      // clientX is viewport-relative; the onLayout x is parent-relative
      // and drifts with scroll/nesting — use the live bounding rect.
      const node = containerRef.current as any;
      const rect = node?.getBoundingClientRect?.();
      return rect ? nativeEvt.clientX - rect.left : nativeEvt.clientX;
    }
    return nativeEvt.locationX ?? 0;
  }, []);

  const handleInteraction = useCallback(
    (evt: any) => {
      if (!interactive) return;
      const x = getRelativeX(evt);
      const point = findClosestPoint(x);
      // chartPoints are memoized, so an unchanged resolve is the same object
      // — returning `prev` lets React bail out of the whole re-render.
      setActivePoint((prev) => (prev === point || prev?.x === point?.x ? prev : point));
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

  const isWeb = Platform.OS === 'web';
  const webProps = isWeb && interactive
    ? {
        onMouseDown: (e: any) => { handleInteraction(e); },
        onMouseMove: (e: any) => { if (activePoint) handleInteraction(e); },
        onMouseUp: handleEnd,
        onMouseLeave: handleEnd,
        style: { height: svgHeight, width: svgWidth, cursor: 'crosshair' } as any,
      }
    : { style: { height: svgHeight, width: svgWidth } };

  // Tooltip source: web = mouse state; native = UI-thread index mirror.
  const shownPoint = isWeb
    ? activePoint
    : nativeIdx >= 0 && nativeIdx < chartPoints.length
      ? chartPoints[nativeIdx]
      : null;

  const chartBody = (
    <View ref={containerRef} {...webProps}>
      <Svg height={svgHeight} width={svgWidth} style={{ pointerEvents: 'none' } as any}>
        {staticLayers}

        {/* Crosshair + dot. Native: permanently mounted, UI-thread
            driven (opacity 0 at rest). Web: state-driven as before. */}
        {interactive && !isWeb && (
          <>
            <ALine
              animatedProps={vLineProps}
              y1={0} y2={chartHeight}
              stroke={colors.onSurfaceMuted} strokeWidth={1} strokeDasharray="4,4"
            />
            <ALine
              animatedProps={hLineProps}
              x1={0} x2={chartWidth}
              stroke={colors.onSurfaceMuted} strokeWidth={1} strokeDasharray="4,4"
            />
            <ACircle
              animatedProps={dotProps}
              r={5}
              fill={chartColor} stroke={colors.surface} strokeWidth={2}
            />
          </>
        )}
        {interactive && isWeb && activePoint && (
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
  );

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
          {shownPoint ? (
            <>
              <Text variant="headingMd">{formatValue(shownPoint.price)}</Text>
              <Text variant="caption" color={colors.onSurfaceMuted}>
                {formatDate(shownPoint.date)}
              </Text>
            </>
          ) : (
            <Text variant="caption" color={colors.onSurfaceMuted}>
              Touch chart to see prices
            </Text>
          )}
        </View>
      )}

      {nativeGesture ? (
        <GestureDetector gesture={nativeGesture}>{chartBody}</GestureDetector>
      ) : (
        chartBody
      )}
    </View>
  );
});

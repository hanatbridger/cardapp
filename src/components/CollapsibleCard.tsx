import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, StyleSheet, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { IconChevronDown, IconLock } from '@tabler/icons-react-native';
import { Text } from './Text';
import { Card } from './Card';
import { Button } from './Button';
import { useTheme } from '../theme/ThemeProvider';
import { spacing } from '../theme/tokens';
import { withAlpha } from '../utils/withAlpha';
import { MIN_TOUCH_TARGET } from '../constants/layout';

interface CollapsibleCardProps {
  /**
   * Omit when the content already opens with its own headline — the
   * grading verdict leads with "Grade it" and a letter grade, and a
   * second title above it would just repeat the section to itself. With
   * no title there is no header row, and the chevron moves into the CTA,
   * which is then the only control.
   */
  title?: string;
  children: React.ReactNode;
  /**
   * Controlled on purpose. The card detail screen runs an accordion —
   * opening one section closes the rest — so the open set belongs to the
   * parent and this component holds no expanded state of its own.
   */
  expanded: boolean;
  onToggle: () => void;
  /** How much of the content peeks through while collapsed. */
  collapsedHeight?: number;
  /** Premium gate: the preview still renders, but the card never opens. */
  locked?: boolean;
  /** CTA label while locked, e.g. "Upgrade to view AI predictions". */
  lockedLabel?: string;
  onUnlock?: () => void;
  /** Trailing header slot — eBay dynamics puts its "7d avg" chip here. */
  headerRight?: React.ReactNode;
}

/**
 * Same band as the sheets (BottomSheet ENTER_MS 260 / EXIT_MS 220), so
 * disclosure and overlays read as one motion system.
 */
const TOGGLE_MS = 220;
/** Ramp height of the fade over the bottom of the clipped preview. */
const FADE_HEIGHT = spacing[10];
/**
 * Overflow under this is not worth a control — the preview already shows
 * the whole section, and a "View more" that reveals four pixels lies.
 */
const OVERFLOW_SLOP = 8;

/**
 * The one collapsing-section primitive on the card detail screen. Header
 * row + content clipped to a peek height + a centred CTA underneath.
 *
 * Height and chevron both animate from a single shared `progress`, so the
 * whole transition runs on the UI thread — no setState per frame. Content
 * height is measured once by layout rather than assumed, which is what
 * lets a section that grows after its fetch lands (odds bars, listings)
 * open to its real size instead of a guess.
 */
export function CollapsibleCard({
  title,
  children,
  expanded,
  onToggle,
  collapsedHeight = 120,
  locked = false,
  lockedLabel,
  onUnlock,
  headerRight,
}: CollapsibleCardProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();

  // A locked card is closed whatever the parent's accordion says — the
  // gate must not depend on the parent remembering to keep it collapsed.
  const isOpen = expanded && !locked;

  const progress = useSharedValue(isOpen ? 1 : 0);
  // Natural content height, read inside the worklet so a re-measure
  // resizes an already-open section without a second animation.
  const fullHeight = useSharedValue(0);
  const [contentHeight, setContentHeight] = useState(0);
  const didMount = useRef(false);
  // Clipping is what makes the peek a peek, but it also cuts anything a
  // section deliberately bleeds past the card's padding — the grading
  // condition rail scrolls edge-to-edge on negative margins. So clip
  // while collapsed and for the length of the transition, then stop.
  const [clipping, setClipping] = useState(!isOpen);

  useEffect(() => {
    const to = isOpen ? 1 : 0;
    // Snap on the first run: a section mounted already open should not
    // animate itself open under the user. Reduce Motion snaps always.
    if (!didMount.current || reduceMotion) {
      didMount.current = true;
      progress.value = to;
      return;
    }
    progress.value = withTiming(to, { duration: TOGGLE_MS, easing: Easing.out(Easing.cubic) });
  }, [isOpen, reduceMotion, progress]);

  useEffect(() => {
    // Closing clips on the first frame; opening waits for the slide to
    // land, or the content would spill out of a box still growing.
    if (!isOpen) {
      setClipping(true);
      return;
    }
    if (reduceMotion || !didMount.current) {
      setClipping(false);
      return;
    }
    const t = setTimeout(() => setClipping(false), TOGGLE_MS);
    return () => clearTimeout(t);
  }, [isOpen, reduceMotion]);

  const onContentLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    fullHeight.value = h;
    // Guarded: layout fires on every re-measure, and sub-pixel jitter
    // would re-render the whole section for nothing.
    if (Math.abs(h - contentHeight) > 1) setContentHeight(h);
  };

  const clipStyle = useAnimatedStyle(() => {
    // Before the first layout only the collapsed box is known. The height
    // key stays present in every branch — dropping it would leave the
    // last committed height behind once the measurement lands.
    const full = fullHeight.value > collapsedHeight ? fullHeight.value : collapsedHeight;
    return { height: collapsedHeight + (full - collapsedHeight) * progress.value };
  });

  const fadeStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 180}deg` }],
  }));

  const overflows = contentHeight > collapsedHeight + OVERFLOW_SLOP;
  // A locked card always keeps its CTA: it is the only route to the
  // paywall, even when the teaser happens to fit inside the peek.
  const showToggle = locked || overflows;
  const ctaLabel = locked
    ? (lockedLabel ?? 'Upgrade to view')
    : isOpen
      ? 'View less'
      : 'View more';
  const onPress = locked ? onUnlock : onToggle;

  // Card's own non-elevated background, so the ramp ends on the surface
  // the content actually sits on. withAlpha(…, 0) rather than the
  // 'transparent' keyword: that keyword is rgba(0,0,0,0), and on both
  // native platforms the ramp would travel through grey to reach it.
  const fadeColors: readonly [string, string] = [withAlpha(colors.surface, 0), colors.surface];

  return (
    <Card>
      <View style={{ gap: spacing[4] }}>
        {title ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={title}
          accessibilityState={{ expanded: isOpen }}
          accessibilityHint={locked ? lockedLabel : undefined}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[2],
            // The label alone is ~20pt tall; the row carries the target.
            minHeight: MIN_TOUCH_TARGET,
          }}
        >
          <Text variant="labelLg" style={{ flex: 1 }}>
            {title}
          </Text>
          {headerRight}
          {/* A rotating chevron on a card that cannot open would promise
              an expand that never happens — locked shows a lock. */}
          {locked ? (
            <IconLock size={20} color={colors.onSurfaceMuted} strokeWidth={2} />
          ) : (
            <Animated.View style={chevronStyle}>
              <IconChevronDown size={20} color={colors.onSurfaceMuted} strokeWidth={2} />
            </Animated.View>
          )}
        </Pressable>
        ) : null}

        <Animated.View
          style={[
            clipStyle,
            {
              overflow: clipping ? 'hidden' : 'visible',
              // Collapsed, the preview is a still image: a row cut in half
              // must not take a tap. Same cut is why it is hidden from
              // VoiceOver below. (In style, for Fabric.)
              pointerEvents: isOpen ? 'auto' : 'none',
            },
          ]}
        >
          <View
            onLayout={onContentLayout}
            // Clipping is per-view, so a partly visible preview cannot be
            // partly exposed: collapsed, the whole region leaves the
            // accessibility tree and the CTA below is what remains
            // reachable. Reading content cut mid-sentence — plus the part
            // nobody can see — is worse than reading none of it.
            accessibilityElementsHidden={!isOpen}
            importantForAccessibility={isOpen ? 'auto' : 'no-hide-descendants'}
            // The measured child keeps its natural height inside the
            // clamped parent; letting it shrink would squash the content
            // instead of clipping it.
            style={{ flexShrink: 0 }}
          >
            {children}
          </View>

          {overflows && (
            <Animated.View
              style={[
                fadeStyle,
                {
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: FADE_HEIGHT,
                  pointerEvents: 'none',
                },
              ]}
            >
              <LinearGradient colors={fadeColors} style={StyleSheet.absoluteFill} />
            </Animated.View>
          )}
        </Animated.View>

        {showToggle && (
          // size lg clears the 44pt minimum on a text-only control, and
          // fullWidth centres the label across the card.
          <Button
            variant={locked ? 'tonal' : 'ghost'}
            size="lg"
            fullWidth
            icon={
              locked ? (
                <IconLock size={16} color={colors.onPrimaryContainer} />
              ) : title ? undefined : (
                // No header row to rotate a chevron in — it rides the CTA.
                <Animated.View style={chevronStyle}>
                  <IconChevronDown size={16} color={colors.onSurfaceVariant} strokeWidth={2} />
                </Animated.View>
              )
            }
            onPress={onPress}
            accessibilityState={{ expanded: isOpen }}
          >
            {ctaLabel}
          </Button>
        )}
      </View>
    </Card>
  );
}

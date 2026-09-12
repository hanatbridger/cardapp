import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Text } from './Text';
import { Card } from './Card';
import { ScrimCta, SCRIM_CTA_HEIGHT } from './ScrimCta';
import { useTheme } from '../theme/ThemeProvider';
import { spacing } from '../theme/tokens';

interface CollapsibleCardProps {
  /**
   * Omit when the content already opens with its own headline — the
   * grading verdict leads with "Grade it" and a letter grade, and a
   * second title above it would repeat the section to itself.
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
  /**
   * Premium gate: the real content still renders and still fades under
   * the scrim — that tease IS the pitch — but the card never opens.
   */
  locked?: boolean;
  /** CTA label while locked, e.g. "Upgrade to view AI predictions". */
  lockedLabel?: string;
  onUnlock?: () => void;
  /** Trailing header slot — eBay dynamics puts its "7d avg" chip here. */
  headerRight?: React.ReactNode;
  /**
   * Ramp height. The default suits a tall section; a short locked card
   * wants less, or the ramp reaches the top of the card and dims content
   * that is meant to be seen.
   */
  scrimHeight?: number;
  /**
   * Spoken equivalent of `headerRight`. The header is one button, so its
   * label replaces whatever the chips would have said — a "Sample data"
   * disclosure that only exists as a chip would go unannounced.
   */
  headerRightLabel?: string;
  /**
   * Names the section when there is no `title` — the collapsed content is
   * hidden from screen readers, so without this the card announces a
   * context-free "View more".
   */
  label?: string;
}

/**
 * Same band as the sheets (BottomSheet ENTER_MS 260 / EXIT_MS 220), so
 * disclosure and overlays read as one motion system.
 */
const TOGGLE_MS = 220;
/**
 * Overflow under this is not worth a control — the preview already shows
 * the whole section, and a "View more" that reveals four pixels lies.
 */
const OVERFLOW_SLOP = 8;

/**
 * The one collapsing-section primitive on the card detail screen: header
 * row, content clipped to a peek height, and a gradient scrim over the
 * cut whose bottom strip carries the only control — "View more", or
 * "Upgrade to view …" when the section is gated.
 *
 * The scrim bleeds over the card's padding so the fade reaches all four
 * edges, which is why the Card clips. Height, scrim opacity and the CTA
 * all animate from a single shared `progress`, so the whole transition
 * runs on the UI thread with no setState per frame. Content height is
 * measured by layout rather than assumed — a section that grows after
 * its fetch lands (odds bars, listings) opens to its real size.
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
  headerRightLabel,
  label,
  scrimHeight,
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
    if (reduceMotion) {
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

  const overflows = contentHeight > collapsedHeight + OVERFLOW_SLOP;
  // A locked card always keeps its CTA: it is the only route to the
  // paywall, even when the teaser happens to fit inside the peek.
  const showCta = locked || overflows;

  const clipStyle = useAnimatedStyle(() => {
    // Before the first layout only the collapsed box is known. The height
    // key stays present in every branch — dropping it would leave the
    // last committed height behind once the measurement lands.
    const full = fullHeight.value > collapsedHeight ? fullHeight.value : collapsedHeight;
    // Open, the content also has to clear the "View less" strip, which
    // sits over the card's own bottom padding.
    const openHeight = full + (showCta ? SCRIM_CTA_HEIGHT - spacing[6] : 0);
    return { height: collapsedHeight + (openHeight - collapsedHeight) * progress.value };
  });

  // Only the gradient fades — the CTA stays legible the whole way, since
  // it is the control.
  const scrimStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));

  const ctaLabel = locked
    ? (lockedLabel ?? 'Upgrade to view')
    : isOpen
      ? 'View less'
      : 'View more';
  const onPress = locked ? onUnlock : onToggle;
  // The header names the section when it exists; otherwise the caller's
  // `label` is the only identity the card has.
  const sectionName = title ? undefined : label;

  return (
    // Clips because the scrim bleeds over the padding to reach the card's
    // edges, and square scrim corners over a rounded card would show.
    <Card style={{ overflow: 'hidden' }}>
      <View style={{ gap: spacing[4] }}>
        {title ? (
          <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={headerRightLabel ? `${title}, ${headerRightLabel}` : title}
            // A locked card cannot open, so it announces no expanded
            // state — and its hint would only repeat the CTA's label.
            accessibilityState={locked ? undefined : { expanded: isOpen }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing[2],
            }}
            // The CTA strip below is the real control and clears the 44pt
            // minimum on its own; this row is a convenience target, so it
            // takes hitSlop instead of padding the card taller than drawn.
            hitSlop={spacing[2]}
          >
            <Text variant="headingSm" style={{ flex: 1 }} accessibilityRole="header">
              {title}
            </Text>
            {headerRight}
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
        </Animated.View>
      </View>

      {showCta && (
        <ScrimCta
          label={ctaLabel}
          onPress={onPress}
          background={colors.surfaceVariant}
          height={scrimHeight}
          gradientStyle={scrimStyle}
          // Nothing to announce as expandable on a card that cannot open.
          expanded={locked ? undefined : isOpen}
          // Names the section for the one case with no header to read:
          // the grading verdict, whose own headline is inside the hidden
          // region while collapsed.
          accessibilityLabel={sectionName ? `${ctaLabel}, ${sectionName}` : undefined}
        />
      )}
    </Card>
  );
}

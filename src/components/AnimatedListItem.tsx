import React, { useEffect, useState } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface AnimatedListItemProps {
  /** Kept for call-site stability; the stagger step is a per-batch mount sequence. */
  index?: number;
  children: React.ReactNode;
}

const STAGGER_WINDOW_MS = 400;
const STAGGER_STEP_MS = 50;
const MAX_STAGGER_STEPS = 8;

/**
 * Opened by the FIRST row of a batch to mount, whatever its index —
 * keying on index 0 silently dropped the stagger for any list that
 * starts at an offset (initialScrollIndex, inverted lists). Module-scoped
 * because rows share no list context; concurrent lists mount in the same
 * tick and so land in the same window.
 *
 * A batch begins after a mount-quiet gap, NOT whenever the window has
 * expired — re-opening on expiry made every scrolled-in row "in window"
 * and the paint-at-rest branch unreachable, so mid-list rows mounted
 * invisible and faded in up to 700ms late during fast scrolls. The
 * stagger step comes from a per-batch sequence counter rather than the
 * list index: the first row of an offset-start batch is step 0, not a
 * uniformly clamped 400ms.
 */
let windowOpenedAt = 0;
let lastMountAt = 0;
let batchSeq = 0;

function resolveEntry(): { animate: boolean; delay: number } {
  const now = Date.now();
  const isNewBatch = lastMountAt === 0 || now - lastMountAt > STAGGER_WINDOW_MS;
  lastMountAt = now;
  if (isNewBatch) {
    windowOpenedAt = now;
    batchSeq = 0;
  }
  // A virtualized row scrolled into view later must paint immediately —
  // staggering it leaves a blank hole where the row already is.
  if (now - windowOpenedAt > STAGGER_WINDOW_MS) return { animate: false, delay: 0 };
  return { animate: true, delay: Math.min(batchSeq++, MAX_STAGGER_STEPS) * STAGGER_STEP_MS };
}

/**
 * Wraps a list item with a subtle fade-in + slide-up animation.
 * Only the first painted batch staggers; later mounts render at rest.
 */
export const AnimatedListItem = React.memo(function AnimatedListItem({
  children,
}: AnimatedListItemProps) {
  // Frozen at mount: the entry decision must not flip on re-render.
  const [entry] = useState(() => resolveEntry());
  const opacity = useSharedValue(entry.animate ? 0 : 1);
  const translateY = useSharedValue(entry.animate ? 12 : 0);

  useEffect(() => {
    if (!entry.animate) return;
    const timer = setTimeout(() => {
      opacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
      translateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
    }, entry.delay);
    return () => clearTimeout(timer);
  }, [entry, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  // `collapsable={false}` keeps the Android native view hierarchy intact so
  // Pressable children inside `renderItem` reliably receive touch events
  // through the animated transform.
  return (
    <Animated.View style={animatedStyle} collapsable={false}>
      {children}
    </Animated.View>
  );
});

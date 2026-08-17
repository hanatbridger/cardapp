import React, { useEffect, useState } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface AnimatedListItemProps {
  index: number;
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
 */
let windowOpenedAt = 0;

function resolveEntry(index: number): { animate: boolean; delay: number } {
  const now = Date.now();
  if (windowOpenedAt === 0 || now - windowOpenedAt > STAGGER_WINDOW_MS) {
    windowOpenedAt = now;
  }
  const inWindow = now - windowOpenedAt <= STAGGER_WINDOW_MS;
  // A virtualized row scrolled into view later must paint immediately —
  // staggering it leaves a blank hole where the row already is.
  if (!inWindow) return { animate: false, delay: 0 };
  return { animate: true, delay: Math.min(index, MAX_STAGGER_STEPS) * STAGGER_STEP_MS };
}

/**
 * Wraps a list item with a subtle fade-in + slide-up animation.
 * Only the first painted batch staggers; later mounts render at rest.
 */
export const AnimatedListItem = React.memo(function AnimatedListItem({
  index,
  children,
}: AnimatedListItemProps) {
  // Frozen at mount: the entry decision must not flip if `index` shifts.
  const [entry] = useState(() => resolveEntry(index));
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

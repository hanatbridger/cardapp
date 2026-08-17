import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const HEADER_BAR_HEIGHT = 56;
const HIDE_THRESHOLD_PX = 80; // Don't hide until user has scrolled past this
const DELTA_THRESHOLD = 4;    // Ignore tiny deltas (jitter)
const ANIMATION_MS = 220;

/**
 * Scroll-aware header that hides on scroll-down and reappears on scroll-up.
 *
 * Wire up:
 *   const { scrollHandler, headerAnimatedStyle, headerHeight } = useCollapsingHeader();
 *   <CollapsingHeader title="..." animatedStyle={headerAnimatedStyle} />
 *   <Animated.ScrollView onScroll={scrollHandler} scrollEventThrottle={16}
 *     contentContainerStyle={{ paddingTop: headerHeight }}>...</Animated.ScrollView>
 *
 * Or with a list:
 *   <Animated.FlatList onScroll={scrollHandler} scrollEventThrottle={16}
 *     contentContainerStyle={{ paddingTop: headerHeight }} ... />
 */
export function useCollapsingHeader() {
  const insets = useSafeAreaInsets();
  const headerHeight = HEADER_BAR_HEIGHT + insets.top;

  const prevScrollY = useSharedValue(0);
  // 0 = fully visible, -(headerHeight + extraHideHeight) = fully hidden.
  // extraHideHeight lets callers slide additional UI (a sticky search bar,
  // filter row, etc.) up with the title bar. Consumers set it from onLayout.
  const headerOffset = useSharedValue(0);
  const extraHideHeight = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y;
      const delta = y - prevScrollY.value;
      const fullHide = -(headerHeight + extraHideHeight.value);

      if (y <= 0) {
        // Always show at top (handles bounce)
        headerOffset.value = withTiming(0, {
          duration: ANIMATION_MS,
          easing: Easing.out(Easing.ease),
        });
      } else if (delta > DELTA_THRESHOLD && y > HIDE_THRESHOLD_PX) {
        // Scrolling down past threshold — hide
        headerOffset.value = withTiming(fullHide, {
          duration: ANIMATION_MS,
          easing: Easing.out(Easing.ease),
        });
      } else if (delta < -DELTA_THRESHOLD) {
        // Scrolling up — show
        headerOffset.value = withTiming(0, {
          duration: ANIMATION_MS,
          easing: Easing.out(Easing.ease),
        });
      }

      prevScrollY.value = y;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerOffset.value }],
  }));

  return { scrollHandler, headerAnimatedStyle, headerHeight, extraHideHeight };
}

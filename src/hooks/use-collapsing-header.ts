import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withTiming,
  interpolate,
  Extrapolation,
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
  const scrollY = useSharedValue(0);
  // Direction the bar is currently animating toward — lets us start a
  // withTiming only on actual show/hide transitions instead of restarting
  // a fresh 220ms animation on every scroll frame in the same direction.
  const isHidden = useSharedValue(false);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y;
      scrollY.value = y;
      const delta = y - prevScrollY.value;
      // Bottom rubber-band: the overscroll snapback reads as an upward
      // delta and was un-hiding the bar at the very end of the list.
      const maxY = event.contentSize.height - event.layoutMeasurement.height;
      if (y > maxY && maxY > 0) {
        prevScrollY.value = y;
        return;
      }

      if (y <= 0 || delta < -DELTA_THRESHOLD) {
        // At top (handles bounce) or scrolling up — show
        if (isHidden.value) {
          isHidden.value = false;
          headerOffset.value = withTiming(0, {
            duration: ANIMATION_MS,
            easing: Easing.out(Easing.ease),
          });
        }
      } else if (delta > DELTA_THRESHOLD && y > HIDE_THRESHOLD_PX) {
        // Scrolling down past threshold — hide
        if (!isHidden.value) {
          isHidden.value = true;
          headerOffset.value = withTiming(-(headerHeight + extraHideHeight.value), {
            duration: ANIMATION_MS,
            easing: Easing.out(Easing.ease),
          });
        }
      }

      prevScrollY.value = y;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerOffset.value }],
  }));

  // Fades a backing surface in once content has scrolled under the header.
  // Screens whose header/sticky controls are transparent at rest (fill
  // 'none') put this on a scrim so rows never show through them mid-list.
  const scrimAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 32], [0, 1], Extrapolation.CLAMP),
  }));

  return { scrollHandler, headerAnimatedStyle, scrimAnimatedStyle, headerHeight, extraHideHeight };
}

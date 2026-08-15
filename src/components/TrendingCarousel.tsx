import React, { useCallback, useEffect, useRef } from 'react';
import { View, Pressable } from 'react-native';
import Animated, {
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { Text } from './Text';
import { PriceChange } from './PriceChange';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius } from '../theme/tokens';
import type { TrendingTile } from '../services/trending';

interface TrendingCarouselProps {
  items: TrendingTile[];
}

const ITEM_WIDTH = 200;
const ITEM_GAP = 8;
const SCROLL_SPEED = 0.5; // pixels per frame at 60fps

function TrendingCard({ cardId, name, setName, imageUrl, percentChange }: TrendingTile) {
  const { colors } = useTheme();

  return (
    <Pressable
      // Prefer direct routing to /card/{cardId} when the server was
      // able to resolve the Pokemon TCG cardId for this tile. When
      // resolution missed (rare card, API timeout), fall back to
      // dropping the user into Search with the card name pre-filled
      // so they can pick the canonical record manually.
      onPress={() =>
        cardId
          ? router.push(`/card/${cardId}`)
          : router.push(
              `/(tabs)/search?focus=1&from=home&q=${encodeURIComponent(name)}`,
            )
      }
      style={{
        width: ITEM_WIDTH,
        flexDirection: 'row',
        backgroundColor: colors.surfaceVariant,
        borderRadius: radius.xl,
        padding: spacing[2],
        gap: spacing[2],
        alignItems: 'center',
      }}
    >
      <Image
        source={{ uri: imageUrl }}
        style={{ width: 36, height: 50, borderRadius: radius.sm }}
        contentFit="cover"
      />
      <View style={{ flex: 1, gap: spacing['0.5'] }}>
        <Text variant="labelMd" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="caption" color={colors.onSurfaceMuted} numberOfLines={1}>
          {setName}
        </Text>
        <PriceChange percent={percentChange} size="sm" showIcon />
      </View>
    </Pressable>
  );
}

/**
 * Auto-scrolling trending ticker.
 *
 * Why this is built with Reanimated rather than setInterval:
 *
 * The previous implementation used `setInterval(animate, 16ms)` and
 * called `flatListRef.current?.scrollToOffset(...)` from the JS
 * thread on every tick. That JS-thread work competed with the
 * gesture recognizer of the outer FlatList that hosts this carousel
 * (the home-screen watchlist), and intermittently dropped touches
 * on watchlist rows — making just-added cards feel un-tappable.
 *
 * Two earlier attempts to band-aid the symptom (removing the row
 * fade-in animation; switching the row from Pressable to
 * TouchableOpacity) didn't fix it because the root cause is JS
 * thread contention, not the renderer choice.
 *
 * The fix below moves the entire animation to the UI thread:
 *   - useFrameCallback runs the tick as a worklet (UI thread)
 *   - scrollTo is a Reanimated worklet that scrolls natively
 *   - useSharedValue holds state across thread boundaries
 *
 * The JS thread is now never woken by this carousel's animation,
 * so it stays free to handle touches on sibling components.
 *
 * User scroll integration: useAnimatedScrollHandler captures the
 * native scroll offset into the shared value while the user is
 * dragging (isPaused = true), so resuming auto-scroll picks up
 * from wherever the user let go rather than snapping back.
 */
export function TrendingCarousel({ items }: TrendingCarouselProps) {
  const animatedRef = useAnimatedRef<Animated.FlatList<TrendingTile>>();
  const scrollOffset = useSharedValue(0);
  const isPaused = useSharedValue(false);
  const pauseTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Triple the data for seamless infinite loop. We start in the middle
  // set so the user can scroll either direction without immediately
  // hitting an edge.
  const tripleData = [...items, ...items, ...items];
  const singleSetWidth = items.length * (ITEM_WIDTH + ITEM_GAP);

  // Drive the auto-scroll on the UI thread. The frame callback runs
  // once per frame (~60fps) and schedules a native scrollTo with no
  // bridge call, so the JS thread stays idle.
  const frameCallback = useFrameCallback(() => {
    'worklet';
    // No items → singleSetWidth is 0 and the wrap condition below would
    // fire every frame; nothing to scroll anyway.
    if (singleSetWidth === 0) return;
    if (isPaused.value) return;
    scrollOffset.value += SCROLL_SPEED;
    // Wrap back to the first set when we've crossed into the third —
    // produces the seamless infinite-loop visual.
    if (scrollOffset.value >= singleSetWidth * 2) {
      scrollOffset.value -= singleSetWidth;
    }
    scrollTo(animatedRef, scrollOffset.value, 0, false);
  }, false); // start inactive — useFocusEffect activates it below

  // Initial position: start scrolled to the middle set so users can
  // swipe in either direction without immediately reaching an edge.
  useEffect(() => {
    scrollOffset.value = singleSetWidth;
  }, [singleSetWidth, scrollOffset]);

  // Clear the resume timer on unmount — otherwise it fires after the
  // component is gone and writes to the shared value.
  useEffect(() => {
    return () => {
      if (pauseTimeout.current) clearTimeout(pauseTimeout.current);
    };
  }, []);

  // Run the frame callback only while the home screen is focused.
  // When the user navigates to another tab or detail screen, we
  // pause; on return we resume. This also means the callback isn't
  // fighting other screens' work for UI-thread frames.
  useFocusEffect(
    useCallback(() => {
      frameCallback.setActive(true);
      return () => frameCallback.setActive(false);
    }, [frameCallback]),
  );

  // While the user is mid-drag we mirror their native scroll offset
  // into the shared value so resuming auto-scroll continues from
  // their position instead of snapping back.
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      'worklet';
      if (isPaused.value) {
        scrollOffset.value = e.contentOffset.x;
      }
    },
  });

  const handleTouchStart = () => {
    isPaused.value = true;
    if (pauseTimeout.current) clearTimeout(pauseTimeout.current);
  };

  const handleTouchEnd = () => {
    pauseTimeout.current = setTimeout(() => {
      isPaused.value = false;
    }, 3000);
  };

  return (
    <Animated.FlatList
      ref={animatedRef}
      data={tripleData}
      keyExtractor={(item, index) => `${item.productId}-${index}`}
      renderItem={({ item }) => <TrendingCard {...item} />}
      horizontal
      showsHorizontalScrollIndicator={false}
      removeClippedSubviews
      contentContainerStyle={{ gap: ITEM_GAP, paddingHorizontal: spacing[4] }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      getItemLayout={(_, index) => ({
        length: ITEM_WIDTH + ITEM_GAP,
        offset: (ITEM_WIDTH + ITEM_GAP) * index,
        index,
      })}
    />
  );
}

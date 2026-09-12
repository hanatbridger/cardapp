import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import Animated, {
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { Text } from './Text';
import { PriceChange } from './PriceChange';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius } from '../theme/tokens';
import {
  CARD_ID_RESOLVE_TIMEOUT_MS,
  cachedCardIdByLabel,
  resolveCardIdByLabel,
} from '../services/pokemon-tcg';
import type { TrendingTile } from '../services/trending';

interface TrendingCarouselProps {
  items: TrendingTile[];
}

const ITEM_WIDTH = 200;
const ITEM_GAP = 8;
const SCROLL_SPEED_PX_PER_S = 30; // steady drift, display-rate independent
// How long the drift stays out of the way after the user scrolls.
const RESUME_AFTER_MS = 3000;
// A scroll event within this of our last commanded offset is our own
// drift (0.5px per frame at 60fps), not the user.
const AUTO_TOLERANCE_PX = 3;
// Events already in flight when the rail teleports — the loop's wrap, or
// the initial jump to the middle set — are ignored for this long. A
// magnitude guard would have been wrong here: a fast fling moves further
// between two events than a wrap does, so it would have been swallowed.
const SETTLE_MS = 250;
// pokemontcg.io load-sheds in spells — the same label that fails now
// answers a few seconds later. One retry pass covers a spell.
const RESOLVE_RETRY_PASS_MS = 8000;

// Memoized: the carousel lives in the home screen's ListHeaderComponent,
// so every home re-render would otherwise re-render all 3x tiles.
const TrendingCard = React.memo(function TrendingCard({
  cardId,
  name,
  setName,
  imageUrl,
  percentChange,
}: TrendingTile) {
  const { colors } = useTheme();
  const [resolving, setResolving] = useState(false);
  // The timeout only wins the race — the underlying request keeps going,
  // so it can settle after the user has navigated away.
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  // A tile whose Pokemon TCG card id the server resolved opens card
  // detail directly. One it missed (rare card, upstream timeout) used to
  // dump the user into the search tab, which is not what tapping a card
  // means — so resolve it here instead, and only degrade to search if
  // that fails too.
  const open = async () => {
    // Already resolved — by the server, or by the rail's own background
    // pass below, which is what makes this instant in the common case.
    const known = cardId ?? cachedCardIdByLabel(name);
    if (known) {
      router.push(`/card/${known}`);
      return;
    }
    if (resolving) return;
    setResolving(true);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const id = await Promise.race([
      resolveCardIdByLabel(name),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), CARD_ID_RESOLVE_TIMEOUT_MS);
      }),
    ]);
    if (timer) clearTimeout(timer);
    if (!mounted.current) return;
    setResolving(false);
    router.push(
      id
        ? `/card/${id}`
        : `/(tabs)/search?focus=1&from=home&q=${encodeURIComponent(name)}`,
    );
  };

  return (
    <Pressable
      onPress={open}
      disabled={resolving}
      accessibilityState={{ busy: resolving }}
      style={{
        width: ITEM_WIDTH,
        flexDirection: 'row',
        backgroundColor: colors.surfaceVariant,
        borderRadius: radius.xl,
        padding: spacing[2],
        gap: spacing[2],
        alignItems: 'center',
        // The whole tile dims while it resolves — a tap with no feedback
        // reads as a dead tile.
        opacity: resolving ? 0.45 : 1,
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
        {resolving ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <PriceChange percent={percentChange} size="sm" showIcon />
        )}
      </View>
    </Pressable>
  );
});

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
 * User scroll integration: the drift used to yield only on onTouchStart,
 * a JS-thread prop that never fires for a mouse or trackpad — so the rail
 * could not be scrolled by hand at all on web, and on a phone the first
 * frames of a drag still fought the pointer while the pause hopped
 * threads. Instead the scroll handler compares each reported offset with
 * the one the frame callback last commanded: anything else moved it, so
 * the drift yields for RESUME_AFTER_MS and picks up from where the user
 * left it. Drag, fling and wheel all work, and the decision stays on the
 * UI thread.
 */
export const TrendingCarousel = React.memo(function TrendingCarousel({
  items,
}: TrendingCarouselProps) {
  const animatedRef = useAnimatedRef<Animated.FlatList<TrendingTile>>();
  const scrollOffset = useSharedValue(0);
  // Milliseconds of drift still owed to the user's last scroll.
  const pauseMsLeft = useSharedValue(0);
  // Last offset the drift itself asked for; -1 until it has run once.
  const lastAutoOffset = useSharedValue(-1);
  // Grace period after a wrap, while stale scroll events drain.
  const settleMs = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  // Resolve the card ids the server missed, in the background, so a tap
  // opens card detail immediately instead of waiting on a lookup that
  // pokemontcg.io can load-shed. Sequential and fire-and-forget: results
  // land in the resolver's session memo, which TrendingCard reads on tap.
  useEffect(() => {
    let cancelled = false;
    const labels = items.filter((i) => !i.cardId).map((i) => i.name);
    if (labels.length === 0) return;
    const pass = async () => {
      for (const label of labels) {
        if (cancelled) return;
        if (cachedCardIdByLabel(label)) continue;
        await resolveCardIdByLabel(label);
      }
    };
    (async () => {
      await pass();
      if (cancelled || labels.every((l) => cachedCardIdByLabel(l))) return;
      await new Promise((r) => setTimeout(r, RESOLVE_RETRY_PASS_MS));
      if (!cancelled) await pass();
    })();
    return () => {
      cancelled = true;
    };
  }, [items]);

  // Triple the data for seamless infinite loop. We start in the middle
  // set so the user can scroll either direction without immediately
  // hitting an edge.
  const tripleData = useMemo(() => [...items, ...items, ...items], [items]);
  const singleSetWidth = items.length * (ITEM_WIDTH + ITEM_GAP);

  // Drive the auto-scroll on the UI thread. The frame callback runs
  // once per frame (~60fps) and schedules a native scrollTo with no
  // bridge call, so the JS thread stays idle.
  const frameCallback = useFrameCallback((frameInfo) => {
    'worklet';
    // No items → singleSetWidth is 0 and the wrap condition below would
    // fire every frame; nothing to scroll anyway.
    if (singleSetWidth === 0) return;
    // Delta-time scaled: a fixed per-frame step ran 2x speed on 120Hz
    // ProMotion displays. Clamp the dt so a dropped-frame hitch doesn't
    // produce a visible jump when frames resume.
    const dtMs = Math.min(frameInfo.timeSincePreviousFrame ?? 16.7, 64);
    if (settleMs.value > 0) settleMs.value -= dtMs;
    // The user just scrolled: leave the rail exactly where they put it.
    if (pauseMsLeft.value > 0) {
      pauseMsLeft.value -= dtMs;
      return;
    }
    scrollOffset.value += (SCROLL_SPEED_PX_PER_S * dtMs) / 1000;
    // Wrap back to the first set when we've crossed into the third —
    // produces the seamless infinite-loop visual.
    if (scrollOffset.value >= singleSetWidth * 2) {
      scrollOffset.value -= singleSetWidth;
      settleMs.value = SETTLE_MS;
    }
    scrollTo(animatedRef, scrollOffset.value, 0, false);
    lastAutoOffset.value = scrollOffset.value;
  }, false); // start inactive — useFocusEffect activates it below

  // Initial position: start scrolled to the middle set so users can
  // swipe in either direction without immediately reaching an edge.
  useEffect(() => {
    scrollOffset.value = singleSetWidth;
    // The jump from 0 to the middle set is a teleport too: ignore the
    // scroll events it produces, or the rail reads its own move as the
    // user's and stops drifting before it ever starts.
    settleMs.value = SETTLE_MS;
  }, [singleSetWidth, scrollOffset, settleMs]);

  // Run the frame callback only while the home screen is focused.
  // When the user navigates to another tab or detail screen, we
  // pause; on return we resume. This also means the callback isn't
  // fighting other screens' work for UI-thread frames.
  //
  // Reduce Motion: a raw frame callback bypasses the ReduceMotion
  // machinery that withRepeat/withTiming honor automatically, so the
  // gate is explicit here. The rail stays manually scrollable.
  useFocusEffect(
    useCallback(() => {
      if (reduceMotion) return;
      frameCallback.setActive(true);
      return () => frameCallback.setActive(false);
    }, [frameCallback, reduceMotion]),
  );

  // Any offset we did not command came from the user — drag, fling or
  // wheel. Yield, and adopt their position so the drift resumes from
  // there instead of snapping back.
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      'worklet';
      if (settleMs.value > 0 || lastAutoOffset.value < 0) return;
      const x = e.contentOffset.x;
      if (Math.abs(x - lastAutoOffset.value) <= AUTO_TOLERANCE_PX) return;
      scrollOffset.value = x;
      lastAutoOffset.value = x;
      pauseMsLeft.value = RESUME_AFTER_MS;
    },
  });

  const renderItem = useCallback(
    ({ item }: { item: TrendingTile }) => <TrendingCard {...item} />,
    [],
  );

  return (
    <Animated.FlatList
      ref={animatedRef}
      data={tripleData}
      keyExtractor={(item, index) => `${item.productId}-${index}`}
      renderItem={renderItem}
      horizontal
      showsHorizontalScrollIndicator={false}
      removeClippedSubviews
      contentContainerStyle={{ gap: ITEM_GAP, paddingHorizontal: spacing[4] }}
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      getItemLayout={(_, index) => ({
        length: ITEM_WIDTH + ITEM_GAP,
        // Offsets are in content coordinates, which start before the
        // 16pt leading padding — omitting it made scrollToIndex and
        // clipping land one card-gap short.
        offset: spacing[4] + (ITEM_WIDTH + ITEM_GAP) * index,
        index,
      })}
    />
  );
});

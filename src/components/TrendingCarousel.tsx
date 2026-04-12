import React, { useRef, useEffect, useCallback } from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Text } from './Text';
import { PriceChange } from './PriceChange';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius } from '../theme/tokens';
import type { PokemonCard } from '../types/card';
import type { CardPrice } from '../types/card';

interface TrendingItem {
  card: PokemonCard;
  price?: CardPrice;
}

interface TrendingCarouselProps {
  items: TrendingItem[];
}

const ITEM_WIDTH = 140;
const ITEM_GAP = 8;
const SCROLL_SPEED = 0.5; // pixels per frame
const FRAME_INTERVAL = 16; // ~60fps

function TrendingCard({ card, price }: TrendingItem) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => router.push(`/card/${card.id}`)}
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
        source={{ uri: card.images.small }}
        style={{ width: 36, height: 50, borderRadius: radius.sm }}
        contentFit="cover"
      />
      <View style={{ flex: 1, gap: spacing['0.5'] }}>
        <Text variant="labelMd" numberOfLines={1}>
          {card.name}
        </Text>
        {price && (
          <PriceChange percent={price.percentChange} size="sm" showIcon={true} />
        )}
      </View>
    </Pressable>
  );
}

export function TrendingCarousel({ items }: TrendingCarouselProps) {
  const flatListRef = useRef<FlatList>(null);
  const scrollOffset = useRef(0);
  const isPaused = useRef(false);
  const pauseTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Triple the data for seamless infinite loop
  const tripleData = [...items, ...items, ...items];
  const singleSetWidth = items.length * (ITEM_WIDTH + ITEM_GAP);

  const animate = useCallback(() => {
    if (isPaused.current) return;

    scrollOffset.current += SCROLL_SPEED;

    // When we've scrolled past the second set, silently jump back to the first set
    if (scrollOffset.current >= singleSetWidth * 2) {
      scrollOffset.current -= singleSetWidth;
      flatListRef.current?.scrollToOffset({
        offset: scrollOffset.current,
        animated: false,
      });
    } else {
      flatListRef.current?.scrollToOffset({
        offset: scrollOffset.current,
        animated: false,
      });
    }
  }, [singleSetWidth]);

  useEffect(() => {
    // Start scrolled to the middle set so we can scroll both directions
    const initialOffset = singleSetWidth;
    scrollOffset.current = initialOffset;
    flatListRef.current?.scrollToOffset({ offset: initialOffset, animated: false });

    const interval = setInterval(animate, FRAME_INTERVAL);
    return () => clearInterval(interval);
  }, [animate, singleSetWidth]);

  const handleTouchStart = () => {
    isPaused.current = true;
    if (pauseTimeout.current) clearTimeout(pauseTimeout.current);
  };

  const handleTouchEnd = () => {
    pauseTimeout.current = setTimeout(() => {
      isPaused.current = false;
    }, 3000);
  };

  const handleScroll = (e: any) => {
    // Sync offset when user manually scrolls
    if (isPaused.current) {
      scrollOffset.current = e.nativeEvent.contentOffset.x;
    }
  };

  return (
    <FlatList
      ref={flatListRef}
      data={tripleData}
      keyExtractor={(item, index) => `${item.card.id}-${index}`}
      renderItem={({ item }) => <TrendingCard {...item} />}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: ITEM_GAP, paddingHorizontal: spacing[4] }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      getItemLayout={(_, index) => ({
        length: ITEM_WIDTH + ITEM_GAP,
        offset: (ITEM_WIDTH + ITEM_GAP) * index,
        index,
      })}
    />
  );
}

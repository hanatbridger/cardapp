import React, { useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Image, Dimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { useTheme } from '../../src/theme/ThemeProvider';
import {
  Text,
  ScreenBackground,
  AnimatedListItem,
  CollapsingHeader,
  withErrorBoundary,
} from '../../src/components';
import { spacing, radius } from '../../src/theme/tokens';
import { withAlpha } from '../../src/utils/withAlpha';
import { HORIZONTAL_PADDING } from '../../src/constants/layout';
import { useCardSearch, useSet, useCollapsingHeader } from '../../src/hooks';
import type { PokemonCard } from '../../src/types/card';

const RARITIES = [
  'Common',
  'Uncommon',
  'Rare',
  'Rare Holo',
  'Ultra Rare',
  'Illustration Rare',
  'Special Illustration Rare',
  'Hyper Rare',
];

// Pokemon card aspect ratio (width / height)
const CARD_ASPECT = 0.72;
const COLS = 2;
const COL_GAP = 12;
const SCREEN_W = Dimensions.get('window').width;
// Cap grid width on web/tablets so cards don't go absurdly large
const MAX_GRID_W = 560;
const GRID_W = Math.min(SCREEN_W, MAX_GRID_W);
const GRID_INSET = (SCREEN_W - GRID_W) / 2;
const CARD_W = (GRID_W - HORIZONTAL_PADDING * 2 - COL_GAP * (COLS - 1)) / COLS;

function SetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const [rarity, setRarity] = useState<string | undefined>(undefined);
  const { scrollHandler, headerAnimatedStyle, headerHeight } = useCollapsingHeader();

  const setQuery = useSet(id);
  const set = setQuery.data;

  const cardsQuery = useCardSearch('', { setId: id, rarity });
  const cards = cardsQuery.data?.cards ?? [];

  const handleCardPress = (card: PokemonCard) => {
    router.push(`/card/${card.id}`);
  };

  return (
    <ScreenBackground>
      <Stack.Screen options={{ headerShown: false }} />

      <CollapsingHeader
        title={set?.name ?? 'Set'}
        animatedStyle={headerAnimatedStyle}
      />

      <Animated.FlatList
        data={cards}
        keyExtractor={(item) => item.id}
        numColumns={COLS}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: headerHeight + spacing[3],
          paddingHorizontal: HORIZONTAL_PADDING + GRID_INSET,
          paddingBottom: spacing[24],
          rowGap: spacing[4],
        }}
        columnWrapperStyle={{ gap: COL_GAP }}
        ListHeaderComponent={
          <View style={{ gap: spacing[3], paddingBottom: spacing[3] }}>
            {/* Set header card */}
            {set && (
              <View
                style={{
                  backgroundColor: colors.surfaceVariant,
                  borderRadius: radius.lg,
                  padding: spacing[4],
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing[3],
                  borderWidth: 1,
                  borderColor: colors.outlineVariant,
                }}
              >
                {set.images.logo ? (
                  <Image
                    source={{ uri: set.images.logo }}
                    style={{ width: 80, height: 50, resizeMode: 'contain' }}
                  />
                ) : null}
                <View style={{ flex: 1, gap: spacing['0.5'] }}>
                  <Text variant="labelLg" numberOfLines={1}>{set.name}</Text>
                  <Text variant="caption" color={colors.onSurfaceMuted}>
                    {set.series} · {set.releaseDate}
                  </Text>
                  <Text variant="caption" color={colors.onSurfaceMuted}>
                    {set.printedTotal} cards
                  </Text>
                </View>
              </View>
            )}

            {/* Rarity filter */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing[2], paddingRight: spacing[4] }}
            >
              <Pressable
                onPress={() => setRarity(undefined)}
                style={{
                  paddingHorizontal: spacing[3],
                  paddingVertical: spacing[1],
                  borderRadius: radius.full,
                  backgroundColor: !rarity ? withAlpha(colors.primary, 0.15) : colors.surfaceVariant,
                  borderWidth: 1,
                  borderColor: !rarity ? withAlpha(colors.primary, 0.4) : colors.outlineVariant,
                }}
              >
                <Text variant="labelMd" color={!rarity ? colors.primary : colors.onSurfaceVariant}>
                  All
                </Text>
              </Pressable>
              {RARITIES.map((r) => {
                const active = rarity === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setRarity(active ? undefined : r)}
                    style={{
                      paddingHorizontal: spacing[3],
                      paddingVertical: spacing[1],
                      borderRadius: radius.full,
                      backgroundColor: active ? withAlpha(colors.primary, 0.15) : colors.surfaceVariant,
                      borderWidth: 1,
                      borderColor: active ? withAlpha(colors.primary, 0.4) : colors.outlineVariant,
                    }}
                  >
                    <Text variant="labelMd" color={active ? colors.primary : colors.onSurfaceVariant}>
                      {r}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {cardsQuery.data && (
              <Text variant="caption" color={colors.onSurfaceMuted}>
                {cardsQuery.data.totalCount} cards
              </Text>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={{ width: CARD_W }}>
            <AnimatedListItem index={index}>
              <Pressable
                onPress={() => handleCardPress(item)}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <ExpoImage
                  source={{ uri: item.images.small }}
                  style={{
                    width: CARD_W,
                    height: CARD_W / CARD_ASPECT,
                    borderRadius: radius.md,
                    backgroundColor: colors.surfaceVariant,
                  }}
                  contentFit="cover"
                />
                <View style={{ marginTop: spacing[2], gap: spacing['0.5'] }}>
                  <Text variant="labelSm" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text variant="caption" color={colors.onSurfaceMuted} numberOfLines={1}>
                    #{item.number}
                    {item.rarity ? ` · ${item.rarity}` : ''}
                  </Text>
                </View>
              </Pressable>
            </AnimatedListItem>
          </View>
        )}
        ListEmptyComponent={
          cardsQuery.isLoading ? (
            <View style={{ padding: spacing[8], alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text variant="bodySm" color={colors.onSurfaceMuted} style={{ marginTop: spacing[2] }}>
                Loading cards...
              </Text>
            </View>
          ) : (
            <View style={{ padding: spacing[8], alignItems: 'center' }}>
              <Text variant="bodySm" color={colors.onSurfaceMuted}>
                {cardsQuery.isError ? 'Failed to load cards' : 'No cards found'}
              </Text>
            </View>
          )
        }
        showsVerticalScrollIndicator={false}
      />
    </ScreenBackground>
  );
}

export default withErrorBoundary(SetDetailScreen, 'SetDetail');

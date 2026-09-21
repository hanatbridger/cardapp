import React, { useMemo, useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Image, useWindowDimensions } from 'react-native';
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
  chipGeometry,
} from '../../src/components';
import { spacing, radius } from '../../src/theme/tokens';
import { withAlpha } from '../../src/utils/withAlpha';
import { HORIZONTAL_PADDING } from '../../src/constants/layout';
import { useCardSearch, useSet, useGapSetCards, useCollapsingHeader } from '../../src/hooks';
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
// Cap grid width on web/tablets so cards don't go absurdly large
const MAX_GRID_W = 560;

function SetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const GRID_W = Math.min(screenWidth, MAX_GRID_W);
  const GRID_INSET = (screenWidth - GRID_W) / 2;
  const CARD_W = (GRID_W - HORIZONTAL_PADDING * 2 - COL_GAP * (COLS - 1)) / COLS;
  const [rarity, setRarity] = useState<string | undefined>(undefined);
  const { scrollHandler, headerAnimatedStyle, headerHeight } = useCollapsingHeader();

  // English gap sets ('entp-set-{setNameId}') come from TCGPlayer via
  // /api/en-gap; pokemontcg.io has no entry for them, so its hooks stay
  // disabled (no id, no filter).
  const isGap = Boolean(id?.startsWith('entp-set-'));

  const setQuery = useSet(isGap ? undefined : id);
  const cardsQuery = useCardSearch('', isGap ? {} : { setId: id, rarity });
  const gap = useGapSetCards(isGap ? id : undefined);
  const set = isGap ? gap.data?.set : setQuery.data;

  // Gap rarities are TCGPlayer's names (Pikachu Rare, Classic Collection),
  // so chips come from what the set actually holds, most common first,
  // and filter client-side.
  const gapRarities = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of gap.data?.cards ?? []) {
      if (c.rarity) counts.set(c.rarity, (counts.get(c.rarity) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([r]) => r);
  }, [gap.data]);
  const gapCards = useMemo(
    () => (gap.data?.cards ?? []).filter((c) => !rarity || c.rarity === rarity),
    [gap.data, rarity],
  );

  const cards = isGap ? gapCards : cardsQuery.data?.cards ?? [];
  // One rarity is no filter at all (Classic Collection): hide the row.
  const rarities = isGap ? (gapRarities.length >= 2 ? gapRarities : []) : RARITIES;
  // A partial gap set already says "Showing X of Y"; only add a count when
  // a rarity chip narrows it.
  const totalCount = isGap
    ? gap.data && (gap.data.complete || rarity) ? gapCards.length : undefined
    : cardsQuery.data?.totalCount;
  const listLoading = isGap ? gap.isLoading : cardsQuery.isLoading;
  const listError = isGap ? gap.isError : cardsQuery.isError;
  // The search hook keeps the previous filter's results on screen while
  // the next request is in flight, so after a rarity tap the grid and the
  // count still describe the old chip. Mark that pass as pending instead
  // of letting it read as the answer. Gap filtering is synchronous.
  const stale = isGap ? false : cardsQuery.isPlaceholderData;

  const handleCardPress = (card: PokemonCard) => {
    router.push(`/card/${card.id}`);
  };

  return (
    <ScreenBackground edges={[]}>
      <Stack.Screen options={{ headerShown: false }} />

      <CollapsingHeader
        title={set?.name ?? 'Set'}
        animatedStyle={headerAnimatedStyle}
      />

      <Animated.FlatList
        data={cards}
        // Cells are only re-rendered when `data` or `extraData` changes, and
        // the stale pass reuses the same rows.
        extraData={stale}
        keyExtractor={(item) => item.id}
        numColumns={COLS}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        // A full set is 200-250 image cells; stock virtualization mounts
        // far too many up front and keeps a huge window alive. Tighter
        // batching + clipping keeps the push animation and fast flicks
        // smooth. memory-disk caching stops the re-decode flash when
        // scrolling back up.
        initialNumToRender={9}
        maxToRenderPerBatch={9}
        windowSize={7}
        removeClippedSubviews
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
            {rarities.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: spacing[2], paddingRight: spacing[4] }}
              >
                <Pressable
                  onPress={() => setRarity(undefined)}
                  style={{
                    ...chipGeometry,
                    paddingVertical: spacing[1],
                    backgroundColor: !rarity ? withAlpha(colors.primary, 0.15) : colors.surfaceVariant,
                    borderWidth: 1,
                    borderColor: !rarity ? withAlpha(colors.primary, 0.4) : colors.outlineVariant,
                  }}
                >
                  <Text variant="labelMd" color={!rarity ? colors.primary : colors.onSurfaceVariant}>
                    All
                  </Text>
                </Pressable>
                {rarities.map((r) => {
                  const active = rarity === r;
                  return (
                    <Pressable
                      key={r}
                      onPress={() => setRarity(active ? undefined : r)}
                      style={{
                        ...chipGeometry,
                        paddingVertical: spacing[1],
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
            )}

            {stale ? (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={{ alignSelf: 'flex-start' }}
                accessibilityLabel="Loading cards"
              />
            ) : totalCount !== undefined ? (
              <Text variant="caption" color={colors.onSurfaceMuted}>
                {totalCount} cards
              </Text>
            ) : null}

            {/* A gap set loaded partially (a page failed or the set is over
                the page cap) says so rather than passing as the whole set. */}
            {isGap && gap.data && !gap.data.complete ? (
              <Text variant="caption" color={colors.onSurfaceMuted}>
                Showing {gap.data.cards.length} of {gap.data.totalCount} cards
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={{ width: CARD_W, opacity: stale ? 0.4 : 1 }}>
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
                  cachePolicy="memory-disk"
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
          listLoading ? (
            <View style={{ padding: spacing[8], alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text variant="bodySm" color={colors.onSurfaceMuted} style={{ marginTop: spacing[2] }}>
                Loading cards...
              </Text>
            </View>
          ) : (
            <View style={{ padding: spacing[8], alignItems: 'center' }}>
              <Text variant="bodySm" color={colors.onSurfaceMuted}>
                {listError
                  ? isGap
                    ? 'Could not load cards'
                    : 'Failed to load cards'
                  : 'No cards found'}
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

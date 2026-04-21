import React from 'react';
import { View, ActivityIndicator, Pressable, Dimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { IconPalette } from '@tabler/icons-react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import {
  Text,
  ScreenBackground,
  AnimatedListItem,
  CollapsingHeader,
  withErrorBoundary,
} from '../../src/components';
import { spacing, radius } from '../../src/theme/tokens';
import { HORIZONTAL_PADDING } from '../../src/constants/layout';
import { useArtistCards, useCollapsingHeader } from '../../src/hooks';
import type { PokemonCard } from '../../src/types/card';

// Mirror the set-detail grid proportions so the two screens feel like
// siblings (same card size, same gutters, same max grid width).
const CARD_ASPECT = 0.72;
const COLS = 2;
const COL_GAP = 12;
const SCREEN_W = Dimensions.get('window').width;
const MAX_GRID_W = 560;
const GRID_W = Math.min(SCREEN_W, MAX_GRID_W);
const GRID_INSET = (SCREEN_W - GRID_W) / 2;
const CARD_W = (GRID_W - HORIZONTAL_PADDING * 2 - COL_GAP * (COLS - 1)) / COLS;

function ArtistDetailScreen() {
  // The name comes URL-encoded from Explore (`/artist/${encodeURIComponent(name)}`).
  // Router decodes params automatically, but we still guard for undefined so
  // the query is disabled cleanly rather than hitting the API with "".
  const { name } = useLocalSearchParams<{ name: string }>();
  const { colors } = useTheme();
  const { scrollHandler, headerAnimatedStyle, headerHeight } = useCollapsingHeader();

  const cardsQuery = useArtistCards(name);
  const cards = cardsQuery.data?.cards ?? [];
  const totalCount = cardsQuery.data?.totalCount ?? 0;

  const handleCardPress = (card: PokemonCard) => {
    router.push(`/card/${card.id}`);
  };

  return (
    <ScreenBackground>
      <Stack.Screen options={{ headerShown: false }} />

      <CollapsingHeader
        title={name ?? 'Artist'}
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
            {/* Artist card — mirrors the set-header treatment so both
                detail screens feel structurally consistent. */}
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
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: radius.full,
                  backgroundColor: colors.primaryContainer,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconPalette size={26} color={colors.primary} />
              </View>
              <View style={{ flex: 1, gap: spacing['0.5'] }}>
                <Text variant="labelLg" numberOfLines={1}>{name}</Text>
                <Text variant="caption" color={colors.onSurfaceMuted}>
                  Illustrator
                </Text>
                {cardsQuery.data && (
                  <Text variant="caption" color={colors.onSurfaceMuted}>
                    {totalCount} {totalCount === 1 ? 'card' : 'cards'}
                  </Text>
                )}
              </View>
            </View>
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
                    {item.set.name} · #{item.number}
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

export default withErrorBoundary(ArtistDetailScreen, 'ArtistDetail');

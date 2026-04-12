import React, { useState } from 'react';
import { View, FlatList, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { IconX, IconTrendingUp, IconClock } from '@tabler/icons-react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import { Text, SearchBar, CardSearchResult, Badge, AIPicks, AnimatedListItem, ScreenBackground, withErrorBoundary } from '../../src/components';
import { spacing, radius } from '../../src/theme/tokens';
import { HORIZONTAL_PADDING } from '../../src/constants/layout';
import { useUserStore } from '../../src/stores';
import { useCardSearch } from '../../src/hooks';
import { MOCK_CARDS, TRENDING_SEARCHES, MOCK_PRICES } from '../../src/mocks';
import { CARD_SCORES } from '../../src/data/card-scores';
import { getValuation } from '../../src/services/price-prediction';
import type { PokemonCard } from '../../src/types/card';

function SearchScreen() {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const { recentSearches, addRecentSearch, removeRecentSearch } = useUserStore();

  // Real search via Pokemon TCG API
  const { data, isLoading, isError } = useCardSearch(query);
  const results = data?.cards ?? [];

  const hasQuery = query.length >= 2;

  const handleCardPress = (card: PokemonCard) => {
    addRecentSearch(card.name);
    router.push(`/card/${card.id}`);
  };

  const handleTrendingPress = (term: string) => {
    setQuery(term);
    addRecentSearch(term);
  };

  return (
    <ScreenBackground>
      <View style={{ paddingHorizontal: HORIZONTAL_PADDING, paddingTop: spacing[4], gap: spacing[3] }}>
        <Text variant="headingLg">Explore</Text>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search all Pokemon cards..."
          onSubmit={() => {
            if (query.length >= 2) addRecentSearch(query);
          }}
        />
      </View>

      {!hasQuery ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: spacing[24] }}
          showsVerticalScrollIndicator={false}
        >
          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <View style={{ paddingHorizontal: HORIZONTAL_PADDING, paddingTop: spacing[4], gap: spacing[2] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
                <IconClock size={14} color={colors.onSurfaceVariant} />
                <Text variant="labelLg" color={colors.onSurfaceVariant}>
                  Recent
                </Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
                {recentSearches.map((term) => (
                  <Pressable
                    key={term}
                    onPress={() => handleTrendingPress(term)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: colors.surfaceVariant,
                      borderRadius: radius.full,
                      paddingHorizontal: spacing[3],
                      paddingVertical: spacing[1],
                      gap: spacing[1],
                    }}
                  >
                    <Text variant="labelMd">{term}</Text>
                    <Pressable onPress={() => removeRecentSearch(term)} hitSlop={4}>
                      <IconX size={12} color={colors.onSurfaceMuted} />
                    </Pressable>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Trending searches */}
          <View style={{ paddingHorizontal: HORIZONTAL_PADDING, paddingTop: spacing[5], gap: spacing[2] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
              <IconTrendingUp size={14} color={colors.warning} />
              <Text variant="labelLg" color={colors.onSurfaceVariant}>
                Trending Searches
              </Text>
            </View>
            <View style={{ gap: spacing[1] }}>
              {TRENDING_SEARCHES.slice(0, 5).map((term, i) => (
                <Pressable
                  key={term}
                  onPress={() => handleTrendingPress(term)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: spacing[2],
                    gap: spacing[3],
                    borderBottomWidth: 1,
                    borderBottomColor: colors.outlineVariant,
                  }}
                >
                  <Text variant="caption" color={colors.onSurfaceMuted} style={{ width: 20 }}>
                    {i + 1}
                  </Text>
                  <Text variant="bodyMd">{term}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* AI Picks */}
          {(() => {
            const scored = CARD_SCORES
              .map((score) => {
                const mp = MOCK_PRICES[score.cardId]?.currentPrice;
                if (!mp) return null;
                const v = getValuation(score, mp);
                return { ...score, marketPrice: mp, predictedPrice: v.predictedPrice, gapPercent: v.gapPercent, label: v.label };
              })
              .filter(Boolean) as any[];

            const undervalued = scored.filter((c: any) => c.label === 'undervalued').sort((a: any, b: any) => b.gapPercent - a.gapPercent);
            const overvalued = scored.filter((c: any) => c.label === 'overvalued').sort((a: any, b: any) => a.gapPercent - b.gapPercent);

            return (
              <View style={{ paddingHorizontal: HORIZONTAL_PADDING, paddingTop: spacing[5], gap: spacing[5] }}>
                <AIPicks title="Undervalued Right Now" items={undervalued} type="undervalued" />
                <AIPicks title="Potentially Overvalued" items={overvalued} type="overvalued" />
              </View>
            );
          })()}
        </ScrollView>
      ) : (
        <>
          {isLoading && (
            <View style={{ padding: spacing[8], alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text variant="bodySm" color={colors.onSurfaceMuted} style={{ marginTop: spacing[2] }}>
                Searching...
              </Text>
            </View>
          )}
          {!isLoading && (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <AnimatedListItem index={index}>
                  <CardSearchResult
                    card={item}
                    onPress={handleCardPress}
                  />
                </AnimatedListItem>
              )}
              ListHeaderComponent={
                results.length > 0 ? (
                  <View style={{ paddingHorizontal: HORIZONTAL_PADDING, paddingVertical: spacing[2] }}>
                    <Text variant="caption" color={colors.onSurfaceMuted}>
                      {data?.totalCount ?? 0} results
                    </Text>
                  </View>
                ) : null
              }
              ListEmptyComponent={
                <View style={{ padding: spacing[8], alignItems: 'center' }}>
                  <Text variant="bodySm" color={colors.onSurfaceMuted}>
                    {isError ? 'Search failed — check your connection' : `No cards found for "${query}"`}
                  </Text>
                </View>
              }
              contentContainerStyle={{ paddingBottom: spacing[24] }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}
    </ScreenBackground>
  );
}

export default withErrorBoundary(SearchScreen, 'Search');

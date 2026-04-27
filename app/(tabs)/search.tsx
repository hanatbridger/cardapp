import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, Pressable, ScrollView, ActivityIndicator, Image, Keyboard } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInUp } from 'react-native-reanimated';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { IconX, IconTrendingUp, IconClock } from '@tabler/icons-react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import {
  Text,
  SearchBar,
  CardSearchResult,
  SealedSearchResult,
  AIPicks,
  AnimatedListItem,
  SegmentedControl,
  ScreenBackground,
  CollapsingHeader,
  withErrorBoundary,
} from '../../src/components';
import { spacing, radius } from '../../src/theme/tokens';
import { HORIZONTAL_PADDING } from '../../src/constants/layout';
import { useUserStore } from '../../src/stores';
import { useCardSearch, useSetSearch, useArtistSearch, useSealedSearch, useCollapsingHeader } from '../../src/hooks';
import { MOCK_PRICES, TRENDING_SEARCHES, TRENDING_ARTISTS } from '../../src/mocks';
import { CARD_SCORES } from '../../src/data/card-scores';
import { getValuation } from '../../src/services/price-prediction';
import type { PokemonCard } from '../../src/types/card';
import type { PokemonSet, ArtistResult } from '../../src/services/pokemon-tcg';
import type { SealedProduct } from '../../src/types/sealed';

type Mode = 'cards' | 'sets' | 'artists';

function SearchScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ focus?: string; from?: string; q?: string }>();
  const navigation = useNavigation();
  const [mode, setMode] = useState<Mode>('cards');
  const [query, setQuery] = useState('');
  const [stickyHeight, setStickyHeight] = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);
  // Where did this focused-search session come from? 'home' means the user
  // tapped Home's search icon and should land back on Home when they cancel.
  // 'tab' (default) means they're directly on the Explore tab, so Cancel
  // just dismisses the overlay in-place.
  const [searchOrigin, setSearchOrigin] = useState<'home' | 'tab'>('tab');
  const searchInputRef = useRef<TextInput>(null);
  const { recentSearches, addRecentSearch, removeRecentSearch } = useUserStore();
  const { scrollHandler, headerAnimatedStyle, headerHeight, extraHideHeight } = useCollapsingHeader();

  // Hide the floating bottom tab bar while the focused search overlay is
  // open. FloatingTabBar in app/(tabs)/_layout.tsx checks this option and
  // returns null when `display: 'none'` is set for the focused route.
  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: searchFocused ? { display: 'none' } : undefined,
    });
  }, [searchFocused, navigation]);

  // Deep-link from Home ▸ search icon. The `focus=1` param tells us to pop
  // the input into focus mode automatically so tapping the icon lands on a
  // ready-to-type Explore screen (X-style). Clear the param after handling
  // so navigating away and back doesn't re-trigger the overlay.
  useFocusEffect(
    React.useCallback(() => {
      if (params.focus === '1') {
        setSearchFocused(true);
        setSearchOrigin(params.from === 'home' ? 'home' : 'tab');
        // Optional `q` deep-link param — used by the Trending Now tile
        // tap to pre-fill the search box with the card name. Lets the
        // user pick the canonical record (Pokemon TCG cardId) since
        // the trending payload only carries TCGPlayer productIds.
        if (params.q) setQuery(params.q);
        // Small delay so the input is mounted before we call .focus().
        const t = setTimeout(() => searchInputRef.current?.focus(), 50);
        router.setParams({ focus: undefined, from: undefined, q: undefined });
        return () => clearTimeout(t);
      }
    }, [params.focus, params.from, params.q]),
  );

  // Card search
  const cardSearch = useCardSearch(mode === 'cards' ? query : '', {});
  const cardResults = cardSearch.data?.cards ?? [];

  // Sealed-product search — runs in parallel with the card search when the
  // Cards tab is active. Catalog lives client-side so this is essentially
  // free; we fold any hits into the Cards results list under a "Sealed
  // Products" section header so collectors find booster boxes / ETBs by
  // typing the set name into the same box they search singles with.
  const sealedSearch = useSealedSearch(mode === 'cards' ? query : '');
  const sealedResults = sealedSearch.data ?? [];

  // Set search (enabled always — shows recent sets on empty query)
  const setSearch = useSetSearch(mode === 'sets' ? query : '');
  const setResults = setSearch.data?.sets ?? [];

  // Artist search — requires ≥2 chars. Unlike sets, an empty query returns
  // nothing (there are thousands of artists and no meaningful default sort),
  // so the empty state prompts the user to type.
  const artistSearch = useArtistSearch(mode === 'artists' ? query : '');
  const artistResults = artistSearch.data?.artists ?? [];

  const hasQuery = query.length >= 2;
  const showCardResults = mode === 'cards' && hasQuery;
  const showSetResults = mode === 'sets';
  const showArtistResults = mode === 'artists' && hasQuery;

  const handleCardPress = (card: PokemonCard) => {
    addRecentSearch(card.name);
    router.push(`/card/${card.id}`);
  };

  const handleSealedPress = (product: SealedProduct) => {
    addRecentSearch(product.name);
    router.push(`/sealed/${product.id}`);
  };

  const handleSetPress = (set: PokemonSet) => {
    addRecentSearch(set.name);
    router.push(`/set/${set.id}`);
  };

  const handleArtistPress = (artist: ArtistResult) => {
    addRecentSearch(artist.name);
    router.push(`/artist/${encodeURIComponent(artist.name)}`);
  };

  const handleTrendingPress = (term: string) => {
    setQuery(term);
    addRecentSearch(term);
  };

  // X-style "Cancel" handler — blur the input, dismiss the keyboard, and
  // wipe the draft query so tapping back into search starts clean. If the
  // session was launched from Home (via the top-right search icon), pop
  // back to Home so the user lands where they started. Reset origin after
  // so a subsequent in-tab focus doesn't inherit 'home'.
  const cancelSearch = () => {
    Keyboard.dismiss();
    searchInputRef.current?.blur();
    setSearchFocused(false);
    setQuery('');
    if (searchOrigin === 'home') {
      router.replace('/(tabs)');
    }
    setSearchOrigin('tab');
  };

  const handleFocusedRecentPress = (term: string) => {
    setQuery(term);
    addRecentSearch(term);
    Keyboard.dismiss();
    searchInputRef.current?.blur();
    setSearchFocused(false);
  };

  return (
    <ScreenBackground>
      <CollapsingHeader
        hideBack
        title="Explore"
        animatedStyle={headerAnimatedStyle}
        // Headline matches Home and Notifications (variant="headingLg").
        titleVariant="headingLg"
        // No fill normally — the tab landing should blend with the scroll
        // content below. When the user taps into search mode, fill the
        // header solid so the overlay panel reads as a single opaque
        // surface (matching X's Explore focus behavior).
        fill={searchFocused ? 'solid' : 'none'}
      />
      {/* Sticky controls — ride up with the header so the whole top area
          disappears/reappears as one, like X's Explore tab. */}
      <Animated.View
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          setStickyHeight(h);
          extraHideHeight.value = h;
        }}
        style={[
          {
            position: 'absolute',
            top: headerHeight,
            left: 0,
            right: 0,
            zIndex: 5,
            // Solid surface in focus mode so the SegmentedControl + search
            // row sits on the same opaque panel as the header. Transparent
            // otherwise so the block blends into ScreenBackground.
            backgroundColor: searchFocused ? colors.surface : 'transparent',
            paddingHorizontal: HORIZONTAL_PADDING,
            paddingTop: spacing[2],
            paddingBottom: spacing[3],
            gap: spacing[3],
          },
          headerAnimatedStyle,
        ]}
      >
        {/* Mode toggle — always visible at the top, even while the search
            overlay is open, so the layout matches the default Explore view. */}
        <SegmentedControl
          options={['Cards', 'Sets', 'Artists']}
          selected={mode === 'cards' ? 0 : mode === 'sets' ? 1 : 2}
          onSelect={(i) => {
            setMode(i === 0 ? 'cards' : i === 1 ? 'sets' : 'artists');
            setQuery('');
          }}
        />

        {/* Search row — adds a Cancel button on the right when focused */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
          <View style={{ flex: 1 }}>
            <SearchBar
              ref={searchInputRef}
              value={query}
              onChangeText={setQuery}
              placeholder={
                mode === 'cards'
                  ? 'Search cards, booster boxes, ETBs...'
                  : mode === 'sets'
                    ? 'Search sets by name...'
                    : 'Search illustrators by name...'
              }
              onFocus={() => setSearchFocused(true)}
              onSubmit={() => {
                if (query.length >= 2) addRecentSearch(query);
                Keyboard.dismiss();
                searchInputRef.current?.blur();
                setSearchFocused(false);
              }}
            />
          </View>
          {searchFocused && (
            <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(120)}>
              <Pressable
                onPress={cancelSearch}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Cancel search"
                style={({ pressed }) => ({ paddingHorizontal: spacing[1], opacity: pressed ? 0.6 : 1 })}
              >
                <Text variant="labelLg" color={colors.primary}>Cancel</Text>
              </Pressable>
            </Animated.View>
          )}
        </View>

      </Animated.View>

      {/* Results */}
      {mode === 'cards' && !showCardResults ? (
        <CardsEmptyState
          onTrendingPress={handleTrendingPress}
          onScroll={scrollHandler}
          topInset={headerHeight + stickyHeight}
        />
      ) : showCardResults ? (
        <CardResults
          loading={cardSearch.isLoading}
          error={cardSearch.isError}
          results={cardResults}
          totalCount={cardSearch.data?.totalCount ?? 0}
          sealedResults={sealedResults}
          query={query}
          onCardPress={handleCardPress}
          onSealedPress={handleSealedPress}
          onScroll={scrollHandler}
          topInset={headerHeight + stickyHeight}
        />
      ) : null}

      {showSetResults && (
        <SetResults
          loading={setSearch.isLoading}
          sets={setResults}
          query={query}
          onSetPress={handleSetPress}
          onScroll={scrollHandler}
          topInset={headerHeight + stickyHeight}
        />
      )}

      {mode === 'artists' && (
        <ArtistResults
          loading={artistSearch.isLoading}
          error={artistSearch.isError}
          artists={artistResults}
          query={query}
          hasQuery={hasQuery}
          onArtistPress={handleArtistPress}
          onTrendingArtistPress={(name) => {
            addRecentSearch(name);
            router.push(`/artist/${encodeURIComponent(name)}`);
          }}
          onScroll={scrollHandler}
          topInset={headerHeight + stickyHeight}
        />
      )}

      {/* X-style search-focus overlay — slides DOWN from the top (enters
          via SlideInUp: element starts above the viewport and translates
          downward into place). Sits just below the sticky Cards/Sets +
          search row so those controls stay interactive on top.
          Intentionally no exit animation: when Cancel fires, the header
          fill flips from solid → none synchronously, and a sliding-up
          exit would briefly overlap the now-transparent header. Instant
          dismiss keeps the header swap clean. */}
      {searchFocused && (
        <Animated.View
          entering={SlideInUp.duration(220)}
          style={{
            position: 'absolute',
            top: headerHeight + stickyHeight,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 4,
            backgroundColor: colors.surface,
          }}
        >
          <SearchFocusOverlay
            mode={mode}
            recentSearches={recentSearches}
            onRecentPress={handleFocusedRecentPress}
            onRemoveRecent={removeRecentSearch}
          />
        </Animated.View>
      )}
    </ScreenBackground>
  );
}

/* ---------------- Sub-components ---------------- */

/**
 * Focused-search overlay — mimics the X (Twitter) Explore tab behavior:
 * tapping the SearchBar slides this panel down over the regular content,
 * surfacing just the user's recent terms. Picking one or tapping Cancel
 * collapses it back.
 */
function SearchFocusOverlay({
  mode,
  recentSearches,
  onRecentPress,
  onRemoveRecent,
}: {
  mode: Mode;
  recentSearches: string[];
  onRecentPress: (term: string) => void;
  onRemoveRecent: (term: string) => void;
}) {
  const { colors } = useTheme();

  if (recentSearches.length === 0) {
    return (
      <View style={{ padding: spacing[6], alignItems: 'center', gap: spacing[2] }}>
        <IconClock size={28} color={colors.onSurfaceMuted} />
        <Text variant="bodySm" color={colors.onSurfaceMuted}>
          No recent searches
        </Text>
        <Text variant="caption" color={colors.onSurfaceMuted} style={{ textAlign: 'center', maxWidth: 260 }}>
          Start typing to find Pokémon {mode === 'cards' ? 'cards' : mode === 'sets' ? 'sets' : 'illustrators'}.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: spacing[24] }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: HORIZONTAL_PADDING,
          paddingTop: spacing[4],
          paddingBottom: spacing[2],
          gap: spacing[1],
        }}
      >
        <IconClock size={14} color={colors.onSurfaceVariant} />
        <Text variant="labelLg" color={colors.onSurfaceVariant}>Recent searches</Text>
      </View>

      {recentSearches.map((term) => (
        <Pressable
          key={term}
          onPress={() => onRecentPress(term)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: HORIZONTAL_PADDING,
            paddingVertical: spacing[3],
            backgroundColor: pressed ? colors.surfaceVariant : 'transparent',
          })}
        >
          <Text variant="bodyMd" style={{ flex: 1 }}>{term}</Text>
          <Pressable
            onPress={() => onRemoveRecent(term)}
            hitSlop={8}
            accessibilityLabel={`Remove ${term} from recent searches`}
          >
            <IconX size={16} color={colors.onSurfaceMuted} />
          </Pressable>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function CardsEmptyState({
  onTrendingPress,
  onScroll,
  topInset = 0,
}: {
  onTrendingPress: (term: string) => void;
  onScroll?: any;
  topInset?: number;
}) {
  const { colors } = useTheme();

  return (
    <Animated.ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingTop: topInset, paddingBottom: spacing[24] }}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      <View style={{ paddingHorizontal: HORIZONTAL_PADDING, paddingTop: spacing[5], gap: spacing[2] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
          <IconTrendingUp size={14} color={colors.warning} />
          <Text variant="labelLg" color={colors.onSurfaceVariant}>Trending Searches</Text>
        </View>
        <View style={{ gap: spacing[1] }}>
          {TRENDING_SEARCHES.slice(0, 5).map((term, i) => (
            <Pressable
              key={term}
              onPress={() => onTrendingPress(term)}
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
    </Animated.ScrollView>
  );
}

/**
 * Discriminated-union row model for the unified Cards/Sealed feed.
 * Section-header rows carry the section label + the count so the header
 * stays in sync with its section without an extra lookup.
 */
type SearchFeedItem =
  | { kind: 'section'; id: string; label: string; count: number }
  | { kind: 'card'; id: string; card: PokemonCard }
  | { kind: 'sealed'; id: string; product: SealedProduct };

function CardResults({
  loading,
  error,
  results,
  totalCount,
  sealedResults,
  query,
  onCardPress,
  onSealedPress,
  onScroll,
  topInset = 0,
}: {
  loading: boolean;
  error: boolean;
  results: PokemonCard[];
  totalCount: number;
  sealedResults: SealedProduct[];
  query: string;
  onCardPress: (card: PokemonCard) => void;
  onSealedPress: (product: SealedProduct) => void;
  onScroll?: any;
  topInset?: number;
}) {
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={{ padding: spacing[8], alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text variant="bodySm" color={colors.onSurfaceMuted} style={{ marginTop: spacing[2] }}>
          Searching...
        </Text>
      </View>
    );
  }

  // Build the unified feed: Cards section first (primary intent), then
  // Sealed Products below. Either section is omitted when it has no hits
  // so the UI doesn't render a header over an empty region.
  const feed: SearchFeedItem[] = [];
  if (results.length > 0) {
    feed.push({ kind: 'section', id: 'sec-cards', label: 'Cards', count: totalCount });
    results.forEach((c) => feed.push({ kind: 'card', id: `card-${c.id}`, card: c }));
  }
  if (sealedResults.length > 0) {
    feed.push({ kind: 'section', id: 'sec-sealed', label: 'Sealed Products', count: sealedResults.length });
    sealedResults.forEach((p) => feed.push({ kind: 'sealed', id: `sealed-${p.id}`, product: p }));
  }

  return (
    <Animated.FlatList
      data={feed}
      keyExtractor={(item: SearchFeedItem) => item.id}
      renderItem={({ item, index }: { item: SearchFeedItem; index: number }) => {
        if (item.kind === 'section') {
          return (
            <View
              style={{
                paddingHorizontal: HORIZONTAL_PADDING,
                paddingTop: index === 0 ? spacing[2] : spacing[4],
                paddingBottom: spacing[1],
                flexDirection: 'row',
                alignItems: 'baseline',
                justifyContent: 'space-between',
              }}
            >
              <Text variant="overline" color={colors.onSurfaceVariant}>{item.label.toUpperCase()}</Text>
              <Text variant="caption" color={colors.onSurfaceMuted}>
                {item.count} {item.count === 1 ? 'result' : 'results'}
              </Text>
            </View>
          );
        }
        if (item.kind === 'card') {
          return (
            <AnimatedListItem index={index}>
              <CardSearchResult card={item.card} onPress={onCardPress} />
            </AnimatedListItem>
          );
        }
        return (
          <AnimatedListItem index={index}>
            <SealedSearchResult product={item.product} onPress={onSealedPress} />
          </AnimatedListItem>
        );
      }}
      ListEmptyComponent={
        <View style={{ padding: spacing[8], alignItems: 'center' }}>
          <Text variant="bodySm" color={colors.onSurfaceMuted}>
            {error ? 'Search failed — check your connection' : `No results found${query ? ` for "${query}"` : ''}`}
          </Text>
        </View>
      }
      contentContainerStyle={{ paddingTop: topInset, paddingBottom: spacing[24] }}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
    />
  );
}

function SetResults({
  loading,
  sets,
  query,
  onSetPress,
  onScroll,
  topInset = 0,
}: {
  loading: boolean;
  sets: PokemonSet[];
  query: string;
  onSetPress: (set: PokemonSet) => void;
  onScroll?: any;
  topInset?: number;
}) {
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={{ padding: spacing[8], alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text variant="bodySm" color={colors.onSurfaceMuted} style={{ marginTop: spacing[2] }}>
          Loading sets...
        </Text>
      </View>
    );
  }

  return (
    <Animated.FlatList
      data={sets}
      keyExtractor={(item: PokemonSet) => item.id}
      contentContainerStyle={{
        paddingHorizontal: HORIZONTAL_PADDING,
        paddingTop: topInset + spacing[2],
        paddingBottom: spacing[24],
        gap: spacing[2],
      }}
      onScroll={onScroll}
      scrollEventThrottle={16}
      renderItem={({ item, index }: { item: PokemonSet; index: number }) => (
        <AnimatedListItem index={index}>
          <Pressable
            onPress={() => onSetPress(item)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.surfaceVariant,
              borderRadius: radius.lg,
              padding: spacing[3],
              gap: spacing[3],
              borderWidth: 1,
              borderColor: colors.outlineVariant,
            }}
          >
            {item.images.logo ? (
              <Image
                source={{ uri: item.images.logo }}
                style={{ width: 64, height: 40, resizeMode: 'contain' }}
              />
            ) : (
              <View
                style={{
                  width: 64,
                  height: 40,
                  borderRadius: radius.sm,
                  backgroundColor: colors.outline,
                }}
              />
            )}
            <View style={{ flex: 1, gap: spacing['0.5'] }}>
              <Text variant="labelLg" numberOfLines={1}>{item.name}</Text>
              <Text variant="caption" color={colors.onSurfaceMuted}>
                {item.series} · {item.releaseDate} · {item.printedTotal} cards
              </Text>
            </View>
          </Pressable>
        </AnimatedListItem>
      )}
      ListEmptyComponent={
        <View style={{ padding: spacing[8], alignItems: 'center' }}>
          <Text variant="bodySm" color={colors.onSurfaceMuted}>
            {query ? `No sets found for "${query}"` : 'No sets available'}
          </Text>
        </View>
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

/**
 * Artists mode — groups card search results by illustrator. Each row shows
 * the artist's name, how many cards surfaced, and three sample thumbnails
 * so the user can recognize their style before tapping through.
 *
 * Unlike Cards and Sets, the pre-query state is a typing prompt rather
 * than a default list — the Pokémon TCG API has thousands of credited
 * illustrators and no popularity signal to rank them by, so a default
 * list would be arbitrary.
 */
function ArtistResults({
  loading,
  error,
  artists,
  query,
  hasQuery,
  onArtistPress,
  onTrendingArtistPress,
  onScroll,
  topInset = 0,
}: {
  loading: boolean;
  error: boolean;
  artists: ArtistResult[];
  query: string;
  hasQuery: boolean;
  onArtistPress: (artist: ArtistResult) => void;
  onTrendingArtistPress: (name: string) => void;
  onScroll?: any;
  topInset?: number;
}) {
  const { colors } = useTheme();

  // Pre-query state: mirror CardsEmptyState's Trending Searches pattern so
  // Artists feels like a first-class sibling tab. The numbered list with
  // hairline dividers is the same component-for-component treatment — this
  // is a marketing surface, not a search result, so the order is fixed.
  if (!hasQuery) {
    return (
      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: topInset, paddingBottom: spacing[24] }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: HORIZONTAL_PADDING, paddingTop: spacing[5], gap: spacing[2] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
            <IconTrendingUp size={14} color={colors.warning} />
            <Text variant="labelLg" color={colors.onSurfaceVariant}>Trending Illustrators</Text>
          </View>
          <View style={{ gap: spacing[1] }}>
            {TRENDING_ARTISTS.map((name, i) => (
              <Pressable
                key={name}
                onPress={() => onTrendingArtistPress(name)}
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
                <Text variant="bodyMd">{name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Animated.ScrollView>
    );
  }

  if (loading) {
    return (
      <View style={{ padding: spacing[8], alignItems: 'center', paddingTop: topInset + spacing[8] }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text variant="bodySm" color={colors.onSurfaceMuted} style={{ marginTop: spacing[2] }}>
          Searching...
        </Text>
      </View>
    );
  }

  return (
    <Animated.FlatList
      data={artists}
      keyExtractor={(item: ArtistResult) => item.name}
      contentContainerStyle={{
        paddingHorizontal: HORIZONTAL_PADDING,
        paddingTop: topInset + spacing[2],
        paddingBottom: spacing[24],
        gap: spacing[2],
      }}
      onScroll={onScroll}
      scrollEventThrottle={16}
      renderItem={({ item, index }: { item: ArtistResult; index: number }) => (
        <AnimatedListItem index={index}>
          <Pressable
            onPress={() => onArtistPress(item)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.surfaceVariant,
              borderRadius: radius.lg,
              padding: spacing[3],
              gap: spacing[3],
              borderWidth: 1,
              borderColor: colors.outlineVariant,
            }}
          >
            {/* Stacked sample thumbnails — up to 3, overlapping, to hint
                at the artist's style at a glance. */}
            <View style={{ flexDirection: 'row', width: 68, height: 48 }}>
              {item.samples.slice(0, 3).map((card, i) => (
                <View
                  key={card.id}
                  style={{
                    position: 'absolute',
                    left: i * 14,
                    width: 34,
                    height: 48,
                    borderRadius: radius.sm,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: colors.outlineVariant,
                    backgroundColor: colors.outline,
                  }}
                >
                  {card.images.small ? (
                    <Image
                      source={{ uri: card.images.small }}
                      style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                    />
                  ) : null}
                </View>
              ))}
            </View>
            <View style={{ flex: 1, gap: spacing['0.5'] }}>
              <Text variant="labelLg" numberOfLines={1}>{item.name}</Text>
              <Text variant="caption" color={colors.onSurfaceMuted}>
                {item.cardCount} {item.cardCount === 1 ? 'card' : 'cards'}
              </Text>
            </View>
          </Pressable>
        </AnimatedListItem>
      )}
      ListEmptyComponent={
        <View style={{ padding: spacing[8], alignItems: 'center' }}>
          <Text variant="bodySm" color={colors.onSurfaceMuted}>
            {error ? 'Search failed — check your connection' : `No illustrators found for "${query}"`}
          </Text>
        </View>
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

export default withErrorBoundary(SearchScreen, 'Search');

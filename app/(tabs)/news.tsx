import React, { useState, useMemo, useCallback } from 'react';
import { View, FlatList, RefreshControl, ScrollView } from 'react-native';
import { RectButton } from 'react-native-gesture-handler';
import { IconNews } from '@tabler/icons-react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import {
  Text,
  NewsCard,
  EmptyState,
  ScreenBackground,
  Skeleton,
  withErrorBoundary,
} from '../../src/components';
import { spacing, radius } from '../../src/theme/tokens';
import { withAlpha } from '../../src/utils/withAlpha';
import { HORIZONTAL_PADDING } from '../../src/constants/layout';
import { useNews } from '../../src/hooks/use-news';

// Source filter chips. 'all' first, then the four sources the feed
// aggregates. Keys must match NewsArticle.sourceKey from /api/news.
const FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pokebeach', label: 'PokeBeach' },
  { key: 'psa', label: 'PSA' },
  { key: 'beckett', label: 'Beckett' },
  { key: 'tag', label: 'TAG' },
];

function NewsScreen() {
  const { colors } = useTheme();
  const { data: articles, isLoading, isError, refetch, isRefetching } = useNews(60);
  const [filter, setFilter] = useState('all');

  const visible = useMemo(() => {
    const list = articles ?? [];
    return filter === 'all' ? list : list.filter((a) => a.sourceKey === filter);
  }, [articles, filter]);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <ScreenBackground>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: HORIZONTAL_PADDING,
          paddingTop: spacing[4],
          paddingBottom: spacing[3],
        }}
      >
        <Text variant="headingLg">News</Text>
        <Text variant="bodySm" color={colors.onSurfaceVariant} style={{ marginTop: spacing[1] }}>
          Latest from PokeBeach, PSA, Beckett & TAG.
        </Text>
      </View>

      {/* Source filter chips */}
      <View style={{ height: 40, marginBottom: spacing[2] }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: HORIZONTAL_PADDING,
            gap: spacing[2],
            alignItems: 'center',
          }}
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <RectButton
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={{
                  paddingHorizontal: spacing[3],
                  height: 32,
                  borderRadius: radius.full,
                  justifyContent: 'center',
                  backgroundColor: active
                    ? withAlpha(colors.primary, 0.15)
                    : colors.surfaceVariant,
                }}
              >
                <Text
                  variant="labelMd"
                  color={active ? colors.primary : colors.onSurfaceVariant}
                >
                  {f.label}
                </Text>
              </RectButton>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item, i) => `${item.url}-${i}`}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: HORIZONTAL_PADDING, marginBottom: spacing[2] }}>
            <NewsCard article={item} />
          </View>
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ paddingHorizontal: HORIZONTAL_PADDING, gap: spacing[2] }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} width="100%" height={92} borderRadius={radius.lg} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon={<IconNews size={40} color={colors.onSurfaceMuted} />}
              title={isError ? 'Couldn’t load news' : 'No articles yet'}
              description={
                isError
                  ? 'Pull to refresh, or check back in a bit.'
                  : 'Fresh card-news headlines will appear here.'
              }
              actionLabel={isError ? 'Retry' : undefined}
              onAction={isError ? () => refetch() : undefined}
            />
          )
        }
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={{ paddingBottom: spacing[24] }}
      />
    </ScreenBackground>
  );
}

export default withErrorBoundary(NewsScreen, 'News');

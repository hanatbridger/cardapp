import React, { useCallback, useEffect } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
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
import { HORIZONTAL_PADDING } from '../../src/constants/layout';
import { useNews } from '../../src/hooks/use-news';
import { requestNotificationPermission } from '../../src/services/notifications';
import { registerForPushNotifications } from '../../src/services/push';
import { useUserStore } from '../../src/stores/user-store';

// Prompt at most once per app session.
let newsPermissionAsked = false;

function NewsScreen() {
  const { colors } = useTheme();
  const { data: articles, isLoading, isError, refetch, isRefetching } = useNews(50);
  const notificationsEnabled = useUserStore((s) => s.preferences.notificationsEnabled);

  // Ask for OS notification permission in context the first time the user
  // opens News, so the daily news ping can actually show. Previously
  // permission was only requested when setting a price alert, so anyone
  // who never set one was never prompted and every local notification was
  // silently dropped. requestNotificationPermission no-ops if already
  // granted/denied, so this prompts at most once.
  useEffect(() => {
    if (newsPermissionAsked || !notificationsEnabled) return;
    newsPermissionAsked = true;
    requestNotificationPermission().then((granted) => {
      // Register for server push the moment permission is granted, so the
      // device gets the token this session (not only on next launch).
      if (granted) registerForPushNotifications();
    });
  }, [notificationsEnabled]);

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
          Latest Pokémon card news, updated through the day.
        </Text>
      </View>

      <FlatList
        data={articles ?? []}
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
                <Skeleton key={i} width="100%" height={108} borderRadius={radius.lg} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon={<IconNews size={40} color={colors.onSurfaceMuted} />}
              title={isError ? 'Couldn’t load news' : 'No articles yet'}
              description={
                isError
                  ? 'Pull to refresh, or check back in a bit.'
                  : 'Fresh Pokémon card-news headlines will appear here.'
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

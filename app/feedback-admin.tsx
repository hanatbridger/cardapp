import React, { useCallback, useEffect, useState } from 'react';
import { View, Image, Pressable, Platform, Share, RefreshControl } from 'react-native';
import Animated from 'react-native-reanimated';
import { IconClipboardCopy } from '@tabler/icons-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import {
  Text,
  Card,
  Badge,
  CollapsingHeader,
  EmptyState,
  Skeleton,
  withErrorBoundary,
} from '../src/components';
import { spacing, radius } from '../src/theme/tokens';
import { withAlpha } from '../src/utils/withAlpha';
import { HORIZONTAL_PADDING } from '../src/constants/layout';
import { formatRelativeTime } from '../src/utils/format';
import { useUserStore } from '../src/stores';
import { useCollapsingHeader } from '../src/hooks';
import {
  isSuperadminEmail,
  listFeedback,
  setStatus,
  screenshotUrl,
  taskPrompt,
  STATUSES,
  STATUS_LABEL,
  KIND_LABEL,
  type FeedbackRow,
  type FeedbackStatus,
} from '../src/services/admin-feedback';

function StatusPills({
  current,
  onPick,
}: {
  current: FeedbackStatus;
  onPick: (s: FeedbackStatus) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1.5] }}>
      {STATUSES.map((s) => {
        const active = s === current;
        return (
          <Pressable
            key={s}
            onPress={() => onPick(s)}
            accessibilityRole="button"
            accessibilityLabel={`Mark ${STATUS_LABEL[s]}`}
            style={{
              paddingHorizontal: spacing[2],
              paddingVertical: spacing[1],
              borderRadius: radius.full,
              backgroundColor: active ? withAlpha(colors.primary, 0.18) : 'transparent',
              borderWidth: 1,
              borderColor: active ? colors.primary : colors.outline,
            }}
          >
            <Text variant="labelSm" color={active ? colors.primary : colors.onSurfaceVariant}>
              {STATUS_LABEL[s]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Shot({ stored }: { stored: string | null }) {
  const { colors } = useTheme();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    screenshotUrl(stored).then((u) => live && setUrl(u));
    return () => {
      live = false;
    };
  }, [stored]);
  if (!stored) return null;
  if (!url) return <Skeleton width={96} height={96} borderRadius={radius.md} />;
  return (
    <Image
      source={{ uri: url }}
      style={{ width: 96, height: 96, borderRadius: radius.md, backgroundColor: colors.surfaceVariant }}
      resizeMode="cover"
    />
  );
}

function FeedbackAdminScreen() {
  const { colors } = useTheme();
  const email = useUserStore((s) => s.profile.email);
  const { scrollHandler, headerAnimatedStyle, headerHeight } = useCollapsingHeader();
  const [rows, setRows] = useState<FeedbackRow[] | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      setRows(await listFeedback());
    } catch (e: any) {
      setError(e?.message ?? 'Could not load feedback');
      setRows([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (row: FeedbackRow, s: FeedbackStatus) => {
    setRows((prev) => prev?.map((r) => (r.id === row.id ? { ...r, status: s } : r)) ?? prev);
    try {
      await setStatus(row.id, s);
    } catch {
      load();
    }
  };

  const copyPrompt = async (row: FeedbackRow) => {
    const prompt = taskPrompt(row);
    if (Platform.OS === 'web') {
      try {
        await (globalThis as any).navigator?.clipboard?.writeText(prompt);
        (globalThis as any).window?.alert?.('Task prompt copied.');
      } catch {}
      return;
    }
    try {
      await Share.share({ message: prompt });
    } catch {}
  };

  // Client-side gate only decides whether this screen renders; RLS is
  // the real lock — a non-admin session would see zero rows anyway.
  if (!isSuperadminEmail(email)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, justifyContent: 'center' }}>
        <EmptyState title="Not available" description="This area is restricted." />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <CollapsingHeader title="Feedback Inbox" backFallback="/profile" animatedStyle={headerAnimatedStyle} />
      <Animated.FlatList
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        data={rows ?? []}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{
          paddingTop: headerHeight + spacing[4],
          paddingBottom: spacing[12],
          paddingHorizontal: HORIZONTAL_PADDING,
          gap: spacing[3],
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={colors.onSurfaceMuted}
          />
        }
        ListEmptyComponent={
          rows === null ? (
            <View style={{ gap: spacing[3] }}>
              <Skeleton width="100%" height={120} borderRadius={radius.xl} />
              <Skeleton width="100%" height={120} borderRadius={radius.xl} />
            </View>
          ) : (
            <EmptyState
              title={error ? 'Could not load' : 'Inbox zero'}
              description={error || 'No feedback yet.'}
            />
          )
        }
        renderItem={({ item }: { item: FeedbackRow }) => (
          <Card>
            <View style={{ gap: spacing[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                <Badge variant={item.kind === 'bug' ? 'danger' : item.kind === 'idea' ? 'info' : 'neutral'}>
                  {KIND_LABEL[item.kind]}
                </Badge>
                <Text variant="labelMd" color={colors.onSurfaceVariant} style={{ flex: 1 }} numberOfLines={1}>
                  {item.username}
                </Text>
                <Text variant="caption" color={colors.onSurfaceMuted}>
                  {formatRelativeTime(new Date(item.created_at).getTime(), Date.now())}
                </Text>
              </View>
              <Text variant="bodySm" style={{ lineHeight: 20 }}>{item.message}</Text>
              <Shot stored={item.screenshot} />
              {item.app_version ? (
                <Text variant="caption" color={colors.onSurfaceMuted}>
                  v{item.app_version}
                  {item.context?.platform ? ` · ${item.context.platform}` : ''}
                  {item.context?.route ? ` · ${item.context.route}` : ''}
                </Text>
              ) : null}
              <StatusPills current={item.status} onPick={(s) => changeStatus(item, s)} />
              <Pressable
                onPress={() => copyPrompt(item)}
                accessibilityRole="button"
                accessibilityLabel="Copy task prompt"
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] }}
              >
                <IconClipboardCopy size={16} color={colors.primary} />
                <Text variant="labelMd" color={colors.primary}>Copy task prompt</Text>
              </Pressable>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

export default withErrorBoundary(FeedbackAdminScreen, 'Feedback Inbox');

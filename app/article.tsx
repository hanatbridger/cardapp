import React from 'react';
import { View, ScrollView, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { IconChevronLeft, IconExternalLink, IconNews } from '@tabler/icons-react-native';
import { RectButton } from 'react-native-gesture-handler';
import { useTheme } from '../src/theme/ThemeProvider';
import { Text, Button, withErrorBoundary } from '../src/components';
import { spacing, radius } from '../src/theme/tokens';
import { withAlpha } from '../src/utils/withAlpha';
import { HORIZONTAL_PADDING } from '../src/constants/layout';
import { formatRelativeTime } from '../src/utils/format';

/**
 * In-app reader for a news headline. Shows the cover image, source,
 * date, title, and a plain-text summary, then links out to the full
 * article on the source site. Article data arrives via route params
 * (set in NewsCard) so the screen is self-contained.
 */
function ArticleScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    title?: string;
    url?: string;
    image?: string;
    summary?: string;
    source?: string;
    date?: string;
  }>();

  const title = params.title ?? 'Article';
  const url = params.url ?? '';
  const image = params.image ?? '';
  const summary = params.summary ?? '';
  const source = params.source ?? 'Source';
  const when = params.date ? Date.parse(params.date) : NaN;
  const relative = Number.isNaN(when) ? '' : formatRelativeTime(when);

  const openSource = () => {
    if (!url) return;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.open(url, '_blank');
      return;
    }
    Linking.openURL(url).catch(() => {});
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>
      {/* Back */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: HORIZONTAL_PADDING,
          paddingVertical: spacing[2],
          gap: spacing[2],
        }}
      >
        <RectButton
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.full,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityLabel="Back"
          accessibilityRole="button"
        >
          <IconChevronLeft size={24} color={colors.onSurface} />
        </RectButton>
        <Text variant="labelLg" color={colors.onSurfaceVariant}>News</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing[16] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover */}
        {image ? (
          <Image
            source={{ uri: image }}
            style={{ width: '100%', height: 220 }}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View
            style={{
              width: '100%',
              height: 160,
              backgroundColor: withAlpha(colors.primary, 0.12),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconNews size={48} color={colors.primary} strokeWidth={1.5} />
          </View>
        )}

        <View style={{ paddingHorizontal: HORIZONTAL_PADDING, paddingTop: spacing[5], gap: spacing[3] }}>
          {/* Source + time */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
            <View
              style={{
                backgroundColor: withAlpha(colors.primary, 0.12),
                borderRadius: radius.sm,
                paddingHorizontal: spacing[2],
                paddingVertical: spacing['0.5'],
              }}
            >
              <Text variant="labelSm" color={colors.primary}>{source}</Text>
            </View>
            {relative ? (
              <Text variant="caption" color={colors.onSurfaceMuted}>{relative}</Text>
            ) : null}
          </View>

          {/* Title */}
          <Text variant="headingMd">{title}</Text>

          {/* Summary */}
          {summary ? (
            <Text variant="bodyMd" color={colors.onSurfaceVariant} style={{ lineHeight: 24 }}>
              {summary}
            </Text>
          ) : (
            <Text variant="bodyMd" color={colors.onSurfaceMuted} style={{ lineHeight: 24 }}>
              Open the full article on {source} to read more.
            </Text>
          )}

          {/* Read full article */}
          <Button
            onPress={openSource}
            icon={<IconExternalLink size={18} color={colors.onPrimary} />}
            fullWidth
            size="lg"
            disabled={!url}
            style={{ marginTop: spacing[2] }}
          >
            {`Read full article on ${source}`}
          </Button>

          <Text variant="caption" color={colors.onSurfaceMuted} style={{ textAlign: 'center' }}>
            Opens {source} in your browser.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default withErrorBoundary(ArticleScreen, 'Article');

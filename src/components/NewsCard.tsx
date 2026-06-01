import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { RectButton } from 'react-native-gesture-handler';
import { IconNews, IconChevronRight } from '@tabler/icons-react-native';
import { Text } from './Text';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius } from '../theme/tokens';
import { withAlpha } from '../utils/withAlpha';
import { formatRelativeTime } from '../utils/format';
import type { NewsArticle } from '../services/news';

/**
 * A single news headline row with a cover thumbnail. Tapping opens an
 * in-app article detail screen (summary + read-full-article link-out),
 * not the browser directly.
 *
 * RectButton (gesture-handler), not RN Pressable: consistent with the
 * tap-reliability fixes — plain Pressable has intermittent press
 * issues on Fabric, gesture-handler's touchables fire reliably.
 */
const THUMB = 84;

export const NewsCard = React.memo(function NewsCard({ article }: { article: NewsArticle }) {
  const { colors } = useTheme();

  const openDetail = () => {
    // Pass the article fields as route params so the detail screen is
    // self-contained — survives web refresh / deep-link without
    // depending on the list query still being cached.
    router.push({
      pathname: '/article',
      params: {
        title: article.title,
        url: article.url,
        image: article.imageUrl,
        summary: article.summary,
        source: article.sourceLabel,
        date: article.publishedAt,
      },
    });
  };

  const when = article.publishedAt ? Date.parse(article.publishedAt) : NaN;
  const relative = Number.isNaN(when) ? '' : formatRelativeTime(when);

  return (
    <RectButton
      onPress={openDetail}
      accessibilityRole="button"
      accessibilityLabel={`${article.title}. From ${article.sourceLabel}.`}
      style={{
        flexDirection: 'row',
        gap: spacing[3],
        padding: spacing[3],
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.outline,
        alignItems: 'center',
      }}
    >
      {/* Cover thumbnail — real article image, or a branded fallback
          tile when the feed didn't supply one. */}
      {article.imageUrl ? (
        <Image
          source={{ uri: article.imageUrl }}
          style={{ width: THUMB, height: THUMB, borderRadius: radius.md }}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View
          style={{
            width: THUMB,
            height: THUMB,
            borderRadius: radius.md,
            backgroundColor: withAlpha(colors.primary, 0.12),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconNews size={28} color={colors.primary} strokeWidth={1.75} />
        </View>
      )}

      <View style={{ flex: 1, gap: spacing[1] }}>
        {/* Source + time */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
          <Text variant="labelSm" color={colors.primary}>
            {article.sourceLabel}
          </Text>
          {relative ? (
            <>
              <Text variant="caption" color={colors.onSurfaceMuted}>·</Text>
              <Text variant="caption" color={colors.onSurfaceMuted}>
                {relative}
              </Text>
            </>
          ) : null}
        </View>

        {/* Headline */}
        <Text variant="bodyMd" numberOfLines={3}>
          {article.title}
        </Text>
      </View>

      <IconChevronRight size={16} color={colors.onSurfaceMuted} />
    </RectButton>
  );
});

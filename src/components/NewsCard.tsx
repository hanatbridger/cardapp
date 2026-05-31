import React from 'react';
import { View, Platform, Linking } from 'react-native';
import { RectButton } from 'react-native-gesture-handler';
import { IconExternalLink } from '@tabler/icons-react-native';
import { Text } from './Text';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius } from '../theme/tokens';
import { withAlpha } from '../utils/withAlpha';
import { formatRelativeTime } from '../utils/format';
import type { NewsArticle } from '../services/news';

/**
 * A single news headline row. Tapping opens the article in the
 * system browser (Google News redirect → original source).
 *
 * RectButton (gesture-handler), not RN Pressable: consistent with the
 * tap-reliability fixes elsewhere — plain Pressable has intermittent
 * press-recognition issues on Fabric / the new architecture, while
 * gesture-handler's touchables fire reliably.
 */
export const NewsCard = React.memo(function NewsCard({ article }: { article: NewsArticle }) {
  const { colors } = useTheme();

  const open = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.open(article.url, '_blank');
      return;
    }
    Linking.openURL(article.url).catch(() => {});
  };

  const when = article.publishedAt ? Date.parse(article.publishedAt) : NaN;
  const relative = Number.isNaN(when) ? '' : formatRelativeTime(when);

  return (
    <RectButton
      onPress={open}
      accessibilityRole="link"
      accessibilityLabel={`${article.title}. From ${article.sourceLabel}. Opens in browser.`}
      style={{
        flexDirection: 'row',
        gap: spacing[3],
        padding: spacing[4],
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.outline,
        alignItems: 'flex-start',
      }}
    >
      <View style={{ flex: 1, gap: spacing[2] }}>
        {/* Source badge + time */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
          <View
            style={{
              backgroundColor: withAlpha(colors.primary, 0.12),
              borderRadius: radius.sm,
              paddingHorizontal: spacing[2],
              paddingVertical: spacing['0.5'],
            }}
          >
            <Text variant="labelSm" color={colors.primary}>
              {article.sourceLabel}
            </Text>
          </View>
          {relative ? (
            <Text variant="caption" color={colors.onSurfaceMuted}>
              {relative}
            </Text>
          ) : null}
        </View>

        {/* Headline */}
        <Text variant="bodyMd" numberOfLines={3}>
          {article.title}
        </Text>
      </View>

      <IconExternalLink
        size={18}
        color={colors.onSurfaceMuted}
        style={{ marginTop: spacing[1] }}
      />
    </RectButton>
  );
});

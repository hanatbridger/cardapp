import React from 'react';
import { View, Platform } from 'react-native';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { IconNews, IconExternalLink } from '@tabler/icons-react-native';
import { Touchable } from './Touchable';
import { Text } from './Text';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius } from '../theme/tokens';
import { withAlpha } from '../utils/withAlpha';
import { formatRelativeTime } from '../utils/format';
import type { NewsArticle } from '../services/news';

/**
 * A single news headline row with a cover thumbnail. Tapping opens the
 * real article in an in-app browser (SFSafariViewController on iOS /
 * Custom Tabs on Android via expo-web-browser) so the user reads the
 * full article without leaving the app. On web it opens a new tab.
 *
 * The in-app browser runs full WebKit, so even the PokeBeach links
 * (Google News redirect URLs) resolve to the real article — the JS
 * redirect completes inside the browser.
 *
 * RectButton (gesture-handler), not RN Pressable: consistent with the
 * tap-reliability fixes — plain Pressable has intermittent press
 * issues on Fabric, gesture-handler's touchables fire reliably.
 */
const THUMB = 84;

export const NewsCard = React.memo(function NewsCard({ article }: { article: NewsArticle }) {
  const { colors } = useTheme();

  const open = () => {
    if (!article.url) return;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.open(article.url, '_blank');
      return;
    }
    // In-app browser, themed to match the app chrome.
    WebBrowser.openBrowserAsync(article.url, {
      toolbarColor: colors.surface,
      controlsColor: colors.primary,
      enableBarCollapsing: true,
    }).catch(() => {});
  };

  const when = article.publishedAt ? Date.parse(article.publishedAt) : NaN;
  const relative = Number.isNaN(when) ? '' : formatRelativeTime(when);

  const cardStyle = {
    flexDirection: 'row' as const,
    gap: spacing[3],
    padding: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center' as const,
  };

  return (
    <Touchable
      onPress={open}
      accessibilityRole="link"
      accessibilityLabel={`${article.title}. From ${article.sourceLabel}. Opens in browser.`}
      style={cardStyle}
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

      <IconExternalLink size={16} color={colors.onSurfaceMuted} />
    </Touchable>
  );
});

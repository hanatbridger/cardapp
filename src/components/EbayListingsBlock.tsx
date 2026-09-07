import React from 'react';
import { View, Pressable, Linking } from 'react-native';
import { IconExternalLink } from '@tabler/icons-react-native';
import { Text } from './Text';
import { useTheme } from '../theme/ThemeProvider';
import { spacing } from '../theme/tokens';
import { useMoney } from '../hooks/use-money';
import type { EbayListings } from '../services/ebay-listings';

interface EbayListingsBlockProps {
  heading: string;
  data: EbayListings;
}

/**
 * Live eBay ASKING prices for a card — the honest fill for sections the
 * tracked feed can't cover. Every number here is a current listing, so
 * the copy says "asking" and "listed" and never "sold"; App Review 4.1
 * treats asking prices dressed as sales as fabricated data.
 */
export function EbayListingsBlock({ heading, data }: EbayListingsBlockProps) {
  const { colors } = useTheme();
  const formatMoney = useMoney();
  const rows = data.listings.slice(0, 3);

  return (
    <View style={{ gap: spacing[2] }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text variant="labelLg">{heading}</Text>
        <Text variant="caption" color={colors.onSurfaceMuted}>
          {data.count} listed
        </Text>
      </View>
      {data.low !== null && data.median !== null && (
        <Text variant="bodySm" color={colors.onSurfaceVariant}>
          Asking from {formatMoney(data.low)} · median {formatMoney(data.median)}
        </Text>
      )}
      <View>
        {rows.map((l, i) => (
          <Pressable
            key={l.url || `${l.title}-${i}`}
            onPress={() => {
              if (l.url) Linking.openURL(l.url).catch(() => {});
            }}
            accessibilityRole="link"
            accessibilityLabel={`${l.title}, ${formatMoney(l.price)} on eBay`}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing[3],
              paddingVertical: spacing[2],
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: colors.outlineVariant,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text
              variant="labelLg"
              style={{ minWidth: 76, fontVariant: ['tabular-nums'] }}
            >
              {formatMoney(l.price)}
            </Text>
            <Text variant="bodySm" color={colors.onSurfaceVariant} numberOfLines={1} style={{ flex: 1 }}>
              {l.title}
            </Text>
            <IconExternalLink size={14} color={colors.onSurfaceMuted} />
          </Pressable>
        ))}
      </View>
      <Text variant="caption" color={colors.onSurfaceMuted}>
        Asking prices on live eBay listings right now — not sold prices.
      </Text>
    </View>
  );
}

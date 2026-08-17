import React from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { IconPackage, IconBox, IconToolsKitchen3, IconGift, IconTrophy } from '@tabler/icons-react-native';
import { Text } from './Text';
import { Badge } from './Badge';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius } from '../theme/tokens';
import { withAlpha } from '../utils/withAlpha';
import { SEALED_TYPE_LABEL } from '../mocks/sealed';
import type { SealedProduct, SealedType } from '../types/sealed';

interface SealedSearchResultProps {
  product: SealedProduct;
  onPress: (product: SealedProduct) => void;
}

// Pick a type-appropriate Tabler glyph for the thumbnail corner badge.
// Booster boxes and cases get the box glyph, packs get the "gift" wrap
// (closest thing Tabler has to a booster-pack foil), tins get the
// kitchen-3 cylinder, ETB/UPC get the trophy to signal premium.
function iconForType(type: SealedType) {
  switch (type) {
    case 'booster-box':
    case 'booster-case':
      return IconBox;
    case 'booster-pack':
    case 'booster-bundle':
      return IconPackage;
    case 'tin':
      return IconToolsKitchen3;
    case 'collection-box':
      return IconGift;
    case 'etb':
    case 'upc':
      return IconTrophy;
    default:
      return IconPackage;
  }
}

export const SealedSearchResult = React.memo(function SealedSearchResult({ product, onPress }: SealedSearchResultProps) {
  const { colors } = useTheme();
  const IconComponent = iconForType(product.type);

  return (
    <Pressable
      onPress={() => onPress(product)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        padding: spacing[3],
        gap: spacing[3],
        backgroundColor: pressed ? colors.surfaceVariant : 'transparent',
        alignItems: 'center',
      })}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, sealed`}
    >
      {/* Thumbnail — 48×67 to match CardSearchResult row rhythm, but
          since sealed images are set-logo rectangles (not card portraits)
          we letterbox the logo in a tonal surface and overlay the
          product-type icon bottom-right. */}
      <View
        style={{
          width: 48,
          height: 67,
          borderRadius: radius.sm,
          backgroundColor: colors.surfaceVariant,
          borderWidth: 1,
          borderColor: colors.outline,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <Image
          source={{ uri: product.imageUrl }}
          style={{ width: 40, height: 40 }}
          contentFit="contain"
        />
        <View
          style={{
            position: 'absolute',
            bottom: 2,
            right: 2,
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: withAlpha(colors.primary, 0.15),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconComponent size={12} color={colors.primary} strokeWidth={2} />
        </View>
      </View>

      <View style={{ flex: 1, gap: spacing['0.5'] }}>
        <Text variant="labelLg" numberOfLines={1}>{product.name}</Text>
        <Text variant="caption" color={colors.onSurfaceVariant} numberOfLines={1}>
          {product.setName} · {product.contents}
        </Text>
        <View style={{ flexDirection: 'row', marginTop: spacing[1] }}>
          <Badge variant="info">{SEALED_TYPE_LABEL[product.type]}</Badge>
        </View>
      </View>
    </Pressable>
  );
});

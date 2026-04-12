import React from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { Text } from './Text';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius } from '../theme/tokens';
import type { PokemonCard } from '../types/card';

interface CardSearchResultProps {
  card: PokemonCard;
  onPress: (card: PokemonCard) => void;
}

export const CardSearchResult = React.memo(function CardSearchResult({ card, onPress }: CardSearchResultProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => onPress(card)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        padding: spacing[3],
        gap: spacing[3],
        backgroundColor: pressed ? colors.surfaceVariant : 'transparent',
        alignItems: 'center',
      })}
    >
      <Image
        source={{ uri: card.images.small }}
        style={{ width: 48, height: 67, borderRadius: radius.sm }}
        contentFit="cover"
      />
      <View style={{ flex: 1, gap: spacing['0.5'] }}>
        <Text variant="labelLg" numberOfLines={1}>{card.name}</Text>
        <Text variant="caption" color={colors.onSurfaceVariant}>
          {card.set.name} · #{card.number}
        </Text>
        {card.rarity && (
          <Text variant="caption" color={colors.onSurfaceVariant}>
            {card.rarity}
          </Text>
        )}
      </View>
    </Pressable>
  );
});

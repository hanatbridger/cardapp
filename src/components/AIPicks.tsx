import React from 'react';
import { View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { IconTrendingUp, IconTrendingDown, IconBrain } from '@tabler/icons-react-native';
import { Text } from './Text';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius } from '../theme/tokens';
import { formatPrice } from '../utils/format';
import type { CardScore } from '../services/price-prediction';

interface AIPickItem {
  cardId: string;
  cardName: string;
  setName: string;
  imageUrl: string;
  marketPrice: number;
  predictedPrice: number;
  gapPercent: number;
  label: 'undervalued' | 'overvalued' | 'fair';
}

interface AIPicksProps {
  title: string;
  items: AIPickItem[];
  type: 'undervalued' | 'overvalued';
}

function PickCard({ item, type }: { item: AIPickItem; type: 'undervalued' | 'overvalued' }) {
  const { colors } = useTheme();
  const isUnder = type === 'undervalued';
  const accentColor = isUnder ? colors.success : colors.danger;
  const Icon = isUnder ? IconTrendingUp : IconTrendingDown;

  return (
    <Pressable
      onPress={() => router.push(`/card/${item.cardId}`)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing[2],
        paddingHorizontal: spacing[1],
        gap: spacing[3],
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Image
        source={{ uri: item.imageUrl }}
        style={{ width: 40, height: 56, borderRadius: radius.sm }}
        contentFit="cover"
      />
      <View style={{ flex: 1, gap: spacing['0.5'] }}>
        <Text variant="labelLg" numberOfLines={1}>{item.cardName}</Text>
        <Text variant="caption" color={colors.onSurfaceMuted}>{item.setName}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: spacing['0.5'] }}>
        <Text variant="labelLg">{formatPrice(item.marketPrice)}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing['0.5'] }}>
          <Icon size={12} color={accentColor} />
          <Text variant="labelSm" color={accentColor}>
            {isUnder ? '+' : ''}{item.gapPercent.toFixed(1)}%
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export function AIPicks({ title, items, type }: AIPicksProps) {
  const { colors } = useTheme();

  if (items.length === 0) return null;

  return (
    <View style={{ gap: spacing[2] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
        <IconBrain size={14} color={colors.primary} />
        <Text variant="labelLg" color={colors.onSurfaceVariant}>
          {title}
        </Text>
      </View>
      <View
        style={{
          backgroundColor: colors.surfaceVariant,
          borderRadius: radius.lg,
          padding: spacing[3],
        }}
      >
        {items.slice(0, 5).map((item, i) => (
          <View key={item.cardId}>
            <PickCard item={item} type={type} />
            {i < items.length - 1 && i < 4 && (
              <View style={{ height: 1, backgroundColor: colors.outlineVariant, marginVertical: spacing[1] }} />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

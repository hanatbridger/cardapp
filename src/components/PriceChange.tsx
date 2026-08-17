import React from 'react';
import { View } from 'react-native';
import { IconTrendingUp, IconTrendingDown, IconMinus } from '@tabler/icons-react-native';
import { Text } from './Text';
import { useTheme } from '../theme/ThemeProvider';
import { spacing } from '../theme/tokens';

interface PriceChangeProps {
  percent: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function PriceChange({ percent, size = 'md', showIcon = true }: PriceChangeProps) {
  const { colors } = useTheme();
  const isPositive = percent > 0;
  const isNeutral = percent === 0;
  const color = isNeutral
    ? colors.onSurfaceMuted
    : isPositive
      ? colors.success
      : colors.danger;
  const iconSize = size === 'sm' ? 12 : size === 'md' ? 14 : 16;
  const variant = size === 'sm' ? 'labelSm' : size === 'md' ? 'labelMd' : 'labelLg';

  const Icon = isNeutral ? IconMinus : isPositive ? IconTrendingUp : IconTrendingDown;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing['0.5'] }}>
      {showIcon && <Icon size={iconSize} color={color} />}
      <Text
        variant={variant}
        color={color}
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {isPositive ? '+' : ''}{percent.toFixed(2)}%
      </Text>
    </View>
  );
}

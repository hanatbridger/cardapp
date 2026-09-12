import React from 'react';
import { View, Platform, type ViewProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius, shadows } from '../theme/tokens';

interface CardProps extends ViewProps {
  elevated?: boolean;
  glass?: boolean;
  padding?: number;
}

export function Card({
  elevated = false,
  glass: isGlass = false,
  padding = spacing[6],
  style,
  children,
  ...props
}: CardProps) {
  const { colors, glass: glassTokens } = useTheme();

  const baseStyle = isGlass
    ? {
        backgroundColor: glassTokens.background,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: glassTokens.border,
        ...shadows.glass,
        ...(Platform.OS === 'web'
          ? { backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' } as any
          : {}),
      }
    : elevated
      ? {
          backgroundColor: colors.surfaceElevated,
          borderRadius: radius.lg,
          ...shadows.md,
        }
      : {
          // Solid fill, no stroke: the design draws every card as a
          // raised surface on the canvas, and an outlined card on a
          // near-black background reads as an empty box instead.
          backgroundColor: colors.surfaceVariant,
          borderRadius: radius.lg,
        };

  return (
    <View
      style={[{ padding, ...baseStyle }, style]}
      {...props}
    >
      {children}
    </View>
  );
}

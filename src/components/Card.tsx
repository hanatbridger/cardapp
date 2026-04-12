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
        borderRadius: radius.xl,
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
          borderRadius: radius.xl,
          ...shadows.md,
        }
      : {
          backgroundColor: colors.surface,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: colors.outline,
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

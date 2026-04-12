import React from 'react';
import {
  Pressable,
  type PressableProps,
  ActivityIndicator,
  View,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';
import { spacing, radius } from '../theme/tokens';
import { withAlpha } from '../utils/withAlpha';

type Variant = 'filled' | 'tonal' | 'outlined' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  children: string;
}

const sizeMap = {
  sm: { height: 32, paddingHorizontal: spacing[3], gap: spacing[1] },
  md: { height: 40, paddingHorizontal: spacing[4], gap: spacing[2] },
  lg: { height: 48, paddingHorizontal: spacing[5], gap: spacing[2] },
} as const;

export function Button({
  variant = 'filled',
  size = 'md',
  icon,
  loading = false,
  fullWidth = false,
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const { colors } = useTheme();
  const sizeStyle = sizeMap[size];

  const variantStyles = {
    filled: {
      bg: colors.primary,
      text: colors.onPrimary,
      border: 'transparent',
      pressedBg: colors.primaryActive,
    },
    tonal: {
      bg: colors.primaryContainer,
      text: colors.onPrimaryContainer,
      border: 'transparent',
      pressedBg: withAlpha(colors.primary, 0.2),
    },
    outlined: {
      bg: 'transparent',
      text: colors.primary,
      border: colors.outline,
      pressedBg: colors.primaryContainer,
    },
    ghost: {
      bg: 'transparent',
      text: colors.primary,
      border: 'transparent',
      pressedBg: colors.primaryContainer,
    },
    danger: {
      bg: colors.danger,
      text: colors.onPrimary,
      border: 'transparent',
      pressedBg: colors.onDangerContainer,
    },
  } as const;

  const v = variantStyles[variant];

  return (
    <Pressable
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={children}
      accessibilityState={{ disabled: disabled || loading }}
      style={({ pressed }) => [
        {
          height: sizeStyle.height,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          borderRadius: radius.lg,
          backgroundColor: pressed ? v.pressedBg : v.bg,
          borderWidth: variant === 'outlined' ? 1 : 0,
          borderColor: v.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: sizeStyle.gap,
          opacity: disabled ? 0.5 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style as any,
      ]}
      {...props}
      onPress={(e) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        props.onPress?.(e);
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : (
        <>
          {icon}
          <Text
            variant={size === 'sm' ? 'labelMd' : 'labelLg'}
            color={v.text}
          >
            {children}
          </Text>
        </>
      )}
    </Pressable>
  );
}

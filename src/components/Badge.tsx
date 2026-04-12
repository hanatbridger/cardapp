import React from 'react';
import { View, type ViewProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';
import { spacing, radius } from '../theme/tokens';

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps extends ViewProps {
  variant?: Variant;
  dot?: boolean;
  children: string;
}

export function Badge({
  variant = 'neutral',
  dot = false,
  children,
  style,
  ...props
}: BadgeProps) {
  const { colors } = useTheme();

  const variantStyles = {
    success: { bg: colors.successContainer, text: colors.onSuccessContainer, dot: colors.success },
    warning: { bg: colors.warningContainer, text: colors.onWarningContainer, dot: colors.warning },
    danger: { bg: colors.dangerContainer, text: colors.onDangerContainer, dot: colors.danger },
    info: { bg: colors.infoContainer, text: colors.onInfoContainer, dot: colors.info },
    neutral: { bg: colors.surfaceVariant, text: colors.onSurfaceVariant, dot: colors.onSurfaceMuted },
  } as const;

  const v = variantStyles[variant];

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          backgroundColor: v.bg,
          borderRadius: radius.full,
          paddingHorizontal: spacing[3],
          paddingVertical: spacing[1],
          gap: spacing[1],
        },
        style,
      ]}
      {...props}
    >
      {dot && (
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: radius.full,
            backgroundColor: v.dot,
          }}
        />
      )}
      <Text variant="labelMd" color={v.text}>
        {children}
      </Text>
    </View>
  );
}

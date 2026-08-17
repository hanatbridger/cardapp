import React, { forwardRef } from 'react';
import { View, TextInput, type TextInputProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';
import { spacing, radius, typography } from '../theme/tokens';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, hint, icon, style, ...props }, ref) => {
    const { colors } = useTheme();
    const borderColor = error ? colors.danger : colors.outline;
    // Multiline fields grow with content instead of clipping inside the
    // fixed single-line height (which rendered typed text on top of
    // surrounding controls).
    const multiline = Boolean(props.multiline);

    return (
      <View style={{ gap: spacing[1] }}>
        {label && (
          <Text variant="labelLg" color={colors.onSurface}>
            {label}
          </Text>
        )}
        <View
          style={{
            flexDirection: 'row',
            alignItems: multiline ? 'flex-start' : 'center',
            ...(multiline
              ? { paddingVertical: spacing[2] }
              : { height: 40 }),
            borderWidth: 1,
            borderColor,
            borderRadius: radius.lg,
            backgroundColor: colors.surface,
            paddingHorizontal: spacing[3],
            gap: spacing[2],
          }}
        >
          {icon}
          <TextInput
            ref={ref}
            placeholderTextColor={colors.onSurfaceMuted}
            style={[
              {
                flex: 1,
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.bodyMd.fontSize,
                color: colors.onSurface,
                padding: 0,
              },
              multiline && { textAlignVertical: 'top' as const },
              style,
            ]}
            {...props}
          />
        </View>
        {error && (
          <Text variant="caption" color={colors.danger}>
            {error}
          </Text>
        )}
        {hint && !error && (
          <Text variant="caption" color={colors.onSurfaceMuted}>
            {hint}
          </Text>
        )}
      </View>
    );
  },
);

Input.displayName = 'Input';

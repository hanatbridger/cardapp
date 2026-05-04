import React from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { typography, fontFamilyForWeight } from '../theme/tokens';

type Variant = keyof Omit<typeof typography, 'fontFamily'>;

interface TextProps extends RNTextProps {
  variant?: Variant;
  color?: string;
}

export function Text({
  variant = 'bodyMd',
  color,
  style,
  children,
  ...props
}: TextProps) {
  const { colors } = useTheme();
  const typeStyle = typography[variant];

  return (
    <RNText
      style={[
        {
          color: color ?? colors.onSurface,
          ...typeStyle,
          fontFamily: fontFamilyForWeight(typeStyle.fontWeight),
        },
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
}

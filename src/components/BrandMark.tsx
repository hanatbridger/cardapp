import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';

interface BrandMarkProps {
  size?: number;
  /**
   * color   — indigo prism on light/dark canvas (default)
   * inverse — white prism with a lit facet, for use ON the brand
   *           indigo (splash, brand moments). Matches assets/icon.png.
   * mono    — single-fill silhouette
   */
  variant?: 'color' | 'inverse' | 'mono';
  color?: string;
}

export function BrandMark({ size = 64, variant = 'color', color }: BrandMarkProps) {
  const { colors } = useTheme();
  const monoFill = color ?? colors.onSurface;

  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024" accessibilityLabel="CardPulse">
      {variant === 'color' || variant === 'inverse' ? (
        <>
          <Path
            d="M 512 170.667 L 853.333 682.667 L 512 853.333 L 170.667 682.667 Z"
            fill={variant === 'inverse' ? '#F9FAFB' : '#4B5EFC'}
          />
          <Path d="M 512 170.667 L 853.333 682.667 L 512 512 Z" fill="#A5B0FF" />
        </>
      ) : (
        <Path d="M 512 170.667 L 853.333 682.667 L 512 853.333 L 170.667 682.667 Z" fill={monoFill} />
      )}
    </Svg>
  );
}

import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import {
  lightColors,
  darkColors,
  palette,
  typography,
  spacing,
  radius,
  shadows,
  glass,
  gradients,
  type ColorTokens,
} from './tokens';

export interface GlassTokens {
  background: string;
  border: string;
  backgroundStrong: string;
}

export interface Theme {
  colors: ColorTokens;
  palette: typeof palette;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  shadows: typeof shadows;
  glass: GlassTokens;
  gradientColors: readonly string[];
  isDark: boolean;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const theme = useMemo<Theme>(
    () => ({
      colors: isDark ? darkColors : lightColors,
      palette,
      typography,
      spacing,
      radius,
      shadows,
      glass: isDark ? glass.dark : glass.light,
      gradientColors: isDark ? gradients.dark.colors : gradients.light.colors,
      isDark,
    }),
    [isDark],
  );

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return theme;
}

import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useUserStore } from '../stores/user-store';
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
  // User preference overrides the OS-level scheme. `system` defers to the
  // OS (`useColorScheme`); `light`/`dark` pin the app regardless of OS. We
  // subscribe to just the `theme` field so flipping it from the profile
  // tab triggers a single provider re-render and every themed component
  // re-resolves with the new palette.
  const themePreference = useUserStore((s) => s.preferences.theme);
  const isDark =
    themePreference === 'system'
      ? colorScheme === 'dark'
      : themePreference === 'dark';

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

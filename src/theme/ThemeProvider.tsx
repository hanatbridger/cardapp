import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useUserStore } from '../stores/user-store';
import { useThemeOverrideStore } from '../stores/theme-override-store';
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

// Widen the `as const` literal types on radius so the theme consumer
// sees plain `number` — otherwise slider overrides wouldn't satisfy the
// literal types (e.g. assigning 18 to a `6` slot).
type RadiusTokens = { [K in keyof typeof radius]: number };

export interface Theme {
  colors: ColorTokens;
  palette: typeof palette;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: RadiusTokens;
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

  // Dev-only color overrides pushed from the design-system editor
  // (app/design-system.tsx). Empty by default in production — this is
  // a session-only scratchpad keyed by mode, so a refresh resets to the
  // `src/theme/tokens.ts` source of truth. We subscribe to `version`
  // (bumped on every apply/reset) so the memo below recomputes without
  // doing deep-equality on the override objects.
  const overrideLight = useThemeOverrideStore((s) => s.light);
  const overrideDark = useThemeOverrideStore((s) => s.dark);
  const overrideRadius = useThemeOverrideStore((s) => s.radius);
  const overrideVersion = useThemeOverrideStore((s) => s.version);

  const theme = useMemo<Theme>(
    () => ({
      colors: {
        ...(isDark ? darkColors : lightColors),
        ...(isDark ? overrideDark : overrideLight),
      },
      palette,
      typography,
      spacing,
      // Radius overrides only take effect for components that read from
      // `useTheme().radius`. Components importing `radius` directly from
      // tokens.ts bypass this merge — that's fine for the design-system
      // preview (which does use useTheme) and for the Copy-as-TS flow.
      radius: { ...radius, ...overrideRadius },
      shadows,
      glass: isDark ? glass.dark : glass.light,
      gradientColors: isDark ? gradients.dark.colors : gradients.light.colors,
      isDark,
    }),
    // overrideVersion covers both `overrideLight` and `overrideDark` —
    // the store bumps it on every mutation, so identity is stable
    // between applies and new on every apply.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isDark, overrideVersion],
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

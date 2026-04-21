import { create } from 'zustand';
import { radius as baseRadius, type ColorTokens } from '../theme/tokens';

/**
 * Session-only overrides for design tokens, driven by the design-system
 * screen's right-panel editor (app/design-system.tsx +
 * src/components/TokenEditorPanel.tsx).
 *
 * When a key is present, ThemeProvider merges it on top of the baked-in
 * value before handing the theme to components. Deliberately NOT
 * persisted — a refresh returns to `src/theme/tokens.ts` defaults. To
 * commit a tweak permanently, use "Copy as TS" and paste into source.
 */

// Strip `readonly` — base tokens come from an `as const` object so their
// types inherit readonly, but our override maps need to be writable.
export type ColorOverrides = { -readonly [K in keyof ColorTokens]?: string };

type RadiusKey = keyof typeof baseRadius;
export type RadiusOverrides = { -readonly [K in RadiusKey]?: number };

interface ThemeOverrideState {
  light: ColorOverrides;
  dark: ColorOverrides;
  radius: RadiusOverrides;
  // Bumped on every mutation. ThemeProvider keys its memo on this so
  // consumers re-render on apply without us doing deep-equality on the
  // override objects.
  version: number;
  applyColors: (mode: 'light' | 'dark', patch: ColorOverrides) => void;
  applyRadius: (patch: RadiusOverrides) => void;
  resetColors: (mode: 'light' | 'dark') => void;
  resetRadius: () => void;
  resetAll: () => void;
}

export const useThemeOverrideStore = create<ThemeOverrideState>((set) => ({
  light: {},
  dark: {},
  radius: {},
  version: 0,
  applyColors: (mode, patch) =>
    set((s) => ({
      [mode]: { ...s[mode], ...patch },
      version: s.version + 1,
    })),
  applyRadius: (patch) =>
    set((s) => ({
      radius: { ...s.radius, ...patch },
      version: s.version + 1,
    })),
  resetColors: (mode) =>
    set((s) => ({ [mode]: {}, version: s.version + 1 })),
  resetRadius: () =>
    set((s) => ({ radius: {}, version: s.version + 1 })),
  resetAll: () => set({ light: {}, dark: {}, radius: {}, version: 0 }),
}));

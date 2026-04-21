import { create } from 'zustand';
import type { ColorTokens } from '../theme/tokens';

/**
 * Session-only override for semantic color tokens, driven by the
 * design-system screen's right-panel editor. When a key is present in
 * `light` / `dark`, ThemeProvider merges it on top of the baked-in
 * palette before handing the theme to components.
 *
 * Deliberately NOT persisted — this is a dev/design scratchpad. A page
 * refresh (or app restart) returns to `src/theme/tokens.ts` defaults,
 * which is what you want when tweaking: no "why are my colors weird?"
 * mystery after closing the editor. To commit a tweak permanently, use
 * the editor's "Copy as tokens.ts" button and paste into the source.
 */

// Strip `readonly` from `ColorTokens` — the base type comes from an
// `as const` object in tokens.ts which marks every key readonly. Our
// override maps need to be writable so the store (and the editor's
// draft buffer) can mutate entries.
export type ColorOverrides = { -readonly [K in keyof ColorTokens]?: string };

interface ThemeOverrideState {
  light: ColorOverrides;
  dark: ColorOverrides;
  // Bumped whenever an override is applied/reset. ThemeProvider reads
  // this in the `useMemo` deps so consumers re-render on apply without
  // us having to do a deep equality dance on the two override objects.
  version: number;
  setOverride: (mode: 'light' | 'dark', key: keyof ColorTokens, value: string) => void;
  applyBatch: (mode: 'light' | 'dark', patch: ColorOverrides) => void;
  resetMode: (mode: 'light' | 'dark') => void;
  resetAll: () => void;
}

export const useThemeOverrideStore = create<ThemeOverrideState>((set) => ({
  light: {},
  dark: {},
  version: 0,
  setOverride: (mode, key, value) =>
    set((s) => ({
      [mode]: { ...s[mode], [key]: value },
      version: s.version + 1,
    })),
  applyBatch: (mode, patch) =>
    set((s) => ({
      [mode]: { ...s[mode], ...patch },
      version: s.version + 1,
    })),
  resetMode: (mode) =>
    set((s) => ({ [mode]: {}, version: s.version + 1 })),
  resetAll: () => set({ light: {}, dark: {}, version: 0 }),
}));

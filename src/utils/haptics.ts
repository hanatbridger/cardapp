import * as ExpoHaptics from 'expo-haptics';
import { useUserStore } from '../stores/user-store';

/**
 * Haptics wrapper that respects the user's `hapticEnabled` preference.
 *
 * Drop-in replacement for `import * as Haptics from 'expo-haptics'` —
 * exposes the same `Haptics.impactAsync` / `notificationAsync` /
 * `selectionAsync` shape plus the enum re-exports. When the user toggles
 * haptics off in Settings, every call here resolves to a no-op instead
 * of firing the device motor.
 *
 * Reads the store imperatively via `getState()` so it works outside
 * React (e.g. in callbacks fired from event handlers) without needing
 * a hook.
 */
const isEnabled = () => useUserStore.getState().preferences.hapticEnabled;

export const Haptics = {
  ImpactFeedbackStyle: ExpoHaptics.ImpactFeedbackStyle,
  NotificationFeedbackType: ExpoHaptics.NotificationFeedbackType,

  impactAsync: (style?: ExpoHaptics.ImpactFeedbackStyle): Promise<void> =>
    isEnabled() ? ExpoHaptics.impactAsync(style) : Promise.resolve(),

  notificationAsync: (
    type?: ExpoHaptics.NotificationFeedbackType,
  ): Promise<void> =>
    isEnabled() ? ExpoHaptics.notificationAsync(type) : Promise.resolve(),

  selectionAsync: (): Promise<void> =>
    isEnabled() ? ExpoHaptics.selectionAsync() : Promise.resolve(),
};

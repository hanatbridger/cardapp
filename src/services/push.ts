import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

/**
 * Remote (server) push registration.
 *
 * Unlike the in-app local notifications (alerts / daily news catch-up),
 * this registers an Expo push token with our backend so the server can
 * deliver notifications even when the app is backgrounded or fully
 * terminated — which on-device BackgroundFetch cannot do reliably. Today
 * the server only sends NEWS pushes (global, no per-user data); see
 * api/cron/news-push.ts.
 *
 * Native only. No-op on web and on the simulator (no real token).
 */

const API_ORIGIN =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://strange-saha-livid.vercel.app';

// Remember the last token we successfully registered so we don't POST on
// every launch — only when it's new or changed.
const REGISTERED_TOKEN_KEY = 'cardpulse-push-registered-token';

/**
 * The Expo push token this device has already registered with the
 * backend, or null if registration hasn't happened (web, simulator,
 * permission not granted yet). Read-only — registration stays owned by
 * registerForPushNotifications.
 */
export async function getRegisteredPushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    return await AsyncStorage.getItem(REGISTERED_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function registerForPushNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    // Don't prompt here — only register once permission is already
    // granted (the News tab / first price alert own the prompt). This is
    // called at startup and after a grant, so the token lands as soon as
    // the user has said yes, without a launch-time permission dialog.
    const perms = await Notifications.getPermissionsAsync();
    if (!perms.granted) return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
    if (!projectId) return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return;

    const prev = await AsyncStorage.getItem(REGISTERED_TOKEN_KEY).catch(() => null);
    if (prev === token) return; // already registered this exact token

    const res = await fetch(`${API_ORIGIN}/api/push/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, platform: Platform.OS }),
    });
    if (res.ok) {
      await AsyncStorage.setItem(REGISTERED_TOKEN_KEY, token).catch(() => {});
    }
  } catch {
    // Best-effort — push registration must never break app startup.
  }
}

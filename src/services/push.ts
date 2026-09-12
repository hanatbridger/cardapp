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
  process.env.EXPO_PUBLIC_API_URL ?? 'https://strange-saha.vercel.app';

// Remember the last token we successfully registered so we don't POST on
// every launch — only when it's new or changed.
const REGISTERED_TOKEN_KEY = 'cardpulse-push-registered-token';
// The timezone that went up with it, kept in its own key so
// getRegisteredPushToken keeps returning a bare token. Devices that
// registered before the server knew about timezones have no value here,
// so the stamp below mismatches once and backfills their zone.
const REGISTERED_TZ_KEY = 'cardpulse-push-registered-timezone';

/**
 * The device's IANA zone (e.g. 'America/Los_Angeles'). The news cron uses
 * it to hold pushes outside this device's waking hours, so a traveller's
 * new zone matters — it re-registers when the value changes.
 */
function deviceTimezone(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof tz === 'string' && tz.length > 0 && tz.length <= 64 ? tz : null;
  } catch {
    return null;
  }
}

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

    const timezone = deviceTimezone();
    const [prev, prevTz] = await Promise.all([
      AsyncStorage.getItem(REGISTERED_TOKEN_KEY).catch(() => null),
      AsyncStorage.getItem(REGISTERED_TZ_KEY).catch(() => null),
    ]);
    // Same token AND same zone — nothing for the server to learn.
    if (prev === token && prevTz === timezone) return;

    const res = await fetch(`${API_ORIGIN}/api/push/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, platform: Platform.OS, timezone }),
    });
    if (res.ok) {
      await AsyncStorage.setItem(REGISTERED_TOKEN_KEY, token).catch(() => {});
      if (timezone) {
        await AsyncStorage.setItem(REGISTERED_TZ_KEY, timezone).catch(() => {});
      } else {
        await AsyncStorage.removeItem(REGISTERED_TZ_KEY).catch(() => {});
      }
    }
  } catch {
    // Best-effort — push registration must never break app startup.
  }
}

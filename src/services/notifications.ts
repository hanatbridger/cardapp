import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { lightColors } from '../theme/tokens';

let handlerConfigured = false;

// Android notification channel ids. The server push payloads in
// api/cron/snapshot-prices.ts and api/cron/news-push.ts reference the same
// strings; an unknown id falls back to the default channel rather than
// dropping, so the client and server can roll out in either order.
export const ALERTS_CHANNEL_ID = 'alerts';
export const NEWS_CHANNEL_ID = 'news';

/**
 * Create the Android notification channels. Without them every notification
 * lands in the auto-created "Miscellaneous" channel, and on Android 13+ the
 * permission prompt cannot appear until at least one channel exists.
 * setNotificationChannelAsync is an upsert, so repeat calls are safe.
 */
function configureAndroidChannels() {
  if (Platform.OS !== 'android') return;
  Promise.all([
    Notifications.setNotificationChannelAsync(ALERTS_CHANNEL_ID, {
      name: 'Price and grading alerts',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: lightColors.primary,
    }),
    Notifications.setNotificationChannelAsync(NEWS_CHANNEL_ID, {
      name: 'News',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: lightColors.primary,
    }),
  ]).catch((e) => {
    // eslint-disable-next-line no-console
    console.warn('[notifications] channel setup failed', e);
  });
}

/**
 * Configure the foreground notification handler and, on Android, the
 * notification channels. Call once at app start.
 * No-op on web — expo-notifications doesn't expose web push.
 */
export function configureNotificationHandler() {
  if (handlerConfigured || Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowAlert: true,
    }),
  });
  configureAndroidChannels();
  handlerConfigured = true;
}

/**
 * Request notification permission. Returns true if granted.
 * Always returns true on web so the rest of the alert flow can proceed
 * (in-app notification list still works without OS permission).
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (!existing.canAskAgain) return false;
  const result = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return result.granted;
}

/**
 * Present a local notification immediately. Used by the foreground checker
 * so the user gets the same banner whether the app is open or asleep.
 */
export async function presentLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: data ?? {} },
      // Fire immediately. Android routes through the alerts channel; iOS
      // has no channels and keeps the plain null trigger.
      trigger:
        Platform.OS === 'android' ? { channelId: ALERTS_CHANNEL_ID } : null,
    });
  } catch (e) {
    // Don't crash the app if notifications fail — log and move on.
    // eslint-disable-next-line no-console
    console.warn('[notifications] presentLocalNotification failed', e);
  }
}

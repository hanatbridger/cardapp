import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

let handlerConfigured = false;

/**
 * Configure the foreground notification handler. Call once at app start.
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
      trigger: null, // fire immediately
    });
  } catch (e) {
    // Don't crash the app if notifications fail — log and move on.
    // eslint-disable-next-line no-console
    console.warn('[notifications] presentLocalNotification failed', e);
  }
}

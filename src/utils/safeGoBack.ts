import { router, type Href } from 'expo-router';

/**
 * Safely navigate back. Falls back to the given route when there's no
 * navigation history (deep link, push notification entry, fresh launch).
 *
 * Without this, `router.back()` is a no-op when the stack is empty —
 * making back buttons appear broken.
 */
export function safeGoBack(fallback: Href = '/(tabs)' as Href): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}

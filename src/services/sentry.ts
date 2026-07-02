/**
 * CardPulse — Sentry Error Tracking
 *
 * Initializes Sentry for crash reporting, performance monitoring,
 * and error tracking in production. Safe to import on any platform
 * (web/iOS/Android) — Sentry handles platform differences internally.
 *
 * To activate: set SENTRY_DSN in your environment or replace the
 * placeholder below with your project's DSN from sentry.io.
 */

import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

/** Whether Sentry is actually active (has a DSN configured) */
export const isSentryEnabled = SENTRY_DSN.length > 0;

export function initSentry() {
  if (!isSentryEnabled) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[Sentry] No DSN configured — skipping initialization');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,

    // Performance monitoring — sample 20% of transactions in production,
    // 100% in dev for testing.
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,

    // Only send events in production. In dev, just log to console.
    enabled: !__DEV__,

    // iOS app-hang watchdog. The cocoa default (2s) mis-fires on known
    // transient classes — app startup, permission dialogs, share sheets
    // (all of which CardPulse hits) — and produced a lone frameless
    // AppHang event in production. 4s keeps hang tracking on for real
    // stalls while filtering the 2-4s false-positive band.
    appHangTimeoutInterval: 4,

    // Attach user info when available
    beforeSend(event) {
      // Drop known-noise: expo-notifications' import-time Keychain read
      // fails with errSecInteractionNotAllowed when iOS wakes the app in
      // the background while the device is locked (expo/expo#43828).
      // Fixed upstream in expo-notifications 0.32.17 (bundled from the
      // next build), but binaries <= 1.0.10 in the field still emit it.
      // Remove this filter once those builds have aged out. Chained
      // exceptions can split across values, so test each value.
      const values = event.exception?.values ?? [];
      const isKeychainNoise =
        values.some((v) => /getRegistrationInfoAsync/.test(v.value ?? '')) &&
        values.some((v) =>
          /Keychain access failed|User interaction is not allowed/.test(v.value ?? ''),
        );
      if (isKeychainNoise) return null;

      // Strip any PII we don't want to send
      if (event.user) {
        delete event.user.ip_address;
      }
      return event;
    },
  });
}

/**
 * Capture an exception in Sentry with optional context.
 * Safe to call even if Sentry is not initialized — will no-op.
 */
export function captureException(
  error: Error,
  context?: Record<string, unknown>,
) {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.error('[Sentry]', error.message, context);
  }

  if (!isSentryEnabled) return;

  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureException(error);
  });
}

/**
 * Set user identity for Sentry events.
 * Call after login, clear on logout.
 */
export function setUser(user: { id?: string; email?: string; username?: string } | null) {
  if (!isSentryEnabled) return;
  Sentry.setUser(user);
}

/**
 * Add a breadcrumb for debugging context.
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>,
) {
  if (!isSentryEnabled) return;
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: 'info',
  });
}

/** Re-export Sentry's navigation integration for Expo Router */
export { Sentry };

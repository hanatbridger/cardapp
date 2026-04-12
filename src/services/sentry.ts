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

    // Attach user info when available
    beforeSend(event) {
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

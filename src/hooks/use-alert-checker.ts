import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useAlertsStore } from '../stores/alerts-store';
import { useUserStore } from '../stores/user-store';
import { findAlertsToTrigger, formatAlertMessage } from '../services/alert-checker';
import { presentLocalNotification } from '../services/notifications';

const FOREGROUND_INTERVAL_MS = 60 * 1000; // 1 minute while app is open

/**
 * Runs the alert checker on app foreground + on a 1-minute interval while
 * the app is active. Triggered alerts are recorded into the alerts store
 * (so the in-app notifications screen updates) and fired as local
 * notifications (so the OS shows a banner). The same logic powers the
 * background task — see services/background-alerts.ts.
 */
export function useAlertChecker() {
  const alerts = useAlertsStore((s) => s.alerts);
  const recordTriggered = useAlertsStore((s) => s.recordTriggered);
  const notificationsEnabled = useUserStore(
    (s) => s.preferences.notificationsEnabled,
  );

  // Keep refs so the interval callback always sees the latest values
  // without resubscribing on every change.
  const alertsRef = useRef(alerts);
  const enabledRef = useRef(notificationsEnabled);
  alertsRef.current = alerts;
  enabledRef.current = notificationsEnabled;

  useEffect(() => {
    const runCheck = () => {
      if (!enabledRef.current) return;
      const toFire = findAlertsToTrigger(alertsRef.current);
      for (const evaluation of toFire) {
        const entry = recordTriggered(evaluation.alert, evaluation.currentPrice);
        const { title, body } = formatAlertMessage(
          evaluation.alert,
          evaluation.currentPrice,
        );
        presentLocalNotification(title, body, {
          cardId: entry.cardId,
          triggeredAlertId: entry.id,
        });
      }
    };

    // Run immediately on mount, then on interval, then on every foreground.
    runCheck();
    const interval = setInterval(runCheck, FOREGROUND_INTERVAL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') runCheck();
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [recordTriggered]);
}

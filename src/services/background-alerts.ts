import { Platform } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { useAlertsStore } from '../stores/alerts-store';
import { useUserStore } from '../stores/user-store';
import { findAlertsToTrigger, formatAlertMessage } from './alert-checker';
import { presentLocalNotification } from './notifications';

export const PRICE_ALERT_TASK = 'cardpulse-price-alert-check';

let taskDefined = false;

/**
 * Defines the background task. Must run at module-eval time on native so
 * iOS/Android can wake the app and dispatch into it. Skipped on web.
 */
export function defineBackgroundAlertTask() {
  if (taskDefined || Platform.OS === 'web') return;
  taskDefined = true;

  TaskManager.defineTask(PRICE_ALERT_TASK, async () => {
    try {
      // Hydrate the persisted stores before reading. Zustand's persist
      // middleware exposes rehydrate() so background runs see fresh data.
      await useAlertsStore.persist.rehydrate();
      await useUserStore.persist.rehydrate();

      // Honor the notifications preference here too. The foreground
      // checker gates on it (use-alert-checker.ts); without the same
      // gate the OS-woken background task would keep posting banners
      // after the user turned notifications off in settings.
      if (!useUserStore.getState().preferences.notificationsEnabled) {
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }

      const { alerts, recordTriggered } = useAlertsStore.getState();

      // findAlertsToTrigger now fetches live prices in parallel —
      // awaitable, but still capped by the per-fetch timeout in
      // fetchRawCardPrice so the whole background task stays under
      // the OS's 30s budget even with a full Premium-tier watchlist.
      const toFire = await findAlertsToTrigger(alerts);
      if (toFire.length === 0) {
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }

      for (const evaluation of toFire) {
        const entry = recordTriggered(evaluation.alert, evaluation.currentPrice);
        // null = already recorded by a concurrent (e.g. foreground) check.
        if (!entry) continue;
        const { title, body } = formatAlertMessage(
          evaluation.alert,
          evaluation.currentPrice,
        );
        await presentLocalNotification(title, body, {
          cardId: entry.cardId,
          triggeredAlertId: entry.id,
        });
      }

      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[background-alerts] task failed', e);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
}

/**
 * Register the task with iOS BackgroundFetch / Android JobScheduler.
 * Idempotent — safe to call on every app start. No-op on web.
 */
export async function registerBackgroundAlertTask(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(PRICE_ALERT_TASK);
    if (isRegistered) return;

    await BackgroundFetch.registerTaskAsync(PRICE_ALERT_TASK, {
      // 15 minutes is the minimum iOS will honor; the OS may run it less
      // frequently in practice based on usage patterns.
      minimumInterval: 15 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[background-alerts] register failed', e);
  }
}

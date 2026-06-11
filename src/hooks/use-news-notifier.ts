import { useEffect } from 'react';
import { AppState } from 'react-native';
import { maybeNotifyDailyNews } from '../services/news-notify';

/**
 * Foreground catch-up for the daily news push. Runs once on mount and on
 * every app-foreground. maybeNotifyDailyNews enforces the 1/day +
 * new-story gate (shared with the background task), so this only ever
 * results in at most one banner per day — it's just a reliability
 * backstop for when iOS never wakes the background task.
 */
export function useNewsNotifier() {
  useEffect(() => {
    maybeNotifyDailyNews();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') maybeNotifyDailyNews();
    });
    return () => sub.remove();
  }, []);
}

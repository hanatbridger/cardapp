import { AppState, Platform } from 'react-native';
import { QueryClient, focusManager } from '@tanstack/react-query';

// React Query detects focus with a DOM `visibilitychange` listener, which
// never fires in React Native — so refetch-on-focus could not work at all
// here whatever the flag said. Screens that stay mounted (the Home tab)
// therefore showed hours-old prices after iOS suspended the app. Bridge
// AppState so returning to the foreground counts as a focus event.
if (Platform.OS !== 'web') {
  focusManager.setEventListener((handleFocus) => {
    const sub = AppState.addEventListener('change', (state) =>
      handleFocus(state === 'active'),
    );
    return () => sub.remove();
  });
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 60 * 1000, // 1 hour
      gcTime: 2 * 60 * 60 * 1000, // 2 hours
      retry: 2,
      // Native refetches on foreground (stale-only, so the per-query
      // staleTime still gates it). Web keeps the old opt-out.
      refetchOnWindowFocus: Platform.OS !== 'web',
    },
  },
});

import { Stack } from 'expo-router';

/**
 * Diagnostic routes for isolating the watchlist-row-tap bug.
 *
 * Each screen adds one layer on top of a stripped baseline, so the
 * user can walk through them in order and tell us which layer is
 * the one that starts swallowing taps. See app/dev/index.tsx for
 * the methodology and the screen-by-screen list.
 *
 * Remove this directory before the next App Store submission — it
 * ships only in the TestFlight diagnostic build (23+).
 */
export default function DevLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Back',
      }}
    />
  );
}

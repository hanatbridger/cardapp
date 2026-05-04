import { useEffect } from 'react';
import { View, Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { queryClient } from '../src/lib/query-client';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { BrandedSplash } from '../src/components/BrandedSplash';
import { useUserStore } from '../src/stores/user-store';
import { useAlertChecker } from '../src/hooks/use-alert-checker';
import {
  configureNotificationHandler,
} from '../src/services/notifications';
import {
  defineBackgroundAlertTask,
  registerBackgroundAlertTask,
} from '../src/services/background-alerts';
import { initSentry, captureException } from '../src/services/sentry';
import { configureRevenueCat } from '../src/services/revenue-cat';
import { supabase, registerSupabaseAppStateBridge } from '../src/services/supabase';
import {
  useFonts,
  SpaceGrotesk_300Light,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Initialize Sentry as early as possible — before any rendering.
initSentry();

// Initialize RevenueCat for in-app purchases.
configureRevenueCat();

// Define the background task at module-eval time so the OS can dispatch
// into it when the app is woken up. Configure the foreground notification
// handler in the same pass — both are no-ops on web.
defineBackgroundAlertTask();
configureNotificationHandler();

// Pump Supabase token refresh while the app is foregrounded. Without
// this RN suspends timers in the background and refresh-on-wake
// silently fails — see src/services/supabase.ts.
registerSupabaseAppStateBridge();

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const hasCompletedOnboarding = useUserStore((s) => s.hasCompletedOnboarding);
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const hydrateFromSupabase = useUserStore((s) => s.hydrateFromSupabase);

  // On cold start, reflect the persisted Supabase session into local
  // state. Then subscribe to auth events so a sign-out triggered from
  // anywhere (server-side logout, expired refresh, multi-device) flips
  // the gate. Listener is unsubscribed on unmount — only one
  // subscription per app lifetime since AuthGate is mounted once.
  useEffect(() => {
    hydrateFromSupabase();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        // Mirror Supabase logout into the local boolean. Profile data
        // stays put — wiping it is the deleteAccount path, not signOut.
        useUserStore.setState({ isAuthenticated: false });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [hydrateFromSupabase]);

  useEffect(() => {
    // Skip auth/onboarding gates entirely on web (localhost dev preview).
    // Native builds still enforce the full flow for App Store review.
    if (Platform.OS === 'web') return;

    const root = segments[0];
    const onOnboarding = root === 'onboarding';
    const inAuth = root === '(auth)';

    if (!hasCompletedOnboarding) {
      if (!onOnboarding) router.replace('/onboarding');
      return;
    }
    if (!isAuthenticated) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }
    // Onboarded + authed: bounce away from auth/onboarding screens.
    if (onOnboarding || inAuth) {
      router.replace('/(tabs)');
    }
  }, [hasCompletedOnboarding, isAuthenticated, segments, router]);

  return null;
}

function AlertCheckerHost() {
  useAlertChecker();
  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_300Light,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
      registerBackgroundAlertTask();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <ErrorBoundary onError={(error, info) => captureException(error, { componentStack: info.componentStack })}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthGate />
            <AlertCheckerHost />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="card/[id]" />
              <Stack.Screen name="set/[id]" />
              <Stack.Screen name="settings" />
              <Stack.Screen name="edit-profile" />
              <Stack.Screen name="change-password" />
              <Stack.Screen name="help" />
              <Stack.Screen name="terms" />
              <Stack.Screen name="privacy" />
              <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
              <Stack.Screen name="design-system" />
            </Stack>
            {/* Branded splash overlay — the native Expo splash shows the
                logomark on the dark brand canvas; this extends the same
                canvas for ~1.1s to add the "CardPulse" wordmark and
                tagline, then fades into the first screen. Mounted AFTER
                the Stack so it paints on top. Self-unmounts after fade. */}
            <BrandedSplash ready={!!(fontsLoaded || fontError)} />
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </View>
  );
}

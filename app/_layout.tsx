import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { queryClient } from '../src/lib/query-client';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { BrandedSplash } from '../src/components/BrandedSplash';
import { useUserStore } from '../src/stores/user-store';
import { useAlertChecker } from '../src/hooks/use-alert-checker';
import { useNewsNotifier } from '../src/hooks/use-news-notifier';
import {
  configureNotificationHandler,
} from '../src/services/notifications';
import {
  defineBackgroundAlertTask,
  registerBackgroundAlertTask,
} from '../src/services/background-alerts';
import { initSentry, captureException } from '../src/services/sentry';
import {
  configureRevenueCat,
  registerPremiumSync,
  registerRevenueCatIdentitySync,
} from '../src/services/revenue-cat';
import { configureGoogleSignin } from '../src/services/google-auth';
import { registerForPushNotifications } from '../src/services/push';
import { supabase, registerSupabaseAppStateBridge } from '../src/services/supabase';
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Initialize Sentry as early as possible — before any rendering.
initSentry();

// Initialize RevenueCat, then bind RC identity to the auth user and
// reconcile the local premium flag with RevenueCat's entitlement state
// (launch check + live listener). Must run after configure resolves —
// the SDK throws if queried before. Identity sync is registered before
// the premium reconcile so logIn's CustomerInfo update lands against the
// correct RC user.
configureRevenueCat()
  .then(() => {
    registerRevenueCatIdentitySync();
    registerPremiumSync();
  })
  .catch(() => {});

// Configure the native Google Sign-In SDK (no-op on web).
configureGoogleSignin();

// Define the background task at module-eval time so the OS can dispatch
// into it when the app is woken up. Configure the foreground notification
// handler in the same pass — both are no-ops on web.
defineBackgroundAlertTask();
configureNotificationHandler();

// Register this device's Expo push token with the backend so the server
// can deliver news pushes even when the app is closed. No-op unless
// notification permission is already granted (no launch-time prompt).
registerForPushNotifications();

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
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        // Mirror Supabase logout into the local boolean. Profile data
        // stays put — wiping it is the deleteAccount path, not signOut.
        useUserStore.setState({ isAuthenticated: false });
        return;
      }
      // SIGNED_IN with a session: the only path that reaches here
      // WITHOUT the local store already being updated is the web
      // Google OAuth redirect — control left the app for Google's
      // consent page, so the in-app signIn() (which login.tsx calls
      // for native flows) never ran. Populate the store from the
      // session's user metadata so AuthGate lets them through and
      // the profile screen shows their Google identity. Native flows
      // already set isAuthenticated before this fires, so the guard
      // avoids clobbering a richer profile with the same data.
      if (event === 'SIGNED_IN' && !useUserStore.getState().isAuthenticated) {
        const u = session.user;
        const meta = (u.user_metadata ?? {}) as {
          full_name?: string;
          name?: string;
          email?: string;
        };
        const email = u.email ?? meta.email ?? 'google-user@gmail.com';
        const displayName = meta.full_name ?? meta.name ?? email.split('@')[0];
        const username = '@' + email.split('@')[0];
        useUserStore.getState().signIn({ email, username, displayName }, 'google');
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [hydrateFromSupabase]);

  useEffect(() => {
    // Skip auth/onboarding gates entirely on web. The web build is
    // public at strange-saha-livid.vercel.app and serves the legal
    // routes /privacy, /terms, and /help that App Store review +
    // real users need to reach without signing in. Pre-launch the
    // dev profile leaked because DEFAULT_PROFILE was hardcoded with
    // the dev's identity — that's now blank in user-store, so the
    // un-authed web view shows empty fields rather than someone
    // else's name + email. OAuth-for-web is a future enhancement.
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
  const router = useRouter();
  useAlertChecker();
  useNewsNotifier();

  // Route notification taps (there was no handler before, so tapping a
  // notification just opened the app). News pushes open the News tab;
  // alert/card notifications open the card. Covers warm taps and the
  // cold-start case (app launched from a tapped notification).
  // Native only: expo-notifications does not implement the response APIs
  // on web — getLastNotificationResponseAsync THROWS there, which took
  // down the web bundle. There are no notification taps on web anyway.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const route = (data: Record<string, unknown> | undefined) => {
      if (!data) return;
      if (data.type === 'news') router.push('/(tabs)/news');
      else if (typeof data.cardId === 'string') router.push(`/card/${data.cardId}`);
    };
    const sub = Notifications.addNotificationResponseReceivedListener((r) =>
      route(r.notification.request.content.data as Record<string, unknown>),
    );
    Notifications.getLastNotificationResponseAsync().then((r) => {
      if (r) route(r.notification.request.content.data as Record<string, unknown>);
    });
    return () => sub.remove();
  }, [router]);

  return null;
}

export default function RootLayout() {
  // Brand book locks weights to 400/500/700 — 300/600 were never
  // reachable (no variant uses them) so they don't gate first render.
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
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
    // GestureHandlerRootView wraps the whole tree so react-native-
    // gesture-handler events (used by ReanimatedSwipeable on the
    // home watchlist) bubble up correctly. Required at the root —
    // nesting it deeper means swipe gestures inside route children
    // don't register.
    <GestureHandlerRootView style={{ flex: 1 }}>
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
                logomark on the dark brand canvas; this briefly extends
                the same canvas to add the "CardPulse" wordmark and
                tagline, then fades into the first screen. Mounted AFTER
                the Stack so it paints on top. Self-unmounts after fade. */}
            <BrandedSplash ready={!!(fontsLoaded || fontError)} />
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

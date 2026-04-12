import { useEffect } from 'react';
import { View, Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { queryClient } from '../src/lib/query-client';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
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

SplashScreen.preventAutoHideAsync().catch(() => {});

// Initialize Sentry as early as possible — before any rendering.
initSentry();

// Define the background task at module-eval time so the OS can dispatch
// into it when the app is woken up. Configure the foreground notification
// handler in the same pass — both are no-ops on web.
defineBackgroundAlertTask();
configureNotificationHandler();

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const hasCompletedOnboarding = useUserStore((s) => s.hasCompletedOnboarding);
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);

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
  useEffect(() => {
    // No custom fonts to load — using system font (SF Pro / Roboto)
    SplashScreen.hideAsync().catch(() => {});
    // Register background fetch for price alerts. Idempotent + no-op on web.
    registerBackgroundAlertTask();
  }, []);

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
              <Stack.Screen name="settings" />
              <Stack.Screen name="edit-profile" />
              <Stack.Screen name="help" />
              <Stack.Screen name="terms" />
              <Stack.Screen name="privacy" />
              <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
              <Stack.Screen name="design-system" />
            </Stack>
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </View>
  );
}

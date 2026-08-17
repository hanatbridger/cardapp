import React, { useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, AppState } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

interface ScreenBackgroundProps {
  children: React.ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

/** One full drift traverse, in ms. */
const CYCLE_MS = 25000;

export function ScreenBackground({ children, edges = ['top'] }: ScreenBackgroundProps) {
  const { gradientColors } = useTheme();

  const progress = useSharedValue(0);
  const isFocused = useRef(false);
  const isAppActive = useRef(true);
  const isRunning = useRef(false);

  // The loop may run only while this screen is focused AND the app is
  // foregrounded. expo-router keeps every visited screen mounted, so
  // without the focus half a dozen full-screen 1.8x gradients animate
  // simultaneously and forever.
  const sync = useCallback(() => {
    const shouldRun = isFocused.current && isAppActive.current;
    if (shouldRun === isRunning.current) return;
    isRunning.current = shouldRun;
    if (shouldRun) {
      // Resume at the SAME rate rather than spending a fresh 25s on
      // whatever distance is left — a screen blurred at 0.9 would
      // otherwise crawl the last 10% over a full cycle and look frozen.
      const remaining = 1 - progress.value;
      progress.value = withSequence(
        withTiming(1, { duration: CYCLE_MS * remaining, easing: Easing.linear }),
        withRepeat(
          withTiming(0, { duration: CYCLE_MS, easing: Easing.linear }),
          -1,
          true,
        ),
      );
    } else {
      cancelAnimation(progress);
    }
  }, [progress]);

  // Pause when the native app backgrounds (iOS/Android) or the web tab hides.
  // Reanimated keeps driving the timing otherwise, which burns CPU for no benefit.
  useEffect(() => {
    if (Platform.OS === 'web') {
      const onVisibility = () => {
        if (typeof document === 'undefined') return;
        isAppActive.current = !document.hidden;
        sync();
      };
      document.addEventListener('visibilitychange', onVisibility);
      return () => {
        document.removeEventListener('visibilitychange', onVisibility);
        isFocused.current = false;
        sync();
      };
    }

    const sub = AppState.addEventListener('change', (state) => {
      isAppActive.current = state === 'active';
      sync();
    });
    return () => {
      sub.remove();
      isFocused.current = false;
      sync();
    };
  }, [sync]);

  // Same focus gate TrendingCarousel uses — run on focus, cancel on blur.
  useFocusEffect(
    useCallback(() => {
      isFocused.current = true;
      sync();
      return () => {
        isFocused.current = false;
        sync();
      };
    }, [sync]),
  );

  // Gentle drift — scale larger to hide edges, only translate (no rotation to avoid white corners).
  // Transform ONLY: the absolute fill is static and lives in the JSX style
  // array. Returning layout props from the worklet pushed
  // position/top/left/right/bottom through a Fabric shadow-tree commit on
  // every frame.
  const animatedStyle = useAnimatedStyle(() => {
    const t = progress.value;
    return {
      // Scale 1.8x so edges never show even when translating
      transform: [
        { scale: 1.8 },
        { translateX: (t - 0.5) * 40 },
        { translateY: (t - 0.5) * 30 },
      ],
    };
  });

  return (
    <View style={{ flex: 1, overflow: 'hidden' }}>
      {/* pointerEvents lives in style (not as a prop) — the legacy prop
          syntax is deprecated and unreliable on React Native's New
          Architecture / Fabric renderer. Without this, the
          absolutely-positioned gradient layer silently captures every
          touch on the screen on iOS Fabric builds, making the home
          screen un-tappable. */}
      <AnimatedGradient
        colors={gradientColors as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFillObject, animatedStyle, { pointerEvents: 'none' }]}
      />
      <SafeAreaView style={{ flex: 1 }} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

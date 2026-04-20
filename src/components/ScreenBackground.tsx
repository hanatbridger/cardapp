import React, { useEffect } from 'react';
import { View, StyleSheet, Platform, AppState } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

interface ScreenBackgroundProps {
  children: React.ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export function ScreenBackground({ children, edges = ['top'] }: ScreenBackgroundProps) {
  const { gradientColors } = useTheme();

  const progress = useSharedValue(0);

  useEffect(() => {
    const start = () => {
      progress.value = withRepeat(
        withTiming(1, { duration: 25000, easing: Easing.linear }),
        -1,
        true,
      );
    };
    const stop = () => {
      cancelAnimation(progress);
    };

    start();

    // Pause when the native app backgrounds (iOS/Android) or the web tab hides.
    // Reanimated keeps driving the timing otherwise, which burns CPU for no benefit.
    if (Platform.OS === 'web') {
      const onVisibility = () => {
        if (typeof document === 'undefined') return;
        if (document.hidden) stop();
        else start();
      };
      document.addEventListener('visibilitychange', onVisibility);
      return () => {
        document.removeEventListener('visibilitychange', onVisibility);
        stop();
      };
    }

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      sub.remove();
      stop();
    };
  }, []);

  // Gentle drift — scale larger to hide edges, only translate (no rotation to avoid white corners)
  const animatedStyle = useAnimatedStyle(() => {
    const t = progress.value;
    return {
      ...StyleSheet.absoluteFillObject,
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
      <AnimatedGradient
        colors={gradientColors as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={animatedStyle}
      />
      <SafeAreaView style={{ flex: 1 }} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

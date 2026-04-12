import React, { useEffect } from 'react';
import { View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius } from '../theme/tokens';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Animated placeholder block with a subtle opacity pulse.
 * Use to outline the layout of content that's still loading.
 */
export function Skeleton({ width = '100%', height = 16, borderRadius: br, style }: SkeletonProps) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: colors.surfaceVariant,
          borderRadius: br ?? radius.sm,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

/**
 * Skeleton matching the Card Detail screen layout — image, title, grade
 * selector, price card, chart, and data section. Shown while the card
 * itself is loading.
 */
export function CardDetailSkeleton({ imageWidth }: { imageWidth: number }) {
  return (
    <View style={{ gap: spacing[4] }}>
      {/* Image placeholder */}
      <View style={{ alignItems: 'center', paddingVertical: spacing[4] }}>
        <Skeleton width={imageWidth} height={imageWidth * 1.4} borderRadius={radius.lg} />
      </View>
      <View style={{ gap: spacing[4] }}>
        {/* Title block */}
        <View style={{ gap: spacing['1.5'] }}>
          <Skeleton width="60%" height={28} />
          <Skeleton width="40%" height={14} />
          <Skeleton width="30%" height={12} />
        </View>
        {/* Grade selector */}
        <Skeleton height={36} borderRadius={radius.md} />
        {/* Price card */}
        <Skeleton height={108} borderRadius={radius.xl} />
        {/* Chart */}
        <Skeleton height={240} borderRadius={radius.xl} />
        {/* Data section */}
        <Skeleton height={320} borderRadius={radius.xl} />
      </View>
    </View>
  );
}

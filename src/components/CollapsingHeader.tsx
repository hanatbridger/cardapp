import React from 'react';
import { View, Pressable, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { IconChevronLeft } from '@tabler/icons-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { spacing } from '../theme/tokens';
import { withAlpha } from '../utils/withAlpha';
import { HORIZONTAL_PADDING } from '../constants/layout';
import { safeGoBack } from '../utils/safeGoBack';
import { Text } from './Text';
import type { Href } from 'expo-router';

type Fill = 'translucent' | 'solid' | 'none';
type TitleVariant = 'headingSm' | 'headingLg';

interface CollapsingHeaderProps {
  /** Optional title shown next to the back button */
  title?: string;
  /** Custom right slot (e.g. Save button) */
  right?: React.ReactNode;
  /** Override back behavior */
  onBack?: () => void;
  /** Fallback route when there's no nav history (default: /(tabs)) */
  backFallback?: Href;
  /** Hide the back button entirely */
  hideBack?: boolean;
  /** Animated style from useCollapsingHeader().headerAnimatedStyle */
  animatedStyle: ViewStyle | ViewStyle[];
  /** Children render below back+title row, useful for custom layouts */
  children?: React.ReactNode;
  /**
   * Background fill style.
   * - `translucent` (default): frosted surface with hairline border — used by nested screens
   * - `solid`: opaque surface, no border — used when a focused overlay sits below the header
   * - `none`: fully transparent, no border — used by tab landing screens that blend with content
   */
  fill?: Fill;
  /**
   * Title typography variant. Tab landing screens (Home, Explore, Notifications)
   * use `headingLg`; nested screens with a back button use the smaller `headingSm`.
   */
  titleVariant?: TitleVariant;
}

const HEADER_BAR_HEIGHT = 56;

/**
 * Header bar that hides on scroll-down and reappears on scroll-up.
 * Use with the `useCollapsingHeader` hook — pass its `headerAnimatedStyle`
 * to `animatedStyle`, and its `scrollHandler` to your scrollable.
 *
 * Renders absolutely positioned over the screen, so the scrollable beneath
 * needs `paddingTop: headerHeight` from the same hook.
 */
export function CollapsingHeader({
  title,
  right,
  onBack,
  backFallback,
  hideBack,
  animatedStyle,
  children,
  fill = 'translucent',
  titleVariant = 'headingSm',
}: CollapsingHeaderProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const handleBack = onBack ?? (() => safeGoBack(backFallback));

  const fillStyles =
    fill === 'solid'
      ? { backgroundColor: colors.surface }
      : fill === 'none'
        ? { backgroundColor: 'transparent' as const }
        : {
            backgroundColor: withAlpha(colors.surface, 0.92),
            borderBottomWidth: 1,
            borderBottomColor: withAlpha(colors.outline, 0.08),
          };

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          paddingTop: insets.top,
          zIndex: 10,
        },
        fillStyles,
        animatedStyle,
      ]}
    >
      <View
        style={{
          height: HEADER_BAR_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: HORIZONTAL_PADDING,
          gap: spacing[2],
        }}
      >
        {!hideBack && (
          <Pressable
            onPress={handleBack}
            hitSlop={8}
            style={{ padding: spacing[1], marginLeft: -spacing[1] }}
            accessibilityLabel="Back"
            accessibilityRole="button"
          >
            <IconChevronLeft size={24} color={colors.onSurface} />
          </Pressable>
        )}
        {title ? (
          <Text variant={titleVariant} numberOfLines={1} style={{ flex: 1 }}>
            {title}
          </Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {right}
      </View>
      {children}
    </Animated.View>
  );
}

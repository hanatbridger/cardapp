import React, { useRef } from 'react';
import { Pressable, Platform, View } from 'react-native';
import { useDebugEvents } from '../dev/debug-events';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import * as Haptics from 'expo-haptics';
import { IconTrash } from '@tabler/icons-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { spacing } from '../theme/tokens';
import { CARD_BORDER_RADIUS } from '../constants/layout';

/**
 * Swipe-left-to-reveal-delete row wrapper, iOS-Mail style.
 *
 * The previous watchlist-removal flow forced users to open the card
 * detail screen and toggle the heart icon — three taps for what's
 * normally a one-gesture interaction. This component fixes that by
 * wrapping any row in a horizontal pan gesture that reveals a red
 * destructive panel on the right side. Tapping the panel calls
 * `onDelete`. The pan won't compete with vertical FlatList scroll —
 * react-native-gesture-handler's PanGesture defers to vertical
 * native scroll automatically.
 *
 * Requires GestureHandlerRootView wrapping the app root (set up in
 * app/_layout.tsx).
 */

const DELETE_WIDTH = 88;

interface SwipeToDeleteProps {
  /** Called when the user confirms the delete action. */
  onDelete: () => void;
  children: React.ReactNode;
  /** Accessibility label for the destructive button. */
  deleteAccessibilityLabel?: string;
}

/**
 * The reveal panel rendered to the right of the row. Lives in its
 * own component so `useAnimatedStyle` is called unconditionally —
 * if it lived inside `renderRightActions`, the hook would be a
 * conditional call (called only when the swipe is open) and React
 * would flag it.
 */
function DeleteAction({
  progress,
  onPress,
  accessibilityLabel,
}: {
  progress: SharedValue<number>;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const { colors } = useTheme();

  // Slide the action in from the right edge as the swipe progresses
  // from 0 (closed) to 1 (fully revealed). Without this the panel
  // would just fade in place; sliding feels native.
  const animStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      progress.value,
      [0, 1],
      [DELETE_WIDTH, 0],
      Extrapolation.CLAMP,
    );
    return { transform: [{ translateX }] };
  });

  return (
    <Animated.View
      style={[
        {
          width: DELETE_WIDTH,
          backgroundColor: colors.danger,
          borderRadius: CARD_BORDER_RADIUS,
          marginLeft: spacing[2],
          overflow: 'hidden',
        },
        animStyle,
      ]}
    >
      <Pressable
        onPress={onPress}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <IconTrash size={24} color={colors.onPrimary} strokeWidth={2} />
      </Pressable>
    </Animated.View>
  );
}

export function SwipeToDelete({
  onDelete,
  children,
  deleteAccessibilityLabel = 'Remove from watchlist',
}: SwipeToDeleteProps) {
  const swipeableRef = useRef<SwipeableMethods>(null);
  const logDebug = useDebugEvents((s) => s.log);

  const handleDelete = () => {
    // Warning haptic on destructive confirmation — matches iOS
    // pattern across Mail / Notes / Reminders. Wrapped in try
    // because expo-haptics throws on web.
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
        () => {},
      );
    }
    swipeableRef.current?.close();
    onDelete();
  };

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={40}
      // overshootRight=false prevents rubber-banding past the panel
      // width, which made the row feel loose. With it off the swipe
      // resists past full reveal — same as iOS Mail.
      overshootRight={false}
      // Pan must travel at least 20px horizontally before it
      // activates as a swipe. Default is 10, which on iOS is
      // aggressive enough that a slight finger drift during a tap
      // can promote the touch to a pan and steal it from the inner
      // RectButton. 20 gives the tap clear priority while still
      // feeling responsive once the user actually intends to swipe.
      dragOffsetFromRightEdge={20}
      dragOffsetFromLeftEdge={20}
      renderRightActions={(progress) => (
        <DeleteAction
          progress={progress}
          onPress={handleDelete}
          accessibilityLabel={deleteAccessibilityLabel}
        />
      )}
      onSwipeableWillOpen={() =>
        logDebug({ source: 'SwipeToDelete', type: 'onSwipeableWillOpen' })
      }
      onSwipeableOpen={() =>
        logDebug({ source: 'SwipeToDelete', type: 'onSwipeableOpen' })
      }
    >
      {/* Diagnostic-only outer touch wrapper — records the very first
          touch event entering the row, even if gesture-handler later
          claims (and possibly swallows) it. If we see this fire but
          no RectButton.active=true follows, the swipe gesture is
          eating taps. */}
      <View
        onTouchStart={() =>
          logDebug({ source: 'SwipeToDelete', type: 'outerView.onTouchStart' })
        }
        onTouchEnd={() =>
          logDebug({ source: 'SwipeToDelete', type: 'outerView.onTouchEnd' })
        }
      >
        {children}
      </View>
    </ReanimatedSwipeable>
  );
}

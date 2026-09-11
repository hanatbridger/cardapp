import React, { useEffect, useRef } from 'react';
import {
  View,
  Pressable,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  BackHandler,
  StyleSheet,
  type DimensionValue,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconX } from '@tabler/icons-react-native';
import { Text } from './Text';
import { Portal } from './Portal';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius, shadows } from '../theme/tokens';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Omit for a headerless sheet (the handle bar still renders). */
  title?: string;
  children: React.ReactNode;
  /** Runs once the entry animation lands — e.g. to focus a field. */
  onOpened?: () => void;
  /**
   * Fixed sheet height, for sheets whose content scrolls (a list). The
   * default sizes to content. Children get `flex: 1` to fill it.
   */
  height?: DimensionValue;
}

const ENTER_MS = 260;
const EXIT_MS = 220;

/**
 * The one overlay primitive. Every sheet in the app — form sheets, pickers,
 * the coming-soon panel, the watchlist-full upsell — renders through this
 * so they all open the same way: backdrop fades, sheet slides up from the
 * bottom edge, on the UI thread.
 *
 * Renders through `Portal` rather than RN's `Modal`. Modal's native
 * presentation is asynchronous on Fabric and visibly late on first open;
 * see Portal.tsx. Layout animations (`entering`/`exiting`) replace the old
 * hand-driven Animated values, so the slide starts on the sheet's first
 * frame instead of racing a presentation we could not observe.
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  onOpened,
  height,
}: BottomSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const onOpenedRef = useRef(onOpened);
  onOpenedRef.current = onOpened;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!visible) {
      // Without this the keyboard stays up over the sheet for the whole
      // exit and hides the slide-down entirely.
      Keyboard.dismiss();
      return;
    }
    // Modal used to give us hardware-back and Escape for free.
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      onCloseRef.current();
      return true;
    });
    let onKey: ((e: KeyboardEvent) => void) | null = null;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      onKey = (e) => {
        if (e.key === 'Escape') onCloseRef.current();
      };
      document.addEventListener('keydown', onKey);
    }
    return () => {
      back.remove();
      if (onKey) document.removeEventListener('keydown', onKey);
    };
  }, [visible]);

  if (!visible) return null;

  const fireOpened = () => onOpenedRef.current?.();

  return (
    <Portal>
      {/* accessibilityViewIsModal: VoiceOver treats the sheet as the only
          content on screen, as Modal did. */}
      <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
        {/* Backdrop is a sibling, not an ancestor, so its fade never bleeds
            into the sheet. */}
        <Animated.View
          entering={FadeIn.duration(ENTER_MS)}
          exiting={FadeOut.duration(EXIT_MS)}
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {/* No accessibilityRole here: on web a role="button" Pressable
              renders <button>, and the sheet's own buttons inside it would
              be nested buttons (invalid HTML, hydration error). */}
          <Pressable style={{ flex: 1, justifyContent: 'flex-end' }} onPress={onClose}>
            <Animated.View
              entering={SlideInDown.duration(ENTER_MS)
                .easing(Easing.out(Easing.cubic))
                .withCallback((finished) => {
                  'worklet';
                  // Callers focus inputs here, only once the sheet has
                  // landed. Raising the keyboard mid-slide makes
                  // KeyboardAvoidingView shove the sheet, which reads as a
                  // jump.
                  if (finished) runOnJS(fireOpened)();
                })}
              exiting={SlideOutDown.duration(EXIT_MS).easing(Easing.in(Easing.cubic))}
              style={height !== undefined ? { height } : undefined}
            >
              <Pressable
                onPress={(e) => e.stopPropagation()}
                style={{
                  flex: height !== undefined ? 1 : undefined,
                  backgroundColor: colors.surface,
                  borderTopLeftRadius: radius['2xl'],
                  borderTopRightRadius: radius['2xl'],
                  padding: spacing[5],
                  // Clear the home indicator; Modal's spacer used to guess.
                  paddingBottom: Math.max(insets.bottom, spacing[4]) + spacing[2],
                  gap: spacing[4],
                  ...shadows.xl,
                }}
              >
                {/* Handle bar */}
                <View style={{ alignItems: 'center' }}>
                  <View
                    style={{
                      width: 36,
                      height: 4,
                      borderRadius: radius.full,
                      backgroundColor: colors.outline,
                    }}
                  />
                </View>

                {title ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text variant="headingSm">{title}</Text>
                    <Pressable
                      onPress={onClose}
                      hitSlop={8}
                      accessibilityLabel="Close"
                      accessibilityRole="button"
                    >
                      <IconX size={20} color={colors.onSurfaceMuted} />
                    </Pressable>
                  </View>
                ) : null}

                {height !== undefined ? (
                  <View style={{ flex: 1, gap: spacing[4] }}>{children}</View>
                ) : (
                  children
                )}
              </Pressable>
            </Animated.View>
          </Pressable>
        </KeyboardAvoidingView>
      </View>
    </Portal>
  );
}

import React, { useEffect, useMemo, useRef } from 'react';
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
import { useNavigation } from 'expo-router';
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
  const navigation = useNavigation();
  const onOpenedRef = useRef(onOpened);
  onOpenedRef.current = onOpened;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Built once: fresh builders every render made Reanimated re-serialize
  // both configs to the UI runtime on each keystroke inside a form sheet.
  const anim = useMemo(() => {
    const fireOpened = () => onOpenedRef.current?.();
    return {
      backdropIn: FadeIn.duration(ENTER_MS),
      backdropOut: FadeOut.duration(EXIT_MS),
      sheetIn: SlideInDown.duration(ENTER_MS)
        .easing(Easing.out(Easing.cubic))
        .withCallback((finished) => {
          'worklet';
          // Callers focus inputs here, only once the sheet has landed.
          // Raising the keyboard mid-slide makes KeyboardAvoidingView
          // shove the sheet, which reads as a jump.
          if (finished) runOnJS(fireOpened)();
        }),
      sheetOut: SlideOutDown.duration(EXIT_MS).easing(Easing.in(Easing.cubic)),
    };
  }, []);

  // Dismiss only on an open → closed transition. Running it whenever the
  // sheet is hidden also fired on MOUNT, so a hidden sheet mounting under
  // another sheet (card detail mounts several) killed that sheet's
  // keyboard mid-typing.
  const wasVisible = useRef(visible);
  useEffect(() => {
    // Without this the keyboard stays up over the sheet for the whole
    // exit and hides the slide-down entirely.
    if (wasVisible.current && !visible) Keyboard.dismiss();
    wasVisible.current = visible;
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    // The sheet renders in the root PortalHost, outside its screen. A
    // navigation away while it is open (a notification tap, a deep link)
    // would leave it over the next screen, and once react-native-screens
    // freezes the blurred screen its state updates stop committing, so
    // the sheet could never close. Close it as its screen loses focus —
    // blur fires at the start of the transition, before the freeze.
    const unsubscribeBlur = navigation.addListener('blur', () => onCloseRef.current());
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
      unsubscribeBlur();
      back.remove();
      if (onKey) document.removeEventListener('keydown', onKey);
    };
  }, [visible, navigation]);

  if (!visible) return null;

  return (
    <Portal>
      {/* VoiceOver's two-finger scrub closes the sheet, as it would a
          native modal. Modality itself is set on the PortalHost, whose
          sibling is the navigator. */}
      <View style={StyleSheet.absoluteFill} onAccessibilityEscape={onClose}>
        {/* Backdrop is a sibling, not an ancestor, so its fade never bleeds
            into the sheet. */}
        <Animated.View
          entering={anim.backdropIn}
          exiting={anim.backdropOut}
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {/* accessible={false} on both Pressables: a Pressable is an
              accessibility element by default, which on iOS collapses
              everything inside it into ONE element — VoiceOver could not
              reach a single row or button. No role either: on web a
              role="button" renders <button>, and the sheet's own buttons
              inside it would be nested buttons. */}
          <Pressable
            accessible={false}
            style={{ flex: 1, justifyContent: 'flex-end' }}
            onPress={onClose}
          >
            <Animated.View
              entering={anim.sheetIn}
              exiting={anim.sheetOut}
              style={height !== undefined ? { height } : undefined}
            >
              <Pressable
                accessible={false}
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
                    <Text variant="headingSm" accessibilityRole="header">
                      {title}
                    </Text>
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

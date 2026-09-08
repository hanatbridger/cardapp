import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Animated,
  Easing,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { IconX } from '@tabler/icons-react-native';
import { Text } from './Text';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius, shadows } from '../theme/tokens';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Runs once the entry animation lands — e.g. to focus a field. */
  onOpened?: () => void;
}

/**
 * Form-style bottom sheet: handle bar, title + close, then whatever the
 * caller stacks inside (gap spacing[4]). Wraps a KeyboardAvoidingView so
 * inputs stay above the keyboard. PriceAlertModal and GradingAlertModal
 * are the consumers; CurrencyPickerModal keeps its own taller variant.
 */
export function BottomSheet({ visible, onClose, title, children, onOpened }: BottomSheetProps) {
  const { colors } = useTheme();
  const { height: windowHeight } = useWindowDimensions();

  // The sheet drives its own entry/exit (Modal animationType="none") so the
  // backdrop can FADE while the sheet SLIDES. RN's built-in "slide" drags
  // the backdrop up with the sheet because it is a child of the same view.
  // `mounted` keeps the Modal alive until the exit animation lands.
  const [mounted, setMounted] = useState(visible);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(windowHeight)).current;
  const onOpenedRef = useRef(onOpened);
  onOpenedRef.current = onOpened;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      backdropOpacity.setValue(0);
      sheetTranslateY.setValue(windowHeight);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        // Callers focus inputs here, only once the sheet has landed.
        // Raising the keyboard while the sheet is still travelling makes
        // KeyboardAvoidingView shove it mid-animation, which reads as a
        // jump.
        if (finished) onOpenedRef.current?.();
      });
      return;
    }
    if (!mounted) return;
    // Without this the keyboard stays up over the sheet for the whole exit
    // and hides the slide-down entirely.
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: windowHeight,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
    // `windowHeight`/`mounted` are read at animation time only — listing them
    // would restart the entry animation on rotation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        {/* Backdrop is a sibling, not an ancestor, so its opacity animation
            never bleeds into the sheet. */}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: colors.scrim, opacity: backdropOpacity },
          ]}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <Pressable
            style={{ flex: 1, justifyContent: 'flex-end' }}
            onPress={onClose}
          >
            <Animated.View style={{ transform: [{ translateY: sheetTranslateY }] }}>
              <Pressable
                onPress={(e) => e.stopPropagation()}
                style={{
                  backgroundColor: colors.surface,
                  borderTopLeftRadius: radius['2xl'],
                  borderTopRightRadius: radius['2xl'],
                  padding: spacing[5],
                  gap: spacing[4],
                  ...shadows.xl,
                }}
              >
                {/* Handle bar */}
                <View style={{ alignItems: 'center' }}>
                  <View style={{ width: 36, height: 4, borderRadius: radius.full, backgroundColor: colors.outline }} />
                </View>

                {/* Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text variant="headingSm">{title}</Text>
                  <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close" accessibilityRole="button">
                    <IconX size={20} color={colors.onSurfaceMuted} />
                  </Pressable>
                </View>

                {children}

                {/* Bottom spacing for safe area */}
                <View style={{ height: spacing[4] }} />
              </Pressable>
            </Animated.View>
          </Pressable>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Animated,
  Easing,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { IconX, IconTrash } from '@tabler/icons-react-native';
import { Text } from './Text';
import { Button } from './Button';
import { SegmentedControl } from './SegmentedControl';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius, shadows, typography } from '../theme/tokens';
import type { PriceAlert } from '../stores/alerts-store';

interface PriceAlertModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (type: 'above' | 'below', price: number) => void;
  cardName: string;
  currentPrice?: number;
  /** When set, the modal opens in edit mode — prefilled from this alert. */
  existingAlert?: PriceAlert;
  /** Remove the existing alert. Only rendered when editing. */
  onRemove?: () => void;
}

// Default target when creating a fresh alert: ±10% off current price,
// nudging the user toward a sensible threshold instead of a blank field.
function defaultTarget(type: 0 | 1, currentPrice?: number): string {
  if (!currentPrice) return '';
  return (type === 0 ? currentPrice * 1.1 : currentPrice * 0.9).toFixed(0);
}

export function PriceAlertModal({
  visible,
  onClose,
  onSubmit,
  cardName,
  currentPrice,
  existingAlert,
  onRemove,
}: PriceAlertModalProps) {
  const { colors } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const isEditing = Boolean(existingAlert);
  const [alertType, setAlertType] = useState<0 | 1>(0); // 0 = above, 1 = below
  const [priceInput, setPriceInput] = useState('');
  const [error, setError] = useState('');
  const priceInputRef = useRef<TextInput>(null);

  // The sheet drives its own entry/exit (Modal animationType="none") so the
  // backdrop can FADE while the sheet SLIDES. RN's built-in "slide" drags
  // the backdrop up with the sheet because it is a child of the same view.
  // `mounted` keeps the Modal alive until the exit animation lands.
  const [mounted, setMounted] = useState(visible);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(windowHeight)).current;

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
        // Focus only once the sheet has landed. Raising the keyboard while
        // the sheet is still travelling makes KeyboardAvoidingView shove it
        // mid-animation, which reads as a jump.
        if (finished) priceInputRef.current?.focus();
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

  // Re-seed the form whenever the sheet opens. In edit mode prefill from
  // the existing rule; otherwise fall back to the ±10% default. Keyed on
  // `visible` so reopening always reflects current props rather than the
  // stale state from the previous open.
  useEffect(() => {
    if (!visible) return;
    if (existingAlert) {
      const t = existingAlert.type === 'above' ? 0 : 1;
      setAlertType(t);
      setPriceInput(String(existingAlert.targetPrice));
    } else {
      setAlertType(0);
      setPriceInput(defaultTarget(0, currentPrice));
    }
    setError('');
  }, [visible, existingAlert, currentPrice]);

  const handleSubmit = () => {
    const price = parseFloat(priceInput);
    if (isNaN(price) || price <= 0) {
      setError('Please enter a valid price');
      return;
    }
    setError('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSubmit(alertType === 0 ? 'above' : 'below', price);
    onClose();
  };

  const handleRemove = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onRemove?.();
  };

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
                  <Text variant="headingSm">{isEditing ? 'Edit Price Alert' : 'Set Price Alert'}</Text>
                  <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close" accessibilityRole="button">
                    <IconX size={20} color={colors.onSurfaceMuted} />
                  </Pressable>
                </View>

                <Text variant="bodySm" color={colors.onSurfaceVariant}>
                  Get notified when {cardName} goes {alertType === 0 ? 'above' : 'below'} your target price.
                </Text>

                {/* Alert type */}
                <SegmentedControl
                  options={['Above', 'Below']}
                  selected={alertType}
                  onSelect={(i) => {
                    const t = (i === 0 ? 0 : 1) as 0 | 1;
                    setAlertType(t);
                    // Only auto-fill the default when creating; while editing,
                    // keep whatever target the user already had.
                    if (!isEditing && currentPrice) {
                      setPriceInput(defaultTarget(t, currentPrice));
                    }
                  }}
                />

                {/* Price input */}
                <View style={{ gap: spacing[1] }}>
                  {/* Alerts are stored and matched in USD regardless of the
                      user's display currency — label it so the unit is clear. */}
                  <Text variant="labelLg">Target Price (USD)</Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      height: 48,
                      borderWidth: 1,
                      borderColor: error ? colors.danger : colors.outline,
                      borderRadius: radius.lg,
                      paddingHorizontal: spacing[4],
                      gap: spacing[1],
                    }}
                  >
                    <Text variant="headingSm" color={colors.onSurfaceMuted}>$</Text>
                    <TextInput
                      ref={priceInputRef}
                      value={priceInput}
                      onChangeText={setPriceInput}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={colors.onSurfaceMuted}
                      style={{
                        flex: 1,
                        fontSize: typography.headingMd.fontSize,
                        fontWeight: '600',
                        color: colors.onSurface,
                        padding: 0,
                      }}
                    />
                  </View>
                  {error ? (
                    <Text variant="caption" color={colors.danger}>{error}</Text>
                  ) : currentPrice ? (
                    <Text variant="caption" color={colors.onSurfaceMuted}>
                      Current price: ${currentPrice.toFixed(2)}
                    </Text>
                  ) : null}
                </View>

                {/* Submit */}
                <Button
                  variant="filled"
                  fullWidth
                  size="lg"
                  onPress={handleSubmit}
                >
                  {isEditing ? 'Update Alert' : 'Set Alert'}
                </Button>

                {/* Remove — edit mode only */}
                {isEditing && onRemove ? (
                  <Button
                    variant="ghost"
                    fullWidth
                    size="lg"
                    icon={<IconTrash size={18} color={colors.danger} />}
                    onPress={handleRemove}
                  >
                    Remove Alert
                  </Button>
                ) : null}

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

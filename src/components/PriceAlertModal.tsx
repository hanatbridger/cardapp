import React, { useEffect, useState } from 'react';
import { View, Modal, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { IconX, IconTrash } from '@tabler/icons-react-native';
import { Text } from './Text';
import { Button } from './Button';
import { SegmentedControl } from './SegmentedControl';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius, shadows, typography } from '../theme/tokens';
import { withAlpha } from '../utils/withAlpha';
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
  const isEditing = Boolean(existingAlert);
  const [alertType, setAlertType] = useState<0 | 1>(0); // 0 = above, 1 = below
  const [priceInput, setPriceInput] = useState('');
  const [error, setError] = useState('');

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
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: withAlpha(colors.onSurface, 0.5), justifyContent: 'flex-end' }}
          onPress={onClose}
        >
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
              <Text variant="labelLg">Target Price</Text>
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
                  autoFocus
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
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

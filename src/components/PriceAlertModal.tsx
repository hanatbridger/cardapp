import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput } from 'react-native';
import { IconTrash } from '@tabler/icons-react-native';
import { Haptics } from '../utils/haptics';
import { Text } from './Text';
import { Button } from './Button';
import { BottomSheet } from './BottomSheet';
import { SegmentedControl } from './SegmentedControl';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius, typography } from '../theme/tokens';
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
  const [isEditing, setIsEditing] = useState(false);
  const [alertType, setAlertType] = useState<0 | 1>(0); // 0 = above, 1 = below
  const [priceInput, setPriceInput] = useState('');
  const [error, setError] = useState('');
  const priceInputRef = useRef<TextInput>(null);
  // Open/closed edge, whether the user has typed a target yet, and the
  // frozen mode — the last mirrors `isEditing` because the effect below has
  // to read it in the same commit that sets it.
  const wasOpen = useRef(false);
  const dirty = useRef(false);
  const editing = useRef(false);

  // Seed the form on the OPEN edge only, and freeze edit/create mode for as
  // long as the sheet stays open. `existingAlert` vanishes the moment the
  // rule fires — the 60s sweep marks it triggered — so re-seeding while open
  // would wipe the target being typed and flip the sheet to create mode.
  useEffect(() => {
    if (visible && !wasOpen.current) {
      dirty.current = false;
      editing.current = Boolean(existingAlert);
      setIsEditing(editing.current);
      if (existingAlert) {
        setAlertType(existingAlert.type === 'above' ? 0 : 1);
        setPriceInput(String(existingAlert.targetPrice));
      } else {
        setAlertType(0);
        setPriceInput(defaultTarget(0, currentPrice));
      }
      setError('');
    } else if (visible && !editing.current && !dirty.current && currentPrice) {
      // The price can settle after the sheet opened (opening right after a
      // grade switch does that). Fill the suggested target then, but never
      // over something the user typed.
      setPriceInput(defaultTarget(alertType, currentPrice));
    }
    wasOpen.current = visible;
  }, [visible, existingAlert, currentPrice, alertType]);

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
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={isEditing ? 'Edit Price Alert' : 'Set Price Alert'}
      onOpened={() => priceInputRef.current?.focus()}
    >
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
            onChangeText={(t) => {
              dirty.current = true;
              setPriceInput(t);
            }}
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
    </BottomSheet>
  );
}

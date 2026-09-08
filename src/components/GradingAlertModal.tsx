import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, Platform } from 'react-native';
import { IconTrash } from '@tabler/icons-react-native';
import { Haptics } from '../utils/haptics';
import { Text } from './Text';
import { Button } from './Button';
import { BottomSheet } from './BottomSheet';
import { SegmentedControl } from './SegmentedControl';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius, typography } from '../theme/tokens';
import {
  CONDITION_LABELS,
  formatSignedUsd,
  type CardCondition,
  type GradingAlertDirection,
} from '../services/grading-verdict';
import type { GradingAlert } from '../stores/alerts-store';

interface GradingAlertModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (direction: GradingAlertDirection, thresholdNet: number) => void;
  cardName: string;
  /** Condition the verdict card is currently set to — baked into the rule. */
  condition: CardCondition;
  /** Expected net right now at `condition`, USD. Seeds the default direction. */
  currentNet: number;
  /** When set, the modal opens in edit mode — prefilled from this alert. */
  existingAlert?: GradingAlert;
  /** Remove the existing alert. Only rendered when editing. */
  onRemove?: () => void;
}

// 0 = above (becomes worth grading), 1 = below (stops being worth it).
type DirectionIndex = 0 | 1;
const DIRECTIONS: GradingAlertDirection[] = ['above', 'below'];

/**
 * "Alert me when this flips" — arms a grading-ROI alert on the card's
 * expected net after fees. The line defaults to break-even (0); a user
 * who only wants to hear about a comfortable margin can raise it.
 * Thresholds are USD like every other alert.
 */
export function GradingAlertModal({
  visible,
  onClose,
  onSubmit,
  cardName,
  condition,
  currentNet,
  existingAlert,
  onRemove,
}: GradingAlertModalProps) {
  const { colors } = useTheme();
  const isEditing = Boolean(existingAlert);
  const [directionIndex, setDirectionIndex] = useState<DirectionIndex>(0);
  const [thresholdInput, setThresholdInput] = useState('0');
  const [error, setError] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Re-seed on every open. Edit mode prefills from the rule; otherwise
  // the default direction is whichever way the verdict can still flip
  // from where it stands today.
  useEffect(() => {
    if (!visible) return;
    if (existingAlert) {
      setDirectionIndex(existingAlert.direction === 'above' ? 0 : 1);
      setThresholdInput(String(existingAlert.thresholdNet));
    } else {
      setDirectionIndex(currentNet >= 0 ? 1 : 0);
      setThresholdInput('0');
    }
    setError('');
  }, [visible, existingAlert, currentNet]);

  const direction = DIRECTIONS[directionIndex];
  const conditionLabel = CONDITION_LABELS[condition];

  const handleSubmit = () => {
    const threshold = Number(thresholdInput.trim().replace(/^\+/, ''));
    if (thresholdInput.trim() === '' || !Number.isFinite(threshold)) {
      setError('Enter a dollar amount (0 = break-even)');
      return;
    }
    setError('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSubmit(direction, threshold);
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
      title={isEditing ? 'Edit Grading Alert' : 'Grading Alert'}
      onOpened={() => inputRef.current?.focus()}
    >
      <Text variant="bodySm" color={colors.onSurfaceVariant}>
        Get notified when {cardName} at {conditionLabel}{' '}
        {direction === 'above' ? 'becomes worth grading' : 'stops being worth grading'} — when the
        expected value after fees {direction === 'above' ? 'reaches' : 'drops under'} your line.
      </Text>

      <SegmentedControl
        options={['Becomes worth it', 'Stops being worth it']}
        selected={directionIndex}
        onSelect={(i) => setDirectionIndex(i === 0 ? 0 : 1)}
      />

      {/* Threshold input — expected net, not a price, so negatives are
          legal (an "almost break-even" line). */}
      <View style={{ gap: spacing[1] }}>
        <Text variant="labelLg">Expected value line (USD)</Text>
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
            ref={inputRef}
            value={thresholdInput}
            onChangeText={setThresholdInput}
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
            placeholder="0"
            placeholderTextColor={colors.onSurfaceMuted}
            accessibilityLabel="Expected value line in US dollars"
            style={{
              flex: 1,
              fontSize: typography.headingMd.fontSize,
              fontWeight: '500',
              color: colors.onSurface,
              padding: 0,
            }}
          />
        </View>
        {error ? (
          <Text variant="caption" color={colors.danger}>{error}</Text>
        ) : (
          <Text variant="caption" color={colors.onSurfaceMuted}>
            Now {formatSignedUsd(currentNet)} at {conditionLabel}. 0 is break-even after the
            grading fee.
          </Text>
        )}
      </View>

      <Button variant="filled" fullWidth size="lg" onPress={handleSubmit}>
        {isEditing ? 'Update Alert' : 'Set Alert'}
      </Button>

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

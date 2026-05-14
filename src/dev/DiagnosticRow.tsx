import React from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Text } from '../components';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius } from '../theme/tokens';
import type { DiagnosticCard } from './diagnostic-data';

/**
 * Single tappable row used across all diagnostic screens. Pressable
 * onPress fires a caller-provided `onTap` (for the counter) and
 * router.push to /card/{cardId} (for the navigation check).
 *
 * Kept deliberately plain — no animation, no haptics, no extra
 * gesture handlers — so the only variables across diagnostic
 * screens are the wrappers around this row.
 */
export function DiagnosticRow({
  card,
  onTap,
}: {
  card: DiagnosticCard;
  onTap: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => {
        onTap();
        router.push(`/card/${card.cardId}` as any);
      }}
      style={({ pressed }) => ({
        padding: spacing[4],
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.outline,
        backgroundColor: pressed ? colors.surfaceVariant : colors.surface,
        gap: spacing[1],
      })}
      accessibilityRole="button"
    >
      <Text variant="labelLg">{card.cardName}</Text>
      <Text variant="caption" color={colors.onSurfaceVariant}>
        {card.setName}
      </Text>
    </Pressable>
  );
}

export function TapCounterBanner({ count }: { count: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        padding: spacing[3],
        backgroundColor: colors.primaryContainer,
        borderRadius: radius.md,
      }}
    >
      <Text variant="labelLg" color={colors.primary}>
        Tap counter: {count}
      </Text>
      <Text variant="caption" color={colors.onSurfaceVariant}>
        If a row tap doesn't increment this, the touch was eaten before Pressable
        fired. If this increments but no detail screen opens, the router silently
        failed.
      </Text>
    </View>
  );
}

import React from 'react';
import { View, Pressable, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Text } from './Text';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius, shadows } from '../theme/tokens';

interface SegmentedControlProps {
  options: string[];
  selected: number;
  onSelect: (index: number) => void;
  /**
   * Indices that are non-selectable. They render dimmed, can't activate
   * the selection ring, and route taps to `onDisabledPress` instead of
   * `onSelect`. Used today to gate PSA 10 (graded prices ship after
   * the eBay live proxy is live).
   */
  disabledIndices?: number[];
  /** Tiny right-aligned label rendered next to a disabled option (e.g. "Soon"). */
  disabledBadge?: string;
  onDisabledPress?: (index: number) => void;
}

export function SegmentedControl({
  options,
  selected,
  onSelect,
  disabledIndices,
  disabledBadge,
  onDisabledPress,
}: SegmentedControlProps) {
  const { colors, glass } = useTheme();
  const disabled = new Set(disabledIndices ?? []);

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: glass.background,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: glass.border,
        padding: spacing['0.5'],
        ...(Platform.OS === 'web'
          ? { backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' } as any
          : {}),
      }}
    >
      {options.map((option, i) => {
        const isDisabled = disabled.has(i);
        const isActive = i === selected && !isDisabled;
        return (
          <Pressable
            key={option}
            onPress={() => {
              if (isDisabled) {
                onDisabledPress?.(i);
                return;
              }
              Haptics.selectionAsync();
              onSelect(i);
            }}
            // No `disabled` prop on Pressable — we still want the tap
            // to fire so the caller can show a "coming soon" toast.
            style={{
              flex: 1,
              paddingVertical: spacing[2] + 2,
              borderRadius: radius.lg,
              backgroundColor: isActive ? colors.surface : 'transparent',
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: spacing[1] + 2,
              opacity: isDisabled ? 0.55 : 1,
              ...(isActive ? shadows.sm : {}),
            }}
          >
            <Text
              variant="labelLg"
              color={isActive ? colors.onSurface : colors.onSurfaceMuted}
              style={{ fontWeight: isActive ? '600' : '400' }}
            >
              {option}
            </Text>
            {isDisabled && disabledBadge && (
              <View
                style={{
                  paddingHorizontal: spacing[1] + 2,
                  paddingVertical: 1,
                  borderRadius: radius.full,
                  backgroundColor: colors.surfaceVariant,
                  borderWidth: 1,
                  borderColor: colors.outlineVariant,
                }}
              >
                <Text
                  variant="labelSm"
                  color={colors.onSurfaceMuted}
                  style={{ fontSize: 10, lineHeight: 12 }}
                >
                  {disabledBadge}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

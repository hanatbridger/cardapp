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
}

export function SegmentedControl({ options, selected, onSelect }: SegmentedControlProps) {
  const { colors, glass } = useTheme();

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
        const isActive = i === selected;
        return (
          <Pressable
            key={option}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(i);
            }}
            style={{
              flex: 1,
              paddingVertical: spacing[2] + 2,
              borderRadius: radius.lg,
              backgroundColor: isActive ? colors.surface : 'transparent',
              alignItems: 'center',
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
          </Pressable>
        );
      })}
    </View>
  );
}

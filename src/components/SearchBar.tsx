import React, { forwardRef } from 'react';
import { View, TextInput, Pressable, Platform } from 'react-native';
import { IconSearch, IconX } from '@tabler/icons-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius, typography } from '../theme/tokens';
import { MIN_TOUCH_TARGET } from '../constants/layout';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

/**
 * SearchBar forwards its ref to the underlying TextInput so parents can
 * call `.blur()` / `.focus()` imperatively — needed for the X-style
 * Cancel button on the Explore tab.
 */
export const SearchBar = forwardRef<TextInput, SearchBarProps>(function SearchBar(
  {
    value,
    onChangeText,
    placeholder = 'Search Pokemon cards...',
    onSubmit,
    autoFocus = false,
    onFocus,
    onBlur,
  },
  ref,
) {
  const { colors, glass } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: MIN_TOUCH_TARGET + 4,
        backgroundColor: glass.background,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: glass.border,
        paddingHorizontal: spacing[4],
        gap: spacing[2],
        ...(Platform.OS === 'web'
          ? { backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' } as any
          : {}),
      }}
    >
      <IconSearch size={18} color={colors.onSurfaceMuted} />
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.onSurfaceMuted}
        onSubmitEditing={onSubmit}
        onFocus={onFocus}
        onBlur={onBlur}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        style={{
          flex: 1,
          fontSize: typography.bodyMd.fontSize,
          color: colors.onSurface,
          padding: 0,
        }}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={8} accessibilityLabel="Clear search" accessibilityRole="button">
          <IconX size={18} color={colors.onSurfaceMuted} />
        </Pressable>
      )}
    </View>
  );
});

import React, { useEffect, useMemo, useState } from 'react';
import { View, Pressable, FlatList } from 'react-native';
import { IconCheck } from '@tabler/icons-react-native';
import { Text } from './Text';
import { SearchBar } from './SearchBar';
import { BottomSheet } from './BottomSheet';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius } from '../theme/tokens';
import {
  ALL_CURRENCY_CODES,
  POPULAR_CODES,
  currencyMeta,
} from '../constants/currencies';

interface CurrencyPickerModalProps {
  visible: boolean;
  selected: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}

// Popular currencies first, the rest alphabetically.
const ORDERED: string[] = [
  ...POPULAR_CODES,
  ...ALL_CURRENCY_CODES.filter((c) => !POPULAR_CODES.includes(c)).sort(),
];

/**
 * Bottom-sheet currency picker — a scrollable, searchable tray of every
 * currency the app can convert into. Tap a row to select and dismiss.
 * Fixed at 80% so the list scrolls inside the sheet instead of sizing it.
 */
export function CurrencyPickerModal({
  visible,
  selected,
  onSelect,
  onClose,
}: CurrencyPickerModalProps) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');

  // A stale filter on reopen reads as a bug ("where did USD go?").
  useEffect(() => {
    if (!visible) setQuery('');
  }, [visible]);

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ORDERED;
    return ORDERED.filter((code) => {
      const meta = currencyMeta(code);
      return (
        code.toLowerCase().includes(q) || meta.name.toLowerCase().includes(q)
      );
    });
  }, [query]);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Currency" height="80%">
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search currency or code…" />

      <FlatList
        data={data}
        keyExtractor={(code) => code}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        renderItem={({ item: code }) => {
          const meta = currencyMeta(code);
          const isSel = code === selected;
          return (
            <Pressable
              onPress={() => {
                onSelect(code);
                onClose();
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: isSel }}
              accessibilityLabel={`${meta.name} (${code})`}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing[3],
                paddingHorizontal: spacing[2],
                paddingVertical: spacing[3],
                borderRadius: radius.md,
                backgroundColor: pressed ? colors.surfaceVariant : 'transparent',
              })}
            >
              <View style={{ width: 44, alignItems: 'center' }}>
                <Text variant="labelLg" color={colors.onSurfaceVariant}>
                  {meta.symbol.trim()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMd">{code}</Text>
                <Text variant="caption" color={colors.onSurfaceMuted}>
                  {meta.name}
                </Text>
              </View>
              {isSel && <IconCheck size={20} color={colors.primary} />}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={{ padding: spacing[8], alignItems: 'center' }}>
            <Text variant="bodySm" color={colors.onSurfaceMuted}>No currency matches “{query}”.</Text>
          </View>
        }
      />
    </BottomSheet>
  );
}

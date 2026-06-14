import React, { useMemo, useState } from 'react';
import { View, Modal, Pressable, FlatList } from 'react-native';
import { IconX, IconCheck } from '@tabler/icons-react-native';
import { Text } from './Text';
import { SearchBar } from './SearchBar';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius, shadows } from '../theme/tokens';
import { withAlpha } from '../utils/withAlpha';
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
 */
export function CurrencyPickerModal({
  visible,
  selected,
  onSelect,
  onClose,
}: CurrencyPickerModalProps) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');

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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: withAlpha(colors.onSurface, 0.5),
          justifyContent: 'flex-end',
        }}
      >
        {/* Tap-outside to dismiss */}
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close currency picker" />
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius['2xl'],
            borderTopRightRadius: radius['2xl'],
            height: '80%',
            paddingTop: spacing[3],
            ...shadows.xl,
          }}
        >
          {/* Handle bar */}
          <View style={{ alignItems: 'center', marginBottom: spacing[3] }}>
            <View style={{ width: 36, height: 4, borderRadius: radius.full, backgroundColor: colors.outline }} />
          </View>

          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: spacing[5],
              marginBottom: spacing[3],
            }}
          >
            <Text variant="headingSm">Currency</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close" accessibilityRole="button">
              <IconX size={20} color={colors.onSurfaceMuted} />
            </Pressable>
          </View>

          {/* Search */}
          <View style={{ paddingHorizontal: spacing[5], marginBottom: spacing[2] }}>
            <SearchBar value={query} onChangeText={setQuery} placeholder="Search currency or code…" />
          </View>

          {/* List */}
          <FlatList
            data={data}
            keyExtractor={(code) => code}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: spacing[12] }}
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
                    paddingHorizontal: spacing[5],
                    paddingVertical: spacing[3],
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
        </View>
      </View>
    </Modal>
  );
}

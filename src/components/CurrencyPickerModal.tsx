import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Modal,
  Pressable,
  FlatList,
  Animated,
  Easing,
  StyleSheet,
  useWindowDimensions,
  Keyboard,
} from 'react-native';
import { IconX, IconCheck } from '@tabler/icons-react-native';
import { Text } from './Text';
import { SearchBar } from './SearchBar';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius, shadows } from '../theme/tokens';
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
  const { height: windowHeight } = useWindowDimensions();
  const [query, setQuery] = useState('');

  // Self-animated (Modal animationType="none") so the backdrop FADES while
  // the sheet SLIDES — RN's "slide" drags a child backdrop up with the
  // sheet. `mounted` holds the Modal open until the exit animation lands.
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
      ]).start();
      return;
    }
    if (!mounted) return;
    // The search field can hold the keyboard up; dismiss it first or it
    // covers the sheet through the whole slide-down.
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
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          justifyContent: 'flex-end',
        }}
      >
        {/* Backdrop is a sibling, not an ancestor, so its opacity animation
            never bleeds into the sheet. */}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: colors.scrim, opacity: backdropOpacity },
          ]}
        />
        {/* Tap-outside to dismiss */}
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close currency picker" />
        <Animated.View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius['2xl'],
            borderTopRightRadius: radius['2xl'],
            height: '80%',
            paddingTop: spacing[3],
            transform: [{ translateY: sheetTranslateY }],
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
        </Animated.View>
      </View>
    </Modal>
  );
}

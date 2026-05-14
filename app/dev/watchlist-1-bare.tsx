import React, { useState } from 'react';
import { View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { spacing } from '../../src/theme/tokens';
import { HORIZONTAL_PADDING } from '../../src/constants/layout';
import { SAMPLE_CARDS } from '../../src/dev/diagnostic-data';
import { DiagnosticRow, TapCounterBanner } from '../../src/dev/DiagnosticRow';
import { useTheme } from '../../src/theme/ThemeProvider';

/**
 * Layer 1: Bare baseline.
 *
 * View + SafeAreaView + FlatList + DiagnosticRow(Pressable).
 *
 * NO ScreenBackground, NO TrendingCarousel, NO SwipeToDelete,
 * NO useCardPrice. If taps fail on cold launch HERE, the bug is
 * in FlatList itself or the SafeAreaView/View root.
 */
export default function Bare() {
  const { colors } = useTheme();
  const [tapCount, setTapCount] = useState(0);

  return (
    <>
      <Stack.Screen options={{ title: '1. Bare' }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['bottom']}>
        <FlatList
          data={SAMPLE_CARDS}
          keyExtractor={(item) => item.cardId}
          ListHeaderComponent={
            <View style={{ marginBottom: spacing[3] }}>
              <TapCounterBanner count={tapCount} />
            </View>
          }
          renderItem={({ item }) => (
            <View style={{ marginTop: spacing[2] }}>
              <DiagnosticRow card={item} onTap={() => setTapCount((c) => c + 1)} />
            </View>
          )}
          contentContainerStyle={{ padding: HORIZONTAL_PADDING }}
        />
      </SafeAreaView>
    </>
  );
}

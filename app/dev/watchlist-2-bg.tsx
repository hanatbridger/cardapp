import React, { useState } from 'react';
import { View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { spacing } from '../../src/theme/tokens';
import { HORIZONTAL_PADDING } from '../../src/constants/layout';
import { SAMPLE_CARDS } from '../../src/dev/diagnostic-data';
import { DiagnosticRow, TapCounterBanner } from '../../src/dev/DiagnosticRow';
import { ScreenBackground } from '../../src/components';

/**
 * Layer 2: + ScreenBackground.
 *
 * Adds the animated gradient wrapper. ScreenBackground uses
 * Reanimated `withRepeat(withTiming)` on the UI thread (verified
 * via src/components/ScreenBackground.tsx) and sets
 * `pointerEvents="none"` on the gradient layer — so in theory it
 * cannot capture touches.
 *
 * If taps still register here and break at layer 3 or later, this
 * layer is innocent.
 */
export default function WithBg() {
  const [tapCount, setTapCount] = useState(0);

  return (
    <>
      <Stack.Screen options={{ title: '2. + ScreenBackground' }} />
      <ScreenBackground>
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
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
      </ScreenBackground>
    </>
  );
}

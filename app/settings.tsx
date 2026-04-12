import React from 'react';
import { View, ScrollView, Switch, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import { Text, Card, SegmentedControl, withErrorBoundary } from '../src/components';
import { spacing, radius } from '../src/theme/tokens';
import { withAlpha } from '../src/utils/withAlpha';
import { HORIZONTAL_PADDING } from '../src/constants/layout';
import { useUserStore } from '../src/stores';
import { GRADE_OPTIONS, GRADES } from '../src/constants/grades';

function SettingsScreen() {
  const { colors } = useTheme();
  const { preferences, updatePreference } = useUserStore();

  const themeIndex = ['system', 'light', 'dark'].indexOf(preferences.theme);
  const gradeIndex = GRADE_OPTIONS.indexOf(preferences.defaultGrade);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing[12] }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: HORIZONTAL_PADDING,
            paddingTop: spacing[4],
            paddingBottom: spacing[2],
            gap: spacing[3],
          }}
        >
          <Pressable onPress={() => router.back()} hitSlop={8} style={{ padding: spacing[1] }}>
            <IconChevronLeft size={24} color={colors.onSurface} />
          </Pressable>
          <Text variant="headingSm">Settings</Text>
        </View>

        <View style={{ paddingHorizontal: HORIZONTAL_PADDING, gap: spacing[5], paddingTop: spacing[4] }}>
          {/* Appearance */}
          <View style={{ gap: spacing[2] }}>
            <Text variant="labelLg" color={colors.onSurfaceVariant}>APPEARANCE</Text>
            <Card>
              <View style={{ gap: spacing[3] }}>
                <Text variant="labelLg">Theme</Text>
                <SegmentedControl
                  options={['System', 'Light', 'Dark']}
                  selected={themeIndex}
                  onSelect={(i) => updatePreference('theme', (['system', 'light', 'dark'] as const)[i])}
                />
              </View>
            </Card>
          </View>

          {/* Default Grade */}
          <View style={{ gap: spacing[2] }}>
            <Text variant="labelLg" color={colors.onSurfaceVariant}>DEFAULT GRADE</Text>
            <Card>
              <View style={{ gap: spacing[3] }}>
                <Text variant="labelLg">Default grade for new cards</Text>
                <SegmentedControl
                  options={GRADE_OPTIONS.map((g) => GRADES[g].shortLabel)}
                  selected={gradeIndex}
                  onSelect={(i) => updatePreference('defaultGrade', GRADE_OPTIONS[i])}
                />
              </View>
            </Card>
          </View>

          {/* Toggles */}
          <View style={{ gap: spacing[2] }}>
            <Text variant="labelLg" color={colors.onSurfaceVariant}>PREFERENCES</Text>
            <Card>
              <View style={{ gap: spacing[4] }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMd">Notifications</Text>
                    <Text variant="caption" color={colors.onSurfaceMuted}>Price alerts and updates</Text>
                  </View>
                  <Switch
                    value={preferences.notificationsEnabled}
                    onValueChange={(v) => updatePreference('notificationsEnabled', v)}
                    trackColor={{ false: colors.outline, true: withAlpha(colors.primary, 0.4) }}
                    thumbColor={preferences.notificationsEnabled ? colors.primary : colors.onSurfaceMuted}
                  />
                </View>
                <View style={{ height: 1, backgroundColor: colors.outlineVariant }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMd">Haptic Feedback</Text>
                    <Text variant="caption" color={colors.onSurfaceMuted}>Vibration on interactions</Text>
                  </View>
                  <Switch
                    value={preferences.hapticEnabled}
                    onValueChange={(v) => updatePreference('hapticEnabled', v)}
                    trackColor={{ false: colors.outline, true: withAlpha(colors.primary, 0.4) }}
                    thumbColor={preferences.hapticEnabled ? colors.primary : colors.onSurfaceMuted}
                  />
                </View>
              </View>
            </Card>
          </View>

          {/* Legal */}
          <View style={{ gap: spacing[2] }}>
            <Text variant="labelLg" color={colors.onSurfaceVariant}>LEGAL</Text>
            <Card>
              <View style={{ gap: spacing[4] }}>
                <Pressable
                  onPress={() => router.push('/terms')}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                  accessibilityRole="link"
                  accessibilityLabel="Terms of Use"
                >
                  <Text variant="bodyMd">Terms of Use</Text>
                  <IconChevronRight size={18} color={colors.onSurfaceMuted} />
                </Pressable>
                <View style={{ height: 1, backgroundColor: colors.outlineVariant }} />
                <Pressable
                  onPress={() => router.push('/privacy')}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                  accessibilityRole="link"
                  accessibilityLabel="Privacy Policy"
                >
                  <Text variant="bodyMd">Privacy Policy</Text>
                  <IconChevronRight size={18} color={colors.onSurfaceMuted} />
                </Pressable>
              </View>
            </Card>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default withErrorBoundary(SettingsScreen, 'Settings');

import React, { useState } from 'react';
import { View, ScrollView, Switch, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  IconChevronLeft,
  IconChevronRight,
  IconLogout,
  IconTrash,
} from '@tabler/icons-react-native';
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
  const signOut = useUserStore((s) => s.signOut);
  const deleteAccount = useUserStore((s) => s.deleteAccount);
  const [busy, setBusy] = useState<'signout' | 'delete' | null>(null);

  const handleSignOut = () => {
    Alert.alert(
      'Sign out?',
      'You can sign back in with Apple at any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            setBusy('signout');
            try {
              await signOut();
              router.replace('/(auth)/login');
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  const handleDelete = () => {
    // Two-step confirm — first warn, second require typing intent.
    // Apple Guideline 5.1.1(v) doesn't require this friction, but
    // permanent deletion deserves a beat for the user to back out.
    Alert.alert(
      'Delete account?',
      'This permanently removes your CardPulse account, watchlist, alerts, and search history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you sure?',
              'Your subscription will continue to bill via Apple until you cancel it in Settings ▸ Apple ID ▸ Subscriptions. Deleting your CardPulse account does not cancel the subscription.',
              [
                { text: 'Keep account', style: 'cancel' },
                {
                  text: 'Yes, delete',
                  style: 'destructive',
                  onPress: async () => {
                    setBusy('delete');
                    try {
                      await deleteAccount();
                      router.replace('/(auth)/login');
                    } catch (e: any) {
                      Alert.alert(
                        'Could not delete account',
                        e?.message ??
                          'Something went wrong. Please try again, or email privacy@cardpulse.app for help.',
                      );
                    } finally {
                      setBusy(null);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

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

          {/* Account — Sign Out + Delete Account.
              Delete Account is required by Apple Guideline 5.1.1(v) for any
              app that creates accounts. The action is destructive and
              irreversible — server-side it removes the auth user and
              cascades to user-owned tables. */}
          <View style={{ gap: spacing[2] }}>
            <Text variant="labelLg" color={colors.onSurfaceVariant}>ACCOUNT</Text>
            <Card>
              <View style={{ gap: spacing[4] }}>
                <Pressable
                  onPress={handleSignOut}
                  disabled={busy !== null}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing[3],
                    opacity: busy === 'signout' ? 0.6 : 1,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Sign out"
                >
                  <IconLogout size={20} color={colors.onSurface} strokeWidth={1.75} />
                  <Text variant="bodyMd" style={{ flex: 1 }}>
                    {busy === 'signout' ? 'Signing out…' : 'Sign out'}
                  </Text>
                </Pressable>
                <View style={{ height: 1, backgroundColor: colors.outlineVariant }} />
                <Pressable
                  onPress={handleDelete}
                  disabled={busy !== null}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing[3],
                    opacity: busy === 'delete' ? 0.6 : 1,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Delete account"
                  accessibilityHint="Permanently deletes your CardPulse account and all associated data"
                >
                  <IconTrash size={20} color={colors.danger} strokeWidth={1.75} />
                  <Text variant="bodyMd" color={colors.danger} style={{ flex: 1 }}>
                    {busy === 'delete' ? 'Deleting account…' : 'Delete account'}
                  </Text>
                </Pressable>
              </View>
            </Card>
            <Text variant="caption" color={colors.onSurfaceMuted} style={{ paddingHorizontal: spacing[2] }}>
              Deleting your account permanently removes your profile, watchlist, price alerts, and search history.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default withErrorBoundary(SettingsScreen, 'Settings');

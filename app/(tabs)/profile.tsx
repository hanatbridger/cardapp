import React from 'react';
import { View, ScrollView, Pressable, Alert, Platform, Linking } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import {
  IconCrown, IconShield, IconFileText, IconHelpCircle, IconLogout,
  IconChevronRight, IconDeviceMobile, IconStar,
} from '@tabler/icons-react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import { Text, Card, Button, ScreenBackground, SegmentedControl, withErrorBoundary } from '../../src/components';
import { spacing, radius, shadows } from '../../src/theme/tokens';
import { withAlpha } from '../../src/utils/withAlpha';
import { HORIZONTAL_PADDING } from '../../src/constants/layout';
import { CURRENCIES, CURRENCY_CODES, DEFAULT_CURRENCY } from '../../src/constants/currencies';
import { useUserStore } from '../../src/stores/user-store';

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  badge?: string;
}

function SettingsRow({ icon, label, value, onPress, destructive, badge }: SettingsRowProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing[3],
        paddingHorizontal: spacing[4],
        gap: spacing[3],
        backgroundColor: pressed && onPress ? colors.surfaceVariant : 'transparent',
      })}
    >
      {icon}
      <Text
        variant="bodyMd"
        color={destructive ? colors.danger : colors.onSurface}
        style={{ flex: 1 }}
      >
        {label}
      </Text>
      {badge && (
        <View
          style={{
            backgroundColor: colors.primary,
            borderRadius: radius.full,
            paddingHorizontal: spacing[2],
            paddingVertical: spacing['0.5'],
          }}
        >
          <Text variant="labelSm" color={colors.onPrimary}>{badge}</Text>
        </View>
      )}
      {value && (
        <Text variant="bodySm" color={colors.onSurfaceMuted}>{value}</Text>
      )}
      {onPress && !destructive && (
        <IconChevronRight size={16} color={colors.onSurfaceMuted} />
      )}
    </Pressable>
  );
}

function SettingsDivider() {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.outlineVariant, marginHorizontal: spacing[4] }} />;
}

const THEME_OPTIONS = ['System', 'Light', 'Dark'] as const;
const THEME_VALUES = ['system', 'light', 'dark'] as const;

function ProfileScreen() {
  const { colors } = useTheme();
  const { profile, signOut, deleteAccount, isPremium } = useUserStore();
  const themePreference = useUserStore((s) => s.preferences.theme);
  const currency = useUserStore((s) => s.preferences.currency ?? DEFAULT_CURRENCY);
  const updatePreference = useUserStore((s) => s.updatePreference);
  const selectedThemeIndex = Math.max(0, THEME_VALUES.indexOf(themePreference));

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) {
        signOut();
      }
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
      ]);
    }
  };

  const handleDeleteAccount = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure? This will permanently delete your account and all data. This cannot be undone.')) {
        deleteAccount();
        router.replace('/(auth)/login');
      }
    } else {
      Alert.alert(
        'Delete Account',
        'This will permanently delete your account and all data. This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete Account',
            style: 'destructive',
            onPress: () => {
              deleteAccount();
              router.replace('/(auth)/login');
            },
          },
        ],
      );
    }
  };

  // Live App Store listing (CardPulse: Card Tracker). ?action=write-review
  // drops the user straight onto the review sheet instead of the listing,
  // which is what a "Rate" button promises.
  const handleRate = () => {
    Linking.openURL(
      'https://apps.apple.com/us/app/cardpulse-card-tracker/id6762569336?action=write-review',
    ).catch(() => {});
  };

  return (
    <ScreenBackground>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing[24] }}
      >
        {/* Header — 56-pt row matches Home, Notifications and Explore's
            CollapsingHeader so the title stays at the same y-offset
            across tab switches. */}
        <View
          style={{
            height: 56,
            paddingHorizontal: HORIZONTAL_PADDING,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Text variant="headingLg">Profile</Text>
        </View>
        <View style={{ height: spacing[2] }} />

        {/* Account card */}
        <Pressable
          onPress={() => router.push('/edit-profile')}
          style={{ paddingHorizontal: HORIZONTAL_PADDING, marginBottom: spacing[4] }}
        >
          <Card glass style={{ padding: 0, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[3], paddingHorizontal: spacing[4] }}>
              <View style={{ flex: 1, gap: spacing['0.5'] }}>
                <Text variant="headingSm">{profile.displayName}</Text>
                <Text variant="bodySm" color={colors.onSurfaceVariant}>
                  {profile.email}
                </Text>
              </View>
              <IconChevronRight size={18} color={colors.onSurfaceMuted} />
            </View>
          </Card>
        </Pressable>

        {/* Premium upsell */}
        {!isPremium && (
          <View style={{ paddingHorizontal: HORIZONTAL_PADDING, marginBottom: spacing[4] }}>
            <Pressable
              onPress={() => router.push('/paywall')}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.primary,
                borderRadius: radius.xl,
                padding: spacing[4],
                gap: spacing[3],
                opacity: pressed ? 0.85 : 1,
                ...shadows.md,
              })}
            >
              <View
                style={{
                  width: 40, height: 40, borderRadius: radius.lg,
                  backgroundColor: withAlpha(colors.onPrimary, 0.2),
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <IconCrown size={20} color={colors.onPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="labelLg" color={colors.onPrimary}>
                  Upgrade to Premium
                </Text>
                <Text variant="caption" color={withAlpha(colors.onPrimary, 0.7)}>
                  Unlimited watchlist, price alerts & AI insights
                </Text>
              </View>
              <IconChevronRight size={18} color={withAlpha(colors.onPrimary, 0.7)} />
            </Pressable>
          </View>
        )}

        {/* Appearance — lets users pin the app to light or dark, or
            follow the OS. Writes to `preferences.theme`; the
            ThemeProvider subscribes and rebinds every themed component
            on change. */}
        <View style={{ paddingHorizontal: HORIZONTAL_PADDING, marginTop: spacing[5], marginBottom: spacing[3] }}>
          <Text variant="labelLg" color={colors.onSurfaceVariant} style={{ paddingLeft: spacing[4] }}>
            APPEARANCE
          </Text>
        </View>
        <View style={{ paddingHorizontal: HORIZONTAL_PADDING }}>
          <SegmentedControl
            options={[...THEME_OPTIONS]}
            selected={selectedThemeIndex}
            onSelect={(i) => updatePreference('theme', THEME_VALUES[i])}
          />
        </View>

        {/* Currency — prices are sourced in USD and converted to the
            chosen currency via useMoney(). Writes to preferences.currency;
            every price across the app re-renders on change. */}
        <View style={{ paddingHorizontal: HORIZONTAL_PADDING, marginTop: spacing[5], marginBottom: spacing[3] }}>
          <Text variant="labelLg" color={colors.onSurfaceVariant} style={{ paddingLeft: spacing[4] }}>
            CURRENCY
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: HORIZONTAL_PADDING,
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing[2],
          }}
        >
          {CURRENCY_CODES.map((code) => {
            const selected = currency === code;
            return (
              <Pressable
                key={code}
                onPress={() => updatePreference('currency', code)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${CURRENCIES[code].label} (${code})`}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing[1],
                  paddingHorizontal: spacing[3],
                  paddingVertical: spacing[2],
                  borderRadius: radius.full,
                  backgroundColor: selected ? colors.primary : colors.surfaceVariant,
                  borderWidth: 1,
                  borderColor: selected ? colors.primary : colors.outlineVariant,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text variant="labelLg" color={selected ? colors.onPrimary : colors.onSurface}>
                  {code}
                </Text>
                <Text
                  variant="labelLg"
                  color={selected ? withAlpha(colors.onPrimary, 0.8) : colors.onSurfaceMuted}
                >
                  {CURRENCIES[code].symbol}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Legal */}
        <View style={{ paddingHorizontal: HORIZONTAL_PADDING, marginTop: spacing[5], marginBottom: spacing[3] }}>
          <Text variant="labelLg" color={colors.onSurfaceVariant} style={{ paddingLeft: spacing[4] }}>
            LEGAL
          </Text>
        </View>
        <Card style={{ marginHorizontal: HORIZONTAL_PADDING, padding: 0, overflow: 'hidden' }}>
          <SettingsRow
            icon={<IconFileText size={18} color={colors.onSurfaceVariant} />}
            label="Terms of Use"
            onPress={() => router.push('/terms')}
          />
          <SettingsDivider />
          <SettingsRow
            icon={<IconShield size={18} color={colors.onSurfaceVariant} />}
            label="Privacy Policy"
            onPress={() => router.push('/privacy')}
          />
          <SettingsDivider />
          <SettingsRow
            icon={<IconHelpCircle size={18} color={colors.onSurfaceVariant} />}
            label="Help & Support"
            onPress={() => router.push('/help')}
          />
        </Card>

        {/* Account */}
        <View style={{ paddingHorizontal: HORIZONTAL_PADDING, marginTop: spacing[5], marginBottom: spacing[3] }}>
          <Text variant="labelLg" color={colors.onSurfaceVariant} style={{ paddingLeft: spacing[4] }}>
            ACCOUNT
          </Text>
        </View>
        <Card style={{ marginHorizontal: HORIZONTAL_PADDING, padding: 0, overflow: 'hidden' }}>
          <SettingsRow
            icon={<IconDeviceMobile size={18} color={colors.onSurfaceVariant} />}
            label="App Version"
            // Read from expo-constants instead of hardcoding. Falls back to
            // the bundled app.json version, and ultimately to a literal so
            // the row is never blank if both are unavailable on web.
            value={
              Constants.expoConfig?.version ??
              (Constants.manifest as { version?: string } | null)?.version ??
              '1.0'
            }
          />
          <SettingsDivider />
          <SettingsRow
            icon={<IconLogout size={18} color={colors.danger} />}
            label="Sign Out"
            destructive
            onPress={handleSignOut}
          />
          <SettingsDivider />
          <SettingsRow
            icon={<IconShield size={18} color={colors.danger} />}
            label="Delete Account"
            destructive
            onPress={handleDeleteAccount}
          />
        </Card>

        {/* Rate CardPulse CTA */}
        <View style={{ paddingHorizontal: HORIZONTAL_PADDING, marginTop: spacing[6] }}>
          <Button
            variant="outlined"
            size="lg"
            fullWidth
            icon={<IconStar size={18} color={colors.primary} />}
            onPress={handleRate}
          >
            Rate CardPulse
          </Button>
        </View>

        <View style={{ height: spacing[4] }} />
      </ScrollView>
    </ScreenBackground>
  );
}

export default withErrorBoundary(ProfileScreen, 'Profile');

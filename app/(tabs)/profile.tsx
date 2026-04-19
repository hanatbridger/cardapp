import React from 'react';
import { View, ScrollView, Pressable, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import {
  IconCrown, IconShield, IconFileText, IconHelpCircle, IconLogout,
  IconChevronRight, IconDeviceMobile, IconStar,
} from '@tabler/icons-react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import { Text, Card, Button, ScreenBackground, withErrorBoundary } from '../../src/components';
import { spacing, radius, shadows } from '../../src/theme/tokens';
import { withAlpha } from '../../src/utils/withAlpha';
import { HORIZONTAL_PADDING } from '../../src/constants/layout';
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

function ProfileScreen() {
  const { colors } = useTheme();
  const { profile, signOut, deleteAccount, isPremium } = useUserStore();

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

  // TODO(launch): once CardPulse is live in the App Store / Play Store,
  // wire this to the real listing. Best path is `expo-store-review`'s
  // `requestReview()` for the native in-app prompt, falling back to
  // `Linking.openURL` for a deep link to the listing. Until then this
  // button is hidden — the placeholder URL `id6740000000` would 404 and
  // looked broken to anyone who tapped it.
  const handleRate = () => {
    Alert.alert(
      'Thanks!',
      "CardPulse isn't on the App Store yet. We'll prompt you to rate the app once it's live.",
    );
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
            value="1.0.0"
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

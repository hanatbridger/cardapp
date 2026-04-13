import React from 'react';
import { View, ScrollView, Pressable, Alert, Platform, Share, Linking } from 'react-native';
import { router } from 'expo-router';
import {
  IconCrown, IconBell, IconShield, IconFileText, IconHelpCircle, IconLogout,
  IconChevronRight, IconDeviceMobile, IconStar,
} from '@tabler/icons-react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import { Text, Card, Avatar, ScreenBackground, withErrorBoundary } from '../../src/components';
import { spacing, radius, shadows } from '../../src/theme/tokens';
import { withAlpha } from '../../src/utils/withAlpha';
import { HORIZONTAL_PADDING } from '../../src/constants/layout';
import { useWatchlistStore } from '../../src/stores';
import { useAlertsStore } from '../../src/stores/alerts-store';
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
  const { isPremium, items } = useWatchlistStore();
  const { alerts } = useAlertsStore();
  const { profile, signOut, deleteAccount } = useUserStore();

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

  const handleRate = () => {
    const url = Platform.OS === 'ios'
      ? 'https://apps.apple.com/app/cardpulse/id6740000000'
      : 'https://play.google.com/store/apps/details?id=com.cardpulse.app';
    Linking.openURL(url).catch(() => {});
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Check out CardPulse — track Pokemon card prices with AI insights! https://cardpulse.app',
      });
    } catch {}
  };

  return (
    <ScreenBackground>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing[24] }}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: HORIZONTAL_PADDING, paddingTop: spacing[4], paddingBottom: spacing[5] }}>
          <Text variant="headingLg">Profile</Text>
        </View>

        {/* Account card */}
        <Pressable
          onPress={() => router.push('/edit-profile')}
          style={{ paddingHorizontal: HORIZONTAL_PADDING, marginBottom: spacing[4] }}
        >
          <Card glass>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
              <Avatar name={profile.displayName} size={56} />
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
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.primary,
                borderRadius: radius.xl,
                padding: spacing[4],
                gap: spacing[3],
                ...shadows.md,
              }}
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

        {/* Stats */}
        <View style={{ paddingHorizontal: HORIZONTAL_PADDING, marginBottom: spacing[4] }}>
          <View style={{ flexDirection: 'row', gap: spacing[2] }}>
            <Card style={{ flex: 1, padding: spacing[3] }}>
              <View style={{ alignItems: 'center', gap: spacing['0.5'] }}>
                <Text variant="headingMd">{items.length}</Text>
                <Text variant="caption" color={colors.onSurfaceMuted}>Cards Tracked</Text>
              </View>
            </Card>
            <Card style={{ flex: 1, padding: spacing[3] }}>
              <View style={{ alignItems: 'center', gap: spacing['0.5'] }}>
                <Text variant="headingMd">{alerts.length}</Text>
                <Text variant="caption" color={colors.onSurfaceMuted}>Price Alerts</Text>
              </View>
            </Card>
            <Card style={{ flex: 1, padding: spacing[3] }}>
              <View style={{ alignItems: 'center', gap: spacing['0.5'] }}>
                <Text variant="headingMd">{isPremium ? 'Pro' : 'Free'}</Text>
                <Text variant="caption" color={colors.onSurfaceMuted}>Plan</Text>
              </View>
            </Card>
          </View>
        </View>

        {/* General */}
        <View style={{ paddingHorizontal: HORIZONTAL_PADDING, marginBottom: spacing[3] }}>
          <Text variant="labelLg" color={colors.onSurfaceVariant} style={{ paddingLeft: spacing[4] }}>
            GENERAL
          </Text>
        </View>
        <Card style={{ marginHorizontal: HORIZONTAL_PADDING, padding: 0, overflow: 'hidden' }}>
          <SettingsRow
            icon={<IconBell size={18} color={colors.onSurfaceVariant} />}
            label="Notifications"
            onPress={() => router.push('/(tabs)/notifications')}
          />
          <SettingsDivider />
          <SettingsRow
            icon={<IconStar size={18} color={colors.warning} />}
            label="Rate CardPulse"
            onPress={handleRate}
          />
        </Card>

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

        <View style={{ height: spacing[4] }} />
      </ScrollView>
    </ScreenBackground>
  );
}

export default withErrorBoundary(ProfileScreen, 'Profile');

import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { IconChevronLeft } from '@tabler/icons-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import { Text, Card, withErrorBoundary } from '../src/components';
import { spacing } from '../src/theme/tokens';
import { HORIZONTAL_PADDING } from '../src/constants/layout';

const LAST_UPDATED = 'May 1, 2026';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: '1. Introduction',
    body: 'This Privacy Policy explains how CardPulse ("we", "us") collects, uses, and protects your information when you use our mobile application. We are committed to handling your data responsibly and in compliance with applicable privacy laws including the California Consumer Privacy Act (CCPA) and the EU/UK General Data Protection Regulation (GDPR).',
  },
  {
    title: '2. Information We Collect',
    body: 'Account information: email address, display name, username, and an Apple-provided private relay email if you sign in with Apple. Usage information: cards you view, search queries, watchlist contents, price alerts you set, and onboarding state. Device information: device model, OS version, app version, language, time zone, and anonymous device identifier. Purchase information: subscription status only — credit card details are handled by Apple and never reach our servers.',
  },
  {
    title: '3. How We Use Your Information',
    body: 'We use your information to: (a) provide and improve the App\'s features; (b) send price alerts you have configured; (c) personalize your experience and recommendations; (d) communicate important account or service updates; (e) detect and prevent fraud or abuse; (f) comply with legal obligations.',
  },
  {
    title: '4. Information We Do Not Collect',
    body: 'We do not collect precise location data. We do not access your contacts, photos, microphone, camera, or health data. We do not collect government identifiers. We do not knowingly collect information from children under 13. We do not sell your personal information to anyone.',
  },
  {
    title: '5. Sharing Your Information',
    body: 'We do not sell your personal information. We share information only with: (a) the sub-processors listed in Section 6, who help us operate the App under strict confidentiality obligations; (b) law enforcement when required by valid legal process; (c) a successor entity in connection with a merger or acquisition.',
  },
  {
    title: '6. Third-Party Services (Sub-Processors)',
    body: 'CardPulse uses the following third-party services that may receive limited data:\n\n• Apple Inc. — Sign in with Apple (authentication), App Store (purchases and subscription billing), Push Notifications (price alerts).\n• Supabase, Inc. — authentication backend (US region). Receives your account information (email, display name, Apple-provided user ID). Does not receive your watchlist or search history — those are stored only on your device.\n• Sentry — crash reporting and performance monitoring. Receives anonymized error logs and device info; IP addresses are stripped before transmission.\n• RevenueCat — subscription receipt validation. Receives an anonymous user ID and Apple receipt; never receives your name or email.\n• Vercel, Inc. — Edge function hosting for our pricing proxies (TCGPlayer Market Price, Collectrics daily movers, eBay Browse). These functions only proxy public price data and never see your account.\n• mycollectrics.com — public Pokémon TCG price leaderboard (read-only, no user data sent).\n• TCGPlayer — raw card market price data (read-only, no user data sent).\n• eBay Browse API — recent sold-listing data for graded cards (read-only, no user data sent).\n\nEach provider operates under its own privacy policy.',
  },
  {
    title: '7. Data Retention and Deletion',
    body: 'We retain your account information for as long as your account is active. You may delete your account at any time from Settings ▸ Account ▸ Delete Account. Deletion is immediate — your auth record is removed from our database the moment you confirm, and on-device data (watchlist, alerts, search history, preferences) is wiped at the same time. Backups containing your auth data are purged on a 30-day rolling cycle. Anonymized analytics data with no identifier linking back to you may be retained for up to 24 months for product improvement.',
  },
  {
    title: '8. Your Rights (CCPA, GDPR, UK GDPR)',
    body: 'You have the right to: (a) access the personal information we hold about you; (b) correct inaccurate information; (c) delete your account and associated data (available in-app at any time); (d) export your data in a portable format; (e) opt out of non-essential analytics; (f) object to or restrict processing; (g) lodge a complaint with your local supervisory authority. To exercise rights (a), (b), (d), (e), or (f), email privacy@cardpulse.app — we respond within 30 days.',
  },
  {
    title: '9. Legal Basis for Processing (GDPR)',
    body: 'For users in the European Economic Area, United Kingdom, or Switzerland: we process your data on the basis of (a) contract — to provide the service you signed up for; (b) legitimate interest — to improve the product, prevent fraud, and secure the platform; (c) legal obligation — to comply with tax and consumer protection law; (d) consent — for non-essential analytics, which you can withdraw at any time.',
  },
  {
    title: '10. Data Security',
    body: 'We use industry-standard security measures including encryption in transit (TLS 1.2+) and at rest, role-based access controls, and continuous monitoring. Authentication tokens are stored on-device using the platform\'s secure storage (iOS Keychain via AsyncStorage). No system is 100% secure; you are responsible for keeping your Apple ID credentials confidential.',
  },
  {
    title: '11. Children\'s Privacy',
    body: 'CardPulse is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please email privacy@cardpulse.app and we will delete it promptly.',
  },
  {
    title: '12. International Data Transfers',
    body: 'CardPulse is operated from the United States. If you access the App from outside the US, your information will be transferred to and processed in the United States, which may have different data protection laws than your country of residence. For users in the EEA/UK, transfers rely on the EU Standard Contractual Clauses and the UK International Data Transfer Addendum where applicable.',
  },
  {
    title: '13. California Privacy Rights',
    body: 'California residents have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information is collected and shared, the right to delete personal information, the right to correct inaccurate information, and the right to opt out of the sale or sharing of personal information. We do not sell or share personal information for cross-context behavioral advertising.',
  },
  {
    title: '14. Changes to This Policy',
    body: 'We may update this Privacy Policy from time to time. The "Last updated" date at the top of this page indicates when the Policy was last changed. Material changes will be communicated through the App at least 7 days before they take effect.',
  },
  {
    title: '15. Contact',
    body: 'Questions about this Privacy Policy or our data practices? Email privacy@cardpulse.app. For GDPR/UK GDPR matters, the same address is the point of contact.',
  },
];

function PrivacyScreen() {
  const { colors } = useTheme();

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
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={{ padding: spacing[1] }}
            accessibilityLabel="Back"
          >
            <IconChevronLeft size={24} color={colors.onSurface} />
          </Pressable>
          <Text variant="headingSm">Privacy Policy</Text>
        </View>

        <View style={{ paddingHorizontal: HORIZONTAL_PADDING, paddingTop: spacing[4], gap: spacing[5] }}>
          <Text variant="caption" color={colors.onSurfaceMuted}>
            Last updated: {LAST_UPDATED}
          </Text>

          <Card>
            <View style={{ gap: spacing[5] }}>
              {SECTIONS.map((s) => (
                <View key={s.title} style={{ gap: spacing[2] }}>
                  <Text variant="labelLg">{s.title}</Text>
                  <Text variant="bodySm" color={colors.onSurfaceVariant}>
                    {s.body}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default withErrorBoundary(PrivacyScreen, 'Privacy');

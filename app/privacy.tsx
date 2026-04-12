import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { IconChevronLeft } from '@tabler/icons-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import { Text, Card, withErrorBoundary } from '../src/components';
import { spacing } from '../src/theme/tokens';
import { HORIZONTAL_PADDING } from '../src/constants/layout';

const LAST_UPDATED = 'April 8, 2026';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: '1. Introduction',
    body: 'This Privacy Policy explains how CardPulse ("we", "us") collects, uses, and protects your information when you use our mobile application. We are committed to handling your data responsibly and in compliance with applicable privacy laws.',
  },
  {
    title: '2. Information We Collect',
    body: 'Account information: email address, display name, username. Usage information: cards you view, search queries, watchlist contents, price alerts you set. Device information: device model, OS version, app version, language, time zone, anonymous device identifier. Purchase information: subscription status (we do not store credit card details — payments are handled by Apple).',
  },
  {
    title: '3. How We Use Your Information',
    body: 'We use your information to: (a) provide and improve the App\'s features; (b) send price alerts you have configured; (c) personalize your experience and recommendations; (d) communicate important account or service updates; (e) detect and prevent fraud or abuse; (f) comply with legal obligations.',
  },
  {
    title: '4. Information We Do Not Collect',
    body: 'We do not collect precise location data. We do not access your contacts, photos, or microphone. We do not collect government identifiers. We do not knowingly collect information from children under 13.',
  },
  {
    title: '5. Sharing Your Information',
    body: 'We do not sell your personal information. We share information only with: (a) service providers who help us operate the App (hosting, analytics, crash reporting) under strict confidentiality obligations; (b) law enforcement when required by valid legal process; (c) a successor entity in connection with a merger or acquisition.',
  },
  {
    title: '6. Third-Party Services',
    body: 'CardPulse uses the following third-party services that may receive limited data: Apple App Store (for purchases and authentication), our analytics provider (for anonymized usage metrics), and our crash reporting tool (for anonymized error logs). Each provider operates under its own privacy policy.',
  },
  {
    title: '7. Data Retention',
    body: 'We retain your account information for as long as your account is active. You may delete your account at any time from Settings, which will permanently remove your profile, watchlist, alerts, and search history within 30 days. Anonymized analytics data may be retained for up to 24 months for product improvement purposes.',
  },
  {
    title: '8. Your Rights',
    body: 'You have the right to: access the personal information we hold about you; correct inaccurate information; delete your account and associated data; export your data in a portable format; opt out of non-essential analytics. To exercise these rights, contact privacy@cardpulse.app.',
  },
  {
    title: '9. Data Security',
    body: 'We use industry-standard security measures including encryption in transit (TLS) and at rest, access controls, and regular security audits. However, no system is 100% secure. You are responsible for keeping your account credentials confidential.',
  },
  {
    title: '10. Children\'s Privacy',
    body: 'CardPulse is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us and we will delete it promptly.',
  },
  {
    title: '11. International Users',
    body: 'CardPulse is operated from the United States. By using the App, you consent to the transfer and processing of your information in the United States, which may have different data protection laws than your country of residence.',
  },
  {
    title: '12. California Privacy Rights',
    body: 'California residents have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information is collected, the right to delete personal information, and the right to opt out of the sale of personal information. We do not sell personal information.',
  },
  {
    title: '13. Changes to This Policy',
    body: 'We may update this Privacy Policy from time to time. The "Last updated" date at the top of this page indicates when the Policy was last changed. Material changes will be communicated through the App.',
  },
  {
    title: '14. Contact',
    body: 'Questions about this Privacy Policy or our data practices? Email us at privacy@cardpulse.app.',
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

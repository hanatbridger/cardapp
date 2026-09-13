import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { IconChevronLeft } from '@tabler/icons-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import { Text, Card, withErrorBoundary } from '../src/components';
import { spacing } from '../src/theme/tokens';
import { HORIZONTAL_PADDING } from '../src/constants/layout';

const LAST_UPDATED = 'September 12, 2026';

// The only address that receives mail for CardPulse. Mirrors SUPPORT_EMAIL
// in app/help.tsx — keep the two in step.
const CONTACT_EMAIL = 'hanwong118@gmail.com';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: '1. Introduction',
    body: 'This Privacy Policy explains how CardPulse ("we", "us") collects, uses, and protects your information when you use our mobile application. We are committed to handling your data responsibly and in compliance with applicable privacy laws including the California Consumer Privacy Act (CCPA) and the EU/UK General Data Protection Regulation (GDPR).',
  },
  {
    title: '2. Information We Collect',
    body: 'Account information: email address, display name, username, and an Apple-provided private relay email if you sign in with Apple, or your Google account name and email if you sign in with Google. Usage information: price and grading alerts you set (card, target price or grading threshold, and alert direction) and the push notification token used to deliver them. Your watchlist, search history, and onboarding state stay on your device. Device information: device model, OS version, app version, language, and time zone. Purchase information: subscription status only — payment details are handled by Apple or Google and never reach our servers. Feedback you send: if you use Send Feedback in the app, we receive the category you choose (bug, idea, or general), the message you write, the app version, your account ID, your username or display name or the email on your account, and basic environment details (the platform you are on and, on the web build only, the page path, window size, browser user agent, and browser language). An image is included only if you attach or paste one yourself. Feedback is stored in our database and any attached image in a private storage bucket, both described in Section 6.',
  },
  {
    title: '3. How We Use Your Information',
    body: 'We use your information to: (a) provide and improve the App\'s features; (b) send price alerts you have configured; (c) personalize your experience and recommendations; (d) communicate important account or service updates; (e) detect and prevent fraud or abuse; (f) comply with legal obligations.',
  },
  {
    title: '4. Information We Do Not Collect',
    body: 'We do not collect precise location data. We do not access your contacts, microphone, camera, or health data. We do not browse your photo library — the only images we receive are ones you choose to attach to feedback yourself. We do not collect government identifiers. We do not knowingly collect information from children under 13. We do not sell your personal information to anyone.',
  },
  {
    title: '5. Sharing Your Information',
    body: 'We do not sell your personal information. We share information only with: (a) the sub-processors listed in Section 6, who help us operate the App under strict confidentiality obligations; (b) law enforcement when required by valid legal process; (c) a successor entity in connection with a merger or acquisition.',
  },
  {
    title: '6. Third-Party Services (Sub-Processors)',
    body: 'CardPulse uses the following third-party services that may receive limited data:\n\n• Apple Inc. — Sign in with Apple (authentication), App Store (purchases and subscription billing), Push Notifications (price alerts).\n• Google LLC — Google Sign-In (authentication), Google Play (purchases and subscription billing), Firebase Cloud Messaging (price alerts on Android).\n• Expo — the push delivery service. Our servers hand it your device push token and the notification text, and it passes both to Apple or Google for delivery.\n• Supabase, Inc. — authentication and database backend (US region). Receives your account information (email, display name, Apple- or Google-provided user ID) and the price and grading alerts you set, including card, target, and push token, so alerts can fire while the App is closed. Also receives feedback you submit and holds any image you attach in a private storage bucket that only you and the accounts that triage feedback can read. Does not receive your watchlist or search history — those are stored only on your device.\n• Sentry — crash reporting and performance monitoring. Receives error logs, device info, and your account email and username so reports can be tied to your account; IP addresses are stripped before transmission.\n• RevenueCat — subscription receipt validation. Receives your CardPulse account ID and your App Store or Google Play receipt; never receives your name or email.\n• Vercel, Inc. — Edge function hosting for our pricing proxies (TCGPlayer Market Price, JustTCG, Collectrics card data, eBay Browse). These functions only proxy public price data and never see your account.\n• mycollectrics.com — public Pokémon TCG card price data (read-only, no user data sent). Supplies the daily price leaderboard behind Trending, the PSA 10 sold prices and PSA population figures behind the grading verdict, and the eBay-derived listing and daily-sales aggregates behind Market Dynamics and Recent Sales.\n• TCGPlayer — raw card market price data (read-only, no user data sent).\n• JustTCG — raw card market price data for cards TCGPlayer does not price (read-only, no user data sent).\n• eBay Browse API — live listings for a card, raw and graded. These are asking prices on active listings, not sold prices (read-only, no user data sent).\n\nEach provider operates under its own privacy policy.',
  },
  {
    title: '7. Data Retention and Deletion',
    body: 'We retain your account information for as long as your account is active. You may delete your account at any time from the Profile tab, under Account ▸ Delete Account. Deletion is immediate: when you confirm, your authentication record is removed from our database, the rows attached to it — including your alerts, with the push token stored on each of them, and any feedback you submitted — are deleted with it, and any images you attached to feedback are removed from our storage bucket. The separate registration record for your device\'s push token, which holds only the token, the platform and the time zone and is not tied to an account, is not removed by account deletion: it is deleted when the push service reports that token as no longer valid, which happens once the App is uninstalled or notifications are switched off. Your profile, preferences, saved searches, and session are cleared from the device at the same time; the watchlist and alert list the App keeps in local storage are not erased by deletion and stay on the device until you delete the App or clear its data. Copies of deleted records may persist in our database provider\'s encrypted backups until those backups rotate out of retention. Crash and error reports already sent to Sentry are held under Sentry\'s own retention schedule.',
  },
  {
    title: '8. Your Rights (CCPA, GDPR, UK GDPR)',
    body: `You have the right to: (a) access the personal information we hold about you; (b) correct inaccurate information; (c) delete your account and associated data (available in-app at any time); (d) export your data in a portable format; (e) object to or restrict processing; (f) lodge a complaint with your local supervisory authority. To exercise rights (a), (b), (d), or (e), email ${CONTACT_EMAIL} — we respond within 30 days.`,
  },
  {
    title: '9. Legal Basis for Processing (GDPR)',
    body: 'For users in the European Economic Area, United Kingdom, or Switzerland: we process your data on the basis of (a) contract — to provide the service you signed up for; (b) legitimate interest — to improve the product, prevent fraud, and secure the platform; (c) legal obligation — to comply with tax and consumer protection law.',
  },
  {
    title: '10. Data Security',
    body: 'We use industry-standard security measures including encryption in transit (TLS 1.2+) and at rest, role-based access controls, and continuous monitoring. Authentication tokens are stored on your device in the App\'s private storage. No system is 100% secure; you are responsible for keeping your Apple or Google account credentials confidential.',
  },
  {
    title: '11. Children\'s Privacy',
    body: `CardPulse is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please email ${CONTACT_EMAIL} and we will delete it promptly.`,
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
    body: `Questions about this Privacy Policy or our data practices? Email ${CONTACT_EMAIL}. For GDPR/UK GDPR matters, the same address is the point of contact.`,
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

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
    title: '1. Acceptance of Terms',
    body: 'By downloading, installing, or using CardPulse ("the App"), you agree to be bound by these Terms of Use. If you do not agree, do not use the App.',
  },
  {
    title: '2. Eligibility',
    body: 'You must be at least 13 years old to use CardPulse. If you are under 18, you represent that you have your parent or guardian\'s permission to use the App and that they have read and agreed to these Terms.',
  },
  {
    title: '3. Your Account',
    body: 'You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. Notify us immediately of any unauthorized access. We reserve the right to suspend or terminate accounts that violate these Terms.',
  },
  {
    title: '4. Subscriptions and Billing',
    body: 'CardPulse Premium is offered as an auto-renewing subscription. Payment is charged to your Apple ID at confirmation of purchase. Your subscription automatically renews unless cancelled at least 24 hours before the end of the current period. You can manage and cancel subscriptions in your Apple ID account settings. No refunds are provided for partial subscription periods, except as required by applicable law.',
  },
  {
    title: '5. Pricing and Market Data',
    body: 'CardPulse aggregates publicly available pricing information from third-party marketplaces. Prices are estimates based on recent sold listings and are provided for informational purposes only. We make no guarantee as to accuracy, completeness, or timeliness. Market conditions change rapidly and historical prices do not predict future performance.',
  },
  {
    title: '6. Not Financial Advice',
    body: 'CardPulse is not a broker, dealer, or financial advisor. Nothing in the App constitutes investment, financial, legal, or tax advice. AI valuations, "AI Picks", and any other automated insights are algorithmic outputs based on historical data and should not be relied upon as recommendations to buy, sell, or hold any item. You are solely responsible for your own purchasing decisions.',
  },
  {
    title: '7. Acceptable Use',
    body: 'You agree not to: (a) reverse engineer, decompile, or attempt to extract the source code of the App; (b) use the App to violate any law or third-party rights; (c) scrape, harvest, or republish data from the App without written permission; (d) interfere with or disrupt the App or its servers; (e) impersonate any person or misrepresent your affiliation.',
  },
  {
    title: '8. Intellectual Property',
    body: 'The App, including all software, design, text, graphics, and trademarks, is owned by CardPulse and its licensors and is protected by copyright and other intellectual property laws. Pokemon and all related names, logos, and card images are trademarks of Nintendo, Game Freak, Creatures Inc., and The Pokemon Company. CardPulse is not affiliated with, endorsed by, or sponsored by these entities.',
  },
  {
    title: '9. Disclaimer of Warranties',
    body: 'THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE APP WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES.',
  },
  {
    title: '10. Limitation of Liability',
    body: 'TO THE MAXIMUM EXTENT PERMITTED BY LAW, CARDPULSE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE APP. OUR TOTAL LIABILITY FOR ANY CLAIM SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM.',
  },
  {
    title: '11. Changes to These Terms',
    body: 'We may revise these Terms from time to time. The "Last updated" date at the top of this page indicates when the Terms were last changed. Continued use of the App after changes are posted constitutes acceptance of the revised Terms.',
  },
  {
    title: '12. Termination',
    body: 'We may suspend or terminate your access to the App at any time, with or without cause or notice. Upon termination, your right to use the App ceases immediately. Sections 5–10 survive termination.',
  },
  {
    title: '13. Governing Law',
    body: 'These Terms are governed by the laws of the State of California, United States, without regard to its conflict of laws principles. Any dispute shall be resolved in the state or federal courts located in San Francisco County, California.',
  },
  {
    title: '14. Contact',
    body: 'Questions about these Terms? Email us at legal@cardpulse.app.',
  },
];

function TermsScreen() {
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
          <Text variant="headingSm">Terms of Use</Text>
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

export default withErrorBoundary(TermsScreen, 'Terms');

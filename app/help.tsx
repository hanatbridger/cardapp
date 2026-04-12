import React, { useState } from 'react';
import { View, ScrollView, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { IconChevronLeft, IconChevronDown, IconChevronUp, IconMail } from '@tabler/icons-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import { Text, Card, Button, withErrorBoundary } from '../src/components';
import { spacing, radius } from '../src/theme/tokens';
import { HORIZONTAL_PADDING } from '../src/constants/layout';

const FAQ = [
  {
    q: 'Where do the prices come from?',
    a: 'Prices are sourced from recently sold eBay listings. We track completed sales (not active listings) to show what cards are actually selling for.',
  },
  {
    q: 'What does "Undervalued" or "Overvalued" mean?',
    a: 'Our AI model analyzes pull cost (supply) and desirability (demand) to predict a fair market value. If a card trades below the predicted value, it\'s flagged as undervalued.',
  },
  {
    q: 'How many cards can I track for free?',
    a: 'Free users can track up to 5 cards. Upgrade to Premium for unlimited watchlist cards, price alerts, and AI insights.',
  },
  {
    q: 'How often are prices updated?',
    a: 'Prices refresh every 5-10 minutes from eBay sold listings. The price chart shows 30-day historical data.',
  },
  {
    q: 'What grades are supported?',
    a: 'We track PSA 10 (graded) and Raw (ungraded) prices. Prices are based on recent eBay sold listings for each grade.',
  },
  {
    q: 'How do price alerts work?',
    a: 'Set a target price for any card in your watchlist. You\'ll get notified when the market price crosses above or below your target.',
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Pressable onPress={() => setOpen(!open)}>
      <View style={{ paddingVertical: spacing[3], gap: open ? spacing[2] : 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
          <Text variant="bodyMd" style={{ flex: 1 }}>{q}</Text>
          {open
            ? <IconChevronUp size={18} color={colors.onSurfaceMuted} />
            : <IconChevronDown size={18} color={colors.onSurfaceMuted} />}
        </View>
        {open && (
          <Text variant="bodySm" color={colors.onSurfaceVariant}>
            {a}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function HelpScreen() {
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
          <Pressable onPress={() => router.back()} hitSlop={8} style={{ padding: spacing[1] }}>
            <IconChevronLeft size={24} color={colors.onSurface} />
          </Pressable>
          <Text variant="headingSm">Help & Support</Text>
        </View>

        <View style={{ paddingHorizontal: HORIZONTAL_PADDING, gap: spacing[5], paddingTop: spacing[4] }}>
          {/* FAQ */}
          <Card>
            <View style={{ gap: spacing[1] }}>
              <Text variant="labelLg" style={{ marginBottom: spacing[2] }}>
                Frequently Asked Questions
              </Text>
              {FAQ.map((item, i) => (
                <View key={i}>
                  {i > 0 && <View style={{ height: 1, backgroundColor: colors.outlineVariant }} />}
                  <FAQItem q={item.q} a={item.a} />
                </View>
              ))}
            </View>
          </Card>

          {/* Contact */}
          <Card>
            <View style={{ gap: spacing[3], alignItems: 'center' }}>
              <Text variant="labelLg">Still need help?</Text>
              <Text variant="bodySm" color={colors.onSurfaceVariant} style={{ textAlign: 'center' }}>
                Reach out and we'll get back to you within 24 hours.
              </Text>
              <Button
                variant="outlined"
                icon={<IconMail size={16} color={colors.primary} />}
                onPress={() => Linking.openURL('mailto:support@cardpulse.app')}
              >
                Contact Support
              </Button>
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default withErrorBoundary(HelpScreen, 'Help');

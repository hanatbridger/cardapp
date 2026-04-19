import React, { useState } from 'react';
import { View, Pressable, Linking } from 'react-native';
import Animated from 'react-native-reanimated';
import { IconChevronDown, IconChevronUp, IconMail } from '@tabler/icons-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import { Text, Card, Button, CollapsingHeader, withErrorBoundary } from '../src/components';
import { spacing } from '../src/theme/tokens';
import { HORIZONTAL_PADDING } from '../src/constants/layout';
import { useCollapsingHeader } from '../src/hooks';

const FAQ = [
  {
    q: 'Where do the prices come from?',
    a: 'Raw (ungraded) prices come from TCGPlayer\'s market price via the Pokemon TCG API. PSA 10 prices are estimated from current active eBay listings — we take the median asking price across recent listings, with statistical filters to remove outliers.',
  },
  {
    q: 'Are these prices what cards actually sold for?',
    a: 'No. Our PSA 10 prices reflect current asking prices on eBay, not completed sales. eBay restricts sold-listing data, so we use the next best signal — what sellers are currently asking. Asks tend to run slightly above actual sale prices.',
  },
  {
    q: 'Why does it say "Estimated from N listings"?',
    a: 'We aggregate the median price across N currently active eBay listings for that exact card and grade. More listings means a more reliable estimate. If we find fewer than 3 listings, we mark the data as insufficient and don\'t show a price.',
  },
  {
    q: 'How often are prices updated?',
    a: 'Prices are cached for up to 1 hour to keep things fast and avoid hitting eBay rate limits. Pull down on the Home screen to force a fresh fetch any time.',
  },
  {
    q: 'What does "Undervalued" or "Overvalued" mean?',
    a: 'Our AI model scores a card\'s pull cost (supply) and desirability (demand) and predicts a fair market value. If the live price trades meaningfully below or above that prediction, the card is flagged. Available only for cards in our scored dataset.',
  },
  {
    q: 'What grades are supported?',
    a: 'PSA 10 and Raw (ungraded). Other grading services and grades aren\'t supported yet.',
  },
  {
    q: 'How many cards can I track for free?',
    a: 'Free users can track up to 5 cards. Premium ($4.99/mo or $29.99/year) unlocks an unlimited watchlist and price alerts on every card.',
  },
  {
    q: 'How do I cancel Premium?',
    a: 'Manage or cancel your subscription anytime in your Apple ID settings (Settings → [your name] → Subscriptions). Cancellations take effect at the end of the current billing period.',
  },
  {
    q: 'How do price alerts work?',
    a: 'Set a target price on any card in your watchlist. When the market price crosses your target — above or below — you\'ll get a push notification. Premium only.',
  },
  {
    q: 'Why am I seeing "Demo data"?',
    a: 'For some cards we don\'t yet have enough live eBay listings to estimate a price. In that case we show a demo price clearly labeled "Demo data" so you can still see how the app works. Real prices appear once enough listings are available.',
  },
  {
    q: 'Is this financial advice?',
    a: 'No. CardPulse is informational only. Prices are estimates, AI valuations are algorithmic outputs, and nothing in the app is a recommendation to buy, sell, or hold. Markets move fast — make your own decisions.',
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Pressable onPress={() => setOpen(!open)} accessibilityLabel={q} accessibilityRole="button" accessibilityState={{ expanded: open }}>
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
  const { scrollHandler, headerAnimatedStyle, headerHeight } = useCollapsingHeader();

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <CollapsingHeader
        title="Help & Support"
        backFallback="/(tabs)/profile"
        animatedStyle={headerAnimatedStyle}
      />
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: headerHeight + spacing[4],
          paddingBottom: spacing[12],
        }}
      >
        <View style={{ paddingHorizontal: HORIZONTAL_PADDING, gap: spacing[5] }}>
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
      </Animated.ScrollView>
    </View>
  );
}

export default withErrorBoundary(HelpScreen, 'Help');

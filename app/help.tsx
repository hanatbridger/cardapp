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
    q: 'Where do raw card prices come from?',
    a: 'Raw (ungraded) prices come straight from TCGPlayer\'s Market Price — the rolling average of recent TCGPlayer marketplace sales. We pull the value live for every card you view, with a fallback to TCGPlayer\'s direct product API for newly released sets the cache hasn\'t indexed yet.',
  },
  {
    q: 'Why don\'t I see PSA 10 prices yet?',
    a: 'Graded card pricing requires a separate eBay sales data pipeline that we\'re finishing. PSA 10 tracking is gated until that ships in v1.1 — tap the PSA 10 toggle and you\'ll see a coming-soon panel. Raw prices work for every card in the meantime.',
  },
  {
    q: 'How do "Undervalued Right Now" and "Potentially Overvalued" work?',
    a: 'Both lists rank cards by today\'s biggest day-over-day price movement, sourced from collectrics.com\'s daily card leaderboard. Undervalued = biggest drops (rebound candidates). Overvalued = biggest spikes (cooldown candidates). Updates every morning around 5 AM Pacific.',
  },
  {
    q: 'How does the Trending Now rail work?',
    a: 'Same daily collectrics leaderboard — sorted by absolute price movement, not direction. So you see the day\'s biggest movers regardless of whether they jumped up or fell down. Different cards every day.',
  },
  {
    q: 'How often are prices updated?',
    a: 'Every card you view fetches a live price on open, with a 1-hour cache to keep navigation snappy. Pull down on the Home screen to force a fresh fetch any time.',
  },
  {
    q: 'How many cards can I track for free?',
    a: 'Free users can track up to 5 cards. Premium ($4.99/month or $29.99/year — save 50%) unlocks an unlimited watchlist and price alerts on every card.',
  },
  {
    q: 'How do price alerts work?',
    a: 'Set a target price on any card in your watchlist. When the live market price crosses your target — above or below — you\'ll get a push notification. Premium only.',
  },
  {
    q: 'How do I cancel Premium?',
    a: 'Manage or cancel anytime in your Apple ID settings (Settings → [your name] → Subscriptions). Cancellations take effect at the end of the current billing period — you keep Premium access until then.',
  },
  {
    q: 'How do I sign in?',
    a: 'CardPulse uses Sign in with Apple at launch. Tap the Apple button on the welcome screen — Apple handles the rest, no separate password to remember. Email/password sign-in is coming in a future update.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Profile tab → Delete Account. This signs you out, clears your local watchlist and preferences, and disconnects your Apple Sign In session. The action is immediate and can\'t be undone.',
  },
  {
    q: 'Is CardPulse affiliated with The Pokemon Company?',
    a: 'No. CardPulse is an independent price tracker. Pokemon and all related names, logos, and card images are trademarks of Nintendo, Game Freak, Creatures Inc., and The Pokemon Company. CardPulse is not affiliated with, endorsed by, or sponsored by these entities.',
  },
  {
    q: 'Is this financial advice?',
    a: 'No. CardPulse is informational only. Prices are market data sourced from public APIs; nothing in the app is a recommendation to buy, sell, or hold. Card markets are volatile — make your own decisions.',
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
                onPress={() => Linking.openURL('mailto:han@bridgercreative.com?subject=CardPulse%20Support')}
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

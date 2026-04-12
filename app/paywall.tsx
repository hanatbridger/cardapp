import React, { useState } from 'react';
import { View, ScrollView, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import {
  IconX,
  IconCheck,
  IconBell,
  IconChartLine,
  IconSparkles,
  IconInfinity,
  IconChartHistogram,
} from '@tabler/icons-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import {
  Text,
  Button,
  Card,
  ScreenBackground,
  withErrorBoundary,
} from '../src/components';
import { useUserStore } from '../src/stores/user-store';
import { spacing, radius } from '../src/theme/tokens';
import { HORIZONTAL_PADDING } from '../src/constants/layout';

type PlanId = 'monthly' | 'annual';

interface Plan {
  id: PlanId;
  label: string;
  price: string;
  period: string;
  badge?: string;
  hint?: string;
}

const PLANS: Plan[] = [
  {
    id: 'annual',
    label: 'Annual',
    price: '$29.99',
    period: '/year',
    badge: 'Save 50%',
    hint: 'Just $2.50/mo',
  },
  {
    id: 'monthly',
    label: 'Monthly',
    price: '$4.99',
    period: '/month',
  },
];

const FEATURES: { icon: React.ComponentType<any>; title: string; body: string }[] = [
  {
    icon: IconInfinity,
    title: 'Unlimited watchlist',
    body: 'Track every card you care about — no 5-card cap.',
  },
  {
    icon: IconBell,
    title: 'Real-time price alerts',
    body: 'Get notified the moment a card hits your target price.',
  },
  {
    icon: IconSparkles,
    title: 'AI valuation insights',
    body: 'See undervalued/overvalued signals across the entire market.',
  },
  {
    icon: IconChartHistogram,
    title: 'Full price history',
    body: 'Unlock 1Y and All-time charts plus eBay sale comparables.',
  },
  {
    icon: IconChartLine,
    title: 'Daily AI Picks',
    body: 'Curated under-the-radar cards delivered every morning.',
  },
];

function PaywallScreen() {
  const { colors } = useTheme();
  const setPremium = useUserStore((s) => s.setPremium);
  const [selected, setSelected] = useState<PlanId>('annual');
  const [purchasing, setPurchasing] = useState(false);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const purchase = async () => {
    setPurchasing(true);
    // In production this would call StoreKit / Google Play Billing via
    // expo-in-app-purchases or RevenueCat. For now we simulate the success.
    await new Promise((r) => setTimeout(r, 600));
    setPremium(true);
    setPurchasing(false);
    Alert.alert(
      'Welcome to Premium',
      'You now have access to unlimited tracking, alerts, and AI insights.',
      [{ text: 'Got it', onPress: close }],
    );
  };

  const restore = () => {
    Alert.alert(
      'Restore Purchases',
      "We'll check your Apple ID for any active subscriptions.",
    );
  };

  return (
    <ScreenBackground edges={['top', 'bottom']}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          paddingHorizontal: HORIZONTAL_PADDING,
          paddingTop: spacing[2],
        }}
      >
        <Pressable
          onPress={close}
          hitSlop={12}
          accessibilityLabel="Close"
          style={({ pressed }) => ({
            padding: spacing[2],
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <IconX size={24} color={colors.onSurface} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: HORIZONTAL_PADDING,
          paddingBottom: spacing[8],
          gap: spacing[6],
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={{ alignItems: 'center', gap: spacing[3], paddingTop: spacing[2] }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: radius.full,
              backgroundColor: colors.primaryContainer,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconSparkles size={36} color={colors.primary} />
          </View>
          <Text variant="displaySm" style={{ textAlign: 'center' }}>
            CardPulse Premium
          </Text>
          <Text
            variant="bodyMd"
            color={colors.onSurfaceVariant}
            style={{ textAlign: 'center', maxWidth: 320 }}
          >
            Track every card, get instant alerts, and unlock AI-powered insights.
          </Text>
        </View>

        {/* Features */}
        <Card>
          <View style={{ gap: spacing[4] }}>
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <View
                  key={f.title}
                  style={{ flexDirection: 'row', gap: spacing[3], alignItems: 'flex-start' }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: radius.md,
                      backgroundColor: colors.primaryContainer,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, gap: spacing[0.5] }}>
                    <Text variant="labelLg">{f.title}</Text>
                    <Text variant="bodySm" color={colors.onSurfaceVariant}>
                      {f.body}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Plans */}
        <View style={{ gap: spacing[3] }}>
          {PLANS.map((plan) => {
            const isSelected = plan.id === selected;
            return (
              <Pressable
                key={plan.id}
                onPress={() => setSelected(plan.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                style={({ pressed }) => ({
                  borderRadius: radius.xl,
                  borderWidth: 2,
                  borderColor: isSelected ? colors.primary : colors.outline,
                  backgroundColor: isSelected ? colors.primaryContainer : colors.surface,
                  padding: spacing[4],
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing[3],
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: radius.full,
                    borderWidth: 2,
                    borderColor: isSelected ? colors.primary : colors.outlineStrong,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isSelected && <IconCheck size={14} color={colors.primary} />}
                </View>
                <View style={{ flex: 1, gap: spacing[0.5] }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                    <Text variant="labelLg">{plan.label}</Text>
                    {plan.badge && (
                      <View
                        style={{
                          paddingHorizontal: spacing[2],
                          paddingVertical: 2,
                          borderRadius: radius.sm,
                          backgroundColor: colors.success,
                        }}
                      >
                        <Text variant="labelSm" color={colors.onPrimary}>
                          {plan.badge}
                        </Text>
                      </View>
                    )}
                  </View>
                  {plan.hint && (
                    <Text variant="caption" color={colors.onSurfaceVariant}>
                      {plan.hint}
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text variant="headingSm">{plan.price}</Text>
                  <Text variant="caption" color={colors.onSurfaceVariant}>
                    {plan.period}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* CTA */}
        <Button onPress={purchase} fullWidth size="lg" loading={purchasing}>
          Start Premium
        </Button>

        {/* Footer */}
        <View style={{ gap: spacing[3], alignItems: 'center' }}>
          <Pressable onPress={restore} hitSlop={8}>
            <Text variant="labelMd" color={colors.primary}>
              Restore purchases
            </Text>
          </Pressable>
          <Text
            variant="caption"
            color={colors.onSurfaceMuted}
            style={{ textAlign: 'center', maxWidth: 320 }}
          >
            Subscriptions auto-renew until cancelled. Manage in Settings ▸ Apple ID ▸
            Subscriptions. By subscribing you agree to our{' '}
            <Text
              variant="caption"
              color={colors.primary}
              onPress={() => router.push('/terms')}
            >
              Terms
            </Text>{' '}
            and{' '}
            <Text
              variant="caption"
              color={colors.primary}
              onPress={() => router.push('/privacy')}
            >
              Privacy Policy
            </Text>
            .
          </Text>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

export default withErrorBoundary(PaywallScreen, 'Paywall');

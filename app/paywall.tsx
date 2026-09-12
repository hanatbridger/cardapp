import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Alert, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  IconX,
  IconCheck,
  IconSparkles,
  IconInfinity,
  IconBellRinging,
  IconChartLine,
  IconBrain,
} from '@tabler/icons-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import {
  Text,
  Button,
  Card,
  withErrorBoundary,
} from '../src/components';
import { useUserStore } from '../src/stores/user-store';
import { spacing, radius } from '../src/theme/tokens';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
} from '../src/services/revenue-cat';
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

// Monthly first so users see the lower-commitment option up top —
// annual sits below as the upsell with the Save 50% badge doing the
// heavy lifting on conversion.
const PLANS: Plan[] = [
  {
    id: 'monthly',
    label: 'Monthly',
    price: '$4.99',
    period: '/month',
  },
  {
    id: 'annual',
    label: 'Annual',
    price: '$29.99',
    period: '/year',
    badge: 'Save 50%',
    hint: 'Just $2.50/mo',
  },
];

// Only list features that are actually gated by `isPremium` in code.
// Everything else — live eBay listings, AI Picks — is available on the
// free tier, so listing it here would be deceptive and grounds for App
// Store rejection under Guideline 2.3.1 (Accurate Metadata) and 3.1.2
// (Subscriptions must provide ongoing value). AI predictions moved INTO
// this list the same build that gated them on the card screen; the two
// have to change together or the metadata is wrong either way.
const FEATURES: { icon: React.ComponentType<any>; title: string; body: string }[] = [
  {
    icon: IconInfinity,
    title: 'Unlimited watchlist',
    body: 'Track every card you care about — no 5-card cap.',
  },
  {
    icon: IconBellRinging,
    title: 'Unlimited price alerts',
    body: 'Free keeps 3 active alerts. Premium removes the cap — set as many price thresholds as you follow.',
  },
  {
    icon: IconBrain,
    title: 'AI predictions',
    body: 'Fair value from pull cost, desirability and eBay supply and demand — undervalued, overvalued or fairly priced, on the cards we score.',
  },
  {
    icon: IconChartLine,
    title: 'Return since added',
    body: 'See how every card has moved since you added it, and get a push when it is up or down 20%.',
  },
];

// Alert.alert is a silent no-op on react-native-web — route through
// window.alert there (same pattern as profile.tsx / edit-profile.tsx).
function notify(title: string, message: string, onDismiss?: () => void) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    onDismiss?.();
  } else {
    Alert.alert(
      title,
      message,
      onDismiss ? [{ text: 'Got it', onPress: onDismiss }] : undefined,
    );
  }
}

/** Same band as every other sheet — see components/BottomSheet.tsx. */
const ENTER_MS = 260;
const EXIT_MS = 220;

function PaywallScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const setPremium = useUserStore((s) => s.setPremium);
  const isPremium = useUserStore((s) => s.isPremium);
  const [selected, setSelected] = useState<PlanId>('monthly');
  const [purchasing, setPurchasing] = useState(false);
  const [offerings, setOfferings] = useState<any>(null);

  useEffect(() => {
    getOfferings().then(setOfferings);
  }, []);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  // Match by identifier ($rc_monthly/$rc_annual are identifier values,
  // NOT packageType — packageType is the MONTHLY/ANNUAL enum), then by
  // packageType, then positional only when neither matched.
  const packageForPlan = (plan: PlanId) => {
    const packages = offerings?.availablePackages;
    if (!packages?.length) return undefined;
    const identifier = plan === 'monthly' ? '$rc_monthly' : '$rc_annual';
    const type = plan === 'monthly' ? 'MONTHLY' : 'ANNUAL';
    return (
      packages.find((p: any) => p.identifier === identifier) ??
      packages.find((p: any) => p.packageType === type) ??
      packages[plan === 'monthly' ? 0 : 1]
    );
  };

  // Real store prices drive the annual hint + save badge once offerings
  // load. The PLANS literals are the fallback: always while offerings
  // are null, and per-field when the loaded packages lack a usable
  // price/currency (the visible prices fall back to the same literals
  // then, so the chrome stays consistent).
  const annualPlan = PLANS.find((p) => p.id === 'annual')!;
  let annualHint = annualPlan.hint;
  let annualBadge = annualPlan.badge;
  if (offerings) {
    const annual = packageForPlan('annual')?.product;
    const monthly = packageForPlan('monthly')?.product;
    if (typeof annual?.price === 'number' && annual.currencyCode) {
      try {
        const perMonth = new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: annual.currencyCode,
        }).format(annual.price / 12);
        annualHint = `Just ${perMonth}/mo`;
      } catch {
        // Unknown currency code — keep the USD literal.
      }
    }
    if (
      typeof annual?.price === 'number' &&
      typeof monthly?.price === 'number' &&
      monthly.price > 0
    ) {
      const pct = Math.round((1 - annual.price / (monthly.price * 12)) * 100);
      // Hide the badge on implausible numbers (mispriced test products,
      // annual >= 12x monthly) rather than advertise a bogus discount.
      annualBadge = pct >= 5 && pct <= 90 ? `Save ${pct}%` : undefined;
    }
  }

  const purchase = async () => {
    const pkg = packageForPlan(selected);

    if (!pkg && Platform.OS !== 'web') {
      notify('Error', 'Subscription products are not available yet. Please try again later.');
      return;
    }

    setPurchasing(true);
    try {
      if (Platform.OS === 'web') {
        // There is no web checkout — RevenueCat/IAP is native-only. The
        // deployed web build (__DEV__ === false) must NOT grant premium:
        // it's public and skips the auth gate, so simulating a purchase
        // would let any anonymous visitor unlock premium for free. Keep
        // the simulate-grant for local dev/preview only; in production
        // web, point the user to the app where premium is actually sold.
        if (__DEV__) {
          await new Promise((r) => setTimeout(r, 600));
          setPremium(true);
        } else {
          setPurchasing(false);
          notify(
            'Get Premium in the app',
            'CardPulse Premium is purchased in the iOS app. Download CardPulse and subscribe there — your premium unlocks across your devices.',
          );
          return;
        }
      } else {
        const success = await purchasePackage(pkg);
        if (success) setPremium(true);
        else { setPurchasing(false); return; }
      }
      setPurchasing(false);
      notify(
        'Welcome to Premium',
        'Your watchlist is now unlimited and price alerts are unlocked on every card.',
        close,
      );
    } catch (e: any) {
      setPurchasing(false);
      notify('Purchase Failed', e.message || 'Something went wrong. Please try again.');
    }
  };

  const restore = async () => {
    setPurchasing(true);
    try {
      const success = await restorePurchases();
      setPurchasing(false);
      if (success) {
        setPremium(true);
        notify('Premium Restored', 'Welcome back! Your premium subscription has been restored.');
      } else {
        notify(
          'No Subscription Found',
          "We didn't find an active CardPulse subscription. If you subscribed on another device, sign in with the same Apple ID and try again.",
        );
      }
    } catch {
      setPurchasing(false);
      notify('Restore Failed', 'Could not restore purchases. Please try again.');
    }
  };

  return (
    // A tray, not a full screen: it slides up over the card the user was
    // reading, and the gap above it is what keeps the hero off the
    // status bar — the old full-bleed modal clipped the sparkle.
    // Pinned rather than flex:1 — the transparent modal's container is
    // unbounded on web, so a flex child sat below the fold instead of
    // filling the viewport.
    <View style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]}>
      <Animated.View
        entering={FadeIn.duration(ENTER_MS)}
        exiting={FadeOut.duration(EXIT_MS)}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.scrim }}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        />
      </Animated.View>

      <Animated.View
        entering={SlideInDown.duration(ENTER_MS).easing(Easing.out(Easing.cubic))}
        exiting={SlideOutDown.duration(EXIT_MS).easing(Easing.in(Easing.cubic))}
        style={{
          // Fixed at most of the screen rather than hugging: a ScrollView
          // in an unbounded parent reports almost no height, and the tray
          // came up as a sliver. The app stays visible above it either way.
          height: height * 0.92,
          backgroundColor: colors.surface,
          borderTopLeftRadius: radius['2xl'],
          borderTopRightRadius: radius['2xl'],
          overflow: 'hidden',
          paddingTop: spacing[3],
        }}
      >
        {/* Handle bar — same grammar as every other sheet in the app. */}
        <View style={{ alignItems: 'center', paddingBottom: spacing[2] }}>
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: radius.full,
              backgroundColor: colors.outline,
            }}
          />
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            paddingHorizontal: HORIZONTAL_PADDING,
          }}
        >
          <Pressable
            onPress={close}
            hitSlop={12}
            accessibilityLabel="Close"
            accessibilityRole="button"
            style={({ pressed }) => ({
              padding: spacing[2],
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <IconX size={24} color={colors.onSurface} />
          </Pressable>
        </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: HORIZONTAL_PADDING,
          // Clear the home indicator — the tray owns its own bottom inset.
          paddingBottom: Math.max(insets.bottom, spacing[4]) + spacing[6],
          gap: spacing[6],
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={{ alignItems: 'center', gap: spacing[3] }}>
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
            Track unlimited cards and get pushed the moment prices hit your alerts.
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
            const badge = plan.id === 'annual' ? annualBadge : plan.badge;
            const hint = plan.id === 'annual' ? annualHint : plan.hint;
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
                    {badge && (
                      <View
                        style={{
                          paddingHorizontal: spacing[2],
                          paddingVertical: 2,
                          borderRadius: radius.sm,
                          backgroundColor: colors.success,
                        }}
                      >
                        <Text variant="labelSm" color={colors.onPrimary}>
                          {badge}
                        </Text>
                      </View>
                    )}
                  </View>
                  {hint && (
                    <Text variant="caption" color={colors.onSurfaceVariant}>
                      {hint}
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {/* Store-localized price when offerings have loaded;
                      USD literal is only the loading fallback. */}
                  <Text variant="headingSm">
                    {packageForPlan(plan.id)?.product?.priceString ?? plan.price}
                  </Text>
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
      </Animated.View>
    </View>
  );
}

export default withErrorBoundary(PaywallScreen, 'Paywall');

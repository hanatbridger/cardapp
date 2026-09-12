import React, { useMemo, useState } from 'react';
import { View, Pressable, ScrollView, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { IconBellPlus, IconBellRinging } from '@tabler/icons-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius } from '../theme/tokens';
import { withAlpha } from '../utils/withAlpha';
import { useMoney } from '../hooks/use-money';
import { Text } from './Text';
import { Card } from './Card';
import { Button } from './Button';
import { GradingAlertModal } from './GradingAlertModal';
import {
  useAlertsStore,
  isGradingAlert,
  MAX_FREE_ALERTS,
  type GradingAlert,
} from '../stores/alerts-store';
import { requestNotificationPermission } from '../services/notifications';
import {
  computeGradingVerdict,
  CONDITION_ORDER,
  CONDITION_LABELS,
  CONDITION_HINTS,
  GRADING_FEE_LABEL,
  type CardCondition,
  type GradingOutcome,
  type GradingAlertDirection,
} from '../services/grading-verdict';
import type { Psa10Population } from '../services/card-stats';

interface GradingVerdictProps {
  cardId: string;
  cardName: string;
  /** Collector number — with cardName, keys the collectrics stats lookup. */
  cardNumber: string;
  /** Live raw market price (same number the price section shows). */
  rawPrice: number;
  /** Live PSA 10 sold price from the card-stats proxy. */
  psa10Price: number;
  /** PSA population census; null when collectrics has none for this card. */
  pop: Psa10Population | null;
  /**
   * Render without the Card shell — for use inside CollapsibleCard. The
   * verdict header stays: "Grade it" plus the letter grade IS the
   * headline here, and it is what the collapsed peek should show.
   */
  bare?: boolean;
}

/**
 * "Worth grading?" — expected-value verdict for sending the raw card to
 * PSA. Renders only when both a real raw price and a real PSA 10 sold
 * price exist (the caller gates); PSA 9/8 prices are modeled and labeled
 * as estimates. Math lives in services/grading-verdict.ts. The footer
 * arms a grading-ROI alert that re-runs this verdict on live data.
 */
export function GradingVerdict({
  cardId,
  cardName,
  cardNumber,
  rawPrice,
  psa10Price,
  pop,
  bare,
}: GradingVerdictProps) {
  const { colors } = useTheme();
  const formatMoney = useMoney();
  const [condition, setCondition] = useState<CardCondition>('near_mint');
  const [alertVisible, setAlertVisible] = useState(false);

  // The find returns the same object while the rule is unchanged, so
  // the selector is reference-stable across unrelated store writes.
  const activeAlert = useAlertsStore((s) =>
    s.alerts.find(
      (a): a is GradingAlert => isGradingAlert(a) && a.cardId === cardId && !a.triggered,
    ),
  );
  const addGradingAlert = useAlertsStore((s) => s.addGradingAlert);
  const removeAlert = useAlertsStore((s) => s.removeAlert);

  const verdict = useMemo(
    () =>
      computeGradingVerdict({
        rawPrice,
        psa10Price,
        gemRatePct: pop ? pop.gemPct : null,
        condition,
      }),
    [rawPrice, psa10Price, pop, condition],
  );
  if (!verdict) return null;

  const verdictColor = verdict.worthGrading ? colors.success : colors.danger;
  const letterColor =
    verdict.letter === 'A' || verdict.letter === 'B'
      ? colors.success
      : verdict.letter === 'C' || verdict.letter === 'D'
        ? colors.warning
        : colors.danger;

  const signedMoney = (n: number) => `${n >= 0 ? '+' : '−'}${formatMoney(Math.abs(n))}`;

  // Mirrors the card screen's price-alert gate: editing an existing rule
  // is always allowed; a NEW one beyond the free cap goes to the upsell.
  const openAlert = () => {
    if (activeAlert || useAlertsStore.getState().canAddAlert()) {
      setAlertVisible(true);
      return;
    }
    Alert.alert(
      'Alert limit reached',
      `Free accounts can keep ${MAX_FREE_ALERTS} active alerts. Upgrade to Premium for unlimited alerts, or remove an existing alert first.`,
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Upgrade', onPress: () => router.push('/paywall') },
      ],
    );
  };

  const submitAlert = async (direction: GradingAlertDirection, thresholdNet: number) => {
    // Re-check the cap at submit time in case state changed while the
    // sheet was open (e.g. an alert fired). Upsert on card, so editing
    // never trips the cap.
    const result = addGradingAlert({
      cardId,
      cardName,
      cardNumber,
      condition,
      direction,
      thresholdNet,
    });
    if (!result.ok) {
      Alert.alert(
        'Alert limit reached',
        `Free accounts can keep ${MAX_FREE_ALERTS} active alerts. Upgrade to Premium for unlimited alerts.`,
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/paywall') },
        ],
      );
      return;
    }
    // Ask for OS permission the first time the user creates an alert.
    // The alert is kept even if denied — the in-app notifications screen
    // works without OS permission.
    const granted = await requestNotificationPermission();
    if (!granted && Platform.OS !== 'web') {
      Alert.alert(
        'Notifications disabled',
        "We saved your alert, but you'll only see it inside the app. Enable notifications in Settings to get banners.",
      );
    }
  };

  const describeAlert = (a: GradingAlert) =>
    `Alerts when expected value ${a.direction === 'above' ? 'reaches' : 'drops under'} ${
      a.thresholdNet === 0 ? 'break-even' : signedMoney(a.thresholdNet)
    } at ${CONDITION_LABELS[a.condition]}.`;

  const oddsRows: Array<{ label: string; p: number }> = [
    { label: 'PSA 10', p: verdict.dist.p10 },
    { label: 'PSA 9', p: verdict.dist.p9 },
    { label: 'PSA 8', p: verdict.dist.p8 },
    { label: '7 or under', p: verdict.dist.below },
  ];

  const outcomeRow = (heading: string, o: GradingOutcome) => (
    <View
      key={heading}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing[2],
      }}
    >
      <Text variant="caption" color={colors.onSurfaceMuted} style={{ width: 84 }}>
        {heading}
      </Text>
      <Text variant="labelMd" style={{ flex: 1 }}>
        {o.label}
        {o.real ? '' : ' (est.)'}
      </Text>
      <Text variant="labelMd" color={colors.onSurfaceVariant} style={{ fontVariant: ['tabular-nums'] }}>
        {formatMoney(o.price)}
      </Text>
      <Text
        variant="labelMd"
        color={o.net >= 0 ? colors.success : colors.danger}
        style={{ width: 76, textAlign: 'right', fontVariant: ['tabular-nums'] }}
      >
        {signedMoney(o.net)}
      </Text>
    </View>
  );

  const body = (
    <>
      <View style={{ gap: spacing[4] }}>
        {/* Header: verdict + letter grade */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text variant="headingMd" color={verdictColor}>
              {verdict.worthGrading ? 'Grade it' : 'Sell it raw'}
            </Text>
          </View>
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: 52,
              height: 52,
              borderRadius: radius.md,
              backgroundColor: withAlpha(letterColor, 0.14),
            }}
            accessibilityLabel={`Grading value ${verdict.letter}, ${signedMoney(verdict.expectedNet)} expected`}
          >
            <Text variant="headingLg" color={letterColor}>{verdict.letter}</Text>
          </View>
        </View>

        <Text variant="bodySm" color={colors.onSurfaceVariant}>
          Most likely outcome at {CONDITION_LABELS[condition]}: a {verdict.likely.label}
          {verdict.likely.real ? '' : ' (est.)'} around {formatMoney(verdict.likely.price)} —{' '}
          {signedMoney(verdict.likely.net)} after the grading cost. Expected value across all
          outcomes: {signedMoney(verdict.expectedNet)}.
        </Text>

        {/* Condition picker — TCG-standard condition scale. One
            horizontal rail that bleeds under the card's own padding on
            both sides (negative margins matching Card's default inset),
            so chips scroll edge-to-edge instead of wrapping. */}
        <View style={{ gap: spacing[2] }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -spacing[6] }}
            contentContainerStyle={{ paddingHorizontal: spacing[6], gap: spacing[2] }}
          >
            {CONDITION_ORDER.map((c) => {
              const selected = c === condition;
              return (
                <Pressable
                  key={c}
                  onPress={() => setCondition(c)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Condition ${CONDITION_LABELS[c]}`}
                  hitSlop={4}
                  style={{
                    paddingHorizontal: spacing[3],
                    paddingVertical: spacing[2],
                    borderRadius: radius.full,
                    backgroundColor: selected ? withAlpha(colors.primary, 0.15) : colors.surfaceVariant,
                    borderWidth: 1,
                    borderColor: selected ? withAlpha(colors.primary, 0.4) : colors.outline,
                  }}
                >
                  <Text variant="labelMd" color={selected ? colors.primary : colors.onSurfaceVariant}>
                    {CONDITION_LABELS[c]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Text variant="caption" color={colors.onSurfaceMuted}>
            {CONDITION_HINTS[condition]}
          </Text>
        </View>

        {/* Outcomes — the downside row folds away when the most likely
            outcome already IS the worst bucket (rough conditions). */}
        <View>
          {outcomeRow('Best case', verdict.best)}
          <View style={{ height: 1, backgroundColor: colors.outlineVariant }} />
          {outcomeRow('Most likely', verdict.likely)}
          {verdict.downside.label !== verdict.likely.label && (
            <>
              <View style={{ height: 1, backgroundColor: colors.outlineVariant }} />
              {outcomeRow('Downside', verdict.downside)}
            </>
          )}
        </View>

        {/* Odds bars */}
        <View style={{ gap: spacing[1.5] }}>
          {oddsRows.map(({ label, p }) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
              <Text variant="caption" color={colors.onSurfaceVariant} style={{ width: 72 }}>
                {label}
              </Text>
              <View
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: radius.full,
                  backgroundColor: colors.outlineVariant,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: `${Math.round(p * 100)}%`,
                    height: '100%',
                    borderRadius: radius.full,
                    backgroundColor: withAlpha(colors.primary, 0.8),
                  }}
                />
              </View>
              <Text
                variant="caption"
                color={colors.onSurfaceMuted}
                style={{ width: 36, textAlign: 'right', fontVariant: ['tabular-nums'] }}
              >
                {Math.round(p * 100)}%
              </Text>
            </View>
          ))}
        </View>

        {/* Grading alert — arm / show the rule that re-runs this verdict
            on live data. Amber bell = grading, matching the PSA 10 grade
            colour elsewhere. */}
        <View style={{ height: 1, backgroundColor: colors.outlineVariant }} />
        {activeAlert ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
            <IconBellRinging size={16} color={colors.warning} />
            <Text variant="caption" color={colors.onSurfaceVariant} style={{ flex: 1 }}>
              {describeAlert(activeAlert)}
            </Text>
            <Pressable
              onPress={openAlert}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Edit grading alert"
              style={{ paddingVertical: spacing[1], paddingLeft: spacing[2] }}
            >
              <Text variant="labelMd" color={colors.primary}>Edit</Text>
            </Pressable>
          </View>
        ) : (
          // Full width, and tall enough to clear the 44pt touch minimum —
          // the row wrapper existed only to shrink it to its label.
          <Button
            variant="tonal"
            size="lg"
            fullWidth
            icon={<IconBellPlus size={16} color={colors.onPrimaryContainer} />}
            onPress={openAlert}
            accessibilityLabel="Alert me when this verdict flips"
          >
            Alert me when this flips
          </Button>
        )}

        {/* Provenance footer */}
        <Text variant="caption" color={colors.onSurfaceMuted}>
          {pop
            ? `Gem rate ${pop.gemPct.toFixed(1)}% · PSA pop ${pop.total.toLocaleString()} (${pop.psa10.toLocaleString()} tens) · `
            : ''}
          Fee: {GRADING_FEE_LABEL}. PSA 10 is a live sold price; PSA 9 and under are estimates
          modeled from the PSA 10 and raw prices. Not financial advice — outcomes aren't
          guaranteed.
        </Text>
      </View>

      <GradingAlertModal
        visible={alertVisible}
        onClose={() => setAlertVisible(false)}
        onSubmit={submitAlert}
        cardName={cardName}
        condition={condition}
        currentNet={verdict.expectedNet}
        existingAlert={activeAlert}
        onRemove={
          activeAlert
            ? () => {
                removeAlert(activeAlert.id);
                setAlertVisible(false);
              }
            : undefined
        }
      />
    </>
  );

  // Inside CollapsibleCard the Card comes from the wrapper; a second one
  // would double the padding and the border.
  return bare ? body : <Card>{body}</Card>;
}

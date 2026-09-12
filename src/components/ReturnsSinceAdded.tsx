import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { IconLock } from '@tabler/icons-react-native';
import { Text } from './Text';
import { Card } from './Card';
import { Button } from './Button';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius } from '../theme/tokens';
import { withAlpha } from '../utils/withAlpha';
import { useMoney } from '../hooks/use-money';
import {
  sinceAddedReturn,
  formatBaselineDate,
  formatSignedPct,
} from '../services/since-added';
import { useUserStore } from '../stores/user-store';
import { useWatchlistStore, isCardItem, type CardWatchlistItem } from '../stores/watchlist-store';
import type { GradeType } from '../constants/grades';

const UNKNOWN = '—';

interface ReturnsSinceAddedProps {
  cardId: string;
  /** Scopes the watchlist lookup — a card can be watched raw and graded. */
  grade: GradeType;
  /** Live price the card screen already holds; unknown when absent. */
  currentPrice?: number | null;
  /**
   * Previous close from the price payload. Only trusted when
   * `previousDate` is also present: the payload sets previousPrice equal
   * to the current price when it has no history, and measuring today's
   * return against that would print a fabricated $0.00.
   */
  previousPrice?: number | null;
  /** Date the previous close was taken; absent means none recorded. */
  previousDate?: string | null;
}

const finitePositive = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n > 0;

/**
 * "Track your returns since added" — the Premium returns panel on the
 * card detail screen, between Price History and Recent sales. Total
 * return runs off the watchlist baseline captured when the card was
 * added (services/since-added.ts owns that math); today's return runs
 * off the price payload's previous close.
 *
 * Three states in one shell: the full table, a prompt to add the card
 * when there is no baseline to measure from, and a locked preview for
 * free accounts. Any number we don't actually have prints an em dash —
 * a zero would read as "flat today" when the truth is "we don't know
 * yesterday's close for this card".
 */
export function ReturnsSinceAdded({
  cardId,
  grade,
  currentPrice,
  previousPrice,
  previousDate,
}: ReturnsSinceAddedProps) {
  const { colors } = useTheme();
  const formatMoney = useMoney();
  const isPremium = useUserStore((s) => s.isPremium);

  // The find returns the same object while the row is unchanged, so the
  // selector is reference-stable across unrelated store writes.
  const item = useWatchlistStore((s) =>
    s.items.find(
      (i): i is CardWatchlistItem =>
        isCardItem(i) && i.cardId === cardId && i.grade === grade,
    ),
  );

  const title = (
    <Text variant="headingSm">Track your returns since added</Text>
  );

  if (!isPremium) {
    return (
      <Card>
        <View style={{ gap: spacing[4] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: radius.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: withAlpha(colors.primary, 0.14),
              }}
            >
              <IconLock size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>{title}</View>
          </View>
          <Text variant="bodySm" color={colors.onSurfaceVariant}>
            Premium records the price the moment you add a card, then shows what
            it has made or lost since — today and in total.
          </Text>
          <Button
            variant="tonal"
            size="lg"
            fullWidth
            onPress={() => router.push('/paywall')}
            accessibilityLabel="Unlock returns since added with Premium"
          >
            Unlock with Premium
          </Button>
        </View>
      </Card>
    );
  }

  const total = item ? sinceAddedReturn(item, currentPrice) : null;
  // Read the baseline into locals so the guard below narrows both for the
  // rest of the render.
  const baselineAt = item?.baselineAt;
  const baselinePrice = item?.baselinePrice;

  // No baseline to measure from — either the card isn't watched, or it
  // was added before its price loaded and hasn't been stamped yet.
  if (!item || !baselineAt || !finitePositive(baselinePrice)) {
    return (
      <Card>
        <View style={{ gap: spacing[2] }}>
          {title}
          <Text variant="bodySm" color={colors.onSurfaceVariant}>
            Add to watchlist to track returns
          </Text>
        </View>
      </Card>
    );
  }

  // Previous close is optional in the payload, so today's return stays
  // unknown rather than collapsing to zero.
  const prevClose = previousDate && finitePositive(previousPrice) ? previousPrice : null;
  const today =
    prevClose !== null && finitePositive(currentPrice)
      ? {
          amount: currentPrice - prevClose,
          pct: ((currentPrice - prevClose) / prevClose) * 100,
        }
      : null;
  // formatBaselineDate returns '' for an unparseable stamp, so fall back
  // to the plain wording rather than speaking "since ".
  const prevCloseDate = previousDate ? formatBaselineDate(previousDate) : '';
  const prevCloseTail = prevCloseDate ? `since ${prevCloseDate}` : 'today';
  const baselineDate = formatBaselineDate(baselineAt);
  const baselineTail = baselineDate ? `since ${baselineDate}` : 'since added';
  // sinceAddedReturn already rejected a non-live price, but narrow again
  // so the subtraction below reads as arithmetic and not an assertion.
  const totalValue =
    total && finitePositive(currentPrice)
      ? { amount: currentPrice - total.baselinePrice, pct: total.pct }
      : null;

  const returnRow = (
    label: string,
    value: { amount: number; pct: number } | null,
    spokenTail: string,
  ) => {
    // Colour follows the rounded figure actually printed, so a "+0.0%"
    // never shows green (same rule as SinceAddedLabel).
    const shownPct = value ? Math.round(value.pct * 10) / 10 : 0;
    const color = !value
      ? colors.onSurfaceMuted
      : shownPct > 0
        ? colors.success
        : shownPct < 0
          ? colors.danger
          : colors.onSurfaceMuted;
    const absMoney = value ? formatMoney(Math.abs(value.amount)) : UNKNOWN;
    const money = value
      ? `${shownPct > 0 ? '+' : shownPct < 0 ? '−' : ''}${absMoney}`
      : UNKNOWN;
    // Colour alone carries direction visually, so the spoken string says
    // up/down/flat in words.
    const spoken = value
      ? `${label}, ${shownPct > 0 ? 'up' : shownPct < 0 ? 'down' : 'flat'} ${absMoney}, ${Math.abs(shownPct).toFixed(1)} percent ${spokenTail}`
      : `${label}, not available`;

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing[2],
          paddingVertical: spacing[3],
        }}
        accessible
        accessibilityLabel={spoken}
      >
        <Text variant="bodySm" color={colors.onSurfaceVariant} style={{ flex: 1 }}>
          {label}
        </Text>
        <Text variant="bodyMd" color={color} style={{ fontVariant: ['tabular-nums'] }}>
          {money}
        </Text>
        <Text
          variant="labelLg"
          color={color}
          style={{ width: 68, textAlign: 'right', fontVariant: ['tabular-nums'] }}
        >
          {value ? formatSignedPct(shownPct) : UNKNOWN}
        </Text>
      </View>
    );
  };

  return (
    <Card>
      <View style={{ gap: spacing[4] }}>
        {title}

        {/* Baseline the returns below are measured from */}
        <View style={{ flexDirection: 'row', gap: spacing[4] }}>
          <View style={{ flex: 1, gap: spacing['0.5'] }}>
            <Text variant="caption" color={colors.onSurfaceMuted}>Date added</Text>
            <Text variant="labelLg">{baselineDate || UNKNOWN}</Text>
          </View>
          <View style={{ flex: 1, gap: spacing['0.5'] }}>
            <Text variant="caption" color={colors.onSurfaceMuted}>Price when added</Text>
            <Text variant="labelLg" style={{ fontVariant: ['tabular-nums'] }}>
              {formatMoney(baselinePrice)}
            </Text>
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: colors.outlineVariant }} />

        <View>
          {returnRow("Today's return", today, prevCloseTail)}
          <View style={{ height: 1, backgroundColor: colors.outlineVariant }} />
          {returnRow('Total return', totalValue, baselineTail)}
        </View>

        {/* Say why a row is dashed rather than leaving it unexplained. */}
        {!today && (
          <Text variant="caption" color={colors.onSurfaceMuted}>
            {finitePositive(currentPrice)
              ? "We don't have a previous close for this card yet, so today's return isn't available."
              : "Waiting on a live price — returns fill in once it loads."}
          </Text>
        )}
      </View>
    </Card>
  );
}

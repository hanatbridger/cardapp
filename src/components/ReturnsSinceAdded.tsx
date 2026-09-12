import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Text } from './Text';
import { Card } from './Card';
import { CollapsibleCard } from './CollapsibleCard';
import { useTheme } from '../theme/ThemeProvider';
import { spacing } from '../theme/tokens';
import { useMoney } from '../hooks/use-money';
import {
  sinceAddedReturn,
  formatBaselineDate,
} from '../services/since-added';
import { useUserStore } from '../stores/user-store';
import { useWatchlistStore, isCardItem, type CardWatchlistItem } from '../stores/watchlist-store';
import type { GradeType } from '../constants/grades';

const UNKNOWN = '—';
/** A locked card never toggles; CollapsibleCard still wants a handler. */
const NOOP = () => {};

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

  const title = <Text variant="headingSm">Track your returns since added</Text>;

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
    first: boolean,
  ) => {
    // Rounded figure decides the sign shown, so a "+0.0%" never prints a
    // plus (same rule as SinceAddedLabel).
    const shownPct = value ? Math.round(value.pct * 10) / 10 : 0;
    const absMoney = value ? formatMoney(Math.abs(value.amount)) : UNKNOWN;
    // One string, money and percent together, exactly as drawn.
    const shown = value
      ? `${shownPct > 0 ? '+' : shownPct < 0 ? '−' : ''}${absMoney} (${Math.abs(shownPct).toFixed(2)}%)`
      : UNKNOWN;
    const spoken = value
      ? `${label}, ${shownPct > 0 ? 'up' : shownPct < 0 ? 'down' : 'flat'} ${absMoney}, ${Math.abs(shownPct).toFixed(1)} percent ${spokenTail}`
      : `${label}, not available`;

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing[3],
          // 24/12 on the first row, 12/12 after — the design's rhythm.
          paddingTop: first ? spacing[6] : spacing[3],
          paddingBottom: spacing[3],
        }}
        accessible
        accessibilityLabel={spoken}
      >
        <Text variant="labelMd" color={colors.onSurfaceMuted}>
          {label}
        </Text>
        <Text
          variant="bodyMd"
          color={value ? colors.onSurface : colors.onSurfaceMuted}
          style={{ flex: 1, textAlign: 'right', fontVariant: ['tabular-nums'] }}
        >
          {shown}
        </Text>
      </View>
    );
  };

  const body = (
      <View style={{ gap: spacing[6] }}>
        {/* Baseline the returns below are measured from */}
        <View style={{ flexDirection: 'row', gap: spacing[3] }}>
          <View style={{ flex: 1, gap: spacing[1] }}>
            <Text variant="labelMd" color={colors.onSurfaceMuted}>Date added</Text>
            <Text variant="numerals">{baselineDate || UNKNOWN}</Text>
          </View>
          <View style={{ flex: 1, gap: spacing[1] }}>
            <Text variant="labelMd" color={colors.onSurfaceMuted}>Price when added</Text>
            <Text variant="numerals">{formatMoney(baselinePrice)}</Text>
          </View>
        </View>

        <View>
          {/* outline, not outlineVariant: on the card's own fill the
              subtler token is invisible, which is no divider at all. */}
          <View style={{ height: 1, backgroundColor: colors.outline }} />
          {returnRow("Today's return", today, prevCloseTail, true)}
          {returnRow('Total return', totalValue, baselineTail, false)}

          {/* Say why a row is dashed rather than leaving it unexplained. */}
          {!today && (
            <Text variant="caption" color={colors.onSurfaceMuted}>
              {finitePositive(currentPrice)
                ? "We don't have a previous close for this card yet, so today's return isn't available."
                : "Waiting on a live price — returns fill in once it loads."}
            </Text>
          )}
        </View>
      </View>
  );

  if (!isPremium) {
    // The tease is the pitch: a free account sees its OWN entry price and
    // its OWN return, going illegible under the ramp. Nothing is invented
    // and nothing is fully readable — the peek stops inside the baseline
    // row, so the numbers are already fading where they appear.
    return (
      <CollapsibleCard
        title="Track your returns since added"
        expanded={false}
        onToggle={NOOP}
        locked
        lockedLabel="Upgrade to view"
        onUnlock={() => router.push('/paywall')}
        collapsedHeight={64}
      >
        {body}
      </CollapsibleCard>
    );
  }

  return (
    <Card>
      <View style={{ gap: spacing[4] }}>
        {title}
        {body}
      </View>
    </Card>
  );
}

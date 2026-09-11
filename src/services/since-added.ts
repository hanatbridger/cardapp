/**
 * Return since added — the watchlist's "how has this done since I
 * started watching it" number, and the ±20% push that goes with it
 * (Premium). Modelled on the broker-app pattern: the price is captured
 * the moment an item is added and every later read is measured against
 * that baseline, so the number answers "was watching this worth it"
 * rather than "what did it do today".
 *
 * Pure functions only. The store owns the baseline fields
 * (watchlist-store.ts); the checker (alert-checker.ts) and Home call in
 * here with whatever live price they have.
 */

export const RETURN_ALERT_THRESHOLD_PCT = 20;

export type ReturnDirection = 'up' | 'down';

export interface BaselineFields {
  /** USD price when the item was added (or when tracking began). */
  baselinePrice?: number;
  /** ISO timestamp the baseline was captured. */
  baselineAt?: string;
  /** Thresholds already pushed for, so each fires once per direction. */
  returnAlerted?: { up?: boolean; down?: boolean };
}

export interface SinceAdded {
  /** Percent return from the baseline to the current price. */
  pct: number;
  baselinePrice: number;
  baselineAt: string;
}

const finitePositive = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n > 0;

/**
 * null when there is no usable baseline or no usable current price —
 * the row then falls back to whatever it showed before this shipped.
 */
export function sinceAddedReturn(
  item: BaselineFields,
  currentPrice: number | undefined | null,
): SinceAdded | null {
  if (!item.baselineAt || !finitePositive(item.baselinePrice)) return null;
  // A zero or negative price is a feed error, not a -100% return.
  if (!finitePositive(currentPrice)) return null;
  return {
    pct: ((currentPrice - item.baselinePrice) / item.baselinePrice) * 100,
    baselinePrice: item.baselinePrice,
    baselineAt: item.baselineAt,
  };
}

/**
 * Which threshold crossing, if any, should push right now. Each
 * direction fires once for the life of the item: a card that whipsaws
 * around +20% must not ping on every crossing. Removing and re-adding
 * the card starts a fresh baseline and re-arms both.
 */
export function returnAlertCrossing(
  item: BaselineFields,
  pct: number,
): ReturnDirection | null {
  const alerted = item.returnAlerted ?? {};
  if (pct >= RETURN_ALERT_THRESHOLD_PCT && !alerted.up) return 'up';
  if (pct <= -RETURN_ALERT_THRESHOLD_PCT && !alerted.down) return 'down';
  return null;
}

/** Equal-weighted mean across items that have a baseline; null if none. */
export function averageSinceAdded(returns: ReadonlyArray<SinceAdded | null>): number | null {
  let sum = 0;
  let n = 0;
  for (const r of returns) {
    if (!r) continue;
    sum += r.pct;
    n++;
  }
  return n === 0 ? null : sum / n;
}

/** "Mar 15", or "Mar 15, 2025" once the baseline is in another year. */
export function formatBaselineDate(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/** "$1,430.09" — push copy is plain text, so group the thousands here. */
function formatUsd(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatSignedPct(pct: number): string {
  return `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

/**
 * Push copy. Same shape as the price and grading alerts so the
 * foreground checker and the background task read identically.
 */
export function formatReturnAlertMessage(
  name: string,
  direction: ReturnDirection,
  pct: number,
  currentPrice: number,
): { title: string; body: string } {
  const verb = direction === 'up' ? 'gained' : 'lost';
  return {
    title: `Total return ${direction} on ${name}`,
    body: `${name} on your watchlist has ${verb} more than ${RETURN_ALERT_THRESHOLD_PCT}% since you added it — now ${formatUsd(currentPrice)} (${formatSignedPct(pct)}).`,
  };
}

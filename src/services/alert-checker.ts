import {
  isGradingAlert,
  type AlertFire,
  type CardAlert,
  type GradingAlert,
  type PriceAlert,
} from '../stores/alerts-store';
import { fetchRawCardPrice } from './tcgplayer';
import { fetchCardStats, type CardStats } from './card-stats';
import {
  computeGradingVerdict,
  formatGradingAlertMessage,
  gradingAlertHit,
} from './grading-verdict';
import { queryClient } from '../lib/query-client';
import type { CardPrice } from '../types/card';

export type AlertEvaluation = AlertFire & { shouldTrigger: boolean };

/**
 * Live raw (UNGRADED) price for a card, routed through the shared React
 * Query client with the SAME key shape + staleTime as useCardPrice
 * (['prices', cardName, setName, cardNumber, grade, language] / 1h) so
 * the checker reads the UI's cached entry instead of re-fetching.
 * Alerts don't store setName/language, so those key slots are undefined
 * here — cache hits happen when the UI query's slots are also undefined;
 * otherwise fetchQuery populates its own entry once per hour.
 * fetchRawCardPrice internally falls back to mock on proxy errors, so a
 * fulfilled query still means "best available price". Resolves
 * undefined on a transient failure so the caller can leave the alert
 * untouched for the next cycle.
 */
async function fetchLiveRawPrice(alert: {
  cardId: string;
  cardName: string;
}): Promise<number | undefined> {
  try {
    const live = await queryClient.fetchQuery<CardPrice | null>({
      queryKey: ['prices', alert.cardName, undefined, undefined, 'UNGRADED', undefined],
      queryFn: () => fetchRawCardPrice(alert.cardId, alert.cardName),
      staleTime: 60 * 60 * 1000,
      retry: false,
    });
    const price = live?.currentPrice;
    return typeof price === 'number' && isFinite(price) ? price : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Collectrics card stats (PSA 10 sold price + population), same key +
 * staleTime as useCardStats so an open card screen shares the entry.
 * fetchCardStats resolves null (never throws) for untracked cards.
 */
async function fetchLiveStats(alert: {
  cardName: string;
  cardNumber: string;
}): Promise<CardStats | null> {
  try {
    return await queryClient.fetchQuery<CardStats | null>({
      queryKey: ['card-stats', alert.cardName, alert.cardNumber],
      queryFn: () => fetchCardStats(alert.cardName, alert.cardNumber),
      staleTime: 6 * 60 * 60 * 1000,
      retry: 1,
    });
  } catch {
    return null;
  }
}

/**
 * Evaluates a single price alert against the CURRENT LIVE price for its
 * card+grade. Returns null when no price is available (we can't
 * decide either way; the alert lives to fire another cycle).
 *
 * Price sources:
 *   UNGRADED → live TCGPlayer Market Price via /api/tcgplayer/price,
 *              falling back to the mocked single only if the live
 *              proxy errors (so a transient network blip doesn't
 *              silently drop an alert).
 *   PSA10    → no feed. Evaluates to null rather than to a mock, so a
 *              graded alert can never fire off a fabricated price.
 *              Creation is gated on the same grade in card/[id].tsx.
 *
 * Why this is async: the original implementation read `getPrice()`
 * mocks synchronously for every grade, so Premium users got "alerts"
 * that fired off seeded fake prices — spuriously when the mock already
 * crossed the target, never when it didn't move. Live evaluation makes
 * the paid feature actually work on raw cards.
 */
async function evaluatePriceAlert(
  alert: PriceAlert,
): Promise<AlertEvaluation | null> {
  if (alert.grade !== 'UNGRADED') {
    // PSA10: there is no graded price feed wired to alerts. This used to
    // read a seeded mock, which is strictly worse than not firing — a
    // graded alert would trigger off a fake number and push a
    // notification quoting a price the card never traded at. The daily
    // server sweep skips graded targets for the same reason, so nothing
    // else would have caught it either.
    //
    // Returning null means "no opinion": the alert survives untouched
    // and starts working the day a real graded feed is connected. Alert
    // creation is gated on the same grade, so nothing new lands here.
    return null;
  }

  const currentPrice = await fetchLiveRawPrice(alert);
  if (currentPrice === undefined) return null;

  const shouldTrigger =
    !alert.triggered &&
    (alert.type === 'above'
      ? currentPrice >= alert.targetPrice
      : currentPrice <= alert.targetPrice);

  return { kind: 'price', alert, currentPrice, shouldTrigger };
}

/**
 * Re-runs the grading verdict on live data and checks whether the
 * expected net crossed the user's line. Both legs of the trade must be
 * real: the raw price comes through the same path the price alerts (and
 * the card screen's verdict) use; the PSA 10 sold price and gem rate
 * come from the card-stats proxy. Untracked cards, a missing PSA 10
 * price, or a transient failure on either leg evaluate to null — no
 * opinion, the alert waits for the next cycle.
 */
async function evaluateGradingAlert(
  alert: GradingAlert,
): Promise<AlertEvaluation | null> {
  const [rawPrice, stats] = await Promise.all([
    fetchLiveRawPrice(alert),
    fetchLiveStats(alert),
  ]);
  if (rawPrice === undefined) return null;
  const psa10 = stats?.psa10;
  if (!psa10 || !(psa10.latestPrice > 0)) return null;

  const verdict = computeGradingVerdict({
    rawPrice,
    psa10Price: psa10.latestPrice,
    gemRatePct: psa10.pop ? psa10.pop.gemPct : null,
    condition: alert.condition,
  });
  if (!verdict) return null;

  return {
    kind: 'grading',
    alert,
    expectedNet: verdict.expectedNet,
    letter: verdict.letter,
    shouldTrigger:
      !alert.triggered &&
      gradingAlertHit(verdict.expectedNet, alert.direction, alert.thresholdNet),
  };
}

/**
 * Evaluates one alert of either kind. Returns null when the inputs
 * aren't available (the alert lives to fire another cycle).
 */
export async function evaluateAlert(
  alert: CardAlert,
): Promise<AlertEvaluation | null> {
  return isGradingAlert(alert)
    ? evaluateGradingAlert(alert)
    : evaluatePriceAlert(alert);
}

/**
 * Takes a list of alerts and returns the ones that should fire right
 * now. Fans out the per-alert live fetches in parallel —
 * typical free-tier user has ≤5 active alerts, Premium has ≤25, so
 * parallel fetch is well under any practical rate limit. Used by
 * both the foreground checker (useAlertChecker hook) and the
 * background fetch task (background-alerts.ts) so the trigger logic
 * stays in one place.
 */
export async function findAlertsToTrigger(
  alerts: CardAlert[],
): Promise<AlertEvaluation[]> {
  if (alerts.length === 0) return [];
  const results = await Promise.all(alerts.map(evaluateAlert));
  return results.filter(
    (e): e is AlertEvaluation => e !== null && e.shouldTrigger,
  );
}

/**
 * Format the user-facing notification body for a triggered alert.
 * Kept here so foreground + background paths show identical copy; the
 * server cron mirrors the price copy and imports the grading copy.
 */
export function formatAlertMessage(
  fire: AlertFire,
): { title: string; body: string } {
  if (fire.kind === 'grading') {
    return formatGradingAlertMessage(fire.alert, fire.expectedNet, fire.letter);
  }
  const { alert, currentPrice } = fire;
  const direction = alert.type === 'above' ? 'above' : 'below';
  const gradeLabel = alert.grade === 'PSA10' ? 'PSA 10' : 'Raw';
  return {
    title: `${alert.cardName} hit your target`,
    body: `${gradeLabel} is now ${direction} $${alert.targetPrice.toFixed(2)} — currently $${currentPrice.toFixed(2)}.`,
  };
}

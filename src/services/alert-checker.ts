import type { PriceAlert } from '../stores/alerts-store';
import { getPrice } from '../mocks/prices';
import { fetchRawCardPrice } from './tcgplayer';
import { queryClient } from '../lib/query-client';
import type { CardPrice } from '../types/card';

export interface AlertEvaluation {
  alert: PriceAlert;
  currentPrice: number;
  shouldTrigger: boolean;
}

/**
 * Evaluates a single alert against the CURRENT LIVE price for its
 * card+grade. Returns null when no price is available (we can't
 * decide either way; the alert lives to fire another cycle).
 *
 * Price source-of-truth split mirrors `useCardPrice`:
 *   UNGRADED → live TCGPlayer Market Price via /api/tcgplayer/price,
 *              falling back to the mocked single only if the live
 *              proxy errors (so a transient network blip doesn't
 *              silently drop an alert).
 *   PSA10    → mocked single (eBay sold-listing pricing isn't wired
 *              to alerts yet; gated with the same "Soon" badge in
 *              the rest of the app).
 *
 * Why this is async now: the previous implementation read from
 * `getPrice()` mocks synchronously, which meant Premium users got
 * "alerts" that fired off seeded fake prices — either spuriously
 * (mock crossed target on first run) or never (mock never moved).
 * Live-price evaluation here makes the Premium subscription's
 * core feature actually work.
 */
export async function evaluateAlert(
  alert: PriceAlert,
): Promise<AlertEvaluation | null> {
  let currentPrice: number | undefined;

  if (alert.grade === 'UNGRADED') {
    // Routed through the shared React Query client with the SAME key
    // shape + staleTime as useCardPrice (['prices', cardName, setName,
    // cardNumber, grade, language] / 1h) so the checker reads the UI's
    // cached entry instead of re-fetching. Alerts don't store setName/
    // cardNumber/language, so those key slots are undefined here —
    // cache hits happen when the UI query's slots are also undefined;
    // otherwise fetchQuery populates its own entry once per hour.
    // fetchRawCardPrice internally falls back to mock on proxy errors,
    // so a fulfilled query still means "best available price".
    try {
      const live = await queryClient.fetchQuery<CardPrice | null>({
        queryKey: [
          'prices',
          alert.cardName,
          undefined,
          undefined,
          alert.grade,
          undefined,
        ],
        queryFn: () => fetchRawCardPrice(alert.cardId, alert.cardName),
        staleTime: 60 * 60 * 1000,
        retry: false,
      });
      currentPrice = live?.currentPrice;
    } catch {
      // Transient failure — leave currentPrice undefined so the alert
      // survives to the next cycle instead of being mis-evaluated.
    }
  } else {
    // PSA10 path — mocked until eBay sold-listings pricing ships.
    const mock = getPrice(alert.cardId, alert.grade);
    currentPrice = mock?.currentPrice;
  }

  if (typeof currentPrice !== 'number' || !isFinite(currentPrice)) {
    return null;
  }

  const shouldTrigger =
    !alert.triggered &&
    (alert.type === 'above'
      ? currentPrice >= alert.targetPrice
      : currentPrice <= alert.targetPrice);

  return { alert, currentPrice, shouldTrigger };
}

/**
 * Takes a list of alerts and returns the ones that should fire right
 * now. Fans out the per-alert live-price fetches in parallel —
 * typical free-tier user has ≤5 active alerts, Premium has ≤25, so
 * parallel fetch is well under any practical rate limit. Used by
 * both the foreground checker (useAlertChecker hook) and the
 * background fetch task (background-alerts.ts) so the trigger logic
 * stays in one place.
 */
export async function findAlertsToTrigger(
  alerts: PriceAlert[],
): Promise<AlertEvaluation[]> {
  if (alerts.length === 0) return [];
  const results = await Promise.all(alerts.map(evaluateAlert));
  return results.filter(
    (e): e is AlertEvaluation => e !== null && e.shouldTrigger,
  );
}

/**
 * Format the user-facing notification body for a triggered alert.
 * Kept here so foreground + background paths show identical copy.
 */
export function formatAlertMessage(
  alert: PriceAlert,
  triggeredPrice: number,
): { title: string; body: string } {
  const direction = alert.type === 'above' ? 'above' : 'below';
  const gradeLabel = alert.grade === 'PSA10' ? 'PSA 10' : 'Raw';
  return {
    title: `${alert.cardName} hit your target`,
    body: `${gradeLabel} is now ${direction} $${alert.targetPrice.toFixed(2)} — currently $${triggeredPrice.toFixed(2)}.`,
  };
}

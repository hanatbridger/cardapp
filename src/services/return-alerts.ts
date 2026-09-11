import { queryClient } from '../lib/query-client';
import {
  fetchBatchPrices,
  batchPriceKey,
  BATCH_PRICE_STALE_MS,
  type BatchPrices,
} from '../hooks/use-batch-prices';
import { fetchSealedLiveStats, type SealedLiveStats } from './sealed-live';
import { presentLocalNotification } from './notifications';
import { useWatchlistStore, type WatchlistItem } from '../stores/watchlist-store';
import { useAlertsStore } from '../stores/alerts-store';
import {
  formatReturnAlertMessage,
  returnAlertCrossing,
  sinceAddedReturn,
  type ReturnDirection,
} from './since-added';

/**
 * Since-added ±20% alerts (Premium). Evaluated on the same cadence as
 * price alerts — the foreground checker (hooks/use-alert-checker.ts) and
 * the OS background fetch (services/background-alerts.ts). The baseline
 * and the fired-once flags live on the watchlist item itself.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReturnFire {
  item: WatchlistItem;
  direction: ReturnDirection;
  pct: number;
  currentPrice: number;
  baselinePrice: number;
  baselineAt: string;
}

/** Raw prices through the batched call, keyed exactly like Home's query. */
async function liveCardPrices(cardIds: string[]): Promise<BatchPrices> {
  if (cardIds.length === 0) return {};
  const key = batchPriceKey(cardIds);
  try {
    return await queryClient.fetchQuery<BatchPrices>({
      queryKey: ['batch-prices', key],
      queryFn: () => fetchBatchPrices(key),
      staleTime: BATCH_PRICE_STALE_MS,
      retry: false,
    });
  } catch {
    return {};
  }
}

/**
 * Live price for a sealed product, or undefined. Only collectrics-backed
 * (`cx-`) products have one; the curated catalog prices from seeds, and
 * a seeded price must never fire an alert. Shares the cache entry
 * useSealedPrice observes (['sealed', 'cx-stats', cid]).
 */
async function liveSealedPrice(productId: string): Promise<number | undefined> {
  const cid = productId.startsWith('cx-') ? productId.slice(3) : '';
  if (!/^\d{1,12}$/.test(cid)) return undefined;
  try {
    const stats = await queryClient.fetchQuery<SealedLiveStats>({
      queryKey: ['sealed', 'cx-stats', cid],
      queryFn: async () => {
        const s = await fetchSealedLiveStats(cid);
        if (s === null) throw new Error('sealed stats unavailable');
        return s;
      },
      staleTime: DAY_MS,
      retry: 1,
    });
    // The series statsToPrice (hooks/use-sealed.ts) reads: the last daily
    // close, else collectrics' blended price.
    const last =
      stats.history.length > 0 ? stats.history[stats.history.length - 1].price : stats.price;
    return typeof last === 'number' && Number.isFinite(last) && last > 0 ? last : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Watchlist items whose return since added crossed ±20% in a direction
 * not yet pushed. Skips items without a baseline, graded rows (no graded
 * feed) and sample-priced sealed products.
 */
export async function findReturnAlerts(items: WatchlistItem[]): Promise<ReturnFire[]> {
  const armed = items.filter(
    (i) =>
      Boolean(i.baselineAt) &&
      !(i.returnAlerted?.up && i.returnAlerted?.down) &&
      (i.kind === 'sealed' || i.grade === 'UNGRADED'),
  );
  if (armed.length === 0) return [];

  // Home's exact id set (every non-PSA 10 card), so this normally reads
  // Home's cached batch instead of issuing a second request.
  const homeCardIds = items.flatMap((i) =>
    i.kind === 'card' && i.grade !== 'PSA10' ? [i.cardId] : [],
  );
  const cardPrices = armed.some((i) => i.kind === 'card')
    ? await liveCardPrices(homeCardIds)
    : {};

  const fires = await Promise.all(
    armed.map(async (item): Promise<ReturnFire | null> => {
      const price =
        item.kind === 'card'
          ? cardPrices[item.cardId]?.currentPrice
          : await liveSealedPrice(item.productId);
      const r = sinceAddedReturn(item, price);
      if (!r || price === undefined) return null;
      const direction = returnAlertCrossing(item, r.pct);
      return direction
        ? {
            item,
            direction,
            pct: r.pct,
            currentPrice: price,
            baselinePrice: r.baselinePrice,
            baselineAt: r.baselineAt,
          }
        : null;
    }),
  );
  return fires.filter((f): f is ReturnFire => f !== null);
}

/**
 * Flag, record and push each crossing. markReturnAlerted is the dedupe:
 * it returns false when another check already delivered this crossing.
 * Resolves to how many were delivered.
 */
export async function deliverReturnAlerts(fires: ReturnFire[]): Promise<number> {
  let delivered = 0;
  for (const f of fires) {
    const { item } = f;
    const id = item.kind === 'card' ? item.cardId : item.productId;
    const grade = item.kind === 'card' ? item.grade : undefined;
    const name = item.kind === 'card' ? item.cardName : item.productName;
    if (!useWatchlistStore.getState().markReturnAlerted(id, grade, f.direction)) continue;

    const entry = useAlertsStore.getState().recordReturnAlert({
      alertId: `return:${id}:${grade ?? 'sealed'}:${f.direction}`,
      cardId: item.kind === 'card' ? id : undefined,
      productId: item.kind === 'sealed' ? id : undefined,
      cardName: name,
      direction: f.direction,
      pct: f.pct,
      baselinePrice: f.baselinePrice,
      currentPrice: f.currentPrice,
      baselineAt: f.baselineAt,
    });
    const { title, body } = formatReturnAlertMessage(name, f.direction, f.pct, f.currentPrice);
    await presentLocalNotification(
      title,
      body,
      item.kind === 'card'
        ? { cardId: id, triggeredAlertId: entry.id }
        : { productId: id, triggeredAlertId: entry.id },
    );
    delivered++;
  }
  return delivered;
}

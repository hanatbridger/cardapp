import { Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { fetchWithTimeout } from '../services/api-client';

/**
 * Batched watchlist pricing — one round-trip for the whole list
 * instead of one /api/tcgplayer/price call per row (the N+1 the
 * per-row useCardPrice pattern produced on Home).
 *
 * TCGPlayer Market Price only — i.e. UNGRADED cards. PSA10 pricing
 * goes through eBay and is not batched here.
 */

// Same PROXY_ORIGIN pattern as src/services/tcgplayer.ts: the Vercel
// function only exists on the deployed origin, so localhost dev and
// native call out to production; production web stays same-origin.
const PROXY_ORIGIN = (() => {
  if (Platform.OS !== 'web') {
    return process.env.EXPO_PUBLIC_API_URL ?? 'https://strange-saha-livid.vercel.app';
  }
  if (__DEV__) return 'https://strange-saha-livid.vercel.app';
  return '';
})();

// Server enforces max 20 ids per request — chunk and fan out.
const BATCH_LIMIT = 20;

export interface BatchPriceEntry {
  currentPrice: number;
  percentChange: number;
}

export type BatchPrices = Record<string, BatchPriceEntry | null>;

interface BatchPriceResponse {
  prices: Record<string, { currentPrice: number; percentChange: number } | null>;
}

async function fetchBatch(ids: string[]): Promise<BatchPrices> {
  const query = ids.map(encodeURIComponent).join(',');
  const res = await fetchWithTimeout(`${PROXY_ORIGIN}/api/tcgplayer/price?ids=${query}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? `batch price ${res.status}`);
  }
  const data = (await res.json()) as BatchPriceResponse;
  const out: BatchPrices = {};
  for (const id of ids) {
    const p = data.prices[id];
    out[id] = p ? { currentPrice: p.currentPrice, percentChange: p.percentChange } : null;
  }
  return out;
}

export function useBatchPrices(cardIds: string[]) {
  // Sorted + deduped so the key is order-insensitive — reordering the
  // watchlist doesn't refetch.
  const sortedIds = [...new Set(cardIds)].sort();

  return useQuery<BatchPrices>({
    queryKey: ['batch-prices', sortedIds],
    queryFn: async () => {
      const chunks: string[][] = [];
      for (let i = 0; i < sortedIds.length; i += BATCH_LIMIT) {
        chunks.push(sortedIds.slice(i, i + BATCH_LIMIT));
      }
      const results = await Promise.all(chunks.map(fetchBatch));
      return Object.assign({}, ...results) as BatchPrices;
    },
    enabled: sortedIds.length > 0,
    staleTime: 30 * 60 * 1000,
  });
}

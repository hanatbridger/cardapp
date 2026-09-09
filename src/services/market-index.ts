import { Platform } from 'react-native';

/**
 * Client for /api/market-index — a matched-basket index over the ~1,800
 * cards our daily cron snapshots. Computed from our own price_snapshots
 * table, so it holds up regardless of upstream provider access.
 * Returns null on any failure; the index strip hides itself.
 */

// Same origin resolution as card-stats.ts: the Vercel function only
// exists on the deployed origin, so dev calls it cross-origin.
const PROXY_ORIGIN = (() => {
  if (Platform.OS !== 'web') {
    return process.env.EXPO_PUBLIC_API_URL ?? 'https://strange-saha.vercel.app';
  }
  if (__DEV__) return 'https://strange-saha.vercel.app';
  return '';
})();

export interface IndexWindow {
  /** Percent change over the window (1.2 = +1.2%) */
  changePct: number;
  /** Products priced on both days */
  basket: number;
  /** Comparison date actually used */
  from: string;
}

export interface MarketIndex {
  /** Latest snapshot date with full coverage */
  asOf: string | null;
  basketSize: number;
  windows: {
    d1: IndexWindow | null;
    d7: IndexWindow | null;
    d30: IndexWindow | null;
  };
}

export async function fetchMarketIndex(): Promise<MarketIndex | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 10000);
  try {
    const res = await fetch(`${PROXY_ORIGIN}/api/market-index`, { signal: ctl.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as MarketIndex;
    if (!data || !data.windows) return null;
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

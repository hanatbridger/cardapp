import { Platform } from 'react-native';

/**
 * Client for /api/card-stats — real per-card eBay market dynamics and
 * daily sold-price aggregates (collectrics-backed, CDN-cached 6h
 * server-side). Returns null on any failure: both consumers (Market
 * Dynamics card, Recent sales list) have honest fallbacks and a missing
 * section beats a spinner for below-the-fold content.
 */

// Same origin resolution as tcgplayer.ts: the Vercel function only
// exists on the deployed origin, so dev (native and web) calls it
// cross-origin; production web hits it relative.
const PROXY_ORIGIN = (() => {
  if (Platform.OS !== 'web') {
    return process.env.EXPO_PUBLIC_API_URL ?? 'https://strange-saha-livid.vercel.app';
  }
  if (__DEV__) return 'https://strange-saha-livid.vercel.app';
  return '';
})();

// Dev-web fallback: a local `vercel dev`-style server on :3001 (same port
// api-client.ts uses) serves api/ functions that haven't deployed yet.
// Tried only when the deployed origin fails, so it costs nothing once
// the endpoint is live in production.
const DEV_LOCAL_ORIGIN =
  __DEV__ && Platform.OS === 'web' ? 'http://localhost:3001' : null;

export interface DailySales {
  date: string;
  count: number;
  /** Outlier-adjusted average raw sold price, USD */
  avgPrice: number;
}

export interface LiveMarketDynamics {
  activeListings7d: number;
  activeListings30d: number;
  newPerDay7d: number;
  newPerDay30d: number;
  soldPerDay7d: number;
  soldPerDay30d: number;
  demandPressure: number;
  supplySaturation: number;
}

export interface CardStats {
  dynamics: LiveMarketDynamics | null;
  sales: DailySales[];
  asOf: string | null;
}

async function fetchFrom(
  origin: string,
  params: URLSearchParams,
): Promise<CardStats | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 10000);
  try {
    const res = await fetch(`${origin}/api/card-stats?${params}`, {
      signal: ctl.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as CardStats;
    if (!data || (!data.dynamics && (!data.sales || data.sales.length === 0))) {
      return null;
    }
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchCardStats(
  cardName: string,
  cardNumber: string,
): Promise<CardStats | null> {
  const params = new URLSearchParams({ name: cardName, number: cardNumber });
  const primary = await fetchFrom(PROXY_ORIGIN, params);
  if (primary) return primary;
  if (DEV_LOCAL_ORIGIN) return fetchFrom(DEV_LOCAL_ORIGIN, params);
  return null;
}

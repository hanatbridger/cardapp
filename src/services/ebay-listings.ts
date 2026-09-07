import { Platform } from 'react-native';

/**
 * Client for /api/ebay-listings — live ACTIVE listings on eBay for one
 * card via the official Browse API. These are asking prices, not sold
 * prices; every consumer labels them that way. Fills the Recent sales
 * and PSA 10 sections for cards the collectrics feed doesn't track.
 * Returns null on any failure — the sections keep their link-out
 * fallbacks.
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

export interface EbayListing {
  title: string;
  /** Asking price, USD */
  price: number;
  url: string;
  condition: string;
  image: string;
}

export interface EbayListings {
  grade: 'raw' | 'psa10';
  count: number;
  low: number | null;
  median: number | null;
  listings: EbayListing[];
}

export async function fetchEbayListings(opts: {
  name: string;
  number: string;
  setName?: string;
  language?: 'EN' | 'JP';
  grade: 'raw' | 'psa10';
}): Promise<EbayListings | null> {
  const params = new URLSearchParams({
    name: opts.name,
    number: opts.number,
    grade: opts.grade,
    lang: opts.language ?? 'EN',
  });
  if (opts.setName) params.set('set', opts.setName);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 10000);
  try {
    const res = await fetch(`${PROXY_ORIGIN}/api/ebay-listings?${params}`, {
      signal: ctl.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as EbayListings;
    if (!data || !Array.isArray(data.listings)) return null;
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

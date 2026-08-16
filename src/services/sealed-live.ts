import { Platform } from 'react-native';

/**
 * Client for /api/sealed-search and /api/sealed-stats — real sealed-
 * product search and daily prices (collectrics-backed, CDN-cached 6h
 * server-side). Never throws: search returns [] and stats returns null
 * on any failure, and the hooks fall back to the curated mock catalog.
 */

// Same origin resolution as card-stats.ts: the Vercel functions only
// exist on the deployed origin, so dev (native and web) calls them
// cross-origin; production web hits them relative.
const PROXY_ORIGIN = (() => {
  if (Platform.OS !== 'web') {
    return process.env.EXPO_PUBLIC_API_URL ?? 'https://strange-saha.vercel.app';
  }
  if (__DEV__) return 'https://strange-saha.vercel.app';
  return '';
})();

// Dev-web fallback: a local `vercel dev`-style server on :3001 (same port
// api-client.ts uses) serves api/ functions that haven't deployed yet.
// Tried only when the deployed origin fails, so it costs nothing once
// the endpoints are live in production.
const DEV_LOCAL_ORIGIN =
  __DEV__ && Platform.OS === 'web' ? 'http://localhost:3001' : null;

export interface SealedLiveHit {
  /** Collectrics internal id — routed in-app as `cx-{cid}` */
  cid: number;
  name: string;
  setName: string;
  imageUrl: string;
  /** Latest raw (sealed) market price, USD */
  price: number;
}

export interface SealedLivePricePoint {
  date: string;
  price: number;
}

export interface SealedLiveStats {
  price: number | null;
  /** Daily prices, oldest → newest */
  history: SealedLivePricePoint[];
  name: string;
  setName: string;
  imageUrl: string;
}

async function getJson<T>(origin: string, path: string): Promise<T | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 10000);
  try {
    const res = await fetch(`${origin}${path}`, { signal: ctl.signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Sealed catalog search against the live proxy. [] on any failure. */
export async function searchSealedLive(query: string): Promise<SealedLiveHit[]> {
  const q = query.trim();
  if (q.length < 2 || q.length > 60) return [];
  const path = `/api/sealed-search?q=${encodeURIComponent(q)}`;
  type Body = { products?: SealedLiveHit[] };
  const primary = await getJson<Body>(PROXY_ORIGIN, path);
  const data =
    primary ?? (DEV_LOCAL_ORIGIN ? await getJson<Body>(DEV_LOCAL_ORIGIN, path) : null);
  if (!data || !Array.isArray(data.products)) return [];
  return data.products.filter(
    (p) =>
      typeof p?.cid === 'number' &&
      isFinite(p.cid) &&
      typeof p?.name === 'string' &&
      p.name.length > 0 &&
      typeof p?.price === 'number' &&
      isFinite(p.price),
  );
}

/** Price + history + metadata for one collectrics id. Null on failure. */
export async function fetchSealedLiveStats(
  cid: string,
): Promise<SealedLiveStats | null> {
  if (!/^\d{1,12}$/.test(cid)) return null;
  const path = `/api/sealed-stats?cid=${cid}`;
  const primary = await getJson<SealedLiveStats>(PROXY_ORIGIN, path);
  const data =
    primary ??
    (DEV_LOCAL_ORIGIN ? await getJson<SealedLiveStats>(DEV_LOCAL_ORIGIN, path) : null);
  if (!data || typeof data.name !== 'string' || !Array.isArray(data.history)) {
    return null;
  }
  return {
    price: typeof data.price === 'number' && isFinite(data.price) ? data.price : null,
    history: data.history.filter(
      (p) => p?.date != null && typeof p?.price === 'number' && isFinite(p.price),
    ),
    name: data.name,
    setName: typeof data.setName === 'string' ? data.setName : '',
    imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : '',
  };
}

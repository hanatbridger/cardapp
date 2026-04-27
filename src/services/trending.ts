import { Platform } from 'react-native';

/**
 * Daily trending movers — proxied from collectrics.com via our Vercel
 * Edge function. Same dev-vs-prod origin trick as `tcgplayer.ts`:
 * native + dev-web hit the production deployment cross-origin (the
 * function returns CORS *), production web hits relative same-origin.
 */

const PROXY_ORIGIN = (() => {
  if (Platform.OS !== 'web') {
    return process.env.EXPO_PUBLIC_API_URL ?? 'https://strange-saha-livid.vercel.app';
  }
  if (__DEV__) return 'https://strange-saha-livid.vercel.app';
  return '';
})();

export interface TrendingTile {
  productId: string;
  name: string;
  setName: string;
  rarity: string;
  imageUrl: string;
  rawPrice: number;
  /** Already in percent (e.g. 4.9, not 0.049). */
  percentChange: number;
}

export interface TrendingPayload {
  generatedAt: string;
  source: 'collectrics';
  items: TrendingTile[];
}

export async function fetchTrendingMovers(limit = 12): Promise<TrendingPayload> {
  const res = await fetch(`${PROXY_ORIGIN}/api/trending?limit=${limit}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? `trending ${res.status}`);
  }
  return (await res.json()) as TrendingPayload;
}

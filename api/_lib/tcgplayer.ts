// TCGPlayer Market Price lookup by Pokemon TCG card id. Shared by the
// user-facing /api/tcgplayer/price proxy and the daily cron's
// grading-alert sweep so both read the same raw price the app shows.
//
// Pipeline:
//   1. GET https://prices.pokemontcg.io/tcgplayer/{cardId}
//      → 302 redirect to https://www.tcgplayer.com/product/{productId}
//   2. Extract productId from the redirect Location header.
//   3. GET https://mp-search-api.tcgplayer.com/v1/product/{productId}/details
//      → JSON containing `marketPrice` and `listings`.

import { fetchWithTimeout } from './http';

export interface TcgDetails {
  marketPrice?: number;
  listings?: number;
  productName?: string;
}

export interface PriceResponse {
  productId: string;
  currentPrice: number;
  previousPrice: number;
  percentChange: number;
  averagePrice: number;
  highPrice: number;
  lowPrice: number;
  salesCount: number;
  lastSaleDate: string;
  lastSalePrice: number;
}

export async function resolveProductId(cardId: string): Promise<string | null> {
  // Don't follow the redirect — read the Location header directly.
  const res = await fetchWithTimeout(
    `https://prices.pokemontcg.io/tcgplayer/${encodeURIComponent(cardId)}`,
    { redirect: 'manual' },
  );
  const location = res.headers.get('location') ?? '';
  const match = location.match(/tcgplayer\.com\/product\/(\d+)/);
  return match ? match[1] : null;
}

export async function fetchMarketPrice(productId: string): Promise<TcgDetails | null> {
  const res = await fetchWithTimeout(
    `https://mp-search-api.tcgplayer.com/v1/product/${productId}/details`,
    {
      // Match the user-agent TCGPlayer's own SPA sends so we don't get
      // bot-flagged. No auth required for /details.
      headers: { 'user-agent': 'Mozilla/5.0 (CardPulse Price Proxy)' },
    },
  );
  if (!res.ok) return null;
  return (await res.json()) as TcgDetails;
}

/**
 * The /details endpoint returns marketPrice but not high/low/avg or
 * sales-count — those would need /latestsales which is auth-gated. The
 * rolling Market Price is collapsed into every numeric slot so the UI
 * renders cleanly; previousPrice equals it (0% change) until history
 * is wired.
 */
export function priceResponse(productId: string, details: TcgDetails): PriceResponse {
  const price = details.marketPrice ?? 0;
  return {
    productId,
    currentPrice: price,
    previousPrice: price,
    percentChange: 0,
    averagePrice: price,
    highPrice: price,
    lowPrice: price,
    salesCount: details.listings ?? 0,
    lastSaleDate: '',
    lastSalePrice: price,
  };
}

/**
 * Whole pipeline for one card. Failures collapse to null rather than
 * throwing — batch callers render their fallback for that row.
 */
export async function fetchPriceForCard(cardId: string): Promise<PriceResponse | null> {
  try {
    const productId = await resolveProductId(cardId);
    if (!productId) return null;
    const details = await fetchMarketPrice(productId);
    if (!details?.marketPrice) return null;
    return priceResponse(productId, details);
  } catch {
    return null;
  }
}

/** Just the live Market Price, USD; null when unavailable. */
export async function fetchTcgMarketPrice(cardId: string): Promise<number | null> {
  const price = (await fetchPriceForCard(cardId))?.currentPrice;
  return typeof price === 'number' && price > 0 ? price : null;
}

import { apiFetch } from './api-client';
import { getSealedPrice } from '../mocks/sealed';
import { getPrice, getMockPriceHistory } from '../mocks/prices';
import type { SealedPrice } from '../types/sealed';
import type { CardPrice, PriceHistory } from '../types/card';

/**
 * TCGPlayer pricing — for raw/ungraded singles AND sealed products.
 *
 * Pricing source-of-truth is TCGPlayer's Market Price (rolling average
 * of recent TCGPlayer marketplace sales). For graded cards we go to
 * eBay sold listings or PriceCharting instead — see `ebay-proxy.ts`.
 * The split is enforced in `useCardPrice`:
 *
 *   UNGRADED → TCGPlayer (this file)
 *   PSA10    → eBay sold / PriceCharting (ebay-proxy.ts)
 *
 * TCGPlayer doesn't expose Market Price publicly without a partner API
 * key, so the live endpoints are thin server proxies that fetch the
 * product page and parse the Market Price + low / high / avg blocks.
 * While those routes are being built out we fall back to local mocks
 * (mocks/prices.ts for singles, mocks/sealed.ts for sealed) so the UI
 * behaves identically in dev, web preview, and TestFlight builds.
 */

// Flip to `true` once the server proxy routes are live:
//   /api/tcgplayer/price?id=...   (raw singles)
//   /api/tcgplayer/history?id=...
//   /api/sealed/price?id=...
//   /api/sealed/history?id=...
// Until then everything resolves from local mocks so the UI behaves
// identically in dev, web preview, and TestFlight builds.
const USE_LIVE_TCGPLAYER = false;

interface TcgPlayerPriceResponse {
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

interface TcgPlayerHistoryResponse {
  productId: string;
  history: Array<{ date: string; price: number }>;
}

export interface SealedPriceHistoryPoint {
  date: string;
  price: number;
}

/**
 * Fetch the current TCGPlayer Market Price for a raw (UNGRADED) single.
 *
 * Caller already has the Pokemon TCG API's `tcgPlayerPrice` (which IS a
 * TCGPlayer Market Price snapshot, just without the rolling-window
 * detail). This is the secondary fetch — used when we need full sales
 * stats (avg/high/low/count, last sale date) that the Pokemon TCG API
 * doesn't surface, and as a fallback when a card isn't in the Pokemon
 * TCG dataset.
 *
 * Returns `null` if the card isn't found in either the live proxy or
 * the mocks — caller decides how to surface that to the user.
 */
export async function fetchRawCardPrice(
  cardId: string,
  cardName: string,
  tcgplayerProductId?: string,
): Promise<CardPrice | null> {
  if (USE_LIVE_TCGPLAYER) {
    const lookup = tcgplayerProductId ?? cardId;
    const data = await apiFetch<TcgPlayerPriceResponse>(
      `/api/tcgplayer/price?id=${encodeURIComponent(lookup)}`,
    );
    return {
      cardName,
      grade: 'UNGRADED',
      currentPrice: data.currentPrice,
      previousPrice: data.previousPrice,
      percentChange: data.percentChange,
      averagePrice: data.averagePrice,
      highPrice: data.highPrice,
      lowPrice: data.lowPrice,
      salesCount: data.salesCount,
      lastSaleDate: data.lastSaleDate
        ? new Date(data.lastSaleDate).toISOString().split('T')[0]
        : '',
      lastSalePrice: data.lastSalePrice,
      source: 'tcgplayer',
    };
  }

  // Same 150ms simulated round-trip as fetchSealedPrice so skeletons
  // get a moment to render in dev.
  await new Promise((resolve) => setTimeout(resolve, 150));
  const mock = getPrice(cardId, 'UNGRADED');
  return mock ? { ...mock, source: 'tcgplayer' } : null;
}

/**
 * Fetch a TCGPlayer Market Price history series for a raw (UNGRADED)
 * single. Live endpoint isn't wired yet — we fall back to the
 * mocked history (mocks/prices.ts → getMockPriceHistory).
 */
export async function fetchRawCardPriceHistory(
  cardId: string,
  tcgplayerProductId?: string,
): Promise<PriceHistory> {
  if (USE_LIVE_TCGPLAYER) {
    const lookup = tcgplayerProductId ?? cardId;
    const data = await apiFetch<TcgPlayerHistoryResponse>(
      `/api/tcgplayer/history?id=${encodeURIComponent(lookup)}`,
    );
    return data.history;
  }

  await new Promise((resolve) => setTimeout(resolve, 100));
  return getMockPriceHistory(cardId, 'UNGRADED');
}

/**
 * Fetch the current TCGPlayer Market Price for a sealed product.
 * Live path hits `/api/sealed/price?id={tcgplayerProductId or internal id}`;
 * fallback reads from seeded mocks.
 */
export async function fetchSealedPrice(
  productId: string,
  tcgplayerProductId?: string,
): Promise<SealedPrice | null> {
  if (USE_LIVE_TCGPLAYER) {
    const lookup = tcgplayerProductId ?? productId;
    const data = await apiFetch<TcgPlayerPriceResponse>(
      `/api/sealed/price?id=${encodeURIComponent(lookup)}`,
    );
    return {
      productId,
      currentPrice: data.currentPrice,
      previousPrice: data.previousPrice,
      percentChange: data.percentChange,
      averagePrice: data.averagePrice,
      highPrice: data.highPrice,
      lowPrice: data.lowPrice,
      salesCount: data.salesCount,
      lastSaleDate: data.lastSaleDate
        ? new Date(data.lastSaleDate).toISOString().split('T')[0]
        : '',
      lastSalePrice: data.lastSalePrice,
    };
  }

  // Simulate a short network round-trip so skeletons actually appear in
  // dev — same pattern as getPrice() in mocks/prices.ts.
  await new Promise((resolve) => setTimeout(resolve, 150));
  return getSealedPrice(productId) ?? null;
}

/**
 * Fetch a TCGPlayer Market Price history series for a sealed product.
 * We return an empty array when the live endpoint isn't wired yet — the
 * chart component gracefully renders a "history coming soon" placeholder.
 */
export async function fetchSealedPriceHistory(
  productId: string,
  tcgplayerProductId?: string,
): Promise<SealedPriceHistoryPoint[]> {
  if (USE_LIVE_TCGPLAYER) {
    const lookup = tcgplayerProductId ?? productId;
    const data = await apiFetch<TcgPlayerHistoryResponse>(
      `/api/sealed/history?id=${encodeURIComponent(lookup)}`,
    );
    return data.history;
  }

  // No mocked history yet — sealed price charts stay empty until live
  // data lands. The detail screen switches to a "coming soon" strip when
  // this array is empty rather than rendering a fake line.
  await new Promise((resolve) => setTimeout(resolve, 100));
  return [];
}

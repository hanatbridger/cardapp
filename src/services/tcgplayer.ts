import { Platform } from 'react-native';
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
 * The live path goes through Vercel serverless functions in `/api/`:
 *
 *   /api/tcgplayer/price?id=<pokemonTcgCardId>
 *     → resolves productId, returns live Market Price
 *   /api/tcgplayer/history?id=...   (TODO)
 *   /api/sealed/price?id=...        (TODO)
 *   /api/sealed/history?id=...      (TODO)
 *
 * When a live route isn't deployed yet, the corresponding fetcher
 * falls back to local mocks so the UI behaves identically in dev,
 * web preview, and TestFlight builds.
 */

// Vercel-deployed proxy origin. Web hits it relative (same host); native
// points at the production deployment so TestFlight/Android builds get
// live data without bundling localhost. Override with EXPO_PUBLIC_API_URL.
const PROXY_ORIGIN =
  Platform.OS === 'web'
    ? ''
    : (process.env.EXPO_PUBLIC_API_URL ?? 'https://strange-saha-livid.vercel.app');

// Per-route flags — endpoints ship at different times.
const LIVE = {
  rawPrice: true,         // /api/tcgplayer/price       — Edge fn (deployed)
  rawHistory: false,      // /api/tcgplayer/history     — TODO
  sealedPrice: false,     // /api/sealed/price          — TODO
  sealedHistory: false,   // /api/sealed/history        — TODO
};

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

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${PROXY_ORIGIN}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? `proxy ${res.status}`);
  }
  return (await res.json()) as T;
}

/**
 * Fetch the current TCGPlayer Market Price for a raw (UNGRADED) single.
 *
 * Pokemon TCG API embeds `tcgPlayerPrice` on each card payload but the
 * cache lags 1–7 days for newly-released sets. When the bundled price
 * is missing, the hook falls through to this fetcher which hits the
 * Vercel serverless function for live data.
 */
export async function fetchRawCardPrice(
  cardId: string,
  cardName: string,
  tcgplayerProductId?: string,
): Promise<CardPrice | null> {
  if (LIVE.rawPrice) {
    try {
      const lookup = tcgplayerProductId ?? cardId;
      const data = await getJson<TcgPlayerPriceResponse>(
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
    } catch {
      // Live proxy didn't have the card (e.g. set not on TCGPlayer yet)
      // — drop to mocks instead of throwing.
    }
  }

  // Same 150ms simulated round-trip as fetchSealedPrice so skeletons get
  // a moment to render in dev.
  await new Promise((resolve) => setTimeout(resolve, 150));
  const mock = getPrice(cardId, 'UNGRADED');
  return mock ? { ...mock, source: 'tcgplayer' } : null;
}

/**
 * Fetch a TCGPlayer Market Price history series for a raw (UNGRADED)
 * single. Live endpoint isn't wired yet — falls back to the mocked
 * history series so the chart still renders something.
 */
export async function fetchRawCardPriceHistory(
  cardId: string,
  tcgplayerProductId?: string,
): Promise<PriceHistory> {
  if (LIVE.rawHistory) {
    const lookup = tcgplayerProductId ?? cardId;
    const data = await getJson<TcgPlayerHistoryResponse>(
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
  if (LIVE.sealedPrice) {
    const lookup = tcgplayerProductId ?? productId;
    const data = await getJson<TcgPlayerPriceResponse>(
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

  await new Promise((resolve) => setTimeout(resolve, 150));
  return getSealedPrice(productId) ?? null;
}

/**
 * Fetch a TCGPlayer Market Price history series for a sealed product.
 * Returns an empty array when the live endpoint isn't wired yet — the
 * chart component gracefully renders a "history coming soon" placeholder.
 */
export async function fetchSealedPriceHistory(
  productId: string,
  tcgplayerProductId?: string,
): Promise<SealedPriceHistoryPoint[]> {
  if (LIVE.sealedHistory) {
    const lookup = tcgplayerProductId ?? productId;
    const data = await getJson<TcgPlayerHistoryResponse>(
      `/api/sealed/history?id=${encodeURIComponent(lookup)}`,
    );
    return data.history;
  }

  await new Promise((resolve) => setTimeout(resolve, 100));
  return [];
}

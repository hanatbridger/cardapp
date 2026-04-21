import { apiFetch } from './api-client';
import { getSealedPrice } from '../mocks/sealed';
import type { SealedPrice } from '../types/sealed';

/**
 * TCGPlayer sealed-product pricing.
 *
 * Pricing source-of-truth is TCGPlayer's Market Price — the rolling
 * average of recent sales across the TCGPlayer marketplace for the
 * sealed/new condition. TCGPlayer doesn't expose this without a partner
 * API key, so the live endpoint is a thin server proxy that fetches the
 * product page and parses the Market Price + low / high / avg blocks.
 *
 * While that server route is being built out we fall back to
 * `SEALED_PRICES` mocks — same pattern as `fetchCardPrice` → MOCK_PRICES.
 * The hook consumers don't know the difference; when the server endpoint
 * is ready we flip `USE_LIVE_TCGPLAYER` and they start seeing live data.
 */

// Flip to `true` when `/api/sealed/price` and `/api/sealed/history` are
// deployed. Until then everything resolves from local mocks so the UI
// behaves identically in dev, web preview, and TestFlight builds.
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

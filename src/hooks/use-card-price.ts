import { useQuery } from '@tanstack/react-query';
import { fetchCardPrice } from '../services/ebay-proxy';
import { fetchRawCardPrice } from '../services/tcgplayer';
import { getPrice } from '../mocks/prices';
import { useWatchlistStore } from '../stores/watchlist-store';
import type { GradeType } from '../constants/grades';
import type { CardPrice } from '../types/card';

/**
 * Pricing source-of-truth, by grade — DO NOT cross the streams:
 *
 *   UNGRADED → Pokemon TCG API tcgPlayerPrice (instant, in-card-payload)
 *              → fetchRawCardPrice (TCGPlayer server proxy, mock fallback)
 *              → watchlist-stored last price (offline tertiary)
 *
 *   PSA10    → fetchCardPrice (eBay sold listings server proxy)
 *              → PriceCharting (TODO once API key obtained)
 *              → null (we don't show estimated PSA 10 prices)
 *
 * This split exists because TCGPlayer Market Price tracks raw/sealed
 * marketplace movement well, but graded cards trade through eBay/
 * PriceCharting where condition + grading authority change the price
 * floor by 5–10x. Mixing sources within a grade muddies the signal —
 * users get inconsistent percent-change calculations.
 */

interface UseCardPriceOptions {
  cardName: string;
  grade: GradeType;
  cardId?: string;
  setName?: string;
  cardNumber?: string;
  language?: 'EN' | 'JP';
  /** TCGPlayer market price (raw) from Pokemon TCG API */
  tcgPlayerPrice?: number;
  /** TCGPlayer mid price — used to compute % change vs market */
  tcgPlayerMidPrice?: number;
}

function buildPrice(
  cardName: string,
  grade: GradeType,
  price: number,
  source: CardPrice['source'],
  previousPrice?: number,
): CardPrice {
  const prev = previousPrice ?? price;
  const pctChange = prev > 0 ? Math.round(((price - prev) / prev) * 10000) / 100 : 0;
  return {
    cardName,
    grade,
    currentPrice: Math.round(price * 100) / 100,
    previousPrice: Math.round(prev * 100) / 100,
    percentChange: pctChange,
    lastSaleDate: '',
    lastSalePrice: Math.round(price * 100) / 100,
    averagePrice: Math.round(price * 100) / 100,
    highPrice: Math.round(price * 100) / 100,
    lowPrice: Math.round(price * 100) / 100,
    salesCount: 0,
    source,
  };
}

export function useCardPrice(opts: UseCardPriceOptions) {
  const { cardName, grade, cardId, setName, cardNumber, language, tcgPlayerPrice, tcgPlayerMidPrice } = opts;
  const watchlistItems = useWatchlistStore((s) => s.items);

  return useQuery<CardPrice | null>({
    queryKey: ['prices', cardName, setName, cardNumber, grade, language],
    queryFn: async (): Promise<CardPrice | null> => {
      // === RAW / UNGRADED — TCGPlayer ONLY ===
      if (grade === 'UNGRADED') {
        // 1. Pokemon TCG API's bundled tcgPlayerPrice (already fetched
        //    with the card payload — zero round-trips).
        if (tcgPlayerPrice && tcgPlayerPrice > 0) {
          return buildPrice(cardName, grade, tcgPlayerPrice, 'tcgplayer', tcgPlayerMidPrice);
        }

        // 2. TCGPlayer server proxy / mock — full sales stats.
        if (cardId) {
          try {
            const tcg = await fetchRawCardPrice(cardId, cardName);
            if (tcg) return tcg;
          } catch {
            // fall through to watchlist tertiary
          }
        }

        // 3. Last-known price from the user's watchlist — keeps the row
        //    populated when offline / between sync cycles. Tagged as
        //    `tcgplayer` because that's where the value originally came
        //    from when it was stored.
        if (cardId) {
          const stored = watchlistItems.find(
            (i) => i.kind === 'card' && i.cardId === cardId && i.grade === 'UNGRADED',
          );
          if (stored?.lastPrice) {
            return buildPrice(cardName, grade, stored.lastPrice, 'tcgplayer', stored.lastPrice * 0.95);
          }
        }

        return null;
      }

      // === PSA 10 — eBay / PriceCharting ONLY ===
      if (grade === 'PSA10') {
        // 1. Mock fallback first (instant) — labelled as eBay since the
        //    mock seed values are calibrated against eBay sold medians.
        if (cardId) {
          const mock = getPrice(cardId, 'PSA10');
          if (mock) return { ...mock, source: 'ebay' };
        }

        // 2. Live eBay sold listings via server proxy.
        try {
          const ebayPrice = await fetchCardPrice({ cardName, grade, language, setName, cardNumber });
          return { ...ebayPrice, source: 'ebay' };
        } catch {}

        // 3. PriceCharting (TODO: enable when API key obtained).
        // const pc = await fetchPriceChartingPrice(cardName, setName);
        // if (pc?.gradedPrice) return buildPrice(cardName, grade, pc.gradedPrice, 'pricecharting');

        // No estimate fallback for PSA 10 — graded prices need a real
        // source or we return null and let the UI show "—".
        return null;
      }

      return null;
    },
    enabled: cardName.length > 0,
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
}

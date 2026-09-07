import { useQuery } from '@tanstack/react-query';
import { fetchRawCardPrice } from '../services/tcgplayer';
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
 *   PSA10    → null here. Graded prices come from the collectrics feed
 *              on the detail screen, or live eBay asking prices via
 *              /api/ebay-listings for untracked cards. PriceCharting
 *              is a TODO once an API key is obtained.
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
  /**
   * TCGPlayer mid price. Accepted but intentionally NOT used for
   * percentChange: market-vs-mid is a static listing spread, not daily
   * movement, and rendering it as change showed permanent gains/losses.
   */
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
  const { cardName, grade, cardId, setName, cardNumber, language, tcgPlayerPrice } = opts;

  return useQuery<CardPrice | null>({
    queryKey: ['prices', cardName, setName, cardNumber, grade, language],
    queryFn: async (): Promise<CardPrice | null> => {
      // === RAW / UNGRADED — TCGPlayer ONLY ===
      if (grade === 'UNGRADED') {
        // 1. Pokemon TCG API's bundled tcgPlayerPrice (already fetched
        //    with the card payload — zero round-trips). No previousPrice:
        //    a single snapshot has no history, so percentChange stays 0
        //    (neutral) rather than faking movement from the mid spread.
        if (tcgPlayerPrice && tcgPlayerPrice > 0) {
          return buildPrice(cardName, grade, tcgPlayerPrice, 'tcgplayer');
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
        //    from when it was stored. Read via getState(), NOT a hook
        //    subscription: this hook renders in every price row, and a
        //    reactive items subscription re-rendered all of them on any
        //    watchlist write, for a value only read inside this queryFn.
        if (cardId) {
          const stored = useWatchlistStore.getState().items.find(
            (i) => i.kind === 'card' && i.cardId === cardId && i.grade === 'UNGRADED',
          );
          if (stored?.lastPrice) {
            // Real stored day-change only — deriving previousPrice as
            // lastPrice * 0.95 fabricated a permanent +5.26% chip.
            const p = buildPrice(cardName, grade, stored.lastPrice, 'tcgplayer');
            return { ...p, percentChange: stored.lastPriceChange ?? 0 };
          }
        }

        return null;
      }

      // === PSA 10 ===
      // No client-side PSA 10 price source. The detail screen prices
      // PSA 10 from the collectrics feed (cardStats.psa10) and, for
      // untracked cards, shows live eBay ASKING prices via
      // /api/ebay-listings — never a sold figure this hook could vouch
      // for. The old eBay sold-listings proxy (Finding API) was
      // decommissioned upstream; seeded mock PSA 10 prices were removed
      // as fabricated data (App Review 4.1). PriceCharting stays a TODO
      // pending an API key.
      return null;
    },
    enabled: cardName.length > 0,
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
}

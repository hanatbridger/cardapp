import { useQuery } from '@tanstack/react-query';
import { fetchRawCardPriceHistory } from '../services/tcgplayer';
import type { GradeType } from '../constants/grades';

interface UsePriceHistoryOptions {
  cardName: string;
  grade: GradeType;
  cardId?: string;
  setName?: string;
  cardNumber?: string;
  language?: 'EN' | 'JP';
}

/**
 * Same source-of-truth split as `useCardPrice`:
 *
 *   UNGRADED → TCGPlayer Market Price history via Supabase-backed
 *              /api/tcgplayer/history. The endpoint backfills 90 days
 *              of real TCGPlayer buckets on a card's first view, so
 *              [] is now rare (resolver miss) — the card detail screen
 *              renders a "Building history" placeholder in that case.
 *   PSA10    → [] here, no request. The detail screen charts the
 *              collectrics series (psa10.history) directly; the old
 *              eBay sold-history proxy was decommissioned upstream.
 *
 * No mock fallbacks in any path: fabricated series in a price chart is
 * exactly what App Review guideline 4.1 calls fake data presented as
 * real, and a blank state is recoverable while a fake chart is not.
 */
export function usePriceHistory(opts: UsePriceHistoryOptions) {
  const { cardName, grade, cardId, setName, cardNumber, language } = opts;

  return useQuery({
    queryKey: ['priceHistory', cardName, setName, cardNumber, grade, language],
    queryFn: async () => {
      if (grade !== 'UNGRADED') return [];
      try {
        return await fetchRawCardPriceHistory(cardId ?? cardName);
      } catch {
        // Transient failure — empty renders the "building" card; the
        // 1h staleTime means the next visit retries.
        return [];
      }
    },
    enabled: cardName.length > 0,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

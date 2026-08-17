import { useQuery } from '@tanstack/react-query';
import { fetchPriceHistory } from '../services/ebay-proxy';
import { fetchRawCardPriceHistory } from '../services/tcgplayer';
import { getMockPriceHistory } from '../mocks/prices';
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
 *              /api/tcgplayer/history. May return [] while the
 *              snapshot DB is still accumulating data for this card
 *              — the card detail screen renders a "Building history"
 *              placeholder in that case rather than misleading mock.
 *   PSA10    → eBay sold listings history (live not yet wired —
 *              falls back to mock so chart isn't blank).
 *
 * Behavior split:
 *   - UNGRADED + empty live response → pass through [] (no mock).
 *   - UNGRADED + thrown error        → fall back to mock so a
 *                                      transient network blip doesn't
 *                                      blank the chart.
 *   - PSA10                          → previous mock-on-empty behavior
 *                                      kept until eBay history ships.
 */
export function usePriceHistory(opts: UsePriceHistoryOptions) {
  const { cardName, grade, cardId, setName, cardNumber, language } = opts;

  return useQuery({
    queryKey: ['priceHistory', cardName, setName, cardNumber, grade, language],
    queryFn: async () => {
      if (grade === 'UNGRADED') {
        try {
          // Pass through whatever the Supabase-backed history endpoint
          // returns — including []. Bootstrap window (no snapshots yet
          // for this card) is a legitimate empty state, not a fallback
          // trigger. The detail screen handles the empty case.
          return await fetchRawCardPriceHistory(cardId ?? cardName);
        } catch {
          // True network/parse error — fall back to mock so the chart
          // doesn't disappear from a transient blip.
          if (cardId) return getMockPriceHistory(cardId, grade);
          return [];
        }
      }
      // PSA10 path — eBay live history isn't shipped yet; keep the
      // mock-on-empty behavior so the graded chart isn't blank.
      try {
        const history = await fetchPriceHistory({
          cardName,
          grade,
          language,
          setName,
          cardNumber,
        });
        if (history.length > 0) return history;
        throw new Error('Empty history');
      } catch {
        if (cardId) return getMockPriceHistory(cardId, grade);
        return [];
      }
    },
    enabled: cardName.length > 0,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

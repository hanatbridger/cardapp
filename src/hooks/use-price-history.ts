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
 *   UNGRADED → TCGPlayer Market Price history (live proxy / mock)
 *   PSA10    → eBay sold listings history
 *
 * History fetch never blocks the screen — on error we fall through to
 * the mock series so the chart still renders something for the demo.
 */
export function usePriceHistory(opts: UsePriceHistoryOptions) {
  const { cardName, grade, cardId, setName, cardNumber, language } = opts;

  return useQuery({
    queryKey: ['priceHistory', cardName, setName, cardNumber, grade, language],
    queryFn: async () => {
      try {
        const history = grade === 'UNGRADED'
          ? await fetchRawCardPriceHistory(cardId ?? cardName)
          : await fetchPriceHistory({ cardName, grade, language, setName, cardNumber });
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

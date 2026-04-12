import { useQuery } from '@tanstack/react-query';
import { fetchPriceHistory } from '../services/ebay-proxy';
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

export function usePriceHistory(opts: UsePriceHistoryOptions) {
  const { cardName, grade, cardId, setName, cardNumber, language } = opts;

  return useQuery({
    queryKey: ['priceHistory', cardName, setName, cardNumber, grade, language],
    queryFn: async () => {
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

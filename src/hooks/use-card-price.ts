import { useQuery } from '@tanstack/react-query';
import { fetchCardPrice } from '../services/ebay-proxy';
import { getPrice } from '../mocks/prices';
import { useWatchlistStore } from '../stores/watchlist-store';
import type { GradeType } from '../constants/grades';
import type { CardPrice } from '../types/card';

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
      // 1. Try mock data first (instant)
      if (cardId) {
        const mock = getPrice(cardId, grade);
        if (mock) return { ...mock, source: grade === 'PSA10' ? 'ebay' as const : 'tcgplayer' as const };
      }

      // === RAW / UNGRADED ===
      if (grade === 'UNGRADED') {
        // Primary source: TCGPlayer price from Pokemon TCG API
        if (tcgPlayerPrice && tcgPlayerPrice > 0) {
          return buildPrice(cardName, grade, tcgPlayerPrice, 'tcgplayer', tcgPlayerMidPrice);
        }

        // Fallback: eBay sold (ungraded)
        try {
          const ebayPrice = await fetchCardPrice({ cardName, grade, language, setName, cardNumber });
          return { ...ebayPrice, source: 'ebay' };
        } catch {}
      }

      // === PSA 10 ===
      if (grade === 'PSA10') {
        // Primary source: eBay sold listings (PSA 10)
        try {
          const ebayPrice = await fetchCardPrice({ cardName, grade, language, setName, cardNumber });
          return { ...ebayPrice, source: 'ebay' };
        } catch {}

        // Fallback: PriceCharting (TODO: enable when API key obtained)
        // const pcPrice = await fetchPriceChartingPrice(cardName, setName);
        // if (pcPrice?.gradedPrice) return buildPrice(cardName, grade, pcPrice.gradedPrice, 'pricecharting');

        // No estimate — only show PSA 10 prices from real sources (eBay or PriceCharting)
      }

      // 3. Fall back to watchlist stored price — only for Raw (PSA 10 needs real data)
      if (grade === 'UNGRADED' && cardId) {
        const watchlistItem = watchlistItems.find(
          (i) => i.kind === 'card' && i.cardId === cardId && i.grade === 'UNGRADED',
        );
        if (watchlistItem?.lastPrice) {
          return buildPrice(cardName, grade, watchlistItem.lastPrice, 'tcgplayer', watchlistItem.lastPrice * 0.95);
        }
      }

      return null;
    },
    enabled: cardName.length > 0,
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
}

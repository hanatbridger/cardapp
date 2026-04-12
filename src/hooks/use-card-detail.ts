import { useQuery } from '@tanstack/react-query';
import { getCard } from '../services/pokemon-tcg';
import { MOCK_CARDS } from '../mocks/cards';

export function useCardDetail(cardId: string) {
  return useQuery({
    queryKey: ['cards', cardId],
    queryFn: async () => {
      // Check mocks first (instant)
      const mock = MOCK_CARDS.find((c) => c.id === cardId);
      if (mock) return mock;

      // Fetch from Pokemon TCG API
      const card = await getCard(cardId);
      if (!card) throw new Error('Card not found');
      return card;
    },
    enabled: cardId.length > 0,
    staleTime: 30 * 60 * 1000, // Card metadata doesn't change often
  });
}

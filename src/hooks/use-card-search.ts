import { useQuery } from '@tanstack/react-query';
import { searchCards } from '../services/pokemon-tcg';

export function useCardSearch(query: string) {
  return useQuery({
    queryKey: ['cards', 'search', query],
    queryFn: () => searchCards(query),
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
}

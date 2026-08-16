import { useQuery } from '@tanstack/react-query';
import { searchJapaneseCards } from '../services/tcgdex';

/**
 * Japanese card search (tcgdex). Keyed under 'cards' so the detail
 * screen's placeholderData cache scan can pick these rows up for an
 * instant paint when a jp- card is opened.
 */
export function useJapaneseSearch(query: string) {
  return useQuery({
    queryKey: ['cards', 'jp-search', query],
    queryFn: () => searchJapaneseCards(query),
    enabled: query.length >= 2,
    staleTime: 10 * 60 * 1000,
  });
}

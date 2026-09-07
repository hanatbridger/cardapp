import { useQuery } from '@tanstack/react-query';
import { fetchEbayListings, type EbayListings } from '../services/ebay-listings';

/**
 * Live eBay asking prices for a card. Consumers enable it only where
 * the tracked feed has nothing (untracked Recent sales, untracked
 * PSA 10), so the 5K/day Browse quota is spent where it shows.
 */
export function useEbayListings(
  opts: {
    name?: string;
    number?: string;
    setName?: string;
    language?: 'EN' | 'JP';
    grade: 'raw' | 'psa10';
  },
  enabled: boolean,
) {
  const { name, number, setName, language, grade } = opts;
  return useQuery<EbayListings | null>({
    queryKey: ['ebay-listings', name, number, grade, language],
    queryFn: () =>
      fetchEbayListings({ name: name!, number: number!, setName, language, grade }),
    enabled: enabled && Boolean(name) && Boolean(number),
    // Matches the endpoint's 30-minute CDN window.
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
}

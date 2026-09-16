import { useQuery } from '@tanstack/react-query';
import { fetchGapSets, getGapSetCards, searchGapCards } from '../services/en-gap-catalog';

/**
 * English gap-set singles (sets TCGPlayer lists before pokemontcg.io).
 * Keyed under 'cards' so the detail screen's placeholderData scan picks
 * the rows up for an instant paint.
 */
export function useGapCardSearch(query: string) {
  return useQuery({
    queryKey: ['cards', 'gap-search', query],
    queryFn: () => searchGapCards(query),
    enabled: query.length >= 2,
    staleTime: 10 * 60 * 1000,
    // Supplementary rows: a failure should release Explore's spinner now,
    // not after backoff retries.
    retry: false,
  });
}

/** Gap sets for the Sets tab. Errors (not cached as []) on upstream failure. */
export function useGapSets(enabled: boolean) {
  return useQuery({
    queryKey: ['sets', 'gap'],
    queryFn: fetchGapSets,
    enabled,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });
}

/** One gap set's singles. The data carries cards[], so the detail cache scan sees them. */
export function useGapSetCards(setId: string | undefined) {
  return useQuery({
    queryKey: ['cards', 'gap-set', setId],
    queryFn: () => getGapSetCards(setId!),
    enabled: Boolean(setId),
    staleTime: 30 * 60 * 1000,
  });
}

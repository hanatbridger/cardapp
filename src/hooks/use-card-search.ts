import { useQuery } from '@tanstack/react-query';
import {
  searchCards,
  searchSets,
  getSet,
  searchArtists,
  getCardsByArtist,
  type CardSearchFilters,
} from '../services/pokemon-tcg';

export function useCardSearch(query: string, filters: CardSearchFilters = {}) {
  const hasFilter = Boolean(filters.supertype || filters.rarity || filters.setId);
  const enabled = query.length >= 2 || hasFilter;

  return useQuery({
    queryKey: ['cards', 'search', query, filters],
    queryFn: () => searchCards(query, filters),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSetSearch(query: string) {
  return useQuery({
    queryKey: ['sets', 'search', query],
    queryFn: () => searchSets(query),
    // Enable even on empty query — show all recent sets when user opens tab
    enabled: true,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSet(setId: string | undefined) {
  return useQuery({
    queryKey: ['set', setId],
    queryFn: () => getSet(setId!),
    enabled: Boolean(setId),
    staleTime: 60 * 60 * 1000,
  });
}

/**
 * Artist search — same 2-char floor as card search. Disabled on empty
 * query; Explore renders an empty state in that case rather than hammering
 * the API for a wildcard.
 */
export function useArtistSearch(query: string) {
  return useQuery({
    queryKey: ['artists', 'search', query],
    queryFn: () => searchArtists(query),
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
}

export function useArtistCards(artist: string | undefined) {
  return useQuery({
    queryKey: ['artist', 'cards', artist],
    queryFn: () => getCardsByArtist(artist!),
    enabled: Boolean(artist),
    staleTime: 10 * 60 * 1000,
  });
}

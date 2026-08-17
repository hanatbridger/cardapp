import { useQuery } from '@tanstack/react-query';
import {
  searchCards,
  searchSets,
  getSet,
  searchArtists,
  getCardsByArtist,
  getSimilarCards,
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

/**
 * The character's base name, without the variant suffix — "Charizard ex"
 * and "Radiant Charizard" both reduce to "Charizard". Used to find other
 * printings of the same character for the Similar-cards rail; the API
 * search is a name-prefix match, so querying the decorated name would
 * only ever find the card itself.
 */
export function baseCardName(name: string): string {
  const VARIANT_SUFFIXES = new Set(['ex', 'EX', 'GX', 'V', 'VMAX', 'VSTAR', 'BREAK']);
  const words = name.trim().split(/\s+/);
  while (words.length > 1 && VARIANT_SUFFIXES.has(words[words.length - 1])) words.pop();
  if (words[0] === 'Radiant' && words.length > 1) words.shift();
  return words.join(' ');
}

/**
 * Similar cards — other printings of the same character, newest sets
 * first (searchCards default order), excluding the card being viewed.
 * Feeds the rail at the bottom of the card detail screen.
 */
export function useRelatedCards(card: { id: string; name: string } | null | undefined) {
  const base = card ? baseCardName(card.name) : '';
  return useQuery({
    queryKey: ['cards', 'related', card?.id, base],
    queryFn: async () => {
      const cards = await getSimilarCards(base);
      return cards.filter((c) => c.id !== card!.id).slice(0, 8);
    },
    enabled: Boolean(card) && base.length >= 2,
    staleTime: 30 * 60 * 1000,
    // api.pokemontcg.io sheds load with intermittent 500s (~50% observed
    // during incidents). The rail is below the fold and hides itself
    // while empty, so patient retries beat giving up: 5 attempts at 50%
    // is a ~97% eventual render vs ~87% with the default 2 retries.
    retry: 4,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });
}

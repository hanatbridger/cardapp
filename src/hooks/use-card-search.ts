import { useQuery, keepPreviousData } from '@tanstack/react-query';
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
    // Keep showing the previous query's results while the next keystroke's
    // fetch is in flight — the list must never blank to a spinner mid-type.
    placeholderData: keepPreviousData,
  });
}

export function useSetSearch(query: string, enabled = true) {
  return useQuery({
    queryKey: ['sets', 'search', query],
    queryFn: () => searchSets(query),
    // Empty query is a real request — the Sets tab shows recent sets — but
    // consumers gate on tab visibility so Explore doesn't fetch sets while
    // the user is on Cards.
    enabled,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
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
    placeholderData: keepPreviousData,
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
    // Was 4 attempts against api.pokemontcg.io's ~50% incident failure
    // rate. That premise is gone: the catalog goes through our edge proxy,
    // which retries upstream itself and serves a week of
    // stale-while-revalidate, so a 502 reaching here means upstream was
    // down for the proxy's whole budget — more client attempts won't
    // change that, they just stack on the proxy's. The rail hides itself
    // while empty, so one retry is enough.
    retry: 1,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });
}

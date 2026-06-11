import type { PokemonCard } from '../types/card';
import { fetchWithTimeout } from './api-client';

const BASE_URL = 'https://api.pokemontcg.io/v2';

/**
 * Escape Lucene special characters in user-supplied search text before
 * interpolating it into a quoted query term. Without this, a query
 * containing a double-quote or backslash breaks out of the quoted term
 * (changing the query's meaning) or produces a malformed query the API
 * rejects with 400 — surfacing as an empty results screen.
 */
function escapeLucene(s: string): string {
  return s.replace(/([\\"])/g, '\\$1');
}

interface PokemonTcgResponse {
  data: any[];
  totalCount: number;
  page: number;
  pageSize: number;
}

function mapCard(raw: any): PokemonCard {
  return {
    id: raw.id,
    name: raw.name,
    supertype: raw.supertype || '',
    subtypes: raw.subtypes || [],
    hp: raw.hp,
    types: raw.types || [],
    set: {
      id: raw.set?.id || '',
      name: raw.set?.name || '',
      series: raw.set?.series || '',
      releaseDate: raw.set?.releaseDate || '',
      images: {
        symbol: raw.set?.images?.symbol || '',
        logo: raw.set?.images?.logo || '',
      },
    },
    number: raw.number || '',
    rarity: raw.rarity,
    language: isJapaneseSet(raw.set?.id || '', raw.set?.name || '') ? 'JP' : 'EN',
    artist: raw.artist || undefined,
    images: {
      small: raw.images?.small || '',
      large: raw.images?.large || '',
    },
    // Extract TCGPlayer market price and URL if available
    tcgPlayerPrice: extractTcgPrice(raw.tcgplayer, 'market'),
    tcgPlayerMidPrice: extractTcgPrice(raw.tcgplayer, 'mid'),
    tcgPlayerUrl: raw.tcgplayer?.url || undefined,
  };
}

function extractTcgPrice(tcgplayer: any, field: 'market' | 'mid' = 'market'): number | undefined {
  if (!tcgplayer?.prices) return undefined;
  const variants = ['holofoil', 'reverseHolofoil', 'normal', '1stEditionHolofoil', '1stEditionNormal'];
  for (const v of variants) {
    const val = tcgplayer.prices[v]?.[field];
    if (val && val > 0) return val;
  }
  for (const key of Object.keys(tcgplayer.prices)) {
    const val = tcgplayer.prices[key]?.[field];
    if (val && val > 0) return val;
  }
  return undefined;
}

/** Whether a set is Japanese-exclusive (drives EN/JP price routing). */
function isJapaneseSet(setId: string, setName: string): boolean {
  const jpIndicators = ['Japanese', 'Japan', 'プロモ', 'ジャパン'];

  // Name is the reliable signal — explicit Japanese markers.
  if (jpIndicators.some((ind) => setName.includes(ind))) return true;

  // Explicit allowlist of known JP-exclusive set ids. We deliberately do
  // NOT infer language from id suffix shape (the old /\d+[a-z]$/ test):
  // that also matched English sets/promos whose id ends in a lowercase
  // letter, mistagging them language:'JP' and sending the wrong-market
  // language param to the eBay/TCGPlayer proxies, pulling JP prices for
  // an English card. The shared 'sv'/'sm'/'xy' prefixes are likewise
  // English too, so a prefix list can't classify language on its own.
  const jpOnlySets = ['svF', 'svG', 'svH', 'sm11a', 'sm11b', 'sm12a'];
  if (jpOnlySets.some((s) => setId.startsWith(s))) return true;

  return false;
}

export interface CardSearchFilters {
  /** 'Pokémon' | 'Trainer' | 'Energy' or undefined for all */
  supertype?: string;
  /** Exact rarity string or undefined for all */
  rarity?: string;
  /** Restrict to cards in this set id */
  setId?: string;
}

export async function searchCards(
  query: string,
  filters: CardSearchFilters = {},
  page: number = 1,
  pageSize: number = 20,
): Promise<{ cards: PokemonCard[]; totalCount: number }> {
  // Build Lucene query supported by the Pokemon TCG API
  const parts: string[] = [];
  if (query && query.length >= 2) parts.push(`name:"${escapeLucene(query)}*"`);
  if (filters.supertype) parts.push(`supertype:"${filters.supertype}"`);
  if (filters.rarity) parts.push(`rarity:"${filters.rarity}"`);
  if (filters.setId) parts.push(`set.id:${filters.setId}`);

  // If we only have a set filter (no text query), the API still accepts that.
  // If we have nothing, return an empty result set.
  if (parts.length === 0) return { cards: [], totalCount: 0 };

  // Set detail screens render every card in the set under the "All"
  // filter, so when we're scoped to a single setId we ask the
  // Pokemon TCG API for up to 250 cards in one shot (their max
  // pageSize). Default 20 leaks through to set view as "only 20
  // cards visible" — keep 20 for everything else (text search,
  // rarity-only filters) so result lists stay snappy.
  const effectivePageSize = filters.setId ? 250 : pageSize;

  const params = new URLSearchParams({
    q: parts.join(' '),
    page: String(page),
    pageSize: String(effectivePageSize),
    orderBy: filters.setId ? 'number' : '-set.releaseDate',
  });

  const response = await fetchWithTimeout(`${BASE_URL}/cards?${params}`);
  if (!response.ok) {
    throw new Error(`Pokemon TCG API error: ${response.status}`);
  }

  const data: PokemonTcgResponse = await response.json();
  return {
    cards: (data.data || []).map(mapCard),
    totalCount: data.totalCount || 0,
  };
}

export interface PokemonSet {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  releaseDate: string;
  images: { symbol: string; logo: string };
}

function mapSet(raw: any): PokemonSet {
  return {
    id: raw.id,
    name: raw.name || '',
    series: raw.series || '',
    printedTotal: raw.printedTotal || 0,
    total: raw.total || 0,
    releaseDate: raw.releaseDate || '',
    images: {
      symbol: raw.images?.symbol || '',
      logo: raw.images?.logo || '',
    },
  };
}

export async function searchSets(
  query: string,
  page: number = 1,
  pageSize: number = 40,
): Promise<{ sets: PokemonSet[]; totalCount: number }> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    orderBy: '-releaseDate',
  });
  if (query && query.length >= 2) {
    params.set('q', `name:"${escapeLucene(query)}*"`);
  }

  const response = await fetchWithTimeout(`${BASE_URL}/sets?${params}`);
  if (!response.ok) {
    throw new Error(`Pokemon TCG API error: ${response.status}`);
  }

  const data: PokemonTcgResponse = await response.json();
  return {
    sets: (data.data || []).map(mapSet),
    totalCount: data.totalCount || 0,
  };
}

export async function getSet(id: string): Promise<PokemonSet | null> {
  const response = await fetchWithTimeout(`${BASE_URL}/sets/${id}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Pokemon TCG API error: ${response.status}`);
  }
  const data = await response.json();
  return data.data ? mapSet(data.data) : null;
}

export interface ArtistResult {
  /** Artist's display name (exact casing from the API) */
  name: string;
  /** How many cards we've surfaced for this artist (capped by pageSize, not a true total) */
  cardCount: number;
  /** Up to 3 sample cards used to render the preview thumbnails */
  samples: PokemonCard[];
}

/**
 * There is no `/artists` endpoint on the Pokémon TCG API — artists are a
 * field on cards. So we query cards that match `artist:"query*"`, group
 * them by artist name, and return a lightweight per-artist summary.
 *
 * Grouping happens client-side because the API doesn't support
 * DISTINCT/GROUP BY. Caveat: `cardCount` reflects the first page only
 * (pageSize 100 is plenty to rank by popularity without a second round
 * trip). If an artist has > 100 cards matching, the list is still
 * correct — only the count is low.
 */
export async function searchArtists(
  query: string,
  pageSize: number = 100,
): Promise<{ artists: ArtistResult[]; totalCount: number }> {
  if (!query || query.length < 2) return { artists: [], totalCount: 0 };

  const params = new URLSearchParams({
    q: `artist:"${escapeLucene(query)}*"`,
    page: '1',
    pageSize: String(pageSize),
    // Newest first so each artist's sample thumbnails feel current.
    orderBy: '-set.releaseDate',
  });

  const response = await fetchWithTimeout(`${BASE_URL}/cards?${params}`);
  if (!response.ok) {
    throw new Error(`Pokemon TCG API error: ${response.status}`);
  }

  const data: PokemonTcgResponse = await response.json();
  const cards = (data.data || []).map(mapCard);

  // Group by exact artist name. The API preserves casing (e.g. "miki kudo"
  // vs "Miki Kudo") so we key on the raw string to avoid collapsing
  // distinct credits — users care about the exact name printed on the card.
  const byArtist = new Map<string, ArtistResult>();
  for (const card of cards) {
    const name = card.artist?.trim();
    if (!name) continue;
    const existing = byArtist.get(name);
    if (existing) {
      existing.cardCount += 1;
      if (existing.samples.length < 3) existing.samples.push(card);
    } else {
      byArtist.set(name, { name, cardCount: 1, samples: [card] });
    }
  }

  // Sort by prolificness — most cards first, then alpha tie-breaker.
  const artists = Array.from(byArtist.values()).sort((a, b) =>
    b.cardCount - a.cardCount || a.name.localeCompare(b.name),
  );

  return { artists, totalCount: artists.length };
}

/**
 * All cards attributed to a specific artist. Used by the artist detail
 * screen. Exact-match on the artist field — no wildcards — so "miki kudo"
 * doesn't accidentally pull "miki kudoh".
 */
export async function getCardsByArtist(
  artist: string,
  page: number = 1,
  pageSize: number = 60,
): Promise<{ cards: PokemonCard[]; totalCount: number }> {
  const params = new URLSearchParams({
    q: `artist:"${escapeLucene(artist)}"`,
    page: String(page),
    pageSize: String(pageSize),
    orderBy: '-set.releaseDate',
  });

  const response = await fetchWithTimeout(`${BASE_URL}/cards?${params}`);
  if (!response.ok) {
    throw new Error(`Pokemon TCG API error: ${response.status}`);
  }

  const data: PokemonTcgResponse = await response.json();
  return {
    cards: (data.data || []).map(mapCard),
    totalCount: data.totalCount || 0,
  };
}

export async function getCard(id: string): Promise<PokemonCard | null> {
  const response = await fetchWithTimeout(`${BASE_URL}/cards/${id}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Pokemon TCG API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data ? mapCard(data.data) : null;
}

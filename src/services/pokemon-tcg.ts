import { Platform } from 'react-native';
import type { PokemonCard } from '../types/card';
import { fetchWithTimeout } from './api-client';

/**
 * The catalog goes through our own edge proxy (api/pokemontcg/[...path].ts)
 * rather than api.pokemontcg.io directly: upstream load-sheds (four 200s
 * and two 500/502 across six identical requests, measured 2026-09-23),
 * sends no CORS headers so the web build cannot reach it, and charges
 * every phone the full round trip. The proxy caches at the edge, retries
 * upstream server-side, and keeps the API key out of the app bundle.
 *
 * Same dev-vs-prod origin resolution as trending.ts / card-stats.ts:
 * native and dev-web hit the production deployment cross-origin (the
 * function returns CORS *), production web hits it relative same-origin.
 */
const PROXY_ORIGIN = (() => {
  if (Platform.OS !== 'web') {
    return process.env.EXPO_PUBLIC_API_URL ?? 'https://strange-saha.vercel.app';
  }
  if (__DEV__) return 'https://strange-saha.vercel.app';
  return '';
})();

const BASE_URL = `${PROXY_ORIGIN}/api/pokemontcg`;

/**
 * These retries cover only the hop the proxy cannot: the phone-to-edge
 * leg. HTTP responses — 5xx included — are returned as-is now, because a
 * 502 from the proxy already means it exhausted its own upstream attempts,
 * and retrying it here re-runs that entire chain (proxy errors are
 * no-store, so nothing short-circuits) while React Query retries on top
 * of that. Three stacked retry layers turned one rail render into dozens
 * of upstream calls and tens of seconds before the UI could report
 * failure.
 *
 * A thrown error is the case worth retrying: a dropped connection or a
 * DNS blip fails fast and one retry clears it. An abort is excluded — the
 * whole timeout was already spent waiting, so retrying just doubles the
 * wait; React Query's own retry covers that.
 */
const TCG_RETRY_DELAYS_MS = [400];

/**
 * 25s rather than the 12s default: a cache miss on a set-detail screen
 * asks the proxy for 250 rows, and the proxy's worst case is ~20s (see the
 * budget comment in api/pokemontcg/[...path].ts). Aborting before it
 * answers throws away work that would have filled the edge cache for
 * every other user, and turns a slow success into a failed screen.
 */
const CATALOG_TIMEOUT_MS = 25000;

async function tcgFetch(url: string): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetchWithTimeout(url, {}, CATALOG_TIMEOUT_MS);
    } catch (e) {
      const aborted = (e as Error | undefined)?.name === 'AbortError';
      if (aborted || attempt === TCG_RETRY_DELAYS_MS.length) throw e;
      await new Promise((r) => setTimeout(r, TCG_RETRY_DELAYS_MS[attempt]));
    }
  }
}

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
    // Listed-price range — real TCGPlayer data bundled with every card,
    // so even cards with no tracked stats can show an honest market
    // range instead of nothing.
    tcgPlayerLowPrice: extractTcgPrice(raw.tcgplayer, 'low'),
    tcgPlayerHighPrice: extractTcgPrice(raw.tcgplayer, 'high'),
    tcgPlayerUpdatedAt: raw.tcgplayer?.updatedAt || undefined,
    tcgPlayerUrl: raw.tcgplayer?.url || undefined,
  };
}

function extractTcgPrice(tcgplayer: any, field: 'market' | 'mid' | 'low' | 'high' = 'market'): number | undefined {
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
  /** Collector number within its set, e.g. "69" — narrows a name to one card. */
  number?: string;
}

// Every field mapCard reads. Projecting drops the heavy attack/ability/
// legalities blobs, which is what lets big result pages (100 cards)
// serialize without tripping the API's load-shed 500s.
const CARD_SELECT =
  'id,name,supertype,subtypes,hp,types,set,number,rarity,artist,images,tcgplayer';

/**
 * Query aliases for card variants whose printed name doesn't contain the
 * words collectors search by. "latias gold star" matches nothing (the
 * card is named "Latias ★"), so the phrase becomes a rarity filter.
 */
function applyQueryAliases(
  query: string,
  filters: CardSearchFilters,
): { query: string; filters: CardSearchFilters } {
  const m = /^(.*?)\s+(gold\s*star|goldstar)\s*$/i.exec(query.trim());
  if (m && !filters.rarity) {
    return { query: m[1], filters: { ...filters, rarity: 'Rare Holo Star' } };
  }
  return { query, filters };
}

/** Ceiling on a tap-time resolve; past this the caller degrades. */
export const CARD_ID_RESOLVE_TIMEOUT_MS = 2500;

// Label → card id, for the session. Only hits are kept: pokemontcg.io
// load-sheds with 500s, and a miss during one of those spells must not
// become a permanent "this card doesn't exist" for the whole session.
const resolvedIdsByLabel = new Map<string, string>();

/** The id if it has already been resolved this session, else undefined. */
export function cachedCardIdByLabel(label: string): string | undefined {
  return resolvedIdsByLabel.get(label.trim());
}

/**
 * Resolve a display label like "Chikorita #69" to a Pokemon TCG card id.
 * Feeds sourced from TCGPlayer product ids (trending tiles, AI picks)
 * carry a name but not always a card id; resolving on tap keeps those
 * taps landing on card detail instead of dumping the user into search.
 *
 * Name search plus a number filter — the "#69" suffix has to be stripped
 * first, since a "#" inside the Lucene name term matches nothing (which
 * is why the old search fallback landed on an empty screen).
 */
export async function resolveCardIdByLabel(label: string): Promise<string | null> {
  const key = label.trim();
  const memo = resolvedIdsByLabel.get(key);
  if (memo) return memo;

  const m = /^(.*?)\s*#\s*(\w+)$/.exec(key);
  const name = (m ? m[1] : key).trim();
  const number = m ? m[2] : null;
  if (name.length < 2) return null;
  try {
    // Ask for the number server-side when we have one: it usually comes
    // back as a single card, which is both faster and the right card —
    // the old name-only search took the newest printing when the number
    // did not appear in its first 30 rows.
    const { cards } = number
      ? await searchCards(name, { number }, 1, 10)
      : await searchCards(name, {}, 1, 30);
    const sameNumber = (c: { number: string }) =>
      c.number.replace(/^0+/, '') === (number ?? '').replace(/^0+/, '');
    let id: string | null = null;
    if (number) {
      // A numbered label names ONE printing. If the catalog does not have
      // it — brand-new sets lag by weeks — resolve to nothing and let the
      // caller fall back to search. Opening a different printing of the
      // same Pokemon would be a confidently wrong answer.
      id = cards.find(sameNumber)?.id ?? null;
    } else {
      id = cards[0]?.id ?? null;
    }
    if (id) resolvedIdsByLabel.set(key, id);
    return id;
  } catch {
    return null;
  }
}

export async function searchCards(
  rawQuery: string,
  rawFilters: CardSearchFilters = {},
  page: number = 1,
  pageSize: number = 100,
): Promise<{ cards: PokemonCard[]; totalCount: number }> {
  const { query, filters } = applyQueryAliases(rawQuery, rawFilters);
  // Build Lucene query supported by the Pokemon TCG API
  const parts: string[] = [];
  if (query && query.length >= 2) parts.push(`name:"${escapeLucene(query)}*"`);
  if (filters.supertype) parts.push(`supertype:"${filters.supertype}"`);
  if (filters.rarity) parts.push(`rarity:"${filters.rarity}"`);
  if (filters.setId) parts.push(`set.id:${filters.setId}`);
  // Unquoted on purpose: the API 500s on `number:"69"` but answers
  // `number:69` with the single matching card.
  if (filters.number) parts.push(`number:${escapeLucene(filters.number)}`);

  // If we only have a set filter (no text query), the API still accepts that.
  // If we have nothing, return an empty result set.
  if (parts.length === 0) return { cards: [], totalCount: 0 };

  // Set detail screens render every card in the set under the "All"
  // filter, so when we're scoped to a single setId we ask for the
  // API's max 250 in one shot. Text search gets 100 (with the select
  // projection above this stays fast): the old 20-row page sorted
  // newest-first silently hid every vintage printing — a 2005 Gold
  // Star ranks ~30th behind modern reprints and never rendered.
  const effectivePageSize = filters.setId ? 250 : pageSize;

  const params = new URLSearchParams({
    q: parts.join(' '),
    page: String(page),
    pageSize: String(effectivePageSize),
    orderBy: filters.setId ? 'number' : '-set.releaseDate',
    select: CARD_SELECT,
  });

  const response = await tcgFetch(`${BASE_URL}/cards?${params}`);
  if (!response.ok) {
    throw new Error(`Pokemon TCG API error: ${response.status}`);
  }

  const data: PokemonTcgResponse = await response.json();
  return {
    cards: (data.data || []).map(mapCard),
    totalCount: data.totalCount || 0,
  };
}

/**
 * Similar-cards lookup — exact-word name match (NO trailing wildcard) plus
 * a `select` field projection. Both matter: on high-volume names
 * ("Charizard", 108 printings) the API 500s when asked to serialize full
 * card payloads, but the same query with select=id,name,images,set,number
 * returns 200. Word match still hits decorated names ("Mega Charizard Y
 * ex"), which is exactly what the rail wants.
 */
export async function getSimilarCards(
  name: string,
  pageSize: number = 12,
): Promise<PokemonCard[]> {
  const params = new URLSearchParams({
    q: `name:"${escapeLucene(name)}"`,
    pageSize: String(pageSize),
    orderBy: '-set.releaseDate',
    select: 'id,name,images,set,number',
  });
  const response = await tcgFetch(`${BASE_URL}/cards?${params}`);
  if (!response.ok) {
    throw new Error(`Pokemon TCG API error: ${response.status}`);
  }
  const data: PokemonTcgResponse = await response.json();
  return (data.data || []).map(mapCard);
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

  const response = await tcgFetch(`${BASE_URL}/sets?${params}`);
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
  const response = await tcgFetch(`${BASE_URL}/sets/${encodeURIComponent(id)}`);
  if (!response.ok) {
    // 400 is the proxy rejecting the id's shape (it allows [A-Za-z0-9._-]
    // only). These lookups send no query string, so an id is the only
    // thing it can reject — which is a not-found, not an error worth an
    // error screen. Stale watchlist entries and bad deep links land here.
    if (response.status === 404 || response.status === 400) return null;
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

  const response = await tcgFetch(`${BASE_URL}/cards?${params}`);
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

  const response = await tcgFetch(`${BASE_URL}/cards?${params}`);
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
  const response = await tcgFetch(`${BASE_URL}/cards/${encodeURIComponent(id)}`);
  if (!response.ok) {
    // 400 means the proxy rejected the id's shape — same as a 404 here,
    // see getSet above.
    if (response.status === 404 || response.status === 400) return null;
    throw new Error(`Pokemon TCG API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data ? mapCard(data.data) : null;
}

// English gap-set catalogue client — /api/en-gap proxy over TCGPlayer for
// English sets api.pokemontcg.io has not indexed yet (30th Celebration
// on release day). Cards are 'entp-{productId}', sets
// 'entp-set-{setNameId}'; both are URL-safe and never reach pokemontcg.io.
// Ids stay valid after pokemontcg.io catches up, so saved cards resolve.
import type { PokemonCard } from '../types/card';
import type { PokemonSet } from './pokemon-tcg';
import { fetchCatalogJson, shortNumber } from './jp-catalog';

const CARD_PREFIX = 'entp-';
const SET_PREFIX = 'entp-set-';
const ID_RE = /^\d{1,12}$/;

interface EnProduct {
  productId: number;
  name: string;
  setName: string;
  number: string;
  rarity: string | null;
  marketPrice: number | null;
  imageUrl: string;
  setNameId: number;
  /** 'YYYY/MM/DD' */
  releaseDate: string;
  series: string;
}

interface GapSet {
  setNameId: number;
  name: string;
  abbreviation: string;
  releaseDate: string;
  series: string;
  isSupplemental: boolean;
  cardCount: number;
}

export function isGapCardId(id: string): boolean {
  return id.startsWith(CARD_PREFIX) && ID_RE.test(id.slice(CARD_PREFIX.length));
}

export function isGapSetId(id: string): boolean {
  return id.startsWith(SET_PREFIX) && ID_RE.test(id.slice(SET_PREFIX.length));
}

/**
 * Set-name key, identical to norm() in api/_lib/tcg-catalog.ts:
 * 'ME05: Pitch Black' and 'Pitch Black' both give 'pitchblack'. Used by
 * Explore's dedupe against pokemontcg.io rows during the cache window
 * after pokemontcg.io catches up.
 */
export function normSetName(s: string): string {
  return s
    .toLowerCase()
    .replace(/^[a-z]{1,5}[0-9]*(:|\s+-)\s*/, '')
    .replace(/(.)\s+base set$/, '$1')
    .replace(/é/g, 'e')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Card-number key for the same dedupe: TCGPlayer zero-pads ('066'),
 * pokemontcg.io does not ('66'). 'TG05' and 'tg05' also match.
 */
export function normCardNumber(n: string): string {
  return n.trim().replace(/^0+(?=\d)/, '').toUpperCase();
}

/** "Mew ex - 066/128" → "Mew ex". Display cleanup only. */
function displayName(name: string, number: string): string {
  const suffix = ` - ${number}`;
  return number && name.endsWith(suffix) ? name.slice(0, -suffix.length) : name;
}

/**
 * "ME: 30th Celebration" → "30th Celebration". TCGPlayer prefixes set
 * names with the series code; pokemontcg.io set names, which sit beside
 * these in the Sets tab, carry none. Display only — normSetName strips
 * the same prefix, so the dedupe keys are unchanged.
 */
function displaySetName(name: string): string {
  return name.replace(/^[A-Za-z]{1,5}[0-9]*:\s*/, '') || name;
}

export function toEnCard(p: EnProduct): PokemonCard {
  return {
    id: `${CARD_PREFIX}${p.productId}`,
    name: displayName(p.name, p.number),
    supertype: 'Pokémon',
    subtypes: [],
    types: [],
    set: {
      id: `${SET_PREFIX}${p.setNameId}`,
      name: displaySetName(p.setName),
      series: p.series,
      releaseDate: p.releaseDate,
      images: { symbol: '', logo: '' },
    },
    number: shortNumber(p.number),
    rarity: p.rarity ?? undefined,
    language: 'EN',
    artist: undefined,
    images: {
      small: p.imageUrl,
      large: p.imageUrl.replace('_in_400x400', '_in_1000x1000'),
    },
    // The proxy already nulls non-positive prices; never lowestPrice.
    tcgPlayerPrice: p.marketPrice ?? undefined,
    tcgPlayerMidPrice: undefined,
    tcgPlayerUrl: `https://www.tcgplayer.com/product/${p.productId}`,
  };
}

export function toGapSet(g: GapSet): PokemonSet {
  return {
    id: `${SET_PREFIX}${g.setNameId}`,
    name: displaySetName(g.name),
    series: g.series,
    printedTotal: g.cardCount,
    total: g.cardCount,
    releaseDate: g.releaseDate,
    images: { symbol: '', logo: '' },
  };
}

/**
 * Set order when numbers identify the card (001..158, then R/G/B
 * specials); by name when they repeat, as in Classic Collection, whose
 * numbers are reprint numbers from the original sets.
 */
function sortSetCards(cards: PokemonCard[]): PokemonCard[] {
  const unique = new Set(cards.map((c) => c.number)).size === cards.length;
  if (!unique) return [...cards].sort((a, b) => a.name.localeCompare(b.name));
  return [...cards].sort((a, b) => {
    const an = /^\d+$/.test(a.number) ? Number(a.number) : null;
    const bn = /^\d+$/.test(b.number) ? Number(b.number) : null;
    if (an !== null && bn !== null) return an - bn;
    if (an !== null) return -1;
    if (bn !== null) return 1;
    return a.number.localeCompare(b.number);
  });
}

// Both list fetches throw on failure so React Query does not cache an
// outage as an empty answer; callers treat an error as "no gap rows".
export async function fetchGapSets(): Promise<PokemonSet[]> {
  const data = await fetchCatalogJson('/api/en-gap?sets=1');
  if (!data) throw new Error('Could not load sets');
  const sets: GapSet[] = Array.isArray(data?.sets) ? data.sets : [];
  return sets.map(toGapSet);
}

export async function searchGapCards(query: string): Promise<PokemonCard[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const data = await fetchCatalogJson(`/api/en-gap?q=${encodeURIComponent(q)}`);
  if (!data) throw new Error('Could not search cards');
  const products: EnProduct[] = Array.isArray(data?.products) ? data.products : [];
  return products.map(toEnCard);
}

export async function getGapSetCards(setId: string): Promise<{
  set: PokemonSet | null;
  cards: PokemonCard[];
  totalCount: number;
  complete: boolean;
}> {
  const setNameId = setId.startsWith(SET_PREFIX) ? setId.slice(SET_PREFIX.length) : setId;
  if (!ID_RE.test(setNameId)) throw new Error('Set not found');
  const data = await fetchCatalogJson(`/api/en-gap?set=${setNameId}`);
  // Throw so the screen shows its error state, not an empty set.
  if (!data) throw new Error('Could not load cards');
  const products: EnProduct[] = Array.isArray(data.products) ? data.products : [];
  return {
    set: data.set ? toGapSet(data.set as GapSet) : null,
    cards: sortSetCards(products.map(toEnCard)),
    totalCount: Number(data.totalResults) || products.length,
    complete: data.complete === true,
  };
}

export async function getGapProduct(productId: string): Promise<PokemonCard | null> {
  if (!ID_RE.test(productId)) return null;
  const data = await fetchCatalogJson(`/api/en-gap?pid=${productId}`);
  return data?.product ? toEnCard(data.product as EnProduct) : null;
}

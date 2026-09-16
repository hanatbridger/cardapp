// English gap-set catalogue client — /api/en-gap proxy over TCGPlayer for
// English sets api.pokemontcg.io has not indexed yet (30th Celebration
// on release day). Cards are 'entp-{productId}', sets
// 'entp-set-{setNameId}'; both are URL-safe and never reach pokemontcg.io.
// Ids stay valid after pokemontcg.io catches up, so saved cards resolve.
// Sealed products Collectrics does not list are 'tps-{productId}'
// (/api/en-gap?sealed=1); they route through the sealed screens.
import type { QueryClient } from '@tanstack/react-query';
import type { PokemonCard } from '../types/card';
import type { SealedPrice } from '../types/sealed';
import type { PokemonSet } from './pokemon-tcg';
import { fetchCatalogJson, shortNumber } from './jp-catalog';

const CARD_PREFIX = 'entp-';
const SET_PREFIX = 'entp-set-';
const SEALED_PREFIX = 'tps-';
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

/* ---------------- Sealed ('tps-{productId}') ---------------- */

interface EnSealedProduct {
  kind: 'sealed';
  productId: number;
  name: string;
  setName: string;
  setNameId: number;
  setCode: string;
  releaseDate: string;
  marketPrice: number | null;
  imageUrl: string;
}

export interface GapSealed {
  pid: string;
  name: string;
  /** Display name: 'ME: 30th Celebration' -> '30th Celebration'. */
  setName: string;
  rawSetName: string;
  /** 'YYYY/MM/DD' */
  releaseDate: string;
  marketPrice: number | null;
  imageUrl: string;
}

export type GapSealedPoint = { date: string; price: number };

/** TCGPlayer productId of a 'tps-' sealed id, else null. */
export function gapSealedPid(id?: string): string | null {
  if (!id || !id.startsWith(SEALED_PREFIX)) return null;
  const pid = id.slice(SEALED_PREFIX.length);
  return ID_RE.test(pid) ? pid : null;
}

const PID_IN_IMAGE_RE = /\/product\/(\d+)_in_/;

/**
 * TCGPlayer productId behind any sealed item: the 'tps-' id, else the pid
 * in its TCGPlayer CDN image url (cx- rows carry one). Lets a tps- item and
 * the cx- row Collectrics later adds for it count as one product.
 */
export function sealedTcgPid(productId: string, imageUrl?: string): string | null {
  return gapSealedPid(productId) ?? PID_IN_IMAGE_RE.exec(imageUrl ?? '')?.[1] ?? null;
}

/** An older en-gap deploy ignores sealed=1 and serves singles; reject those. */
function isSealedPayload(p: any): p is EnSealedProduct {
  return (
    p?.kind === 'sealed' &&
    Number.isFinite(Number(p?.productId)) &&
    typeof p?.name === 'string' &&
    p.name.length > 0
  );
}

function toGapSealed(p: EnSealedProduct): GapSealed {
  const marketPrice = Number(p.marketPrice);
  return {
    pid: String(p.productId),
    name: p.name,
    setName: displaySetName(p.setName),
    rawSetName: p.setName,
    releaseDate: typeof p.releaseDate === 'string' ? p.releaseDate : '',
    // The proxy already nulls non-positive prices; never lowestPrice.
    marketPrice: p.marketPrice !== null && Number.isFinite(marketPrice) && marketPrice > 0 ? marketPrice : null,
    imageUrl: typeof p.imageUrl === 'string' ? p.imageUrl : '',
  };
}

/** Throws on failure, like searchGapCards; callers treat it as no rows. */
export async function searchGapSealed(query: string): Promise<GapSealed[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const data = await fetchCatalogJson(`/api/en-gap?sealed=1&q=${encodeURIComponent(q)}`);
  if (!data) throw new Error('Could not search sealed products');
  const products: unknown[] = Array.isArray(data?.products) ? data.products : [];
  return products.filter(isSealedPayload).map(toGapSealed);
}

/** Null when the pid is unknown or the proxy failed. */
export async function fetchGapSealed(pid: string): Promise<GapSealed | null> {
  if (!ID_RE.test(pid)) return null;
  const data = await fetchCatalogJson(`/api/en-gap?sealed=1&pid=${pid}`);
  return isSealedPayload(data?.product) ? toGapSealed(data.product) : null;
}

/** Our snapshots, oldest first. Throws when the history call itself fails. */
async function fetchGapSealedHistoryRaw(pid: string): Promise<GapSealedPoint[]> {
  if (!ID_RE.test(pid)) return [];
  const hist = await fetchCatalogJson(`/api/tcgplayer/history?productId=${pid}`);
  if (!hist) throw new Error('sealed history unavailable');
  const raw: any[] = Array.isArray(hist?.history) ? hist.history : [];
  return raw
    .filter((p) => typeof p?.date === 'string' && typeof p?.price === 'number' && Number.isFinite(p.price))
    .map((p) => ({ date: p.date, price: p.price }));
}

/**
 * Drops pre-release (presale) buckets: TCGPlayer's backfill starts weeks
 * before release at thin, inflated presale prices.
 */
export function clipToRelease(history: GapSealedPoint[], releaseDate: string): GapSealedPoint[] {
  const release = releaseDate.replace(/\//g, '-').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(release)) return history;
  return history.filter((p) => p.date.slice(0, 10) >= release);
}

const STATS_STALE_MS = 30 * 60 * 1000;

/**
 * React Query options shared by use-sealed.ts and return-alerts.ts, so
 * both read one cache entry per pid. Product and history are separate
 * queries (the detail screen renders before history backfill lands);
 * price reads both through the client cache.
 */
export function gapSealedProductQuery(pid: string) {
  return {
    queryKey: ['sealed', 'tps-product', pid] as const,
    queryFn: async (): Promise<GapSealed> => {
      const product = await fetchGapSealed(pid);
      if (product === null) throw new Error('sealed product unavailable');
      return product;
    },
    staleTime: STATS_STALE_MS,
    retry: 1,
  };
}

export function gapSealedHistoryQuery(qc: QueryClient, pid: string) {
  return {
    queryKey: ['sealed', 'tps-history', pid] as const,
    queryFn: async (): Promise<GapSealedPoint[]> => {
      const [raw, product] = await Promise.all([
        fetchGapSealedHistoryRaw(pid),
        qc.fetchQuery(gapSealedProductQuery(pid)).catch(() => null),
      ]);
      return product ? clipToRelease(raw, product.releaseDate) : raw;
    },
    staleTime: STATS_STALE_MS,
    retry: 1,
  };
}

export function gapSealedPriceQuery(qc: QueryClient, pid: string) {
  return {
    queryKey: ['sealed', 'tps-price', pid] as const,
    queryFn: async (): Promise<SealedPrice | null> => {
      const [product, history] = await Promise.all([
        qc.fetchQuery(gapSealedProductQuery(pid)),
        // History only refines the price; marketPrice stands without it.
        qc.fetchQuery(gapSealedHistoryQuery(qc, pid)).catch((): GapSealedPoint[] => []),
      ]);
      return gapSealedToPrice(`${SEALED_PREFIX}${pid}`, product, history);
    },
    staleTime: STATS_STALE_MS,
    retry: 1,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const RANGE_DAYS = 14;

function dayDiff(a: string, b: string): number {
  return (Date.parse(`${a.slice(0, 10)}T00:00:00Z`) - Date.parse(`${b.slice(0, 10)}T00:00:00Z`)) / DAY_MS;
}

/**
 * SealedPrice for a 'tps-' product. Current and previous come from one
 * series and a stale snapshot is never shown as current: the last snapshot
 * counts only when dated within a day of today, else TCGPlayer's
 * marketPrice is current. The change is day-over-day only (the slot reads
 * as daily, like cx-); any other gap between snapshots shows 0%. Null when
 * TCGPlayer has no market price. `history` should already be release-
 * clipped. `now` is injectable for fixtures.
 */
export function gapSealedToPrice(
  id: string,
  product: GapSealed,
  history: GapSealedPoint[],
  now: Date = new Date(),
): SealedPrice | null {
  const marketPrice = product.marketPrice;
  if (marketPrice === null) return null;
  const today = now.toISOString().slice(0, 10);
  const last = history.length > 0 ? history[history.length - 1] : null;
  const lastIsCurrent = last !== null && Math.abs(dayDiff(today, last.date)) <= 1;
  const currentPrice = lastIsCurrent ? last!.price : marketPrice;
  const before = history.length >= 2 ? history[history.length - 2] : null;
  const previousPrice =
    lastIsCurrent && before && dayDiff(last!.date, before.date) === 1 ? before.price : currentPrice;
  const since = new Date(Date.parse(`${today}T00:00:00Z`) - RANGE_DAYS * DAY_MS)
    .toISOString()
    .slice(0, 10);
  const window = history.filter((p) => p.date.slice(0, 10) >= since).map((p) => p.price);
  const pool = window.length > 0 ? window : [currentPrice];
  return {
    productId: id,
    currentPrice,
    previousPrice,
    percentChange: previousPrice !== 0 ? ((currentPrice - previousPrice) / previousPrice) * 100 : 0,
    averagePrice: pool.reduce((a, b) => a + b, 0) / pool.length,
    highPrice: Math.max(...pool),
    lowPrice: Math.min(...pool),
    salesCount: 0,
    lastSaleDate: '',
    lastSalePrice: currentPrice,
  };
}

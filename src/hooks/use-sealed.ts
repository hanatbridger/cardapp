import { useQuery } from '@tanstack/react-query';
import { searchSealedProducts, getSealedProduct } from '../mocks/sealed';
import { fetchSealedPrice, fetchSealedPriceHistory } from '../services/tcgplayer';
import type { SealedPriceHistoryPoint } from '../services/tcgplayer';
import { searchSealedLive, fetchSealedLiveStats } from '../services/sealed-live';
import type { SealedLiveHit, SealedLiveStats } from '../services/sealed-live';
import type { SealedPrice, SealedProduct, SealedType } from '../types/sealed';

/**
 * Sealed-product hooks. Two id namespaces coexist:
 *
 *   `cx-{collectricsId}`  → live data via /api/sealed-search +
 *                           /api/sealed-stats (collectrics-backed)
 *   everything else       → the curated mock catalog in mocks/sealed.ts
 *                           (`{setId}-{type}` ids like 'swsh7-bb')
 *
 * Search tries live first and falls back to mocks; detail/price/history
 * route by prefix so existing mock ids behave exactly as before.
 */

/** Extract the numeric collectrics id from a `cx-` app id, else null. */
function collectricsId(id: string | undefined): string | null {
  if (!id || !id.startsWith('cx-')) return null;
  const cid = id.slice(3);
  return /^\d{1,12}$/.test(cid) ? cid : null;
}

// Ordered — first match wins. "Elite Trainer" before the generic box
// patterns, "bundle" after "display box" so bundle display boxes read
// as boxes.
const TYPE_PATTERNS: Array<[RegExp, SealedType]> = [
  [/elite trainer/i, 'etb'],
  [/ultra.?premium/i, 'upc'],
  [/\bcase\b/i, 'booster-case'],
  [/booster box|display box/i, 'booster-box'],
  [/bundle/i, 'booster-bundle'],
  [/booster pack|blister|sleeved booster/i, 'booster-pack'],
  [/\btin\b/i, 'tin'],
];

function inferSealedType(productName: string): SealedType {
  for (const [re, type] of TYPE_PATTERNS) {
    if (re.test(productName)) return type;
  }
  return 'collection-box';
}

/**
 * Collectrics splits "Booster Box" / "Paldea Evolved" across two fields;
 * our catalog convention is one display name ("Paldea Evolved Booster
 * Box"). Compose unless the product name already carries the set.
 */
function composeName(productName: string, setName: string): string {
  if (!setName) return productName;
  if (productName.toLowerCase().includes(setName.toLowerCase())) {
    return productName;
  }
  return `${setName} ${productName}`;
}

// Same pre-built search URL recipe as mocks/sealed.ts (not exported there).
function tcgSearchUrl(query: string): string {
  return `https://www.tcgplayer.com/search/pokemon/product?productLineName=pokemon&q=${encodeURIComponent(query).replace(/%20/g, '+')}&view=grid&ProductTypeName=Sealed+Products`;
}

function toSealedProduct(
  id: string,
  productName: string,
  setName: string,
  imageUrl: string,
): SealedProduct {
  const name = composeName(productName, setName);
  return {
    id,
    name,
    type: inferSealedType(productName),
    contents: 'Factory sealed',
    setId: '',
    setName,
    releaseDate: '',
    msrp: 0, // unknown for live items — detail screen hides the MSRP cell
    imageUrl,
    tcgplayerUrl: tcgSearchUrl(name),
  };
}

function liveHitToProduct(hit: SealedLiveHit): SealedProduct {
  return toSealedProduct(`cx-${hit.cid}`, hit.name, hit.setName, hit.imageUrl);
}

function statsToProduct(id: string, stats: SealedLiveStats): SealedProduct {
  return toSealedProduct(id, stats.name, stats.setName, stats.imageUrl);
}

/**
 * Shape collectrics daily history into the SealedPrice the detail screen
 * renders. Range/average come from the last 14 daily closes; collectrics
 * doesn't expose per-sale events, so salesCount/lastSaleDate stay empty
 * and the screen hides those cells.
 */
function statsToPrice(id: string, stats: SealedLiveStats): SealedPrice | null {
  const history = stats.history;
  // Current and previous MUST come from the same series. stats.price is
  // collectrics' blended "movement latest", which routinely differs from
  // the daily closes by a few percent — mixing the two fabricated a
  // day-over-day change on a flat price (same defect class as e7349b9's
  // spread-shown-as-change). Daily closes drive both; stats.price is
  // only the fallback when there is no history at all.
  const lastClose = history.length > 0 ? history[history.length - 1].price : null;
  const currentPrice = lastClose ?? stats.price;
  if (currentPrice === null) return null;
  const previousPrice =
    history.length >= 2 ? history[history.length - 2].price : currentPrice;
  const window = history.slice(-14).map((p) => p.price);
  const pool = window.length > 0 ? window : [currentPrice];
  return {
    productId: id,
    currentPrice,
    previousPrice,
    percentChange:
      previousPrice !== 0
        ? ((currentPrice - previousPrice) / previousPrice) * 100
        : 0,
    averagePrice: pool.reduce((a, b) => a + b, 0) / pool.length,
    highPrice: Math.max(...pool),
    lowPrice: Math.min(...pool),
    salesCount: 0,
    lastSaleDate: '',
    lastSalePrice: currentPrice,
  };
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * One shared raw query per collectrics id — product, price, and history
 * hooks observe the same cache entry with different `select`s, so the
 * detail screen costs a single /api/sealed-stats fetch.
 */
function useCollectricsStats<T>(
  cid: string | null,
  select: (stats: SealedLiveStats | null) => T,
) {
  return useQuery({
    // Throw on null so transient failures get React Query's retry and
    // error semantics instead of being cached as a successful "not
    // found" for a full day.
    queryKey: ['sealed', 'cx-stats', cid],
    queryFn: async () => {
      const stats = await fetchSealedLiveStats(cid!);
      if (stats === null) throw new Error('sealed stats unavailable');
      return stats;
    },
    enabled: Boolean(cid),
    staleTime: DAY,
    retry: 1,
    select: (stats: SealedLiveStats) => select(stats),
  });
}

/**
 * Sealed-product catalog search. Tries the live collectrics-backed
 * endpoint first (real ~full catalog); when the call fails or matches
 * nothing, falls back to the curated ~35-SKU mock list so search never
 * goes dark. Wrapped in useQuery so consumers share the same
 * loading/idle API as `useCardSearch`.
 *
 * `typeFilter` is reserved for a future "Sealed" quick-chip row and is
 * mock-only (live rows carry no type axis) — not wired into the search
 * tab yet.
 */
export function useSealedSearch(query: string, typeFilter?: SealedType) {
  const q = query.trim();
  return useQuery({
    queryKey: ['sealed', 'search', q, typeFilter ?? null],
    queryFn: async (): Promise<SealedProduct[]> => {
      if (!typeFilter && q.length >= 2) {
        const live = await searchSealedLive(q);
        if (live.length > 0) return live.map(liveHitToProduct);
      }
      return searchSealedProducts(q, typeFilter);
    },
    // Match card search's 2-char floor so the two result streams kick in
    // at the same keystroke — avoids sealed results flashing before cards.
    enabled: q.length >= 2 || Boolean(typeFilter),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Detail lookup by internal id. Mock ids (`{setId}-{type}`) read from
 * the static catalog; `cx-` ids build product metadata from the live
 * stats payload (name / set / image) since they have no mock entry.
 */
export function useSealedProduct(id: string | undefined) {
  const cid = collectricsId(id);
  const live = useCollectricsStats(cid, (stats) =>
    stats ? statsToProduct(`cx-${cid}`, stats) : null,
  );
  const mock = useQuery({
    queryKey: ['sealed', 'product', id],
    queryFn: () => getSealedProduct(id!) ?? null,
    enabled: Boolean(id) && !cid,
    staleTime: Infinity,
  });
  return cid ? live : mock;
}

/**
 * Current market price for a sealed product. `cx-` ids derive it from
 * the live collectrics stats; mock ids keep the existing tcgplayer
 * service path (which falls back to `SEALED_PRICES` seeds).
 */
export function useSealedPrice(id: string | undefined, tcgplayerProductId?: string) {
  const cid = collectricsId(id);
  const live = useCollectricsStats(cid, (stats) =>
    stats ? statsToPrice(`cx-${cid}`, stats) : null,
  );
  const mock = useQuery({
    queryKey: ['sealed', 'price', id, tcgplayerProductId ?? null],
    queryFn: () => fetchSealedPrice(id!, tcgplayerProductId),
    enabled: Boolean(id) && !cid,
    // Sealed prices move slower than singles so we cache for a full day —
    // still invalidated on manual refresh via the detail screen's pull-to-refresh.
    staleTime: DAY,
    retry: false,
  });
  return cid ? live : mock;
}

/**
 * Daily price history. `cx-` ids get ~200 days of real collectrics
 * closes; mock ids keep the existing (empty-until-wired) service path.
 */
export function useSealedPriceHistory(
  id: string | undefined,
  tcgplayerProductId?: string,
) {
  const cid = collectricsId(id);
  const live = useCollectricsStats(
    cid,
    (stats): SealedPriceHistoryPoint[] => stats?.history ?? [],
  );
  const mock = useQuery({
    queryKey: ['sealed', 'history', id, tcgplayerProductId ?? null],
    queryFn: () => fetchSealedPriceHistory(id!, tcgplayerProductId),
    enabled: Boolean(id) && !cid,
    staleTime: DAY,
    retry: false,
  });
  return cid ? live : mock;
}

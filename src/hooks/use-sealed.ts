import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { searchSealedProducts, getSealedProduct, SEALED_TYPE_LABEL } from '../mocks/sealed';
import { fetchSealedPrice, fetchSealedPriceHistory } from '../services/tcgplayer';
import type { SealedPriceHistoryPoint } from '../services/tcgplayer';
import { searchSealedLive, fetchSealedLiveStats } from '../services/sealed-live';
import type { SealedLiveHit, SealedLiveStats } from '../services/sealed-live';
import {
  gapSealedHistoryQuery,
  gapSealedPid,
  gapSealedPriceQuery,
  gapSealedProductQuery,
  searchGapSealed,
  sealedTcgPid,
} from '../services/en-gap-catalog';
import type { SealedPrice, SealedProduct, SealedType } from '../types/sealed';

/**
 * Sealed-product hooks. Three id namespaces coexist:
 *
 *   `cx-{collectricsId}`  → live data via /api/sealed-search +
 *                           /api/sealed-stats (collectrics-backed)
 *   `tps-{productId}`     → TCGPlayer sealed products Collectrics does not
 *                           list, via /api/en-gap?sealed=1 +
 *                           /api/tcgplayer/history (en-gap-catalog.ts);
 *                           product, history and price are separate queries
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

// TCGPlayer-only (`tps-`) SKUs Collectrics never names: multi-unit
// displays and blisters. Applied before TYPE_PATTERNS for tps rows only,
// so cx- badges are unchanged.
const TPS_TYPE_PATTERNS: Array<[RegExp, SealedType]> = [
  [/booster box|display box/i, 'booster-box'],
  [/\bdisplay\b/i, 'booster-case'],
  [/single pack blister/i, 'booster-pack'],
  [/blister/i, 'booster-bundle'],
];

function inferSealedType(productName: string, tps = false): SealedType {
  for (const [re, type] of tps ? [...TPS_TYPE_PATTERNS, ...TYPE_PATTERNS] : TYPE_PATTERNS) {
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
  tcgplayerProductId?: string,
  /** tps only: TCGPlayer 'YYYY/MM/DD'. */
  releaseDate?: string,
): SealedProduct {
  const name = composeName(productName, setName);
  const product: SealedProduct = {
    id,
    name,
    type: inferSealedType(productName, Boolean(tcgplayerProductId)),
    contents: 'Factory sealed',
    setId: '',
    setName,
    releaseDate: '',
    msrp: 0, // unknown for live items — detail screen hides the MSRP cell
    imageUrl,
    tcgplayerUrl: tcgSearchUrl(name),
  };
  if (tcgplayerProductId) {
    if (releaseDate) product.releaseDate = releaseDate.replace(/\//g, '-');
    product.tcgplayerProductId = tcgplayerProductId;
    product.tcgplayerUrl = `https://www.tcgplayer.com/product/${tcgplayerProductId}`;
  }
  return product;
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
  // Browsing by type used to skip the live path entirely and serve
  // the seeded catalog, so a type chip showed sample prices while
  // the identical product found by typing showed a real one. With no
  // text query, the type's own label is the query ("Booster Box",
  // "Elite Trainer Box") — collectrics returns real inventory for
  // each of them.
  const liveQuery = q.length >= 2 ? q : typeFilter ? SEALED_TYPE_LABEL[typeFilter] : '';
  const cx = useQuery({
    queryKey: ['sealed', 'search', q, typeFilter ?? null],
    queryFn: async (): Promise<{ mapped: SealedProduct[]; pids: string[] }> => {
      if (liveQuery.length < 2) return { mapped: [], pids: [] };
      const live = await searchSealedLive(liveQuery).catch((): SealedLiveHit[] => []);
      // Collectrics repeats a product across printings/conditions;
      // one row per name keeps the list readable.
      const seen = new Set<string>();
      const mapped = live
        .map(liveHitToProduct)
        .filter((p) => {
          const key = p.name.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .filter((p) => !typeFilter || p.type === typeFilter);
      const pids = live
        .map((hit) => sealedTcgPid('', hit.imageUrl))
        .filter((pid): pid is string => pid !== null);
      return { mapped, pids };
    },
    // Match card search's 2-char floor so the two result streams kick in
    // at the same keystroke — avoids sealed results flashing before cards.
    enabled: q.length >= 2 || Boolean(typeFilter),
    staleTime: 5 * 60 * 1000,
  });
  // Separate query: TCGPlayer gap rows never hold back Collectrics rows.
  const gapEnabled = liveQuery.length >= 2 && (q.length >= 2 || Boolean(typeFilter));
  const gap = useQuery({
    queryKey: ['sealed', 'tps-search', liveQuery],
    queryFn: () => searchGapSealed(liveQuery),
    enabled: gapEnabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const cxData = cx.data;
  const gapData = gap.data;
  const gapLoading = gapEnabled && gap.isLoading;
  const data = useMemo((): SealedProduct[] | undefined => {
    if (!cxData) return undefined;
    const { mapped, pids } = cxData;
    // The server already drops products Collectrics lists for the set;
    // this catches one filed under another set code (pid in the cx image
    // url), with the composed name as a fallback.
    const cxPids = new Set(pids);
    const seen = new Set(mapped.map((p) => p.name.toLowerCase()));
    const gapRows = (gapData ?? [])
      .filter((g) => !cxPids.has(g.pid))
      .map((g) =>
        toSealedProduct(`tps-${g.pid}`, g.name, g.setName, g.imageUrl, g.pid, g.releaseDate),
      )
      .filter((p) => {
        const key = p.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .filter((p) => !typeFilter || p.type === typeFilter);
    // TCGPlayer relevance lets loose matches through; only rows naming
    // every query word go above Collectrics, the rest go after.
    const tokens = liveQuery.toLowerCase().split(/\s+/).filter(Boolean);
    const onTopic = (p: SealedProduct) => {
      const hay = `${p.name} ${p.setName}`.toLowerCase();
      return tokens.every((t) => hay.includes(t));
    };
    const merged = [
      ...gapRows.filter(onTopic),
      ...mapped,
      ...gapRows.filter((p) => !onTopic(p)),
    ];
    // Only fall through to the seeded catalog when live genuinely
    // has nothing — a thin live result is still real data.
    if (merged.length > 0) return merged;
    // Gap rows still coming: no seeded rows that would flash and vanish.
    if (gapLoading) return [];
    return searchSealedProducts(q, typeFilter);
  }, [cxData, gapData, gapLoading, liveQuery, q, typeFilter]);

  return {
    data,
    isFetching: cx.isFetching || gap.isFetching,
    isLoading: cx.isLoading,
  };
}

/**
 * Detail lookup by internal id. Mock ids (`{setId}-{type}`) read from
 * the static catalog; `cx-` ids build product metadata from the live
 * stats payload (name / set / image) since they have no mock entry.
 */
export function useSealedProduct(id: string | undefined) {
  const cid = collectricsId(id);
  const tps = gapSealedPid(id);
  const live = useCollectricsStats(cid, (stats) =>
    stats ? statsToProduct(`cx-${cid}`, stats) : null,
  );
  const tpsQuery = useQuery({
    ...gapSealedProductQuery(tps ?? ''),
    enabled: Boolean(tps),
    select: (p): SealedProduct | null =>
      toSealedProduct(`tps-${p.pid}`, p.name, p.setName, p.imageUrl, p.pid, p.releaseDate),
  });
  const mock = useQuery({
    queryKey: ['sealed', 'product', id],
    queryFn: () => getSealedProduct(id!) ?? null,
    enabled: Boolean(id) && !cid && !tps,
    staleTime: Infinity,
  });
  return cid ? live : tps ? tpsQuery : mock;
}

/**
 * Current market price for a sealed product. `cx-` ids derive it from
 * the live collectrics stats; mock ids keep the existing tcgplayer
 * service path (which falls back to `SEALED_PRICES` seeds).
 */
export function useSealedPrice(id: string | undefined, tcgplayerProductId?: string) {
  const cid = collectricsId(id);
  const tps = gapSealedPid(id);
  const live = useCollectricsStats(cid, (stats) =>
    stats ? statsToPrice(`cx-${cid}`, stats) : null,
  );
  const qc = useQueryClient();
  const tpsQuery = useQuery({ ...gapSealedPriceQuery(qc, tps ?? ''), enabled: Boolean(tps) });
  const mock = useQuery({
    queryKey: ['sealed', 'price', id, tcgplayerProductId ?? null],
    queryFn: () => fetchSealedPrice(id!, tcgplayerProductId),
    enabled: Boolean(id) && !cid && !tps,
    // Sealed prices move slower than singles so we cache for a full day —
    // still invalidated on manual refresh via the detail screen's pull-to-refresh.
    staleTime: DAY,
    retry: false,
  });
  return cid ? live : tps ? tpsQuery : mock;
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
  const tps = gapSealedPid(id);
  const live = useCollectricsStats(
    cid,
    (stats): SealedPriceHistoryPoint[] => stats?.history ?? [],
  );
  const qc = useQueryClient();
  const tpsQuery = useQuery({
    ...gapSealedHistoryQuery(qc, tps ?? ''),
    enabled: Boolean(tps),
    select: (h): SealedPriceHistoryPoint[] => h,
  });
  const mock = useQuery({
    queryKey: ['sealed', 'history', id, tcgplayerProductId ?? null],
    queryFn: () => fetchSealedPriceHistory(id!, tcgplayerProductId),
    enabled: Boolean(id) && !cid && !tps,
    staleTime: DAY,
    retry: false,
  });
  return cid ? live : tps ? tpsQuery : mock;
}

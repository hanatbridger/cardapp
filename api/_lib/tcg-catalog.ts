// TCGPlayer catalogue helpers shared by the catalogue proxies:
// api/jp-search.ts (Pokemon Japan line) and api/en-gap.ts (English sets
// TCGPlayer lists before api.pokemontcg.io indexes them).
//
// Upstreams are TCGPlayer's own SPA endpoints (no auth, no Cache-Control)
// plus the public pokemontcg.io set list. Callers set CDN cache headers.

export { fetchWithTimeout } from './http';
import { fetchWithTimeout } from './http';

export const SEARCH_URL = 'https://mp-search-api.tcgplayer.com/v1/search/request';
export const DETAILS_URL = 'https://mp-search-api.tcgplayer.com/v1/product';
const SET_NAMES_URL = 'https://mpapi.tcgplayer.com/v2/Catalog/SetNames?categoryId=3&active=true';
const PTCG_SETS_URL =
  'https://api.pokemontcg.io/v2/sets?orderBy=-releaseDate&pageSize=250&select=id,name,series,releaseDate,ptcgoCode';

// Kept at the JP catalog's value so JP upstream requests stay byte-identical.
export const UA = { 'user-agent': 'Mozilla/5.0 (CardPulse JP Catalog)' };
/** pokemontcg.io is not the JP catalogue; identify the app neutrally there. */
const PTCG_UA = { 'user-agent': 'Mozilla/5.0 (CardPulse)' };

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function json(status: number, body: unknown, cacheControl: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': cacheControl,
      ...CORS,
    },
  });
}

export interface JpProduct {
  productId: number;
  name: string;
  setName: string;
  number: string;
  rarity: string | null;
  marketPrice: number | null;
  imageUrl: string;
}

export function imageUrl(productId: number, size: number): string {
  return `https://tcgplayer-cdn.tcgplayer.com/product/${productId}_in_${size}x${size}.jpg`;
}

export function mapRow(p: any): JpProduct | null {
  const productId = Number(p?.productId);
  const name = p?.productName;
  if (!Number.isFinite(productId) || typeof name !== 'string' || !name) {
    return null;
  }
  const marketPrice = Number(p?.marketPrice);
  return {
    productId,
    name,
    setName: typeof p?.setName === 'string' ? p.setName : '',
    number: typeof p?.customAttributes?.number === 'string'
      ? p.customAttributes.number
      : '',
    rarity: typeof p?.rarityName === 'string' ? p.rarityName : null,
    marketPrice: Number.isFinite(marketPrice) && marketPrice > 0 ? marketPrice : null,
    imageUrl: imageUrl(productId, 400),
  };
}

/** Max page size the search endpoint accepts (51+ is a 400). */
export const MAX_PAGE_SIZE = 50;

export interface CatalogSearch {
  q: string;
  productLine: 'pokemon' | 'pokemon-japan';
  setNames?: string[];
  /**
   * productTypeName ['Cards']. The row-level `sealed` flag is always false
   * on search rows, so this filter is the only reliable sealed exclusion.
   */
  cardsOnly?: boolean;
  /** productTypeName ['Sealed Products']; mutually exclusive with cardsOnly. */
  sealedOnly?: boolean;
  from: number;
  size: number;
  sort?: { field: string; order: 'asc' | 'desc' };
}

export async function searchCatalog(
  s: CatalogSearch,
): Promise<{ rows: any[]; totalResults: number; aggregations: any }> {
  const term: Record<string, string[]> = { productLineName: [s.productLine] };
  if (s.cardsOnly && s.sealedOnly) throw new Error('cardsOnly and sealedOnly are exclusive');
  if (s.cardsOnly) term.productTypeName = ['Cards'];
  // TCGPlayer's Pokemon line has exactly two types: 'Cards', 'Sealed Products'.
  if (s.sealedOnly) term.productTypeName = ['Sealed Products'];
  if (s.setNames) term.setName = s.setNames;
  const res = await fetchWithTimeout(
    `${SEARCH_URL}?q=${encodeURIComponent(s.q)}&isList=false`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...UA },
      body: JSON.stringify({
        algorithm: 'sales_synonym_v2',
        from: s.from,
        size: Math.min(s.size, MAX_PAGE_SIZE),
        filters: { term, range: {}, match: {} },
        listingSearch: {
          context: { cart: {} },
          filters: {
            term: { sellerStatus: 'Live', channelId: 0 },
            range: { quantity: { gte: 1 } },
            exclude: { channelExclusion: 0 },
          },
        },
        context: { cart: {}, shippingCountry: 'US' },
        // Same reasoning as the JP catalog: fuzzy turns unknown words into
        // unrelated rows.
        settings: { useFuzzySearch: false, didYouMean: {} },
        sort: s.sort ?? {},
      }),
    },
  );
  if (!res.ok) throw new Error(`search ${res.status}`);
  const data = await res.json();
  const result = data?.results?.[0];
  return {
    rows: Array.isArray(result?.results) ? result.results : [],
    totalResults: Number(result?.totalResults) || 0,
    aggregations: result?.aggregations ?? {},
  };
}

/**
 * Raw /details JSON. Unknown pids come back 400 (not 404), so both mean
 * "no such product"; 5xx and timeouts throw.
 */
export async function fetchProductDetails(pid: string): Promise<any | null> {
  const res = await fetchWithTimeout(`${DETAILS_URL}/${pid}/details`, { headers: UA });
  if (res.status === 400 || res.status === 404) return null;
  if (!res.ok) throw new Error(`details ${res.status}`);
  return res.json();
}

/** English single: /details also serves other lines (pid 1 is 'TCGplayer'). */
export function isEnCard(details: any): boolean {
  return details?.productLineName === 'Pokemon' && details?.productTypeName === 'Cards';
}

/** English sealed product; the twin of isEnCard. */
export function isEnSealed(details: any): boolean {
  return details?.productLineName === 'Pokemon' && details?.productTypeName === 'Sealed Products';
}

/**
 * Multi-unit distributor cases ('... Elite Trainer Box Case', '... Sleeved
 * Booster Case (48 ct)', '... Collection case'). Collectrics tracks none,
 * their market prices are the least reliable, and relevance ranks them
 * above the retail products, so sealed search leaves them out.
 */
export const CASE_RE = /\bcase\b/i;

export interface TcgSetName {
  setNameId: number;
  name: string;
  abbreviation: string;
  /** 'YYYY-MM-DDT00:00:00'; null on several legacy sets. */
  releaseDate: string | null;
  isSupplemental: boolean;
}

export interface PtcgSet {
  id: string;
  name: string;
  series: string;
  /** 'YYYY/MM/DD' */
  releaseDate: string;
  ptcgoCode?: string;
}

export async function fetchTcgSetNames(): Promise<TcgSetName[]> {
  const res = await fetchWithTimeout(SET_NAMES_URL, { headers: UA });
  if (!res.ok) throw new Error(`setnames ${res.status}`);
  const data = await res.json();
  const rows: any[] = Array.isArray(data?.results) ? data.results : [];
  return rows
    .filter((r) => Number.isFinite(Number(r?.setNameId)) && typeof r?.name === 'string')
    .map((r) => ({
      setNameId: Number(r.setNameId),
      name: r.name,
      abbreviation: typeof r.abbreviation === 'string' ? r.abbreviation : '',
      releaseDate: typeof r.releaseDate === 'string' ? r.releaseDate : null,
      isSupplemental: r.isSupplemental === true,
    }));
}

/** Backoff before attempts 2 and 3; its 500s come in bursts. */
const PTCG_BACKOFF_MS = [300, 1000];
const PTCG_ATTEMPT_TIMEOUT_MS = 3000;

export async function fetchPtcgSets(): Promise<PtcgSet[]> {
  // api.pokemontcg.io sheds load with intermittent 500/502s. One blip
  // would empty the gap list, so retry transient failures with backoff;
  // a 4xx is final. Worst case ~10s (3 x 3s + backoff).
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, PTCG_BACKOFF_MS[attempt - 1]));
    try {
      const res = await fetchWithTimeout(PTCG_SETS_URL, { headers: PTCG_UA }, PTCG_ATTEMPT_TIMEOUT_MS);
      if (res.ok) {
        const data = await res.json();
        const rows: any[] = Array.isArray(data?.data) ? data.data : [];
        if (rows.length === 0) throw new Error('ptcg sets empty');
        return rows
          .filter((r) => typeof r?.name === 'string' && typeof r?.releaseDate === 'string')
          .map((r) => ({
            id: String(r.id),
            name: r.name,
            series: typeof r.series === 'string' ? r.series : '',
            releaseDate: r.releaseDate,
            ptcgoCode: typeof r.ptcgoCode === 'string' ? r.ptcgoCode : undefined,
          }));
      }
      lastError = new Error(`ptcg sets ${res.status}`);
      if (res.status >= 400 && res.status < 500) break;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError ?? new Error('ptcg sets failed');
}

/* ---------------- Gap detection ---------------- */

/**
 * Backstop for sets pokemontcg.io never indexes (energies, promos, the
 * McDonald's and Trick or Trade runs, first-partner and placement
 * promos). Today the date floor already excludes all of them; this only
 * matters if pokemontcg.io stalls while TCGPlayer adds one.
 */
const NON_CARD_SET_DENY =
  /promo|energies|mcdonald|trick or trade|battle academy|first partner|prize pack|player placement/i;

const MAX_GAP_AGE_DAYS = 180;
/**
 * The floor sits this far below pokemontcg.io's newest released set, so a
 * newer set it indexes first does not hide an older one it still lacks.
 */
const FLOOR_MARGIN_DAYS = 60;
const CODE_DATE_WINDOW_DAYS = 7;
const DAY_MS = 86400000;

/**
 * Name key shared with the client dedupe (normSetName in
 * src/services/en-gap-catalog.ts; keep identical): 'ME05: Pitch Black' ==
 * 'Pitch Black', 'SM - Team Up' == 'Team Up', 'SWSH01: Sword & Shield
 * Base Set' == 'Sword & Shield'.
 */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/^[a-z]{1,5}[0-9]*(:|\s+-)\s*/, '')
    .replace(/(.)\s+base set$/, '$1')
    .replace(/é/g, 'e')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '');
}

export interface GapSet {
  setNameId: number;
  name: string;
  abbreviation: string;
  /** 'YYYY/MM/DD', pokemontcg.io's format. */
  releaseDate: string;
  series: string;
  isSupplemental: boolean;
  /** Singles (productTypeName Cards) in the set. */
  cardCount: number;
}

export type GapCandidate = Omit<GapSet, 'cardCount'>;

function dayOf(tcgDate: string): string {
  return tcgDate.slice(0, 10);
}

function ptcgDay(date: string): string {
  return date.replace(/\//g, '-');
}

function daysApart(a: string, b: string): number {
  return Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / DAY_MS;
}

/** 'ME05: Pitch Black' -> 'ME'; null when the name has no series prefix. */
function tcgSeriesPrefix(name: string): string | null {
  const colon = name.indexOf(':');
  if (colon <= 0) return null;
  const prefix = name.slice(0, colon).trim().replace(/\d+$/, '');
  return prefix || null;
}

/**
 * Series for a TCGPlayer set name, learned from sets both catalogues
 * carry under the same name ('ME05: Pitch Black' is pokemontcg.io's
 * 'Pitch Black', series 'Mega Evolution', so prefix 'ME' means 'Mega
 * Evolution'). Falls back to the newest pokemontcg.io set's series.
 * Heuristic and cosmetic only: it can be wrong at a series boundary.
 */
export function seriesFor(tcgName: string, tcgSets: TcgSetName[], ptcgSets: PtcgSet[]): string {
  const prefix = tcgSeriesPrefix(tcgName);
  if (prefix) {
    const ptcgByNorm = new Map<string, PtcgSet>();
    for (const p of ptcgSets) ptcgByNorm.set(norm(p.name), p);
    let best: { date: string; series: string } | null = null;
    for (const t of tcgSets) {
      if (!t.releaseDate || tcgSeriesPrefix(t.name) !== prefix) continue;
      const hit = ptcgByNorm.get(norm(t.name));
      if (!hit || !hit.series) continue;
      if (!best || dayOf(t.releaseDate) > best.date) {
        best = { date: dayOf(t.releaseDate), series: hit.series };
      }
    }
    if (best) return best.series;
  }
  let newest: PtcgSet | null = null;
  for (const p of ptcgSets) {
    if (!newest || p.releaseDate > newest.releaseDate) newest = p;
  }
  return newest?.series ?? '';
}

/**
 * English sets TCGPlayer lists that pokemontcg.io does not (yet). Pure,
 * so fixtures can pin it; `today` is UTC 'YYYY-MM-DD'.
 *
 * A set is a gap when it has released (no presale), is no more than 60
 * days older than the newest pokemontcg.io set that has released, is
 * under 180 days old, is
 * not a promo/energy run, and matches no pokemontcg.io set by normalised
 * name or, failing that, by code + release date (within 7 days).
 */
export function computeGapSets(
  tcgSets: TcgSetName[],
  ptcgSets: PtcgSet[],
  today: string,
  log: (msg: string) => void = (msg) => console.info(msg),
): GapCandidate[] {
  // A future-dated pokemontcg.io entry must not raise the floor and hide
  // sets that are still missing.
  let newestPtcg = '';
  for (const p of ptcgSets) {
    const d = ptcgDay(p.releaseDate);
    if (d <= today && d > newestPtcg) newestPtcg = d;
  }
  const floor = newestPtcg
    ? new Date(Date.parse(`${newestPtcg}T00:00:00Z`) - FLOOR_MARGIN_DAYS * DAY_MS)
        .toISOString()
        .slice(0, 10)
    : '';
  const oldest = new Date(Date.parse(`${today}T00:00:00Z`) - MAX_GAP_AGE_DAYS * DAY_MS)
    .toISOString()
    .slice(0, 10);

  const candidates = tcgSets.filter((t) => {
    if (!t.releaseDate) return false;
    const d = dayOf(t.releaseDate);
    return d <= today && d >= floor && d >= oldest && !NON_CARD_SET_DENY.test(t.name);
  });

  // 1. Name match. Each pokemontcg.io set that name-matches is spent, so
  // the code fallback below cannot hand it to a second candidate.
  const ptcgNorms = new Map<string, PtcgSet[]>();
  for (const p of ptcgSets) {
    const k = norm(p.name);
    ptcgNorms.set(k, [...(ptcgNorms.get(k) ?? []), p]);
  }
  const spent = new Set<string>();
  const unmatched: TcgSetName[] = [];
  for (const c of candidates) {
    const hits = ptcgNorms.get(norm(c.name));
    if (hits && hits.length > 0) {
      for (const h of hits) spent.add(h.id);
    } else {
      unmatched.push(c);
    }
  }

  // 2. Code + date fallback, for a set pokemontcg.io names differently.
  // Main sets claim a same-code pokemontcg.io set before supplemental
  // ones, so the main 30th set landing alone hides the main set and
  // keeps Classic Collection listed.
  const ordered = [...unmatched].sort(
    (a, b) => Number(a.isSupplemental) - Number(b.isSupplemental) || a.name.localeCompare(b.name),
  );
  const gaps: TcgSetName[] = [];
  for (const c of ordered) {
    const code = c.abbreviation.trim().toUpperCase();
    const d = dayOf(c.releaseDate!);
    const twin = code
      ? ptcgSets.find(
          (p) =>
            !spent.has(p.id) &&
            (p.ptcgoCode ?? '').trim().toUpperCase() === code &&
            daysApart(ptcgDay(p.releaseDate), d) <= CODE_DATE_WINDOW_DAYS,
        )
      : undefined;
    if (twin) {
      spent.add(twin.id);
      log(`[tcg-catalog] code match: "${c.name}" (${code} ${d}) = pokemontcg "${twin.name}" (${twin.id} ${twin.releaseDate})`);
    } else {
      gaps.push(c);
    }
  }

  return gaps
    .map((g) => ({
      setNameId: g.setNameId,
      name: g.name,
      abbreviation: g.abbreviation,
      releaseDate: dayOf(g.releaseDate!).replace(/-/g, '/'),
      series: seriesFor(g.name, tcgSets, ptcgSets),
      isSupplemental: g.isSupplemental,
    }))
    .sort(
      (a, b) =>
        b.releaseDate.localeCompare(a.releaseDate) ||
        Number(a.isSupplemental) - Number(b.isSupplemental) ||
        a.name.localeCompare(b.name),
    );
}

interface CatalogState {
  tcgSets: TcgSetName[];
  ptcgSets: PtcgSet[];
  gaps: GapSet[];
}

const MEMO_TTL_MS = 10 * 60 * 1000;
/** Budget for a refresh; past it, serve the last good state if there is one. */
const LOAD_DEADLINE_MS = 8000;
let memo: { at: number; state: CatalogState } | null = null;
let inflight: Promise<CatalogState> | null = null;

async function refreshCatalogState(): Promise<CatalogState> {
  const [tcgSets, ptcgSets] = await Promise.all([fetchTcgSetNames(), fetchPtcgSets()]);
  const today = new Date().toISOString().slice(0, 10);
  const candidates = computeGapSets(tcgSets, ptcgSets, today);

  let gaps: GapSet[] = [];
  if (candidates.length > 0) {
    const { aggregations } = await searchCatalog({
      q: '',
      productLine: 'pokemon',
      cardsOnly: true,
      setNames: candidates.map((c) => c.name),
      from: 0,
      size: 1,
    });
    const counts = new Map<string, number>();
    for (const a of Array.isArray(aggregations?.setName) ? aggregations.setName : []) {
      if (typeof a?.value === 'string') counts.set(a.value, Number(a.count) || 0);
    }
    gaps = candidates
      .map((c) => ({ ...c, cardCount: counts.get(c.name) ?? 0 }))
      .filter((g) => g.cardCount > 0);
  }

  const state = { tcgSets, ptcgSets, gaps };
  memo = { at: Date.now(), state };
  return state;
}

/**
 * SetNames + pokemontcg.io sets + singles counts, memoised for 10 min in a
 * warm isolate (best effort; Edge cold starts refetch). Concurrent callers
 * share one refresh. When a refresh fails or overruns its deadline, the
 * last good state is served (the refresh keeps running and lands in the
 * memo); throws only when no state has ever loaded in this isolate.
 */
async function loadCatalogState(deadlineMs = LOAD_DEADLINE_MS): Promise<CatalogState> {
  if (memo && Date.now() - memo.at < MEMO_TTL_MS) return memo.state;
  if (!inflight) {
    inflight = refreshCatalogState().finally(() => {
      inflight = null;
    });
    // A caller that gave up at its deadline must not leave this unhandled.
    inflight.catch(() => {});
  }
  const run = inflight;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('catalog state deadline')), deadlineMs);
  });
  try {
    return await Promise.race([run, deadline]);
  } catch (e) {
    if (memo) {
      console.warn('[tcg-catalog] serving stale catalog state', e);
      return memo.state;
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export async function getGapSets(): Promise<GapSet[]> {
  return (await loadCatalogState()).gaps;
}

/** findSetMeta only needs series/releaseDate cosmetics from the full state. */
const SET_META_DEADLINE_MS = 2000;

/**
 * Meta for any English set id: the gap entry when it is one, else the
 * SetNames row, so a set id already routed (or saved) keeps resolving
 * after pokemontcg.io catches up. cardCount is 0 for non-gap rows (the
 * caller knows the real count from its search). Null when the id is not
 * an active Pokemon set. Throws only when SetNames itself is unreachable.
 * Waits at most ~2s on the full state (pokemontcg.io can hang), then
 * resolves from SetNames alone; series may then be ''.
 */
export async function findSetMeta(setNameId: number): Promise<GapSet | null> {
  let state: CatalogState | null = null;
  try {
    state = await loadCatalogState(SET_META_DEADLINE_MS);
  } catch {
    state = null;
  }
  const gap = state?.gaps.find((g) => g.setNameId === setNameId);
  if (gap) return gap;
  const tcgSets = state?.tcgSets ?? (await fetchTcgSetNames());
  const row = tcgSets.find((t) => t.setNameId === setNameId);
  if (!row) return null;
  return {
    setNameId: row.setNameId,
    name: row.name,
    abbreviation: row.abbreviation,
    releaseDate: row.releaseDate ? dayOf(row.releaseDate).replace(/-/g, '/') : '',
    series: seriesFor(row.name, tcgSets, state?.ptcgSets ?? []),
    isSupplemental: row.isSupplemental,
    cardCount: 0,
  };
}

/* ---------------- Recent sealed (TCGPlayer lists, Collectrics lacks) ---------------- */

const MAX_SEALED_SET_AGE_DAYS = 180;

/**
 * Sets whose sealed products the TCGPlayer sealed search covers: released
 * (no presale), under 180 days old, not a promo/energy run. Independent of
 * pokemontcg.io, because Collectrics' sealed coverage is. Pure, so a fixture
 * can pin it; `today` is UTC 'YYYY-MM-DD'.
 */
export function recentSealedSetFilter(tcgSets: TcgSetName[], today: string): TcgSetName[] {
  const oldest = new Date(Date.parse(`${today}T00:00:00Z`) - MAX_SEALED_SET_AGE_DAYS * DAY_MS)
    .toISOString()
    .slice(0, 10);
  return tcgSets.filter((t) => {
    if (!t.releaseDate) return false;
    const d = dayOf(t.releaseDate);
    return d <= today && d >= oldest && !NON_CARD_SET_DENY.test(t.name);
  });
}

/**
 * Recent sets as GapSet rows (cardCount 0), newest first. Like findSetMeta,
 * waits ~2s on the full state for series, then resolves from SetNames
 * alone (series ''), so a pokemontcg.io outage does not fail sealed search.
 */
export async function getRecentSealedSets(): Promise<GapSet[]> {
  let state: CatalogState | null = null;
  try {
    state = await loadCatalogState(SET_META_DEADLINE_MS);
  } catch {
    state = null;
  }
  const tcgSets = state?.tcgSets ?? (await fetchTcgSetNames());
  const ptcgSets = state?.ptcgSets ?? [];
  const today = new Date().toISOString().slice(0, 10);
  return recentSealedSetFilter(tcgSets, today)
    .map((t) => ({
      setNameId: t.setNameId,
      name: t.name,
      abbreviation: t.abbreviation,
      releaseDate: dayOf(t.releaseDate!).replace(/-/g, '/'),
      series: seriesFor(t.name, tcgSets, ptcgSets),
      isSupplemental: t.isSupplemental,
      cardCount: 0,
    }))
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate) || a.name.localeCompare(b.name));
}

const COLLECTRICS_SEARCH_URL = 'https://mycollectrics.com/api/search/cards';
/** Same UA as api/sealed-search.ts. */
const COLLECTRICS_UA = { 'user-agent': 'Mozilla/5.0 (CardPulse Sealed Proxy)' };
const COLLECTRICS_PAGE = 200;
const COLLECTRICS_MAX_PAGES = 5;
const COLLECTRICS_TTL_MS = 60 * 60 * 1000;
const PID_IN_IMAGE_RE = /\/product\/(\d+)_in_/;

const collectricsMemo = new Map<string, { at: number; pids: Set<number> }>();
const collectricsInflight = new Map<string, Promise<Set<number>>>();

async function loadCollectricsSealedPids(code: string): Promise<Set<number>> {
  const pids = new Set<number>();
  let offset = 0;
  for (let page = 0; page < COLLECTRICS_MAX_PAGES; page++) {
    // An empty q with setCode returns the whole set listing (verified
    // 2026-09-16: setCode=PBL gives total 151, 14 sealed rows).
    const res = await fetchWithTimeout(
      `${COLLECTRICS_SEARCH_URL}?q=&setCode=${encodeURIComponent(code)}&limit=${COLLECTRICS_PAGE}&offset=${offset}`,
      { headers: COLLECTRICS_UA },
    );
    if (!res.ok) throw new Error(`collectrics ${code} ${res.status}`);
    const data = await res.json();
    const rows: any[] = Array.isArray(data?.results) ? data.results : [];
    for (const r of rows) {
      // Sealed rows: null card-number AND null rarity-name (api/sealed-search.ts).
      if (r?.['card-number'] != null || r?.['rarity-name'] != null) continue;
      // sealed-search.ts hides unpriced rows; counting them here would
      // hide the product from both lists.
      const price = r?.['raw-price'];
      if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) continue;
      const m = PID_IN_IMAGE_RE.exec(String(r?.['image-url'] ?? ''));
      if (m) pids.add(Number(m[1]));
    }
    offset += rows.length;
    const total = Number(data?.total) || 0;
    if (rows.length === 0 || offset >= total) break;
  }
  return pids;
}

/**
 * TCGPlayer productIds of the sealed products Collectrics lists for a set
 * code (Collectrics set-code equals the TCGPlayer abbreviation). The pid
 * comes from the row's TCGPlayer image url. Memoised per isolate for 1h;
 * concurrent callers share one fetch; failures throw and are not memoised.
 */
export async function getCollectricsSealedPids(setCode: string): Promise<Set<number>> {
  const code = setCode.trim().toUpperCase();
  if (!code) throw new Error('collectrics: empty set code');
  const hit = collectricsMemo.get(code);
  if (hit && Date.now() - hit.at < COLLECTRICS_TTL_MS) return hit.pids;
  let run = collectricsInflight.get(code);
  if (!run) {
    run = loadCollectricsSealedPids(code)
      .then((pids) => {
        collectricsMemo.set(code, { at: Date.now(), pids });
        return pids;
      })
      .finally(() => {
        collectricsInflight.delete(code);
      });
    collectricsInflight.set(code, run);
  }
  return run;
}

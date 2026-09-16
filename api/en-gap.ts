// Vercel serverless function (Edge runtime) — English sets TCGPlayer
// lists but api.pokemontcg.io has not indexed yet ("gap sets").
//
// Why: pokemontcg.io lags new English sets by weeks (30th Celebration
// released 2026-09-16 with no entry there), so the app could neither
// search, list nor price them. TCGPlayer's catalogue carries them on
// release day. Gap detection is automatic (api/_lib/tcg-catalog.ts
// computeGapSets): once pokemontcg.io lists a set it drops out of every
// mode here with no code change. Product and set lookups by id keep
// working after that, so saved cards keep resolving.
//
// Modes:
//   GET /api/en-gap?sets=1        → { sets: GapSet[] }
//   GET /api/en-gap?q=mew         → { products } singles in gap sets only
//   GET /api/en-gap?set=24722     → { set, products, totalResults, complete }
//   GET /api/en-gap?pid=716465    → { product } one English single
//
// Only q/set/pid go upstream; no user data is forwarded.

import {
  CORS,
  MAX_PAGE_SIZE,
  fetchProductDetails,
  findSetMeta,
  getGapSets,
  isEnCard,
  json,
  mapRow,
  searchCatalog,
  type GapSet,
  type JpProduct,
} from './_lib/tcg-catalog';

export const config = { runtime: 'edge' };

interface EnProduct extends JpProduct {
  setNameId: number;
  /** 'YYYY/MM/DD' */
  releaseDate: string;
  series: string;
}

// Gap sets change at most daily. Worst-case pokemontcg.io catch-up lag:
// sets 10 min memo + 30 min CDN + 5 min swr + 30 min client (~75 min);
// search 10 + 15 + 5 + 10 (~40 min). The client dedupes cards meanwhile.
const SETS_CACHE = 'public, s-maxage=1800, stale-while-revalidate=300';
const SEARCH_CACHE = 'public, s-maxage=900, stale-while-revalidate=300';
const SET_CACHE = 'public, s-maxage=1800, stale-while-revalidate=21600';
// Card detail shows this payload's marketPrice as the current price and
// baselines watchlist returns on it, so it ages no faster than the live
// price proxy (30 min).
const PRODUCT_CACHE = 'public, s-maxage=1800, stale-while-revalidate=300';
const NOT_FOUND_CACHE = 'public, s-maxage=300';
// Degraded or partial answers: short, so a blip is not pinned for everyone.
const SHORT_CACHE = 'public, s-maxage=60';
const NO_STORE = 'no-store';

/** A set grid is fetched in parallel pages; 6 x 50 covers any modern set. */
const MAX_SET_PAGES = 6;

const ID_RE = /^\d{1,12}$/;

function toEnProduct(row: any, meta: { setNameId: number; releaseDate: string; series: string }): EnProduct | null {
  const p = mapRow(row);
  if (!p) return null;
  return { ...p, setNameId: meta.setNameId, releaseDate: meta.releaseDate, series: meta.series };
}

/** 'YYYY-MM-DDT00:00:00Z' -> 'YYYY/MM/DD'; '' when absent. */
function slashDate(iso: unknown): string {
  return typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}/.test(iso)
    ? iso.slice(0, 10).replace(/-/g, '/')
    : '';
}

async function handleSets(): Promise<Response> {
  try {
    return json(200, { sets: await getGapSets() }, SETS_CACHE);
  } catch (e) {
    console.error('[en-gap] sets', e);
    // Non-2xx so neither the CDN nor the client caches an empty list as
    // the answer; the app then shows pokemontcg.io data only.
    return json(503, { error: 'catalog unavailable' }, NO_STORE);
  }
}

async function handleSearch(q: string): Promise<Response> {
  let gaps: GapSet[];
  try {
    gaps = await getGapSets();
  } catch (e) {
    console.error('[en-gap] sets for search', e);
    return json(503, { error: 'catalog unavailable' }, NO_STORE);
  }
  if (gaps.length === 0) return json(200, { products: [] }, SEARCH_CACHE);

  const byId = new Map(gaps.map((g) => [g.setNameId, g]));
  try {
    // Scoped to gap set names, so a pokemontcg.io-indexed single can never
    // come back from here.
    const page = (from: number) =>
      searchCatalog({
        q,
        productLine: 'pokemon',
        cardsOnly: true,
        setNames: gaps.map((g) => g.name),
        from,
        size: MAX_PAGE_SIZE,
      });
    const first = await page(0);
    const rows = [...first.rows];
    if (first.totalResults > MAX_PAGE_SIZE) {
      // Capped at two pages (100 rows). Best effort: a failed second page
      // still returns the first.
      const second = await page(MAX_PAGE_SIZE).catch(() => null);
      if (second) rows.push(...second.rows);
    }
    const products: EnProduct[] = [];
    const seen = new Set<number>();
    for (const row of rows) {
      const gap = byId.get(Number(row?.setId)) ?? gaps.find((g) => g.name === row?.setName);
      if (!gap) continue;
      const p = toEnProduct(row, gap);
      // Sealed rows carry no card number; a backstop to productTypeName.
      if (!p || !p.number || seen.has(p.productId)) continue;
      seen.add(p.productId);
      products.push(p);
    }
    return json(200, { products }, SEARCH_CACHE);
  } catch (e) {
    console.error('[en-gap] search', e);
    return json(502, { error: 'catalog unavailable' }, NO_STORE);
  }
}

async function handleSet(setNameId: number): Promise<Response> {
  let meta: GapSet | null;
  try {
    meta = await findSetMeta(setNameId);
  } catch (e) {
    console.error('[en-gap] set meta', e);
    return json(502, { error: 'catalog unavailable' }, NO_STORE);
  }
  if (!meta) return json(404, { error: 'set not found' }, NOT_FOUND_CACHE);

  const page = (n: number) =>
    searchCatalog({
      q: '',
      productLine: 'pokemon',
      cardsOnly: true,
      setNames: [meta!.name],
      from: n * MAX_PAGE_SIZE,
      size: MAX_PAGE_SIZE,
      sort: { field: 'product-sorting-name', order: 'asc' },
    });

  let first: Awaited<ReturnType<typeof page>>;
  try {
    first = await page(0);
  } catch (e) {
    console.error('[en-gap] set page 1', e);
    return json(502, { error: 'catalog unavailable' }, NO_STORE);
  }
  const totalResults = first.totalResults;
  const pageCount = Math.min(Math.ceil(totalResults / MAX_PAGE_SIZE), MAX_SET_PAGES);
  const rest = await Promise.allSettled(
    Array.from({ length: Math.max(pageCount - 1, 0) }, (_, i) => page(i + 1)),
  );
  let allPages = true;
  const rows = [...first.rows];
  for (const r of rest) {
    if (r.status === 'fulfilled') rows.push(...r.value.rows);
    else allPages = false;
  }

  const seen = new Set<number>();
  const products: EnProduct[] = [];
  for (const row of rows) {
    const p = toEnProduct(row, meta);
    if (!p || seen.has(p.productId)) continue;
    seen.add(p.productId);
    if (p.number) products.push(p);
  }
  // Never present a truncated grid as the whole set.
  const complete = allPages && seen.size === totalResults;
  const set: GapSet = { ...meta, cardCount: meta.cardCount || totalResults };
  return json(
    200,
    { set, products, totalResults, complete },
    complete ? SET_CACHE : SHORT_CACHE,
  );
}

async function handleProduct(pid: string): Promise<Response> {
  let details: any | null;
  try {
    details = await fetchProductDetails(pid);
  } catch (e) {
    console.error('[en-gap] details', e);
    return json(502, { error: 'catalog unavailable' }, NO_STORE);
  }
  // Unknown pid, another product line, or sealed: not an English single.
  if (!details || !isEnCard(details)) {
    return json(404, { error: 'product not found' }, NOT_FOUND_CACHE);
  }
  const setNameId = Number(details.setId);
  const meta = Number.isFinite(setNameId)
    ? await findSetMeta(setNameId).catch(() => null)
    : null;
  const product = toEnProduct(details, {
    setNameId: Number.isFinite(setNameId) ? setNameId : 0,
    releaseDate: meta?.releaseDate || slashDate(details?.customAttributes?.releaseDate),
    series: meta?.series ?? '',
  });
  if (!product) return json(404, { error: 'product not found' }, NOT_FOUND_CACHE);
  return json(200, { product }, PRODUCT_CACHE);
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== 'GET') return json(405, { error: 'method not allowed' }, NO_STORE);

  const url = new URL(req.url);
  const sets = url.searchParams.get('sets');
  const q = url.searchParams.get('q')?.trim() ?? '';
  const set = url.searchParams.get('set')?.trim() ?? '';
  const pid = url.searchParams.get('pid')?.trim() ?? '';

  if (sets === '1') return handleSets();
  if (set) {
    if (!ID_RE.test(set)) return json(400, { error: 'bad set' }, NO_STORE);
    return handleSet(Number(set));
  }
  if (pid) {
    if (!ID_RE.test(pid)) return json(400, { error: 'bad pid' }, NO_STORE);
    return handleProduct(pid);
  }
  if (q.length < 2 || q.length > 60) {
    return json(400, { error: 'q must be 2-60 chars' }, NO_STORE);
  }
  return handleSearch(q);
}

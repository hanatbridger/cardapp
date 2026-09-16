// Vercel serverless function (Edge runtime) — Japanese card catalog via
// TCGPlayer's "Pokemon Japan" product line, the same marketplace data
// our price proxies already consume.
//
// Why: the tcgdex ja database indexes only a sliver of the real JP
// print history (4 Rayquaza rows vs TCGPlayer's 178; the 2002 Theater
// Limited VS Pack promos are entirely absent). TCGPlayer's category is
// the catalog collectors actually buy from, uses English names, and
// carries market prices — so JP cards get real prices for free.
//
// Modes:
//   GET /api/jp-search?q=rayquaza   → search, up to 40 card products
//   GET /api/jp-search?pid=613850   → single product (detail screen)

import {
  CORS,
  DETAILS_URL,
  SEARCH_URL,
  UA,
  fetchWithTimeout,
  json as catalogJson,
  mapRow,
  type JpProduct,
} from './_lib/tcg-catalog';

export const config = { runtime: 'edge' };

function json(status: number, body: unknown, cacheable = true): Response {
  // Catalog + market prices move slowly; 6h CDN cache matches the
  // other catalog proxies.
  return catalogJson(
    status,
    body,
    cacheable ? 'public, s-maxage=21600, stale-while-revalidate=86400' : 'no-store',
  );
}

/**
 * Collector nicknames the catalog does not carry in any field.
 *
 * TCGPlayer names the 2018 Pokemon x Munch Museum promos "Pikachu -
 * 288/SM-P"; neither the product name, the set name ("SM-P: Sun & Moon
 * Promos") nor the rarity mentions Munch, so no amount of text search
 * finds them. Collectors only ever call them by the collab name, so the
 * ids are pinned here.
 *
 * Keep the patterns narrow — a loose /scream/ would hijack every search
 * for Scream Tail, a real Pokemon.
 */
const NICKNAMES: Array<{ test: RegExp; productIds: number[] }> = [
  {
    // Pokemon x Munch Museum, 2018 — "The Scream" promos, 286-290/SM-P.
    test: /(\bmunch\b|ムンク|\bthe\s*scream\b)/i,
    productIds: [598363, 598364, 598365, 598366, 598367],
  },
];

function matchNickname(q: string): { productIds: number[]; residual: string } | null {
  for (const n of NICKNAMES) {
    if (!n.test.test(q)) continue;
    return { productIds: n.productIds, residual: q.replace(n.test, ' ').trim() };
  }
  return null;
}

/**
 * Pinned collab set, narrowed to the species the user also typed
 * ("pikachu munch" -> just the Pikachu). A residual that matches nothing
 * falls back to the whole set: the collab has no Charizard, and showing
 * the five cards beats an empty screen.
 */
async function nicknameProducts(
  productIds: number[],
  residual: string,
): Promise<JpProduct[]> {
  const settled = await Promise.all(
    productIds.map((id) => getProduct(String(id)).catch(() => null)),
  );
  const found = settled.filter((p): p is JpProduct => p !== null);
  if (residual.length < 2) return found;
  const needle = residual.toLowerCase();
  const narrowed = found.filter((p) => p.name.toLowerCase().includes(needle));
  return narrowed.length > 0 ? narrowed : found;
}

async function searchProducts(q: string): Promise<JpProduct[]> {
  const res = await fetchWithTimeout(
    `${SEARCH_URL}?q=${encodeURIComponent(q)}&isList=false`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...UA },
      body: JSON.stringify({
        algorithm: 'sales_synonym_v2',
        from: 0,
        size: 40,
        filters: { term: { productLineName: ['pokemon-japan'] }, range: {}, match: {} },
        listingSearch: {
          context: { cart: {} },
          filters: {
            term: { sellerStatus: 'Live', channelId: 0 },
            range: { quantity: { gte: 1 } },
            exclude: { channelExclusion: 0 },
          },
        },
        context: { cart: {}, shippingCountry: 'US' },
        // Fuzzy off: the synonym algorithm already absorbs typos
        // ("charzard" still returns 405 Charizard rows), while fuzzy
        // matching turned unknown words into noise — "munch" came back
        // as Caterpie, Weedle and Dedenne, which reads as if those were
        // the results. An empty section is the honest answer.
        settings: { useFuzzySearch: false, didYouMean: {} },
        sort: {},
      }),
    },
  );
  if (!res.ok) throw new Error(`search ${res.status}`);
  const data = await res.json();
  const rows: any[] = data?.results?.[0]?.results ?? [];
  return rows
    // Sealed JP products belong to the sealed flow, not the card list.
    .filter((p) => p?.sealed !== true)
    .map(mapRow)
    .filter((p): p is JpProduct => p !== null);
}

async function getProduct(pid: string): Promise<JpProduct | null> {
  const res = await fetchWithTimeout(
    `${DETAILS_URL}/${pid}/details`,
    { headers: UA },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`details ${res.status}`);
  return mapRow(await res.json());
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  const pid = url.searchParams.get('pid')?.trim() ?? '';

  try {
    if (pid) {
      if (!/^\d{1,12}$/.test(pid)) return json(400, { error: 'bad pid' }, false);
      const product = await getProduct(pid);
      if (!product) return json(404, { error: 'product not found' });
      return json(200, { product });
    }
    if (q.length < 2 || q.length > 60) {
      return json(400, { error: 'q must be 2-60 chars' }, false);
    }
    const nick = matchNickname(q);
    if (nick) {
      return json(200, {
        products: await nicknameProducts(nick.productIds, nick.residual),
      });
    }
    return json(200, { products: await searchProducts(q) });
  } catch (e) {
    console.error('[jp-search]', e);
    return json(502, { error: 'catalog unavailable' }, false);
  }
}

// Vercel serverless function (Edge runtime) — live TCGPlayer Market
// Price for a single card by Pokemon TCG card id.
//
// Why this exists: the Pokemon TCG API embeds TCGPlayer prices on
// each card payload, but for newly-released sets (e.g. Ascended
// Heroes, ME series) the cache often lags 1–7 days behind TCGPlayer
// itself. When the bundled price is missing, the app falls through to
// this proxy so users see live numbers.
//
// Pipeline:
//   1. GET https://prices.pokemontcg.io/tcgplayer/{cardId}
//      → 302 redirect to https://www.tcgplayer.com/product/{productId}
//   2. Extract productId from the redirect Location header.
//   3. GET https://mp-search-api.tcgplayer.com/v1/product/{productId}/details
//      → JSON containing `marketPrice` and `listings`.
//
// Cached at the edge for 30 minutes — TCGPlayer Market Price is a
// rolling-window number, doesn't move minute-to-minute, and we don't
// want to hammer their endpoint per page render.

export const config = { runtime: 'edge' };

interface TcgDetails {
  marketPrice?: number;
  listings?: number;
  productName?: string;
}

interface PriceResponse {
  productId: string;
  currentPrice: number;
  previousPrice: number;
  percentChange: number;
  averagePrice: number;
  highPrice: number;
  lowPrice: number;
  salesCount: number;
  lastSaleDate: string;
  lastSalePrice: number;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      // 30min CDN cache, 5min stale-while-revalidate. Same Market
      // Price for everyone — no per-user variance — so this is safe.
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=300',
      ...CORS,
    },
  });
}

// fetch with a hard timeout — this is a user-facing endpoint (card
// detail price), so a hung upstream must not pin the request open
// until Vercel's function timeout. 6s is generous for these APIs.
async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  ms = 6000,
): Promise<Response> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function resolveProductId(cardId: string): Promise<string | null> {
  // Don't follow the redirect — read the Location header directly.
  const res = await fetchWithTimeout(
    `https://prices.pokemontcg.io/tcgplayer/${encodeURIComponent(cardId)}`,
    { redirect: 'manual' },
  );
  const location = res.headers.get('location') ?? '';
  const match = location.match(/tcgplayer\.com\/product\/(\d+)/);
  return match ? match[1] : null;
}

async function fetchMarketPrice(productId: string): Promise<TcgDetails | null> {
  const res = await fetchWithTimeout(
    `https://mp-search-api.tcgplayer.com/v1/product/${productId}/details`,
    {
      // Match the user-agent TCGPlayer's own SPA sends so we don't get
      // bot-flagged. No auth required for /details.
      headers: { 'user-agent': 'Mozilla/5.0 (CardPulse Price Proxy)' },
    },
  );
  if (!res.ok) return null;
  return (await res.json()) as TcgDetails;
}

const MAX_BATCH_IDS = 20;

// Batch variant of the single-id pipeline. Per-card failures collapse
// to null rather than failing the whole batch — the watchlist renders
// its fallback price for that row.
async function fetchPriceForCard(cardId: string): Promise<PriceResponse | null> {
  try {
    const productId = await resolveProductId(cardId);
    if (!productId) return null;
    const details = await fetchMarketPrice(productId);
    if (!details?.marketPrice) return null;
    const price = details.marketPrice;
    return {
      productId,
      currentPrice: price,
      previousPrice: price,
      percentChange: 0,
      averagePrice: price,
      highPrice: price,
      lowPrice: price,
      salesCount: details.listings ?? 0,
      lastSaleDate: '',
      lastSalePrice: price,
    };
  } catch {
    return null;
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'GET') return json(405, { error: 'method not allowed' });

  const url = new URL(req.url);

  // Batch path — GET ?ids=a,b,c (max 20). Response shape:
  // { prices: { [cardId]: PriceResponse | null } }. The single-id
  // path below keeps its exact deployed shape.
  const idsParam = url.searchParams.get('ids');
  if (idsParam !== null) {
    const ids = idsParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length === 0) return json(400, { error: 'missing ids' });
    if (ids.length > MAX_BATCH_IDS) {
      return json(400, { error: `too many ids (max ${MAX_BATCH_IDS})` });
    }

    const results = await Promise.all(ids.map(fetchPriceForCard));
    const prices: Record<string, PriceResponse | null> = {};
    ids.forEach((id, i) => {
      prices[id] = results[i];
    });
    return json(200, { prices });
  }

  // `id` is the Pokemon TCG card id (e.g. "me2pt5-277"). We accept the
  // legacy `cardId` query param as a fallback so consumers that hit
  // this from older builds keep working.
  const cardId = url.searchParams.get('id') ?? url.searchParams.get('cardId');
  if (!cardId) return json(400, { error: 'missing id' });

  try {
    const productId = await resolveProductId(cardId);
    if (!productId) return json(404, { error: 'productId not found for card', cardId });

    const details = await fetchMarketPrice(productId);
    if (!details?.marketPrice) {
      return json(404, { error: 'no market price', cardId, productId });
    }

    // The /details endpoint returns marketPrice but not high/low/avg
    // or sales-count — those would need /latestsales which is auth-
    // gated. For now we collapse the rolling Market Price into every
    // numeric slot so the UI renders cleanly. previousPrice is set to
    // the same value (0% change) until we wire history.
    const price = details.marketPrice;
    const body: PriceResponse = {
      productId,
      currentPrice: price,
      previousPrice: price,
      percentChange: 0,
      averagePrice: price,
      highPrice: price,
      lowPrice: price,
      salesCount: details.listings ?? 0,
      lastSaleDate: '',
      lastSalePrice: price,
    };
    return json(200, body);
  } catch (err) {
    // Log the detail server-side (Vercel logs); return a generic
    // message so internal error strings / stack info aren't echoed
    // to clients.
    console.error('[tcgplayer/price] failure:', err);
    return json(500, { error: 'tcgplayer proxy failure' });
  }
}

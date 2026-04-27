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

async function resolveProductId(cardId: string): Promise<string | null> {
  // Don't follow the redirect — read the Location header directly.
  const res = await fetch(`https://prices.pokemontcg.io/tcgplayer/${encodeURIComponent(cardId)}`, {
    redirect: 'manual',
  });
  const location = res.headers.get('location') ?? '';
  const match = location.match(/tcgplayer\.com\/product\/(\d+)/);
  return match ? match[1] : null;
}

async function fetchMarketPrice(productId: string): Promise<TcgDetails | null> {
  const res = await fetch(
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

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'GET') return json(405, { error: 'method not allowed' });

  const url = new URL(req.url);
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
    return json(500, { error: 'tcgplayer proxy failure', detail: String(err) });
  }
}

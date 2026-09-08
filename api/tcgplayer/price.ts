// Vercel serverless function (Edge runtime) — live TCGPlayer Market
// Price for a single card by Pokemon TCG card id.
//
// Why this exists: the Pokemon TCG API embeds TCGPlayer prices on
// each card payload, but for newly-released sets (e.g. Ascended
// Heroes, ME series) the cache often lags 1–7 days behind TCGPlayer
// itself. When the bundled price is missing, the app falls through to
// this proxy so users see live numbers.
//
// The lookup pipeline lives in api/_lib/tcgplayer.ts, shared with the
// daily cron's grading-alert sweep.
//
// Cached at the edge for 30 minutes — TCGPlayer Market Price is a
// rolling-window number, doesn't move minute-to-minute, and we don't
// want to hammer their endpoint per page render.

import {
  fetchMarketPrice,
  fetchPriceForCard,
  priceResponse,
  resolveProductId,
  type PriceResponse,
} from '../_lib/tcgplayer';

export const config = { runtime: 'edge' };

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

const MAX_BATCH_IDS = 20;

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'GET') return json(405, { error: 'method not allowed' });

  const url = new URL(req.url);

  // Batch path — GET ?ids=a,b,c (max 20). Response shape:
  // { prices: { [cardId]: PriceResponse | null } }. Per-card failures
  // collapse to null rather than failing the whole batch — the
  // watchlist renders its fallback price for that row. The single-id
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
    return json(200, priceResponse(productId, details));
  } catch (err) {
    // Log the detail server-side (Vercel logs); return a generic
    // message so internal error strings / stack info aren't echoed
    // to clients.
    console.error('[tcgplayer/price] failure:', err);
    return json(500, { error: 'tcgplayer proxy failure' });
  }
}

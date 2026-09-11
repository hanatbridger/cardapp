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
  priceResponse,
  resolveCardPrice,
  resolveProductId,
  type PriceResponse,
  type TcgDetails,
} from '../_lib/tcgplayer';
import {
  dayKey,
  previousCloses,
  recordTodayCloses,
  type PreviousClose,
} from '../_lib/snapshots';

export const config = { runtime: 'edge' };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// 30min CDN cache, 5min stale-while-revalidate for complete answers —
// same Market Price for everyone, no per-user variance. Any answer that
// carries a miss gets one minute: a miss is usually a transient upstream
// failure, and pinning it for 30 minutes blanked that card for every
// user whose watchlist hashes to the same URL.
const LONG_CACHE = 'public, s-maxage=1800, stale-while-revalidate=300';
const SHORT_CACHE = 'public, s-maxage=60';

function json(status: number, body: unknown, cache: string = LONG_CACHE): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': cache,
      ...CORS,
    },
  });
}

/**
 * Real day-over-day change: previous close from our own daily TCGPlayer
 * series, plus today's point recorded so tomorrow has one. Best-effort —
 * a database hiccup costs the day change, never the price. The response
 * used to hard-code percentChange 0, so every raw card read 0.00%.
 */
async function dailyCloses(
  priced: { cardId: string; productId: string; details: TcgDetails }[],
): Promise<Map<string, PreviousClose>> {
  if (priced.length === 0) return new Map();
  const today = dayKey(Date.now());
  const [prev] = await Promise.all([
    previousCloses(priced.map((p) => p.productId), today).catch(
      () => new Map<string, PreviousClose>(),
    ),
    recordTodayCloses(
      priced.map((p) => ({
        productId: p.productId,
        cardId: p.cardId,
        price: p.details.marketPrice ?? 0,
      })),
      today,
    ).catch(() => {}),
  ]);
  return prev;
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

    const resolved = await Promise.all(ids.map(resolveCardPrice));
    const priced = resolved.flatMap((r, i) => (r ? [{ cardId: ids[i], ...r }] : []));
    const prev = await dailyCloses(priced);
    const prices: Record<string, PriceResponse | null> = {};
    ids.forEach((id, i) => {
      const r = resolved[i];
      prices[id] = r ? priceResponse(r.productId, r.details, prev.get(r.productId)) : null;
    });
    return json(200, { prices }, resolved.every(Boolean) ? LONG_CACHE : SHORT_CACHE);
  }

  // `id` is the Pokemon TCG card id (e.g. "me2pt5-277"). We accept the
  // legacy `cardId` query param as a fallback so consumers that hit
  // this from older builds keep working.
  const cardId = url.searchParams.get('id') ?? url.searchParams.get('cardId');
  if (!cardId) return json(400, { error: 'missing id' });

  try {
    const productId = await resolveProductId(cardId);
    if (!productId) {
      return json(404, { error: 'productId not found for card', cardId }, SHORT_CACHE);
    }

    const details = await fetchMarketPrice(productId);
    if (!details?.marketPrice) {
      return json(404, { error: 'no market price', cardId, productId }, SHORT_CACHE);
    }
    const prev = await dailyCloses([{ cardId, productId, details }]);
    return json(200, priceResponse(productId, details, prev.get(productId)));
  } catch (err) {
    // Log the detail server-side (Vercel logs); return a generic
    // message so internal error strings / stack info aren't echoed
    // to clients.
    console.error('[tcgplayer/price] failure:', err);
    return json(500, { error: 'tcgplayer proxy failure' }, 'no-store');
  }
}

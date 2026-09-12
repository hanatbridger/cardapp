// Vercel Cron — keep JustTCG-priced cards current, in batches.
//
// The single-card price path records a JustTCG close the first time a
// card TCGPlayer does not price is opened. Left there, that close goes
// stale and the day change never moves. This job re-prices every card
// that took the fallback in the last 30 days, one batched request per
// 20 cards (100 on a paid plan — JUSTTCG_BATCH), and records today's
// close. Bounded by MAX_CARDS so a bad day cannot spend the quota the
// live path needs.
//
// Required env: JUSTTCG_API_KEY (else the run is a no-op), CRON_SECRET,
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. Optional: JUSTTCG_BATCH.

import { batchJustTcg, justTcgEnabled } from '../_lib/justtcg';
import { dayKey, recentFallbackCards, recordTodayCloses } from '../_lib/snapshots';

export const config = { runtime: 'edge' };

/** 400 cards is 20 requests on the free plan; well under a 100/day quota. */
const MAX_CARDS = 400;
const LOOKBACK_DAYS = 30;

function timingSafeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export default async function handler(req: Request): Promise<Response> {
  const expected = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization') ?? '';
  if (!expected || !timingSafeEqual(auth, `Bearer ${expected}`)) {
    return new Response('Unauthorized', { status: 401 });
  }
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  if (!justTcgEnabled()) return json({ skipped: 'no JUSTTCG_API_KEY' });

  const today = dayKey(Date.now());
  const cards = await recentFallbackCards('justtcg', LOOKBACK_DAYS, MAX_CARDS);
  if (cards.length === 0) return json({ refreshed: 0, candidates: 0 });

  // A numeric key is a TCGPlayer product id; 'jt:<uuid>' is JustTCG's own.
  const items = cards.map((c) =>
    c.productId.startsWith('jt:') ? { cardId: c.productId.slice(3) } : { tcgplayerId: c.productId },
  );
  const chunk = Math.max(1, Math.min(100, Number(process.env.JUSTTCG_BATCH ?? 20) || 20));
  const prices = await batchJustTcg(items, chunk);

  const points = cards.flatMap((c) => {
    const hit = prices.get(c.productId.startsWith('jt:') ? c.productId.slice(3) : c.productId);
    return hit ? [{ productId: c.productId, cardId: c.cardId, price: hit.price }] : [];
  });
  await recordTodayCloses(points, today, 'justtcg');

  return json({ candidates: cards.length, refreshed: points.length, chunk });
}

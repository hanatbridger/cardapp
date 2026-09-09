// Vercel serverless function (Edge runtime) — CardPulse market index.
//
// Request:  GET /api/market-index
// Response: { asOf, basketSize, windows: { d1, d7, d30 } }
//           each window: { changePct, basket, from } | null
//
// A matched-basket, equal-dollar index over the ~1,900 modern cards the
// daily cron snapshots into public.price_snapshots. Both ends of every
// comparison use the SAME set of products: composition drift (a card
// entering or leaving the leaderboard) would otherwise read as a market
// move. Only source='collectrics' rows are used — mixing in the
// tcgplayer self-enrollment rows would compare two different price
// bases for the same product across days.
//
// Computed from our own table, not a third-party market endpoint, so
// the index survives any upstream access change.

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

/** A day needs this many snapshots to anchor the index. */
const MIN_ANCHOR_ROWS = 800;
/** A window needs this many products on BOTH days to be reported. */
const MIN_MATCHED = 400;
/** Today's cron may not have landed; walk back this far for an anchor. */
const MAX_ANCHOR_LOOKBACK = 6;
const DAY_MS = 86400000;
/** PostgREST hard-caps a response at 1000 rows. */
const PAGE_SIZE = 1000;
/** Bounds the per-day cost; the basket is ~1,900 products. */
const MAX_PAGES = 4;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function json(status: number, body: unknown, cacheable = true): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      // 6h: the source cron runs once a day.
      'Cache-Control': cacheable
        ? 'public, s-maxage=21600, stale-while-revalidate=43200'
        : 'no-store',
      ...CORS,
    },
  });
}

interface Row {
  product_id: string;
  raw_price: number;
}

export interface IndexWindow {
  /** Percent change over the window (1.2 = +1.2%) */
  changePct: number;
  /** Products priced on both days */
  basket: number;
  /** Comparison date actually used */
  from: string;
}

export interface MarketIndexResponse {
  /** Latest date with full coverage — every window ends here */
  asOf: string | null;
  basketSize: number;
  windows: {
    d1: IndexWindow | null;
    d7: IndexWindow | null;
    d30: IndexWindow | null;
  };
}

function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS')
    return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'GET') return json(405, { error: 'method not allowed' }, false);

  const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY =
    process.env.SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return json(500, { error: 'Server misconfigured' }, false);
  }
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  /** product_id -> price for one snapshot day (collectrics rows only). */
  const dayCache = new Map<string, Map<string, number>>();
  async function fetchDay(date: string): Promise<Map<string, number>> {
    const cached = dayCache.get(date);
    if (cached) return cached;
    const out = new Map<string, number>();
    // PostgREST caps a response at 1000 rows, so page — and ORDER BY
    // product_id, or each day returns a different arbitrary slice and
    // the matched basket silently shrinks and skews.
    for (let page = 0; page < MAX_PAGES; page++) {
      const from = page * PAGE_SIZE;
      const { data, error } = await sb
        .from('price_snapshots')
        .select('product_id, raw_price')
        .eq('snapshot_date', date)
        .eq('source', 'collectrics')
        .order('product_id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error || !data) break;
      for (const r of data as Row[]) {
        const p = Number(r.raw_price);
        if (Number.isFinite(p) && p > 0) out.set(r.product_id, p);
      }
      if (data.length < PAGE_SIZE) break;
    }
    dayCache.set(date, out);
    return out;
  }

  try {
    // 1. Anchor on the most recent day the cron actually filled.
    const todayMs = Date.parse(dayKey(Date.now()));
    let anchorMs = 0;
    let anchor: Map<string, number> | null = null;
    for (let i = 0; i <= MAX_ANCHOR_LOOKBACK; i++) {
      const ms = todayMs - i * DAY_MS;
      const day = await fetchDay(dayKey(ms));
      if (day.size >= MIN_ANCHOR_ROWS) {
        anchorMs = ms;
        anchor = day;
        break;
      }
    }
    if (!anchor) {
      return json(200, { asOf: null, basketSize: 0, windows: { d1: null, d7: null, d30: null } }, false);
    }

    // 2. Matched-basket change for each window. One day of slack absorbs
    //    a missed cron run on the comparison date.
    async function windowChange(days: number): Promise<IndexWindow | null> {
      for (const offset of [days, days + 1]) {
        const from = dayKey(anchorMs - offset * DAY_MS);
        const prev = await fetchDay(from);
        if (prev.size === 0) continue;
        let now = 0;
        let then = 0;
        let basket = 0;
        for (const [id, price] of anchor!) {
          const before = prev.get(id);
          if (before === undefined) continue;
          now += price;
          then += before;
          basket++;
        }
        if (basket >= MIN_MATCHED && then > 0) {
          return {
            changePct: Math.round(((now - then) / then) * 10000) / 100,
            basket,
            from,
          };
        }
      }
      return null;
    }

    const [d1, d7, d30] = await Promise.all([
      windowChange(1),
      windowChange(7),
      windowChange(30),
    ]);

    return json(200, {
      asOf: dayKey(anchorMs),
      basketSize: anchor.size,
      windows: { d1, d7, d30 },
    } satisfies MarketIndexResponse);
  } catch {
    return json(502, { error: 'index unavailable' }, false);
  }
}

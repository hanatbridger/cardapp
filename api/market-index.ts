// Vercel serverless function (Edge runtime) — CardPulse market trends.
//
// Request:  GET /api/market-index
// Response: { card: IndexSeries | null, sealed: IndexSeries | null }
//           IndexSeries: { asOf, basketSize, windows: { d1, d7, d30 } }
//
// Two matched-basket, equal-dollar indices. Both ends of every
// comparison use the SAME set of products: composition drift (a product
// entering or leaving the source list) would otherwise read as a market
// move.
//
//   card   — the ~1,800 singles our daily cron snapshots into
//            public.price_snapshots. Computed from our own table, so it
//            survives any upstream access change. Only source
//            'collectrics' rows are used; mixing in the tcgplayer
//            self-enrollment rows would compare two different price
//            bases for the same product across days.
//   sealed — the sealed leaderboard's 30-day per-product sparklines.
//            Our cron only ingests singles, so there is no local sealed
//            history to read yet.

import { createClient } from '@supabase/supabase-js';
import { fetchWithTimeout } from './_lib/http';

export const config = { runtime: 'edge' };

/** A day needs this many card snapshots to anchor the index. */
const MIN_CARD_ANCHOR = 800;
/** A card window needs this many products on BOTH days. */
const MIN_CARD_MATCHED = 400;
/** Sealed is a 410-product universe, so both bars sit lower. */
const MIN_SEALED_ANCHOR = 100;
const MIN_SEALED_MATCHED = 60;
/** Today's cron may not have landed; walk back this far for an anchor. */
const MAX_ANCHOR_LOOKBACK = 6;
const DAY_MS = 86400000;
/** PostgREST hard-caps a response at 1000 rows. */
const PAGE_SIZE = 1000;
/** Bounds the per-day cost; the card basket is ~1,900 products. */
const MAX_PAGES = 4;

const SEALED_URL = 'https://mycollectrics.com/api/sealed_leaderboard';
const UA = { 'user-agent': 'Mozilla/5.0 (CardPulse Index Proxy)' };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function json(status: number, body: unknown, cacheable = true): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      // 6h: both sources refresh once a day.
      'Cache-Control': cacheable
        ? 'public, s-maxage=21600, stale-while-revalidate=43200'
        : 'no-store',
      ...CORS,
    },
  });
}

export interface IndexWindow {
  /** Percent change over the window (1.2 = +1.2%) */
  changePct: number;
  /** Products priced on both days */
  basket: number;
  /** Comparison date actually used */
  from: string;
}

export interface IndexSeries {
  /** Latest date with full coverage — every window ends here */
  asOf: string;
  basketSize: number;
  windows: {
    d1: IndexWindow | null;
    d7: IndexWindow | null;
    d30: IndexWindow | null;
  };
}

export interface MarketIndexResponse {
  card: IndexSeries | null;
  sealed: IndexSeries | null;
}

function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Matched-basket percent change between two priced days. Offsets are
 * tried in order so a missed source day falls back to its neighbour.
 */
function buildSeries(
  anchorDate: string,
  anchor: Map<string, number>,
  dayFor: (date: string) => Map<string, number> | undefined,
  minMatched: number,
): IndexSeries {
  const anchorMs = Date.parse(anchorDate);
  const windowChange = (days: number): IndexWindow | null => {
    for (const offset of [days, days + 1, days - 1]) {
      if (offset <= 0) continue;
      const from = dayKey(anchorMs - offset * DAY_MS);
      const prev = dayFor(from);
      if (!prev || prev.size === 0) continue;
      let now = 0;
      let then = 0;
      let basket = 0;
      for (const [id, price] of anchor) {
        const before = prev.get(id);
        if (before === undefined) continue;
        now += price;
        then += before;
        basket++;
      }
      if (basket >= minMatched && then > 0) {
        return {
          changePct: Math.round(((now - then) / then) * 10000) / 100,
          basket,
          from,
        };
      }
    }
    return null;
  };

  return {
    asOf: anchorDate,
    basketSize: anchor.size,
    windows: { d1: windowChange(1), d7: windowChange(7), d30: windowChange(30) },
  };
}

/** Singles index, read from our own snapshot table. */
async function cardSeries(
  supabaseUrl: string,
  supabaseKey: string,
): Promise<IndexSeries | null> {
  const sb = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const cache = new Map<string, Map<string, number>>();
  const fetchDay = async (date: string): Promise<Map<string, number>> => {
    const hit = cache.get(date);
    if (hit) return hit;
    const out = new Map<string, number>();
    // Page, and ORDER BY product_id — without an explicit order each day
    // returns a different arbitrary 1000-row slice and the matched
    // basket silently shrinks and skews.
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
      for (const r of data as { product_id: string; raw_price: number }[]) {
        const p = Number(r.raw_price);
        if (Number.isFinite(p) && p > 0) out.set(r.product_id, p);
      }
      if (data.length < PAGE_SIZE) break;
    }
    cache.set(date, out);
    return out;
  };

  const todayMs = Date.parse(dayKey(Date.now()));
  for (let i = 0; i <= MAX_ANCHOR_LOOKBACK; i++) {
    const date = dayKey(todayMs - i * DAY_MS);
    const day = await fetchDay(date);
    if (day.size >= MIN_CARD_ANCHOR) {
      // Warm the comparison days before building (buildSeries is sync).
      const anchorMs = Date.parse(date);
      for (const n of [1, 2, 7, 8, 6, 30, 31, 29]) {
        await fetchDay(dayKey(anchorMs - n * DAY_MS));
      }
      return buildSeries(date, day, (d) => cache.get(d), MIN_CARD_MATCHED);
    }
  }
  return null;
}

interface SealedRow {
  id: string;
  sparkline?: { 'raw-price'?: { date: string; value: number }[] };
}

/** Sealed index, from the leaderboard's per-product 30-day sparklines. */
async function sealedSeries(): Promise<IndexSeries | null> {
  const res = await fetchWithTimeout(SEALED_URL, { headers: UA }, 8000);
  if (!res.ok) return null;
  const data = (await res.json()) as { 'rows-global'?: SealedRow[] };
  const rows = data['rows-global'] ?? [];
  if (rows.length === 0) return null;

  const byDate = new Map<string, Map<string, number>>();
  for (const row of rows) {
    for (const point of row.sparkline?.['raw-price'] ?? []) {
      const price = Number(point.value);
      if (!Number.isFinite(price) || price <= 0) continue;
      let day = byDate.get(point.date);
      if (!day) {
        day = new Map();
        byDate.set(point.date, day);
      }
      day.set(row.id, price);
    }
  }

  const anchorDate = [...byDate.keys()]
    .filter((d) => (byDate.get(d)?.size ?? 0) >= MIN_SEALED_ANCHOR)
    .sort()
    .pop();
  if (!anchorDate) return null;

  return buildSeries(
    anchorDate,
    byDate.get(anchorDate)!,
    (d) => byDate.get(d),
    MIN_SEALED_MATCHED,
  );
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
  // One side failing must not blank the other — the strip renders
  // whichever index resolved.
  const [card, sealed] = await Promise.all([
    cardSeries(SUPABASE_URL, SUPABASE_ANON_KEY).catch(() => null),
    sealedSeries().catch(() => null),
  ]);

  if (!card && !sealed) return json(200, { card: null, sealed: null }, false);
  return json(200, { card, sealed } satisfies MarketIndexResponse);
}

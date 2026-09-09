// Vercel serverless function (Edge runtime) — CardPulse market trends.
//
// Request:  GET /api/market-index
// Response: { market, card, sealed } — each IndexSeries | null
//           IndexSeries: { asOf, basketSize, windows: { d1, d7, d30 } }
//
// Three matched-basket, equal-dollar indices. Both ends of every
// comparison use the SAME set of products: composition drift (a product
// entering or leaving the source list) would otherwise read as a market
// move. All three share one anchor date so the row is internally
// comparable.
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
//   market — both baskets summed, i.e. value-weighted across everything
//            we track. Null unless both sides resolve: a "market" that
//            is secretly just one side would read as a real number.

import { createClient } from '@supabase/supabase-js';
import { fetchWithTimeout } from './_lib/http';

export const config = { runtime: 'edge' };

/** A day needs this many card snapshots to anchor the index. */
const MIN_CARD_ANCHOR = 800;
/** A card window needs this many products on BOTH days. */
const MIN_CARD_MATCHED = 400;
/** Sealed is a ~410-product universe, so both bars sit lower. */
const MIN_SEALED_ANCHOR = 100;
const MIN_SEALED_MATCHED = 60;
/** Today's cron may not have landed; walk back this far for an anchor. */
const MAX_ANCHOR_LOOKBACK = 8;
const DAY_MS = 86400000;
/** PostgREST hard-caps a response at 1000 rows. */
const PAGE_SIZE = 1000;
/** Bounds the per-day cost; the card basket is ~1,900 products. */
const MAX_PAGES = 4;
/** Comparison days each window probes, in order. */
const WINDOW_DAYS = [1, 7, 30];

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
  /** Latest date with coverage — every window ends here */
  asOf: string;
  basketSize: number;
  windows: {
    d1: IndexWindow | null;
    d7: IndexWindow | null;
    d30: IndexWindow | null;
  };
}

export interface MarketIndexResponse {
  market: IndexSeries | null;
  card: IndexSeries | null;
  sealed: IndexSeries | null;
}

type DayMap = Map<string, number>;

function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Matched-basket percent change between two priced days. Offsets are
 * tried in order so a missing source day falls back to a neighbour.
 */
function buildSeries(
  anchorDate: string,
  anchor: DayMap,
  dayFor: (date: string) => DayMap | undefined,
  minMatched: number,
): IndexSeries {
  const anchorMs = Date.parse(anchorDate);
  const windowChange = (days: number): IndexWindow | null => {
    // A 30-point sparkline cannot reach a true 30-day offset from an
    // anchor two days inside it, so probe outward a little. The window
    // it actually used is reported in `from`.
    for (const offset of [days, days + 1, days - 1, days + 2, days - 2]) {
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
    windows: {
      d1: windowChange(1),
      d7: windowChange(7),
      d30: windowChange(30),
    },
  };
}

/** date -> (sealed product id -> price), from the leaderboard sparklines. */
async function loadSealedDays(): Promise<Map<string, DayMap>> {
  const byDate = new Map<string, DayMap>();
  const res = await fetchWithTimeout(SEALED_URL, { headers: UA }, 8000);
  if (!res.ok) return byDate;
  const data = (await res.json()) as {
    'rows-global'?: {
      id: string;
      sparkline?: { 'raw-price'?: { date: string; value: number }[] };
    }[];
  };
  for (const row of data['rows-global'] ?? []) {
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
  return byDate;
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

  const cardCache = new Map<string, DayMap>();
  const loadCardDay = async (date: string): Promise<DayMap> => {
    const hit = cardCache.get(date);
    if (hit) return hit;
    const out: DayMap = new Map();
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
    cardCache.set(date, out);
    return out;
  };

  try {
    const sealedDays = await loadSealedDays().catch(() => new Map<string, DayMap>());

    // One anchor for all three series, so the row compares like for
    // like. Prefer a day both sides cover; fall back to the newest day
    // the cards alone cover.
    const todayMs = Date.parse(dayKey(Date.now()));
    let anchorDate: string | null = null;
    let cardOnlyAnchor: string | null = null;
    for (let i = 0; i <= MAX_ANCHOR_LOOKBACK; i++) {
      const date = dayKey(todayMs - i * DAY_MS);
      const cardDay = await loadCardDay(date);
      const cardOk = cardDay.size >= MIN_CARD_ANCHOR;
      const sealedOk = (sealedDays.get(date)?.size ?? 0) >= MIN_SEALED_ANCHOR;
      if (cardOk && !cardOnlyAnchor) cardOnlyAnchor = date;
      if (cardOk && sealedOk) {
        anchorDate = date;
        break;
      }
    }
    const anchor = anchorDate ?? cardOnlyAnchor;
    if (!anchor) {
      return json(200, { market: null, card: null, sealed: null }, false);
    }

    // Warm every comparison day the windows can probe.
    const anchorMs = Date.parse(anchor);
    await Promise.all(
      WINDOW_DAYS.flatMap((n) => [n - 1, n, n + 1])
        .filter((n) => n > 0)
        .map((n) => loadCardDay(dayKey(anchorMs - n * DAY_MS))),
    );

    const cardAnchor = cardCache.get(anchor) ?? new Map();
    const sealedAnchor = sealedDays.get(anchor);

    const card = cardAnchor.size
      ? buildSeries(anchor, cardAnchor, (d) => cardCache.get(d), MIN_CARD_MATCHED)
      : null;
    const sealed = sealedAnchor?.size
      ? buildSeries(anchor, sealedAnchor, (d) => sealedDays.get(d), MIN_SEALED_MATCHED)
      : null;

    // Value-weighted total. Ids are namespaced because a card
    // product_id and a sealed id are both bare numbers and would
    // otherwise collide in the merged basket.
    const mergedFor = (date: string): DayMap => {
      const m: DayMap = new Map();
      const c = cardCache.get(date);
      if (c) for (const [id, price] of c) m.set(`c:${id}`, price);
      const s = sealedDays.get(date);
      if (s) for (const [id, price] of s) m.set(`s:${id}`, price);
      return m;
    };
    let market: IndexSeries | null = null;
    if (card && sealed) {
      market = buildSeries(
        anchor,
        mergedFor(anchor),
        mergedFor,
        MIN_CARD_MATCHED + MIN_SEALED_MATCHED,
      );
      // A merged window whose comparison day only has cards silently
      // becomes the card index under a "market" label. Drop any window
      // either side cannot cover on its own.
      for (const key of ['d1', 'd7', 'd30'] as const) {
        if (!card.windows[key] || !sealed.windows[key]) market.windows[key] = null;
      }
      if (!market.windows.d1 && !market.windows.d7 && !market.windows.d30) {
        market = null;
      }
    }

    return json(200, { market, card, sealed } satisfies MarketIndexResponse);
  } catch {
    return json(502, { error: 'index unavailable' }, false);
  }
}

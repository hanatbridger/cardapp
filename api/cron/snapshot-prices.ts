// Vercel Cron — daily price-snapshot job for the historical chart.
//
// Schedule (vercel.json): 14:00 UTC daily.
//
// Flow:
//   1. Vercel hits this endpoint with `Authorization: Bearer ${CRON_SECRET}`
//   2. We fetch mycollectrics.com/api/card_leaderboard (same upstream the
//      user-facing /api/trending uses) for the FULL list.
//   3. Each card's `sparkline.ungraded-price` is a ~30-day daily series,
//      so we expand every row into one snapshot per day and upsert them
//      into public.price_snapshots ON CONFLICT (product_id, snapshot_date,
//      source) DO NOTHING. A single successful run therefore BACKFILLS a
//      full ~30-day chart instead of accumulating one point per day over
//      a month. Cards without a sparkline fall back to a single
//      today's-price row.
//   4. card_id is resolved lazily — we store product_id always, and map
//      card_id on demand at chart fetch time (api/tcgplayer/history.ts).
//
// To populate immediately after first deploy, trigger it manually:
//   curl -H "Authorization: Bearer $CRON_SECRET" \
//     https://<deployment>/api/cron/snapshot-prices
//
// Required env (Vercel project):
//   SUPABASE_URL                — same one used elsewhere
//   SUPABASE_SERVICE_ROLE_KEY   — bypasses RLS for the writes
//   CRON_SECRET                 — random string, also referenced in
//                                 vercel.json's `crons` block; Vercel
//                                 injects this into the Authorization
//                                 header on each cron invocation.

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

interface SparklinePoint {
  date: string; // YYYY-MM-DD
  value: number;
}

interface CollectricsRow {
  id: string;
  'product-name': string;
  'set-name': string;
  'image-url': string;
  'raw-price'?: number;
  'dod-change-pct'?: number;
  'baseline-change-pct'?: number;
  // The leaderboard ships a ~30-day daily history per card. This is what
  // lets us build real charts immediately instead of waiting 30 days for
  // a once-a-day snapshot to accumulate.
  sparkline?: {
    'ungraded-price'?: SparklinePoint[];
  };
}

interface SnapshotRow {
  product_id: string;
  card_id: string | null;
  snapshot_date: string;
  raw_price: number;
  dod_change_pct: number | null;
  baseline_change_pct: number | null;
  source: 'collectrics';
}

function extractProductId(url: string): string | null {
  // Same regex as api/trending.ts — image URL format
  // https://tcgplayer-cdn.tcgplayer.com/product/{productId}_in_1000x1000.jpg
  const m = url.match(/\/product\/(\d+)_/);
  return m ? m[1] : null;
}

// Length-independent constant-time string compare — avoids leaking
// the secret's length or a prefix-match position via response timing.
function timingSafeEqual(a: string, b: string): boolean {
  // XOR the longer length in so mismatched lengths still do constant
  // work relative to the longer string and never short-circuit.
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export default async function handler(req: Request): Promise<Response> {
  // Vercel injects Authorization: Bearer ${CRON_SECRET} on every cron
  // invocation when CRON_SECRET is set in the project env. Reject any
  // request without it so randos can't trigger ingest. Constant-time
  // compare so the secret can't be recovered via timing.
  const expected = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization') ?? '';
  if (!expected || !timingSafeEqual(auth, `Bearer ${expected}`)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: 'Server misconfigured' }),
      { status: 500 },
    );
  }

  // 1. Fetch full leaderboard
  let rows: CollectricsRow[] = [];
  try {
    const res = await fetch(
      'https://mycollectrics.com/api/card_leaderboard',
      { headers: { 'user-agent': 'CardPulse Snapshot Cron' } },
    );
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Upstream ${res.status}` }),
        { status: 502 },
      );
    }
    const data = await res.json();
    rows = Array.isArray(data?.rows) ? data.rows : [];
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Upstream fetch failed', detail: String(err) }),
      { status: 502 },
    );
  }

  // 2. Map rows → snapshot inserts. Each card's `sparkline.ungraded-price`
  // is a ~30-day daily series; we emit one snapshot per point so a single
  // run backfills a full chart. Cards without a sparkline fall back to a
  // single row from today's raw-price (the old behaviour) so they're not
  // dropped. card_id stays null — resolved lazily at chart-fetch time
  // (api/tcgplayer/history.ts). dod/baseline aren't carried per historical
  // day; the chart only needs date + price.
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD in UTC
  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
  const snapshots: SnapshotRow[] = [];

  for (const r of rows) {
    const product_id = extractProductId(r['image-url'] ?? '');
    if (!product_id) continue;

    const series = r.sparkline?.['ungraded-price'];
    if (Array.isArray(series) && series.length > 0) {
      for (const p of series) {
        if (
          p &&
          typeof p.value === 'number' &&
          p.value > 0 &&
          typeof p.date === 'string' &&
          ISO_DATE.test(p.date)
        ) {
          snapshots.push({
            product_id,
            card_id: null,
            snapshot_date: p.date,
            raw_price: p.value,
            dod_change_pct: null,
            baseline_change_pct: null,
            source: 'collectrics',
          });
        }
      }
      continue;
    }

    // Fallback: no sparkline — record today's price only.
    const raw_price = r['raw-price'];
    if (typeof raw_price === 'number' && raw_price > 0) {
      snapshots.push({
        product_id,
        card_id: null,
        snapshot_date: today,
        raw_price,
        dod_change_pct:
          typeof r['dod-change-pct'] === 'number' ? r['dod-change-pct'] * 100 : null,
        baseline_change_pct:
          typeof r['baseline-change-pct'] === 'number'
            ? r['baseline-change-pct'] * 100
            : null,
        source: 'collectrics',
      });
    }
  }

  if (snapshots.length === 0) {
    return new Response(
      JSON.stringify({ inserted: 0, note: 'No snapshottable rows' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // 3. Insert in chunks. ignoreDuplicates:true makes the job resumable
  // and cheap: the first run inserts the whole ~30-day backfill (~50k
  // rows); if it times out, the next run skips what already landed and
  // continues. Subsequent daily runs only insert each card's newest day.
  // Historical sparkline values are stable, so not re-updating them is
  // fine. Larger chunks keep the request count (and wall-clock) low so we
  // stay inside the edge time budget.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const CHUNK = 1000;
  let processed = 0;
  for (let i = 0; i < snapshots.length; i += CHUNK) {
    const chunk = snapshots.slice(i, i + CHUNK);
    const { error } = await admin
      .from('price_snapshots')
      .upsert(chunk, {
        onConflict: 'product_id,snapshot_date,source',
        ignoreDuplicates: true,
      });
    if (error) {
      return new Response(
        JSON.stringify({
          error: 'Upsert failed',
          chunk_start: i,
          processed,
          detail: error.message,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }
    processed += chunk.length;
  }

  return new Response(
    JSON.stringify({
      run_date: today,
      cards: rows.length,
      snapshot_rows: snapshots.length,
      processed,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

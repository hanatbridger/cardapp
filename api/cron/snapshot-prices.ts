// Vercel Cron — daily price-snapshot job for the historical chart.
//
// Schedule (vercel.json): 14:00 UTC daily.
//
// Flow:
//   1. Vercel hits this endpoint with `Authorization: Bearer ${CRON_SECRET}`
//   2. We re-fetch mycollectrics.com/api/card_leaderboard (same upstream
//      the user-facing /api/trending uses) but for the FULL list, not
//      just movers — every row becomes a snapshot.
//   3. Each row is upserted into public.price_snapshots with
//      ON CONFLICT (product_id, snapshot_date, source) DO UPDATE — so a
//      manual retry within the same UTC day is idempotent.
//   4. Resolver pass for cardId happens lazily — we store product_id
//      always, and resolve card_id on demand at chart fetch time
//      (api/tcgplayer/history.ts). This keeps the cron fast and lets
//      late-published Pokemon TCG API entries catch up without a
//      reingest.
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

interface CollectricsRow {
  id: string;
  'product-name': string;
  'set-name': string;
  'image-url': string;
  'raw-price'?: number;
  'dod-change-pct'?: number;
  'baseline-change-pct'?: number;
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

  // 2. Map rows → snapshot inserts. Keep ONLY rows with a usable
  // product_id + raw_price. Everything else (missing image, no price)
  // is junk for our purposes.
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD in UTC
  const snapshots: SnapshotRow[] = rows
    .map((r): SnapshotRow | null => {
      const product_id = extractProductId(r['image-url'] ?? '');
      const raw_price = r['raw-price'];
      if (!product_id || typeof raw_price !== 'number' || raw_price <= 0) {
        return null;
      }
      return {
        product_id,
        card_id: null, // resolved lazily in api/tcgplayer/history
        snapshot_date: today,
        raw_price,
        dod_change_pct:
          typeof r['dod-change-pct'] === 'number'
            ? r['dod-change-pct'] * 100
            : null,
        baseline_change_pct:
          typeof r['baseline-change-pct'] === 'number'
            ? r['baseline-change-pct'] * 100
            : null,
        source: 'collectrics',
      };
    })
    .filter((s): s is SnapshotRow => s !== null);

  if (snapshots.length === 0) {
    return new Response(
      JSON.stringify({ inserted: 0, note: 'No snapshottable rows' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // 3. Upsert. Batch in chunks to avoid hitting payload limits on
  // large leaderboards (~2-3k rows on a busy day).
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const CHUNK = 500;
  let inserted = 0;
  for (let i = 0; i < snapshots.length; i += CHUNK) {
    const chunk = snapshots.slice(i, i + CHUNK);
    const { error } = await admin
      .from('price_snapshots')
      .upsert(chunk, {
        onConflict: 'product_id,snapshot_date,source',
        ignoreDuplicates: false,
      });
    if (error) {
      return new Response(
        JSON.stringify({
          error: 'Upsert failed',
          chunk_start: i,
          detail: error.message,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }
    inserted += chunk.length;
  }

  return new Response(
    JSON.stringify({
      snapshot_date: today,
      total_rows: rows.length,
      inserted,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

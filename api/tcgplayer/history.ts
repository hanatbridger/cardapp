// Vercel serverless function (Edge runtime) — historical price series
// for a single card.
//
// Request:
//   GET /api/tcgplayer/history?id=<pokemonTcgCardId>
//   GET /api/tcgplayer/history?productId=<tcgPlayerProductId>  (alt)
//
// Response:
//   { history: [{ date: "2026-05-17", price: 4.99 }, ...] }  — ordered by date asc
//
// Data comes from the public.price_snapshots table, populated by the
// daily cron at api/cron/snapshot-prices.ts. Empty array when we have
// no snapshots for this card yet — the client renders a "Building
// history" placeholder instead of the chart in that case.
//
// Two lookup paths:
//   1. By cardId (Pokemon TCG id like "sv8pt5-64"). Most common — the
//      card detail screen routes via this id. We first look up the
//      product_id mapping from any existing snapshot with that card_id,
//      then query all snapshots for that product_id (since cron
//      doesn't always know the card_id yet, but every row stores
//      product_id).
//   2. By productId directly. Used as a fallback when the client has
//      the TCGPlayer productId but no resolved cardId.
//
// Lazy card_id resolution: when querying by cardId and we find
// snapshots that have product_id but null card_id, we'll opportunistically
// backfill the card_id column so the cardId→snapshots lookup becomes
// O(1) on subsequent requests. Same Pokemon TCG API call already used
// by api/trending.ts. Skipped if no snapshots are found (nothing to
// backfill against).

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

interface SnapshotRow {
  product_id: string;
  card_id: string | null;
  snapshot_date: string;
  raw_price: number;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      // 1h CDN cache, 1h SWR. History updates once a day via cron, so
      // an hourly cache lets the chart feel fresh without hammering
      // Supabase on every detail-screen open.
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600',
      ...CORS,
    },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS')
    return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'GET')
    return json(405, { error: 'method not allowed' });

  const url = new URL(req.url);
  const cardId = url.searchParams.get('id');
  const productIdParam = url.searchParams.get('productId');

  if (!cardId && !productIdParam) {
    return json(400, { error: 'id or productId required' });
  }

  // Env var name compatibility: SUPABASE_ANON_KEY for server-only
  // use; EXPO_PUBLIC_SUPABASE_ANON_KEY is the same value but named
  // for the client bundle. Either works here since this is server.
  const SUPABASE_URL =
    process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY =
    process.env.SUPABASE_ANON_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return json(500, { error: 'Server misconfigured' });
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Resolve to a product_id. If we were given a cardId, look up
  // any snapshot with that card_id to get the mapped product_id.
  // If none exist yet, the card_id column is still null on every
  // snapshot — query by name+set via Pokemon TCG API (next step).
  let productId: string | null = productIdParam;
  if (!productId && cardId) {
    const { data: byCard } = await sb
      .from('price_snapshots')
      .select('product_id')
      .eq('card_id', cardId)
      .limit(1);

    if (byCard && byCard.length > 0) {
      productId = byCard[0].product_id;
    }
  }

  // Whether productId was resolved through the TRUSTED Pokemon TCG API
  // path below (step 2). Only then is the cardId↔productId pairing
  // confirmed by a source we control — which gates the service-role
  // backfill in step 4. A caller-supplied ?productId= paired with an
  // arbitrary ?id= is NOT trusted: without this gate, an attacker
  // could stamp any cardId onto a product's snapshot rows, making a
  // real card's chart resolve to (and serve) a different card's price
  // history to every user.
  let confirmedViaApi = false;

  // 2. If still no productId resolved AND we have a cardId, look up
  // Pokemon TCG API → get the tcgplayer URL → extract productId →
  // find snapshots with that productId. This handles the cold-start
  // case where the cron has stored snapshots with NULL card_id and
  // we need to map a cardId to one.
  if (!productId && cardId) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 2500);
      const res = await fetch(
        `https://api.pokemontcg.io/v2/cards/${encodeURIComponent(cardId)}`,
        {
          headers: { 'user-agent': 'CardPulse History Resolver' },
          signal: ctl.signal,
        },
      );
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        const tcgUrl: string | undefined = data?.data?.tcgplayer?.url;
        // tcgplayer.url looks like https://prices.pokemontcg.io/tcgplayer/<id>
        // which 302-redirects to a /product/{productId} page — but
        // the more useful path: Pokemon TCG API also exposes the
        // product url directly. Match either pattern.
        const m =
          tcgUrl?.match(/\/product\/(\d+)/) ??
          tcgUrl?.match(/tcgplayer\/(.+)$/);
        if (m) {
          // If we extracted a Pokemon TCG id-style suffix (not a numeric
          // productId), we still don't have the productId — bail.
          if (/^\d+$/.test(m[1])) {
            productId = m[1];
            confirmedViaApi = true;
          }
        }
      }
    } catch {
      // Resolver miss is fine — we'll return empty below.
    }
  }

  if (!productId) {
    return json(200, { history: [] });
  }

  // 3. Fetch every snapshot for that product_id, ordered by date.
  const { data: snapshots, error } = await sb
    .from('price_snapshots')
    .select('product_id, card_id, snapshot_date, raw_price')
    .eq('product_id', productId)
    .order('snapshot_date', { ascending: true });

  if (error) {
    console.error('[tcgplayer/history] DB query failed:', error.message);
    return json(500, { error: 'DB query failed' });
  }

  // 4. Opportunistic backfill: stamp the cardId onto this product's
  // null-card_id rows so future lookups skip the Pokemon TCG API
  // round-trip. ONLY when the mapping was confirmed by the trusted API
  // path (confirmedViaApi) — never on a caller-supplied productId,
  // which would let an unauthenticated request poison the mapping.
  // Awaited rather than fire-and-forget: on Edge the function may be
  // frozen right after the response returns, dropping a floating
  // promise; since this now runs only on genuine cold-start
  // resolution it's rare, so the few ms is acceptable for a write
  // that actually lands.
  if (confirmedViaApi && cardId && snapshots && snapshots.length > 0) {
    const needsBackfill = snapshots.some((s: SnapshotRow) => s.card_id === null);
    if (needsBackfill) {
      // Use service-role for the UPDATE since RLS blocks anon writes.
      // Falls through silently if service-role isn't available.
      const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (SERVICE_ROLE_KEY) {
        const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        try {
          await admin
            .from('price_snapshots')
            .update({ card_id: cardId })
            .eq('product_id', productId)
            .is('card_id', null);
        } catch {
          // Best-effort optimization — never fail the response over it.
        }
      }
    }
  }

  return json(200, {
    history: (snapshots ?? []).map((s: SnapshotRow) => ({
      date: s.snapshot_date,
      price: Number(s.raw_price),
    })),
  });
}

// Daily TCGPlayer price points in price_snapshots (source 'tcgplayer'),
// used by /api/tcgplayer/price for a real day-over-day change.
//
// The live price comes from mp-search-api /details. The daily point this
// module records is that same number, so "previous close vs now" compares
// one series with itself. It never mixes in the collectrics rows (a
// different price) — comparing across sources would show the spread
// between two feeds as a daily move.

import { createClient } from '@supabase/supabase-js';

const DAY_MS = 24 * 60 * 60 * 1000;
/** A previous close older than this is not a "1D" comparison. */
const MAX_PREVIOUS_AGE_DAYS = 3;

export interface PreviousClose {
  date: string;
  price: number;
}

export function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function supabaseUrl(): string | undefined {
  return process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
}

/** Latest recorded point before `today` per product, within 3 days. */
export async function previousCloses(
  productIds: string[],
  today: string,
): Promise<Map<string, PreviousClose>> {
  const out = new Map<string, PreviousClose>();
  const url = supabaseUrl();
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const ids = [...new Set(productIds)];
  if (!url || !key || ids.length === 0) return out;

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const since = dayKey(Date.parse(today) - MAX_PREVIOUS_AGE_DAYS * DAY_MS);
  // ≤ 20 products x ≤ 3 days, far under PostgREST's 1000-row cap.
  const { data, error } = await sb
    .from('price_snapshots')
    .select('product_id, snapshot_date, raw_price')
    .in('product_id', ids)
    .eq('source', 'tcgplayer')
    .lt('snapshot_date', today)
    .gte('snapshot_date', since)
    .order('snapshot_date', { ascending: false });
  if (error) throw new Error(`previous closes: ${error.message}`);
  for (const row of (data ?? []) as { product_id: string; snapshot_date: string; raw_price: number }[]) {
    const price = Number(row.raw_price);
    if (!out.has(row.product_id) && Number.isFinite(price) && price > 0) {
      out.set(row.product_id, { date: row.snapshot_date, price });
    }
  }
  return out;
}

/**
 * Record today's live price as the day's point, first observation wins
 * (ignoreDuplicates), so every watched card builds a daily series from
 * Home loads rather than only from chart opens. Prices come from
 * TCGPlayer, never from the caller; card ids are the ones TCGPlayer's
 * own redirect resolved.
 */
export async function recordTodayCloses(
  points: { productId: string; cardId: string; price: number }[],
  today: string,
): Promise<void> {
  const url = supabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const valid = points.filter((p) => Number.isFinite(p.price) && p.price > 0);
  if (!url || !serviceKey || valid.length === 0) return;

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await admin.from('price_snapshots').upsert(
    valid.map((p) => ({
      product_id: p.productId,
      card_id: p.cardId,
      snapshot_date: today,
      raw_price: p.price,
      source: 'tcgplayer',
    })),
    { onConflict: 'product_id,snapshot_date,source', ignoreDuplicates: true },
  );
  if (error) throw new Error(`record closes: ${error.message}`);
}

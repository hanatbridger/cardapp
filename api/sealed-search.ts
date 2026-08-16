// Vercel serverless function (Edge runtime) — sealed-product search
// proxied from mycollectrics.com's anonymous search API.
//
// Why a proxy: their API sends no CORS headers (same reason
// api/card-stats.ts exists). Rows are trimmed from ~30 fields to the 5
// the client renders, and the CDN cache absorbs repeat queries.
//
// Sealed detection: search rows carry NO sealed flag (only the
// /api/card/{id} payload has "sealed-product": "Y"). Verified
// empirically: sealed rows are exactly the ones with null card-number
// AND null rarity-name — every single, including basic energies and
// promos, carries both fields.

export const config = { runtime: 'edge' };

interface SealedSearchHit {
  /** Collectrics internal id — client routes these as `cx-{cid}` */
  cid: number;
  name: string;
  setName: string;
  imageUrl: string;
  /** Latest raw (sealed) market price, USD */
  price: number;
}

const UPSTREAM = 'https://mycollectrics.com/api';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(status: number, body: unknown, cacheable = true): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      // Upstream refreshes daily; 6h CDN cache + a day of
      // stale-while-revalidate keeps upstream load near zero.
      'Cache-Control': cacheable
        ? 'public, s-maxage=21600, stale-while-revalidate=86400'
        : 'no-store',
      ...CORS,
    },
  });
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  ms = 6000,
): Promise<Response> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(timer);
  }
}

const UA = { 'user-agent': 'Mozilla/5.0 (CardPulse Sealed Proxy)' };

/**
 * Upstream set names are prefixed "Pokemon " ("Pokemon Paldea Evolved").
 * Strip it — but only when a real name remains, so "Pokemon GO" style
 * sets don't collapse to a two-letter fragment.
 */
function cleanSetName(raw: string): string {
  const stripped = raw.replace(/^pokemon\s+/i, '');
  return stripped.length > 2 ? stripped : raw;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2 || q.length > 60) {
    return json(400, { error: 'q must be 2-60 chars' }, false);
  }

  try {
    const res = await fetchWithTimeout(
      `${UPSTREAM}/search/cards?q=${encodeURIComponent(q)}&limit=24`,
      { headers: UA },
    );
    if (!res.ok) throw new Error(`search ${res.status}`);
    const data = await res.json();
    const rows: any[] = Array.isArray(data?.results) ? data.results : [];

    const products: SealedSearchHit[] = [];
    for (const r of rows) {
      if (r?.['card-number'] != null || r?.['rarity-name'] != null) continue;
      const cid = Number(r?.id);
      const name = String(r?.['product-name'] ?? '').trim();
      const price = r?.['raw-price'];
      if (!Number.isFinite(cid) || cid <= 0 || !name) continue;
      if (typeof price !== 'number' || !isFinite(price) || price <= 0) continue;
      products.push({
        cid,
        name,
        setName: cleanSetName(String(r?.['set-name'] ?? '').trim()),
        imageUrl: String(r?.['image-url'] ?? ''),
        price,
      });
    }
    return json(200, { products });
  } catch (e) {
    console.error('[sealed-search]', e);
    return json(502, { error: 'search unavailable' }, false);
  }
}

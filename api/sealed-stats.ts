// Vercel serverless function (Edge runtime) — sealed-product price +
// daily price history, proxied from mycollectrics.com's anonymous card
// API (same upstream api/card-stats.ts uses for singles).
//
// The upstream payload is ~240KB per product; we trim it to the current
// price, ~200 days of daily raw-price rows, and the product metadata the
// detail screen needs when the item isn't in the local mock catalog
// (name / set / image). 6h edge cache — upstream updates daily.

export const config = { runtime: 'edge' };

interface PricePoint {
  date: string;
  price: number;
}

interface SealedStatsResponse {
  /** Latest raw (sealed) market price, USD — null if untracked */
  price: number | null;
  /** Daily prices, oldest → newest, nulls dropped */
  history: PricePoint[];
  name: string;
  setName: string;
  imageUrl: string;
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

/** Same prefix-strip as api/sealed-search.ts. */
function cleanSetName(raw: string): string {
  const stripped = raw.replace(/^pokemon\s+/i, '');
  return stripped.length > 2 ? stripped : raw;
}

function buildStats(card: any): SealedStatsResponse {
  const rows: any[] = Array.isArray(card?.history) ? card.history : [];
  const history: PricePoint[] = rows
    .filter(
      (r) =>
        r?.date != null &&
        typeof r?.['raw-price'] === 'number' &&
        isFinite(r['raw-price']),
    )
    .map((r) => ({ date: String(r.date), price: r['raw-price'] as number }))
    // Upstream is already ascending; sort defensively — the chart
    // assumes oldest → newest.
    .sort((a, b) => a.date.localeCompare(b.date));

  // Top-level raw-price is null for sealed products — the live number
  // lives in the pricing-movement block, with the last history row as
  // backstop.
  const latest = card?.collectrics?.['pricing-movement']?.raw?.['latest-price'];
  const price =
    typeof latest === 'number' && isFinite(latest)
      ? latest
      : history.length > 0
        ? history[history.length - 1].price
        : null;

  return {
    price,
    history,
    name: String(card?.['product-name'] ?? '').trim(),
    setName: cleanSetName(String(card?.['set-name'] ?? '').trim()),
    imageUrl: String(card?.['image-url'] ?? ''),
  };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  const url = new URL(req.url);
  const cid = url.searchParams.get('cid')?.trim() ?? '';
  if (!/^\d{1,12}$/.test(cid)) {
    return json(400, { error: 'numeric cid required' }, false);
  }

  try {
    const res = await fetchWithTimeout(`${UPSTREAM}/card/${cid}`, {
      headers: UA,
    });
    if (res.status === 404) {
      // Cacheable: untracked ids stay untracked for at least a day.
      return json(404, { error: 'product not tracked' });
    }
    if (!res.ok) throw new Error(`card ${res.status}`);
    const card = await res.json();
    return json(200, buildStats(card));
  } catch (e) {
    console.error('[sealed-stats]', e);
    return json(502, { error: 'stats unavailable' }, false);
  }
}

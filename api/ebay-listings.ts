// Vercel serverless function (Edge runtime) — ACTIVE eBay listings for
// one card, via the official Browse API.
//
// Request:
//   GET /api/ebay-listings?name=<card name>&number=<card number>
//        [&set=<set name>][&lang=EN|JP][&grade=raw|psa10]
//
// Response (200):
//   {
//     grade: 'raw' | 'psa10',
//     count: number,           // listings that passed the card/condition checks
//     low: number | null,      // lowest asking price, USD
//     median: number | null,   // median asking price, USD
//     listings: [{ title, price, url, condition, image }]  // cheapest 5
//   }
//
// These are ASKING prices on live listings, not sold prices — the client
// must label them that way. Sold comps need the Marketplace Insights
// scope, which this keyset does not have. The old Finding API path
// (findCompletedItems) was decommissioned by eBay and is gone.
//
// Filtering is done on eBay's own `condition` field ('Ungraded' vs
// 'Graded') rather than keyword negation: "-PSA -CGC" still let an
// ACE 10 slab through as a "raw" result. The title must also carry the
// card number so a name-only match can't pull a different printing.
//
// 30-minute CDN cache: listings churn, and the Browse quota is 5K/day.

export const config = { runtime: 'edge' };

const TOKEN_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
const BROWSE_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search';
const CCG_SINGLES_CATEGORY = '183454';

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
        ? 'public, s-maxage=1800, stale-while-revalidate=3600'
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

// Client-credentials token, cached per isolate. eBay issues 2h tokens;
// refresh with a 5-minute margin.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken(appId: string, certId: string): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - now > 5 * 60 * 1000) {
    return cachedToken.value;
  }
  const res = await fetchWithTimeout(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${appId}:${certId}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
  });
  if (!res.ok) throw new Error(`token ${res.status}`);
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error('token missing');
  cachedToken = {
    value: data.access_token,
    expiresAt: now + (data.expires_in ?? 7200) * 1000,
  };
  return cachedToken.value;
}

interface BrowseItem {
  title?: string;
  price?: { value?: string; currency?: string };
  itemWebUrl?: string;
  condition?: string;
  image?: { imageUrl?: string };
}

/** "201" must appear as its own token — "1201" or "20/1" don't count. */
function titleHasNumber(title: string, number: string): boolean {
  const n = number.replace(/^0+(?=\d)/, '');
  if (!n) return true;
  const esc = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^0-9a-z])0*${esc}(?![0-9])`, 'i').test(title);
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS')
    return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'GET')
    return json(405, { error: 'method not allowed' }, false);

  const url = new URL(req.url);
  const name = (url.searchParams.get('name') ?? '').trim();
  const number = (url.searchParams.get('number') ?? '').trim();
  const setName = (url.searchParams.get('set') ?? '').trim();
  const lang = url.searchParams.get('lang') === 'JP' ? 'JP' : 'EN';
  const grade = url.searchParams.get('grade') === 'psa10' ? 'psa10' : 'raw';
  if (!name || !number) return json(400, { error: 'name and number required' }, false);

  const appId = process.env.EBAY_APP_ID;
  const certId = process.env.EBAY_CERT_ID;
  if (!appId || !certId) return json(500, { error: 'Server misconfigured' }, false);

  // Loose keyword query — quoting every term collapsed results to a
  // handful; the title/condition checks below do the precision work.
  const terms = [name, number];
  if (setName) terms.push(setName);
  terms.push('pokemon');
  terms.push(lang === 'JP' ? 'japanese' : '-japanese');
  if (grade === 'psa10') terms.push('PSA 10');
  const q = terms.join(' ');

  try {
    const token = await getToken(appId, certId);
    const params = new URLSearchParams({
      q,
      category_ids: CCG_SINGLES_CATEGORY,
      limit: '50',
      filter: 'buyingOptions:{FIXED_PRICE|AUCTION},priceCurrency:USD',
    });
    const res = await fetchWithTimeout(`${BROWSE_URL}?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      },
    });
    if (!res.ok) return json(502, { error: `browse ${res.status}` }, false);
    const data = (await res.json()) as { itemSummaries?: BrowseItem[] };

    const wantCondition = grade === 'psa10' ? 'Graded' : 'Ungraded';
    const psa10Re = /\bPSA\s*10\b/i;
    const items = (data.itemSummaries ?? [])
      .filter((it) => {
        const title = it.title ?? '';
        const price = Number(it.price?.value);
        if (!Number.isFinite(price) || price <= 0) return false;
        if (it.price?.currency !== 'USD') return false;
        if (it.condition !== wantCondition) return false;
        if (!titleHasNumber(title, number)) return false;
        if (grade === 'psa10' && !psa10Re.test(title)) return false;
        return true;
      })
      .map((it) => ({
        title: it.title ?? '',
        price: Math.round(Number(it.price!.value) * 100) / 100,
        url: it.itemWebUrl ?? '',
        condition: it.condition ?? '',
        image: it.image?.imageUrl ?? '',
      }))
      .sort((a, b) => a.price - b.price);

    const prices = items.map((i) => i.price);
    const median =
      prices.length === 0
        ? null
        : prices.length % 2
          ? prices[(prices.length - 1) / 2]
          : (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2;

    return json(200, {
      grade,
      count: items.length,
      low: prices[0] ?? null,
      median,
      listings: items.slice(0, 5),
    });
  } catch (e) {
    return json(502, { error: 'ebay upstream failure' }, false);
  }
}

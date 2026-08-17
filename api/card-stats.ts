// Vercel serverless function (Edge runtime) — real per-card eBay market
// stats (active/new/sold listing flow, demand pressure, supply
// saturation) plus daily sold-price aggregates, proxied from
// mycollectrics.com's anonymous card API.
//
// Why a proxy: their API sends no CORS headers (same reason
// api/trending.ts exists), and the upstream payload is ~240KB per card —
// we trim it to ~1KB and let the CDN cache absorb repeat views. Upstream
// data updates daily, so a 6h edge cache keeps our request volume to a
// handful per card per day across ALL users.
//
// Pipeline:
//   1. GET /api/search/cards?q={name} {number} → collectrics card id
//      (their ids are internal; name+number search is the only bridge
//      from Pokemon TCG API ids).
//   2. GET /api/card/{id} → trim to dynamics + daily sold aggregates
//      + PSA 10 graded price series/population.

export const config = { runtime: 'edge' };

interface DailySales {
  date: string;
  /** Raw (ungraded) listings that ended sold-ish that day */
  count: number;
  /** Outlier-adjusted average raw sold price, USD */
  avgPrice: number;
}

interface Dynamics {
  activeListings7d: number;
  activeListings30d: number;
  newPerDay7d: number;
  newPerDay30d: number;
  soldPerDay7d: number;
  soldPerDay30d: number;
  /** Percent — sold/active pressure, 7d window */
  demandPressure: number;
  /** Index — <1 tightening, >1 loosening */
  supplySaturation: number;
}

interface Psa10Stats {
  /** Latest PSA 10 sold price, USD */
  latestPrice: number;
  /** Day-over-day change, in percent (1.2 = +1.2%) */
  percentChange: number;
  /** Daily PSA 10 prices, oldest → newest */
  history: { date: string; price: number }[];
  /** Latest PSA population snapshot; gemPct in percent */
  pop: { psa10: number; total: number; gemPct: number } | null;
}

interface StatsResponse {
  dynamics: Dynamics | null;
  sales: DailySales[];
  psa10: Psa10Stats | null;
  asOf: string | null;
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

const UA = { 'user-agent': 'Mozilla/5.0 (CardPulse Stats Proxy)' };

/** Strip leading zeros so "052" matches "52" and vice versa. */
function normNumber(n: string): string {
  return n.replace(/^0+(?=\d)/, '').toLowerCase();
}

async function resolveCollectricsId(
  name: string,
  number: string,
): Promise<number | null> {
  const q = encodeURIComponent(`${name} ${number}`);
  const res = await fetchWithTimeout(
    `${UPSTREAM}/search/cards?q=${q}&limit=8`,
    { headers: UA },
  );
  if (!res.ok) throw new Error(`search ${res.status}`);
  const data = await res.json();
  const rows: any[] = data?.results ?? data?.cards ?? data ?? [];
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const wantNum = normNumber(number);
  const firstToken = name.split(/\s+/)[0]?.toLowerCase() ?? '';
  // The number must match — name search alone happily returns other
  // printings, and wrong-card stats are worse than none.
  const hit = rows.find((r) => {
    const rNum = normNumber(String(r?.['card-number'] ?? ''));
    const rName = String(r?.['product-name'] ?? '').toLowerCase();
    return rNum === wantNum && (!firstToken || rName.includes(firstToken));
  });
  return hit?.id ?? null;
}

function avg(nums: number[]): number | null {
  const vals = nums.filter((n) => typeof n === 'number' && isFinite(n));
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function buildStats(card: any): StatsResponse {
  const mp = card?.collectrics?.['market-pressure']?.observed;
  const d7 = mp?.['7d'];
  const d30 = mp?.['30d'];
  const baseline = mp?.['baseline-comparison'];
  const market: any[] = Array.isArray(card?.['history-ebay-market'])
    ? card['history-ebay-market']
    : [];
  const ebay: any[] = Array.isArray(card?.['history-ebay'])
    ? card['history-ebay']
    : [];

  const soldSeries = market
    .filter((r) => !r?.interpolated)
    .map((r) => r?.['sold-est'])
    .filter((n) => typeof n === 'number');
  const sold7 = avg(soldSeries.slice(-7));
  const sold30 = avg(soldSeries.slice(-30));

  let dynamics: Dynamics | null = null;
  const active7 = d7?.raw?.['avg-active'];
  const active30 = d30?.raw?.['avg-active'];
  const pressure = d7?.metrics?.['demand-pressure'];
  const saturation = baseline?.['supply-saturation-index'];
  if (
    typeof active7 === 'number' &&
    typeof active30 === 'number' &&
    typeof pressure === 'number' &&
    typeof saturation === 'number' &&
    sold7 !== null &&
    sold30 !== null
  ) {
    dynamics = {
      activeListings7d: active7,
      activeListings30d: active30,
      newPerDay7d: d7?.raw?.['avg-new'] ?? 0,
      newPerDay30d: d30?.raw?.['avg-new'] ?? 0,
      soldPerDay7d: sold7,
      soldPerDay30d: sold30,
      demandPressure: pressure * 100,
      supplySaturation: saturation,
    };
  }

  const sales: DailySales[] = ebay
    .filter(
      (r) =>
        !r?.interpolated &&
        typeof r?.['ended-raw'] === 'number' &&
        r['ended-raw'] > 0 &&
        typeof (r?.['ended-avg-raw-price-adj'] ?? r?.['ended-avg-raw-price']) ===
          'number',
    )
    .slice(-8)
    .reverse()
    .map((r) => ({
      date: String(r.date),
      count: r['ended-raw'],
      avgPrice: r['ended-avg-raw-price-adj'] ?? r['ended-avg-raw-price'],
    }));

  return { dynamics, sales, psa10: buildPsa10(card), asOf: d7?.['as-of'] ?? null };
}

function buildPsa10(card: any): Psa10Stats | null {
  const rows: any[] = Array.isArray(card?.history) ? card.history : [];
  const history = rows
    .filter(
      (r) =>
        r?.date != null &&
        typeof r?.['psa-10-price'] === 'number' &&
        isFinite(r['psa-10-price']),
    )
    .map((r) => ({ date: String(r.date), price: r['psa-10-price'] as number }))
    // Upstream is already ascending; sort defensively since the chart
    // assumes oldest → newest.
    .sort((a, b) => a.date.localeCompare(b.date));
  if (history.length === 0) return null;

  const pm10 = card?.collectrics?.['pricing-movement']?.['psa-10'];
  const movementLatest = pm10?.['latest-price'];
  const latestPrice =
    typeof movementLatest === 'number' && isFinite(movementLatest)
      ? movementLatest
      : history[history.length - 1].price;

  // Upstream dod-change-pct is a fraction (0.012 = 1.2%).
  const dodPct = pm10?.['dod-change-pct'];
  let percentChange: number | null =
    typeof dodPct === 'number' && isFinite(dodPct) ? dodPct * 100 : null;
  if (percentChange === null && history.length >= 2) {
    const prev = history[history.length - 2].price;
    percentChange = prev !== 0 ? ((latestPrice - prev) / prev) * 100 : 0;
  }

  const popRows: any[] = (Array.isArray(card?.['history-psa'])
    ? [...card['history-psa']]
    : []
  ).sort((a, b) => String(a?.date ?? '').localeCompare(String(b?.date ?? '')));
  const lastPop = popRows[popRows.length - 1];
  const pop10 = lastPop?.['10-base'];
  const popTotal = lastPop?.['total-base'];
  let pop: Psa10Stats['pop'] = null;
  if (
    typeof pop10 === 'number' &&
    isFinite(pop10) &&
    typeof popTotal === 'number' &&
    isFinite(popTotal)
  ) {
    // gem-pct is a fraction (0.607 = 60.7%); derive from counts if absent.
    const gemFrac = lastPop?.['gem-pct'];
    const gemPct =
      typeof gemFrac === 'number' && isFinite(gemFrac)
        ? gemFrac * 100
        : popTotal > 0
          ? (pop10 / popTotal) * 100
          : 0;
    // One decimal is all the UI shows; also strips float noise
    // (0.28 * 100 = 28.000000000000004).
    pop = { psa10: pop10, total: popTotal, gemPct: Math.round(gemPct * 10) / 10 };
  }

  return {
    latestPrice,
    percentChange: percentChange ?? 0,
    history,
    pop,
  };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  const url = new URL(req.url);
  const name = url.searchParams.get('name')?.trim() ?? '';
  const number = url.searchParams.get('number')?.trim() ?? '';
  if (!name || name.length > 80 || !number || number.length > 12) {
    return json(400, { error: 'name and number required' }, false);
  }

  try {
    const id = await resolveCollectricsId(name, number);
    if (id === null) {
      // Cacheable: unmapped cards stay unmapped for at least a day.
      return json(404, { error: 'card not tracked' });
    }
    const res = await fetchWithTimeout(`${UPSTREAM}/card/${id}`, {
      headers: UA,
    });
    if (!res.ok) throw new Error(`card ${res.status}`);
    const card = await res.json();
    return json(200, buildStats(card));
  } catch (e) {
    console.error('[card-stats]', e);
    return json(502, { error: 'stats unavailable' }, false);
  }
}

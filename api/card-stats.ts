// Vercel serverless function (Edge runtime) — real per-card eBay market
// stats (active/new/sold listing flow, demand pressure, supply
// saturation) plus daily sold-price aggregates and PSA 10 graded
// prices/population, proxied from mycollectrics.com's anonymous card
// API. Lookup + trimming live in api/_lib/collectrics.ts, shared with
// the daily cron's grading-alert sweep.
//
// Why a proxy: their API sends no CORS headers (same reason
// api/trending.ts exists), and the upstream payload is ~240KB per card —
// we trim it to ~1KB and let the CDN cache absorb repeat views. Upstream
// data updates daily, so a 6h edge cache keeps our request volume to a
// handful per card per day across ALL users.

import {
  buildStats,
  fetchCollectricsCard,
  resolveCollectricsId,
} from './_lib/collectrics';

export const config = { runtime: 'edge' };

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
    return json(200, buildStats(await fetchCollectricsCard(id)));
  } catch (e) {
    console.error('[card-stats]', e);
    return json(502, { error: 'stats unavailable' }, false);
  }
}

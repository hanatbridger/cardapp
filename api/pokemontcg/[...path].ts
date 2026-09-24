// Vercel serverless function (Edge runtime) — transparent, edge-cached
// proxy for the Pokemon TCG API (api.pokemontcg.io/v2), which is the
// app's card and set catalog.
//
// Why this exists:
//   1. Upstream load-sheds. Measured 2026-09-23: six identical keyed
//      /v2/cards requests returned four 200s and two 500/502. The client
//      already retries twice (tcgFetch in src/services/pokemon-tcg.ts)
//      and that is not enough — during a bad spell a rarity filter whose
//      request loses the dice roll renders an empty card grid.
//   2. Every phone paid the full upstream round trip (~0.3-1.4s
//      observed). One edge cache entry now serves every user.
//   3. api.pokemontcg.io sends no CORS headers, so the web build could
//      not call it at all (same reason api/card-stats.ts exists).
//   4. The API key stops shipping inside the client bundle — it is read
//      from the Vercel project env here instead.
//
// Routes (path passthrough, catch-all so the query string survives
// verbatim — it carries Lucene queries full of quotes and spaces):
//   GET /api/pokemontcg/cards?q=...   → /v2/cards?q=...
//   GET /api/pokemontcg/cards/{id}    → /v2/cards/{id}
//   GET /api/pokemontcg/sets?q=...    → /v2/sets?q=...
//   GET /api/pokemontcg/sets/{id}     → /v2/sets/{id}
// Anything else is 400. This is not an open relay onto the upstream API.

import { fetchWithTimeout } from '../_lib/http';

export const config = { runtime: 'edge' };

const UPSTREAM = 'https://api.pokemontcg.io/v2';

const PREFIX = '/api/pokemontcg/';

/**
 * Exactly the endpoints src/services/pokemon-tcg.ts builds: the two
 * collections plus a single id each. Ids are [A-Za-z0-9._-]
 * ("sv8pt5-161", "sv3pt5") and contain no slashes, so this also rules
 * out path traversal and any deeper upstream route.
 */
const ALLOWED_PATH = /^(?:cards|sets)(?:\/[A-Za-z0-9][A-Za-z0-9._-]{0,47})?$/;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * 6h CDN cache, 7d stale-while-revalidate.
 *
 * s-maxage 21600 matches the other catalog proxies. Card payloads embed
 * TCGPlayer prices that refresh roughly daily upstream, so 6h stays
 * fresh enough while collapsing every user's repeat set/search view into
 * four upstream calls per URL per day.
 *
 * stale-while-revalidate 604800 is the outage shield, and the reason it
 * is a week rather than a day. Vercel's CDN has no `stale-if-error`, so
 * a long SWR window is the mechanism: past 6h the edge still answers
 * instantly from cache and revalidates in the background, and because
 * every error response below is `no-store` a load-shed 5xx cannot
 * overwrite the good entry. Card and set data barely moves (new sets
 * arrive a few times a year), so the worst case is a week-old page
 * missing one just-released set — better than an empty grid.
 */
const CACHE_HIT = 'public, s-maxage=21600, stale-while-revalidate=604800';

/** Proxy-generated error. Never cached — a blip must not outlive itself. */
function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...CORS,
    },
  });
}

// Same reasoning as tcgFetch in src/services/pokemon-tcg.ts: two quick
// retries on 5xx and on network failure convert a ~40% per-request
// failure rate into roughly 6%. Sub-500 is an answer (a 404, a malformed
// Lucene query), not a blip, so it is returned untouched.
//
// Budget: 3 attempts x 3s plus 1s of backoff = 10s worst case,
// deliberately under the client's 12s abort (DEFAULT_FETCH_TIMEOUT_MS in
// src/services/api-client.ts) so a slow round trip still lands as a real
// response instead of a client timeout that throws the work away and
// leaves the edge cache empty.
const RETRY_DELAYS_MS = [250, 750];
const ATTEMPT_TIMEOUT_MS = 3000;

async function fetchUpstream(url: string): Promise<Response | null> {
  // Server-side only: the key lives in the Vercel project env, is never
  // logged, and is never echoed back to the client.
  const key = process.env.EXPO_PUBLIC_POKEMONTCG_API_KEY;
  const headers: Record<string, string> = {
    'user-agent': 'CardPulse Catalog Proxy',
    ...(key ? { 'X-Api-Key': key } : {}),
  };

  let last: Response | null = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const res = await fetchWithTimeout(url, { headers }, ATTEMPT_TIMEOUT_MS);
      if (res.status < 500) return res;
      last = res;
    } catch {
      // Timeout or network failure — retries on the same schedule, and
      // the caller turns an exhausted loop into a 502.
      last = null;
    }
    if (attempt < RETRY_DELAYS_MS.length) {
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
    }
  }
  return last;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'GET') return jsonError(405, 'method not allowed');

  const url = new URL(req.url);
  if (!url.pathname.startsWith(PREFIX)) return jsonError(400, 'unsupported path');
  const path = url.pathname.slice(PREFIX.length);
  if (!ALLOWED_PATH.test(path)) return jsonError(400, 'unsupported path');

  // url.search goes through verbatim. The WHATWG URL parser leaves
  // existing percent-encoding alone, so the client's Lucene query
  // (q=name%3A%22charizard*%22+supertype%3A%22Pok%C3%A9mon%22) reaches
  // upstream byte-identical. Rebuilding it through URLSearchParams risks
  // changing what the query means.
  const upstream = await fetchUpstream(`${UPSTREAM}/${path}${url.search}`);

  if (upstream === null || upstream.status >= 500) {
    console.error('[pokemontcg]', path, upstream?.status ?? 'network failure');
    return jsonError(502, 'catalog unavailable');
  }

  // The body passes through as text, unparsed: the proxy has to be
  // transparent so mapCard/mapSet in src/services/pokemon-tcg.ts see
  // exactly the payload they see today. Upstream 4xx bodies (its own
  // { error: { message, code } } shape) pass through as well — only the
  // proxy's own failures use the { error: string } convention above.
  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: {
      'Content-Type': 'application/json',
      // Only a 200 is cached. A 404 or a 400 can also be upstream having
      // a bad moment, and a cached error outlives the blip that made it.
      'Cache-Control': upstream.status === 200 ? CACHE_HIT : 'no-store',
      ...CORS,
    },
  });
}

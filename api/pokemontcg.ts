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
//   2. Every phone paid the full upstream round trip (~0.3-1.4s for a
//      text search, 2.8-6.1s for a 250-row set page). One edge cache
//      entry now serves every user.
//   3. api.pokemontcg.io sends no CORS headers, so the web build could
//      not call it at all (same reason api/card-stats.ts exists).
//   4. The API key stops shipping inside the client bundle — it is read
//      from the Vercel project env here instead.
//
// Routes — one flat endpoint, the upstream route chosen by `resource`
// and `id` rather than by path segments:
//   GET /api/pokemontcg?resource=cards&q=...        → /v2/cards?q=...
//   GET /api/pokemontcg?resource=cards&id=sv3pt5-1  → /v2/cards/sv3pt5-1
//   GET /api/pokemontcg?resource=sets&q=...         → /v2/sets?q=...
//   GET /api/pokemontcg?resource=sets&id=sv3pt5     → /v2/sets/sv3pt5
// Anything else is 400 — resource, id and every other parameter are
// checked against what the app actually builds. This is not an open
// relay onto the upstream API.
//
// Flat rather than a catch-all file: on Vercel a nested catch-all
// ([...path].ts) 404s for a two-segment request like /cards/{id}, and it
// injects the matched segments back as a `path` query parameter, which
// then fails this handler's own query allowlist. Both were observed on
// the 2026-09-23 deployment. One static route has neither problem.

import { fetchWithTimeout } from './_lib/http';

export const config = { runtime: 'edge' };

const UPSTREAM = 'https://api.pokemontcg.io/v2';

/** The only two upstream collections the app reads. */
const ALLOWED_RESOURCES = new Set(['cards', 'sets']);

/**
 * Card and set ids as upstream issues them ("sv8pt5-161", "sv3pt5").
 * No slashes and no dots-only, so this rules out path traversal and any
 * deeper upstream route. Tested against the DECODED id, so one carrying
 * a character that percent-encodes (a space from a mistyped deep link)
 * is judged on what it is rather than on its `%` escapes.
 */
const ALLOWED_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,47}$/;

/**
 * Query allowlist — every parameter src/services/pokemon-tcg.ts sends,
 * and nothing else.
 *
 * Why validate at all when the path is already locked down: this endpoint
 * is unauthenticated with `Access-Control-Allow-Origin: *`, and Vercel
 * keys the CDN entry on the full URL. Every distinct query string is
 * therefore a guaranteed cache miss that costs an upstream call under our
 * API key, so bounding the key space bounds what a stranger can make us
 * fetch. Same reasoning as the name/number caps in api/card-stats.ts.
 *
 * Validation reads the parsed params but never rebuilds them: the handler
 * still forwards `url.search` byte-for-byte.
 */
const ALLOWED_PARAMS = new Set(['resource', 'id', 'q', 'page', 'pageSize', 'orderBy', 'select']);

/** Ours to route on; everything else is forwarded upstream verbatim. */
const ROUTING_PARAMS = new Set(['resource', 'id']);

function isBoundedInt(value: string, min: number, max: number): boolean {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max;
}

/** Returns a reason to reject, or null when the query is acceptable. */
function rejectReason(params: URLSearchParams): string | null {
  for (const name of Array.from(params.keys())) {
    if (!ALLOWED_PARAMS.has(name)) return 'unsupported query parameter';
  }
  const q = params.get('q');
  // 512 is ~4x the longest query the app builds (a wildcard name term
  // plus supertype, rarity and set.id); no card name is longer.
  if (q !== null && q.length > 512) return 'query too long';
  const page = params.get('page');
  if (page !== null && !isBoundedInt(page, 1, 1000)) return 'page out of range';
  const pageSize = params.get('pageSize');
  // 250 is the upstream maximum and what set-detail screens request.
  if (pageSize !== null && !isBoundedInt(pageSize, 1, 250)) return 'pageSize out of range';
  const orderBy = params.get('orderBy');
  if (orderBy !== null && orderBy.length > 64) return 'orderBy too long';
  const select = params.get('select');
  if (select !== null && select.length > 256) return 'select too long';
  return null;
}

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

// Same reasoning as tcgFetch in src/services/pokemon-tcg.ts: quick
// retries on 5xx and on network failure convert a ~33% per-request
// failure rate into a few percent. Sub-500 is an answer (a 404, a
// malformed Lucene query), not a blip, so it is returned untouched.
//
// Timeout sizing is set by the SLOWEST real call, not the fastest.
// Measured 2026-09-23, keyed, 250-row set pages with the app's `select`
// projection: 2.8s / 3.0s / 4.6s / 6.1s, interleaved with 500s that came
// back in 0.2-0.7s. So upstream either fails fast or answers slowly —
// which means a short attempt timeout does not shed load, it only aborts
// requests that were about to succeed. 8s clears the slowest observation
// with margin.
//
// Retries are then bounded by a wall-clock budget instead of a fixed
// attempt count, because the two failure modes cost wildly different
// amounts of time. Fast 500s leave room for all three attempts (~8s
// total, worst case dominated by one slow success); a genuinely hung
// upstream burns 8s per attempt and simply gets fewer. Either way the
// proxy answers within TOTAL_BUDGET_MS — inside Vercel's 25s Edge
// initial-response limit, and well inside the client's 25s abort
// (CATALOG_TIMEOUT_MS in src/services/pokemon-tcg.ts) so a slow round
// trip still lands as a real response and populates the edge cache
// instead of being thrown away by a client timeout.
const RETRY_DELAYS_MS = [400, 800];
const ATTEMPT_TIMEOUT_MS = 8000;
const TOTAL_BUDGET_MS = 20000;
/** Below this much remaining budget a retry cannot plausibly finish. */
const MIN_ATTEMPT_MS = 3000;

async function fetchUpstream(url: string): Promise<Response | null> {
  // Server-side only: the key lives in the Vercel project env, is never
  // logged, and is never echoed back to the client.
  const key = process.env.EXPO_PUBLIC_POKEMONTCG_API_KEY;
  const headers: Record<string, string> = {
    'user-agent': 'CardPulse Catalog Proxy',
    ...(key ? { 'X-Api-Key': key } : {}),
  };

  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let last: Response | null = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const remaining = deadline - Date.now();
    if (attempt > 0 && remaining < MIN_ATTEMPT_MS) break;
    try {
      const timeout = Math.min(ATTEMPT_TIMEOUT_MS, remaining);
      const res = await fetchWithTimeout(url, { headers }, timeout);
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

  // One try/catch around everything, like api/card-stats.ts: an upstream
  // that load-sheds can also drop the connection mid-body, and
  // upstream.text() rejects when it does. Escaping that rejection would
  // hand back Vercel's own 500 — no CORS headers, so dev-web sees an
  // opaque CORS failure, and no Cache-Control.
  try {
    const url = new URL(req.url);

    const resource = url.searchParams.get('resource');
    if (resource === null || !ALLOWED_RESOURCES.has(resource)) {
      return jsonError(400, 'unsupported resource');
    }
    const id = url.searchParams.get('id');
    if (id !== null && !ALLOWED_ID.test(id)) return jsonError(400, 'unsupported id');

    const reason = rejectReason(url.searchParams);
    if (reason !== null) return jsonError(400, reason);

    // The forwarded query is the client's own search string with the two
    // routing parameters cut out — sliced from the raw string rather than
    // rebuilt through URLSearchParams, so the Lucene query
    // (q=name%3A%22charizard*%22+supertype%3A%22Pok%C3%A9mon%22) reaches
    // upstream byte-identical. Re-encoding it risks changing what it means.
    const forwarded = url.search
      .slice(1)
      .split('&')
      .filter((pair) => pair && !ROUTING_PARAMS.has(decodeURIComponent(pair.split('=')[0])))
      .join('&');
    const path = id === null ? resource : `${resource}/${encodeURIComponent(id)}`;
    const upstream = await fetchUpstream(`${UPSTREAM}/${path}${forwarded ? `?${forwarded}` : ''}`);

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

    // Forward the upstream content type rather than asserting JSON, and
    // make it a cache precondition. api.pokemontcg.io sits behind a CDN
    // that can answer 200 with an HTML interstitial; stored as JSON for a
    // week that poisons every client's response.json(), and since the
    // client's retries reuse the same URL they keep hitting the same
    // entry. Anything that is not JSON stays uncached so the next request
    // re-fetches.
    const contentType = upstream.headers.get('content-type') ?? '';
    const cacheable = upstream.status === 200 && contentType.includes('application/json');
    return new Response(body, {
      status: upstream.status,
      headers: {
        'Content-Type': contentType || 'application/json',
        // Only a JSON 200 is cached. A 404 or a 400 can also be upstream
        // having a bad moment, and a cached error outlives the blip that
        // made it.
        'Cache-Control': cacheable ? CACHE_HIT : 'no-store',
        ...CORS,
      },
    });
  } catch (e) {
    console.error('[pokemontcg]', e);
    return jsonError(502, 'catalog unavailable');
  }
}

// Vercel serverless function (Edge runtime) — daily card movers,
// proxied from collectrics.com's public leaderboard API.
//
// Why this exists: TCGPlayer doesn't expose "yesterday's market price"
// publicly, so we'd otherwise need to run our own daily snapshot
// pipeline to compute prior-day movers. mycollectrics.com already
// publishes a curated leaderboard with a 1-day delta, refreshed each
// morning. We fetch it server-side (their endpoint has no CORS header
// so we can't call it from the browser), cherry-pick the top movers
// by absolute |dod-change-pct|, and return a clean payload.
//
// Cached at the edge for 6 hours — their data only changes once a day.

export const config = { runtime: 'edge' };

interface CollectricsRow {
  id: string;
  'product-name': string;
  'set-name': string;
  'set-code': string;
  'rarity-code'?: string;
  'rarity-name'?: string;
  'image-url': string;
  'raw-price'?: number;
  'psa-10-price'?: number;
  'dod-change'?: number;
  'dod-change-pct'?: number;
  'baseline-change'?: number;
  'baseline-change-pct'?: number;
  'snapshot-date'?: string;
}

type Mode = 'movers' | 'undervalued' | 'overvalued';

export interface TrendingTile {
  /** TCGPlayer productId, parsed from the image URL. */
  productId: string;
  /**
   * Pokemon TCG card id (e.g. "sv8pt5-156"), resolved server-side
   * by querying the Pokemon TCG API for a name + set match.
   * When present, tile taps can route directly to /card/{cardId}.
   * When absent (resolver miss / rate-limit / new card not yet in
   * Pokemon TCG database), the client falls back to dropping the
   * user into search with the name pre-filled.
   */
  cardId?: string;
  name: string;
  setName: string;
  rarity: string;
  imageUrl: string;
  rawPrice: number;
  /** Day-over-day change, already converted to percent (e.g. 4.9). */
  percentChange: number;
  /**
   * Current price vs 30-day baseline, in percent. Drives the
   * undervalued / overvalued ranking — negative means current price is
   * below the 30d average (potential rebound), positive means it's
   * above (potential cooldown). Undefined when collectrics doesn't
   * publish a baseline for the row.
   */
  baselineChangePct?: number;
}

interface TrendingResponse {
  generatedAt: string;
  source: 'collectrics';
  mode: Mode;
  items: TrendingTile[];
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
      // 6h CDN cache, 1h SWR. Their feed updates once daily so this is
      // generous; SWR keeps responses snappy while we refresh in bg.
      'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=3600',
      ...CORS,
    },
  });
}

function extractProductId(url: string): string | null {
  // e.g. https://tcgplayer-cdn.tcgplayer.com/product/676106_in_1000x1000.jpg
  const m = url.match(/\/product\/(\d+)_/);
  return m ? m[1] : null;
}

/**
 * Resolve a single tile's TCGPlayer productId to a Pokemon TCG card id
 * by querying the Pokemon TCG API for a name+set match.
 *
 * Why this exists: collectrics gives us TCGPlayer productIds but our
 * card detail screen routes by Pokemon TCG cardId (a different
 * identifier). Without this resolver, tile taps have to detour
 * through the search screen.
 *
 * Strategy: query Pokemon TCG API with a Lucene-style name + set
 * filter. Take the first hit. Pokemon TCG names occasionally diverge
 * from TCGPlayer names (extra "[V-MAX]" suffixes, etc.) so we strip
 * common variant tags before querying. On any failure (timeout,
 * 4xx/5xx, no match), return null — the client falls back to search.
 *
 * Pokemon TCG API has no auth requirement for read; rate limit is
 * 1000 req/hr unauthenticated. Trending tiles are cached at the edge
 * for 6h, so we only fan out 12-24 lookups twice a day in the worst
 * case. Comfortable margin.
 */
async function resolveCardId(
  productName: string,
  setName: string,
): Promise<string | null> {
  // Strip common TCGPlayer-only suffixes that Pokemon TCG API doesn't use.
  // e.g. "Charizard ex (Special Illustration Rare)" -> "Charizard ex"
  const cleanName = productName
    .replace(/\s*\([^)]*\)\s*/g, ' ')   // strip (parenthetical)
    .replace(/\s*-\s*[\w\s/]+$/, '')    // strip trailing " - Suffix"
    .replace(/\s+/g, ' ')
    .trim();

  // Lucene quote anything containing whitespace/special chars; escape
  // double quotes inside the value.
  const q = (val: string) => `"${val.replace(/"/g, '\\"')}"`;
  const query = `name:${q(cleanName)} set.name:${q(setName)}`;

  // 3s per-lookup budget — we run them in parallel, but a single
  // hung request shouldn't drag the whole response.
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 3000);

  try {
    const res = await fetch(
      `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(query)}&pageSize=1&select=id`,
      {
        headers: { 'user-agent': 'CardPulse Trending Resolver' },
        signal: ctl.signal,
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const id = data?.data?.[0]?.id;
    return typeof id === 'string' ? id : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'GET') return json(405, { error: 'method not allowed' });

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '12'), 24);
  const modeRaw = (url.searchParams.get('mode') ?? 'movers').toLowerCase();
  const mode: Mode =
    modeRaw === 'undervalued' || modeRaw === 'overvalued' ? modeRaw : 'movers';

  try {
    const res = await fetch('https://mycollectrics.com/api/card_leaderboard', {
      // UA so the upstream doesn't flag us as a generic bot. Their feed
      // is public — no auth, no API key — so this is just etiquette.
      headers: { 'user-agent': 'Mozilla/5.0 (CardPulse Trending Proxy)' },
    });
    if (!res.ok) return json(502, { error: 'collectrics upstream', status: res.status });

    const data = await res.json();
    const rows: CollectricsRow[] = Array.isArray(data?.rows) ? data.rows : [];

    // Map every row that has the basics into a TrendingTile. Filtering
    // and sorting per mode happens after the map so we keep the optional
    // baselineChangePct on every tile (consumers may want both metrics).
    const tiles: TrendingTile[] = rows
      .filter(
        (r) =>
          typeof r['raw-price'] === 'number' &&
          r['raw-price']! > 0 &&
          typeof r['dod-change-pct'] === 'number',
      )
      .map((r): TrendingTile | null => {
        const productId = extractProductId(r['image-url'] ?? '');
        if (!productId) return null;
        const tile: TrendingTile = {
          productId,
          name: r['product-name'],
          setName: r['set-name'],
          rarity: r['rarity-name'] ?? r['rarity-code'] ?? '',
          imageUrl: r['image-url'],
          rawPrice: r['raw-price']!,
          percentChange: r['dod-change-pct']! * 100,
        };
        if (typeof r['baseline-change-pct'] === 'number') {
          tile.baselineChangePct = r['baseline-change-pct']! * 100;
        }
        return tile;
      })
      .filter((x): x is TrendingTile => x !== null);

    // All three modes ride the same dod-change-pct (biggest movers
    // today) — modes split the feed by direction:
    //   movers      → biggest |move|, sign-agnostic
    //   undervalued → biggest negative dod (today's dips, rebound bets)
    //   overvalued  → biggest positive dod (today's spikes, cooldown bets)
    // baseline-change-pct stays on each tile in case consumers want
    // the 30-day signal separately, but it doesn't drive the rank.
    let items: TrendingTile[];
    if (mode === 'undervalued') {
      items = tiles
        .filter((t) => t.percentChange < 0)
        .sort((a, b) => a.percentChange - b.percentChange) // most negative first
        .slice(0, limit);
    } else if (mode === 'overvalued') {
      items = tiles
        .filter((t) => t.percentChange > 0)
        .sort((a, b) => b.percentChange - a.percentChange) // most positive first
        .slice(0, limit);
    } else {
      items = tiles
        .sort((a, b) => {
          const d = Math.abs(b.percentChange) - Math.abs(a.percentChange);
          return d !== 0 ? d : a.name.localeCompare(b.name);
        })
        .slice(0, limit);
    }

    // Resolve productId → Pokemon TCG cardId for the slice we're
    // about to return (only post-slice — no point spending API quota
    // resolving cards that don't make the cut). Promise.allSettled
    // so a single resolver failure can't blow up the response — the
    // missing tile just lands without a cardId and the client falls
    // back to the search detour for that one item.
    const resolved = await Promise.allSettled(
      items.map((t) => resolveCardId(t.name, t.setName)),
    );
    items = items.map((t, i) => {
      const r = resolved[i];
      if (r.status === 'fulfilled' && r.value) {
        return { ...t, cardId: r.value };
      }
      return t;
    });

    const body: TrendingResponse = {
      generatedAt: data['generated-at'] ?? '',
      source: 'collectrics',
      mode,
      items,
    };
    return json(200, body);
  } catch (err) {
    return json(500, { error: 'trending proxy failure', detail: String(err) });
  }
}

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

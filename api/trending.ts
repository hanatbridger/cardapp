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
  'snapshot-date'?: string;
}

export interface TrendingTile {
  /** TCGPlayer productId, parsed from the image URL. */
  productId: string;
  name: string;
  setName: string;
  rarity: string;
  imageUrl: string;
  rawPrice: number;
  /** Already converted to percent (e.g. 4.9, not 0.049). */
  percentChange: number;
}

interface TrendingResponse {
  generatedAt: string;
  source: 'collectrics';
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

  const limit = Math.min(
    Number(new URL(req.url).searchParams.get('limit') ?? '12'),
    24,
  );

  try {
    const res = await fetch('https://mycollectrics.com/api/card_leaderboard', {
      // UA so the upstream doesn't flag us as a generic bot. Their feed
      // is public — no auth, no API key — so this is just etiquette.
      headers: { 'user-agent': 'Mozilla/5.0 (CardPulse Trending Proxy)' },
    });
    if (!res.ok) return json(502, { error: 'collectrics upstream', status: res.status });

    const data = await res.json();
    const rows: CollectricsRow[] = Array.isArray(data?.rows) ? data.rows : [];

    const items: TrendingTile[] = rows
      .filter(
        (r) =>
          typeof r['raw-price'] === 'number' &&
          r['raw-price']! > 0 &&
          typeof r['dod-change-pct'] === 'number',
      )
      .map((r) => {
        const productId = extractProductId(r['image-url'] ?? '');
        return productId
          ? {
              productId,
              name: r['product-name'],
              setName: r['set-name'],
              rarity: r['rarity-name'] ?? r['rarity-code'] ?? '',
              imageUrl: r['image-url'],
              rawPrice: r['raw-price']!,
              percentChange: r['dod-change-pct']! * 100,
            }
          : null;
      })
      .filter((x): x is TrendingTile => x !== null)
      // Biggest absolute movers first — a -10% drop is as newsworthy as
      // a +10% pop. Within ties, alpha by name keeps ordering stable.
      .sort((a, b) => {
        const d = Math.abs(b.percentChange) - Math.abs(a.percentChange);
        return d !== 0 ? d : a.name.localeCompare(b.name);
      })
      .slice(0, limit);

    const body: TrendingResponse = {
      generatedAt: data['generated-at'] ?? '',
      source: 'collectrics',
      items,
    };
    return json(200, body);
  } catch (err) {
    return json(500, { error: 'trending proxy failure', detail: String(err) });
  }
}

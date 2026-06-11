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
      // 30-min CDN cache, 1h SWR. Lower than the upstream's daily
      // refresh because we layer name-resolution on top — when we
      // ship resolver tweaks, we want the cache to flush quickly so
      // users see improved hit rates rather than stale 0/5 responses.
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      ...CORS,
    },
  });
}

function extractProductId(url: string): string | null {
  // e.g. https://tcgplayer-cdn.tcgplayer.com/product/676106_in_1000x1000.jpg
  const m = url.match(/\/product\/(\d+)_/);
  return m ? m[1] : null;
}

// Double Rare is the base ex-card rarity (the two-black-star bulk of
// every modern set). They dominate the leaderboard by count and aren't
// the cards users track for movement/valuation, so we drop them from
// every trending mode. Collectrics tags them rarity-name "Double Rare"
// / rarity-code "DR". NOTE: do NOT match code "RR" — that's Radiant
// Rare, a distinct (and wanted) rarity.
function isDoubleRare(r: CollectricsRow): boolean {
  const name = (r['rarity-name'] ?? '').trim().toLowerCase();
  const code = (r['rarity-code'] ?? '').trim().toLowerCase();
  return name === 'double rare' || code === 'dr';
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
  // Strip TCGPlayer-only patterns that Pokemon TCG API doesn't use.
  // Empirical examples from collectrics:
  //   "Tyranitar ex #64"                         -> "Tyranitar ex"
  //   "Charizard ex (Special Illustration Rare)" -> "Charizard ex"
  //   "Pikachu ex - Surging Sparks #25"          -> "Pikachu ex"
  // Pokemon TCG API stores the card number in a separate `number`
  // field, so the # suffix MUST come off before name matching.
  const cleanName = productName
    .replace(/\s*#[\w/]+/g, '')         // "#64", "#25/198", "#SWSH123"
    .replace(/\s*\([^)]*\)\s*/g, ' ')   // (parenthetical)
    .replace(/\s*-\s*[^-]+$/, '')       // trailing " - Suffix"
    .replace(/\s+/g, ' ')
    .trim();

  // Extract the printed card number from the product name. Collectrics
  // names embed "#NNN" — same source we stripped above. Pokemon TCG API
  // exposes `number` as a queryable Lucene field, so we can use it to
  // disambiguate between multiple printings of the same character
  // (e.g. "Terapagos ex #170" — the SIR variant — vs "#128" — the
  // standard print). For numbered cards like "#25/198" we keep just
  // the card number ("25"), discarding the set-size after the slash.
  const numberMatch = productName.match(/#([\w]+(?:\/[\w]+)?)/);
  const cardNumber = numberMatch
    ? numberMatch[1].split('/')[0].trim()
    : null;

  // Collectrics prefixes every set with "Pokemon " ("Pokemon Paldean
  // Fates"); Pokemon TCG API uses the bare set name. Strip it. Also
  // strip the "SV:" prefix that some sets carry on TCGPlayer-side.
  const cleanSet = setName
    .replace(/^Pokemon\s+/i, '')
    .replace(/^SV:\s*/i, '')
    .trim();

  // Lucene quote anything containing whitespace/special chars; escape
  // double quotes inside the value.
  const q = (val: string) => `"${val.replace(/"/g, '\\"')}"`;

  // Four-pass query strategy — precision-descending. Order matters
  // because we return on the FIRST pass that matches anything; lower
  // precision queries can over-match (e.g. "name + set" alone returns
  // multiple printings of the same character when a set has Standard
  // + SIR + RR variants — Pokemon TCG API picks the lowest number,
  // not the one collectrics tagged with "#170").
  //
  //   1. name + set + number  — uniquely identifies the printing
  //   2. name + number        — set normalization missed but # is
  //                              still unique enough across all sets
  //                              with that character
  //   3. name + set           — for collectrics rows without a # in
  //                              the product name (rare)
  //   4. name only            — last-resort fallback
  const queries: string[] = [];
  if (cardNumber) {
    queries.push(
      `name:${q(cleanName)} set.name:${q(cleanSet)} number:${q(cardNumber)}`,
    );
    queries.push(`name:${q(cleanName)} number:${q(cardNumber)}`);
  }
  queries.push(`name:${q(cleanName)} set.name:${q(cleanSet)}`);
  queries.push(`name:${q(cleanName)}`);

  // 3s per-lookup budget covers BOTH passes — if a single pass blows
  // through it the resolver gives up rather than dragging the whole
  // response. Pokemon TCG API typical p95 is ~200ms so two sequential
  // queries fit comfortably under 3s.
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 3000);

  try {
    for (const query of queries) {
      const res = await fetch(
        `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(query)}&pageSize=1&select=id`,
        {
          headers: { 'user-agent': 'CardPulse Trending Resolver' },
          signal: ctl.signal,
        },
      );
      if (!res.ok) continue;
      const data = await res.json();
      const id = data?.data?.[0]?.id;
      if (typeof id === 'string') return id;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Parse a caller-supplied limit into a positive integer in [1, max],
// falling back to `def` for missing / non-numeric / zero / negative
// input. Prevents slice(0, negative|NaN) pathologies and bounds any
// downstream per-item fan-out.
function clampLimit(raw: string | null, def: number, max: number): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) return def;
  return Math.min(n, max);
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'GET') return json(405, { error: 'method not allowed' });

  const url = new URL(req.url);
  // Clamp limit to a sane positive integer. Without this, `?limit=-1`
  // produced slice(0, -1) → the entire collectrics feed (hundreds of
  // tiles), and the post-slice cardId resolver then fanned out one
  // Pokemon TCG API lookup PER tile — an unauthenticated request
  // amplifying into hundreds of upstream calls (DoS + rate-limit-ban
  // risk on the shared 1000/hr quota). `?limit=abc` → NaN → slice(0,
  // NaN) → [] also handled (falls back to the default).
  const limit = clampLimit(url.searchParams.get('limit'), 12, 24);
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
          typeof r['dod-change-pct'] === 'number' &&
          !isDoubleRare(r),
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

    // Each mode pulls a different signal out of the same payload:
    //   movers      → biggest abs(dod-change-pct) — "moved most TODAY"
    //                 sign-agnostic, sorts up + down moves together.
    //   undervalued → most-negative baseline-change-pct — "current price
    //                 farthest BELOW the 30-day average". This is the
    //                 actual valuation signal, not just today's dip.
    //   overvalued  → most-positive baseline-change-pct — "current price
    //                 farthest ABOVE the 30-day average". Cooldown bets.
    //
    // Why two different signals: dod-change-pct is movement (volatility),
    // baseline-change-pct is valuation (mean-reversion). The home ticker
    // wants "what's hot today" → movement. The Explore picks promise
    // "valuation insight" → mean-reversion. Mixing them up surfaces
    // one-day blips as "undervalued," which sharp users notice.
    //
    // Tiles without a published baseline-change-pct are excluded from
    // undervalued/overvalued — collectrics doesn't always publish a
    // baseline (newly tracked cards, sparse-volume cards), and we'd
    // rather show fewer rows than mix in items ranked on the wrong
    // signal. Movers mode keeps every tile since its signal is dod.
    let items: TrendingTile[];
    if (mode === 'undervalued') {
      items = tiles
        .filter(
          (t) =>
            typeof t.baselineChangePct === 'number' && t.baselineChangePct < 0,
        )
        .sort((a, b) => a.baselineChangePct! - b.baselineChangePct!) // most negative first
        .slice(0, limit);
    } else if (mode === 'overvalued') {
      items = tiles
        .filter(
          (t) =>
            typeof t.baselineChangePct === 'number' && t.baselineChangePct > 0,
        )
        .sort((a, b) => b.baselineChangePct! - a.baselineChangePct!) // most positive first
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
    console.error('[trending] proxy failure:', err);
    return json(500, { error: 'trending proxy failure' });
  }
}

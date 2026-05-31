// Vercel serverless function (Edge runtime) — card-news aggregator.
//
// Why Google News RSS instead of each source's own feed: the sources
// the app cares about are mostly un-fetchable server-side —
//   • pokebeach.com/feed  → Cloudflare 403 (bot challenge)
//   • psacard.com feeds   → 403
//   • taggrading.com      → no usable feed
//   • beckett.com/news    → direct RSS works, but only ~10 items
// Google News exposes an RSS search endpoint that is NOT bot-blocked
// and supports the `site:` operator, so we scope one query per source
// and get ~100 recent, dated, source-attributed items each — including
// the Cloudflare-walled PokeBeach. Each item links to a Google News
// redirect URL that forwards to the original article.
//
// We fan out one request per source, parse the RSS with regex (the
// Edge runtime has no DOMParser), normalize into a flat Article shape,
// dedupe by title, sort newest-first, and cap the response.
//
// Cached at the edge for 1h — news doesn't need minute-freshness and
// this keeps us well under any rate ceiling.

export const config = { runtime: 'edge' };

interface NewsSource {
  /** Stable key the client can filter/badge on. */
  key: string;
  /** Display label for the source badge. */
  label: string;
  /** Full Google News query for this source. */
  query: string;
  /**
   * Max items kept from this source before the global merge. Keeps a
   * prolific general-cards publisher (Beckett) from drowning out the
   * Pokémon-specific source (PokeBeach), which is the priority feed.
   */
  cap: number;
}

// PokeBeach is Pokémon-only, so a bare site: query is already on-topic
// and it's the lead source (highest cap). The others (PSA, Beckett,
// TAG) cover all trading cards / sports, so we AND in "pokemon" to
// drop basketball/baseball/soccer noise, and cap their volume so they
// supplement rather than flood the feed.
const SOURCES: NewsSource[] = [
  { key: 'pokebeach', label: 'PokeBeach', query: 'site:pokebeach.com', cap: 40 },
  { key: 'psa', label: 'PSA', query: 'site:psacard.com pokemon', cap: 12 },
  { key: 'beckett', label: 'Beckett', query: 'site:beckett.com pokemon', cap: 12 },
  { key: 'tag', label: 'TAG', query: 'site:taggrading.com pokemon', cap: 8 },
];

// Titles that are clearly site furniture, not news — Google News
// indexes nav/FAQ/cart pages on some domains (notably TAG). Drop any
// headline that matches.
const JUNK_TITLE_RE =
  /^(your shopping cart|shopping cart|how do i|what (is|can)|frequently asked|contact|customer service|sign in|log in|create account|home page|search results)\b/i;

export interface NewsArticle {
  title: string;
  url: string;
  /** ISO timestamp, or '' when the feed omitted a date. */
  publishedAt: string;
  sourceKey: string;
  sourceLabel: string;
}

interface NewsResponse {
  generatedAt: string;
  articles: NewsArticle[];
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
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600',
      ...CORS,
    },
  });
}

// Minimal XML entity decode for the fields we surface (titles mostly).
function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function pick(block: string, tag: string): string {
  // Handles both <tag>..</tag> and <tag ...>..</tag>, plus CDATA.
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m = block.match(re);
  if (!m) return '';
  let v = m[1].trim();
  const cdata = v.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  if (cdata) v = cdata[1].trim();
  return decodeEntities(v).trim();
}

async function fetchSource(source: NewsSource): Promise<NewsArticle[]> {
  const q = encodeURIComponent(source.query);
  const url = `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 6000);
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': 'Mozilla/5.0 (CardPulse News Aggregator)' },
      signal: ctl.signal,
    });
    if (!res.ok) return [];
    const xml = await res.text();

    // Split into <item> blocks and parse each.
    const items = xml.split(/<item>/i).slice(1);
    const out: NewsArticle[] = [];
    for (const raw of items) {
      const block = raw.split(/<\/item>/i)[0];
      let title = pick(block, 'title');
      const link = pick(block, 'link');
      const pubDate = pick(block, 'pubDate');
      if (!title || !link) continue;

      // Google News titles end with " - SourceName"; strip the suffix
      // since we render the source as its own badge.
      title = title.replace(/\s+-\s+[^-]+$/, '').trim();

      // Drop site furniture / non-news (TAG nav + FAQ pages, etc.)
      // and absurdly short titles that are almost always nav.
      if (title.length < 12 || JUNK_TITLE_RE.test(title)) continue;

      // pubDate is RFC-822 ("Wed, 28 May 2026 12:00:00 GMT"). Convert
      // to ISO; leave '' if unparseable so the client can hide the date.
      let publishedAt = '';
      if (pubDate) {
        const t = Date.parse(pubDate);
        if (!Number.isNaN(t)) publishedAt = new Date(t).toISOString();
      }

      out.push({
        title,
        url: link,
        publishedAt,
        sourceKey: source.key,
        sourceLabel: source.label,
      });
    }
    // Newest-first within the source, then cap so a prolific publisher
    // can't dominate the merged feed.
    out.sort((a, b) => {
      const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
      return tb - ta;
    });
    return out.slice(0, source.cap);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'GET') return json(405, { error: 'method not allowed' });

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '60'), 120);

  // Fan out one query per source. allSettled so one slow/blocked
  // source can't sink the whole response.
  const settled = await Promise.allSettled(SOURCES.map(fetchSource));
  const all: NewsArticle[] = settled.flatMap((s) =>
    s.status === 'fulfilled' ? s.value : [],
  );

  // Dedupe by normalized title (the same story sometimes surfaces under
  // multiple source domains via syndication).
  const seen = new Set<string>();
  const deduped: NewsArticle[] = [];
  for (const a of all) {
    const k = a.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 80);
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(a);
  }

  // Newest first. Undated items sink to the bottom.
  deduped.sort((a, b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return tb - ta;
  });

  const body: NewsResponse = {
    generatedAt: new Date().toISOString(),
    articles: deduped.slice(0, limit),
  };
  return json(200, body);
}

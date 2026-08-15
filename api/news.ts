// Vercel serverless function (Edge runtime) — Pokemon card-news feed.
//
// Two source types merged into one feed:
//
//   type 'wp'  — Pokemon/TCG news outlets with proper RSS: real cover
//                images, real summaries, direct article links.
//                  • ComicBook "Pokemon TCG" tag (card/grading lead)
//                  • ComicBook "Pokemon" tag (filtered to cards)
//                  • Dexerto Pokemon (filtered to cards)
//
//   type 'gnews' — PokeBeach, reached via Google News RSS because its
//                  own feed is Cloudflare-walled. Headline-only: no
//                  cover image (client shows a branded tile) and no
//                  summary; the link is a Google News URL that
//                  resolves to the PokeBeach article in a browser.
//                  Included because PokeBeach is the most TCG-relevant
//                  source even though its data is thinner.
//
// Regex RSS parse (Edge runtime has no DOMParser). Per source we
// extract title, link, image, summary, date; keyword-filter the broad
// feeds; dedupe; sort newest-first; cap. Edge-cached 1h.

export const config = { runtime: 'edge' };

type SourceType = 'wp' | 'gnews';

interface NewsSource {
  key: string;
  label: string;
  url: string;
  type: SourceType;
  cap: number;
  cardOnly: boolean;
}

const SOURCES: NewsSource[] = [
  {
    key: 'comicbook-tcg',
    label: 'ComicBook',
    url: 'https://comicbook.com/tag/pokemon-tcg/feed/',
    type: 'wp',
    cap: 24,
    cardOnly: false,
  },
  {
    key: 'comicbook-pokemon',
    label: 'ComicBook',
    url: 'https://comicbook.com/tag/pokemon/feed/',
    type: 'wp',
    cap: 12,
    cardOnly: true,
  },
  {
    key: 'dexerto',
    label: 'Dexerto',
    url: 'https://www.dexerto.com/pokemon/feed/',
    type: 'wp',
    cap: 12,
    cardOnly: true,
  },
  {
    key: 'pokebeach',
    label: 'PokeBeach',
    url: 'https://news.google.com/rss/search?q=site:pokebeach.com&hl=en-US&gl=US&ceid=US:en',
    type: 'gnews',
    cap: 14,
    cardOnly: false,
  },
];

const CARD_RE =
  /\b(tcg|card|cards|graded?|grading|psa|cgc|beckett|booster|sealed|slab|set|elite trainer|etb|1st edition|first edition|illustration rare|chase card|pull|pokemon center|scarlet|violet|prismatic|mega evolution|surging sparks|stellar crown)\b/i;

export interface NewsArticle {
  title: string;
  url: string;
  imageUrl: string;
  /** Plain-text excerpt, or '' for headline-only sources. */
  summary: string;
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

function decodeEntities(s: string): string {
  // &amp; decodes FIRST so double-encoded entities ("&amp;#39;") reveal
  // the inner entity for the passes below. fromCodePoint (not
  // fromCharCode) so astral codepoints survive; out-of-range values are
  // left as-is because fromCodePoint throws on them.
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (m, n) => {
      const cp = Number(n);
      return cp <= 0x10ffff ? String.fromCodePoint(cp) : m;
    })
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (m, n) => {
      const cp = parseInt(n, 16);
      return cp <= 0x10ffff ? String.fromCodePoint(cp) : m;
    });
}

function pick(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m = block.match(re);
  if (!m) return '';
  let v = m[1].trim();
  const cdata = v.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  if (cdata) v = cdata[1].trim();
  return decodeEntities(v).trim();
}

function extractImage(block: string): string {
  const patterns = [
    /<media:content[^>]+url=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/i,
    /<media:thumbnail[^>]+url=["']([^"']+)["']/i,
    /<enclosure[^>]+url=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/i,
    /<img[^>]+src=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/i,
    /&lt;img[^&]+src=&quot;([^&]+\.(?:jpg|jpeg|png|webp)[^&]*)&quot;/i,
  ];
  for (const re of patterns) {
    const m = block.match(re);
    if (m) return decodeEntities(m[1]);
  }
  return '';
}

// Plain-text summary from an RSS description / content:encoded blob.
function extractSummary(block: string): string {
  const rawDesc = pick(block, 'description') || pick(block, 'content:encoded');
  if (!rawDesc) return '';
  // Drop tags, collapse whitespace, trim to a clean sentence-ish length.
  const text = decodeEntities(rawDesc.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
  // Google News descriptions are just the anchor text (== the title) —
  // not a real summary, so suppress those.
  if (!text || /^https?:\/\//.test(text)) return '';
  if (text.length <= 300) return text;
  return text.slice(0, 297).replace(/\s+\S*$/, '') + '…';
}

async function fetchSource(source: NewsSource): Promise<NewsArticle[]> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 6500);
  try {
    const res = await fetch(source.url, {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; CardPulseBot/1.0; +https://getcardpulse.app)',
        accept: 'application/rss+xml, application/xml, text/xml',
      },
      signal: ctl.signal,
    });
    if (!res.ok) return [];
    const xml = await res.text();

    const blocks = xml.split(/<item>/i).slice(1);
    const out: NewsArticle[] = [];
    for (const raw of blocks) {
      const block = raw.split(/<\/item>/i)[0];
      let title = pick(block, 'title');
      const link = pick(block, 'link');
      if (!title || !link || !/^https?:\/\//.test(link)) continue;

      // Google News appends " - Source" to titles; strip it.
      if (source.type === 'gnews') {
        title = title.replace(/\s+-\s+[^-]+$/, '').trim();
      }
      if (source.cardOnly && !CARD_RE.test(title)) continue;
      if (title.length < 12) continue;

      let publishedAt = '';
      const pubDate = pick(block, 'pubDate');
      if (pubDate) {
        const t = Date.parse(pubDate);
        if (!Number.isNaN(t)) publishedAt = new Date(t).toISOString();
      }

      out.push({
        title,
        url: link,
        imageUrl: source.type === 'wp' ? extractImage(block) : '',
        summary: source.type === 'wp' ? extractSummary(block) : '',
        publishedAt,
        sourceKey: source.key,
        sourceLabel: source.label,
      });
    }
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

// Positive-integer limit in [1, max]; falls back to `def` for
// missing / non-numeric / zero / negative input so slice() never sees
// a NaN (→ empty edge-cached response) or negative bound.
function clampLimit(raw: string | null, def: number, max: number): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) return def;
  return Math.min(n, max);
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'GET') return json(405, { error: 'method not allowed' });

  const url = new URL(req.url);
  const limit = clampLimit(url.searchParams.get('limit'), 50, 100);

  const settled = await Promise.allSettled(SOURCES.map(fetchSource));
  const all: NewsArticle[] = settled.flatMap((s) =>
    s.status === 'fulfilled' ? s.value : [],
  );

  const seen = new Set<string>();
  const deduped: NewsArticle[] = [];
  for (const a of all) {
    const k = a.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 80);
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(a);
  }

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

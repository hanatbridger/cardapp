// Vercel serverless function (Edge runtime) — Pokemon card-news feed.
//
// Sourcing: the collector/grading outlets originally requested
// (PokeBeach, PSA, TAG) are un-fetchable server-side — PokeBeach and
// PSA sit behind Cloudflare, PokeBeach's WordPress API is auth-locked,
// TAG publishes no real news, and Google News RSS (the only thing that
// reached them) carries no images and only flaky JS-redirect links.
//
// So we source from Pokemon/TCG news outlets that expose proper RSS
// with real article images AND direct, working links:
//   • ComicBook "Pokemon TCG" tag — card/grading-specific, our lead
//   • ComicBook "Pokemon" tag     — broader, filtered to card content
//   • Dexerto Pokemon             — broader, filtered to card content
// Each item carries a real cover image and a direct article URL.
//
// We fan out per feed, parse RSS with regex (Edge runtime has no
// DOMParser), extract a cover image (media:content / media:thumbnail /
// enclosure / first <img> in content), keyword-filter the broad feeds
// down to card/TCG content, dedupe, sort newest-first, cap. Edge-cached
// 1h — the feeds update through the day; an hour keeps it fresh.

export const config = { runtime: 'edge' };

interface NewsSource {
  key: string;
  label: string;
  url: string;
  /** Cap kept from this feed before the global merge. */
  cap: number;
  /**
   * When true, keep only items whose title looks card/TCG-related.
   * Lead feed is already card-scoped so it skips this; broad Pokemon
   * feeds use it to drop video-game / Pokemon GO / anime noise.
   */
  cardOnly: boolean;
}

const SOURCES: NewsSource[] = [
  {
    key: 'comicbook-tcg',
    label: 'ComicBook',
    url: 'https://comicbook.com/tag/pokemon-tcg/feed/',
    cap: 30,
    cardOnly: false,
  },
  {
    key: 'comicbook-pokemon',
    label: 'ComicBook',
    url: 'https://comicbook.com/tag/pokemon/feed/',
    cap: 15,
    cardOnly: true,
  },
  {
    key: 'dexerto',
    label: 'Dexerto',
    url: 'https://www.dexerto.com/pokemon/feed/',
    cap: 15,
    cardOnly: true,
  },
];

// Title/keyword test for the broad feeds — keep card/TCG/grading items,
// drop pure video-game / GO / anime stories.
const CARD_RE =
  /\b(tcg|card|cards|graded?|grading|psa|cgc|beckett|booster|sealed|slab|set|elite trainer|etb|1st edition|first edition|illustration rare|chase card|pull|pokemon center|scarlet|violet|prismatic|mega evolution|surging sparks|stellar crown)\b/i;

export interface NewsArticle {
  title: string;
  url: string;
  imageUrl: string;
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
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&');
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

// Pull a cover image from the various places WordPress feeds stash it.
function extractImage(block: string): string {
  const patterns = [
    /<media:content[^>]+url=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/i,
    /<media:thumbnail[^>]+url=["']([^"']+)["']/i,
    /<enclosure[^>]+url=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/i,
    // First <img> inside content:encoded / description (often CDATA or
    // entity-encoded, so match both raw and decoded forms).
    /<img[^>]+src=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/i,
    /&lt;img[^&]+src=&quot;([^&]+\.(?:jpg|jpeg|png|webp)[^&]*)&quot;/i,
  ];
  for (const re of patterns) {
    const m = block.match(re);
    if (m) return decodeEntities(m[1]);
  }
  return '';
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
      const title = pick(block, 'title');
      const link = pick(block, 'link');
      if (!title || !link || !/^https?:\/\//.test(link)) continue;
      if (source.cardOnly && !CARD_RE.test(title)) continue;

      let publishedAt = '';
      const pubDate = pick(block, 'pubDate');
      if (pubDate) {
        const t = Date.parse(pubDate);
        if (!Number.isNaN(t)) publishedAt = new Date(t).toISOString();
      }

      out.push({
        title,
        url: link,
        imageUrl: extractImage(block),
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

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'GET') return json(405, { error: 'method not allowed' });

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '50'), 100);

  const settled = await Promise.allSettled(SOURCES.map(fetchSource));
  const all: NewsArticle[] = settled.flatMap((s) =>
    s.status === 'fulfilled' ? s.value : [],
  );

  // Dedupe by normalized title (the same story runs under both
  // ComicBook tags) — keep the first, which is the higher-priority feed.
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

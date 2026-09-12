// JustTCG — the fallback price for cards TCGPlayer does not price.
//
// TCGPlayer Market Price is the app's primary raw price, and it is
// honest about its gaps: a rare Japanese promo with no TCGPlayer listings
// has no TCGPlayer price. JustTCG prices those cards from observed market
// activity (volume-weighted, online plus partner-store sales), which by
// their own guidelines may be described as a market price. It is only
// consulted when TCGPlayer has nothing — never as a second opinion on a
// card TCGPlayer already prices, which would put two feeds in one chart.
//
// Quota is the constraint, not latency: the free tier allows 100
// requests a day, Starter 1,000. So every lookup is cache-first through
// price_snapshots (source 'justtcg'), a live call happens at most once a
// day per card, and the batch price path never calls live at all (see
// api/tcgplayer/price.ts). The daily cron (api/cron/justtcg-refresh.ts)
// keeps recently viewed cards fresh in batches.
//
// Terms: prices are served in our own response shape from our own cache.
// Their JSON is never relayed, and our endpoints are not a JustTCG proxy.
//
// Required env (Vercel project): JUSTTCG_API_KEY. Absent, every call
// here returns null and the app behaves exactly as before.

import { fetchWithTimeout } from './http';

const BASE = 'https://api.justtcg.com/v1';

/** Conditions we will call a card's price, best first. Played copies
 *  are not "the market price" of a card. */
const ACCEPTED_CONDITIONS = ['Near Mint', 'Lightly Played'] as const;

export interface JustTcgPrice {
  /** USD. A volume-weighted market observation, not a listing. */
  price: number;
  condition: string;
  printing: string;
  language: string | null;
  /** JustTCG's stable card id — the cache key when there is no TCGPlayer id. */
  cardUuid: string;
  tcgplayerId: string | null;
  /** ISO date the price was last updated upstream. */
  updatedAt: string;
  priceChange7d: number | null;
}

interface Variant {
  uuid: string;
  condition: string | null;
  printing: string | null;
  language: string | null;
  price: number | null;
  lastUpdated: number | null;
  priceChange7d?: number | null;
}

interface Card {
  uuid: string;
  name: string;
  number: string | null;
  set?: string | null;
  tcgplayerId: string | null;
  variants: Variant[];
}

export function justTcgEnabled(): boolean {
  return Boolean(process.env.JUSTTCG_API_KEY);
}

/** "052" and "52" are the same collector number. */
function normNumber(n: string | null | undefined): string {
  return (n ?? '').trim().replace(/^0+(?=\d)/, '').toLowerCase();
}

function apiLanguage(lang: 'EN' | 'JP' | undefined): string {
  return lang === 'JP' ? 'Japanese' : 'English';
}

async function get(params: URLSearchParams): Promise<Card[] | null> {
  const key = process.env.JUSTTCG_API_KEY;
  if (!key) return null;
  let res: Response;
  try {
    res = await fetchWithTimeout(`${BASE}/cards?${params}`, {
      headers: { 'x-api-key': key, accept: 'application/json' },
    });
  } catch {
    return null;
  }
  // 429 is quota, and the right response to quota is to stop asking —
  // the cache layer above serves whatever it has until tomorrow.
  if (res.status === 429) {
    console.warn('[justtcg] rate limited');
    return null;
  }
  if (!res.ok) {
    // The body names the code (MISSING_API_KEY, EXCESSIVE_FREE_TIER_USAGE
    // …); the key itself is never in it. Logged so a dead key is visible
    // in Vercel logs rather than reading as "card not priced".
    const body = await res.text().catch(() => '');
    console.error('[justtcg] request failed', res.status, body.slice(0, 200));
    return null;
  }
  const data = (await res.json().catch(() => null)) as { data?: Card[] } | null;
  return Array.isArray(data?.data) ? data.data : null;
}

/** The variant to quote: best accepted condition, matching language,
 *  plain printing before special ones, priced. */
function pickVariant(card: Card, lang: 'EN' | 'JP' | undefined): Variant | null {
  const wantLang = apiLanguage(lang);
  const priced = card.variants.filter(
    (v) => typeof v.price === 'number' && Number.isFinite(v.price) && v.price > 0,
  );
  for (const cond of ACCEPTED_CONDITIONS) {
    const inCond = priced.filter((v) => v.condition === cond);
    if (inCond.length === 0) continue;
    // Missing language means English upstream.
    const inLang = inCond.filter((v) => (v.language ?? 'English') === wantLang);
    const pool = inLang.length > 0 ? inLang : inCond;
    pool.sort((a, b) => {
      const pa = a.printing === 'Normal' ? 0 : 1;
      const pb = b.printing === 'Normal' ? 0 : 1;
      return pa - pb;
    });
    return pool[0];
  }
  return null;
}

function toPrice(card: Card, v: Variant): JustTcgPrice {
  return {
    price: Math.round((v.price as number) * 100) / 100,
    condition: v.condition ?? 'Near Mint',
    printing: v.printing ?? 'Normal',
    language: v.language,
    cardUuid: card.uuid,
    tcgplayerId: card.tcgplayerId,
    updatedAt: v.lastUpdated
      ? new Date(v.lastUpdated * 1000).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    priceChange7d: typeof v.priceChange7d === 'number' ? v.priceChange7d : null,
  };
}

/**
 * One live lookup. By TCGPlayer product id when the caller has one —
 * Japanese catalogue ids carry it, and resolveProductId yields it for
 * English cards even when TCGPlayer has no price — otherwise a name +
 * number search scoped to Pokémon and the card's language.
 */
export async function lookupJustTcg(opts: {
  tcgplayerId?: string | null;
  name: string;
  number?: string | null;
  language?: 'EN' | 'JP';
}): Promise<JustTcgPrice | null> {
  if (!justTcgEnabled()) return null;

  if (opts.tcgplayerId) {
    const params = new URLSearchParams({
      tcgplayerId: opts.tcgplayerId,
      condition: ACCEPTED_CONDITIONS.join(','),
      limit: '1',
    });
    const cards = await get(params);
    const card = cards?.[0];
    if (card) {
      const v = pickVariant(card, opts.language);
      if (v) return toPrice(card, v);
    }
    // Fall through to search only if the id lookup found nothing at all:
    // an id that resolves to an unpriced card is an answer, not a miss.
    if (cards && cards.length > 0) return null;
  }

  if (!opts.name) return null;
  const params = new URLSearchParams({
    query: opts.name,
    game: 'pokemon',
    condition: ACCEPTED_CONDITIONS.join(','),
    language: apiLanguage(opts.language),
    limit: '10',
  });
  if (opts.number) params.set('number', normNumber(opts.number));
  const cards = await get(params);
  if (!cards || cards.length === 0) return null;

  // The number is the discriminator: the same name prints many times.
  const want = normNumber(opts.number);
  const candidates = want ? cards.filter((c) => normNumber(c.number) === want) : cards;
  for (const card of candidates.length > 0 ? candidates : []) {
    const v = pickVariant(card, opts.language);
    if (v) return toPrice(card, v);
  }
  return null;
}

/** What the id lookup and the name search each return, before variant
 *  picking, plus the pick — for the cron-secret probe in price.ts. The
 *  shape is trimmed to what a coverage check needs. */
export async function probeJustTcg(opts: {
  tcgplayerId?: string | null;
  name: string;
  number?: string | null;
  language?: 'EN' | 'JP';
}): Promise<{
  byId: ProbeCard[] | null;
  bySearch: ProbeCard[] | null;
  picked: JustTcgPrice | null;
}> {
  const trim = (cards: Card[] | null): ProbeCard[] | null =>
    cards?.map((c) => ({
      uuid: c.uuid,
      name: c.name,
      number: c.number,
      set: c.set ?? null,
      tcgplayerId: c.tcgplayerId,
      variants: c.variants.map((v) => ({
        condition: v.condition,
        printing: v.printing,
        language: v.language,
        price: v.price,
        lastUpdated: v.lastUpdated,
      })),
    })) ?? null;

  let byId: Card[] | null = null;
  if (opts.tcgplayerId) {
    byId = await get(new URLSearchParams({ tcgplayerId: opts.tcgplayerId, limit: '5' }));
  }
  let bySearch: Card[] | null = null;
  if (opts.name) {
    const params = new URLSearchParams({
      query: opts.name,
      game: 'pokemon',
      language: apiLanguage(opts.language),
      limit: '20',
    });
    if (opts.number) params.set('number', normNumber(opts.number));
    bySearch = await get(params);
  }
  const picked = await lookupJustTcg(opts);
  return { byId: trim(byId), bySearch: trim(bySearch), picked };
}

export interface ProbeCard {
  uuid: string;
  name: string;
  number: string | null;
  set: string | null;
  tcgplayerId: string | null;
  variants: Pick<Variant, 'condition' | 'printing' | 'language' | 'price' | 'lastUpdated'>[];
}

/**
 * Batch refresh for the cron: up to `chunk` ids per request (20 on the
 * free plan, 100 on Starter/Pro). Returns one price per id found.
 */
export async function batchJustTcg(
  items: { tcgplayerId?: string; cardId?: string }[],
  chunk = 20,
): Promise<Map<string, JustTcgPrice>> {
  const out = new Map<string, JustTcgPrice>();
  const key = process.env.JUSTTCG_API_KEY;
  if (!key || items.length === 0) return out;

  for (let i = 0; i < items.length; i += chunk) {
    const slice = items.slice(i, i + chunk).map((it) =>
      it.tcgplayerId
        ? { tcgplayerId: it.tcgplayerId, condition: 'NM' }
        : { cardId: it.cardId, condition: 'NM' },
    );
    let res: Response;
    try {
      res = await fetchWithTimeout(`${BASE}/cards`, {
        method: 'POST',
        headers: {
          'x-api-key': key,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify(slice),
      }, 10000);
    } catch {
      continue;
    }
    if (res.status === 429) break;
    if (!res.ok) continue;
    const data = (await res.json().catch(() => null)) as { data?: Card[] } | null;
    for (const card of data?.data ?? []) {
      const v = pickVariant(card, undefined) ?? pickVariant(card, 'JP');
      if (!v) continue;
      const price = toPrice(card, v);
      if (card.tcgplayerId) out.set(card.tcgplayerId, price);
      out.set(card.uuid, price);
    }
  }
  return out;
}

// Vercel Cron — push a story as it lands, not on a daily timer.
//
// Schedule (vercel.json): every 15 minutes. Unlike the on-device check
// (which only runs when the app is open / opportunistically woken), this
// delivers even when the app is fully terminated.
//
// Flow:
//   1. Vercel hits this with `Authorization: Bearer ${CRON_SECRET}`.
//   2. Fetch the latest articles from our own /api/news.
//   3. First ever run SEEDS the state with everything currently in the
//      feed and pushes nothing — otherwise switching to a 15-minute
//      cadence would blast the whole backlog at once.
//   4. Otherwise pick the newest article we have not pushed, subject to
//      the rate limits below, and send it.
//
// Restraint, because this now runs 96 times a day:
//   - MIN_GAP_MS between any two pushes.
//   - MAX_PER_DAY pushes per UTC day.
//   - Quiet hours per device, using the IANA timezone the app reports at
//     registration. A device inside its own quiet hours is skipped for
//     THIS story rather than queued: the next story after it wakes is
//     more useful than a stale one delivered at 08:00. Devices that have
//     not reported a timezone yet (registered before the column existed)
//     are treated as awake; they backfill on next launch.
//
// State lives in one public.push_state row (key='news_push_state') as
// JSON: the last MAX_REMEMBERED pushed URLs plus the rate-limit counters.
// A URL set, not a single "last URL": two of the four feeds sometimes
// omit a publish date, so a timestamp cursor would either skip those
// stories forever or re-push them.
//
// Required env (Vercel project): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// CRON_SECRET.

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

interface Article {
  title: string;
  url: string;
  publishedAt?: string;
}

// Per-message ticket from exp.host — one per message, in message order.
interface ExpoTicket {
  status?: string;
  details?: { error?: string };
}

interface NewsPushState {
  /** Recently pushed article URLs, newest first. */
  urls: string[];
  /** ISO timestamp of the last push that actually went out. */
  lastPushAt?: string;
  /** UTC day the counter below belongs to. */
  day?: string;
  /** Pushes sent on `day`. */
  dayCount?: number;
}

// Length-independent constant-time compare (same as snapshot-prices).
function timingSafeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

const STATE_KEY = 'news_push_state';
const MAX_REMEMBERED = 50;
const MIN_GAP_MS = 45 * 60 * 1000;
const MAX_PER_DAY = 4;
/** Local hours [QUIET_END, QUIET_START) are fair game; the rest is quiet. */
const QUIET_END_HOUR = 8;
const QUIET_START_HOUR = 22;

function parseState(raw: unknown): NewsPushState | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  try {
    const parsed = JSON.parse(raw) as NewsPushState;
    return Array.isArray(parsed.urls) ? parsed : null;
  } catch {
    // A pre-live-news row held a bare URL string, not JSON. Treat it as
    // one remembered URL so the changeover doesn't re-push that story.
    return { urls: [String(raw)] };
  }
}

/** True when the device's own clock is outside quiet hours. */
function isAwake(timezone: string | null | undefined, now: Date): boolean {
  if (!timezone) return true;
  try {
    const hour = Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        hour12: false,
      }).format(now),
    );
    if (!Number.isFinite(hour)) return true;
    return hour >= QUIET_END_HOUR && hour < QUIET_START_HOUR;
  } catch {
    // Unrecognised zone string — never a reason to drop the push.
    return true;
  }
}

export default async function handler(req: Request): Promise<Response> {
  const expected = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization') ?? '';
  if (!expected || !timingSafeEqual(auth, `Bearer ${expected}`)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500 });
  }
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  // 1. Latest articles from our own news aggregator. MUST go through the
  // public production domain: scheduled invocations arrive on the
  // deployment-internal URL, and deriving origin from req.url there made
  // this self-fetch hit Vercel's deployment-protection auth page — empty
  // article list, silent "no article" exit, zero pushes ever sent (the
  // June 14 manual test via the public domain was the only success).
  //
  // /api/news is edge-cached for an hour, and a request from here still
  // goes through that cache — at a 15-minute cadence it would be the
  // difference between "live" and "within the hour". So the URL carries
  // a 5-minute bucket, which misses the CDN on purpose. cache: 'no-store'
  // on top only covers the function's own fetch cache. Every other
  // caller (the app's News tab) keeps the hour.
  const origin = process.env.PUBLIC_ORIGIN ?? 'https://strange-saha.vercel.app';
  const bucket = Math.floor(Date.now() / (5 * 60 * 1000));
  let articles: Article[] = [];
  let newsStatus = 0;
  try {
    const res = await fetch(`${origin}/api/news?limit=20&t=${bucket}`, { cache: 'no-store' });
    newsStatus = res.status;
    if (res.ok) {
      const data = (await res.json()) as { articles?: Article[] };
      articles = Array.isArray(data.articles) ? data.articles : [];
    }
  } catch {
    return json({ error: 'news fetch failed' }, 502);
  }
  const feed = articles.filter((a) => typeof a?.url === 'string' && a.url.length > 0);
  if (feed.length === 0) {
    // Surface WHY the list was empty — a silent 'no article' hid a 401
    // from deployment protection for two months.
    console.error('[news-push] no articles; /api/news status', newsStatus);
    return json({ pushed: 0, note: 'no articles', newsStatus });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // 2. Load state. A swallowed read error read as "never pushed" and
  // re-blasted the same story to every device, so a transient DB blip
  // must fail the run instead.
  const { data: stateRow, error: stateErr } = await admin
    .from('push_state')
    .select('value')
    .eq('key', STATE_KEY)
    .maybeSingle();
  if (stateErr) {
    console.error('[news-push] push_state read failed:', stateErr.message);
    return json({ error: 'state read failed' }, 502);
  }

  const writeState = async (next: NewsPushState) => {
    await admin.from('push_state').upsert(
      { key: STATE_KEY, value: JSON.stringify(next), updated_at: now.toISOString() },
      { onConflict: 'key' },
    );
  };
  const remember = (urls: string[]) => urls.slice(0, MAX_REMEMBERED);

  const state = parseState(stateRow?.value);
  if (!state) {
    // 3. First run on the live cadence: adopt the current feed silently.
    await writeState({ urls: remember(feed.map((a) => a.url)) });
    return json({ pushed: 0, note: 'seeded', seeded: feed.length });
  }

  const pushed = new Set(state.urls);
  const unseen = feed.filter((a) => !pushed.has(a.url));
  if (unseen.length === 0) return json({ pushed: 0, note: 'no new story' });

  // 4. Rate limits. Neither one marks the story seen — it stays eligible
  // for the next run, which is the whole point of a 15-minute cadence.
  const lastPushMs = state.lastPushAt ? Date.parse(state.lastPushAt) : NaN;
  if (Number.isFinite(lastPushMs) && now.getTime() - lastPushMs < MIN_GAP_MS) {
    const waitMin = Math.ceil((MIN_GAP_MS - (now.getTime() - lastPushMs)) / 60000);
    return json({ pushed: 0, note: 'min gap', waitMin, waiting: unseen.length });
  }
  const dayCount = state.day === today ? state.dayCount ?? 0 : 0;
  if (dayCount >= MAX_PER_DAY) {
    return json({ pushed: 0, note: 'daily cap', dayCount, waiting: unseen.length });
  }

  // Newest unseen story wins. Older unseen ones are marked seen below
  // rather than queued: by the time we could send them they are stale,
  // and "live" means the current story, not a backlog.
  const top = [...unseen].sort((a, b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
  })[0];

  // 5. Recipients. PostgREST hard-caps a response at 1000 rows, so page
  // by token: the unbounded select silently skipped every device past the
  // first 1000, and its swallowed error looked the same as "no devices
  // registered".
  const TOKEN_PAGE = 1000;
  const tokens: string[] = [];
  let quietSkipped = 0;
  let after = '';
  for (;;) {
    const { data, error } = await admin
      .from('push_tokens')
      .select('token, timezone')
      .gt('token', after)
      .order('token', { ascending: true })
      .limit(TOKEN_PAGE);
    if (error) {
      console.error('[news-push] push_tokens load failed:', error.message);
      return json({ error: 'token load failed' }, 502);
    }
    const page = (data ?? []) as { token: string; timezone: string | null }[];
    if (page.length === 0) break;
    for (const row of page) {
      if (isAwake(row.timezone, now)) tokens.push(row.token);
      else quietSkipped++;
    }
    after = page[page.length - 1].token;
    if (page.length < TOKEN_PAGE) break;
  }

  let sent = 0;
  let failed = 0;
  const staleTokens: string[] = [];
  for (let i = 0; i < tokens.length; i += 100) {
    const batchTokens = tokens.slice(i, i + 100);
    const batch = batchTokens.map((to) => ({
      to,
      sound: 'default',
      title: 'Pokémon card news',
      body: top.title,
      data: { type: 'news', url: top.url },
    }));
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(batch),
      });
      if (!res.ok) {
        failed += batch.length;
        continue;
      }
      const payload = (await res.json().catch(() => null)) as
        | { data?: ExpoTicket[] }
        | null;
      const tickets = payload && Array.isArray(payload.data) ? payload.data : null;
      if (!tickets) {
        // 200 with an unparseable body — assume the service accepted it.
        sent += batch.length;
        continue;
      }
      for (let j = 0; j < batchTokens.length; j++) {
        const ticket = tickets[j];
        if (ticket?.status === 'ok') {
          sent++;
        } else {
          failed++;
          if (ticket?.details?.error === 'DeviceNotRegistered') {
            staleTokens.push(batchTokens[j]);
          }
        }
      }
    } catch {
      failed += batch.length;
    }
  }

  // Prune tokens Expo says are dead (uninstalled / revoked) so the
  // fan-out doesn't grow unbounded and future runs stop paying for them.
  if (staleTokens.length > 0) {
    await admin.from('push_tokens').delete().in('token', staleTokens);
  }

  // 6. Record what went out — only when it actually went somewhere.
  // Writing this after every batch failed burned the story permanently:
  // nobody got it and no run retried it. Zero eligible devices is not a
  // failure, so it still advances.
  if (sent > 0 || tokens.length === 0) {
    await writeState({
      // Everything currently in the feed is now "seen", so a story that
      // lost the race is never delivered late.
      urls: remember([top.url, ...feed.map((a) => a.url), ...state.urls]),
      lastPushAt: now.toISOString(),
      day: today,
      dayCount: dayCount + 1,
    });
  }

  return json({
    pushed: sent,
    failed,
    removed: staleTokens.length,
    tokens: tokens.length,
    quietSkipped,
    story: top.title,
  });
}

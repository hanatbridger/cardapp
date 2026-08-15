// Vercel Cron — send a remote push when a new top news story lands.
//
// Schedule (vercel.json): a few times a day. Unlike the on-device daily
// news check (which only runs when the app is open / opportunistically
// woken), this delivers even when the app is fully terminated.
//
// Flow:
//   1. Vercel hits this with `Authorization: Bearer ${CRON_SECRET}`.
//   2. Fetch the latest news from our own /api/news, pick the newest
//      article by publishedAt.
//   3. Compare its URL to the last one we pushed (public.push_state row
//      key='last_news_url'). If unchanged, do nothing.
//   4. If it's new, send an Expo push to every registered token
//      (public.push_tokens) and record the new URL.
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

// Length-independent constant-time compare (same as snapshot-prices).
function timingSafeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

const LAST_URL_KEY = 'last_news_url';

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

  // 1. Newest article from our own news aggregator. MUST go through the
  // public production domain: scheduled invocations arrive on the
  // deployment-internal URL, and deriving origin from req.url there made
  // this self-fetch hit Vercel's deployment-protection auth page — empty
  // article list, silent "no article" exit, zero pushes ever sent (the
  // June 14 manual test via the public domain was the only success).
  const origin =
    process.env.PUBLIC_ORIGIN ?? 'https://strange-saha.vercel.app';
  let articles: Article[] = [];
  let newsStatus = 0;
  try {
    const res = await fetch(`${origin}/api/news?limit=20`);
    newsStatus = res.status;
    if (res.ok) {
      const data = (await res.json()) as { articles?: Article[] };
      articles = Array.isArray(data.articles) ? data.articles : [];
    }
  } catch {
    return new Response(JSON.stringify({ error: 'news fetch failed' }), { status: 502 });
  }
  const top = [...articles].sort((a, b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
  })[0];
  if (!top?.url) {
    // Surface WHY the list was empty — a silent 'no article' hid a 401
    // from deployment protection for two months.
    console.error('[news-push] no article; /api/news status', newsStatus);
    return new Response(JSON.stringify({ pushed: 0, note: 'no article', newsStatus }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 2. Already pushed this story? bail.
  const { data: stateRow } = await admin
    .from('push_state')
    .select('value')
    .eq('key', LAST_URL_KEY)
    .maybeSingle();
  if (stateRow?.value === top.url) {
    return new Response(JSON.stringify({ pushed: 0, note: 'no new story' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 3. Fan out an Expo push to every registered token (batched ≤100).
  const { data: tokenRows } = await admin.from('push_tokens').select('token');
  const tokens = (tokenRows ?? []).map((r: { token: string }) => r.token);

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

  // 4. Record the story we just pushed so we don't repeat it.
  await admin
    .from('push_state')
    .upsert({ key: LAST_URL_KEY, value: top.url, updated_at: new Date().toISOString() }, { onConflict: 'key' });

  return new Response(
    JSON.stringify({
      pushed: sent,
      failed,
      removed: staleTokens.length,
      tokens: tokens.length,
      story: top.title,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

// Vercel edge function — store a device's Expo push token so the server
// can send remote push notifications (see api/cron/news-push.ts).
//
// POST /api/push/register
//   { token: string, platform?: 'ios'|'android', timezone?: string }
//
// Upserts into public.push_tokens (token primary key). Idempotent — a
// device re-registering its same token just bumps updated_at.
//
// `timezone` is the device's IANA zone, used by the news cron to hold
// pushes outside that device's waking hours. Optional: devices that
// predate the column send nothing and are treated as always awake until
// they report one.
//
// Required env (Vercel project): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'method not allowed' });

  const body = (await req.json().catch(() => null)) as
    | { token?: unknown; platform?: unknown; timezone?: unknown }
    | null;
  const token = body?.token;
  // Expo push tokens look like ExponentPushToken[xxxxxxxx]. Validate
  // loosely so we never store junk; cap length so junk can't bloat rows.
  if (
    typeof token !== 'string' ||
    !token.startsWith('ExponentPushToken') ||
    token.length > 512
  ) {
    return json(400, { error: 'valid Expo push token required' });
  }
  const platform = body?.platform === 'android' ? 'android' : 'ios';
  // Only store a zone the runtime itself recognises — a junk string would
  // make every quiet-hours check throw and fall back to "awake" forever.
  let timezone: string | null = null;
  const rawTz = body?.timezone;
  if (typeof rawTz === 'string' && rawTz.length > 0 && rawTz.length <= 64) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: rawTz });
      timezone = rawTz;
    } catch {
      timezone = null;
    }
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json(500, { error: 'Server misconfigured' });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Omit timezone rather than writing null when the device didn't send
  // one: an upsert with null would wipe a zone we already know.
  const row: Record<string, string> = {
    token,
    platform,
    updated_at: new Date().toISOString(),
  };
  if (timezone) row.timezone = timezone;
  const { error } = await admin
    .from('push_tokens')
    .upsert(row, { onConflict: 'token' });
  if (error) {
    console.error('[push/register] upsert failed:', error.message);
    return json(500, { error: 'registration failed' });
  }

  return json(200, { ok: true });
}

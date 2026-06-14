// Vercel edge function — store a device's Expo push token so the server
// can send remote push notifications (see api/cron/news-push.ts).
//
// POST /api/push/register  { token: string, platform?: 'ios'|'android' }
//
// Upserts into public.push_tokens (token primary key). Idempotent — a
// device re-registering its same token just bumps updated_at.
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
    | { token?: unknown; platform?: unknown }
    | null;
  const token = body?.token;
  // Expo push tokens look like ExponentPushToken[xxxxxxxx]. Validate
  // loosely so we never store junk.
  if (typeof token !== 'string' || !token.startsWith('ExponentPushToken')) {
    return json(400, { error: 'valid Expo push token required' });
  }
  const platform = body?.platform === 'android' ? 'android' : 'ios';

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json(500, { error: 'Server misconfigured' });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await admin.from('push_tokens').upsert(
    { token, platform, updated_at: new Date().toISOString() },
    { onConflict: 'token' },
  );
  if (error) {
    console.error('[push/register] upsert failed:', error.message);
    return json(500, { error: 'registration failed' });
  }

  return json(200, { ok: true });
}

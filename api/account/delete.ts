// Vercel serverless function (Edge runtime) — permanent account
// deletion for the authenticated user.
//
// Why this exists: Apple Guideline 5.1.1(v) requires apps that
// support account creation to also offer in-app account deletion
// that *removes the account*, not just signs out. Supabase's
// `auth.admin.deleteUser` requires the service-role key, which we
// must never ship to the client — so we proxy through this Edge
// function.
//
// Request:
//   POST /api/account/delete
//   Authorization: Bearer <supabase access token>
//
// Response:
//   204 — user deleted (and any rows in tables with ON DELETE
//         CASCADE on auth.users.id are gone with them)
//   401 — missing / invalid token
//   500 — Supabase admin API failed; user must contact support
//
// Required Vercel environment variables:
//   SUPABASE_URL                  — same project URL the app talks to
//   SUPABASE_SERVICE_ROLE_KEY     — Settings → API → service_role secret
//                                   (NEVER add EXPO_PUBLIC_ prefix)

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    // Don't leak which one is missing — generic 500.
    return json(500, { error: 'Server misconfiguration' });
  }

  // Pull the bearer token from the incoming request.
  const auth = req.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  if (!match) {
    return json(401, { error: 'Missing bearer token' });
  }
  const accessToken = match[1].trim();

  // Verify the token by calling Supabase. Using the service-role
  // client with `getUser(token)` validates the JWT signature against
  // the project's secret and returns the user row in one call.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userResp, error: getErr } = await admin.auth.getUser(accessToken);
  if (getErr || !userResp?.user) {
    return json(401, { error: 'Invalid or expired token' });
  }
  const userId = userResp.user.id;

  // Hard-delete the auth user. shouldSoftDelete=false (the default)
  // removes the row from auth.users, which cascades through any
  // FK with ON DELETE CASCADE pointing at it. Tables without that
  // cascade will orphan rows — make sure your schema has it on
  // every user-owned table (profiles, watchlist, alerts, etc.).
  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) {
    return json(500, {
      error: 'Account deletion failed',
      detail: delErr.message,
    });
  }

  return new Response(null, { status: 204, headers: CORS });
}

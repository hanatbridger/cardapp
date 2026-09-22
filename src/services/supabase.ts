import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client + Apple-Sign-In helper.
 *
 * v1 launch wiring:
 *   - Apple Sign In on the device → Apple identity token
 *   - signInWithIdToken() exchanges that token for a Supabase session
 *   - Session persists via AsyncStorage so a relaunch doesn't kick the
 *     user back to the auth screen
 *   - AppState listener pumps Supabase's auto-refresh while the app is
 *     in the foreground (RN doesn't have window timers backgrounded)
 *
 * Email/password is hidden in the UI for v1 (see AuthForm.appleOnly).
 * This client supports it the moment the prop flips back on — no
 * additional plumbing needed.
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.warn('[supabase] EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY missing. Auth will fail.');
}

/**
 * Signal carried by every /logout and token-refresh request. A sign-out
 * that overruns aborts it, so those requests are cancelled rather than
 * left running: RN Android's OkHttp client has no timeouts, and one that
 * landed after the local clear could re-save the old session (refresh)
 * or wipe a newer sign-in's session (logout).
 */
let sessionRequests = new AbortController();

const SESSION_REQUEST = /\/auth\/v1\/(?:logout|token\?grant_type=refresh_token)/;

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  return input instanceof URL ? input.href : input.url;
}

// Pass-through, plus the sessionRequests signal on session requests.
function supabaseFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (!init?.signal && SESSION_REQUEST.test(requestUrl(input))) {
    return fetch(input, { ...init, signal: sessionRequests.signal });
  }
  return fetch(input, init);
}

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { fetch: supabaseFetch },
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // On web, the Google OAuth redirect returns to our origin with the
    // session in the URL hash — Supabase must parse it, so enable
    // detection there. On native there's no URL bar: Apple Sign In and
    // native Google Sign-In both hand us an ID token directly via
    // signInWithIdToken, so URL detection is irrelevant and we leave it
    // off to skip the probe.
    detectSessionInUrl: Platform.OS === 'web',
  },
});

/**
 * Wire Supabase auto-refresh to AppState so token refresh happens while
 * the app is foregrounded and pauses while backgrounded. Per Supabase
 * docs — without this, refresh attempts fire while RN timers are
 * suspended and silently fail.
 */
export function registerSupabaseAppStateBridge() {
  if (Platform.OS === 'web') return; // browsers handle this themselves
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

/**
 * Exchange an Apple identity token for a Supabase session.
 * Throws on failure — caller decides how to surface to the user.
 */
export async function signInWithApple(identityToken: string, nonce?: string) {
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: identityToken,
    nonce,
  });
  if (error) throw error;
  return data;
}

const SIGN_OUT_TIMEOUT_MS = 8000;

/**
 * Sign out of Supabase + clear the local session.
 *
 * signOut() revokes the session server-side and removes the stored
 * session only once that request succeeds. Offline, or with Supabase
 * unreachable, it resolves { error } and leaves the session on disk, so
 * the next cold start signed the user straight back in. scope 'local'
 * does not avoid this: auth-js still POSTs /logout for it. So on any
 * failure, clear the stored session locally — no network, and it emits
 * SIGNED_OUT exactly as a completed sign-out does. The server-side
 * session is left unrevoked, but nothing on the device holds its tokens.
 *
 * A stalled network (captive portal, Supabase not answering) can hold
 * the request open indefinitely on Android, so the network step gets
 * SIGN_OUT_TIMEOUT_MS before the same local clear. Its requests are
 * aborted then (see sessionRequests), and the signal stays aborted until
 * the abandoned signOut() settles, so none of its retries land after the
 * clear.
 *
 * Throws only if that local clear fails too.
 */
export async function signOutFromSupabase(): Promise<void> {
  const pending = supabase.auth.signOut().catch((e: unknown) => ({
    // Same fallback as a returned error.
    error: e instanceof Error ? e : new Error(String(e)),
  }));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const overrun = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), SIGN_OUT_TIMEOUT_MS);
  });
  const result = await Promise.race([pending, overrun]);
  clearTimeout(timer);
  if (result && !result.error) return;
  if (!result) {
    const aborted = sessionRequests;
    aborted.abort();
    void pending.then(() => {
      if (sessionRequests === aborted) sessionRequests = new AbortController();
    });
  }
  await clearLocalSession();
}

/**
 * auth-js has no public network-free sign-out, so call the private
 * _removeSession() that signOut() itself runs after /logout succeeds
 * (drops the session, code-verifier and user keys, emits SIGNED_OUT).
 * Checked at runtime: if an auth-js upgrade renames it, sign-out throws
 * (and gets reported) instead of silently keeping the session.
 */
async function clearLocalSession(): Promise<void> {
  const auth = supabase.auth as unknown as { _removeSession?: () => Promise<void> };
  if (typeof auth._removeSession !== 'function') {
    throw new Error('Supabase local sign-out unavailable: auth-js _removeSession missing');
  }
  await auth._removeSession();
}

/**
 * Permanently delete the current user's account.
 *
 * Calls the Vercel Edge function /api/account/delete which uses the
 * Supabase service-role key (kept server-side) to call admin.deleteUser.
 * The function authenticates the request with the current session's
 * access token, so this will fail if the user is not signed in.
 *
 * Apple Guideline 5.1.1(v) requires this to actually remove the
 * account, not just sign out. After this resolves successfully, the
 * caller should clear local state and route the user to onboarding.
 *
 * Throws on any failure — caller decides how to surface to the user.
 */
const ACCOUNT_API_ORIGIN = (() => {
  // Mirror src/services/tcgplayer.ts — call the deployed Vercel
  // origin from native + dev-web; use same-origin in prod-web.
  if (Platform.OS !== 'web') {
    return process.env.EXPO_PUBLIC_API_URL ?? 'https://strange-saha.vercel.app';
  }
  if (__DEV__) return 'https://strange-saha.vercel.app';
  return '';
})();

export async function deleteUserAccount(): Promise<void> {
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) throw sessionErr;
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new Error('Not signed in — cannot delete account.');
  }

  const res = await fetch(`${ACCOUNT_API_ORIGIN}/api/account/delete`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({} as { error?: string }));
    throw new Error(
      body?.error ?? `Account deletion failed (HTTP ${res.status})`,
    );
  }
}

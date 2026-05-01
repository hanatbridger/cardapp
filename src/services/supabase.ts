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

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // RN doesn't have a URL bar — the OAuth deep-link flow we use
    // (ASWebAuthenticationSession) doesn't surface query params via
    // location.hash, so let Supabase skip the URL-detection probe.
    detectSessionInUrl: false,
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

/** Sign out of Supabase + clear the local session. */
export async function signOutFromSupabase() {
  await supabase.auth.signOut();
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
    return process.env.EXPO_PUBLIC_API_URL ?? 'https://strange-saha-livid.vercel.app';
  }
  if (__DEV__) return 'https://strange-saha-livid.vercel.app';
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

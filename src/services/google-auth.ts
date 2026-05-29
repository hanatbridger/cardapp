import { Platform } from 'react-native';
import { supabase } from './supabase';
import {
  GOOGLE_WEB_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
} from '../constants/google-auth';

/**
 * Google Sign-In — two platform paths that converge on a Supabase
 * session, mirroring the Apple Sign In split:
 *
 *   iOS  → native @react-native-google-signin SDK returns an ID
 *          token, which we exchange via supabase.auth.signInWithIdToken
 *          (same mechanism as signInWithApple). Fast, no browser
 *          redirect, native account picker.
 *   web  → supabase.auth.signInWithOAuth opens Google's hosted
 *          consent page and redirects back to the app origin. The
 *          session is parsed from the callback URL by the Supabase
 *          client (detectSessionInUrl is enabled on web — see
 *          services/supabase.ts) and surfaced via onAuthStateChange
 *          in app/_layout.tsx.
 *
 * The native module is iOS/Android only — it has no web build — so
 * every reference to it is behind a Platform.OS !== 'web' guard AND a
 * lazy require(), ensuring the web bundle never tries to resolve it.
 */

export interface GoogleProfile {
  email: string;
  displayName: string;
  username: string;
}

let configured = false;

/**
 * Configure the native Google SDK. Call once at startup (app/_layout).
 * No-op on web. Idempotent.
 *
 * webClientId is REQUIRED even on iOS: it sets the audience of the
 * returned ID token to the web client, which is the client Supabase
 * has configured — without it, signInWithIdToken rejects the token.
 */
export function configureGoogleSignin(): void {
  if (Platform.OS === 'web' || configured) return;
  // Lazy require so the web bundle never pulls the native module.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { GoogleSignin } = require('@react-native-google-signin/google-signin');
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    scopes: ['email', 'profile'],
  });
  configured = true;
}

/**
 * Sentinel thrown when the user backs out of the native Google sheet.
 * Callers should treat this as a no-op (no error alert), matching how
 * the Apple flow swallows ERR_REQUEST_CANCELED.
 */
export const GOOGLE_SIGN_IN_CANCELLED = 'GOOGLE_SIGN_IN_CANCELLED';

/**
 * Native (iOS) Google sign-in. Resolves to a GoogleProfile on success.
 * Throws GOOGLE_SIGN_IN_CANCELLED if the user dismisses the sheet, or
 * a real Error on any other failure.
 */
export async function signInWithGoogleNative(): Promise<GoogleProfile> {
  if (Platform.OS === 'web') {
    throw new Error('signInWithGoogleNative called on web');
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@react-native-google-signin/google-signin');
  const { GoogleSignin, statusCodes } = mod;

  try {
    // hasPlayServices is an Android concern; harmless on iOS where it
    // resolves true. Kept so the same path works if we add Android.
    await GoogleSignin.hasPlayServices();
    const result = await GoogleSignin.signIn();

    // v13+ shape: { type: 'success' | 'cancelled', data: {...} }.
    // Older shape: the userInfo object directly. Handle both.
    if (result?.type === 'cancelled') {
      throw new Error(GOOGLE_SIGN_IN_CANCELLED);
    }
    const info = result?.data ?? result;
    const idToken: string | undefined = info?.idToken;
    if (!idToken) {
      throw new Error('Google did not return an ID token.');
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    if (error) throw error;

    const gUser = info?.user ?? {};
    const email: string = gUser.email ?? 'google-user@gmail.com';
    const fullName = [gUser.givenName, gUser.familyName]
      .filter(Boolean)
      .join(' ');
    const displayName: string =
      gUser.name ?? (fullName || email.split('@')[0]);
    const username = '@' + email.split('@')[0];
    return { email, displayName, username };
  } catch (e: any) {
    // Normalize cancellation across SDK versions to the sentinel.
    if (
      e?.message === GOOGLE_SIGN_IN_CANCELLED ||
      e?.code === statusCodes?.SIGN_IN_CANCELLED
    ) {
      throw new Error(GOOGLE_SIGN_IN_CANCELLED);
    }
    throw e;
  }
}

/**
 * Web Google sign-in. Kicks off the Supabase OAuth redirect to
 * Google's consent page. Control leaves the app here; on return the
 * Supabase client parses the session from the callback URL and
 * onAuthStateChange (app/_layout.tsx) populates the local store.
 *
 * Does NOT resolve to a profile — the page navigates away. Throws if
 * Supabase fails to construct the redirect.
 */
export async function signInWithGoogleWeb(): Promise<void> {
  const redirectTo =
    typeof window !== 'undefined' ? window.location.origin : undefined;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) throw error;
}

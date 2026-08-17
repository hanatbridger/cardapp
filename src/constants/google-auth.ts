/**
 * Google OAuth client identifiers.
 *
 * These are PUBLIC identifiers — they ship inside the app bundle and
 * are safe to commit. The matching client SECRET is never here; it
 * lives only in the Supabase dashboard (Auth → Providers → Google),
 * which performs the server-side token exchange.
 *
 * Provisioned in Google Cloud project `cardpulse-498105` (owned by
 * hanwong118@gmail.com — the same login as the Expo/EAS account, so
 * Google Cloud + EAS live under one account). Replaces the earlier
 * project that was created under han@bridgercreative.com.
 *   - Web client    → used by Supabase (web OAuth redirect) AND as the
 *                     native SDK's `webClientId` on BOTH iOS and
 *                     Android so the ID token's audience matches what
 *                     Supabase validates.
 *   - iOS client    → native iOS app, tied to bundle com.getcardpulse.app
 *   - Android client → native Android app, package com.getcardpulse.app
 *                     + signing SHA-1. Not referenced in code (the SDK
 *                     uses webClientId; Google matches the Android
 *                     client by package + SHA-1), so no constant here.
 *   - Reversed iOS  → the iOS client ID with its segments reordered;
 *                     registered as a URL scheme in app.json so the
 *                     Google sign-in sheet can redirect back into the app.
 */

export const GOOGLE_WEB_CLIENT_ID =
  '864170396383-rmk9m09r7uun8r0uirl7kq7v0jqlgasg.apps.googleusercontent.com';

export const GOOGLE_IOS_CLIENT_ID =
  '864170396383-4da514g9biulc0374haev0khj9iing07.apps.googleusercontent.com';

/** Reversed iOS client ID — must match the URL scheme in app.json. */
export const GOOGLE_IOS_REVERSED_CLIENT_ID =
  'com.googleusercontent.apps.864170396383-4da514g9biulc0374haev0khj9iing07';

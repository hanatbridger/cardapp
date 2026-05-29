/**
 * Google OAuth client identifiers.
 *
 * These are PUBLIC identifiers — they ship inside the app bundle and
 * are safe to commit. The matching client SECRET is never here; it
 * lives only in the Supabase dashboard (Auth → Providers → Google),
 * which performs the server-side token exchange.
 *
 * Provisioned in Google Cloud project `cardpulse-497801`:
 *   - Web client    → used by Supabase (web OAuth redirect) AND as the
 *                     native SDK's `webClientId` so the ID token's
 *                     audience matches what Supabase validates.
 *   - iOS client    → native iOS app, tied to bundle com.getcardpulse.app
 *   - Reversed iOS  → the iOS client ID with its segments reordered;
 *                     registered as a URL scheme in app.json so the
 *                     Google sign-in sheet can redirect back into the app.
 */

export const GOOGLE_WEB_CLIENT_ID =
  '839078311479-d5ito7u2cgvh7dbt6b9sa2f1n5c05umf.apps.googleusercontent.com';

export const GOOGLE_IOS_CLIENT_ID =
  '839078311479-8mejfveaj4ne2fc89tlnm5c7pnq8qslq.apps.googleusercontent.com';

/** Reversed iOS client ID — must match the URL scheme in app.json. */
export const GOOGLE_IOS_REVERSED_CLIENT_ID =
  'com.googleusercontent.apps.839078311479-8mejfveaj4ne2fc89tlnm5c7pnq8qslq';

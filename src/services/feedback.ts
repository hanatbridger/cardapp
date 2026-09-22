// In-app feedback submission. Writes to public.feedback and parks any
// screenshot in the private `feedback-shots` bucket (supabase/feedback.sql).
// Ported from pogo-trade-app; CardPulse differences: identity comes from
// the live Supabase session, and there is no demo/no-backend mode.
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { captureException } from './sentry';

export type FeedbackKind = 'bug' | 'idea' | 'general';

/** `screenshotFailed`: the message went in, the attached image did not. */
export type FeedbackResult =
  | { ok: true; screenshotFailed?: boolean }
  | { ok: false; error: string };

const BUCKET = 'feedback-shots';

// Environment facts captured automatically — nothing personal beyond
// what the account already carries.
function context() {
  const g = globalThis as any;
  return {
    platform: Platform.OS,
    route: Platform.OS === 'web' ? g.location?.pathname ?? null : null,
    viewport:
      Platform.OS === 'web' && g.innerWidth
        ? `${g.innerWidth}x${g.innerHeight}`
        : null,
    user_agent: Platform.OS === 'web' ? g.navigator?.userAgent ?? null : null,
    locale: Platform.OS === 'web' ? g.navigator?.language ?? null : null,
  };
}

function readAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the screenshot.'));
    reader.readAsArrayBuffer(blob);
  });
}

// Returns the OBJECT PATH, not a URL — the bucket is private, so viewing
// goes through short-lived signed URLs (admin-feedback.ts).
async function uploadShot(userId: string, uri: string): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  const contentType = blob.type || 'image/jpeg';
  const ext = contentType === 'image/png' ? 'png' : 'jpg';
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  // Native sends raw bytes. storage-js wraps a Blob in FormData, and RN's
  // FormData cannot carry a Blob part: Android rejects the request
  // ("Unrecognized FormData part."). RN's FileReader decodes the blob to
  // an ArrayBuffer, which storage-js sends as the body with contentType.
  const body = Platform.OS === 'web' ? blob : await readAsArrayBuffer(blob);
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}

export async function submitFeedback(input: {
  kind: FeedbackKind;
  message: string;
  screenshot?: string | null;
  username: string;
}): Promise<FeedbackResult> {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user) return { ok: false, error: 'Sign in to send feedback.' };

    // A failed screenshot must not cost the message: an upload error
    // used to throw before the insert, so neither arrived. The row is
    // insert-only for clients (no update grant), so the upload still runs
    // first and the row records why the image is missing.
    let screenshot: string | null = null;
    let screenshotError: string | null = null;
    if (input.screenshot) {
      try {
        screenshot = await uploadShot(user.id, input.screenshot);
      } catch (e: any) {
        const message: string = e?.message || 'Screenshot upload failed';
        screenshotError = message;
        captureException(e instanceof Error ? e : new Error(message), {
          where: 'submitFeedback.uploadShot',
          platform: Platform.OS,
        });
      }
    }

    const { error } = await supabase.from('feedback').insert({
      user_id: user.id,
      username: input.username || user.email || 'unknown',
      kind: input.kind,
      message: input.message,
      screenshot,
      app_version: Constants.expoConfig?.version ?? null,
      context: screenshotError
        ? { ...context(), screenshot_error: screenshotError }
        : context(),
    });
    if (error) throw new Error(error.message);
    return screenshotError ? { ok: true, screenshotFailed: true } : { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Could not send that — please try again.' };
  }
}

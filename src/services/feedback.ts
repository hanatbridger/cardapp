// In-app feedback submission. Writes to public.feedback and parks any
// screenshot in the private `feedback-shots` bucket (supabase/feedback.sql).
// Ported from pogo-trade-app; CardPulse differences: identity comes from
// the live Supabase session, and there is no demo/no-backend mode.
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

export type FeedbackKind = 'bug' | 'idea' | 'general';

export type FeedbackResult = { ok: true } | { ok: false; error: string };

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

// Returns the OBJECT PATH, not a URL — the bucket is private, so viewing
// goes through short-lived signed URLs (admin-feedback.ts).
async function uploadShot(userId: string, uri: string): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  const ext = blob.type === 'image/png' ? 'png' : 'jpg';
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type || 'image/jpeg',
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

    const screenshot = input.screenshot
      ? await uploadShot(user.id, input.screenshot)
      : null;

    const { error } = await supabase.from('feedback').insert({
      user_id: user.id,
      username: input.username || user.email || 'unknown',
      kind: input.kind,
      message: input.message,
      screenshot,
      app_version: Constants.expoConfig?.version ?? null,
      context: context(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Could not send that — please try again.' };
  }
}

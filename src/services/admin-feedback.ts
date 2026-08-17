// Superadmin feedback triage. Every call relies on the RLS policies in
// supabase/feedback.sql — a non-admin session simply sees nothing.
import { supabase } from './supabase';
import type { FeedbackKind } from './feedback';

// The one account allowed to triage. The real gate is the JWT-email
// check inside the RLS policies (public.is_feedback_admin); this
// client-side list only decides whether the inbox row renders.
export const SUPERADMIN_EMAILS = ['hanwong118@gmail.com'] as const;

export function isSuperadminEmail(email?: string | null): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  return SUPERADMIN_EMAILS.some((a) => a === e);
}

export type FeedbackStatus = 'open' | 'triaged' | 'queued' | 'fixed' | 'dismissed';

export interface FeedbackRow {
  id: string;
  user_id: string;
  username: string;
  kind: FeedbackKind;
  message: string;
  screenshot: string | null;
  app_version: string | null;
  context: Record<string, any>;
  status: FeedbackStatus;
  queued_at: string | null;
  admin_note: string | null;
  created_at: string;
}

export const STATUSES: FeedbackStatus[] = ['open', 'triaged', 'queued', 'fixed', 'dismissed'];

export const STATUS_LABEL: Record<FeedbackStatus, string> = {
  open: 'Open',
  triaged: 'Triaged',
  queued: 'Queued for fix',
  fixed: 'Fixed',
  dismissed: 'Dismissed',
};

export const KIND_LABEL: Record<FeedbackKind, string> = {
  bug: 'Bug',
  idea: 'Idea',
  general: 'Feedback',
};

const BUCKET = 'feedback-shots';

/**
 * A viewable URL for a stored screenshot path, or null. The bucket is
 * private, so <Image> needs a short-lived signed URL.
 */
export async function screenshotUrl(stored: string | null): Promise<string | null> {
  if (!stored) return null;
  const marker = `/${BUCKET}/`;
  const i = stored.indexOf(marker);
  const path = i >= 0 ? stored.slice(i + marker.length) : stored;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(decodeURIComponent(path), 3600);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function listFeedback(): Promise<FeedbackRow[]> {
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as FeedbackRow[];
}

export async function setStatus(id: string, status: FeedbackStatus): Promise<void> {
  const patch: Record<string, any> = { status };
  if (status === 'queued') patch.queued_at = new Date().toISOString();
  const { error } = await supabase.from('feedback').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

// The handoff artifact: everything a coding agent needs to work the
// item without the admin re-typing it.
export function taskPrompt(f: FeedbackRow): string {
  const ctx = f.context ?? {};
  return [
    `CardPulse feedback ${f.id}`,
    `Type: ${KIND_LABEL[f.kind]}`,
    `From: ${f.username} (${f.user_id})`,
    `When: ${new Date(f.created_at).toLocaleString()}`,
    ctx.route ? `Route: ${ctx.route}` : null,
    ctx.viewport ? `Viewport: ${ctx.viewport} (${ctx.platform ?? 'web'})` : null,
    f.app_version ? `App version: ${f.app_version}` : null,
    f.screenshot ? `Screenshot: ${f.screenshot}` : null,
    ctx.user_agent ? `User agent: ${ctx.user_agent}` : null,
    f.admin_note ? `Triage note: ${f.admin_note}` : null,
    '',
    'Report:',
    f.message,
    '',
    'Fix this in /Users/hanwong/code/cardApp. Reproduce it first, then keep',
    'the change minimal and in the style of the surrounding code.',
  ].filter((l) => l !== null).join('\n');
}

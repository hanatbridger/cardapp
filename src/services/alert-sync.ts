import { supabase } from './supabase';
import { getRegisteredPushToken } from './push';

/**
 * Best-effort mirror of the user's active price alerts into
 * public.alert_targets, so the daily snapshot cron
 * (api/cron/snapshot-prices.ts) can fire Expo pushes while the app is
 * fully closed.
 *
 * Every helper here is fire-and-forget by design: it NEVER throws and
 * silently no-ops when there is no Supabase session or no registered
 * push token. The local Zustand store stays the source of truth for the
 * in-app experience; a failed sync only means this alert won't get the
 * once-daily server check until the next add/edit re-syncs it.
 */

export interface AlertTargetInput {
  cardId: string;
  cardName: string;
  grade: string;
  type: 'above' | 'below';
  targetPrice: number;
}

async function hasSession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}

/** Create or replace the server-side target for this card+grade. */
export async function syncAlertTarget(alert: AlertTargetInput): Promise<void> {
  try {
    if (!(await hasSession())) return;
    const token = await getRegisteredPushToken();
    if (!token) return;
    // alert_targets has no client UPDATE policy (triggered_at is
    // server-owned), so a PostgREST upsert's ON CONFLICT DO UPDATE path
    // would be rejected by RLS on replace. Delete + insert reaches the
    // same end state under the insert/delete-own policies; RLS scopes
    // the delete to this user's own row.
    await supabase
      .from('alert_targets')
      .delete()
      .eq('card_id', alert.cardId)
      .eq('grade', alert.grade);
    await supabase.from('alert_targets').insert({
      card_id: alert.cardId,
      card_name: alert.cardName,
      grade: alert.grade,
      target_price: alert.targetPrice,
      direction: alert.type,
      push_token: token,
      triggered_at: null,
    });
  } catch {
    // Best-effort — the in-app checker still covers this alert.
  }
}

/** Drop the server-side target for this card+grade (alert removed or spent). */
export async function removeAlertTarget(
  cardId: string,
  grade: string,
): Promise<void> {
  try {
    // Only a session is required: the delete must work even after the
    // push token was cleared, or removed alerts would keep firing
    // server pushes forever.
    if (!(await hasSession())) return;
    await supabase
      .from('alert_targets')
      .delete()
      .eq('card_id', cardId)
      .eq('grade', grade);
  } catch {
    // Best-effort.
  }
}

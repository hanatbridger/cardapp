import { supabase } from './supabase';
import { getRegisteredPushToken } from './push';
import type {
  CardCondition,
  GradingAlertDirection,
} from './grading-verdict';

/**
 * Best-effort mirror of the user's active alerts into
 * public.alert_targets, so the daily snapshot cron
 * (api/cron/snapshot-prices.ts) can fire Expo pushes while the app is
 * fully closed. Covers both kinds: price targets and grading-ROI
 * targets (see supabase/alerts.sql for the row shape).
 *
 * Every helper here is fire-and-forget by design: it NEVER throws and
 * silently no-ops when there is no Supabase session or no registered
 * push token. The local Zustand store stays the source of truth for the
 * in-app experience; a failed sync only means this alert won't get the
 * once-daily server check until the next add/edit re-syncs it.
 */

export type AlertTargetInput =
  | {
      kind: 'price';
      cardId: string;
      cardName: string;
      grade: string;
      type: 'above' | 'below';
      targetPrice: number;
    }
  | {
      kind: 'grading';
      cardId: string;
      cardName: string;
      cardNumber: string;
      condition: CardCondition;
      direction: GradingAlertDirection;
      thresholdNet: number;
    };

export type AlertTargetKind = AlertTargetInput['kind'];

// Grading rows sit on the raw side of the trade; the unique key is
// (user, card, kind, grade), so a fixed grade keeps "one grading rule
// per card" without a second column.
const GRADING_ROW_GRADE = 'UNGRADED';

async function hasSession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}

/** Create or replace the server-side target for this rule key. */
export async function syncAlertTarget(alert: AlertTargetInput): Promise<void> {
  try {
    if (!(await hasSession())) return;
    const token = await getRegisteredPushToken();
    if (!token) return;
    const grade = alert.kind === 'price' ? alert.grade : GRADING_ROW_GRADE;
    // alert_targets has no client UPDATE policy (triggered_at is
    // server-owned), so a PostgREST upsert's ON CONFLICT DO UPDATE path
    // would be rejected by RLS on replace. Delete + insert reaches the
    // same end state under the insert/delete-own policies; RLS scopes
    // the delete to this user's own row.
    await supabase
      .from('alert_targets')
      .delete()
      .eq('card_id', alert.cardId)
      .eq('kind', alert.kind)
      .eq('grade', grade);
    await supabase.from('alert_targets').insert(
      alert.kind === 'price'
        ? {
            kind: 'price',
            card_id: alert.cardId,
            card_name: alert.cardName,
            grade,
            target_price: alert.targetPrice,
            direction: alert.type,
            push_token: token,
            triggered_at: null,
          }
        : {
            kind: 'grading',
            card_id: alert.cardId,
            card_name: alert.cardName,
            grade,
            card_number: alert.cardNumber,
            condition: alert.condition,
            direction: alert.direction,
            threshold_net: alert.thresholdNet,
            push_token: token,
            triggered_at: null,
          },
    );
  } catch {
    // Best-effort — the in-app checker still covers this alert.
  }
}

/** Drop the server-side target for this rule key (alert removed or spent). */
export async function removeAlertTarget(
  cardId: string,
  kind: AlertTargetKind,
  grade?: string,
): Promise<void> {
  try {
    // Only a session is required: the delete must work even after the
    // push token was cleared, or removed alerts would keep firing
    // server pushes forever.
    if (!(await hasSession())) return;
    let query = supabase
      .from('alert_targets')
      .delete()
      .eq('card_id', cardId)
      .eq('kind', kind);
    if (kind === 'price' && grade) query = query.eq('grade', grade);
    await query;
  } catch {
    // Best-effort.
  }
}

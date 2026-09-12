import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStorage } from './safe-storage';
import type { GradeType } from '../constants/grades';
import type {
  CardCondition,
  GradingAlertDirection,
  GradingLetter,
} from '../services/grading-verdict';
// One-way import edge (alerts-store → user-store) for the premium
// read; user-store imports neither store, so no cycle.
import { useUserStore } from './user-store';
// Best-effort server mirror (Supabase alert_targets) so the daily cron
// can push while the app is closed. Every call below is fire-and-forget
// — the helpers never throw and no-op without a session/push token, so
// store actions stay synchronous and offline-safe.
import {
  syncAlertTarget,
  removeAlertTarget,
  type AlertTargetInput,
} from '../services/alert-sync';
// Read-only token lookup (push.ts imports no store, so no cycle) — the
// resync below has to know whether a token exists at all, and which one.
import { getRegisteredPushToken } from '../services/push';

// Free tier keeps up to this many ACTIVE (un-triggered) alerts across
// both kinds; Premium is uncapped. A triggered alert frees its slot
// until reset.
export const MAX_FREE_ALERTS = 3;

export interface PriceAlert {
  /** Absent on rows persisted before grading alerts shipped — read as 'price'. */
  kind?: 'price';
  id: string;
  cardId: string;
  cardName: string;
  grade: GradeType;
  type: 'above' | 'below';
  targetPrice: number;
  triggered: boolean;
  createdAt: string;
}

/**
 * "Tell me when this card becomes (or stops being) worth grading."
 * Evaluated by re-running computeGradingVerdict on live data and
 * comparing expectedNet against thresholdNet in `direction` — see
 * gradingAlertHit in services/grading-verdict.ts. One per card; the
 * condition is baked in at creation.
 */
export interface GradingAlert {
  kind: 'grading';
  id: string;
  cardId: string;
  cardName: string;
  /** With cardName, resolves the collectrics stats (PSA 10 + gem rate). */
  cardNumber: string;
  condition: CardCondition;
  direction: GradingAlertDirection;
  /** USD. 0 = the verdict's own break-even flip. */
  thresholdNet: number;
  triggered: boolean;
  createdAt: string;
}

export type CardAlert = PriceAlert | GradingAlert;

export function isGradingAlert(a: CardAlert): a is GradingAlert {
  return a.kind === 'grading';
}
export function isPriceAlert(a: CardAlert): a is PriceAlert {
  return a.kind !== 'grading';
}

/**
 * A historical record of an alert that fired. Persisted so users can see
 * a notification feed even after they close the in-app modal or background
 * the app. Distinct from the alert (the trigger rule itself).
 */
export interface TriggeredPriceAlert {
  /** Absent on entries persisted before grading alerts shipped — read as 'price'. */
  kind?: 'price';
  id: string;
  alertId: string;
  cardId: string;
  cardName: string;
  grade: GradeType;
  type: 'above' | 'below';
  targetPrice: number;
  triggeredPrice: number;
  triggeredAt: string;
  isRead: boolean;
}

export interface TriggeredGradingAlert {
  kind: 'grading';
  id: string;
  alertId: string;
  cardId: string;
  cardName: string;
  condition: CardCondition;
  direction: GradingAlertDirection;
  thresholdNet: number;
  /** Expected net at the moment of the fire, USD. */
  expectedNet: number;
  letter: GradingLetter;
  triggeredAt: string;
  isRead: boolean;
}

/**
 * A since-added crossing (Premium): a watchlist item moved 20% or more
 * from the price it had when the user added it. Not backed by a rule the
 * user created — the watchlist item carries the baseline and the
 * fired-once flags (watchlist-store `returnAlerted`), so dedupe lives
 * there rather than in this feed.
 */
export interface TriggeredReturnAlert {
  kind: 'return';
  id: string;
  /** Stable per item + direction. */
  alertId: string;
  /** Set for cards; the notification opens the card. */
  cardId?: string;
  /** Set for sealed products; the notification opens the product. */
  productId?: string;
  cardName: string;
  direction: 'up' | 'down';
  pct: number;
  baselinePrice: number;
  currentPrice: number;
  baselineAt: string;
  triggeredAt: string;
  isRead: boolean;
}

export type TriggeredAlert = TriggeredPriceAlert | TriggeredGradingAlert | TriggeredReturnAlert;

/** What a checker hands the store when an alert crosses its line. */
export type AlertFire =
  | { kind: 'price'; alert: PriceAlert; currentPrice: number }
  | {
      kind: 'grading';
      alert: GradingAlert;
      expectedNet: number;
      letter: GradingLetter;
    };

/** Why addAlert could not be created (for surfacing the right UI). */
export type AddAlertResult =
  | { ok: true; replaced: boolean }
  | { ok: false; reason: 'cap' };

export type NewPriceAlert = Omit<PriceAlert, 'id' | 'kind' | 'triggered' | 'createdAt'>;
export type NewGradingAlert = Omit<GradingAlert, 'id' | 'kind' | 'triggered' | 'createdAt'>;

interface AlertsStore {
  alerts: CardAlert[];
  triggered: TriggeredAlert[];
  /**
   * Create or REPLACE the price alert for a given card+grade. Upsert,
   * not append: a card+grade has at most one active rule, so re-setting
   * an alert on the same card overwrites rather than stacking duplicates
   * (the old behaviour silently piled up identical rules). Returns
   * { ok:false, reason:'cap' } when a free user is at MAX_FREE_ALERTS
   * active alerts and this would be a NEW one (replacements always
   * allowed). Premium is uncapped.
   */
  addAlert: (alert: NewPriceAlert) => AddAlertResult;
  /** Same upsert + cap semantics, keyed on card only (one grading rule per card). */
  addGradingAlert: (alert: NewGradingAlert) => AddAlertResult;
  /** Active (un-triggered) price alert for this card+grade, if any. */
  getActiveAlert: (cardId: string, grade: GradeType) => PriceAlert | undefined;
  /** Active (un-triggered) grading alert for this card, if any. */
  getActiveGradingAlert: (cardId: string) => GradingAlert | undefined;
  /** Count of active (un-triggered) alerts — what the free cap limits. */
  activeAlertCount: () => number;
  /** Whether a NEW alert can be created right now (premium or under cap). */
  canAddAlert: () => boolean;
  removeAlert: (id: string) => void;
  markTriggered: (id: string) => void;
  /**
   * Record that an alert fired. Idempotent: returns null (and does
   * nothing) if the alert is already triggered in current store state,
   * so overlapping foreground/background checks evaluating the same
   * pre-trigger snapshot can't double-record or fire two banners.
   */
  recordTriggered: (fire: AlertFire) => TriggeredAlert | null;
  /** Prepend a since-added crossing to the feed. Callers dedupe first. */
  recordReturnAlert: (
    fire: Omit<TriggeredReturnAlert, 'id' | 'kind' | 'triggeredAt' | 'isRead'>,
  ) => TriggeredReturnAlert;
  markTriggeredRead: (id: string) => void;
  markAllTriggeredRead: () => void;
  clearTriggered: () => void;
  resetAlertTriggered: (id: string) => void;
}

const newId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function toTarget(a: CardAlert): AlertTargetInput {
  return isGradingAlert(a)
    ? {
        kind: 'grading',
        cardId: a.cardId,
        cardName: a.cardName,
        cardNumber: a.cardNumber,
        condition: a.condition,
        direction: a.direction,
        thresholdNet: a.thresholdNet,
      }
    : {
        kind: 'price',
        cardId: a.cardId,
        cardName: a.cardName,
        grade: a.grade,
        type: a.type,
        targetPrice: a.targetPrice,
      };
}

function syncTarget(a: CardAlert): void {
  void syncAlertTarget(toTarget(a)).catch(() => {});
}

function dropTarget(a: CardAlert): void {
  void (isGradingAlert(a)
    ? removeAlertTarget(a.cardId, 'grading')
    : removeAlertTarget(a.cardId, 'price', a.grade)
  ).catch(() => {});
}

type UpsertResult =
  | { ok: true; alerts: CardAlert[]; entry: CardAlert; replaced: boolean }
  | { ok: false; reason: 'cap' };

/**
 * Shared upsert for both alert kinds. Two notions of "existing" for the
 * same rule key:
 *  - activeExisting: an un-triggered alert. Editing it is cap-exempt and
 *    keeps its slot.
 *  - anyExisting: includes a previously-TRIGGERED alert. Re-arming one
 *    must REUSE its row, not append a second — otherwise the spent entry
 *    leaks into alerts[] forever (resetAlertTriggered is never called
 *    and the UI only ever removes the active one), growing the array
 *    without bound across fire/re-arm cycles.
 * The cap applies whenever this would become a NEW active alert — i.e.
 * anything except editing an already-active one. Re-arming a spent
 * alert is a new active alert, so it is still cap-checked.
 */
function upsertAlert(
  alerts: CardAlert[],
  matches: (a: CardAlert) => boolean,
  build: (id: string, createdAt: string) => CardAlert,
): UpsertResult {
  const activeExisting = alerts.find((a) => matches(a) && !a.triggered);
  const anyExisting = activeExisting ?? alerts.find(matches);
  const isPremium = useUserStore.getState().isPremium;
  const activeCount = alerts.filter((a) => !a.triggered).length;

  if (!activeExisting && !isPremium && activeCount >= MAX_FREE_ALERTS) {
    return { ok: false, reason: 'cap' };
  }

  // Keep createdAt only when editing a still-active alert; a re-arm of
  // a spent alert is a fresh arm, so stamp it anew.
  const entry = build(
    anyExisting?.id ?? newId('alert'),
    activeExisting?.createdAt ?? new Date().toISOString(),
  );
  return {
    ok: true,
    replaced: Boolean(activeExisting),
    entry,
    alerts: anyExisting
      ? alerts.map((a) => (a.id === anyExisting.id ? entry : a))
      : [...alerts, entry],
  };
}

export const useAlertsStore = create<AlertsStore>()(
  persist(
    (set, get) => ({
      alerts: [],
      triggered: [],

      getActiveAlert: (cardId, grade) =>
        get().alerts.find(
          (a): a is PriceAlert =>
            isPriceAlert(a) && a.cardId === cardId && a.grade === grade && !a.triggered,
        ),

      getActiveGradingAlert: (cardId) =>
        get().alerts.find(
          (a): a is GradingAlert =>
            isGradingAlert(a) && a.cardId === cardId && !a.triggered,
        ),

      activeAlertCount: () => get().alerts.filter((a) => !a.triggered).length,

      canAddAlert: () =>
        useUserStore.getState().isPremium ||
        get().alerts.filter((a) => !a.triggered).length < MAX_FREE_ALERTS,

      addAlert: (alert) => {
        const result = upsertAlert(
          get().alerts,
          (a) => isPriceAlert(a) && a.cardId === alert.cardId && a.grade === alert.grade,
          (id, createdAt) => ({ ...alert, kind: 'price', id, triggered: false, createdAt }),
        );
        if (!result.ok) return result;
        set({ alerts: result.alerts });
        syncTarget(result.entry);
        return { ok: true, replaced: result.replaced };
      },

      addGradingAlert: (alert) => {
        const result = upsertAlert(
          get().alerts,
          (a) => isGradingAlert(a) && a.cardId === alert.cardId,
          (id, createdAt) => ({ ...alert, kind: 'grading', id, triggered: false, createdAt }),
        );
        if (!result.ok) return result;
        set({ alerts: result.alerts });
        syncTarget(result.entry);
        return { ok: true, replaced: result.replaced };
      },

      removeAlert: (id) => {
        const removed = get().alerts.find((a) => a.id === id);
        set((state) => ({
          alerts: state.alerts.filter((a) => a.id !== id),
        }));
        if (removed) dropTarget(removed);
      },

      markTriggered: (id) => {
        const spent = get().alerts.find((a) => a.id === id);
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id ? { ...a, triggered: true } : a,
          ),
        }));
        // Spent locally — clear the server row so the daily cron can't
        // double-push an alert the in-app checker already fired.
        if (spent) dropTarget(spent);
      },

      resetAlertTriggered: (id) => {
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id ? { ...a, triggered: false } : a,
          ),
        }));
        const rearmed = get().alerts.find((a) => a.id === id);
        if (rearmed) syncTarget(rearmed);
      },

      recordTriggered: (fire) => {
        // Idempotency guard: if a concurrent check already flipped this
        // alert to triggered, skip — don't push a duplicate history
        // entry or signal the caller to fire a second notification.
        const current = get().alerts.find((a) => a.id === fire.alert.id);
        if (current && current.triggered) return null;

        const base = {
          id: newId('t'),
          alertId: fire.alert.id,
          cardId: fire.alert.cardId,
          cardName: fire.alert.cardName,
          triggeredAt: new Date().toISOString(),
          isRead: false,
        };
        const entry: TriggeredAlert =
          fire.kind === 'grading'
            ? {
                ...base,
                kind: 'grading',
                condition: fire.alert.condition,
                direction: fire.alert.direction,
                thresholdNet: fire.alert.thresholdNet,
                expectedNet: fire.expectedNet,
                letter: fire.letter,
              }
            : {
                ...base,
                kind: 'price',
                grade: fire.alert.grade,
                type: fire.alert.type,
                targetPrice: fire.alert.targetPrice,
                triggeredPrice: fire.currentPrice,
              };
        set((state) => ({
          triggered: [entry, ...state.triggered].slice(0, 100),
          alerts: state.alerts.map((a) =>
            a.id === fire.alert.id ? { ...a, triggered: true } : a,
          ),
        }));
        // Spent — clear the server row so the daily cron can't push a
        // duplicate for an alert that already fired in-app.
        dropTarget(fire.alert);
        return entry;
      },

      recordReturnAlert: (fire) => {
        const entry: TriggeredReturnAlert = {
          ...fire,
          kind: 'return',
          id: newId('t'),
          triggeredAt: new Date().toISOString(),
          isRead: false,
        };
        set((state) => ({ triggered: [entry, ...state.triggered].slice(0, 100) }));
        return entry;
      },

      markTriggeredRead: (id) =>
        set((state) => ({
          triggered: state.triggered.map((t) =>
            t.id === id ? { ...t, isRead: true } : t,
          ),
        })),

      markAllTriggeredRead: () =>
        set((state) => ({
          triggered: state.triggered.map((t) => ({ ...t, isRead: true })),
        })),

      clearTriggered: () => set({ triggered: [] }),
    }),
    {
      name: 'cardpulse-alerts',
      storage: createJSONStorage(() => safeStorage),
    },
  ),
);

// Which push token the alerts in this process were last mirrored under.
// In-memory on purpose: a sync that quietly failed (alert-sync swallows
// everything) gets another attempt on the next launch instead of being
// marked done forever.
let resyncedForToken: string | null = null;
let resyncInFlight: Promise<void> | null = null;

async function runResyncAlertTargets(force: boolean): Promise<void> {
  const token = await getRegisteredPushToken();
  if (!token) return;
  if (!force && resyncedForToken === token) return;

  // On a cold start the persisted alerts may not be read back yet, and an
  // empty alerts[] here would look like "nothing to mirror".
  if (!useAlertsStore.persist.hasHydrated()) {
    let unsub: (() => void) | undefined;
    await new Promise<void>((resolve) => {
      unsub = useAlertsStore.persist.onFinishHydration(() => resolve());
    });
    unsub?.();
  }

  for (const alert of useAlertsStore.getState().alerts) {
    if (alert.triggered) continue;
    // Re-read: an in-app check may have spent this alert (and deleted its
    // server row) while an earlier insert was in flight, and re-inserting
    // would let the cron push an alert that already fired.
    const live = useAlertsStore.getState().alerts.find((a) => a.id === alert.id);
    if (!live || live.triggered) continue;
    await syncAlertTarget(toTarget(live));
  }
  resyncedForToken = token;
}

/**
 * Mirror every active alert into alert_targets again.
 *
 * syncAlertTarget no-ops without a registered push token, and the alert
 * flows ask for notification permission AFTER creating the alert — so a
 * user's first alert never reached the server and the daily cron could
 * never push it. Nothing re-synced it later, and rows also kept a dead
 * token after Expo rotated one. Call this once push registration has had
 * a chance to land (app startup, after a permission grant, on sign-in);
 * it runs at most once per token per launch.
 *
 * @param force re-run even if this token was already synced this launch
 *   (sign-in: the earlier pass had no Supabase session to write with).
 */
export function resyncAlertTargets(force = false): Promise<void> {
  // Startup and the News tab can both fire on one launch; share a single
  // pass so the per-alert delete + insert pairs can't interleave.
  if (!resyncInFlight) {
    resyncInFlight = runResyncAlertTargets(force).finally(() => {
      resyncInFlight = null;
    });
  }
  return resyncInFlight;
}

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GradeType } from '../constants/grades';
// One-way import edge (alerts-store → user-store) for the premium
// read; user-store imports neither store, so no cycle.
import { useUserStore } from './user-store';
// Best-effort server mirror (Supabase alert_targets) so the daily cron
// can push while the app is closed. Every call below is fire-and-forget
// — the helpers never throw and no-op without a session/push token, so
// store actions stay synchronous and offline-safe.
import { syncAlertTarget, removeAlertTarget } from '../services/alert-sync';

// Free tier keeps up to this many ACTIVE (un-triggered) alerts;
// Premium is uncapped. A triggered alert frees its slot until reset.
export const MAX_FREE_ALERTS = 3;

export interface PriceAlert {
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
 * A historical record of an alert that fired. Persisted so users can see
 * a notification feed even after they close the in-app modal or background
 * the app. Distinct from PriceAlert (the trigger rule itself).
 */
export interface TriggeredAlert {
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

/** Why addAlert could not be created (for surfacing the right UI). */
export type AddAlertResult =
  | { ok: true; replaced: boolean }
  | { ok: false; reason: 'cap' };

interface AlertsStore {
  alerts: PriceAlert[];
  triggered: TriggeredAlert[];
  /**
   * Create or REPLACE the alert for a given card+grade. Upsert, not
   * append: a card+grade has at most one active rule, so re-setting an
   * alert on the same card overwrites rather than stacking duplicates
   * (the old behaviour silently piled up identical rules). Returns
   * { ok:false, reason:'cap' } when a free user is at MAX_FREE_ALERTS
   * active alerts and this would be a NEW one (replacements always
   * allowed). Premium is uncapped.
   */
  addAlert: (alert: Omit<PriceAlert, 'id' | 'triggered' | 'createdAt'>) => AddAlertResult;
  /** Active (un-triggered) alert for this card+grade, if any. */
  getActiveAlert: (cardId: string, grade: GradeType) => PriceAlert | undefined;
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
  recordTriggered: (
    alert: PriceAlert,
    triggeredPrice: number,
  ) => TriggeredAlert | null;
  markTriggeredRead: (id: string) => void;
  markAllTriggeredRead: () => void;
  clearTriggered: () => void;
  resetAlertTriggered: (id: string) => void;
}

export const useAlertsStore = create<AlertsStore>()(
  persist(
    (set, get) => ({
      alerts: [],
      triggered: [],

      getActiveAlert: (cardId, grade) =>
        get().alerts.find(
          (a) => a.cardId === cardId && a.grade === grade && !a.triggered,
        ),

      activeAlertCount: () => get().alerts.filter((a) => !a.triggered).length,

      canAddAlert: () =>
        useUserStore.getState().isPremium ||
        get().alerts.filter((a) => !a.triggered).length < MAX_FREE_ALERTS,

      addAlert: (alert) => {
        const { alerts } = get();
        // Two notions of "existing" for the same card+grade:
        //  - activeExisting: an un-triggered alert. Editing it (changing
        //    the target price) is cap-exempt and keeps its slot.
        //  - anyExisting: includes a previously-TRIGGERED alert. Re-arming
        //    one must REUSE its row, not append a second — otherwise the
        //    spent entry leaks into alerts[] forever (resetAlertTriggered
        //    is never called and the UI only ever removes the active one),
        //    growing the array without bound across fire/re-arm cycles.
        const activeExisting = alerts.find(
          (a) => a.cardId === alert.cardId && a.grade === alert.grade && !a.triggered,
        );
        const anyExisting =
          activeExisting ??
          alerts.find((a) => a.cardId === alert.cardId && a.grade === alert.grade);
        const isPremium = useUserStore.getState().isPremium;
        const activeCount = alerts.filter((a) => !a.triggered).length;

        // The cap applies whenever this would become a NEW active alert —
        // i.e. anything except editing an already-active one. Re-arming a
        // spent alert is a new active alert, so it is still cap-checked.
        if (!activeExisting && !isPremium && activeCount >= MAX_FREE_ALERTS) {
          return { ok: false, reason: 'cap' };
        }

        const entry: PriceAlert = {
          ...alert,
          id: anyExisting?.id ?? `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          triggered: false,
          // Keep createdAt only when editing a still-active alert; a
          // re-arm of a spent alert is a fresh arm, so stamp it anew.
          createdAt: activeExisting?.createdAt ?? new Date().toISOString(),
        };

        set({
          alerts: anyExisting
            ? alerts.map((a) => (a.id === anyExisting.id ? entry : a))
            : [...alerts, entry],
        });
        void syncAlertTarget({
          cardId: entry.cardId,
          cardName: entry.cardName,
          grade: entry.grade,
          type: entry.type,
          targetPrice: entry.targetPrice,
        }).catch(() => {});
        return { ok: true, replaced: Boolean(activeExisting) };
      },

      removeAlert: (id) => {
        const removed = get().alerts.find((a) => a.id === id);
        set((state) => ({
          alerts: state.alerts.filter((a) => a.id !== id),
        }));
        if (removed) {
          void removeAlertTarget(removed.cardId, removed.grade).catch(() => {});
        }
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
        if (spent) {
          void removeAlertTarget(spent.cardId, spent.grade).catch(() => {});
        }
      },

      resetAlertTriggered: (id) => {
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id ? { ...a, triggered: false } : a,
          ),
        }));
        const rearmed = get().alerts.find((a) => a.id === id);
        if (rearmed) {
          void syncAlertTarget({
            cardId: rearmed.cardId,
            cardName: rearmed.cardName,
            grade: rearmed.grade,
            type: rearmed.type,
            targetPrice: rearmed.targetPrice,
          }).catch(() => {});
        }
      },

      recordTriggered: (alert, triggeredPrice) => {
        // Idempotency guard: if a concurrent check already flipped this
        // alert to triggered, skip — don't push a duplicate history
        // entry or signal the caller to fire a second notification.
        const current = get().alerts.find((a) => a.id === alert.id);
        if (current && current.triggered) return null;

        const entry: TriggeredAlert = {
          id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          alertId: alert.id,
          cardId: alert.cardId,
          cardName: alert.cardName,
          grade: alert.grade,
          type: alert.type,
          targetPrice: alert.targetPrice,
          triggeredPrice,
          triggeredAt: new Date().toISOString(),
          isRead: false,
        };
        set((state) => ({
          triggered: [entry, ...state.triggered].slice(0, 100),
          alerts: state.alerts.map((a) =>
            a.id === alert.id ? { ...a, triggered: true } : a,
          ),
        }));
        // Spent — clear the server row so the daily cron can't push a
        // duplicate for an alert that already fired in-app.
        void removeAlertTarget(alert.cardId, alert.grade).catch(() => {});
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
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

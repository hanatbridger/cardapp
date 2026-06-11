import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GradeType } from '../constants/grades';
// One-way import edge (alerts-store → user-store) for the premium
// read; user-store imports neither store, so no cycle.
import { useUserStore } from './user-store';

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
  recordTriggered: (
    alert: PriceAlert,
    triggeredPrice: number,
  ) => TriggeredAlert;
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
        const existing = alerts.find(
          (a) =>
            a.cardId === alert.cardId &&
            a.grade === alert.grade &&
            !a.triggered,
        );
        const isPremium = useUserStore.getState().isPremium;
        const activeCount = alerts.filter((a) => !a.triggered).length;

        // A replacement (same card+grade already has an active alert)
        // never counts against the cap; only a genuinely NEW alert does.
        if (!existing && !isPremium && activeCount >= MAX_FREE_ALERTS) {
          return { ok: false, reason: 'cap' };
        }

        const entry: PriceAlert = {
          ...alert,
          id: existing?.id ?? `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          triggered: false,
          createdAt: existing?.createdAt ?? new Date().toISOString(),
        };

        set({
          alerts: existing
            ? alerts.map((a) => (a.id === existing.id ? entry : a))
            : [...alerts, entry],
        });
        return { ok: true, replaced: Boolean(existing) };
      },

      removeAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.filter((a) => a.id !== id),
        })),

      markTriggered: (id) =>
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id ? { ...a, triggered: true } : a,
          ),
        })),

      resetAlertTriggered: (id) =>
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id ? { ...a, triggered: false } : a,
          ),
        })),

      recordTriggered: (alert, triggeredPrice) => {
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

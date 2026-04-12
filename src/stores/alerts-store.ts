import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GradeType } from '../constants/grades';

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

interface AlertsStore {
  alerts: PriceAlert[];
  triggered: TriggeredAlert[];
  addAlert: (alert: Omit<PriceAlert, 'id' | 'triggered' | 'createdAt'>) => void;
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
    (set) => ({
      alerts: [],
      triggered: [],

      addAlert: (alert) =>
        set((state) => ({
          alerts: [
            ...state.alerts,
            {
              ...alert,
              id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              triggered: false,
              createdAt: new Date().toISOString(),
            },
          ],
        })),

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

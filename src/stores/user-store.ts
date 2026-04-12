import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GradeType } from '../constants/grades';
import { setUser as setSentryUser } from '../services/sentry';

interface UserProfile {
  displayName: string;
  username: string;
  email: string;
}

interface UserPreferences {
  theme: 'system' | 'light' | 'dark';
  hapticEnabled: boolean;
  defaultGrade: GradeType;
  notificationsEnabled: boolean;
}

interface UserStore {
  profile: UserProfile;
  preferences: UserPreferences;
  recentSearches: string[];
  hasCompletedOnboarding: boolean;
  isAuthenticated: boolean;
  isPremium: boolean;
  updateProfile: (updates: Partial<UserProfile>) => void;
  updatePreference: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K],
  ) => void;
  addRecentSearch: (query: string) => void;
  removeRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  completeOnboarding: () => void;
  signIn: (profile: Partial<UserProfile>) => void;
  setPremium: (active: boolean) => void;
  signOut: () => void;
  deleteAccount: () => void;
}

const DEFAULT_PROFILE: UserProfile = {
  displayName: 'Han Wong',
  username: '@hanwong',
  email: 'han@bridgercreative.com',
};

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      profile: DEFAULT_PROFILE,
      preferences: {
        theme: 'system',
        hapticEnabled: true,
        defaultGrade: 'PSA10',
        notificationsEnabled: true,
      },
      recentSearches: [],
      hasCompletedOnboarding: false,
      isAuthenticated: false,
      isPremium: false,

      updateProfile: (updates) =>
        set((state) => ({
          profile: { ...state.profile, ...updates },
        })),

      updatePreference: (key, value) =>
        set((state) => ({
          preferences: { ...state.preferences, [key]: value },
        })),

      addRecentSearch: (query) =>
        set((state) => ({
          recentSearches: [
            query,
            ...state.recentSearches.filter((s) => s !== query),
          ].slice(0, 10),
        })),

      removeRecentSearch: (query) =>
        set((state) => ({
          recentSearches: state.recentSearches.filter((s) => s !== query),
        })),

      clearRecentSearches: () => set({ recentSearches: [] }),

      completeOnboarding: () => set({ hasCompletedOnboarding: true }),

      signIn: (profile) => {
        setSentryUser({ email: profile.email, username: profile.username });
        set((state) => ({
          isAuthenticated: true,
          profile: { ...state.profile, ...profile },
        }));
      },

      setPremium: (active) => set({ isPremium: active }),

      signOut: () => {
        setSentryUser(null);
        set({
          profile: DEFAULT_PROFILE,
          recentSearches: [],
          isAuthenticated: false,
          isPremium: false,
        });
      },

      deleteAccount: () => {
        setSentryUser(null);
        // Clear all persisted data — AsyncStorage keys are wiped by
        // resetting every store to defaults. In production this would
        // also call a backend endpoint to delete server-side data.
        set({
          profile: { displayName: '', username: '', email: '' },
          preferences: {
            theme: 'system',
            hapticEnabled: true,
            defaultGrade: 'PSA10',
            notificationsEnabled: true,
          },
          recentSearches: [],
          hasCompletedOnboarding: false,
          isAuthenticated: false,
          isPremium: false,
        });
      },
    }),
    {
      name: 'cardpulse-user',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

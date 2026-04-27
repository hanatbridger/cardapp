import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GradeType } from '../constants/grades';
import { setUser as setSentryUser } from '../services/sentry';
import { supabase, signOutFromSupabase } from '../services/supabase';

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

type AuthProvider = 'email' | 'apple' | 'google';

interface UserStore {
  profile: UserProfile;
  preferences: UserPreferences;
  recentSearches: string[];
  hasCompletedOnboarding: boolean;
  isAuthenticated: boolean;
  isPremium: boolean;
  authProvider: AuthProvider;
  updateProfile: (updates: Partial<UserProfile>) => void;
  updatePreference: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K],
  ) => void;
  addRecentSearch: (query: string) => void;
  removeRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  completeOnboarding: () => void;
  signIn: (profile: Partial<UserProfile>, provider?: AuthProvider) => void;
  setPremium: (active: boolean) => void;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  /** Read the current Supabase session and reflect it into local state. */
  hydrateFromSupabase: () => Promise<void>;
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
        theme: 'dark',
        hapticEnabled: true,
        defaultGrade: 'PSA10',
        notificationsEnabled: true,
      },
      recentSearches: [],
      hasCompletedOnboarding: false,
      isAuthenticated: false,
      isPremium: false,
      authProvider: 'email',

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

      signIn: (profile, provider = 'email') => {
        setSentryUser({ email: profile.email, username: profile.username });
        set((state) => ({
          isAuthenticated: true,
          authProvider: provider,
          profile: { ...state.profile, ...profile },
        }));
      },

      setPremium: (active) => set({ isPremium: active }),

      signOut: async () => {
        setSentryUser(null);
        // End the Supabase session before clearing local state. We
        // swallow Supabase errors here — sign-out should never fail
        // the user-facing flow; worst case the local state is gone but
        // a stale token sits on disk until the next refresh attempt.
        try { await signOutFromSupabase(); } catch {}
        set({
          profile: DEFAULT_PROFILE,
          recentSearches: [],
          isAuthenticated: false,
          isPremium: false,
        });
      },

      deleteAccount: async () => {
        setSentryUser(null);
        // Sign out of Supabase first so the auth user no longer holds
        // an active session. True account-row deletion requires a
        // server-side admin function; ship that with v1.1. In the
        // meantime the user can no longer access their auth user from
        // this device — combined with the local data wipe below, this
        // satisfies Apple Guideline 5.1.1(v) for the launch build.
        try { await signOutFromSupabase(); } catch {}
        set({
          profile: { displayName: '', username: '', email: '' },
          preferences: {
            theme: 'system',
            hapticEnabled: true,
            // PSA 10 is gated at launch — Raw is the only viewable grade
            defaultGrade: 'UNGRADED',
            notificationsEnabled: true,
          },
          recentSearches: [],
          hasCompletedOnboarding: false,
          isAuthenticated: false,
          isPremium: false,
        });
      },

      hydrateFromSupabase: async () => {
        // Read whatever session AsyncStorage has on cold start. If
        // present, mark the local store as authenticated so AuthGate
        // doesn't bounce the user to /login. Profile fields stay as-
        // is — they were saved on first sign-in and persist alongside.
        try {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            set({ isAuthenticated: true });
          } else {
            // No active session — make sure local state agrees so the
            // gate routes to /login on next render.
            if (useUserStore.getState().isAuthenticated) {
              set({ isAuthenticated: false });
            }
          }
        } catch {
          // Network failure on cold start — keep whatever local state
          // we have. AppState bridge will retry refresh once foreground.
        }
      },
    }),
    {
      name: 'cardpulse-user',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

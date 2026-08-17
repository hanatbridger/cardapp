import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GradeType } from '../constants/grades';
import type { CurrencyCode } from '../constants/currencies';
import { setUser as setSentryUser } from '../services/sentry';
import { supabase, signOutFromSupabase, deleteUserAccount } from '../services/supabase';

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
  /** Display currency — prices are sourced in USD and converted to this. */
  currency: CurrencyCode;
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

// Blank initial state — populated by signIn() once the user
// authenticates (Apple Sign In on iOS, or whatever else ships in
// future). Earlier this defaulted to the dev's personal info, which
// was fine on iOS because the auth gate replaced it before any
// render, but the web build skips the auth gate for dev preview
// purposes and leaked the dev's name + email to anyone visiting
// strange-saha.vercel.app.
const DEFAULT_PROFILE: UserProfile = {
  displayName: '',
  username: '',
  email: '',
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
        currency: 'USD',
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
        // Apple Guideline 5.1.1(v): account deletion must actually
        // remove the account, not just sign out. Call the server
        // Edge function which uses service-role to delete the auth
        // user. If it fails, propagate so the UI can show an error
        // and let the user retry — do NOT silently degrade to a
        // local-only wipe (that would leave the auth row alive).
        await deleteUserAccount();
        setSentryUser(null);
        // Server delete also invalidates the session; sign out of
        // the local client to clear AsyncStorage. Errors here are
        // best-effort — the auth row is already gone.
        try { await signOutFromSupabase(); } catch {}
        set({
          profile: { displayName: '', username: '', email: '' },
          preferences: {
            // Dark is the app default everywhere — first install and
            // post-deletion reset must agree or deleting an account
            // silently flips the theme.
            theme: 'dark',
            hapticEnabled: true,
            // PSA 10 is gated at launch — Raw is the only viewable grade
            defaultGrade: 'UNGRADED',
            notificationsEnabled: true,
            currency: 'USD',
          },
          recentSearches: [],
          // Leave hasCompletedOnboarding alone. Resetting it makes
          // AuthGate force-replace to /onboarding (it prioritizes the
          // onboarding gate), overriding the profile screen's
          // router.replace to /login — so a user who just deleted their
          // account would be dumped back into the 3-slide carousel
          // instead of the login screen.
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
      // Deep-merge preferences: the default shallow merge would replace
      // the whole nested object with the persisted (older-shaped) one,
      // so preference keys added in later releases would rehydrate as
      // undefined on existing installs.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<UserStore>;
        return {
          ...current,
          ...p,
          preferences: { ...current.preferences, ...p.preferences },
        };
      },
    },
  ),
);

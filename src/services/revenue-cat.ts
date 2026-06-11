/**
 * RevenueCat integration for CardPulse Premium subscriptions.
 *
 * Products (configured in RevenueCat dashboard):
 *   - Monthly subscription
 *   - Yearly subscription
 *
 * Entitlement: "premium"
 *
 * Why "premium" and not "CardPulse Pro": the entitlement identifier
 * here MUST match what's configured in the RevenueCat dashboard. The
 * dashboard's entitlement is named `premium` (with both products
 * attached), so the code reads from that key. An earlier version of
 * this file used "CardPulse Pro" and resulted in
 * `customerInfo.entitlements.active["CardPulse Pro"]` always being
 * undefined — purchases would succeed at Apple but the app never
 * flipped premium on, leaving users charged-but-not-unlocked. App
 * Review caught this on the second submission round.
 */

import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  type PurchasesOffering,
  type CustomerInfo,
} from 'react-native-purchases';
// Direct import (not via stores/index) keeps the edge one-way:
// revenue-cat → user-store. user-store does not import this module.
import { useUserStore } from '../stores/user-store';

const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
const ENTITLEMENT_ID = 'premium';

function entitlementActive(info: CustomerInfo | null | undefined): boolean {
  return info?.entitlements?.active?.[ENTITLEMENT_ID] !== undefined;
}

let isConfigured = false;

/**
 * Initialize RevenueCat. Call once at app startup.
 */
export async function configureRevenueCat(): Promise<void> {
  if (isConfigured || Platform.OS === 'web') return;

  if (!API_KEY) {
    // No silent fallback — a missing key on native means IAP is dead.
    // Log loudly in dev; stay quiet in prod so we don't spam Sentry,
    // but leave the SDK unconfigured so purchase attempts fail fast.
    if (__DEV__) {
      console.warn(
        '[RevenueCat] EXPO_PUBLIC_REVENUECAT_API_KEY is not set. ' +
        'Purchases and restore will not work. ' +
        'Set it in .env locally and in EAS env for builds.'
      );
    }
    return;
  }

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
  }

  Purchases.configure({ apiKey: API_KEY });
  isConfigured = true;
}

/**
 * Keep the app's premium flag in lockstep with RevenueCat. Call once
 * at startup, AFTER configureRevenueCat() has resolved.
 *
 * Two mechanisms:
 *   1. Launch reconciliation — getCustomerInfo() (served from the
 *      SDK's cache when offline) tells us whether the "premium"
 *      entitlement is currently active. Catches the two drift cases
 *      the old code missed: a subscription that expired/was refunded
 *      while the app was closed (user kept premium forever), and a
 *      reinstall where the receipt restores server-side but the local
 *      flag was lost (paying user stuck on free).
 *   2. Live listener — addCustomerInfoUpdateListener fires on
 *      purchase, restore, renewal, and expiration detected while the
 *      app is running, so the flag tracks reality without a restart.
 *
 * IMPORTANT: state is only written when RevenueCat actually answers.
 * A thrown getCustomerInfo (SDK not configured, first-launch network
 * failure) keeps the persisted value rather than wrongly stripping
 * premium from a paying user who opened the app in airplane mode —
 * never conflate "RevenueCat error" with "not premium".
 */
let premiumSyncRegistered = false;

export function registerPremiumSync(): void {
  // Idempotent: the SDK does not dedupe listeners, so a second call
  // would stack a duplicate. Sole call site today is module scope in
  // app/_layout.tsx, but the guard makes future call sites safe (and
  // kills dev Fast-Refresh double-registration).
  if (Platform.OS === 'web' || !isConfigured || premiumSyncRegistered) return;
  premiumSyncRegistered = true;

  try {
    Purchases.addCustomerInfoUpdateListener((info: CustomerInfo) => {
      useUserStore.getState().setPremium(entitlementActive(info));
    });
  } catch (e) {
    if (__DEV__) console.warn('[RevenueCat] premium listener failed:', e);
  }

  const reconcile = () => {
    Purchases.getCustomerInfo()
      .then((info) => {
        useUserStore.getState().setPremium(entitlementActive(info));
      })
      .catch(() => {
        // Offline / transient failure — keep the persisted flag.
      });
  };

  // Gate the launch reconciliation on user-store hydration. zustand's
  // persist merge spreads the persisted blob over current state, so a
  // reconcile that lands BEFORE rehydration finishes would be
  // clobbered by the stale persisted flag for the rest of the session.
  // The window is tiny, but the gate closes it completely.
  if (useUserStore.persist.hasHydrated()) {
    reconcile();
  } else {
    useUserStore.persist.onFinishHydration(() => reconcile());
  }
}

/**
 * Identify the user after sign-in (links purchases to their account).
 */
export async function identifyUser(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Purchases.logIn(userId);
  } catch (e) {
    console.warn('RevenueCat identify failed:', e);
  }
}

/**
 * Reset user on sign-out.
 */
export async function resetUser(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Purchases.logOut();
  } catch (e) {
    // ignore — user may not have been identified
  }
}

// NOTE: a checkPremiumStatus() helper used to live here. It was
// removed deliberately: its catch-to-false return conflated "RevenueCat
// didn't answer" with "not premium", which — if fed into setPremium —
// would strip premium from a paying user who launched offline. Premium
// state questions go through registerPremiumSync() above; one-off reads
// use useUserStore.getState().isPremium.

/**
 * Get available subscription offerings.
 */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  if (Platform.OS === 'web') return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch {
    return null;
  }
}

/**
 * Purchase a package (monthly, yearly, or lifetime).
 */
export async function purchasePackage(packageToPurchase: any): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch (e: any) {
    if (e.userCancelled) return false;
    throw e;
  }
}

/**
 * Restore previous purchases (required by Apple).
 */
export async function restorePurchases(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch {
    return false;
  }
}

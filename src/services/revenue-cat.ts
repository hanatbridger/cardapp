/**
 * RevenueCat integration for CardPulse Premium subscriptions.
 *
 * Products (configured in RevenueCat dashboard):
 *   - Monthly subscription
 *   - Yearly subscription
 *   - Lifetime in-app purchase
 *
 * Entitlement: "CardPulse Pro"
 */

import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  type PurchasesOffering,
  type CustomerInfo,
} from 'react-native-purchases';

const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
const ENTITLEMENT_ID = 'CardPulse Pro';

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

/**
 * Check if user has active "CardPulse Pro" entitlement.
 */
export async function checkPremiumStatus(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch {
    return false;
  }
}

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

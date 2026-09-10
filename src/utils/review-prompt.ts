import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import Constants from 'expo-constants';

/**
 * App Store rating prompt.
 *
 * Ratings are the binding constraint on search rank — Apple names rating
 * count and quality as a ranking input, and the app shipped with one.
 * Metadata edits cannot compensate for that.
 *
 * iOS silently caps the system prompt at three per year per user and
 * ignores everything beyond it, so a prompt spent on a bad moment is
 * gone. The caller picks the moment; this module decides whether the
 * moment is allowed to spend one.
 */

const KEY = 'cardpulse-review-prompt';

/** Launches before a first-time user is ever eligible. */
const MIN_LAUNCHES = 3;

/** Days between prompts, independent of iOS's own throttle. */
const COOLDOWN_DAYS = 120;

/**
 * Foreground time the user must accumulate THIS session before the
 * prompt is allowed. Asking on arrival reads as a toll gate; asking
 * once someone has actually been using the app reads as a check-in.
 */
export const MIN_SESSION_ACTIVE_MS = 150_000; // 2.5 minutes

// Foreground clock. Background time does not count — an app left open
// in a pocket overnight has not been "used" for eight hours.
let activeSince: number | null = null;
let accumulatedMs = 0;
let appStateSub: { remove: () => void } | null = null;

/** Starts the foreground clock. Called once, from the root layout. */
export function startSessionClock(): void {
  if (Platform.OS === 'web' || appStateSub) return;
  activeSince = Date.now();
  accumulatedMs = 0;
  appStateSub = AppState.addEventListener('change', (next) => {
    if (next === 'active') {
      if (activeSince === null) activeSince = Date.now();
      return;
    }
    if (activeSince !== null) {
      accumulatedMs += Date.now() - activeSince;
      activeSince = null;
    }
  });
}

/** Foreground milliseconds accumulated since launch. */
export function sessionActiveMs(): number {
  return accumulatedMs + (activeSince === null ? 0 : Date.now() - activeSince);
}

interface ReviewState {
  launches: number;
  lastPromptedAt: string | null;
  /** App version that last prompted — never prompt twice on one version. */
  lastPromptedVersion: string | null;
}

const EMPTY: ReviewState = {
  launches: 0,
  lastPromptedAt: null,
  lastPromptedVersion: null,
};

function appVersion(): string {
  return Constants.expoConfig?.version ?? 'unknown';
}

async function read(): Promise<ReviewState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

async function write(state: ReviewState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // A failed write only costs us the cooldown bookkeeping; iOS still
    // enforces its own cap, so it can never turn into prompt spam.
  }
}

/** Counted once per cold start, from the root layout. */
export async function recordLaunch(): Promise<void> {
  if (Platform.OS === 'web') return;
  const state = await read();
  await write({ ...state, launches: state.launches + 1 });
}

function withinCooldown(lastPromptedAt: string | null): boolean {
  if (!lastPromptedAt) return false;
  const last = Date.parse(lastPromptedAt);
  if (Number.isNaN(last)) return false;
  return Date.now() - last < COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Ask for a rating if this is a moment worth spending one on.
 *
 * Call it only after something went WELL for the user. Two moments
 * qualify today: a price alert they set actually fired (Notifications),
 * and an engaged user looking at a watchlist that is up (Home). Never
 * after an error, and never from a button press: Apple's guidance is
 * that the prompt must not be a response to a user action, and
 * `requestReview` is a no-op the user may never see.
 *
 * Resolves to whether a prompt was actually requested. Never throws.
 */
export async function maybeRequestReview(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    // Enforced here as well as at the call site, so a new trigger
    // cannot accidentally ask the moment the app opens.
    if (sessionActiveMs() < MIN_SESSION_ACTIVE_MS) return false;

    const state = await read();
    if (state.launches < MIN_LAUNCHES) return false;
    if (withinCooldown(state.lastPromptedAt)) return false;
    if (state.lastPromptedVersion === appVersion()) return false;

    // isAvailableAsync covers the platform; hasAction also catches the
    // case where the store client is missing or the build is unsigned,
    // where requestReview would silently do nothing.
    if (!(await StoreReview.isAvailableAsync())) return false;
    if (!(await StoreReview.hasAction())) return false;

    await StoreReview.requestReview();
    // Recorded on request, not on submission — iOS never tells us
    // whether the user actually rated, so a request is the only event
    // we can observe. Treating it as spent is the conservative read.
    await write({
      ...state,
      lastPromptedAt: new Date().toISOString(),
      lastPromptedVersion: appVersion(),
    });
    return true;
  } catch {
    return false;
  }
}

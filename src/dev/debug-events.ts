import { create } from 'zustand';

/**
 * In-memory touch / gesture event log used by the v1.0.4 diagnostic
 * build to figure out why watchlist rows don't respond to taps on
 * cold launch. Components in the touch path (WatchlistCard,
 * SwipeToDelete, and the home FlatList's renderItem wrapper) push
 * entries here; TouchDebugHUD renders the latest few above the
 * home screen so the user can screenshot the sequence right after
 * a failed tap.
 *
 * Ring-buffered at 30 entries so a long session doesn't bloat
 * memory. Cleared by tapping the HUD.
 *
 * NOT shipped to the App Store — this lives in v1.0.4 (TestFlight
 * only), removed in v1.0.5 once we know what the bug is.
 */

export interface DebugEvent {
  /** Wall-clock ms timestamp. */
  ts: number;
  /** Which component recorded the event (e.g. "WatchlistCard"). */
  source: string;
  /** What happened (e.g. "RectButton.onPress", "View.onTouchStart"). */
  type: string;
  /** Optional extra context like cardId or active=true/false. */
  detail?: string;
}

interface DebugEventsState {
  events: DebugEvent[];
  log: (e: Omit<DebugEvent, 'ts'>) => void;
  clear: () => void;
}

export const useDebugEvents = create<DebugEventsState>()((set) => ({
  events: [],
  log: (e) =>
    set((s) => ({
      events: [...s.events, { ...e, ts: Date.now() }].slice(-30),
    })),
  clear: () => set({ events: [] }),
}));

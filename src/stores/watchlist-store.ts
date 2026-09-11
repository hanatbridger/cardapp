import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStorage } from './safe-storage';
import type { GradeType } from '../constants/grades';
import type { SealedType } from '../types/sealed';
import type { BaselineFields, ReturnDirection } from '../services/since-added';
// Direct import (not via stores/index) to keep the dependency edge
// one-way: watchlist-store → user-store. user-store does not import
// this module, so there is no cycle.
import { useUserStore } from './user-store';

/**
 * Watchlist items are a discriminated union — the same list now holds
 * graded singles and factory-sealed products, so consumers branch on
 * `kind` before accessing domain-specific fields.
 *
 * Schema history:
 *   v1 — cards only, flat fields (cardId/cardName/grade/...) with no
 *        `kind` discriminator. Still in TestFlight users' AsyncStorage.
 *   v2 — discriminated union. Tags legacy v1 items as `kind: 'card'` on
 *        first read via the `migrate` hook below so existing watchlists
 *        survive the upgrade with no user action.
 */

export interface CardWatchlistItem extends BaselineFields {
  kind: 'card';
  cardId: string;
  cardName: string;
  cardImageUrl: string;
  setName: string;
  setNumber: string;
  grade: GradeType;
  addedAt: string;
  /** Last known price — persisted so cards always show something */
  lastPrice?: number;
  lastPriceChange?: number;
  rarity?: string;
  language?: 'EN' | 'JP';
}

export interface SealedWatchlistItem extends BaselineFields {
  kind: 'sealed';
  productId: string;
  productName: string;
  productType: SealedType;
  setName: string;
  imageUrl: string;
  addedAt: string;
  lastPrice?: number;
  lastPriceChange?: number;
}

export type WatchlistItem = CardWatchlistItem | SealedWatchlistItem;

// Narrow-by-kind helpers — shorter than inlining the type guard everywhere.
export const isCardItem = (i: WatchlistItem): i is CardWatchlistItem => i.kind === 'card';
export const isSealedItem = (i: WatchlistItem): i is SealedWatchlistItem => i.kind === 'sealed';

/** `id` is the cardId for cards and the productId for sealed; `grade` scopes cards. */
function matchesItem(i: WatchlistItem, id: string, grade?: GradeType): boolean {
  return (
    (i.kind === 'sealed' && i.productId === id) ||
    (i.kind === 'card' && i.cardId === id && (grade === undefined || i.grade === grade))
  );
}

const isLivePrice = (p: unknown): p is number =>
  typeof p === 'number' && Number.isFinite(p) && p > 0;

// Seeded with two highly-recognisable movers so a brand-new user lands
// on a non-empty Home (empty lists feel broken at first open) without
// making the screen feel pre-populated. Everything beyond these two is
// user-added. Keep this list short — the trending rail above already
// surfaces the rest of the catalogue.
// Seeded watchlist for first-time users — both UNGRADED so the home
// tab Watchlist isn't empty on first launch but also doesn't show
// PSA 10 entries while graded tracking is gated.
const DEFAULT_WATCHLIST: WatchlistItem[] = [
  {
    kind: 'card',
    cardId: 'sv3pt5-199',
    cardName: 'Charizard ex',
    cardImageUrl: 'https://images.pokemontcg.io/sv3pt5/199.png',
    setName: '151',
    setNumber: '199',
    grade: 'UNGRADED',
    addedAt: '2026-03-15T00:00:00Z',
  },
  {
    kind: 'card',
    cardId: 'sv8pt5-161',
    cardName: 'Umbreon ex',
    cardImageUrl: 'https://images.pokemontcg.io/sv8pt5/161.png',
    setName: 'Prismatic Evolutions',
    setNumber: '161',
    grade: 'UNGRADED',
    addedAt: '2026-03-25T00:00:00Z',
  },
];

interface WatchlistStore {
  items: WatchlistItem[];
  maxFreeItems: number;
  /**
   * Add a card or sealed item. For cards, (cardId, grade) is the unique
   * key; for sealed, productId is unique. Duplicate adds are a no-op and
   * return false. Returns false when the free-tier cap is hit.
   */
  addItem: (item:
    | Omit<CardWatchlistItem, 'addedAt'>
    | Omit<SealedWatchlistItem, 'addedAt'>
  ) => boolean;
  /**
   * Remove an item. For card items the caller must also pass `grade` so
   * that a same-card-different-grade pair is only half-removed; for
   * sealed items grade is ignored.
   */
  removeItem: (id: string, grade?: GradeType) => void;
  updateGrade: (cardId: string, oldGrade: GradeType, newGrade: GradeType) => void;
  /**
   * Stamp last-known price onto an item. `id` is the cardId for card
   * items and productId for sealed items — the store figures out which.
   * For card items pass `grade` so the price only lands on that grade's
   * row: a card watched at both UNGRADED and PSA10 trades at very
   * different prices (graded is 5-10x raw), and matching on cardId alone
   * would clobber the other grade's last-known price with the wrong
   * number. Omitting grade falls back to matching every grade (legacy).
   */
  updatePrice: (id: string, price: number, priceChange: number, grade?: GradeType) => void;
  /**
   * Give items without a since-added baseline one, at `price`, dated now.
   * Covers rows added before baselines existed and rows added before
   * their price loaded. Pass LIVE prices only: a baseline taken from
   * seeded sample data would make every later return fiction. Items that
   * already have a baseline are left alone.
   */
  stampBaselines: (entries: { id: string; grade?: GradeType; price: number }[]) => void;
  /**
   * Flag that the since-added push fired for this item in `direction`.
   * Returns false when it was already flagged, so overlapping foreground
   * and background checks cannot notify twice for one crossing.
   */
  markReturnAlerted: (id: string, grade: GradeType | undefined, direction: ReturnDirection) => boolean;
  canAddMore: () => boolean;
}

export const useWatchlistStore = create<WatchlistStore>()(
  persist(
    (set, get) => ({
      items: DEFAULT_WATCHLIST,
      maxFreeItems: 5,

      addItem: (item) => {
        if (!get().canAddMore()) return false;
        const now = new Date().toISOString();
        // Since-added baseline: the LIVE price on screen when the user
        // tapped add. Callers pass baselinePrice only when the price is
        // live; when it is missing (not loaded yet, or sample data)
        // stampBaselines fills it on the first live price and dates it
        // then, so the row never claims a start it did not observe.
        const baseline = isLivePrice(item.baselinePrice)
          ? { baselinePrice: item.baselinePrice, baselineAt: now }
          : { baselinePrice: undefined, baselineAt: undefined };
        if (item.kind === 'sealed') {
          const exists = get().items.some(
            (i) => i.kind === 'sealed' && i.productId === item.productId,
          );
          if (exists) return false;
          set((state) => ({
          items: [...state.items, { ...item, ...baseline, returnAlerted: undefined, addedAt: now }],
        }));
          return true;
        }
        const exists = get().items.some(
          (i) => i.kind === 'card' && i.cardId === item.cardId && i.grade === item.grade,
        );
        if (exists) return false;
        set((state) => ({
          items: [...state.items, { ...item, ...baseline, returnAlerted: undefined, addedAt: now }],
        }));
        return true;
      },

      removeItem: (id, grade) =>
        set((state) => ({
          items: state.items.filter((i) => {
            if (i.kind === 'sealed') return i.productId !== id;
            // card: when grade is passed, scope the removal to that grade;
            // otherwise remove every grade of this card.
            if (grade === undefined) return i.cardId !== id;
            return !(i.cardId === id && i.grade === grade);
          }),
        })),

      updateGrade: (cardId, oldGrade, newGrade) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.kind === 'card' && i.cardId === cardId && i.grade === oldGrade
              ? {
                  ...i,
                  grade: newGrade,
                  // Raw and PSA 10 are different price series — a baseline
                  // from one grade measured against the other is noise.
                  baselinePrice: undefined,
                  baselineAt: undefined,
                  returnAlerted: undefined,
                }
              : i,
          ),
        })),

      updatePrice: (id, price, priceChange, grade) =>
        set((state) => {
          // Bail without a new items array when nothing would change —
          // this fires from card detail on every open (including cache
          // hits mid-push-animation), and an unconditional map re-rendered
          // every watchlist subscriber each visit.
          const matches = (i: (typeof state.items)[number]) =>
            (i.kind === 'sealed' && i.productId === id) ||
            (i.kind === 'card' &&
              i.cardId === id &&
              (grade === undefined || i.grade === grade));
          const needsWrite = state.items.some(
            (i) =>
              matches(i) &&
              (i.lastPrice !== price || i.lastPriceChange !== priceChange),
          );
          if (!needsWrite) return state;
          return {
            items: state.items.map((i) =>
              matches(i)
                ? { ...i, lastPrice: price, lastPriceChange: priceChange }
                : i,
            ),
          };
        }),

      stampBaselines: (entries) =>
        set((state) => {
          const now = new Date().toISOString();
          let changed = false;
          const items = state.items.map((i) => {
            if (i.baselineAt && isLivePrice(i.baselinePrice)) return i;
            const hit = entries.find((e) => isLivePrice(e.price) && matchesItem(i, e.id, e.grade));
            if (!hit) return i;
            changed = true;
            return { ...i, baselinePrice: hit.price, baselineAt: now, returnAlerted: undefined };
          });
          // Same bail as updatePrice: Home calls this on every batch
          // resolve, and a fresh array re-renders every subscriber.
          return changed ? { items } : state;
        }),

      markReturnAlerted: (id, grade, direction) => {
        const target = get().items.find((i) => matchesItem(i, id, grade));
        if (!target || target.returnAlerted?.[direction]) return false;
        set((state) => ({
          items: state.items.map((i) =>
            matchesItem(i, id, grade)
              ? { ...i, returnAlerted: { ...i.returnAlerted, [direction]: true } }
              : i,
          ),
        }));
        return true;
      },

      canAddMore: () => {
        const { items, maxFreeItems } = get();
        // Premium status lives in user-store — the single source of
        // truth, set by the paywall and kept in sync with RevenueCat
        // via registerPremiumSync() (services/revenue-cat.ts). This
        // store used to carry its OWN isPremium flag that nothing ever
        // set, which silently kept paying subscribers capped at the
        // free tier. One flag, one owner; cross-store read is cheap.
        if (useUserStore.getState().isPremium) return true;
        // Count only the items the user can actually SEE. Home hides
        // PSA10 card rows while graded tracking is gated, so counting
        // them here would let invisible legacy entries eat free slots —
        // blocking adds while the on-screen count still reads e.g. 3/5.
        const visible = items.filter(
          (i) => !(i.kind === 'card' && i.grade === 'PSA10'),
        ).length;
        return visible < maxFreeItems;
      },
    }),
    {
      name: 'cardpulse-watchlist',
      storage: createJSONStorage(() => safeStorage),
      version: 2,
      // maxFreeItems is a code constant, not user state. It used to be
      // persisted, which froze the cap at whatever value shipped when
      // the blob was written — a future cap change would never reach
      // existing installs. Exclude it going forward AND strip it from
      // old blobs on merge so the code value is always authoritative.
      partialize: (state) => ({ items: state.items }),
      merge: (persisted, current) => {
        const { maxFreeItems: _stale, ...rest } =
          (persisted ?? {}) as Partial<WatchlistStore>;
        return { ...current, ...rest };
      },
      // v1 → v2: legacy items had no `kind` discriminator — every entry
      // was a card. Tag them so the discriminated union narrows cleanly.
      migrate: (persisted: any, version: number) => {
        if (!persisted) return persisted;
        if (version < 2 && Array.isArray(persisted.items)) {
          persisted.items = persisted.items.map((i: any) =>
            i && i.kind ? i : { ...i, kind: 'card' as const },
          );
        }
        return persisted;
      },
    },
  ),
);

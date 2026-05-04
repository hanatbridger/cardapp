import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GradeType } from '../constants/grades';
import type { SealedType } from '../types/sealed';

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

export interface CardWatchlistItem {
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

export interface SealedWatchlistItem {
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
  isPremium: boolean;
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
   */
  updatePrice: (id: string, price: number, priceChange: number) => void;
  canAddMore: () => boolean;
  setPremium: (value: boolean) => void;
}

export const useWatchlistStore = create<WatchlistStore>()(
  persist(
    (set, get) => ({
      items: DEFAULT_WATCHLIST,
      isPremium: false,
      maxFreeItems: 5,

      addItem: (item) => {
        if (!get().canAddMore()) return false;
        const now = new Date().toISOString();
        if (item.kind === 'sealed') {
          const exists = get().items.some(
            (i) => i.kind === 'sealed' && i.productId === item.productId,
          );
          if (exists) return false;
          set((state) => ({ items: [...state.items, { ...item, addedAt: now }] }));
          return true;
        }
        const exists = get().items.some(
          (i) => i.kind === 'card' && i.cardId === item.cardId && i.grade === item.grade,
        );
        if (exists) return false;
        set((state) => ({ items: [...state.items, { ...item, addedAt: now }] }));
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
              ? { ...i, grade: newGrade }
              : i,
          ),
        })),

      updatePrice: (id, price, priceChange) =>
        set((state) => ({
          items: state.items.map((i) => {
            if (i.kind === 'sealed' && i.productId === id) {
              return { ...i, lastPrice: price, lastPriceChange: priceChange };
            }
            if (i.kind === 'card' && i.cardId === id) {
              return { ...i, lastPrice: price, lastPriceChange: priceChange };
            }
            return i;
          }),
        })),

      canAddMore: () => {
        const { items, isPremium, maxFreeItems } = get();
        return isPremium || items.length < maxFreeItems;
      },

      setPremium: (value) => set({ isPremium: value }),
    }),
    {
      name: 'cardpulse-watchlist',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
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

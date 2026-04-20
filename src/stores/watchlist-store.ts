import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GradeType } from '../constants/grades';

export interface WatchlistItem {
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

// Seeded with two highly-recognisable movers so a brand-new user lands
// on a non-empty Home (empty lists feel broken at first open) without
// making the screen feel pre-populated. Everything beyond these two is
// user-added. Keep this list short — the trending rail above already
// surfaces the rest of the catalogue.
const DEFAULT_WATCHLIST: WatchlistItem[] = [
  {
    cardId: 'sv3pt5-199',
    cardName: 'Charizard ex',
    cardImageUrl: 'https://images.pokemontcg.io/sv3pt5/199.png',
    setName: '151',
    setNumber: '199',
    grade: 'PSA10',
    addedAt: '2026-03-15T00:00:00Z',
  },
  {
    cardId: 'sv8pt5-161',
    cardName: 'Umbreon ex',
    cardImageUrl: 'https://images.pokemontcg.io/sv8pt5/161.png',
    setName: 'Prismatic Evolutions',
    setNumber: '161',
    grade: 'PSA10',
    addedAt: '2026-03-25T00:00:00Z',
  },
];

interface WatchlistStore {
  items: WatchlistItem[];
  isPremium: boolean;
  maxFreeItems: number;
  addItem: (item: Omit<WatchlistItem, 'addedAt'>) => boolean;
  removeItem: (cardId: string, grade: GradeType) => void;
  updateGrade: (cardId: string, oldGrade: GradeType, newGrade: GradeType) => void;
  updatePrice: (cardId: string, price: number, priceChange: number) => void;
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
        const exists = get().items.some(
          (i) => i.cardId === item.cardId && i.grade === item.grade,
        );
        if (exists) return false;
        set((state) => ({
          items: [
            ...state.items,
            { ...item, addedAt: new Date().toISOString() },
          ],
        }));
        return true;
      },

      removeItem: (cardId, grade) =>
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.cardId === cardId && i.grade === grade),
          ),
        })),

      updateGrade: (cardId, oldGrade, newGrade) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.cardId === cardId && i.grade === oldGrade
              ? { ...i, grade: newGrade }
              : i,
          ),
        })),

      updatePrice: (cardId, price, priceChange) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.cardId === cardId
              ? { ...i, lastPrice: price, lastPriceChange: priceChange }
              : i,
          ),
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
    },
  ),
);

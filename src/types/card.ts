import type { GradeType } from '../constants/grades';

export interface PokemonCard {
  id: string;
  name: string;
  supertype: string;
  subtypes: string[];
  hp?: string;
  types?: string[];
  set: {
    id: string;
    name: string;
    series: string;
    releaseDate: string;
    images: {
      symbol: string;
      logo: string;
    };
  };
  number: string;
  rarity?: string;
  /** 'JP' for Japanese sets, 'EN' for English/international */
  language: 'EN' | 'JP';
  images: {
    small: string;
    large: string;
  };
  /** Card illustrator/artist name */
  artist?: string;
  /** TCGPlayer market price (raw/ungraded) — from Pokemon TCG API */
  tcgPlayerPrice?: number;
  /** TCGPlayer mid/median price — used to calculate % change vs market */
  tcgPlayerMidPrice?: number;
  /** TCGPlayer product page URL */
  tcgPlayerUrl?: string;
}

export type PriceSource = 'ebay' | 'tcgplayer' | 'pricecharting' | 'mock';

export interface CardPrice {
  cardName: string;
  grade: GradeType;
  currentPrice: number;
  previousPrice: number;
  percentChange: number;
  lastSaleDate: string;
  lastSalePrice: number;
  averagePrice: number;
  highPrice: number;
  lowPrice: number;
  salesCount: number;
  /** Where this price came from */
  source?: PriceSource;
}

export interface PriceHistoryPoint {
  date: string;
  price: number;
}

export type PriceHistory = PriceHistoryPoint[];

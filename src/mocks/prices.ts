import type { CardPrice, PriceHistory } from '../types/card';
import type { GradeType } from '../constants/grades';

function generateHistory(basePrice: number, trend: number, days = 30): PriceHistory {
  const points: PriceHistory = [];
  const now = Date.now();
  for (let i = days; i >= 0; i--) {
    const date = new Date(now - i * 86400000).toISOString().split('T')[0];
    const noise = (Math.random() - 0.5) * basePrice * 0.08;
    const trendShift = ((days - i) / days) * basePrice * trend;
    points.push({ date, price: Math.max(1, basePrice + trendShift + noise) });
  }
  return points;
}

/** Price key format: cardId:grade */
function key(cardId: string, grade: GradeType): string {
  return `${cardId}:${grade}`;
}

/**
 * Mock prices calibrated against real eBay sold listings (April 2026)
 * Sources: eBay sold listings, PriceCharting, TCGPlayer market price
 *
 * These will be replaced by live eBay API data once the Application Growth Check is approved.
 */
const PRICE_DATA: Record<string, CardPrice> = {
  // ── Charizard ex 199 — 151 SIR ──────────────────────────
  // PriceCharting PSA 10: ~$1,560. Raw: ~$350-400
  [key('sv3pt5-199', 'PSA10')]: {
    cardName: 'Charizard ex', grade: 'PSA10',
    currentPrice: 1560.0, previousPrice: 1500.0, percentChange: 4.0,
    lastSaleDate: '2026-04-03', lastSalePrice: 1575.0,
    averagePrice: 1530.0, highPrice: 1800.0, lowPrice: 1400.0, salesCount: 87,
  },
  [key('sv3pt5-199', 'UNGRADED')]: {
    cardName: 'Charizard ex', grade: 'UNGRADED',
    currentPrice: 380.0, previousPrice: 360.0, percentChange: 5.56,
    lastSaleDate: '2026-04-03', lastSalePrice: 395.0,
    averagePrice: 370.0, highPrice: 450.0, lowPrice: 320.0, salesCount: 245,
  },

  // ── Pikachu ex 238 — Surging Sparks SIR ─────────────────
  // eBay sold PSA 10: $1,100 (Apr 5 2026). Raw: ~$200-280
  [key('sv8-238', 'PSA10')]: {
    cardName: 'Pikachu ex', grade: 'PSA10',
    currentPrice: 1100.0, previousPrice: 1050.0, percentChange: 4.76,
    lastSaleDate: '2026-04-05', lastSalePrice: 1100.0,
    averagePrice: 1075.0, highPrice: 1300.0, lowPrice: 900.0, salesCount: 42,
  },
  [key('sv8-238', 'UNGRADED')]: {
    cardName: 'Pikachu ex', grade: 'UNGRADED',
    currentPrice: 245.0, previousPrice: 230.0, percentChange: 6.52,
    lastSaleDate: '2026-04-03', lastSalePrice: 250.0,
    averagePrice: 237.0, highPrice: 300.0, lowPrice: 200.0, salesCount: 156,
  },

  // ── Mew ex 205 — 151 Hyper Rare (Gold) ──────────────────
  // eBay sold PSA 10: ~$200-220 (Mar 2026). Raw: ~$70-95
  [key('sv3pt5-205', 'PSA10')]: {
    cardName: 'Mew ex', grade: 'PSA10',
    currentPrice: 210.0, previousPrice: 197.0, percentChange: 6.6,
    lastSaleDate: '2026-04-01', lastSalePrice: 222.50,
    averagePrice: 205.0, highPrice: 250.0, lowPrice: 170.0, salesCount: 52,
  },
  [key('sv3pt5-205', 'UNGRADED')]: {
    cardName: 'Mew ex', grade: 'UNGRADED',
    currentPrice: 82.0, previousPrice: 78.0, percentChange: 5.13,
    lastSaleDate: '2026-03-31', lastSalePrice: 85.0,
    averagePrice: 80.0, highPrice: 100.0, lowPrice: 65.0, salesCount: 134,
  },

  // ── Miraidon ex 244 — SV Base SIR ──────────────────────
  // eBay sold: PSA 10 ~$120-160, Raw ~$40-60
  [key('sv1-244', 'PSA10')]: {
    cardName: 'Miraidon ex', grade: 'PSA10',
    currentPrice: 140.0, previousPrice: 155.0, percentChange: -9.68,
    lastSaleDate: '2026-03-30', lastSalePrice: 135.0,
    averagePrice: 147.0, highPrice: 190.0, lowPrice: 115.0, salesCount: 43,
  },
  [key('sv1-244', 'UNGRADED')]: {
    cardName: 'Miraidon ex', grade: 'UNGRADED',
    currentPrice: 48.0, previousPrice: 55.0, percentChange: -12.73,
    lastSaleDate: '2026-03-30', lastSalePrice: 45.0,
    averagePrice: 51.5, highPrice: 70.0, lowPrice: 38.0, salesCount: 98,
  },

  // ── Umbreon ex 161 — Prismatic Evolutions SIR ──────────
  // eBay sold PSA 10: ~$950-1,000 (Mar 2026). Raw: ~$1,200-1,500
  [key('sv8pt5-161', 'PSA10')]: {
    cardName: 'Umbreon ex', grade: 'PSA10',
    currentPrice: 1000.0, previousPrice: 950.0, percentChange: 5.26,
    lastSaleDate: '2026-03-27', lastSalePrice: 1000.0,
    averagePrice: 975.0, highPrice: 1300.0, lowPrice: 860.0, salesCount: 28,
  },
  [key('sv8pt5-161', 'UNGRADED')]: {
    cardName: 'Umbreon ex', grade: 'UNGRADED',
    currentPrice: 1350.0, previousPrice: 1300.0, percentChange: 3.85,
    lastSaleDate: '2026-04-03', lastSalePrice: 1400.0,
    averagePrice: 1325.0, highPrice: 1525.0, lowPrice: 1100.0, salesCount: 72,
  },

  // ── Eevee 133 — 151 Common ─────────────────────────────
  // eBay sold: PSA 10 ~$25-35, Raw ~$1-3
  [key('sv3pt5-133', 'PSA10')]: {
    cardName: 'Eevee', grade: 'PSA10',
    currentPrice: 28.0, previousPrice: 26.0, percentChange: 7.69,
    lastSaleDate: '2026-03-31', lastSalePrice: 30.0,
    averagePrice: 27.0, highPrice: 38.0, lowPrice: 22.0, salesCount: 45,
  },
  [key('sv3pt5-133', 'UNGRADED')]: {
    cardName: 'Eevee', grade: 'UNGRADED',
    currentPrice: 2.0, previousPrice: 2.5, percentChange: -20.0,
    lastSaleDate: '2026-03-31', lastSalePrice: 1.75,
    averagePrice: 2.25, highPrice: 4.0, lowPrice: 1.0, salesCount: 380,
  },

  // ── Alakazam ex 201 — 151 SIR ──────────────────────────
  // eBay sold: PSA 10 ~$120-160, Raw ~$35-55
  [key('sv3pt5-201', 'PSA10')]: {
    cardName: 'Alakazam ex', grade: 'PSA10',
    currentPrice: 135.0, previousPrice: 145.0, percentChange: -6.90,
    lastSaleDate: '2026-03-30', lastSalePrice: 130.0,
    averagePrice: 140.0, highPrice: 175.0, lowPrice: 110.0, salesCount: 38,
  },
  [key('sv3pt5-201', 'UNGRADED')]: {
    cardName: 'Alakazam ex', grade: 'UNGRADED',
    currentPrice: 42.0, previousPrice: 48.0, percentChange: -12.5,
    lastSaleDate: '2026-03-30', lastSalePrice: 40.0,
    averagePrice: 45.0, highPrice: 60.0, lowPrice: 32.0, salesCount: 87,
  },

  // ── Gardevoir ex 233 — Paldean Fates SIR ───────────────
  // eBay sold: PSA 10 ~$150-200, Raw ~$50-75
  [key('sv4pt5-233', 'PSA10')]: {
    cardName: 'Gardevoir ex', grade: 'PSA10',
    currentPrice: 175.0, previousPrice: 160.0, percentChange: 9.38,
    lastSaleDate: '2026-04-01', lastSalePrice: 180.0,
    averagePrice: 167.0, highPrice: 210.0, lowPrice: 140.0, salesCount: 41,
  },
  [key('sv4pt5-233', 'UNGRADED')]: {
    cardName: 'Gardevoir ex', grade: 'UNGRADED',
    currentPrice: 62.0, previousPrice: 55.0, percentChange: 12.73,
    lastSaleDate: '2026-04-01', lastSalePrice: 65.0,
    averagePrice: 58.5, highPrice: 80.0, lowPrice: 45.0, salesCount: 112,
  },

  // ── Iono 269 — Paldea Evolved SIR ─────────────────────
  // eBay sold PSA 10: ~$160-204 (Feb 2026). Raw: ~$55-75
  [key('sv2-269', 'PSA10')]: {
    cardName: 'Iono', grade: 'PSA10',
    currentPrice: 200.0, previousPrice: 185.0, percentChange: 8.11,
    lastSaleDate: '2026-03-28', lastSalePrice: 204.0,
    averagePrice: 192.0, highPrice: 220.0, lowPrice: 160.0, salesCount: 76,
  },
  [key('sv2-269', 'UNGRADED')]: {
    cardName: 'Iono', grade: 'UNGRADED',
    currentPrice: 65.0, previousPrice: 60.0, percentChange: 8.33,
    lastSaleDate: '2026-04-01', lastSalePrice: 68.0,
    averagePrice: 62.5, highPrice: 80.0, lowPrice: 50.0, salesCount: 198,
  },

  // ── Gardevoir ex 245 — SV Base SIR ────────────────────
  // eBay sold: PSA 10 ~$200-280, Raw ~$70-100
  [key('sv1-245', 'PSA10')]: {
    cardName: 'Gardevoir ex', grade: 'PSA10',
    currentPrice: 240.0, previousPrice: 255.0, percentChange: -5.88,
    lastSaleDate: '2026-03-31', lastSalePrice: 235.0,
    averagePrice: 247.0, highPrice: 300.0, lowPrice: 195.0, salesCount: 55,
  },
  [key('sv1-245', 'UNGRADED')]: {
    cardName: 'Gardevoir ex', grade: 'UNGRADED',
    currentPrice: 82.0, previousPrice: 90.0, percentChange: -8.89,
    lastSaleDate: '2026-03-31', lastSalePrice: 78.0,
    averagePrice: 86.0, highPrice: 110.0, lowPrice: 65.0, salesCount: 134,
  },
};

/** Get price for a specific card and grade */
export function getPrice(cardId: string, grade: GradeType): CardPrice | undefined {
  return PRICE_DATA[key(cardId, grade)];
}

/** Get price for card (default to first available grade) */
export function getDefaultPrice(cardId: string): CardPrice | undefined {
  return PRICE_DATA[key(cardId, 'UNGRADED')] ?? PRICE_DATA[key(cardId, 'PSA10')];
}

export function getMockPriceHistory(cardId: string, grade: GradeType = 'UNGRADED'): PriceHistory {
  const price = PRICE_DATA[key(cardId, grade)];
  if (!price) return generateHistory(50, 0.05);
  const trend = price.percentChange > 0 ? 0.06 : -0.06;
  return generateHistory(price.averagePrice, trend);
}

/** @deprecated Use getPrice() instead */
export const MOCK_PRICES: Record<string, CardPrice> = Object.fromEntries(
  Object.entries(PRICE_DATA)
    .filter(([k]) => k.endsWith(':UNGRADED'))
    .map(([k, v]) => [k.replace(':UNGRADED', ''), v]),
);

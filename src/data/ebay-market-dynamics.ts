/**
 * CardPulse — eBay Market Dynamics (Mock Dataset)
 *
 * Simulates 7-day and 30-day averages of eBay listing activity.
 * In production this would be sourced from the eBay Browse API via
 * daily background queries (same approach as mycollectrics.com).
 *
 * Metrics:
 *   - Active listings: total live listings at any point
 *   - New listings/day: newly posted per day
 *   - Sold est./day: estimated daily sales (completed+sold filter)
 *   - Demand pressure: sold / active × 100 — higher = tighter market
 *   - Supply saturation shift: (7d unsold %) / (30d unsold %) — >1.0 = loosening
 */

export interface MarketDynamicsData {
  cardId: string;
  /** 7-day average active listings */
  activeListings7d: number;
  /** 30-day average active listings */
  activeListings30d: number;
  /** 7-day average new listings per day */
  newPerDay7d: number;
  /** 30-day average new listings per day */
  newPerDay30d: number;
  /** 7-day average sold per day */
  soldPerDay7d: number;
  /** 30-day average sold per day */
  soldPerDay30d: number;
  /** Demand pressure: soldPerDay7d / activeListings7d × 100 */
  demandPressure: number;
  /** Supply saturation shift: (7d unsold%) / (30d unsold%) */
  supplySaturation: number;
}

/**
 * Mock eBay market dynamics for our scored cards.
 * Values are realistic ranges based on typical Pokemon card eBay activity.
 *
 * High-demand chase cards (Umbreon PE, Charizard 151, Mega Charizard X):
 *   → high active listings, high sold/day, tight demand pressure
 *
 * Mid-tier cards (Alakazam, Eevee, Gardevoir):
 *   → moderate listings, moderate sold/day, balanced pressure
 *
 * Declining cards (Miraidon, older sets):
 *   → supply building up, loosening saturation
 */
export const MARKET_DYNAMICS: MarketDynamicsData[] = [
  // ── 151 Set ──────────────────────────────────────
  {
    cardId: 'sv3pt5-199', // Charizard ex — consistently hot
    activeListings7d: 446,
    activeListings30d: 520,
    newPerDay7d: 35.1,
    newPerDay30d: 42.3,
    soldPerDay7d: 25.8,
    soldPerDay30d: 22.1,
    demandPressure: 5.8,
    supplySaturation: 0.85, // Tightening — supply dropping
  },
  {
    cardId: 'sv3pt5-205', // Mew ex — steady demand
    activeListings7d: 189,
    activeListings30d: 210,
    newPerDay7d: 12.7,
    newPerDay30d: 14.2,
    soldPerDay7d: 10.0,
    soldPerDay30d: 9.5,
    demandPressure: 5.3,
    supplySaturation: 0.92, // Slightly tightening
  },
  {
    cardId: 'sv3pt5-201', // Alakazam ex — cooling off
    activeListings7d: 312,
    activeListings30d: 280,
    newPerDay7d: 18.4,
    newPerDay30d: 15.6,
    soldPerDay7d: 6.2,
    soldPerDay30d: 7.8,
    demandPressure: 2.0,
    supplySaturation: 1.35, // Loosening — supply building up
  },
  {
    cardId: 'sv3pt5-133', // Eevee — common, low activity
    activeListings7d: 1250,
    activeListings30d: 1180,
    newPerDay7d: 45.0,
    newPerDay30d: 40.2,
    soldPerDay7d: 28.5,
    soldPerDay30d: 30.0,
    demandPressure: 2.3,
    supplySaturation: 1.12, // Slightly loosening
  },

  // ── Prismatic Evolutions ─────────────────────────
  {
    cardId: 'sv8pt5-161', // Umbreon ex SIR — extremely hot
    activeListings7d: 65,
    activeListings30d: 82,
    newPerDay7d: 8.3,
    newPerDay30d: 12.1,
    soldPerDay7d: 7.2,
    soldPerDay30d: 5.8,
    demandPressure: 11.1,
    supplySaturation: 0.68, // Significant tightening
  },
  {
    cardId: 'sv8pt5-60', // Umbreon ex (lower rarity)
    activeListings7d: 142,
    activeListings30d: 165,
    newPerDay7d: 14.8,
    newPerDay30d: 18.2,
    soldPerDay7d: 11.5,
    soldPerDay30d: 10.2,
    demandPressure: 8.1,
    supplySaturation: 0.78, // Tightening
  },

  // ── Surging Sparks ───────────────────────────────
  {
    cardId: 'sv8-238', // Pikachu ex SIR
    activeListings7d: 198,
    activeListings30d: 225,
    newPerDay7d: 16.5,
    newPerDay30d: 19.8,
    soldPerDay7d: 12.8,
    soldPerDay30d: 11.0,
    demandPressure: 6.5,
    supplySaturation: 0.82, // Tightening
  },
  {
    cardId: 'sv8-247', // Pikachu ex Hyper Rare
    activeListings7d: 48,
    activeListings30d: 55,
    newPerDay7d: 4.2,
    newPerDay30d: 5.8,
    soldPerDay7d: 3.1,
    soldPerDay30d: 2.5,
    demandPressure: 6.5,
    supplySaturation: 0.75, // Tightening
  },
  {
    cardId: 'sv8-234', // Mega Charizard X ex — insane demand
    activeListings7d: 320,
    activeListings30d: 390,
    newPerDay7d: 28.5,
    newPerDay30d: 35.0,
    soldPerDay7d: 22.0,
    soldPerDay30d: 18.5,
    demandPressure: 6.9,
    supplySaturation: 0.72, // Strong tightening
  },

  // ── Paldea Evolved ───────────────────────────────
  {
    cardId: 'sv2-269', // Iono SAR — waifu tax, steady
    activeListings7d: 175,
    activeListings30d: 190,
    newPerDay7d: 11.2,
    newPerDay30d: 13.5,
    soldPerDay7d: 8.8,
    soldPerDay30d: 9.2,
    demandPressure: 5.0,
    supplySaturation: 1.05, // Roughly stable
  },

  // ── Scarlet & Violet Base ────────────────────────
  {
    cardId: 'sv1-244', // Miraidon ex — declining
    activeListings7d: 420,
    activeListings30d: 350,
    newPerDay7d: 22.0,
    newPerDay30d: 16.5,
    soldPerDay7d: 5.8,
    soldPerDay30d: 8.2,
    demandPressure: 1.4,
    supplySaturation: 1.65, // Supply building fast
  },
  {
    cardId: 'sv1-245', // Gardevoir ex — slow decline
    activeListings7d: 280,
    activeListings30d: 260,
    newPerDay7d: 15.0,
    newPerDay30d: 14.2,
    soldPerDay7d: 7.5,
    soldPerDay30d: 8.8,
    demandPressure: 2.7,
    supplySaturation: 1.22, // Loosening
  },

  // ── Paldean Fates ────────────────────────────────
  {
    cardId: 'sv4pt5-233', // Gardevoir ex — undervalued per AI
    activeListings7d: 155,
    activeListings30d: 170,
    newPerDay7d: 10.5,
    newPerDay30d: 12.0,
    soldPerDay7d: 9.2,
    soldPerDay30d: 8.0,
    demandPressure: 5.9,
    supplySaturation: 0.88, // Tightening — supports undervalued signal
  },

  // ── Obsidian Flames ──────────────────────────────
  {
    cardId: 'sv3-223', // Charizard ex — easy pull, saturated
    activeListings7d: 890,
    activeListings30d: 820,
    newPerDay7d: 52.0,
    newPerDay30d: 45.0,
    soldPerDay7d: 18.0,
    soldPerDay30d: 22.0,
    demandPressure: 2.0,
    supplySaturation: 1.42, // Loosening — too much supply
  },

  // ── Destined Rivals ──────────────────────────────
  {
    cardId: 'sv9-193', // Mewtwo ex — new set, hot demand
    activeListings7d: 110,
    activeListings30d: 85,
    newPerDay7d: 22.0,
    newPerDay30d: 15.0,
    soldPerDay7d: 18.5,
    soldPerDay30d: 12.0,
    demandPressure: 16.8,
    supplySaturation: 0.55, // Very tight — new release hype
  },
];

/** Lookup market dynamics by card ID */
export function getMarketDynamics(cardId: string): MarketDynamicsData | undefined {
  return MARKET_DYNAMICS.find((d) => d.cardId === cardId);
}

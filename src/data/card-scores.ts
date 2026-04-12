/**
 * CardPulse AI — Chase Card Scoring Dataset
 *
 * Each card has a predicted fair value calibrated from:
 *   - Pull cost (supply): how hard/expensive to pull from packs
 *   - Desirability (demand): character premium + artwork/hype + universal appeal
 *
 * The predictedPrice is our AI estimate of fair market value.
 * Comparing this against actual eBay sold prices reveals over/undervalued cards.
 */

import type { CardScore } from '../services/price-prediction';

export const CARD_SCORES: CardScore[] = [
  // ── 151 Set (sv3pt5) ──────────────────────────────────────
  {
    cardId: 'sv3pt5-199',
    cardName: 'Charizard ex',
    setName: '151',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/199.png',
    pullCostScore: 5.2,
    characterPremium: 10,
    artworkHype: 9.5,
    universalAppeal: 10,
    predictedPrice: 420, // High desirability Charizard — raw market ~$380
  },
  {
    cardId: 'sv3pt5-205',
    cardName: 'Mew ex',
    setName: '151',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/205.png',
    pullCostScore: 6.8,
    characterPremium: 9,
    artworkHype: 10,
    universalAppeal: 8,
    predictedPrice: 90, // Bubble Mew — raw market ~$82
  },
  {
    cardId: 'sv3pt5-201',
    cardName: 'Alakazam ex',
    setName: '151',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/201.png',
    pullCostScore: 5.2,
    characterPremium: 5.5,
    artworkHype: 7,
    universalAppeal: 5,
    predictedPrice: 36, // Mid-tier — raw market ~$42 = slightly overvalued
  },
  {
    cardId: 'sv3pt5-133',
    cardName: 'Eevee',
    setName: '151',
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/133.png',
    pullCostScore: 2.0,
    characterPremium: 7,
    artworkHype: 5,
    universalAppeal: 7,
    predictedPrice: 1.5, // Common card, very easy pull — raw market ~$2
  },

  // ── Prismatic Evolutions (sv8pt5) ────────────────────────
  {
    cardId: 'sv8pt5-161',
    cardName: 'Umbreon ex',
    setName: 'Prismatic Evolutions',
    imageUrl: 'https://images.pokemontcg.io/sv8pt5/161.png',
    pullCostScore: 9.2,
    characterPremium: 9.5,
    artworkHype: 9.5,
    universalAppeal: 7,
    predictedPrice: 1500, // Hardest to pull + highest demand — raw market ~$1,350
  },
  {
    cardId: 'sv8pt5-60',
    cardName: 'Umbreon ex',
    setName: 'Prismatic Evolutions',
    imageUrl: 'https://images.pokemontcg.io/sv8pt5/60.png',
    pullCostScore: 4.5,
    characterPremium: 9.5,
    artworkHype: 7,
    universalAppeal: 7,
    predictedPrice: 180, // Lower rarity Umbreon — easier to pull
  },

  // ── Surging Sparks (sv8) ─────────────────────────────────
  {
    cardId: 'sv8-238',
    cardName: 'Pikachu ex',
    setName: 'Surging Sparks',
    imageUrl: 'https://images.pokemontcg.io/sv8/238.png',
    pullCostScore: 6.0,
    characterPremium: 8.5,
    artworkHype: 8,
    universalAppeal: 10,
    predictedPrice: 270, // Strong Pikachu SIR — raw market ~$245
  },
  {
    cardId: 'sv8-247',
    cardName: 'Pikachu ex',
    setName: 'Surging Sparks',
    imageUrl: 'https://images.pokemontcg.io/sv8/247.png',
    pullCostScore: 8.5,
    characterPremium: 8.5,
    artworkHype: 7,
    universalAppeal: 10,
    predictedPrice: 400, // Hyper Rare — higher pull cost
  },

  // ── Paldea Evolved (sv2) ─────────────────────────────────
  {
    cardId: 'sv2-269',
    cardName: 'Iono',
    setName: 'Paldea Evolved',
    imageUrl: 'https://images.pokemontcg.io/sv2/269.png',
    pullCostScore: 7.0,
    characterPremium: 8,
    artworkHype: 9,
    universalAppeal: 6,
    predictedPrice: 58, // Competitive + collector demand — raw market ~$65
  },

  // ── Scarlet & Violet Base (sv1) ──────────────────────────
  {
    cardId: 'sv1-244',
    cardName: 'Miraidon ex',
    setName: 'Scarlet & Violet',
    imageUrl: 'https://images.pokemontcg.io/sv1/244.png',
    pullCostScore: 5.5,
    characterPremium: 6,
    artworkHype: 8,
    universalAppeal: 4,
    predictedPrice: 38, // Losing competitive relevance — raw market ~$48 = overvalued
  },
  {
    cardId: 'sv1-245',
    cardName: 'Gardevoir ex',
    setName: 'Scarlet & Violet',
    imageUrl: 'https://images.pokemontcg.io/sv1/245.png',
    pullCostScore: 5.5,
    characterPremium: 7,
    artworkHype: 7.5,
    universalAppeal: 5,
    predictedPrice: 72, // Solid but not top tier — raw market ~$82 = slightly overvalued
  },

  // ── Paldean Fates (sv4pt5) ───────────────────────────────
  {
    cardId: 'sv4pt5-233',
    cardName: 'Gardevoir ex',
    setName: 'Paldean Fates',
    imageUrl: 'https://images.pokemontcg.io/sv4pt5/233.png',
    pullCostScore: 6.5,
    characterPremium: 7,
    artworkHype: 8.5,
    universalAppeal: 5,
    predictedPrice: 70, // Beautiful artwork — raw market ~$62 = slightly undervalued
  },

  // ── Obsidian Flames (sv3) ────────────────────────────────
  {
    cardId: 'sv3-223',
    cardName: 'Charizard ex',
    setName: 'Obsidian Flames',
    imageUrl: 'https://images.pokemontcg.io/sv3/223.png',
    pullCostScore: 1.4,
    characterPremium: 10,
    artworkHype: 7.8,
    universalAppeal: 10,
    predictedPrice: 55, // Very easy to pull kills the value despite being Charizard
  },

  // ── Destined Rivals (sv9) ────────────────────────────────
  {
    cardId: 'sv9-193',
    cardName: 'Mewtwo ex',
    setName: 'Destined Rivals',
    imageUrl: 'https://images.pokemontcg.io/sv9/193.png',
    pullCostScore: 7.5,
    characterPremium: 9,
    artworkHype: 9,
    universalAppeal: 9,
    predictedPrice: 350, // Top chase from best SV set
  },

  // ── Surging Sparks (sv8) — Mega Charizard ────────────────
  {
    cardId: 'sv8-234',
    cardName: 'Mega Charizard X ex',
    setName: 'Surging Sparks',
    imageUrl: 'https://images.pokemontcg.io/sv8/234.png',
    pullCostScore: 3.0,
    characterPremium: 10,
    artworkHype: 10,
    universalAppeal: 10,
    predictedPrice: 750, // "Best Charizard ever printed" — low pull cost but insane demand
  },
];

/** Lookup a card score by ID */
export function getCardScore(cardId: string): CardScore | undefined {
  return CARD_SCORES.find((s) => s.cardId === cardId);
}

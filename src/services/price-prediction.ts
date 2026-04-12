/**
 * CardPulse AI — Predictive Pricing Model
 *
 * Uses pull cost (supply) and desirability (demand) to estimate fair value.
 * Each scored card has a manually calibrated predicted price based on:
 *   - Pull rate × cards in rarity tier (supply)
 *   - Character premium + artwork/hype + universal appeal (demand)
 *
 * The predicted price is compared against actual market price to determine
 * if a card is undervalued, overvalued, or fairly priced.
 */

export interface CardScore {
  cardId: string;
  cardName: string;
  setName: string;
  imageUrl: string;
  pullCostScore: number;
  characterPremium: number;
  artworkHype: number;
  universalAppeal: number;
  /** Calibrated predicted fair value in USD */
  predictedPrice: number;
}

export interface Valuation {
  predictedPrice: number;
  marketPrice: number;
  /** Positive = undervalued, negative = overvalued */
  gapPercent: number;
  label: 'undervalued' | 'overvalued' | 'fair';
  pullCostScore: number;
  desirabilityScore: number;
}

const FAIR_THRESHOLD = 0.07; // ±7% = "fair"

function computeDesirability(score: CardScore): number {
  return (
    score.characterPremium * 0.45 +
    score.artworkHype * 0.45 +
    score.universalAppeal * 0.10
  );
}

export function getValuation(score: CardScore, marketPrice: number): Valuation {
  const desirability = computeDesirability(score);
  const predicted = score.predictedPrice;
  const gap = (predicted - marketPrice) / marketPrice;

  let label: Valuation['label'] = 'fair';
  if (gap > FAIR_THRESHOLD) label = 'undervalued';
  else if (gap < -FAIR_THRESHOLD) label = 'overvalued';

  return {
    predictedPrice: predicted,
    marketPrice,
    gapPercent: Math.round(gap * 10000) / 100,
    label,
    pullCostScore: score.pullCostScore,
    desirabilityScore: Math.round(desirability * 100) / 100,
  };
}

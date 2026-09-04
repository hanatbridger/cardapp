/**
 * Grading verdict — "is this card worth grading?"
 *
 * Expected-value math over the PSA grade distribution:
 *
 *   EV(sale) = Σ P(grade | condition, pop) × price(grade)
 *   net      = EV(sale) − grading fee − raw value surrendered
 *
 * Inputs and their provenance:
 *   - rawPrice     → live TCGPlayer market price (already on screen)
 *   - psa10Price   → live PSA 10 sold price (collectrics, card-stats proxy)
 *   - gemRate/pop  → real PSA population census (same proxy)
 *   - P(grade)     → a condition prior BLENDED with the card's actual gem
 *                    rate. The user's self-assessed condition is least
 *                    trustworthy at the top ("mint" is aspirational, "played"
 *                    is undeniable), so trust shifts toward the population
 *                    data for optimistic self-assessments and toward the
 *                    user for pessimistic ones.
 *   - PSA 9/8/7 prices → MODELED from the PSA 10 and raw prices (no
 *                    per-grade sold comps yet). Every consumer must label
 *                    these as estimates in the UI — Apple 4.1 treats
 *                    modeled numbers presented as sold data as fabrication.
 *
 * No verdict is produced without a real PSA 10 price and a real raw price.
 */

export type CardCondition = 'mint' | 'near_mint' | 'excellent' | 'good' | 'played';

export const CONDITION_LABELS: Record<CardCondition, string> = {
  mint: 'Mint',
  near_mint: 'Near Mint',
  excellent: 'Excellent',
  good: 'Good',
  played: 'Played',
};

export const CONDITION_ORDER: CardCondition[] = [
  'mint',
  'near_mint',
  'excellent',
  'good',
  'played',
];

/** One-line self-grading guidance per condition, shown under the picker. */
export const CONDITION_HINTS: Record<CardCondition, string> = {
  mint: 'Sharp corners, centered, no whitening under bright light',
  near_mint: 'One tiny flaw you have to hunt for',
  excellent: 'Light corner wear or whitening up close',
  good: 'Visible wear, no creases',
  played: 'Creases or heavy surface damage',
};

/** Grade buckets the distribution spans. `below` = PSA 7 and under. */
export interface GradeDistribution {
  p10: number;
  p9: number;
  p8: number;
  below: number;
}

export interface GradingOutcome {
  label: string;
  /** Modeled unless `real` is true. */
  price: number;
  /** Net after fee and raw value surrendered. */
  net: number;
  /** True when the price is a live sold price, not a modeled estimate. */
  real: boolean;
}

export interface GradingVerdict {
  /** True → "Grade it", false → "Sell raw / keep raw". */
  worthGrading: boolean;
  /** A–F value grade on the expected net. */
  letter: 'A' | 'B' | 'C' | 'D' | 'F';
  /** Expected net profit across the whole distribution, after fee. */
  expectedNet: number;
  /** P(grade) actually used, post-blend. */
  dist: GradeDistribution;
  best: GradingOutcome;
  likely: GradingOutcome;
  downside: GradingOutcome;
  /** All-in grading cost assumed by the math. */
  fee: number;
}

/**
 * All-in cost of the cheapest open PSA tier (fee + shipping both ways),
 * kept as one hand-maintained constant. PSA's sub-$25 Value tiers have
 * been paused since mid-2026; Regular is the floor.
 */
export const GRADING_ALL_IN_FEE = 92;
export const GRADING_FEE_LABEL = 'PSA Regular, ~$92 all-in';

/**
 * Baseline P(grade | condition). Priors for a modern-era submission,
 * deliberately conservative at the top — most "mint" raw cards gem
 * around one time in five.
 */
const BASE_DIST: Record<CardCondition, GradeDistribution> = {
  mint: { p10: 0.2, p9: 0.5, p8: 0.2, below: 0.1 },
  near_mint: { p10: 0.08, p9: 0.42, p8: 0.32, below: 0.18 },
  excellent: { p10: 0.02, p9: 0.14, p8: 0.42, below: 0.42 },
  good: { p10: 0, p9: 0.03, p8: 0.15, below: 0.82 },
  played: { p10: 0, p9: 0, p8: 0.05, below: 0.95 },
};

/**
 * How much the card's real population distribution outweighs the
 * condition prior. Optimistic self-assessments defer to the census;
 * "played" needs no second opinion.
 */
const POP_WEIGHT: Record<CardCondition, number> = {
  mint: 0.55,
  near_mint: 0.45,
  excellent: 0.25,
  good: 0.1,
  played: 0.05,
};

/** PSA 9 modeled as a fraction of PSA 10; floored at the raw price. */
const PSA9_OF_PSA10 = 0.45;
/** PSA 8 modeled as roughly a raw-value recovery. */
const PSA8_OF_RAW = 1.0;
/** Below 8 modeled as a haircut on raw (slab overhead, weak demand). */
const BELOW_OF_RAW = 0.75;

function letterFor(net: number): GradingVerdict['letter'] {
  if (net >= 50) return 'A';
  if (net >= 20) return 'B';
  if (net >= 0) return 'C';
  if (net >= -20) return 'D';
  return 'F';
}

export function computeGradingVerdict(opts: {
  rawPrice: number;
  psa10Price: number;
  /** Percent, e.g. 14.2 — from the PSA population census; null when unknown. */
  gemRatePct: number | null;
  condition: CardCondition;
}): GradingVerdict | null {
  const { rawPrice, psa10Price, gemRatePct, condition } = opts;
  if (!(rawPrice > 0) || !(psa10Price > 0)) return null;

  const base = BASE_DIST[condition];
  let dist: GradeDistribution = { ...base };

  // Blend the prior's PSA 10 odds toward the card's real gem rate. The
  // census counts SUBMITTED copies — a self-selected, better-than-average
  // pool — so it caps optimism rather than granting it: the blended P(10)
  // never exceeds the condition prior. Redistribute the difference into 9.
  if (gemRatePct !== null && gemRatePct >= 0) {
    const gem = Math.min(Math.max(gemRatePct / 100, 0), 1);
    const w = POP_WEIGHT[condition];
    const blended10 = Math.min(base.p10, (1 - w) * base.p10 + w * gem);
    dist = { ...base, p10: blended10, p9: base.p9 + (base.p10 - blended10) };
  }

  const fee = GRADING_ALL_IN_FEE;
  const p9Price = Math.max(rawPrice, psa10Price * PSA9_OF_PSA10);
  const p8Price = rawPrice * PSA8_OF_RAW;
  const belowPrice = rawPrice * BELOW_OF_RAW;

  const evSale =
    dist.p10 * psa10Price +
    dist.p9 * p9Price +
    dist.p8 * p8Price +
    dist.below * belowPrice;
  const expectedNet = evSale - fee - rawPrice;

  const netOf = (price: number) => price - fee - rawPrice;
  const outcomes: Array<{ key: keyof GradeDistribution; o: GradingOutcome }> = [
    { key: 'p10', o: { label: 'PSA 10', price: psa10Price, net: netOf(psa10Price), real: true } },
    { key: 'p9', o: { label: 'PSA 9', price: p9Price, net: netOf(p9Price), real: false } },
    { key: 'p8', o: { label: 'PSA 8', price: p8Price, net: netOf(p8Price), real: false } },
    { key: 'below', o: { label: 'PSA 7 or under', price: belowPrice, net: netOf(belowPrice), real: false } },
  ];

  // Most likely outcome = the mode of the distribution. Downside is the
  // worst bucket outright — anchoring it to PSA 8 made the "downside" read
  // BETTER than the likely outcome for rough cards. When the mode IS the
  // worst bucket, the UI collapses the duplicate row.
  const likely = outcomes.reduce((a, b) => (dist[b.key] > dist[a.key] ? b : a)).o;

  return {
    worthGrading: expectedNet >= 0,
    letter: letterFor(expectedNet),
    expectedNet,
    dist,
    best: outcomes[0].o,
    likely,
    downside: outcomes[3].o,
    fee,
  };
}

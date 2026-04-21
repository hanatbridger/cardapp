/**
 * Sealed Pokemon TCG products — booster packs, boxes, ETBs, UPCs, tins.
 * Tracked as a parallel catalogue to singles: no grade axis, no condition
 * variance (all listings are factory-sealed), so pricing is a single
 * stream of TCGPlayer Market Price rather than the 7-grade matrix we
 * compute for graded singles.
 *
 * Pricing source: TCGPlayer Market Price. Deep-link via
 * `tcgplayerProductId` when known, otherwise fall back to the pre-built
 * `tcgplayerUrl` search query.
 */

export type SealedType =
  | 'booster-pack'    // single 10-card pack
  | 'booster-bundle'  // 6-pack bundle / blister 3-pack
  | 'booster-box'     // 36-pack box
  | 'etb'             // Elite Trainer Box
  | 'upc'             // Ultra Premium Collection
  | 'collection-box'  // Collection / Special Collection / Premium Collection
  | 'tin'             // Mini / V / ex tin
  | 'booster-case';   // sealed case — usually 6 booster boxes

export interface SealedProduct {
  /** Stable id — `{setId}-{type}` for set-tied products, free-form otherwise */
  id: string;
  name: string;
  type: SealedType;
  /** Human-readable product subtitle — e.g. "36 Booster Packs" */
  contents: string;
  /** Parent set id (maps to Pokemon TCG API set ids where possible) */
  setId: string;
  setName: string;
  /** Release date — ISO yyyy-mm-dd. Blank string if not applicable. */
  releaseDate: string;
  /** Manufacturer suggested retail price in USD */
  msrp: number;
  /** Image — set logo from pokemontcg.io when we don't have a product shot */
  imageUrl: string;
  /**
   * TCGPlayer numeric product id (from their URL: `/product/{id}/...`).
   * Optional — when populated we deep-link to the product page and the
   * pricing proxy can scrape the Market Price block directly. When
   * absent, the app falls back to `tcgplayerUrl` (a pre-built search
   * URL that lands on the product via the search index).
   */
  tcgplayerProductId?: string;
  /**
   * TCGPlayer product or search URL. Always populated — direct product
   * link when we have a verified id, otherwise a pre-built search query
   * that reliably lands on the sealed product.
   */
  tcgplayerUrl: string;
}

export interface SealedPrice {
  productId: string;
  /** Current TCGPlayer Market Price (rolling 14-day, new/sealed only) */
  currentPrice: number;
  previousPrice: number;
  percentChange: number;
  averagePrice: number;
  highPrice: number;
  lowPrice: number;
  salesCount: number;
  /** ISO yyyy-mm-dd of most recent sale */
  lastSaleDate: string;
  lastSalePrice: number;
}

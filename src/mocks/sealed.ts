import type { SealedProduct, SealedPrice } from '../types/sealed';

/**
 * Curated sealed-product catalogue — the ~50 SKUs collectors actually
 * track. Ordered roughly by current market heat (Prismatic Evolutions
 * first because it's the current chase set). When a new set drops, add
 * its ETB / BB / booster pack at the top — this is a marketing surface
 * plus the fallback for the search index, not a full database.
 *
 * Image strategy: no product photography in the app bundle. `imageUrl`
 * points to the parent set's logo from the Pokemon TCG API image CDN —
 * those URLs are stable and free to hotlink. The detail screen overlays
 * a product-type icon on top so the user can still tell a booster box
 * from an ETB at a glance.
 *
 * Pricing links target TCGPlayer. We use pre-built search URLs
 * (`productLineName=pokemon` scoped) for every product — these are
 * stable and always resolve even if we don't yet have the exact
 * numeric product id. As we verify ids against live TCGPlayer pages
 * we'll populate `tcgplayerProductId` so pricing fetches can hit the
 * direct product route.
 */

/** Build a TCGPlayer search URL scoped to Pokemon sealed products. */
const tcgSearch = (query: string) =>
  `https://www.tcgplayer.com/search/pokemon/product?productLineName=pokemon&q=${encodeURIComponent(query).replace(/%20/g, '+')}&view=grid&ProductTypeName=Sealed+Products`;

export const SEALED_PRODUCTS: SealedProduct[] = [
  // ── Prismatic Evolutions (Jan 2025) — current chase set ──
  {
    id: 'sv8pt5-etb',
    name: 'Prismatic Evolutions Elite Trainer Box',
    type: 'etb',
    contents: '9 booster packs · accessories',
    setId: 'sv8pt5',
    setName: 'Prismatic Evolutions',
    releaseDate: '2025-01-17',
    msrp: 49.99,
    imageUrl: 'https://images.pokemontcg.io/sv8pt5/logo.png',
    tcgplayerUrl: tcgSearch('Prismatic Evolutions Elite Trainer Box'),
  },
  {
    id: 'sv8pt5-upc',
    name: 'Prismatic Evolutions Super Premium Collection',
    type: 'upc',
    contents: '10 booster packs · 3 promo cards · 65 sleeves',
    setId: 'sv8pt5',
    setName: 'Prismatic Evolutions',
    releaseDate: '2025-01-17',
    msrp: 119.99,
    imageUrl: 'https://images.pokemontcg.io/sv8pt5/logo.png',
    tcgplayerUrl: tcgSearch('Prismatic Evolutions Super Premium Collection'),
  },
  {
    id: 'sv8pt5-booster-bundle',
    name: 'Prismatic Evolutions Booster Bundle',
    type: 'booster-bundle',
    contents: '6 booster packs',
    setId: 'sv8pt5',
    setName: 'Prismatic Evolutions',
    releaseDate: '2025-01-17',
    msrp: 26.94,
    imageUrl: 'https://images.pokemontcg.io/sv8pt5/logo.png',
    tcgplayerUrl: tcgSearch('Prismatic Evolutions Booster Bundle'),
  },
  {
    id: 'sv8pt5-booster-pack',
    name: 'Prismatic Evolutions Booster Pack',
    type: 'booster-pack',
    contents: '10 cards',
    setId: 'sv8pt5',
    setName: 'Prismatic Evolutions',
    releaseDate: '2025-01-17',
    msrp: 4.49,
    imageUrl: 'https://images.pokemontcg.io/sv8pt5/logo.png',
    tcgplayerUrl: tcgSearch('Prismatic Evolutions Booster Pack'),
  },

  // ── Surging Sparks (Nov 2024) — Pikachu ex / Terapagos chase ──
  {
    id: 'sv8-bb',
    name: 'Surging Sparks Booster Box',
    type: 'booster-box',
    contents: '36 booster packs',
    setId: 'sv8',
    setName: 'Surging Sparks',
    releaseDate: '2024-11-08',
    msrp: 161.64,
    imageUrl: 'https://images.pokemontcg.io/sv8/logo.png',
    tcgplayerUrl: tcgSearch('Surging Sparks Booster Box'),
  },
  {
    id: 'sv8-etb',
    name: 'Surging Sparks Elite Trainer Box',
    type: 'etb',
    contents: '9 booster packs · accessories',
    setId: 'sv8',
    setName: 'Surging Sparks',
    releaseDate: '2024-11-08',
    msrp: 49.99,
    imageUrl: 'https://images.pokemontcg.io/sv8/logo.png',
    tcgplayerUrl: tcgSearch('Surging Sparks Elite Trainer Box'),
  },
  {
    id: 'sv8-booster-pack',
    name: 'Surging Sparks Booster Pack',
    type: 'booster-pack',
    contents: '10 cards',
    setId: 'sv8',
    setName: 'Surging Sparks',
    releaseDate: '2024-11-08',
    msrp: 4.49,
    imageUrl: 'https://images.pokemontcg.io/sv8/logo.png',
    tcgplayerUrl: tcgSearch('Surging Sparks Booster Pack'),
  },
  {
    id: 'sv8-booster-bundle',
    name: 'Surging Sparks Booster Bundle',
    type: 'booster-bundle',
    contents: '6 booster packs',
    setId: 'sv8',
    setName: 'Surging Sparks',
    releaseDate: '2024-11-08',
    msrp: 26.94,
    imageUrl: 'https://images.pokemontcg.io/sv8/logo.png',
    tcgplayerUrl: tcgSearch('Surging Sparks Booster Bundle'),
  },

  // ── Stellar Crown (Sep 2024) ──
  {
    id: 'sv7-bb',
    name: 'Stellar Crown Booster Box',
    type: 'booster-box',
    contents: '36 booster packs',
    setId: 'sv7',
    setName: 'Stellar Crown',
    releaseDate: '2024-09-13',
    msrp: 161.64,
    imageUrl: 'https://images.pokemontcg.io/sv7/logo.png',
    tcgplayerUrl: tcgSearch('Stellar Crown Booster Box'),
  },
  {
    id: 'sv7-etb',
    name: 'Stellar Crown Elite Trainer Box',
    type: 'etb',
    contents: '9 booster packs · accessories',
    setId: 'sv7',
    setName: 'Stellar Crown',
    releaseDate: '2024-09-13',
    msrp: 49.99,
    imageUrl: 'https://images.pokemontcg.io/sv7/logo.png',
    tcgplayerUrl: tcgSearch('Stellar Crown Elite Trainer Box'),
  },
  {
    id: 'sv7-booster-pack',
    name: 'Stellar Crown Booster Pack',
    type: 'booster-pack',
    contents: '10 cards',
    setId: 'sv7',
    setName: 'Stellar Crown',
    releaseDate: '2024-09-13',
    msrp: 4.49,
    imageUrl: 'https://images.pokemontcg.io/sv7/logo.png',
    tcgplayerUrl: tcgSearch('Stellar Crown Booster Pack'),
  },

  // ── Twilight Masquerade (May 2024) ──
  {
    id: 'sv6-bb',
    name: 'Twilight Masquerade Booster Box',
    type: 'booster-box',
    contents: '36 booster packs',
    setId: 'sv6',
    setName: 'Twilight Masquerade',
    releaseDate: '2024-05-24',
    msrp: 161.64,
    imageUrl: 'https://images.pokemontcg.io/sv6/logo.png',
    tcgplayerUrl: tcgSearch('Twilight Masquerade Booster Box'),
  },
  {
    id: 'sv6-etb',
    name: 'Twilight Masquerade Elite Trainer Box',
    type: 'etb',
    contents: '9 booster packs · accessories',
    setId: 'sv6',
    setName: 'Twilight Masquerade',
    releaseDate: '2024-05-24',
    msrp: 49.99,
    imageUrl: 'https://images.pokemontcg.io/sv6/logo.png',
    tcgplayerUrl: tcgSearch('Twilight Masquerade Elite Trainer Box'),
  },

  // ── Temporal Forces (Mar 2024) ──
  {
    id: 'sv5-bb',
    name: 'Temporal Forces Booster Box',
    type: 'booster-box',
    contents: '36 booster packs',
    setId: 'sv5',
    setName: 'Temporal Forces',
    releaseDate: '2024-03-22',
    msrp: 161.64,
    imageUrl: 'https://images.pokemontcg.io/sv5/logo.png',
    tcgplayerUrl: tcgSearch('Temporal Forces Booster Box'),
  },
  {
    id: 'sv5-etb',
    name: 'Temporal Forces Elite Trainer Box',
    type: 'etb',
    contents: '9 booster packs · accessories',
    setId: 'sv5',
    setName: 'Temporal Forces',
    releaseDate: '2024-03-22',
    msrp: 49.99,
    imageUrl: 'https://images.pokemontcg.io/sv5/logo.png',
    tcgplayerUrl: tcgSearch('Temporal Forces Elite Trainer Box'),
  },

  // ── Paldean Fates (Jan 2024) — Shiny chase ──
  {
    id: 'sv4pt5-etb',
    name: 'Paldean Fates Elite Trainer Box',
    type: 'etb',
    contents: '9 booster packs · accessories',
    setId: 'sv4pt5',
    setName: 'Paldean Fates',
    releaseDate: '2024-01-26',
    msrp: 49.99,
    imageUrl: 'https://images.pokemontcg.io/sv4pt5/logo.png',
    tcgplayerUrl: tcgSearch('Paldean Fates Elite Trainer Box'),
  },
  {
    id: 'sv4pt5-upc',
    name: 'Paldean Fates Premium Collection',
    type: 'collection-box',
    contents: '7 booster packs · foil promo',
    setId: 'sv4pt5',
    setName: 'Paldean Fates',
    releaseDate: '2024-01-26',
    msrp: 39.99,
    imageUrl: 'https://images.pokemontcg.io/sv4pt5/logo.png',
    tcgplayerUrl: tcgSearch('Paldean Fates Premium Collection'),
  },

  // ── Paradox Rift (Nov 2023) ──
  {
    id: 'sv4-bb',
    name: 'Paradox Rift Booster Box',
    type: 'booster-box',
    contents: '36 booster packs',
    setId: 'sv4',
    setName: 'Paradox Rift',
    releaseDate: '2023-11-03',
    msrp: 161.64,
    imageUrl: 'https://images.pokemontcg.io/sv4/logo.png',
    tcgplayerUrl: tcgSearch('Paradox Rift Booster Box'),
  },
  {
    id: 'sv4-etb',
    name: 'Paradox Rift Elite Trainer Box',
    type: 'etb',
    contents: '9 booster packs · accessories',
    setId: 'sv4',
    setName: 'Paradox Rift',
    releaseDate: '2023-11-03',
    msrp: 49.99,
    imageUrl: 'https://images.pokemontcg.io/sv4/logo.png',
    tcgplayerUrl: tcgSearch('Paradox Rift Elite Trainer Box'),
  },

  // ── Pokemon 151 (Sep 2023) — perennial chase product ──
  {
    id: 'sv3pt5-upc',
    name: '151 Ultra Premium Collection',
    type: 'upc',
    contents: '16 booster packs · oversized promos',
    setId: 'sv3pt5',
    setName: '151',
    releaseDate: '2023-10-06',
    msrp: 119.99,
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/logo.png',
    tcgplayerUrl: tcgSearch('151 Ultra Premium Collection'),
  },
  {
    id: 'sv3pt5-etb',
    name: '151 Elite Trainer Box',
    type: 'etb',
    contents: '9 booster packs · accessories',
    setId: 'sv3pt5',
    setName: '151',
    releaseDate: '2023-10-06',
    msrp: 49.99,
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/logo.png',
    tcgplayerUrl: tcgSearch('151 Elite Trainer Box'),
  },
  {
    id: 'sv3pt5-bb',
    name: '151 Booster Bundle',
    type: 'booster-bundle',
    contents: '6 booster packs',
    setId: 'sv3pt5',
    setName: '151',
    releaseDate: '2023-10-06',
    msrp: 26.94,
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/logo.png',
    tcgplayerUrl: tcgSearch('151 Booster Bundle'),
  },
  {
    id: 'sv3pt5-booster-pack',
    name: '151 Booster Pack',
    type: 'booster-pack',
    contents: '10 cards',
    setId: 'sv3pt5',
    setName: '151',
    releaseDate: '2023-10-06',
    msrp: 4.49,
    imageUrl: 'https://images.pokemontcg.io/sv3pt5/logo.png',
    tcgplayerUrl: tcgSearch('151 Booster Pack'),
  },

  // ── Obsidian Flames (Aug 2023) ──
  {
    id: 'sv3-bb',
    name: 'Obsidian Flames Booster Box',
    type: 'booster-box',
    contents: '36 booster packs',
    setId: 'sv3',
    setName: 'Obsidian Flames',
    releaseDate: '2023-08-11',
    msrp: 161.64,
    imageUrl: 'https://images.pokemontcg.io/sv3/logo.png',
    tcgplayerUrl: tcgSearch('Obsidian Flames Booster Box'),
  },
  {
    id: 'sv3-etb',
    name: 'Obsidian Flames Elite Trainer Box',
    type: 'etb',
    contents: '9 booster packs · accessories',
    setId: 'sv3',
    setName: 'Obsidian Flames',
    releaseDate: '2023-08-11',
    msrp: 49.99,
    imageUrl: 'https://images.pokemontcg.io/sv3/logo.png',
    tcgplayerUrl: tcgSearch('Obsidian Flames Elite Trainer Box'),
  },

  // ── Paldea Evolved (Jun 2023) ──
  {
    id: 'sv2-bb',
    name: 'Paldea Evolved Booster Box',
    type: 'booster-box',
    contents: '36 booster packs',
    setId: 'sv2',
    setName: 'Paldea Evolved',
    releaseDate: '2023-06-09',
    msrp: 161.64,
    imageUrl: 'https://images.pokemontcg.io/sv2/logo.png',
    tcgplayerUrl: tcgSearch('Paldea Evolved Booster Box'),
  },

  // ── Crown Zenith (Jan 2023) ──
  {
    id: 'swsh12pt5-etb',
    name: 'Crown Zenith Elite Trainer Box',
    type: 'etb',
    contents: '10 booster packs · accessories',
    setId: 'swsh12pt5',
    setName: 'Crown Zenith',
    releaseDate: '2023-01-20',
    msrp: 49.99,
    imageUrl: 'https://images.pokemontcg.io/swsh12pt5/logo.png',
    tcgplayerUrl: tcgSearch('Crown Zenith Elite Trainer Box'),
  },

  // ── Silver Tempest (Nov 2022) ──
  {
    id: 'swsh12-bb',
    name: 'Silver Tempest Booster Box',
    type: 'booster-box',
    contents: '36 booster packs',
    setId: 'swsh12',
    setName: 'Silver Tempest',
    releaseDate: '2022-11-11',
    msrp: 143.64,
    imageUrl: 'https://images.pokemontcg.io/swsh12/logo.png',
    tcgplayerUrl: tcgSearch('Silver Tempest Booster Box'),
  },

  // ── Lost Origin (Sep 2022) — Giratina V chase ──
  {
    id: 'swsh11-bb',
    name: 'Lost Origin Booster Box',
    type: 'booster-box',
    contents: '36 booster packs',
    setId: 'swsh11',
    setName: 'Lost Origin',
    releaseDate: '2022-09-09',
    msrp: 143.64,
    imageUrl: 'https://images.pokemontcg.io/swsh11/logo.png',
    tcgplayerUrl: tcgSearch('Lost Origin Booster Box'),
  },

  // ── Evolving Skies (Aug 2021) — Alt Art Rayquaza set, strongest modern hold ──
  {
    id: 'swsh7-bb',
    name: 'Evolving Skies Booster Box',
    type: 'booster-box',
    contents: '36 booster packs',
    setId: 'swsh7',
    setName: 'Evolving Skies',
    releaseDate: '2021-08-27',
    msrp: 143.64,
    imageUrl: 'https://images.pokemontcg.io/swsh7/logo.png',
    tcgplayerUrl: tcgSearch('Evolving Skies Booster Box'),
  },
  {
    id: 'swsh7-etb',
    name: 'Evolving Skies Elite Trainer Box',
    type: 'etb',
    contents: '8 booster packs · accessories',
    setId: 'swsh7',
    setName: 'Evolving Skies',
    releaseDate: '2021-08-27',
    msrp: 39.99,
    imageUrl: 'https://images.pokemontcg.io/swsh7/logo.png',
    tcgplayerUrl: tcgSearch('Evolving Skies Elite Trainer Box'),
  },
  {
    id: 'swsh7-booster-pack',
    name: 'Evolving Skies Booster Pack',
    type: 'booster-pack',
    contents: '10 cards',
    setId: 'swsh7',
    setName: 'Evolving Skies',
    releaseDate: '2021-08-27',
    msrp: 3.99,
    imageUrl: 'https://images.pokemontcg.io/swsh7/logo.png',
    tcgplayerUrl: tcgSearch('Evolving Skies Booster Pack'),
  },

  // ── Chilling Reign (Jun 2021) ──
  {
    id: 'swsh6-bb',
    name: 'Chilling Reign Booster Box',
    type: 'booster-box',
    contents: '36 booster packs',
    setId: 'swsh6',
    setName: 'Chilling Reign',
    releaseDate: '2021-06-18',
    msrp: 143.64,
    imageUrl: 'https://images.pokemontcg.io/swsh6/logo.png',
    tcgplayerUrl: tcgSearch('Chilling Reign Booster Box'),
  },

  // ── Shining Fates (Feb 2021) — Shiny Charizard VMAX ──
  {
    id: 'swsh45-etb',
    name: 'Shining Fates Elite Trainer Box',
    type: 'etb',
    contents: '10 booster packs · accessories',
    setId: 'swsh45',
    setName: 'Shining Fates',
    releaseDate: '2021-02-19',
    msrp: 39.99,
    imageUrl: 'https://images.pokemontcg.io/swsh45/logo.png',
    tcgplayerUrl: tcgSearch('Shining Fates Elite Trainer Box'),
  },

  // ── Hidden Fates (Aug 2019) — Shiny Charizard GX, blue-chip ──
  {
    id: 'sm115-etb',
    name: 'Hidden Fates Elite Trainer Box',
    type: 'etb',
    contents: '10 booster packs · accessories',
    setId: 'sm115',
    setName: 'Hidden Fates',
    releaseDate: '2019-08-23',
    msrp: 39.99,
    imageUrl: 'https://images.pokemontcg.io/sm115/logo.png',
    tcgplayerUrl: tcgSearch('Hidden Fates Elite Trainer Box'),
  },
];

/**
 * Seeded April 2026 TCGPlayer Market Prices (new/sealed only). Used as a
 * fallback while the live TCGPlayer pricing proxy is being built out —
 * same pattern as `MOCK_PRICES` for singles. Numbers are directional
 * (eye-check reasonable against current TCGPlayer listings, not scraped
 * live), so every value here carries the "Sample data" badge on the Home
 * tab until the server swap lands.
 *
 * Ordering matches `SEALED_PRODUCTS` for easy eyeball diff.
 */
export const SEALED_PRICES: Record<string, SealedPrice> = {
  'sv8pt5-etb': {
    productId: 'sv8pt5-etb',
    currentPrice: 325, previousPrice: 298, percentChange: 9.06,
    averagePrice: 312, highPrice: 375, lowPrice: 270, salesCount: 184,
    lastSaleDate: '2026-04-18', lastSalePrice: 330,
  },
  'sv8pt5-upc': {
    productId: 'sv8pt5-upc',
    currentPrice: 699, previousPrice: 649, percentChange: 7.70,
    averagePrice: 672, highPrice: 799, lowPrice: 585, salesCount: 62,
    lastSaleDate: '2026-04-17', lastSalePrice: 710,
  },
  'sv8pt5-booster-bundle': {
    productId: 'sv8pt5-booster-bundle',
    currentPrice: 210, previousPrice: 195, percentChange: 7.69,
    averagePrice: 202, highPrice: 240, lowPrice: 180, salesCount: 148,
    lastSaleDate: '2026-04-18', lastSalePrice: 215,
  },
  'sv8pt5-booster-pack': {
    productId: 'sv8pt5-booster-pack',
    currentPrice: 42, previousPrice: 38, percentChange: 10.53,
    averagePrice: 40, highPrice: 52, lowPrice: 32, salesCount: 612,
    lastSaleDate: '2026-04-19', lastSalePrice: 45,
  },
  'sv8-bb': {
    productId: 'sv8-bb',
    currentPrice: 182, previousPrice: 175, percentChange: 4.00,
    averagePrice: 179, highPrice: 195, lowPrice: 168, salesCount: 91,
    lastSaleDate: '2026-04-18', lastSalePrice: 184,
  },
  'sv8-etb': {
    productId: 'sv8-etb',
    currentPrice: 62, previousPrice: 58, percentChange: 6.90,
    averagePrice: 60, highPrice: 70, lowPrice: 52, salesCount: 215,
    lastSaleDate: '2026-04-18', lastSalePrice: 64,
  },
  'sv8-booster-pack': {
    productId: 'sv8-booster-pack',
    currentPrice: 6.50, previousPrice: 6.00, percentChange: 8.33,
    averagePrice: 6.30, highPrice: 8, lowPrice: 4.50, salesCount: 840,
    lastSaleDate: '2026-04-19', lastSalePrice: 7,
  },
  'sv8-booster-bundle': {
    productId: 'sv8-booster-bundle',
    currentPrice: 35, previousPrice: 32, percentChange: 9.38,
    averagePrice: 33, highPrice: 40, lowPrice: 28, salesCount: 202,
    lastSaleDate: '2026-04-18', lastSalePrice: 36,
  },
  'sv7-bb': {
    productId: 'sv7-bb',
    currentPrice: 158, previousPrice: 162, percentChange: -2.47,
    averagePrice: 160, highPrice: 175, lowPrice: 148, salesCount: 68,
    lastSaleDate: '2026-04-17', lastSalePrice: 156,
  },
  'sv7-etb': {
    productId: 'sv7-etb',
    currentPrice: 55, previousPrice: 56, percentChange: -1.79,
    averagePrice: 55, highPrice: 62, lowPrice: 48, salesCount: 180,
    lastSaleDate: '2026-04-18', lastSalePrice: 55,
  },
  'sv7-booster-pack': {
    productId: 'sv7-booster-pack',
    currentPrice: 5.50, previousPrice: 5.25, percentChange: 4.76,
    averagePrice: 5.40, highPrice: 7, lowPrice: 4, salesCount: 720,
    lastSaleDate: '2026-04-19', lastSalePrice: 5.75,
  },
  'sv6-bb': {
    productId: 'sv6-bb',
    currentPrice: 150, previousPrice: 155, percentChange: -3.23,
    averagePrice: 152, highPrice: 168, lowPrice: 142, salesCount: 72,
    lastSaleDate: '2026-04-17', lastSalePrice: 148,
  },
  'sv6-etb': {
    productId: 'sv6-etb',
    currentPrice: 52, previousPrice: 53, percentChange: -1.89,
    averagePrice: 52, highPrice: 58, lowPrice: 46, salesCount: 164,
    lastSaleDate: '2026-04-18', lastSalePrice: 51,
  },
  'sv5-bb': {
    productId: 'sv5-bb',
    currentPrice: 148, previousPrice: 152, percentChange: -2.63,
    averagePrice: 150, highPrice: 165, lowPrice: 140, salesCount: 58,
    lastSaleDate: '2026-04-17', lastSalePrice: 147,
  },
  'sv5-etb': {
    productId: 'sv5-etb',
    currentPrice: 51, previousPrice: 50, percentChange: 2.00,
    averagePrice: 50, highPrice: 56, lowPrice: 44, salesCount: 140,
    lastSaleDate: '2026-04-18', lastSalePrice: 52,
  },
  'sv4pt5-etb': {
    productId: 'sv4pt5-etb',
    currentPrice: 95, previousPrice: 88, percentChange: 7.95,
    averagePrice: 91, highPrice: 108, lowPrice: 82, salesCount: 132,
    lastSaleDate: '2026-04-18', lastSalePrice: 97,
  },
  'sv4pt5-upc': {
    productId: 'sv4pt5-upc',
    currentPrice: 68, previousPrice: 64, percentChange: 6.25,
    averagePrice: 66, highPrice: 75, lowPrice: 58, salesCount: 108,
    lastSaleDate: '2026-04-18', lastSalePrice: 69,
  },
  'sv4-bb': {
    productId: 'sv4-bb',
    currentPrice: 155, previousPrice: 150, percentChange: 3.33,
    averagePrice: 152, highPrice: 168, lowPrice: 144, salesCount: 84,
    lastSaleDate: '2026-04-17', lastSalePrice: 156,
  },
  'sv4-etb': {
    productId: 'sv4-etb',
    currentPrice: 54, previousPrice: 52, percentChange: 3.85,
    averagePrice: 53, highPrice: 60, lowPrice: 48, salesCount: 155,
    lastSaleDate: '2026-04-18', lastSalePrice: 55,
  },
  'sv3pt5-upc': {
    productId: 'sv3pt5-upc',
    currentPrice: 285, previousPrice: 262, percentChange: 8.78,
    averagePrice: 275, highPrice: 320, lowPrice: 240, salesCount: 98,
    lastSaleDate: '2026-04-18', lastSalePrice: 290,
  },
  'sv3pt5-etb': {
    productId: 'sv3pt5-etb',
    currentPrice: 115, previousPrice: 108, percentChange: 6.48,
    averagePrice: 112, highPrice: 128, lowPrice: 100, salesCount: 167,
    lastSaleDate: '2026-04-18', lastSalePrice: 118,
  },
  'sv3pt5-bb': {
    productId: 'sv3pt5-bb',
    currentPrice: 62, previousPrice: 58, percentChange: 6.90,
    averagePrice: 60, highPrice: 70, lowPrice: 52, salesCount: 190,
    lastSaleDate: '2026-04-18', lastSalePrice: 63,
  },
  'sv3pt5-booster-pack': {
    productId: 'sv3pt5-booster-pack',
    currentPrice: 12, previousPrice: 11, percentChange: 9.09,
    averagePrice: 11.50, highPrice: 14, lowPrice: 9, salesCount: 520,
    lastSaleDate: '2026-04-19', lastSalePrice: 12.50,
  },
  'sv3-bb': {
    productId: 'sv3-bb',
    currentPrice: 175, previousPrice: 172, percentChange: 1.74,
    averagePrice: 173, highPrice: 188, lowPrice: 165, salesCount: 76,
    lastSaleDate: '2026-04-17', lastSalePrice: 176,
  },
  'sv3-etb': {
    productId: 'sv3-etb',
    currentPrice: 58, previousPrice: 55, percentChange: 5.45,
    averagePrice: 56, highPrice: 62, lowPrice: 50, salesCount: 138,
    lastSaleDate: '2026-04-18', lastSalePrice: 59,
  },
  'sv2-bb': {
    productId: 'sv2-bb',
    currentPrice: 168, previousPrice: 165, percentChange: 1.82,
    averagePrice: 166, highPrice: 180, lowPrice: 158, salesCount: 64,
    lastSaleDate: '2026-04-17', lastSalePrice: 170,
  },
  'swsh12pt5-etb': {
    productId: 'swsh12pt5-etb',
    currentPrice: 72, previousPrice: 68, percentChange: 5.88,
    averagePrice: 70, highPrice: 82, lowPrice: 60, salesCount: 152,
    lastSaleDate: '2026-04-18', lastSalePrice: 73,
  },
  'swsh12-bb': {
    productId: 'swsh12-bb',
    currentPrice: 188, previousPrice: 182, percentChange: 3.30,
    averagePrice: 185, highPrice: 205, lowPrice: 172, salesCount: 54,
    lastSaleDate: '2026-04-17', lastSalePrice: 190,
  },
  'swsh11-bb': {
    productId: 'swsh11-bb',
    currentPrice: 225, previousPrice: 218, percentChange: 3.21,
    averagePrice: 220, highPrice: 245, lowPrice: 205, salesCount: 48,
    lastSaleDate: '2026-04-16', lastSalePrice: 228,
  },
  'swsh7-bb': {
    productId: 'swsh7-bb',
    currentPrice: 1150, previousPrice: 1080, percentChange: 6.48,
    averagePrice: 1110, highPrice: 1300, lowPrice: 985, salesCount: 38,
    lastSaleDate: '2026-04-17', lastSalePrice: 1175,
  },
  'swsh7-etb': {
    productId: 'swsh7-etb',
    currentPrice: 285, previousPrice: 268, percentChange: 6.34,
    averagePrice: 275, highPrice: 320, lowPrice: 245, salesCount: 92,
    lastSaleDate: '2026-04-18', lastSalePrice: 290,
  },
  'swsh7-booster-pack': {
    productId: 'swsh7-booster-pack',
    currentPrice: 32, previousPrice: 29, percentChange: 10.34,
    averagePrice: 30, highPrice: 38, lowPrice: 24, salesCount: 445,
    lastSaleDate: '2026-04-19', lastSalePrice: 33,
  },
  'swsh6-bb': {
    productId: 'swsh6-bb',
    currentPrice: 245, previousPrice: 240, percentChange: 2.08,
    averagePrice: 242, highPrice: 265, lowPrice: 225, salesCount: 42,
    lastSaleDate: '2026-04-17', lastSalePrice: 248,
  },
  'swsh45-etb': {
    productId: 'swsh45-etb',
    currentPrice: 165, previousPrice: 158, percentChange: 4.43,
    averagePrice: 160, highPrice: 182, lowPrice: 145, salesCount: 68,
    lastSaleDate: '2026-04-18', lastSalePrice: 167,
  },
  'sm115-etb': {
    productId: 'sm115-etb',
    currentPrice: 295, previousPrice: 282, percentChange: 4.61,
    averagePrice: 288, highPrice: 325, lowPrice: 265, salesCount: 52,
    lastSaleDate: '2026-04-17', lastSalePrice: 298,
  },
};

export function getSealedProduct(id: string): SealedProduct | undefined {
  return SEALED_PRODUCTS.find((p) => p.id === id);
}

export function getSealedPrice(id: string): SealedPrice | undefined {
  return SEALED_PRICES[id];
}

/**
 * Client-side catalog search. `query` is matched against product name,
 * set name, and type label. `typeFilter` narrows to a specific product
 * category (e.g. only booster boxes).
 */
export function searchSealedProducts(
  query: string,
  typeFilter?: import('../types/sealed').SealedType,
): SealedProduct[] {
  const q = query.trim().toLowerCase();
  return SEALED_PRODUCTS.filter((p) => {
    if (typeFilter && p.type !== typeFilter) return false;
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.setName.toLowerCase().includes(q) ||
      p.type.replace('-', ' ').includes(q)
    );
  });
}

/** Display label for each SealedType — used in chips and detail hero. */
export const SEALED_TYPE_LABEL: Record<import('../types/sealed').SealedType, string> = {
  'booster-pack': 'Booster Pack',
  'booster-bundle': 'Booster Bundle',
  'booster-box': 'Booster Box',
  etb: 'Elite Trainer Box',
  upc: 'Ultra Premium',
  'collection-box': 'Collection',
  tin: 'Tin',
  'booster-case': 'Case',
};

/** Build a TCGPlayer deep-link URL from a numeric product id. */
export function tcgPlayerProductUrl(productId: string): string {
  return `https://www.tcgplayer.com/product/${productId}`;
}

import type { PokemonCard } from '../types/card';

const BASE_URL = 'https://api.pokemontcg.io/v2';

interface PokemonTcgResponse {
  data: any[];
  totalCount: number;
  page: number;
  pageSize: number;
}

function mapCard(raw: any): PokemonCard {
  return {
    id: raw.id,
    name: raw.name,
    supertype: raw.supertype || '',
    subtypes: raw.subtypes || [],
    hp: raw.hp,
    types: raw.types || [],
    set: {
      id: raw.set?.id || '',
      name: raw.set?.name || '',
      series: raw.set?.series || '',
      releaseDate: raw.set?.releaseDate || '',
      images: {
        symbol: raw.set?.images?.symbol || '',
        logo: raw.set?.images?.logo || '',
      },
    },
    number: raw.number || '',
    rarity: raw.rarity,
    language: isJapaneseSet(raw.set?.id || '', raw.set?.name || '') ? 'JP' : 'EN',
    artist: raw.artist || undefined,
    images: {
      small: raw.images?.small || '',
      large: raw.images?.large || '',
    },
    // Extract TCGPlayer market price and URL if available
    tcgPlayerPrice: extractTcgPrice(raw.tcgplayer, 'market'),
    tcgPlayerMidPrice: extractTcgPrice(raw.tcgplayer, 'mid'),
    tcgPlayerUrl: raw.tcgplayer?.url || undefined,
  };
}

function extractTcgPrice(tcgplayer: any, field: 'market' | 'mid' = 'market'): number | undefined {
  if (!tcgplayer?.prices) return undefined;
  const variants = ['holofoil', 'reverseHolofoil', 'normal', '1stEditionHolofoil', '1stEditionNormal'];
  for (const v of variants) {
    const val = tcgplayer.prices[v]?.[field];
    if (val && val > 0) return val;
  }
  for (const key of Object.keys(tcgplayer.prices)) {
    const val = tcgplayer.prices[key]?.[field];
    if (val && val > 0) return val;
  }
  return undefined;
}

/** Japanese sets in the Pokemon TCG API use specific prefixes */
function isJapaneseSet(setId: string, setName: string): boolean {
  // Japanese set IDs typically start with these prefixes
  const jpPrefixes = ['sv', 'sm', 'xy', 'bw', 'dp', 'ex', 'ecard'];
  const jpIndicators = ['Japanese', 'Japan', 'プロモ', 'ジャパン'];

  // Check set name for Japanese indicators
  if (jpIndicators.some((ind) => setName.includes(ind))) return true;

  // Japanese-only sets have specific IDs (e.g., svF, svG, sm11a, etc.)
  // Sets ending with lowercase letters (a, b, c) after numbers are typically JP-exclusive
  if (/\d+[a-z]$/.test(setId)) return true;

  // Check for common JP-only set ID patterns
  const jpOnlySets = ['svF', 'svG', 'svH', 'sm11a', 'sm11b', 'sm12a'];
  if (jpOnlySets.some((s) => setId.startsWith(s))) return true;

  return false;
}

export async function searchCards(
  query: string,
  page: number = 1,
  pageSize: number = 20,
): Promise<{ cards: PokemonCard[]; totalCount: number }> {
  // Search by name, supporting partial matches
  // Also searches Japanese card names via the API's built-in localization
  const q = `name:"${query}*"`;
  const params = new URLSearchParams({
    q,
    page: String(page),
    pageSize: String(pageSize),
    orderBy: '-set.releaseDate',
    // Include all regions (Japanese sets are in the database)
  });

  const response = await fetch(`${BASE_URL}/cards?${params}`);
  if (!response.ok) {
    throw new Error(`Pokemon TCG API error: ${response.status}`);
  }

  const data: PokemonTcgResponse = await response.json();
  return {
    cards: (data.data || []).map(mapCard),
    totalCount: data.totalCount || 0,
  };
}

export async function getCard(id: string): Promise<PokemonCard | null> {
  const response = await fetch(`${BASE_URL}/cards/${id}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Pokemon TCG API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data ? mapCard(data.data) : null;
}

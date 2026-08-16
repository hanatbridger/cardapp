// Japanese card catalog client — /api/jp-search proxy over TCGPlayer's
// Pokemon Japan product line. Replaces the tcgdex search source, whose
// JP database covers only a sliver of the real print history. English
// names are native here; typed Japanese species names are reverse-
// translated through the bundled map.
import { Platform } from 'react-native';
import type { PokemonCard } from '../types/card';
import JA_NAMES from '../data/ja-names.json';

const PROXY_ORIGIN = (() => {
  if (Platform.OS !== 'web') {
    return process.env.EXPO_PUBLIC_API_URL ?? 'https://strange-saha.vercel.app';
  }
  if (__DEV__) return 'https://strange-saha.vercel.app';
  return '';
})();

// Dev-web fallback: local api server on :3001 serves undeployed api/
// routes (same pattern as card-stats.ts).
const DEV_LOCAL_ORIGIN =
  __DEV__ && Platform.OS === 'web' ? 'http://localhost:3001' : null;

interface JpProduct {
  productId: number;
  name: string;
  setName: string;
  number: string;
  rarity: string | null;
  marketPrice: number | null;
  imageUrl: string;
}

// ja→en reverse index so typed Japanese still searches ("リザードン" →
// "charizard"). Folded the same way on lookup.
const EN_BY_JA: Record<string, string> = {};
for (const [en, ja] of Object.entries(JA_NAMES as Record<string, string>)) {
  EN_BY_JA[ja] = en;
}

function toEnglishQuery(query: string): string {
  const q = query.trim();
  const direct = EN_BY_JA[q];
  if (direct) return direct;
  const firstWord = q.split(/\s+/)[0];
  return EN_BY_JA[firstWord] ?? q;
}

/** "011/018" → "011"; keeps plain numbers untouched. */
function shortNumber(n: string): string {
  const slash = n.indexOf('/');
  return slash > 0 ? n.slice(0, slash) : n;
}

function toCard(p: JpProduct): PokemonCard {
  return {
    id: `jptp-${p.productId}`,
    name: p.name,
    supertype: 'Pokémon',
    subtypes: [],
    types: [],
    set: {
      id: `jptp-set-${p.setName}`,
      name: p.setName,
      series: 'Japanese',
      releaseDate: '',
      images: { symbol: '', logo: '' },
    },
    number: shortNumber(p.number),
    rarity: p.rarity ?? undefined,
    language: 'JP',
    artist: undefined,
    images: {
      small: p.imageUrl,
      large: p.imageUrl.replace('_in_400x400', '_in_1000x1000'),
    },
    tcgPlayerPrice: p.marketPrice ?? undefined,
    tcgPlayerMidPrice: undefined,
    tcgPlayerUrl: `https://www.tcgplayer.com/product/${p.productId}`,
  };
}

async function fetchFrom(origin: string, path: string): Promise<any | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 10000);
  try {
    const res = await fetch(`${origin}${path}`, { signal: ctl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(path: string): Promise<any | null> {
  const primary = await fetchFrom(PROXY_ORIGIN, path);
  if (primary) return primary;
  if (DEV_LOCAL_ORIGIN) return fetchFrom(DEV_LOCAL_ORIGIN, path);
  return null;
}

export async function searchJapaneseCatalog(query: string): Promise<PokemonCard[]> {
  const q = toEnglishQuery(query);
  if (q.length < 2) return [];
  const data = await fetchJson(`/api/jp-search?q=${encodeURIComponent(q)}`);
  const products: JpProduct[] = Array.isArray(data?.products) ? data.products : [];
  return products.map(toCard);
}

export async function getJapaneseProduct(productId: string): Promise<PokemonCard | null> {
  const data = await fetchJson(`/api/jp-search?pid=${encodeURIComponent(productId)}`);
  return data?.product ? toCard(data.product as JpProduct) : null;
}

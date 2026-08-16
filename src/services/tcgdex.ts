import type { PokemonCard } from '../types/card';
import { fetchWithTimeout } from './api-client';
import jaNames from '../data/ja-names.json';

const BASE_URL = 'https://api.tcgdex.net/v2/ja';

const JA_NAMES: Record<string, string> = jaNames;

/**
 * English query → Japanese species name for the tcgdex JA endpoint.
 * Strips a trailing "jp"/"japanese" qualifier ("charizard jp"), then
 * matches the whole query or its first word against the PokeAPI-derived
 * species map. No match → the raw query passes through, so typed
 * Japanese (ピカチュウ) works untouched.
 */
// The species map keeps official punctuation ("farfetch'd", "mr. mime",
// "nidoran\u2640") that nobody types; fold both sides to bare ascii
// alphanumerics so "farfetchd" and "mr mime" still translate.
function foldKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '');
}
const JA_BY_FOLDED: Record<string, string> = {};
for (const [en, ja] of Object.entries(JA_NAMES)) {
  JA_BY_FOLDED[foldKey(en)] = ja as string;
}

function toJapaneseQuery(query: string): string {
  // Qualifier can lead or trail ("jp pikachu", "pikachu japanese").
  const stripped = query
    .trim()
    .replace(/^(jp|japanese)\s+/i, '')
    .replace(/\s+(jp|japanese)$/i, '')
    .trim();
  const direct = JA_BY_FOLDED[foldKey(stripped)];
  if (direct) return direct;
  const firstWord = stripped.split(/\s+/)[0];
  const byFirst = JA_BY_FOLDED[foldKey(firstWord)];
  if (byFirst) return byFirst;
  return stripped;
}

/** tcgdex ids are `{setId}-{localId}` — recover the set id prefix. */
function setIdFromCardId(id: string, localId: string): string {
  if (id.endsWith(`-${localId}`)) return id.slice(0, id.length - localId.length - 1);
  const dash = id.lastIndexOf('-');
  return dash > 0 ? id.slice(0, dash) : id;
}

interface TcgdexListRow {
  id: string;
  localId: string;
  name: string;
  image?: string;
}

function mapListRow(raw: TcgdexListRow): PokemonCard {
  const setId = setIdFromCardId(raw.id, raw.localId || '');
  return {
    id: `jp-${raw.id}`,
    name: raw.name,
    supertype: '',
    subtypes: [],
    set: {
      id: setId,
      // List rows carry no set payload; the id doubles as a display name
      // until the detail fetch fills the real one.
      name: setId,
      series: '',
      releaseDate: '',
      images: { symbol: '', logo: '' },
    },
    number: raw.localId || '',
    language: 'JP',
    images: {
      small: `${raw.image}/low.webp`,
      large: `${raw.image}/high.webp`,
    },
  };
}

/**
 * Japanese card search via tcgdex. Accepts English species names
 * (translated through ja-names.json) or raw Japanese text. Rows without
 * an image asset are dropped — they render as broken tiles and are
 * mostly ancient unscanned promos.
 */
export async function searchJapaneseCards(query: string): Promise<PokemonCard[]> {
  const q = toJapaneseQuery(query);
  if (!q) return [];

  const response = await fetchWithTimeout(
    `${BASE_URL}/cards?name=${encodeURIComponent(q)}`,
  );
  if (!response.ok) {
    throw new Error(`tcgdex API error: ${response.status}`);
  }

  const rows: TcgdexListRow[] = await response.json();
  if (!Array.isArray(rows)) return [];
  return rows.filter((r) => r && typeof r.image === 'string' && r.image).map(mapListRow);
}

/**
 * Full JP card detail. `tcgdexId` is the bare tcgdex id (e.g. "SV2a-006")
 * — the app-side "jp-" prefix already stripped by the caller.
 */
export async function getJapaneseCard(tcgdexId: string): Promise<PokemonCard | null> {
  const response = await fetchWithTimeout(
    `${BASE_URL}/cards/${encodeURIComponent(tcgdexId)}`,
  );
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`tcgdex API error: ${response.status}`);
  }

  const raw = await response.json();
  if (!raw?.id) return null;

  const localId = raw.localId || '';
  const setId = raw.set?.id || setIdFromCardId(raw.id, localId);
  return {
    id: `jp-${raw.id}`,
    name: raw.name || '',
    supertype: raw.category === 'Pokemon' ? 'Pokémon' : raw.category || '',
    subtypes: [raw.stage, raw.suffix].filter((s: unknown): s is string => typeof s === 'string'),
    hp: raw.hp != null ? String(raw.hp) : undefined,
    types: raw.types || [],
    set: {
      id: setId,
      name: raw.set?.name || setId,
      series: '',
      releaseDate: '',
      images: { symbol: '', logo: '' },
    },
    number: localId,
    rarity: raw.rarity || undefined,
    language: 'JP',
    artist: raw.illustrator || undefined,
    images: {
      small: raw.image ? `${raw.image}/low.webp` : '',
      large: raw.image ? `${raw.image}/high.webp` : '',
    },
    tcgPlayerPrice: undefined,
    tcgPlayerMidPrice: undefined,
    tcgPlayerUrl: undefined,
  };
}

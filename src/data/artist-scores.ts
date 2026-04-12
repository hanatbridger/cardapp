/**
 * Artist Desirability Scores
 *
 * Scored 1-10 based on how many high-value chase cards the artist has illustrated.
 * Higher score = more chase cards = collectors specifically seek out their artwork.
 */

interface ArtistScore {
  name: string;
  score: number;
  notableCards: string[];
}

const ARTIST_DATA: ArtistScore[] = [
  { name: 'GIDORA', score: 10, notableCards: ['Pikachu ex SIR (Surging Sparks)', 'Multiple SIR cards'] },
  { name: 'Anesaki Dynamic', score: 9.5, notableCards: ['Charizard ex SIR (Obsidian Flames)', 'Rayquaza VMAX AA'] },
  { name: 'miki kudo', score: 9, notableCards: ['Charizard ex SIR (151)', 'Venusaur ex SIR (151)'] },
  { name: 'YASHIRO Nanaco', score: 9.5, notableCards: ['Umbreon ex SIR (Prismatic Evolutions)'] },
  { name: 'kirisAki', score: 8.5, notableCards: ['Iono SIR (Paldea Evolved)', 'Multiple trainer SIRs'] },
  { name: 'aky CG Works', score: 8, notableCards: ['Mew ex HR (151)', 'Gold cards'] },
  { name: 'Kouki Saitou', score: 9, notableCards: ['Umbreon VMAX AA (Evolving Skies)', 'Moonbreon'] },
  { name: 'Souichirou Gunjima', score: 8.5, notableCards: ['Giratina VSTAR AA', 'Multiple alt arts'] },
  { name: 'PLANETA Mochizuki', score: 8, notableCards: ['Rayquaza VMAX AA (Evolving Skies)'] },
  { name: 'Ryuta Fuse', score: 7.5, notableCards: ['Charizard VSTAR (Brilliant Stars)', 'Multiple VSTAR cards'] },
  { name: 'Teeziro', score: 7, notableCards: ['Various illustration rares'] },
  { name: 'Kantaro', score: 7.5, notableCards: ['Gardevoir ex SIR', 'Multiple SIRs'] },
  { name: 'GOSSAN', score: 7, notableCards: ['Miraidon ex SIR (SV Base)'] },
  { name: 'Hitoshi Ariga', score: 6.5, notableCards: ['Classic Pokemon illustrations'] },
  { name: 'Mitsuhiro Arita', score: 8, notableCards: ['Original Base Set Charizard', 'Legendary illustrator'] },
  { name: 'kawayoo', score: 7.5, notableCards: ['Eevee Heroes cards', 'Eeveelution alt arts'] },
  { name: 'Narumi Sato', score: 7, notableCards: ['Various illustration rares'] },
  { name: 'joji', score: 6.5, notableCards: ['Various modern illustration rares'] },
  { name: 'Sanosuke Sakuma', score: 8, notableCards: ['Mewtwo ex SIR (Destined Rivals)'] },
  { name: 'James Turner', score: 7, notableCards: ['Pikachu ex (Ascended Heroes)'] },
];

/**
 * Get artist score by name (case-insensitive match)
 */
export function getArtistScore(artistName: string): ArtistScore | undefined {
  const lower = artistName.toLowerCase();
  return ARTIST_DATA.find((a) => a.name.toLowerCase() === lower);
}

/**
 * Get all artists sorted by score (highest first)
 */
export function getTopArtists(): ArtistScore[] {
  return [...ARTIST_DATA].sort((a, b) => b.score - a.score);
}

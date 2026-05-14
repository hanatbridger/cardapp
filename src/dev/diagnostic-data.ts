/**
 * Sample watchlist data for the diagnostic screens. Same shape used
 * by every layer of the bug-isolation walkthrough so the only
 * variable across screens is the rendering chain, not the data.
 *
 * Card ids are real Pokemon TCG ids that the production card detail
 * screen knows how to render — tapping a row routes to /card/{id}.
 */
export interface DiagnosticCard {
  cardId: string;
  cardName: string;
  setName: string;
}

export const SAMPLE_CARDS: DiagnosticCard[] = [
  { cardId: 'sv8pt5-1', cardName: 'Bulbasaur', setName: 'Prismatic Evolutions' },
  { cardId: 'sv8pt5-64', cardName: 'Tyranitar ex', setName: 'Prismatic Evolutions' },
  { cardId: 'sv4pt5-112', cardName: 'Entei', setName: 'Paldean Fates' },
  { cardId: 'me2-41', cardName: 'Mega Diancie ex', setName: 'Phantasmal Flames' },
  { cardId: 'sv4pt5-198', cardName: 'Jigglypuff', setName: 'Paldean Fates' },
];

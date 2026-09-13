/**
 * Canonical web base for CardPulse share links — the domain we own.
 * cardpulse.app is not ours. The site has no /card route yet, so a
 * shared link lands on the marketing site rather than the card; wire
 * these up as universal/app links when that route exists.
 */
export const SHARE_BASE_URL = 'https://getcardpulse.app';

export function cardShareUrl(cardId: string): string {
  return `${SHARE_BASE_URL}/card/${encodeURIComponent(cardId)}`;
}

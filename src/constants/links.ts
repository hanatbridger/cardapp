/**
 * Canonical web base for CardPulse share links. When the marketing site
 * goes live this should be wired up as a universal/app link so taps in
 * Messages/Mail open the app directly. For now it acts as a stable
 * identifier in shared messages.
 */
export const SHARE_BASE_URL = 'https://cardpulse.app';

export function cardShareUrl(cardId: string): string {
  return `${SHARE_BASE_URL}/card/${encodeURIComponent(cardId)}`;
}

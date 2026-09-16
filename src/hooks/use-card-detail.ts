import { useQuery } from '@tanstack/react-query';
import { getCard } from '../services/pokemon-tcg';
import { getJapaneseCard } from '../services/tcgdex';
import { getJapaneseProduct } from '../services/jp-catalog';
import { getGapProduct } from '../services/en-gap-catalog';
import { MOCK_CARDS } from '../mocks/cards';
import { queryClient } from '../lib/query-client';
import type { PokemonCard } from '../types/card';

/**
 * Scan already-fetched list caches (search results, similar-cards rail,
 * artist grids) for this card so the detail screen can paint instantly
 * instead of blocking on a cold pokemontcg.io round trip. Used as
 * placeholderData, NOT cache seeding: rail entries are field-projected
 * (no rarity/artist/tcgplayer), so they must never be stored as the
 * real detail — the network fetch still runs and fills everything in.
 */
function findCachedCard(cardId: string): PokemonCard | undefined {
  const queries = queryClient.getQueryCache().findAll();
  for (const q of queries) {
    const key0 = q.queryKey[0];
    if (key0 !== 'cards' && key0 !== 'artist') continue;
    const d = q.state.data as any;
    if (!d) continue;
    const list: any[] | undefined = Array.isArray(d)
      ? d
      : Array.isArray(d.cards)
        ? d.cards
        : undefined;
    if (!list) continue;
    const hit = list.find(
      (c) =>
        c &&
        c.id === cardId &&
        typeof c.images?.small === 'string' &&
        typeof c.set?.name === 'string',
    );
    if (hit) return hit as PokemonCard;
  }
  return undefined;
}

export function useCardDetail(cardId: string) {
  return useQuery({
    queryKey: ['cards', cardId],
    queryFn: async () => {
      // English gap-set cards (TCGPlayer, not yet on pokemontcg.io) —
      // id is 'entp-{productId}'. Kept after pokemontcg.io catches up so
      // saved cards still resolve.
      if (cardId.startsWith('entp-')) {
        const pid = cardId.slice(5);
        if (!/^\d{1,12}$/.test(pid)) throw new Error('Card not found');
        const card = await getGapProduct(pid);
        if (!card) throw new Error('Card not found');
        return card;
      }
      // Japanese cards (tcgdex) — id is 'jp-{tcgdexId}'
      if (cardId.startsWith('jptp-')) {
        const card = await getJapaneseProduct(cardId.slice(5));
        if (!card) throw new Error('Card not found');
        return card;
      }
      if (cardId.startsWith('jp-')) {
        const jpCard = await getJapaneseCard(cardId.slice(3));
        if (!jpCard) throw new Error('Card not found');
        return jpCard;
      }

      // Check mocks first (instant)
      const mock = MOCK_CARDS.find((c) => c.id === cardId);
      if (mock) return mock;

      // Fetch from Pokemon TCG API
      const card = await getCard(cardId);
      if (!card) throw new Error('Card not found');
      return card;
    },
    enabled: cardId.length > 0,
    staleTime: 30 * 60 * 1000, // Card metadata doesn't change often
    placeholderData: () => findCachedCard(cardId),
  });
}

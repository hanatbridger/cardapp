import { useQuery } from '@tanstack/react-query';
import { fetchCardStats } from '../services/card-stats';

/**
 * Real eBay market stats for the card detail screen. Upstream data
 * refreshes daily and the proxy caches 6h at the CDN, so a long
 * staleTime is honest — refetching more often returns identical bytes.
 * fetchCardStats resolves null (never throws) for unmapped cards and
 * outages; consumers hide themselves on null.
 */
export function useCardStats(
  cardName: string | undefined,
  cardNumber: string | undefined,
) {
  return useQuery({
    queryKey: ['card-stats', cardName, cardNumber],
    queryFn: () => fetchCardStats(cardName!, cardNumber!),
    enabled: Boolean(cardName && cardNumber),
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: 12 * 60 * 60 * 1000,
    retry: 1,
  });
}

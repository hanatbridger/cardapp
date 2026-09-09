import { useQuery } from '@tanstack/react-query';
import { fetchMarketIndex, type MarketIndex } from '../services/market-index';

/**
 * Market index for the Home header strip. The underlying snapshot cron
 * runs once a day, so this matches the endpoint's 6h edge cache.
 */
export function useMarketIndex() {
  return useQuery<MarketIndex | null>({
    queryKey: ['market-index'],
    queryFn: fetchMarketIndex,
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: 12 * 60 * 60 * 1000,
    retry: 1,
  });
}

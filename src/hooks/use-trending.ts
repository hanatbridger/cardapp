import { useQuery } from '@tanstack/react-query';
import { fetchTrending, type TrendingPayload, type TrendingMode } from '../services/trending';

/**
 * Daily card-leaderboard data from collectrics, proxied via
 * /api/trending. The upstream feed updates once a day and our Edge
 * function caches it 6h, so a 1h client staleTime is plenty.
 *
 * `mode` selects the ranking:
 *   - 'movers'      → biggest absolute prior-day % change (default)
 *   - 'undervalued' → most-negative current-vs-30d-baseline (rebound candidates)
 *   - 'overvalued'  → most-positive current-vs-30d-baseline (cooldown candidates)
 *
 * On error / empty payload the caller should fall back to its own
 * seeded list so the carousel/picks rail always has something to show.
 */
export function useTrending(mode: TrendingMode = 'movers', limit = 12) {
  return useQuery<TrendingPayload>({
    queryKey: ['trending', mode, limit],
    queryFn: () => fetchTrending(limit, mode),
    staleTime: 60 * 60 * 1000, // 1h
    retry: 1,
  });
}

// Back-compat alias for the original Trending Now caller.
export const useTrendingMovers = (limit = 12) => useTrending('movers', limit);

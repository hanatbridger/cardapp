import { useQuery } from '@tanstack/react-query';
import { fetchTrendingMovers, type TrendingPayload } from '../services/trending';

/**
 * Daily prior-day movers from the collectrics leaderboard, proxied
 * via /api/trending. The upstream feed updates once a day and our
 * Edge function caches it 6h, so a 1h client staleTime is plenty.
 *
 * On error / empty payload the home tab falls back to its seeded
 * MOCK_CARDS shuffle so the carousel always has something to show.
 */
export function useTrendingMovers(limit = 12) {
  return useQuery<TrendingPayload>({
    queryKey: ['trending', limit],
    queryFn: () => fetchTrendingMovers(limit),
    staleTime: 60 * 60 * 1000, // 1h
    retry: 1,
  });
}

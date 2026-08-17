import { useQuery } from '@tanstack/react-query';
import { fetchNews, type NewsArticle } from '../services/news';

/**
 * Card news from PokeBeach / PSA / Beckett / TAG, aggregated by the
 * /api/news Edge function. The upstream is edge-cached for an hour, so
 * a 30-minute client staleTime keeps the tab feeling fresh without
 * hammering the proxy on every focus.
 */
export function useNews(limit = 60) {
  return useQuery<NewsArticle[]>({
    queryKey: ['news', limit],
    queryFn: () => fetchNews(limit),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
}

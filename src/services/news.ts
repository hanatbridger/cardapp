import { Platform } from 'react-native';
import { fetchWithTimeout } from './api-client';

/**
 * Card-news aggregator — proxied via our Vercel Edge function
 * `/api/news`, which pulls Google News RSS scoped per source
 * (PokeBeach, PSA, Beckett, TAG). Same dev-vs-prod origin trick as
 * `trending.ts`: native + dev-web hit the production deployment
 * cross-origin (CORS *), production web hits relative same-origin.
 */

const PROXY_ORIGIN = (() => {
  if (Platform.OS !== 'web') {
    return process.env.EXPO_PUBLIC_API_URL ?? 'https://strange-saha.vercel.app';
  }
  if (__DEV__) return 'https://strange-saha.vercel.app';
  return '';
})();

export interface NewsArticle {
  title: string;
  url: string;
  /** Cover image URL, or '' when the source feed had none. */
  imageUrl: string;
  /** Plain-text excerpt, or '' for headline-only sources. */
  summary: string;
  /** ISO timestamp, or '' when the source omitted a date. */
  publishedAt: string;
  sourceKey: string;
  sourceLabel: string;
}

interface NewsPayload {
  generatedAt: string;
  articles: NewsArticle[];
}

export async function fetchNews(limit = 60): Promise<NewsArticle[]> {
  const res = await fetchWithTimeout(`${PROXY_ORIGIN}/api/news?limit=${limit}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? `news ${res.status}`);
  }
  const data = (await res.json()) as NewsPayload;
  return data.articles ?? [];
}

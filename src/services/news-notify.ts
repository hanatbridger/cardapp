import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserStore } from '../stores/user-store';
import { fetchNews, type NewsArticle } from './news';
import { presentLocalNotification } from './notifications';

/**
 * Daily news push.
 *
 * Fires at most ONE local notification per calendar day, and only when
 * there's a genuinely new top story since the last one we announced.
 * Both the background task (services/background-alerts) and a foreground
 * catch-up (hooks/use-news-notifier) call this — iOS background fetch is
 * unreliable, so the foreground path guarantees the user still gets the
 * day's ping the first time they open the app. The shared once-a-day
 * record below means the two paths never double-fire.
 */

// { url, day } of the last story we notified about. `url` is the stable
// per-article identity (NewsArticle has no id); `day` is the local
// calendar day, which enforces the 1/day cap.
const STORAGE_KEY = 'cardpulse-news-last-notified';

interface LastNotified {
  url?: string;
  day?: string;
}

/** Local calendar day as YYYY-MM-DD (en-CA formats ISO-like). */
function todayKey(): string {
  return new Date().toLocaleDateString('en-CA');
}

/** The most recent article by publishedAt; '' dates sort to the bottom. */
function latestArticle(articles: NewsArticle[]): NewsArticle | undefined {
  return [...articles].sort((a, b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    // Guard NaN from unparseable dates so the comparator stays total.
    return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
  })[0];
}

/**
 * Announce the day's top news if it's new. Returns true if a notification
 * was posted (so the background task can report NewData). Safe to call on
 * every wake/foreground — it self-gates on the notifications preference
 * and its own once-a-day record.
 */
export async function maybeNotifyDailyNews(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  // Shares the single notifications preference with price alerts.
  if (!useUserStore.getState().preferences.notificationsEnabled) return false;

  let last: LastNotified = {};
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) last = JSON.parse(raw) as LastNotified;
  } catch {
    // Corrupt/missing record — treat as never-notified.
  }

  const today = todayKey();
  // 1/day cap: we only ever stamp `day` when we actually notify, so this
  // is true only after today's notification has already gone out.
  if (last.day === today) return false;

  let articles: NewsArticle[];
  try {
    articles = await fetchNews(30);
  } catch {
    return false; // transient fetch failure — retry on the next wake
  }

  const top = latestArticle(articles);
  if (!top || !top.url) return false;
  // Nothing new since the last story we announced — stay quiet (this is
  // the "whenever there IS new news" half of the requirement).
  if (top.url === last.url) return false;

  await presentLocalNotification('Pokémon card news', top.title, {
    type: 'news',
    url: top.url,
  });

  try {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ url: top.url, day: today } satisfies LastNotified),
    );
  } catch {
    // Best effort — worst case we may re-notify the same story tomorrow.
  }
  return true;
}

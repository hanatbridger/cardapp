/**
 * Format a price consistently across the app.
 * - Under $1: show 2 decimals ($0.75)
 * - $1-$999: show 2 decimals ($51.19)
 * - $1,000+: show no decimals with comma ($1,100)
 */
export function formatPrice(price: number): string {
  if (price >= 1000) {
    return `$${Math.round(price).toLocaleString('en-US')}`;
  }
  return `$${price.toFixed(2)}`;
}

/**
 * Format a past timestamp as a short relative string:
 *   "just now" / "5m ago" / "2h ago" / "3d ago" / "Mar 12"
 * Used to show data freshness on price displays.
 */
export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const diffMs = Math.max(0, now - timestamp);
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 45) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  // Older than a week — show absolute date
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

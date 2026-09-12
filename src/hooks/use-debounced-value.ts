import { useCallback, useEffect, useState } from 'react';

/**
 * Trails `value` by `delayMs`, except that resets to '' (or any value
 * shorter than the 2-char search floor) apply immediately — clearing the
 * box or switching modes must not leave stale results on screen for a
 * beat. The input stays fully controlled by the raw value; only the
 * network-facing queries read the debounced one.
 *
 * Returns `[debounced, flush]`. `flush(next)` applies a value NOW —
 * submit and recent-search taps must not wait out the timer, or the
 * results list renders against the stale debounced value for 250ms
 * (which surfaced as a false "No results found" flash). flush takes the
 * value explicitly because callers flush in the same tick they setState
 * the raw value, before this hook has re-rendered to see it.
 */
export function useDebouncedValue(
  value: string,
  delayMs = 250,
): readonly [string, (next: string) => void] {
  const [debounced, setDebounced] = useState(value);
  // Render-phase sync, not an effect: React re-runs this component before
  // committing, so no commit ever pairs a short raw value with a stale
  // debounced one. Done in an effect, the mode switch's setQuery('')
  // committed one frame with the previous query still debounced, and
  // React Query fired that query against the newly selected mode's API.
  if (value.length < 2 && debounced !== value) setDebounced(value);
  const flush = useCallback((next: string) => setDebounced(next), []);

  useEffect(() => {
    // Short values are already settled above; only the trailing timer
    // belongs in an effect.
    if (value.length < 2 || value === debounced) return;
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
    // debounced intentionally omitted: re-running on its own settle is a no-op.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delayMs]);

  return [debounced, flush] as const;
}

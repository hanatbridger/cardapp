import { useEffect, useState } from 'react';

/**
 * Trails `value` by `delayMs`, except that resets to '' (or any value
 * shorter than the 2-char search floor) apply immediately — clearing the
 * box or switching modes must not leave stale results on screen for a
 * beat. The input stays fully controlled by the raw value; only the
 * network-facing queries read the debounced one.
 */
export function useDebouncedValue(value: string, delayMs = 250): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    if (value.length < 2) {
      setDebounced(value);
      return;
    }
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

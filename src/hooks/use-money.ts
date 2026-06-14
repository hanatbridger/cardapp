import { useCallback } from 'react';
import { useUserStore } from '../stores/user-store';
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  type CurrencyCode,
} from '../constants/currencies';
import { useFxRates } from './use-fx-rates';

/**
 * Returns a formatter that converts a USD amount into the user's chosen
 * display currency and formats it (symbol + grouping + the currency's
 * decimals). Every price in the app flows through here, so flipping the
 * currency preference re-renders all of them.
 *
 * Mirrors the legacy USD formatter's rule: >= 1000 shows grouped whole
 * units, below shows the currency's decimals; null/NaN degrade to "--".
 */
export function useMoney(): (usd: number | null | undefined) => string {
  // `?? DEFAULT_CURRENCY` covers users persisted before the currency
  // preference existed (their preferences blob has no `currency` key).
  const currency = useUserStore(
    (s) => (s.preferences.currency ?? DEFAULT_CURRENCY) as CurrencyCode,
  );
  const rates = useFxRates();

  return useCallback(
    (usd) => {
      if (usd == null || !Number.isFinite(usd)) return '--';
      const meta = CURRENCIES[currency] ?? CURRENCIES[DEFAULT_CURRENCY];
      const rate = rates[currency] ?? 1;
      const amount = usd * rate;
      // Branch on the rounded value so e.g. 999.999 formats as 1,000.
      const rounded = Math.round(amount * 100) / 100;
      if (rounded >= 1000) {
        return `${meta.symbol}${Math.round(amount).toLocaleString('en-US')}`;
      }
      return `${meta.symbol}${amount.toFixed(meta.decimals)}`;
    },
    [currency, rates],
  );
}

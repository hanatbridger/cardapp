import { useCallback } from 'react';
import { useUserStore } from '../stores/user-store';
import {
  currencyMeta,
  DEFAULT_CURRENCY,
  FALLBACK_RATES,
} from '../constants/currencies';
import { useFxRates } from './use-fx-rates';

/**
 * Returns a formatter that converts a USD amount into the user's chosen
 * display currency and formats it (symbol + grouping + the currency's
 * decimals). Every price in the app flows through here, so flipping the
 * currency preference re-renders all of them.
 *
 * Mirrors the legacy USD rule: >= 1000 shows grouped whole units, below
 * shows the currency's decimals; null/NaN degrade to "--". If no rate is
 * available yet for an exotic currency, it falls back to the raw USD value
 * rather than showing a converted number with the wrong rate.
 */
export function useMoney(): (usd: number | null | undefined) => string {
  // `?? DEFAULT_CURRENCY` covers users persisted before the currency
  // preference existed (their preferences blob has no `currency` key).
  const currency = useUserStore(
    (s) => s.preferences.currency ?? DEFAULT_CURRENCY,
  );
  const rates = useFxRates();

  return useCallback(
    (usd) => {
      if (usd == null || !Number.isFinite(usd)) return '--';
      const rate = rates[currency] ?? FALLBACK_RATES[currency];
      // No rate for this currency yet (offline + exotic pick) — show the
      // honest USD value rather than a wrongly-converted number.
      if (rate == null) return `$${formatAmount(usd, 2)}`;

      const meta = currencyMeta(currency);
      return `${meta.symbol}${formatAmount(usd * rate, meta.decimals)}`;
    },
    [currency, rates],
  );
}

function formatAmount(amount: number, decimals: number): string {
  // Branch on the rounded value so e.g. 999.999 formats as 1,000.
  const rounded = Math.round(amount * 100) / 100;
  if (rounded >= 1000) return Math.round(amount).toLocaleString('en-US');
  return amount.toFixed(decimals);
}

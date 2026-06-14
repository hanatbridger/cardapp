// Display currencies the app can convert prices into. All card/price
// data is sourced in USD (TCGPlayer market price, collectrics), so every
// non-USD currency is a live FX conversion of the USD amount — see
// src/hooks/use-money.ts.

export type CurrencyCode = 'USD' | 'GBP' | 'EUR' | 'CAD' | 'AUD' | 'JPY';

export const DEFAULT_CURRENCY: CurrencyCode = 'USD';

export interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  label: string;
  /** Fraction digits for the < 1000 display branch (JPY shows none). */
  decimals: number;
}

// Symbols are prefix-positioned for layout consistency — a few locales
// suffix the symbol, but prefixing keeps every price aligned the same way.
export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  USD: { code: 'USD', symbol: '$', label: 'US Dollar', decimals: 2 },
  GBP: { code: 'GBP', symbol: '£', label: 'British Pound', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', label: 'Euro', decimals: 2 },
  CAD: { code: 'CAD', symbol: 'CA$', label: 'Canadian Dollar', decimals: 2 },
  AUD: { code: 'AUD', symbol: 'A$', label: 'Australian Dollar', decimals: 2 },
  JPY: { code: 'JPY', symbol: '¥', label: 'Japanese Yen', decimals: 0 },
};

export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];

// Offline/last-resort rates (USD -> code), approximate as of early 2026.
// Live rates from services/fx override these whenever the daily fetch
// succeeds; these only keep conversion working when the FX API is
// unreachable, where a slightly stale rate beats a blank or a £-labelled
// USD number.
export const FALLBACK_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  GBP: 0.79,
  EUR: 0.92,
  CAD: 1.37,
  AUD: 1.52,
  JPY: 157,
};

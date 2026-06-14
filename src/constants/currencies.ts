// Display currencies. All card/price data is sourced in USD, so every
// non-USD currency is a live FX conversion of the USD amount (see
// src/hooks/use-money.ts). The full convertible set is ALL_CURRENCY_CODES;
// CURRENCY_META carries curated names/symbols/decimals for the common
// ones, and currencyMeta() falls back to the bare ISO code for the long
// tail so every listed currency still renders and converts.

export type CurrencyCode = string;

export const DEFAULT_CURRENCY: CurrencyCode = 'USD';

export interface CurrencyMeta {
  name: string;
  symbol: string;
  /** Fraction digits for the < 1000 display branch (some currencies: 0). */
  decimals: number;
}

// Curated metadata for the widely-used currencies. Symbols are prefixed
// for layout consistency; currencies absent here render with their ISO
// code as a clean prefix (e.g. "PLN 20.00").
export const CURRENCY_META: Record<string, CurrencyMeta> = {
  USD: { name: 'US Dollar', symbol: '$', decimals: 2 },
  EUR: { name: 'Euro', symbol: '€', decimals: 2 },
  GBP: { name: 'British Pound', symbol: '£', decimals: 2 },
  JPY: { name: 'Japanese Yen', symbol: '¥', decimals: 0 },
  CNY: { name: 'Chinese Yuan', symbol: 'CN¥', decimals: 2 },
  AUD: { name: 'Australian Dollar', symbol: 'A$', decimals: 2 },
  CAD: { name: 'Canadian Dollar', symbol: 'CA$', decimals: 2 },
  CHF: { name: 'Swiss Franc', symbol: 'CHF', decimals: 2 },
  HKD: { name: 'Hong Kong Dollar', symbol: 'HK$', decimals: 2 },
  SGD: { name: 'Singapore Dollar', symbol: 'S$', decimals: 2 },
  NZD: { name: 'New Zealand Dollar', symbol: 'NZ$', decimals: 2 },
  SEK: { name: 'Swedish Krona', symbol: 'kr', decimals: 2 },
  NOK: { name: 'Norwegian Krone', symbol: 'kr', decimals: 2 },
  DKK: { name: 'Danish Krone', symbol: 'kr', decimals: 2 },
  PLN: { name: 'Polish Złoty', symbol: 'zł', decimals: 2 },
  CZK: { name: 'Czech Koruna', symbol: 'Kč', decimals: 2 },
  HUF: { name: 'Hungarian Forint', symbol: 'Ft', decimals: 2 },
  RON: { name: 'Romanian Leu', symbol: 'lei', decimals: 2 },
  BGN: { name: 'Bulgarian Lev', symbol: 'лв', decimals: 2 },
  TRY: { name: 'Turkish Lira', symbol: '₺', decimals: 2 },
  RUB: { name: 'Russian Ruble', symbol: '₽', decimals: 2 },
  UAH: { name: 'Ukrainian Hryvnia', symbol: '₴', decimals: 2 },
  INR: { name: 'Indian Rupee', symbol: '₹', decimals: 2 },
  KRW: { name: 'South Korean Won', symbol: '₩', decimals: 0 },
  TWD: { name: 'New Taiwan Dollar', symbol: 'NT$', decimals: 2 },
  THB: { name: 'Thai Baht', symbol: '฿', decimals: 2 },
  MYR: { name: 'Malaysian Ringgit', symbol: 'RM', decimals: 2 },
  IDR: { name: 'Indonesian Rupiah', symbol: 'Rp', decimals: 2 },
  PHP: { name: 'Philippine Peso', symbol: '₱', decimals: 2 },
  VND: { name: 'Vietnamese Đồng', symbol: '₫', decimals: 0 },
  MXN: { name: 'Mexican Peso', symbol: 'MX$', decimals: 2 },
  BRL: { name: 'Brazilian Real', symbol: 'R$', decimals: 2 },
  ARS: { name: 'Argentine Peso', symbol: 'AR$', decimals: 2 },
  CLP: { name: 'Chilean Peso', symbol: 'CLP$', decimals: 0 },
  COP: { name: 'Colombian Peso', symbol: 'COP$', decimals: 2 },
  PEN: { name: 'Peruvian Sol', symbol: 'S/', decimals: 2 },
  ZAR: { name: 'South African Rand', symbol: 'R', decimals: 2 },
  AED: { name: 'UAE Dirham', symbol: 'AED', decimals: 2 },
  SAR: { name: 'Saudi Riyal', symbol: 'SAR', decimals: 2 },
  QAR: { name: 'Qatari Riyal', symbol: 'QR', decimals: 2 },
  ILS: { name: 'Israeli New Shekel', symbol: '₪', decimals: 2 },
  EGP: { name: 'Egyptian Pound', symbol: 'E£', decimals: 2 },
  NGN: { name: 'Nigerian Naira', symbol: '₦', decimals: 2 },
  KES: { name: 'Kenyan Shilling', symbol: 'KSh', decimals: 2 },
  PKR: { name: 'Pakistani Rupee', symbol: '₨', decimals: 2 },
  BDT: { name: 'Bangladeshi Taka', symbol: '৳', decimals: 2 },
  LKR: { name: 'Sri Lankan Rupee', symbol: 'Rs', decimals: 2 },
  ISK: { name: 'Icelandic Króna', symbol: 'kr', decimals: 0 },
};

// Shown first in the picker; the rest follow alphabetically.
export const POPULAR_CODES: string[] = [
  'USD', 'GBP', 'EUR', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'HKD', 'NZD',
];

// Every currency we offer. Sourced from open.er-api.com's coverage; any
// code here converts as long as the live rate (or a fallback) exists.
export const ALL_CURRENCY_CODES: string[] = [
  'AED', 'AFN', 'ALL', 'AMD', 'ANG', 'AOA', 'ARS', 'AUD', 'AWG', 'AZN',
  'BAM', 'BBD', 'BDT', 'BGN', 'BHD', 'BIF', 'BMD', 'BND', 'BOB', 'BRL',
  'BSD', 'BTN', 'BWP', 'BYN', 'BZD', 'CAD', 'CDF', 'CHF', 'CLP', 'CNY',
  'COP', 'CRC', 'CUP', 'CVE', 'CZK', 'DJF', 'DKK', 'DOP', 'DZD', 'EGP',
  'ERN', 'ETB', 'EUR', 'FJD', 'FKP', 'FOK', 'GBP', 'GEL', 'GGP', 'GHS',
  'GIP', 'GMD', 'GNF', 'GTQ', 'GYD', 'HKD', 'HNL', 'HTG', 'HUF', 'IDR',
  'ILS', 'IMP', 'INR', 'IQD', 'IRR', 'ISK', 'JEP', 'JMD', 'JOD', 'JPY',
  'KES', 'KGS', 'KHR', 'KID', 'KMF', 'KRW', 'KWD', 'KYD', 'KZT', 'LAK',
  'LBP', 'LKR', 'LRD', 'LSL', 'LYD', 'MAD', 'MDL', 'MGA', 'MKD', 'MMK',
  'MNT', 'MOP', 'MRU', 'MUR', 'MVR', 'MWK', 'MXN', 'MYR', 'MZN', 'NAD',
  'NGN', 'NIO', 'NOK', 'NPR', 'NZD', 'OMR', 'PAB', 'PEN', 'PGK', 'PHP',
  'PKR', 'PLN', 'PYG', 'QAR', 'RON', 'RSD', 'RUB', 'RWF', 'SAR', 'SBD',
  'SCR', 'SDG', 'SEK', 'SGD', 'SHP', 'SLE', 'SOS', 'SRD', 'SSP', 'STN',
  'SYP', 'SZL', 'THB', 'TJS', 'TMT', 'TND', 'TOP', 'TRY', 'TTD', 'TVD',
  'TWD', 'TZS', 'UAH', 'UGX', 'USD', 'UYU', 'UZS', 'VES', 'VND', 'VUV',
  'WST', 'XAF', 'XCD', 'XOF', 'XPF', 'YER', 'ZAR', 'ZMW', 'ZWL',
];

/** Metadata for a code — curated where known, ISO-code fallback otherwise. */
export function currencyMeta(code: string): CurrencyMeta {
  return (
    CURRENCY_META[code] ?? { name: code, symbol: `${code} `, decimals: 2 }
  );
}

// Offline/last-resort rates (USD -> code) for the common currencies,
// approximate as of early 2026. Live rates override these; they only keep
// conversion working before the first successful fetch / when offline.
export const FALLBACK_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, JPY: 157, CNY: 7.2, AUD: 1.52, CAD: 1.37,
  CHF: 0.88, HKD: 7.8, SGD: 1.35, NZD: 1.66, SEK: 10.5, NOK: 10.8,
  DKK: 6.9, PLN: 4.0, CZK: 23, HUF: 360, RON: 4.6, BGN: 1.8, TRY: 33,
  RUB: 92, UAH: 41, INR: 83, KRW: 1350, TWD: 32, THB: 35, MYR: 4.7,
  IDR: 15800, PHP: 58, VND: 25000, MXN: 17, BRL: 5.4, ZAR: 18.5,
  AED: 3.67, SAR: 3.75, ILS: 3.7, ISK: 138,
};

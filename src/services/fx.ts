import { fetchWithTimeout } from './api-client';
import { FALLBACK_RATES } from '../constants/currencies';

// USD-based FX rates. open.er-api.com is free, no API key, CORS-enabled,
// and refreshes daily — plenty for converting card prices, which only
// need to be roughly right and update once a day.
const FX_URL = 'https://open.er-api.com/v6/latest/USD';

export type FxRates = Record<string, number>;

/**
 * Fetch the full USD -> {everything} rate map. Bundled fallbacks seed any
 * code the API omitted. Throws on network/shape failure so React Query can
 * surface the error and the hook falls back to FALLBACK_RATES.
 */
export async function fetchUsdRates(): Promise<FxRates> {
  const res = await fetchWithTimeout(FX_URL);
  if (!res.ok) throw new Error(`fx ${res.status}`);
  const data = (await res.json()) as {
    result?: string;
    rates?: Record<string, number>;
  };
  if (data.result !== 'success' || !data.rates) {
    throw new Error('fx: unexpected payload');
  }
  const out: FxRates = { ...FALLBACK_RATES };
  for (const [code, r] of Object.entries(data.rates)) {
    if (typeof r === 'number' && Number.isFinite(r) && r > 0) out[code] = r;
  }
  return out;
}

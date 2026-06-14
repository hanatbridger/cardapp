import { useQuery } from '@tanstack/react-query';
import { fetchUsdRates, type FxRates } from '../services/fx';
import { FALLBACK_RATES } from '../constants/currencies';

/**
 * Live USD-based FX rates, refreshed at most ~twice a day. Always returns
 * a usable rate map — bundled FALLBACK_RATES while loading or if the
 * fetch fails — so prices always convert (a stale rate beats a blank or a
 * mis-labelled number). One shared query backs every consumer.
 */
export function useFxRates(): FxRates {
  const { data } = useQuery({
    queryKey: ['fx', 'USD'],
    queryFn: fetchUsdRates,
    staleTime: 12 * 60 * 60 * 1000, // 12h — rates barely move intraday
    gcTime: 24 * 60 * 60 * 1000,
  });
  return data ?? FALLBACK_RATES;
}

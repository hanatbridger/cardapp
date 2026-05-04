import { useQuery } from '@tanstack/react-query';
import { searchSealedProducts, getSealedProduct } from '../mocks/sealed';
import { fetchSealedPrice, fetchSealedPriceHistory } from '../services/tcgplayer';
import type { SealedType } from '../types/sealed';

/**
 * Sealed-product catalog search. Runs client-side against the curated
 * `SEALED_PRODUCTS` list (our ~35 SKU hot-list) — no network. Wrapped in
 * a useQuery so consumers share the same loading/idle API as
 * `useCardSearch` and the unified Cards-tab results list can render both
 * without bespoke plumbing.
 *
 * `typeFilter` is reserved for a future "Sealed" quick-chip row — not
 * wired into the search tab yet since the user opted for a unified
 * cards-and-sealed results feed instead of a 4th segment.
 */
export function useSealedSearch(query: string, typeFilter?: SealedType) {
  const q = query.trim();
  return useQuery({
    queryKey: ['sealed', 'search', q, typeFilter ?? null],
    queryFn: () => searchSealedProducts(q, typeFilter),
    // Match card search's 2-char floor so the two result streams kick in
    // at the same keystroke — avoids sealed results flashing before cards.
    enabled: q.length >= 2 || Boolean(typeFilter),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Detail lookup by internal id (`{setId}-{type}`). Cheap — reads from
 * the static catalog — but wrapped in useQuery so the detail screen
 * shares the Suspense/error conventions used everywhere else.
 */
export function useSealedProduct(id: string | undefined) {
  return useQuery({
    queryKey: ['sealed', 'product', id],
    queryFn: () => getSealedProduct(id!) ?? null,
    enabled: Boolean(id),
    staleTime: Infinity,
  });
}

/**
 * Current TCGPlayer Market Price for a sealed product. Hits the
 * `tcgplayer` service which falls back to `SEALED_PRICES` mocks until
 * the live proxy is deployed. Consumers don't need to know which is
 * returned — both carry the same `SealedPrice` shape.
 */
export function useSealedPrice(id: string | undefined, tcgplayerProductId?: string) {
  return useQuery({
    queryKey: ['sealed', 'price', id, tcgplayerProductId ?? null],
    queryFn: () => fetchSealedPrice(id!, tcgplayerProductId),
    enabled: Boolean(id),
    // Sealed prices move slower than singles so we cache for a full day —
    // still invalidated on manual refresh via the detail screen's pull-to-refresh.
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
  });
}

/** TCGPlayer Market Price history — empty until live proxy is wired. */
export function useSealedPriceHistory(id: string | undefined, tcgplayerProductId?: string) {
  return useQuery({
    queryKey: ['sealed', 'history', id, tcgplayerProductId ?? null],
    queryFn: () => fetchSealedPriceHistory(id!, tcgplayerProductId),
    enabled: Boolean(id),
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
  });
}

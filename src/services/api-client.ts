import { Platform } from 'react-native';

// Dev server URL — Android emulator uses 10.0.2.2, iOS/web uses localhost
const DEV_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:3001',
  default: 'http://localhost:3001',
});

const PROD_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://strange-saha.vercel.app';

export const API_BASE_URL = __DEV__ ? DEV_BASE_URL : PROD_BASE_URL;

/** Default network timeout for all app data fetches. */
export const DEFAULT_FETCH_TIMEOUT_MS = 12000;

/**
 * fetch() with a hard timeout. React Native's fetch has NO default
 * timeout, so a stalled TCP connection (a proxy that accepts but never
 * responds) leaves the promise pending forever — and a query with
 * retry:false then sits on skeletons with no error and no recovery.
 * Aborting surfaces as a thrown error React Query can report.
 */
export async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  ms: number = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  if (__DEV__) {
    console.log(`[API] ${options?.method || 'GET'} ${url}`);
  }

  const response = await fetchWithTimeout(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return response.json();
}

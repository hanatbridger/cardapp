import { Platform } from 'react-native';

// Dev server URL — Android emulator uses 10.0.2.2, iOS/web uses localhost
const DEV_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:3001',
  default: 'http://localhost:3001',
});

const PROD_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.cardpulse.app';

export const API_BASE_URL = __DEV__ ? DEV_BASE_URL : PROD_BASE_URL;

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  if (__DEV__) {
    console.log(`[API] ${options?.method || 'GET'} ${url}`);
  }

  const response = await fetch(url, {
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

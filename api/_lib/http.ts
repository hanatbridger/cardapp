// Shared by the api/ functions. Files under api/_lib are not deployed as
// functions (Vercel skips underscore-prefixed paths in api/).

/**
 * fetch with a hard timeout — every upstream here is user-facing or
 * cron-budgeted, so a hung host must not pin the request open until the
 * runtime's own limit. 6s is generous for these APIs.
 */
export async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  ms = 6000,
): Promise<Response> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(timer);
  }
}

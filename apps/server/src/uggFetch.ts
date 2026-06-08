/**
 * Shared u.gg fetch wrapper. Validates the response shape and records health,
 * so a markup/format drift surfaces a clear message instead of a cryptic crash.
 */
import { recordOk, recordError, recordRateLimited } from "./uggHealth.js";

export class UggFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UggFetchError";
  }
}

// u.gg's stats CDN now rejects header-less requests with 403 (anti-bot), so
// present browser-like headers. A 403 means the resource exists but our request
// was blocked (a wrong path/version returns 404), which is why this — not a
// version bump — is the fix.
const UGG_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://u.gg/",
  Origin: "https://u.gg",
};

/**
 * Fetches a u.gg JSON endpoint, validates it is a non-null object containing
 * the expected region key, and records health. Returns the region bucket.
 */
export async function fetchUgg<T>(
  url: string,
  regionKey: string,
  label: string,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { headers: UGG_HEADERS });
  } catch (err) {
    const msg = `u.gg ${label} network error: ${(err as Error).message}`;
    recordError(msg, false);
    throw new UggFetchError(msg);
  }

  if (!res.ok) {
    const msg = `u.gg ${label} returned ${res.status}`;
    // 429 = u.gg is up but throttling our burst: transient/degraded, not down.
    if (res.status === 429) recordRateLimited(msg);
    else recordError(msg, false);
    throw new UggFetchError(msg);
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    const msg = `u.gg ${label}: response is not valid JSON (possible markup change)`;
    recordError(msg, false);
    throw new UggFetchError(msg);
  }

  if (typeof body !== "object" || body === null) {
    const msg = `u.gg ${label}: unexpected response type "${typeof body}" (expected object)`;
    recordError(msg, false);
    throw new UggFetchError(msg);
  }

  const regionBucket = (body as Record<string, unknown>)[regionKey];
  if (regionBucket === undefined || regionBucket === null) {
    const msg = `u.gg ${label}: region "${regionKey}" missing from response (possible format drift)`;
    recordError(msg, false);
    throw new UggFetchError(msg);
  }

  recordOk();
  return regionBucket as T;
}

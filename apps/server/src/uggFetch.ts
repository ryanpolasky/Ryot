/**
 * Shared u.gg fetch wrapper. Validates the response shape and records health,
 * so a markup/format drift surfaces a clear message instead of a cryptic crash.
 */
import { recordOk, recordError } from "./uggHealth.js";

export class UggFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UggFetchError";
  }
}

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
    res = await fetch(url);
  } catch (err) {
    const msg = `u.gg ${label} network error: ${(err as Error).message}`;
    recordError(msg, false);
    throw new UggFetchError(msg);
  }

  if (!res.ok) {
    const msg = `u.gg ${label} returned ${res.status}`;
    recordError(msg, false);
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

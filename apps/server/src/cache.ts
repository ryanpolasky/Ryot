/** Max time (ms) a stale entry is kept beyond its TTL as a fallback. */
const STALE_GRACE_MS = 24 * 60 * 60 * 1000; // 24 h

interface Entry<T> {
  value: T;
  expires: number;
  /** Absolute timestamp after which the stale value is discarded entirely. */
  staleUntil: number;
}

/** Default cap on the number of entries kept before LRU eviction kicks in. */
const MAX_ENTRIES = 5000;

/** Minimal in-memory TTL cache with serve-stale-on-error and LRU eviction. */
export class TtlCache {
  private store = new Map<string, Entry<unknown>>();

  constructor(private readonly maxEntries: number = MAX_ENTRIES) {}

  /** Re-insert a key so it becomes most-recently-used (Map keeps insertion order). */
  private touch(key: string, e: Entry<unknown>): void {
    this.store.delete(key);
    this.store.set(key, e);
  }

  /** Evict least-recently-used entries until we're back within the cap. */
  private evict(): void {
    while (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest === undefined) break;
      this.store.delete(oldest);
    }
  }

  /** Returns the value only if it has not expired (fresh). */
  get<T>(key: string): T | undefined {
    const e = this.store.get(key);
    if (!e) return undefined;
    const now = Date.now();
    if (now > e.staleUntil) {
      this.store.delete(key);
      return undefined;
    }
    if (now > e.expires) return undefined; // expired but kept for stale fallback
    this.touch(key, e);
    return e.value as T;
  }

  /** Returns the value even if expired, as long as it's within the stale grace. */
  private getStale<T>(key: string): T | undefined {
    const e = this.store.get(key);
    if (!e) return undefined;
    if (Date.now() > e.staleUntil) {
      this.store.delete(key);
      return undefined;
    }
    this.touch(key, e);
    return e.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number): void {
    const expires = Date.now() + ttlSeconds * 1000;
    // Delete first so re-inserting moves the key to the most-recently-used end.
    this.store.delete(key);
    this.store.set(key, {
      value,
      expires,
      staleUntil: expires + STALE_GRACE_MS,
    });
    this.evict();
  }

  /**
   * Get-or-compute helper. If `fn` throws AND a stale (expired but recent)
   * value exists, that value is returned instead of propagating the error.
   * This makes transient upstream failures invisible to users.
   */
  async wrap<T>(
    key: string,
    ttlSeconds: number,
    fn: () => Promise<T>,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;
    try {
      const value = await fn();
      this.set(key, value, ttlSeconds);
      return value;
    } catch (err) {
      const stale = this.getStale<T>(key);
      if (stale !== undefined) {
        console.warn(
          `[cache] serving stale for "${key}":`,
          (err as Error).message ?? err,
        );
        return stale;
      }
      throw err;
    }
  }
}

export const cache = new TtlCache();

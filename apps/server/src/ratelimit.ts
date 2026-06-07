import { RiotApiError } from "@lc/shared";

/**
 * Conservative client-side limiter for a single Riot key.
 * Development keys allow ~20 req/s and 100 req/120s; we stay well under both
 * and transparently retry on 429 using the Retry-After header.
 */
export class RateLimiter {
  private queue: Array<() => void> = [];
  private running = false;
  private recent: number[] = []; // timestamps within the rolling window

  constructor(
    private readonly minIntervalMs = 60, // ~16 req/s
    private readonly windowMs = 120_000,
    private readonly windowMax = 95,
  ) {}

  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    return this.runWithRetry(fn);
  }

  private acquire(): Promise<void> {
    return new Promise((res) => {
      this.queue.push(res);
      this.drain();
    });
  }

  private async drain() {
    if (this.running) return;
    this.running = true;
    while (this.queue.length > 0) {
      const now = Date.now();
      this.recent = this.recent.filter((t) => now - t < this.windowMs);
      if (this.recent.length >= this.windowMax) {
        const oldest = this.recent[0] ?? now;
        await sleep(this.windowMs - (now - oldest) + 5);
        continue;
      }
      const next = this.queue.shift();
      if (next) {
        this.recent.push(Date.now());
        next();
        await sleep(this.minIntervalMs);
      }
    }
    this.running = false;
  }

  private async runWithRetry<T>(fn: () => Promise<T>, attempt = 0): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof RiotApiError && err.isRateLimited && attempt < 3) {
        const wait = (err.retryAfter ?? 1) * 1000 + 250;
        await sleep(wait);
        return this.runWithRetry(fn, attempt + 1);
      }
      throw err;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export const limiter = new RateLimiter();

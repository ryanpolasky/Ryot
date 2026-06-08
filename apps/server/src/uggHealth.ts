/**
 * Tracks the health of the u.gg upstream so /api/status can report
 * real observed state instead of doing a live probe every time.
 */

export interface UggHealthState {
  status: "operational" | "degraded" | "down";
  lastOk: number | null;
  lastError: string | null;
  lastErrorAt: number | null;
  servingStale: boolean;
}

const state: UggHealthState = {
  status: "operational",
  lastOk: null,
  lastError: null,
  lastErrorAt: null,
  servingStale: false,
};

export function recordOk(): void {
  state.lastOk = Date.now();
  state.lastError = null;
  state.lastErrorAt = null;
  state.servingStale = false;
  state.status = "operational";
}

export function recordError(msg: string, servedStale: boolean): void {
  state.lastError = msg;
  state.lastErrorAt = Date.now();
  state.servingStale = servedStale;
  state.status = servedStale ? "degraded" : "down";
}

// A 429 means u.gg is up but throttling our burst (expected during a full
// tier-list aggregation, and absorbed by caching + retries). That's "degraded",
// never "down", and it self-heals via the decay in getUggHealth().
export function recordRateLimited(msg: string): void {
  state.lastError = msg;
  state.lastErrorAt = Date.now();
  state.servingStale = false;
  state.status = "degraded";
}

// A transient rate-limit decays back to operational on its own: the data is
// cached, so no later success would clear the singleton, and a one-off 429
// shouldn't read as "degraded" forever.
const RATE_LIMIT_DECAY_MS = 5 * 60_000;

export function getUggHealth(): UggHealthState {
  if (
    state.status === "degraded" &&
    !state.servingStale &&
    state.lastErrorAt !== null &&
    Date.now() - state.lastErrorAt > RATE_LIMIT_DECAY_MS
  ) {
    return { ...state, status: "operational" };
  }
  return { ...state };
}

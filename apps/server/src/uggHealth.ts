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

export function getUggHealth(): UggHealthState {
  return { ...state };
}

"use client";

// Recent-summoner suggestions for the search bar. Stored only in this browser
// (localStorage), never sent anywhere. On by default; users can opt out in
// Settings. Sources:
//   - "search":   a Riot ID you searched or a profile you opened
//   - "self":     your own account (desktop app, detected via the League client)
//   - "teammate": someone you've recently played with (desktop app)

export type RecentSource = "search" | "self" | "teammate";

export interface RecentSummoner {
  region: string;
  gameName: string;
  tagLine: string;
  source: RecentSource;
  /** Last-seen timestamp (ms); newest sorts first. */
  ts: number;
}

const KEY = "ryot.recents";
const ENABLED_KEY = "ryot.recents.enabled";
const MAX = 50;

// Lower rank = stronger label, kept when an entry is seen from multiple sources.
const RANK: Record<RecentSource, number> = { self: 0, search: 1, teammate: 2 };

function strongerSource(
  a: RecentSource | undefined,
  b: RecentSource,
): RecentSource {
  if (!a) return b;
  return RANK[a] <= RANK[b] ? a : b;
}

const idOf = (r: {
  region: string;
  gameName: string;
  tagLine: string;
}): string => `${r.region}:${r.gameName}:${r.tagLine}`.toLowerCase();

export function recentsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  // Default ON: only "0" disables it.
  return window.localStorage.getItem(ENABLED_KEY) !== "0";
}

export function setRecentsEnabled(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ENABLED_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function getRecents(): RecentSummoner[] {
  if (typeof window === "undefined" || !recentsEnabled()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as RecentSummoner[]) : [];
    return list.sort((a, b) => b.ts - a.ts);
  } catch {
    return [];
  }
}

function write(list: RecentSummoner[]): void {
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify(list.sort((a, b) => b.ts - a.ts).slice(0, MAX)),
    );
  } catch {
    /* quota or serialization failure: ignore */
  }
}

/** Add or refresh one or more recent summoners (no-op when opted out). */
export function addRecents(entries: Omit<RecentSummoner, "ts">[]): void {
  if (typeof window === "undefined" || !recentsEnabled() || !entries.length)
    return;
  const now = Date.now();
  const map = new Map(getRecents().map((r) => [idOf(r), r]));
  entries.forEach((e, i) => {
    if (!e.gameName || !e.tagLine) return;
    const key = idOf(e);
    const prev = map.get(key);
    map.set(key, {
      region: e.region,
      gameName: e.gameName,
      tagLine: e.tagLine,
      // Slight offset preserves intra-batch order without colliding timestamps.
      ts: now - i,
      source: strongerSource(prev?.source, e.source),
    });
  });
  write([...map.values()]);
}

export function addRecent(entry: Omit<RecentSummoner, "ts">): void {
  addRecents([entry]);
}

export function clearRecents(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

// ── "Me": the account you've told Ryot is yours (pins it in suggestions) ──────
// Purely a local convenience. It doesn't claim/verify the account, change
// anything about the profile, or get sent anywhere.

const ME_KEY = "ryot.me";

export interface Me {
  region: string;
  gameName: string;
  tagLine: string;
}

export function getMe(): Me | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ME_KEY);
    return raw ? (JSON.parse(raw) as Me) : null;
  } catch {
    return null;
  }
}

export function setMe(me: Me): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ME_KEY, JSON.stringify(me));
  } catch {
    /* ignore */
  }
  // Surface yourself in suggestions right away.
  addRecent({ ...me, source: "self" });
}

export function clearMe(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ME_KEY);
  } catch {
    /* ignore */
  }
}

export function isMe(p: {
  region: string;
  gameName: string;
  tagLine: string;
}): boolean {
  const me = getMe();
  return !!me && idOf(me) === idOf(p);
}

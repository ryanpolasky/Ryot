"use client";

// Shared champion typeahead helpers: a module-cached champion list (fetched once
// from Data Dragon, which is CORS-enabled) plus matchers used by the unified
// search and the champion search.

import {
  DDRAGON_BASE,
  type DDragonChampion,
  fetchChampions,
  getLatestVersion,
} from "@lc/shared";

// Common shorthands that don't prefix/substring-match the display name.
const ALIASES: Record<string, string> = {
  mf: "MissFortune",
  tf: "TwistedFate",
  ww: "Warwick",
  asol: "AurelionSol",
  j4: "JarvanIV",
  yi: "MasterYi",
  lb: "Leblanc",
  gp: "Gangplank",
};

// Strip case, spaces, and punctuation so "kha'zix" and "Khazix" both match.
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export type ChampData = { version: string; champions: DDragonChampion[] };

let cache: ChampData | null = null;
let promise: Promise<ChampData> | null = null;

export function loadChampions(): Promise<ChampData> {
  if (cache) return Promise.resolve(cache);
  if (!promise) {
    promise = (async () => {
      const version = await getLatestVersion();
      const champions = await fetchChampions(version);
      cache = { version, champions };
      return cache;
    })();
    // Allow a retry if the fetch fails.
    promise.catch(() => {
      promise = null;
    });
  }
  return promise;
}

/** Best champion matches for a query (prefix > substring, alias-aware). */
export function matchChampions(
  query: string,
  data: ChampData | null,
  max = 6,
): DDragonChampion[] {
  const q = norm(query);
  if (!q || !data) return [];
  const aliasId = ALIASES[q];
  return data.champions
    .map((c) => {
      const nName = norm(c.name);
      const nId = norm(c.id);
      let score = Infinity;
      if (aliasId && c.id === aliasId) score = -1;
      else if (nName.startsWith(q) || nId.startsWith(q)) score = 0;
      else if (nName.includes(q) || nId.includes(q)) score = 1;
      return { c, score };
    })
    .filter((x) => x.score < Infinity)
    .sort((a, b) => a.score - b.score || a.c.name.localeCompare(b.c.name))
    .slice(0, max)
    .map((x) => x.c);
}

/** Exact champion match (by id, display name, or alias), or undefined. */
export function exactChampion(
  query: string,
  data: ChampData | null,
): DDragonChampion | undefined {
  if (!data) return undefined;
  const q = norm(query);
  if (!q) return undefined;
  const aliasId = ALIASES[q];
  return data.champions.find(
    (c) => norm(c.id) === q || norm(c.name) === q || c.id === aliasId,
  );
}

// ── Data Dragon versions ────────────────────────────────────────────────────
// Historical matches reference items/champions from their own patch; rendering
// them against the latest version 404s for anything since removed. So we map a
// match's gameVersion to the matching Data Dragon version and use that instead.
let versionsCache: string[] | null = null;
let versionsPromise: Promise<string[]> | null = null;

export function loadVersions(): Promise<string[]> {
  if (versionsCache) return Promise.resolve(versionsCache);
  if (!versionsPromise) {
    versionsPromise = fetch(`${DDRAGON_BASE}/api/versions.json`)
      .then((r) => (r.ok ? (r.json() as Promise<string[]>) : []))
      .then((v) => {
        versionsCache = Array.isArray(v) ? v : [];
        return versionsCache;
      })
      .catch(() => {
        versionsPromise = null;
        return [];
      });
  }
  return versionsPromise;
}

/**
 * The Data Dragon version that best matches a match's gameVersion
 * ("14.10.596.1234" -> "14.10.1"), falling back to `fallback` (the latest) when
 * the patch can't be resolved.
 */
export function ddragonVersionForGame(
  gameVersion: string | undefined,
  versions: string[],
  fallback: string,
): string {
  if (!gameVersion) return fallback;
  const m = gameVersion.match(/^(\d+)\.(\d+)/);
  if (!m) return fallback;
  const prefix = `${m[1]}.${m[2]}.`;
  return versions.find((v) => v.startsWith(prefix)) ?? fallback;
}

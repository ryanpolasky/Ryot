"use client";

// Shared champion typeahead helpers: a module-cached champion list (fetched once
// from Data Dragon, which is CORS-enabled) plus matchers used by the unified
// search and the champion search.

import {
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

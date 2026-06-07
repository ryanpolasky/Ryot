/**
 * Premade (duo / trio / …) detection.
 *
 * Riot's spectator API does not say who queued together. Like Porofessor, we
 * infer it: pull each player's recent match IDs and look for players on the
 * same current team who keep showing up in each other's recent games. Two
 * players sharing recent match IDs were literally in those games together, so a
 * repeated overlap is a strong premade signal.
 *
 * This module holds the pure grouping math (no API calls), so it can be unit
 * tested and reused on either side of the wire.
 */

export interface PremadeEdge {
  a: string; // puuid
  b: string; // puuid
  shared: number; // count of shared recent games
}

export interface PremadeGroup {
  /** puuids in this premade, in stable order. */
  puuids: string[];
  /** Strength of the link (max shared-game count across the group's edges). */
  sharedGames: number;
}

/**
 * Count, for every unordered pair of puuids, how many recent match IDs they
 * share. `recentByPuuid` maps a puuid to the set/array of its recent match IDs.
 */
export function sharedGameCounts(
  puuids: string[],
  recentByPuuid: Record<string, Iterable<string>>,
): PremadeEdge[] {
  const sets = new Map<string, Set<string>>();
  for (const id of puuids) sets.set(id, new Set(recentByPuuid[id] ?? []));
  const edges: PremadeEdge[] = [];
  for (let i = 0; i < puuids.length; i++) {
    const pi = puuids[i]!;
    for (let j = i + 1; j < puuids.length; j++) {
      const pj = puuids[j]!;
      const a = sets.get(pi)!;
      const b = sets.get(pj)!;
      let shared = 0;
      const [small, large] = a.size <= b.size ? [a, b] : [b, a];
      for (const m of small) if (large.has(m)) shared++;
      if (shared > 0) edges.push({ a: pi, b: pj, shared });
    }
  }
  return edges;
}

/**
 * Union edges whose shared-game count meets the threshold into premade groups.
 * Singletons (no qualifying links) are omitted.
 */
export function groupPremades(
  edges: PremadeEdge[],
  minShared = 2,
): PremadeGroup[] {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    parent.set(x, parent.get(x) ?? x);
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    // path compression
    let c = x;
    while (parent.get(c) !== r) {
      const next = parent.get(c)!;
      parent.set(c, r);
      c = next;
    }
    return r;
  };
  const union = (x: string, y: string) => {
    const rx = find(x);
    const ry = find(y);
    if (rx !== ry) parent.set(rx, ry);
  };

  const strong = edges.filter((e) => e.shared >= minShared);
  for (const e of strong) union(e.a, e.b);

  const groups = new Map<string, { members: Set<string>; shared: number }>();
  for (const e of strong) {
    const root = find(e.a);
    const g = groups.get(root) ?? { members: new Set(), shared: 0 };
    g.members.add(e.a);
    g.members.add(e.b);
    g.shared = Math.max(g.shared, e.shared);
    groups.set(root, g);
  }

  return [...groups.values()]
    .map((g) => ({ puuids: [...g.members].sort(), sharedGames: g.shared }))
    .filter((g) => g.puuids.length >= 2)
    .sort(
      (a, b) =>
        b.puuids.length - a.puuids.length || b.sharedGames - a.sharedGames,
    );
}

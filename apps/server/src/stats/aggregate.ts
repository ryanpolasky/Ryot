/**
 * Match -> aggregate counters -> served snapshot.
 *
 * The Aggregator ingests Match-V5 payloads (one per match), accumulating
 * per-(champion, rank, role) frequency counters in memory, then emits a
 * DatasetSnapshot in the block shape the build/meta services parse.
 *
 * Final-inventory data (items, runes, spells, win/loss, matchups) comes straight
 * from the match payload. Purchase ORDER, starting items, and skill order need
 * the match timeline — a second, heavier pass that's left as a TODO so the first
 * version stays within rate limits.
 */
import type { MatchDTO, MatchParticipant, ParticipantPerks } from "@lc/shared";
import {
  ARAM_RANK,
  ARAM_ROLE,
  type DatasetSnapshot,
  type MatchupData,
  type OverviewData,
  ROLE_FROM_POSITION,
} from "./types.js";

interface Tally {
  games: number;
  wins: number;
}

interface Freq<M> {
  games: number;
  wins: number;
  meta: M;
}
type FreqMap<M> = Map<string, Freq<M>>;

interface RoleAgg {
  games: number;
  wins: number;
  runes: FreqMap<{ primary: number; secondary: number; perks: number[] }>;
  spells: FreqMap<{ ids: number[] }>;
  shards: FreqMap<{ ids: number[] }>;
  /** Final-inventory item frequency (situational + core source). */
  items: Map<number, Tally>;
}

function newRoleAgg(): RoleAgg {
  return {
    games: 0,
    wins: 0,
    runes: new Map(),
    spells: new Map(),
    shards: new Map(),
    items: new Map(),
  };
}

function bump<M>(m: FreqMap<M>, key: string, win: boolean, meta: M): void {
  let e = m.get(key);
  if (!e) {
    e = { games: 0, wins: 0, meta };
    m.set(key, e);
  }
  e.games++;
  if (win) e.wins++;
}

function bumpTally(m: Map<number, Tally>, key: number, win: boolean): void {
  let e = m.get(key);
  if (!e) {
    e = { games: 0, wins: 0 };
    m.set(key, e);
  }
  e.games++;
  if (win) e.wins++;
}

function pickTop<M>(m: FreqMap<M>): Freq<M> | null {
  let best: Freq<M> | null = null;
  for (const e of m.values()) if (!best || e.games > best.games) best = e;
  return best;
}

/** Keystone-first perk ids + the two tree style ids from a participant. */
function readPerks(perks: ParticipantPerks): {
  primary: number;
  secondary: number;
  perks: number[];
} {
  const primaryStyle = perks.styles.find((s) => s.description === "primaryStyle");
  const subStyle = perks.styles.find((s) => s.description === "subStyle");
  const ids = [
    ...(primaryStyle?.selections.map((x) => x.perk) ?? []),
    ...(subStyle?.selections.map((x) => x.perk) ?? []),
  ];
  return {
    primary: primaryStyle?.style ?? 0,
    secondary: subStyle?.style ?? 0,
    perks: ids,
  };
}

/** Stat shards in [offense, flex, defense] order (League import order). */
function readShards(perks: ParticipantPerks): number[] {
  const s = perks.statPerks;
  return [s.offense, s.flex, s.defense];
}

export class Aggregator {
  private matches = 0;
  /** champId -> rank -> role -> agg */
  private overview = new Map<number, Map<string, Map<string, RoleAgg>>>();
  /** champId -> rank -> role -> oppId -> tally */
  private matchups = new Map<
    number,
    Map<string, Map<string, Map<number, Tally>>>
  >();
  /** champId -> aram agg */
  private aram = new Map<number, RoleAgg>();

  get matchCount(): number {
    return this.matches;
  }

  private roleAgg(champId: number, rank: string, role: string): RoleAgg {
    let byRank = this.overview.get(champId);
    if (!byRank) {
      byRank = new Map();
      this.overview.set(champId, byRank);
    }
    let byRole = byRank.get(rank);
    if (!byRole) {
      byRole = new Map();
      byRank.set(rank, byRole);
    }
    let agg = byRole.get(role);
    if (!agg) {
      agg = newRoleAgg();
      byRole.set(role, agg);
    }
    return agg;
  }

  private matchupTally(
    champId: number,
    rank: string,
    role: string,
    oppId: number,
  ): Tally {
    let byRank = this.matchups.get(champId);
    if (!byRank) {
      byRank = new Map();
      this.matchups.set(champId, byRank);
    }
    let byRole = byRank.get(rank);
    if (!byRole) {
      byRole = new Map();
      byRank.set(rank, byRole);
    }
    let byOpp = byRole.get(role);
    if (!byOpp) {
      byOpp = new Map();
      byRole.set(role, byOpp);
    }
    let t = byOpp.get(oppId);
    if (!t) {
      t = { games: 0, wins: 0 };
      byOpp.set(oppId, t);
    }
    return t;
  }

  private addParticipant(agg: RoleAgg, p: MatchParticipant): void {
    agg.games++;
    if (p.win) agg.wins++;
    const rp = readPerks(p.perks);
    bump(agg.runes, rp.perks.join(","), p.win, rp);
    const spells = [p.summoner1Id, p.summoner2Id].sort((a, b) => a - b);
    bump(agg.spells, spells.join(","), p.win, { ids: spells });
    const shards = readShards(p.perks);
    bump(agg.shards, shards.join(","), p.win, { ids: shards });
    // item6 is the trinket; ignore it and empty slots (0).
    for (const it of [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5]) {
      if (it) bumpTally(agg.items, it, p.win);
    }
  }

  /** Ingest one Summoner's Rift ranked match into the given rank bucket(s). */
  ingestSR(match: MatchDTO, rankBuckets: string[]): void {
    this.matches++;
    const parts = match.info.participants;

    for (const p of parts) {
      const role = ROLE_FROM_POSITION[p.teamPosition];
      if (!role) continue;
      for (const rank of rankBuckets) {
        this.addParticipant(this.roleAgg(p.championId, rank, role), p);
      }
    }

    // Matchups: opposing laners sharing a teamPosition.
    const byPos = new Map<string, MatchParticipant[]>();
    for (const p of parts) {
      const arr = byPos.get(p.teamPosition) ?? [];
      arr.push(p);
      byPos.set(p.teamPosition, arr);
    }
    for (const [pos, ps] of byPos) {
      const role = ROLE_FROM_POSITION[pos];
      if (!role || ps.length < 2) continue;
      for (const a of ps) {
        for (const b of ps) {
          if (a.teamId === b.teamId) continue;
          for (const rank of rankBuckets) {
            const t = this.matchupTally(a.championId, rank, role, b.championId);
            t.games++;
            if (a.win) t.wins++;
          }
        }
      }
    }
  }

  /** Ingest one ARAM match (single rank "8" / role "6"). */
  ingestAram(match: MatchDTO): void {
    this.matches++;
    for (const p of match.info.participants) {
      let agg = this.aram.get(p.championId);
      if (!agg) {
        agg = newRoleAgg();
        this.aram.set(p.championId, agg);
      }
      this.addParticipant(agg, p);
    }
  }

  private blocks(agg: RoleAgg, ts: string): [unknown[], string] {
    const rune = pickTop(agg.runes);
    const spells = pickTop(agg.spells);
    const shards = pickTop(agg.shards);
    const items = [...agg.items.entries()].sort(
      (a, b) => b[1].games - a[1].games,
    );
    const core = items.slice(0, 3).map(([id]) => id);
    const options = items.slice(0, 8).map(([id, t]) => [id, t.wins, t.games]);

    const blocks: unknown[] = new Array(9).fill(null);
    blocks[0] = rune
      ? [rune.games, rune.wins, rune.meta.primary, rune.meta.secondary, rune.meta.perks]
      : [0, 0, 0, 0, []];
    blocks[1] = spells ? [spells.games, spells.wins, spells.meta.ids] : [0, 0, []];
    // [2] starting items + [4] skill order need the timeline pass (TODO).
    blocks[2] = [0, 0, []];
    blocks[3] = [agg.games, agg.wins, core];
    blocks[4] = [0, 0, [], ""];
    blocks[5] = [options];
    blocks[6] = [agg.wins, agg.games];
    blocks[8] = shards ? [shards.games, shards.wins, shards.meta.ids] : [0, 0, []];
    return [blocks, ts];
  }

  /** Export the accumulated counters as a served snapshot. */
  toSnapshot(version: string, patch: string): DatasetSnapshot {
    const builtAt = new Date().toISOString();

    const overview: Record<string, OverviewData> = {};
    for (const [champId, byRank] of this.overview) {
      const od: OverviewData = {};
      for (const [rank, byRole] of byRank) {
        const roles: Record<string, [unknown[], string]> = {};
        for (const [role, agg] of byRole) roles[role] = this.blocks(agg, builtAt);
        od[rank] = roles;
      }
      overview[String(champId)] = od;
    }

    const aram: Record<string, OverviewData> = {};
    for (const [champId, agg] of this.aram) {
      aram[String(champId)] = {
        [ARAM_RANK]: { [ARAM_ROLE]: this.blocks(agg, builtAt) },
      };
    }

    const matchups: Record<string, MatchupData> = {};
    for (const [champId, byRank] of this.matchups) {
      const md: MatchupData = {};
      for (const [rank, byRole] of byRank) {
        const roles: Record<string, number[][]> = {};
        for (const [role, byOpp] of byRole) {
          roles[role] = [...byOpp.entries()].map(([oppId, t]) => [
            oppId,
            t.wins,
            t.games,
          ]);
        }
        md[rank] = roles;
      }
      matchups[String(champId)] = md;
    }

    return { version, patch, builtAt, matches: this.matches, overview, aram, matchups };
  }
}

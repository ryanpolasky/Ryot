/**
 * Meta / champ-select intelligence.
 *
 * Endpoints:
 * - matchups: lane opponents + toughest matchups (ban targets) for a champion
 * - role distribution: per-role game volumes for a champion (lane prediction)
 * - predict lanes: optimal 5→5 lane assignment for a team
 * - meta board: global most-picked + highest-winrate threats
 *
 * Data sources (all u.gg static CDN, no auth):
 * - overview: per-champion per-role stats (reused from buildService)
 * - matchups: per-champion per-opponent win/loss/games
 */
import { ddragonImg } from "@lc/shared";
import { cache } from "../cache.js";
import {
  championFileById,
  getChampionMap,
  getVersion,
} from "../ddragonStore.js";
import {
  fetchAramOverview,
  fetchMatchups,
  fetchOverview,
} from "../uggSource.js";

const ROLE_LABELS: Record<string, string> = {
  "1": "Jungle",
  "2": "Support",
  "3": "Bottom",
  "4": "Top",
  "5": "Mid",
};
const ROLE_KEYS: Record<string, string> = {
  top: "4",
  jungle: "1",
  mid: "5",
  bottom: "3",
  support: "2",
};
const RANK_MAP: Record<string, string> = {
  emerald_plus: "17",
  platinum_plus: "10",
  diamond_plus: "11",
  master_plus: "14",
  overall: "8",
};

const LANE_ORDER = ["Top", "Jungle", "Mid", "Bottom", "Support"] as const;

// ── helpers ──────────────────────────────────────────────────────────────────

async function patchString(): Promise<string> {
  const v = await getVersion();
  return v.split(".").slice(0, 2).join("_");
}

async function resolveChampion(key: string) {
  const map = await getChampionMap();
  const version = await getVersion();
  for (const c of Object.values(map)) {
    if (
      c.id.toLowerCase() === key.toLowerCase() ||
      c.name.toLowerCase() === key.toLowerCase() ||
      c.key === key
    ) {
      return {
        id: c.key,
        name: c.name,
        icon: ddragonImg.champion(version, c.image.full),
      };
    }
  }
  throw new Error(`Unknown champion "${key}"`);
}

async function champMeta(champId: number) {
  const map = await getChampionMap();
  const version = await getVersion();
  const c = map[String(champId)];
  if (!c) return { id: champId, name: `Champion ${champId}`, icon: "" };
  return {
    id: champId,
    name: c.name,
    icon: ddragonImg.champion(version, c.image.full),
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface MatchupEntry {
  champion: string;
  championIcon: string;
  championId: number;
  games: number;
  wins: number;
  winRate: number;
}

export interface ChampionMatchups {
  champion: string;
  championIcon: string;
  role: string;
  /** Opponents sorted by most games (lane frequency). */
  laneOpponents: MatchupEntry[];
  /** Opponents sorted by lowest winRate (toughest, min 50 games). */
  counters: MatchupEntry[];
}

export async function getChampionMatchups(
  championKey: string,
  roleParam?: string,
  rankParam?: string,
): Promise<ChampionMatchups> {
  const champ = await resolveChampion(championKey);
  const data = await fetchMatchups(champ.id);
  const rankId = rankParam ? (RANK_MAP[rankParam] ?? rankParam) : "17";
  const rankBucket = data[rankId] ?? data["10"] ?? data["8"];
  if (!rankBucket) throw new Error("No matchup data for this rank");

  // Pick role.
  let roleId: string;
  if (roleParam && ROLE_KEYS[roleParam.toLowerCase()]) {
    roleId = ROLE_KEYS[roleParam.toLowerCase()]!;
  } else {
    // Default to the role with most matchup entries.
    roleId = Object.keys(rankBucket).reduce((best, r) => {
      const bLen = rankBucket[best]?.[0]?.length ?? 0;
      const rLen = rankBucket[r]?.[0]?.length ?? 0;
      return rLen > bLen ? r : best;
    });
  }

  const roleArr = rankBucket[roleId]?.[0] as number[][] | undefined;
  if (!roleArr) throw new Error("No matchup data for this role");

  // Parse entries: [oppChampId, wins, games, ...diffs]
  const entries: MatchupEntry[] = [];
  for (const row of roleArr) {
    const oppId = row[0];
    const wins = row[1] ?? 0;
    const games = row[2] ?? 0;
    if (!oppId || games <= 0) continue;
    const opp = await champMeta(oppId);
    entries.push({
      champion: opp.name,
      championIcon: opp.icon,
      championId: oppId,
      games,
      wins,
      winRate: Math.round((100 * wins) / games),
    });
  }

  const laneOpponents = entries
    .slice()
    .sort((a, b) => b.games - a.games)
    .slice(0, 15);

  const MIN_GAMES = 50;
  const counters = entries
    .filter((e) => e.games >= MIN_GAMES)
    .sort((a, b) => a.winRate - b.winRate)
    .slice(0, 10);

  return {
    champion: champ.name,
    championIcon: champ.icon,
    role: ROLE_LABELS[roleId] ?? roleId,
    laneOpponents,
    counters,
  };
}

// ── role distribution ────────────────────────────────────────────────────────

export interface RoleDistribution {
  role: string;
  games: number;
  /** 0..1 fraction of total games played in this role. */
  share: number;
}

export interface ChampionRoles {
  champion: string;
  championId: string;
  roles: RoleDistribution[];
}

export async function getRoleDistribution(
  championKey: string,
): Promise<ChampionRoles> {
  const champ = await resolveChampion(championKey);
  const overview = await fetchOverview(champ.id);
  const rankBucket = overview["17"] ?? overview["10"] ?? overview["8"];
  if (!rankBucket) throw new Error("No overview data");

  const byRole: { role: string; games: number }[] = [];
  let total = 0;
  for (const [roleId, arr] of Object.entries(rankBucket)) {
    const label = ROLE_LABELS[roleId];
    if (!label) continue;
    const roleData = arr[0] as unknown[] | undefined;
    if (!roleData) continue;
    const wg = roleData[6] as [number, number] | undefined;
    const games = wg?.[1] ?? 0;
    byRole.push({ role: label, games });
    total += games;
  }

  byRole.sort((a, b) => b.games - a.games);
  const roles: RoleDistribution[] = byRole.map((r) => ({
    role: r.role,
    games: r.games,
    share: total > 0 ? r.games / total : 0,
  }));

  return { champion: champ.name, championId: champ.id, roles };
}

// ── lane prediction ──────────────────────────────────────────────────────────

export interface LanePrediction {
  lane: string;
  champion: string;
  championIcon: string;
  championId: string;
  confidence: number; // 0..1
}

/**
 * Given 5 champion keys (enemy team), predict which lane each plays by
 * maximising the sum of role-share across a unique lane assignment.
 *
 * Brute-forces all 5! = 120 permutations (trivially fast).
 */
export async function predictLanes(
  championKeys: string[],
): Promise<LanePrediction[]> {
  if (championKeys.length !== 5)
    throw new Error("Exactly 5 champion keys required");

  // Fetch role distributions in parallel.
  const dists = await Promise.all(
    championKeys.map((k) => getRoleDistribution(k)),
  );

  // Build a 5×5 score matrix: score[champIdx][laneIdx] = role share.
  const scores: number[][] = dists.map((d) => {
    return LANE_ORDER.map((lane) => {
      const found = d.roles.find((r) => r.role === lane);
      return found?.share ?? 0;
    });
  });

  // Brute-force best permutation of 5 lanes.
  const perm = [0, 1, 2, 3, 4];
  let bestScore = -1;
  let bestAssign = [...perm];

  function permute(arr: number[], l: number) {
    if (l === arr.length) {
      let s = 0;
      for (let i = 0; i < 5; i++) s += scores[i]![arr[i]!]!;
      if (s > bestScore) {
        bestScore = s;
        bestAssign = [...arr];
      }
      return;
    }
    for (let i = l; i < arr.length; i++) {
      [arr[l], arr[i]] = [arr[i]!, arr[l]!];
      permute(arr, l + 1);
      [arr[l], arr[i]] = [arr[i]!, arr[l]!];
    }
  }
  permute(perm, 0);

  // Build result ordered top→jg→mid→bot→sup.
  const result: LanePrediction[] = LANE_ORDER.map((lane, laneIdx) => {
    const champIdx = bestAssign.indexOf(laneIdx);
    const d = dists[champIdx]!;
    const share = scores[champIdx]![laneIdx]!;
    return {
      lane,
      champion: d.champion,
      championIcon: "", // filled below
      championId: d.championId,
      confidence: share,
    };
  });

  // Fill icons.
  const version = await getVersion();
  for (const r of result) {
    const file = await championFileById(Number(r.championId));
    r.championIcon = file ? ddragonImg.champion(version, file) : "";
  }

  return result;
}

// ── meta board (global most-picked + highest-winrate threats) ────────────────

export interface MetaChampion {
  champion: string;
  championIcon: string;
  championId: string;
  role: string;
  games: number;
  winRate: number;
}

export interface MetaBoard {
  /** Champions ordered by most games (pick volume). */
  mostPicked: MetaChampion[];
  /** Champions ordered by highest win rate (min 500 games). Proxy for ban targets. */
  highestWinRate: MetaChampion[];
}

/**
 * Aggregates overview data across all champions to produce a global meta board.
 * Cached per patch for 12 h to be polite to u.gg's CDN.
 */
export async function getMetaBoard(rankParam?: string): Promise<MetaBoard> {
  const patch = await patchString();
  const rankId = rankParam ? (RANK_MAP[rankParam] ?? rankParam) : "17";

  return cache.wrap(`meta:board:${patch}:${rankId}`, 43200, async () => {
    const champMap = await getChampionMap();
    const version = await getVersion();
    const allChamps = Object.values(champMap);

    // Fetch overviews with limited concurrency (10 at a time).
    const all: MetaChampion[] = [];
    const CONCURRENCY = 10;
    for (let i = 0; i < allChamps.length; i += CONCURRENCY) {
      const batch = allChamps.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(async (c) => {
          const overview = await fetchOverview(c.key);
          const rankBucket =
            overview[rankId] ?? overview["17"] ?? overview["8"];
          if (!rankBucket) return [];
          const entries: MetaChampion[] = [];
          for (const [roleId, arr] of Object.entries(rankBucket)) {
            const label = ROLE_LABELS[roleId];
            if (!label) continue;
            const roleData = arr[0] as unknown[] | undefined;
            if (!roleData) continue;
            const wg = roleData[6] as [number, number] | undefined;
            const games = wg?.[1] ?? 0;
            const wins = wg?.[0] ?? 0;
            if (games <= 0) continue;
            entries.push({
              champion: c.name,
              championIcon: ddragonImg.champion(version, c.image.full),
              championId: c.key,
              role: label,
              games,
              winRate: Math.round((100 * wins) / games),
            });
          }
          return entries;
        }),
      );
      for (const r of results) {
        if (r.status === "fulfilled") all.push(...r.value);
      }
    }

    const mostPicked = all
      .slice()
      .sort((a, b) => b.games - a.games)
      .slice(0, 30);

    const MIN_GAMES = 500;
    const highestWinRate = all
      .filter((c) => c.games >= MIN_GAMES)
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 30);

    return { mostPicked, highestWinRate };
  });
}

// ── tier list (champion meta per role / patch) ───────────────────────────────

export interface TierEntry {
  champion: string;
  championIcon: string;
  championId: string;
  role: string;
  tier: string; // S+ / S / A / B / C / D
  winRate: number; // %
  pickShare: number; // % of games in this role (popularity proxy)
  games: number;
}

export interface TierListResult {
  patch: string;
  rank: string;
  /** All five roles, each sorted best → worst. */
  roles: Record<string, TierEntry[]>;
}

/**
 * Meta score: win rate is the primary signal, but a champion needs real play
 * to rank highly. Pick share (capped) adds a popularity bump so niche off-role
 * picks with an inflated win rate don't dominate the list. This is what gets
 * sorted/tiered; the displayed win rate stays exact.
 */
function metaScore(winRate: number, pickShare: number): number {
  const pick = Math.min(pickShare, 12); // cap so one-trick outliers don't run away
  return winRate - 50 + 2.2 * Math.sqrt(pick);
}

/** Relative tier by rank position within the role (standard tier-list shape). */
function tierForRank(index: number, count: number): string {
  const pct = count > 1 ? index / count : 0;
  if (pct < 0.04) return "S+";
  if (pct < 0.1) return "S";
  if (pct < 0.25) return "A";
  if (pct < 0.5) return "B";
  if (pct < 0.8) return "C";
  return "D";
}

/**
 * Builds a per-role tier list from u.gg overview data (reuses the same source
 * as the build/meta features). Win rate is exact; "pick share" is a champion's
 * fraction of games within its role (a popularity proxy; u.gg's true
 * pick/ban-rate ranking endpoint is not publicly fetchable). Cached 12 h.
 */
export async function getTierList(rankParam?: string): Promise<TierListResult> {
  const patch = await patchString();
  const rankId = rankParam ? (RANK_MAP[rankParam] ?? rankParam) : "17";

  return cache.wrap(`meta:tierlist:${patch}:${rankId}`, 43200, async () => {
    const champMap = await getChampionMap();
    const version = await getVersion();
    const allChamps = Object.values(champMap);

    const byRole = new Map<string, TierEntry[]>();
    const CONCURRENCY = 10;
    for (let i = 0; i < allChamps.length; i += CONCURRENCY) {
      const batch = allChamps.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(async (c) => {
          const overview = await fetchOverview(c.key);
          const rankBucket =
            overview[rankId] ?? overview["17"] ?? overview["8"];
          if (!rankBucket) return [] as TierEntry[];
          const entries: TierEntry[] = [];
          for (const [roleId, arr] of Object.entries(rankBucket)) {
            const label = ROLE_LABELS[roleId];
            if (!label) continue;
            const roleData = arr[0] as unknown[] | undefined;
            if (!roleData) continue;
            const wg = roleData[6] as [number, number] | undefined;
            const games = wg?.[1] ?? 0;
            const wins = wg?.[0] ?? 0;
            if (games <= 0) continue;
            entries.push({
              champion: c.name,
              championIcon: ddragonImg.champion(version, c.image.full),
              championId: c.key,
              role: label,
              tier: "C",
              winRate: Math.round((1000 * wins) / games) / 10,
              pickShare: 0,
              games,
            });
          }
          return entries;
        }),
      );
      for (const r of results) {
        if (r.status === "fulfilled") {
          for (const e of r.value) {
            const list = byRole.get(e.role) ?? [];
            list.push(e);
            byRole.set(e.role, list);
          }
        }
      }
    }

    const roles: Record<string, TierEntry[]> = {};
    const MIN_GAMES = 200;
    // Minimum share of a role's games for a champion to count as actually
    // played there. Filters out "pocket picks" (e.g. Singed mid, Olaf bot)
    // whose inflated win rate from counter/one-trick selection would otherwise
    // top the list. ~0.5% ≈ 1 in 200 games in that role.
    const MIN_PICK_SHARE = 0.5;
    for (const lane of LANE_ORDER) {
      const played = (byRole.get(lane) ?? []).filter(
        (e) => e.games >= MIN_GAMES,
      );
      // Pick share is a champion's fraction of all games played in this role.
      const totalGames = played.reduce((a, e) => a + e.games, 0) || 1;
      for (const e of played) {
        e.pickShare = Math.round((1000 * e.games) / totalGames) / 10;
      }
      const list = played.filter((e) => e.pickShare >= MIN_PICK_SHARE);
      // Order by meta score (win rate blended with pick share), then volume,
      // so popular, genuinely strong champions rank above niche off-role picks.
      list.sort(
        (a, b) =>
          metaScore(b.winRate, b.pickShare) -
            metaScore(a.winRate, a.pickShare) || b.games - a.games,
      );
      list.forEach((e, i) => {
        e.tier = tierForRank(i, list.length);
      });
      roles[lane] = list;
    }

    return {
      patch: patch.replace("_", "."),
      rank: rankParam ?? "emerald_plus",
      roles,
    };
  });
}

export interface AramTierListResult {
  patch: string;
  /** Single combined list, best → worst (ARAM has no roles). */
  entries: TierEntry[];
}

/**
 * ARAM tier list (queue 450). One combined ranking, no roles. Win rate is
 * exact; pick share is a champion's fraction of all ARAM games (a popularity
 * proxy). Cached 12 h. ARAM win rates cluster tightly, so we still blend a
 * small pick-share bump and drop near-unplayed champs.
 */
export async function getAramTierList(): Promise<AramTierListResult> {
  const patch = await patchString();

  return cache.wrap(`meta:aram-tierlist:${patch}`, 43200, async () => {
    const champMap = await getChampionMap();
    const version = await getVersion();
    const allChamps = Object.values(champMap);

    const collected: TierEntry[] = [];
    const CONCURRENCY = 4;
    for (let i = 0; i < allChamps.length; i += CONCURRENCY) {
      const batch = allChamps.slice(i, i + CONCURRENCY);
      if (i > 0) await new Promise((r) => setTimeout(r, 250));
      const results = await Promise.allSettled(
        batch.map(async (c) => {
          const overview = await fetchAramOverview(c.key);
          // ARAM: rank "8" (overall), role "6".
          const bucket = overview["8"];
          const roleData = bucket?.["6"]?.[0] as unknown[] | undefined;
          if (!roleData) return null;
          const wg = roleData[6] as [number, number] | undefined;
          const games = wg?.[1] ?? 0;
          const wins = wg?.[0] ?? 0;
          if (games <= 0) return null;
          return {
            champion: c.name,
            championIcon: ddragonImg.champion(version, c.image.full),
            championId: c.key,
            role: "ARAM",
            tier: "C",
            winRate: Math.round((1000 * wins) / games) / 10,
            pickShare: 0,
            games,
          } as TierEntry;
        }),
      );
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) collected.push(r.value);
      }
    }

    // Guard: if a rate-limited pass returned too few champions, don't cache the
    // sparse result. Throwing keeps cache.wrap from storing it, so the next
    // request retries with a warm per-champ cache.
    if (collected.length < 100) {
      throw new Error(
        `ARAM tier list incomplete (${collected.length} champions)`,
      );
    }

    const MIN_GAMES = 200;
    const played = collected.filter((e) => e.games >= MIN_GAMES);
    const totalGames = played.reduce((a, e) => a + e.games, 0) || 1;
    for (const e of played) {
      e.pickShare = Math.round((1000 * e.games) / totalGames) / 10;
    }
    played.sort((a, b) =>
      metaScore(a.winRate, a.pickShare) < metaScore(b.winRate, b.pickShare)
        ? 1
        : -1,
    );
    played.forEach((e, i) => {
      e.tier = tierForRank(i, played.length);
    });

    return { patch: patch.replace("_", "."), entries: played };
  });
}

/**
 * Recommended champion builds from Ryot's own build engine (Riot Match-V5
 * aggregation; see ../stats). All item/rune/spell IDs are resolved to names +
 * icon URLs using Data Dragon so the web client can render the response directly.
 */

import {
  DDragonItem,
  STAT_SHARD_NAME,
  ddragonImg,
  fetchItems,
  fetchRuneStyles,
} from "@lc/shared";

const SUMMONER_SPELL_NAME: Record<number, string> = {
  1: "Cleanse",
  3: "Exhaust",
  4: "Flash",
  6: "Ghost",
  7: "Heal",
  11: "Smite",
  12: "Teleport",
  13: "Clarity",
  14: "Ignite",
  21: "Barrier",
  32: "Snowball",
};
import { cache } from "../cache.js";
import { getChampionMap, getVersion } from "../ddragonStore.js";
import { assertStatsReady, fetchOverview } from "../stats/engine.js";
import { ServiceError } from "./riotService.js";

/** Internal role ids (kept stable across the build/meta services). */
const ROLE_MAP: Record<string, string> = {
  top: "4",
  jungle: "1",
  mid: "5",
  bottom: "3",
  support: "2",
};
const ROLE_LABELS: Record<string, string> = {
  "1": "Jungle",
  "2": "Support",
  "3": "Bottom",
  "4": "Top",
  "5": "Mid",
};

/** Internal rank-bucket ids. We expose a curated subset. */
const RANK_MAP: Record<string, string> = {
  emerald_plus: "17",
  platinum_plus: "10",
  diamond_plus: "11",
  master_plus: "14",
  grandmaster: "13",
  challenger: "1",
  overall: "8",
};
const RANK_LABELS: Record<string, string> = {
  "1": "Challenger",
  "8": "Overall",
  "10": "Platinum+",
  "11": "Diamond+",
  "13": "Grandmaster",
  "14": "Master+",
  "17": "Emerald+",
};

// ── response types ───────────────────────────────────────────────────────────

interface ItemEntry {
  id: number;
  name: string;
  description: string;
  gold: number | null;
  icon: string | null;
}

interface RuneEntry {
  id: number;
  name: string;
  icon: string;
}

interface ItemOption {
  item: ItemEntry;
  wins: number;
  games: number;
  winRate: number;
}

export interface RecommendedBuild {
  champion: string;
  championIcon: string;
  role: string;
  rank: string;
  patch: string;
  games: number;
  wins: number;
  winRate: number;
  runes: {
    primaryStyle: RuneEntry;
    keystone: RuneEntry;
    primaryPerks: RuneEntry[];
    secondaryStyle: RuneEntry;
    secondaryPerks: RuneEntry[];
    shards: string[];
    /** Numeric perk IDs, ordered keystone-first, for League Client import. */
    perkIds: number[];
    /** Numeric stat-shard perk IDs (parallel to `shards`). */
    shardIds: number[];
  };
  summoners: ItemEntry[];
  startingItems: ItemEntry[];
  coreItems: ItemEntry[];
  itemOptions: ItemOption[][];
  skillOrder: string[];
  skillPriority: string;
  availableRoles: string[];
}

// ── DDragon lookup caches ────────────────────────────────────────────────────

async function getItemMap(): Promise<Record<string, DDragonItem>> {
  return cache.wrap("ddragon:items", 3600, async () => {
    const version = await getVersion();
    return fetchItems(version);
  });
}

async function getRuneIndex(): Promise<{
  styles: Record<number, { name: string; icon: string }>;
  perks: Record<number, { name: string; icon: string }>;
}> {
  return cache.wrap("ddragon:rune-index", 3600, async () => {
    const version = await getVersion();
    const styles = await fetchRuneStyles(version);
    const sMap: Record<number, { name: string; icon: string }> = {};
    const pMap: Record<number, { name: string; icon: string }> = {};
    for (const style of styles) {
      sMap[style.id] = {
        name: style.name,
        icon: ddragonImg.runeIcon(style.icon),
      };
      for (const slot of style.slots) {
        for (const rune of slot.runes) {
          pMap[rune.id] = {
            name: rune.name,
            icon: ddragonImg.runeIcon(rune.icon),
          };
        }
      }
    }
    return { styles: sMap, perks: pMap };
  });
}

// ── main ─────────────────────────────────────────────────────────────────────

export async function getRecommendedBuild(
  championKey: string,
  roleParam?: string,
  rankParam?: string,
): Promise<RecommendedBuild> {
  // 503 "coming soon" until the engine has a snapshot to serve.
  assertStatsReady();
  const version = await getVersion();

  // Resolve champion id (numeric) from name/key.
  const champMap = await getChampionMap();
  let champId: string | null = null;
  let champName = championKey;
  let champIcon = "";

  // Try by DDragon id (e.g. "Aatrox"), name, or numeric key.
  for (const c of Object.values(champMap)) {
    if (
      c.id.toLowerCase() === championKey.toLowerCase() ||
      c.name.toLowerCase() === championKey.toLowerCase() ||
      c.key === championKey
    ) {
      champId = c.key;
      champName = c.name;
      champIcon = ddragonImg.champion(version, c.image.full);
      break;
    }
  }
  if (!champId)
    throw new ServiceError(404, `No champion called "${championKey}".`);

  // Per-champion overview from the build engine snapshot.
  const overviewData = await fetchOverview(champId);

  // Resolve rank.
  const rankId = rankParam ? (RANK_MAP[rankParam] ?? rankParam) : "17";
  const rankBucket =
    overviewData[rankId] ?? overviewData["10"] ?? overviewData["8"];
  if (!rankBucket) throw new Error("No data for this rank");

  // Available roles.
  const availableRoles = Object.keys(rankBucket)
    .filter((r) => ROLE_LABELS[r])
    .sort((a, b) => {
      const am = (rankBucket[a]?.[0] as unknown[])?.[6] as
        | [number, number]
        | undefined;
      const bm = (rankBucket[b]?.[0] as unknown[])?.[6] as
        | [number, number]
        | undefined;
      return (bm?.[1] ?? 0) - (am?.[1] ?? 0);
    })
    .map((r) => ROLE_LABELS[r]!);

  // Resolve role.
  let roleId: string;
  if (roleParam) {
    roleId = ROLE_MAP[roleParam.toLowerCase()] ?? roleParam;
  } else {
    // Pick highest-match-count role.
    roleId = Object.keys(rankBucket).reduce((best, r) => {
      const bm = (rankBucket[best]?.[0] as unknown[])?.[6] as
        | [number, number]
        | undefined;
      const rm = (rankBucket[r]?.[0] as unknown[])?.[6] as
        | [number, number]
        | undefined;
      return (rm?.[1] ?? 0) > (bm?.[1] ?? 0) ? r : best;
    });
  }

  const roleData = rankBucket[roleId]?.[0] as unknown[] | undefined;
  if (!roleData) throw new Error("No data for this role");

  // ── parse blocks ─────────────────────────────────────────────────────────

  const [itemMap, runeIdx] = await Promise.all([getItemMap(), getRuneIndex()]);

  function resolveItem(id: number): ItemEntry {
    const it = itemMap[String(id)];
    return {
      id,
      name: it?.name ?? `Item ${id}`,
      // Full in-game description (League's own rich markup), straight from Data Dragon.
      description: it?.description ?? "",
      gold: it?.gold?.total ?? null,
      icon: ddragonImg.item(version, id),
    };
  }

  function resolveSpell(id: number): ItemEntry {
    return {
      id,
      name: SUMMONER_SPELL_NAME[id] ?? `Spell ${id}`,
      description: "",
      gold: null,
      icon: ddragonImg.summonerSpell(version, id),
    };
  }

  function resolvePerk(id: number): RuneEntry {
    const p = runeIdx.perks[id];
    return p
      ? { id, name: p.name, icon: p.icon }
      : { id, name: `Rune ${id}`, icon: "" };
  }
  function resolveStyle(id: number): RuneEntry {
    const s = runeIdx.styles[id];
    return s
      ? { id, name: s.name, icon: s.icon }
      : { id, name: `Style ${id}`, icon: "" };
  }

  // Block 0: runes [matches, wins, primaryStyleId, secondaryStyleId, [perkIds]]
  const rb = roleData[0] as [number, number, number, number, number[]];
  const perkIds = rb[4];
  const primaryStyleId = rb[2];
  const secondaryStyleId = rb[3];

  // Split perks: first 3 from primary tree after keystone, then 2 from secondary.
  const keystone = resolvePerk(perkIds[0]!);
  const primaryPerks = perkIds.slice(1, 4).map(resolvePerk);
  const secondaryPerks = perkIds.slice(4, 6).map(resolvePerk);

  // Block 8: stat shards [matches, wins, [shard1, shard2, shard3]], values are perk IDs.
  const shardBlock = roleData[8] as [number, number, string[]] | undefined;
  const shardRaw = shardBlock?.[2] ?? [];
  const shards = shardRaw.map((s) => STAT_SHARD_NAME[s] ?? s);
  const shardIds = shardRaw
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));

  // Block 1: summoner spells [matches, wins, [s1, s2]]
  const sb = roleData[1] as [number, number, number[]];
  const summoners = sb[2].map(resolveSpell);

  // Block 2: starting items [matches, wins, [item1, item2, ...]]
  const stb = roleData[2] as [number, number, number[]];
  const startingItems = stb[2].map(resolveItem);

  // Block 3: core items [matches, wins, [item1, item2, item3]]
  const cb = roleData[3] as [number, number, number[]];
  const coreItems = cb[2].map(resolveItem);

  // Block 4: skill order [matches, wins, [18-level sequence], "QEW"]
  const skb = roleData[4] as [number, number, string[], string];
  const skillOrder = skb[2];
  const skillPriority = skb[3];

  // Block 5: item options: groups of [itemId, wins, matches]
  const opts = roleData[5] as number[][][];
  const itemOptions = (opts ?? [])
    .filter((group) => group.length > 0)
    .map((group) =>
      group.map((entry) => {
        const [id, w, g] = entry as unknown as [number, number, number];
        return {
          item: resolveItem(id),
          wins: w,
          games: g,
          winRate: g > 0 ? Math.round((100 * w) / g) : 0,
        };
      }),
    );

  // Block 6: [wins, matches]
  const [wins, games] = roleData[6] as [number, number];

  return {
    champion: champName,
    championIcon: champIcon,
    role: ROLE_LABELS[roleId] ?? roleId,
    rank: RANK_LABELS[rankId] ?? rankId,
    patch: version,
    games,
    wins,
    winRate: games > 0 ? Math.round((100 * wins) / games) : 0,
    runes: {
      primaryStyle: resolveStyle(primaryStyleId),
      keystone,
      primaryPerks,
      secondaryStyle: resolveStyle(secondaryStyleId),
      secondaryPerks,
      shards,
      perkIds: perkIds.slice(0, 6),
      shardIds,
    },
    summoners,
    startingItems,
    coreItems,
    itemOptions,
    skillOrder,
    skillPriority,
    availableRoles,
  };
}

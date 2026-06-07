/**
 * Live coaching helpers (Features 3 & 4).
 *
 * All inputs come from the local Live Client Data API (ToS-safe) plus the
 * recommended build pulled from the Ryot backend. Nothing here reads memory.
 */

import type { AllGameData, LivePlayer } from "./liveclient.js";

export interface BuildItem {
  id: number;
  name: string;
  gold: number | null;
  icon: string | null;
}

export interface OverlayBuild {
  champion: string;
  championIcon: string;
  role: string;
  skillOrder: string[]; // length 18, e.g. ["Q","E","Q",...]
  skillPriority: string; // e.g. "Q > E > W"
  startingItems: BuildItem[];
  coreItems: BuildItem[];
}

// ── gold from bought items ───────────────────────────────────────────────────
// Per the product decision, gold is the summed value of the items a player is
// currently holding, no CS/kill/time prediction. Item costs come from Data
// Dragon (itemID → total gold). Trinkets/0-cost items contribute nothing.

export type ItemCostMap = Map<number, number>;

/** Total gold value of the items a player currently holds. */
export function itemsGold(p: LivePlayer, costs: ItemCostMap): number {
  let total = 0;
  for (const it of p.items ?? []) {
    total += (costs.get(it.itemID) ?? 0) * (it.count || 1);
  }
  return total;
}

export interface StatPanel {
  teamGold: number; // your team's total item value
  teamGoldDelta: number; // your team − enemy team
  csPerMin: number;
  goldPerMin: number; // your item value / min
  visionPerMin: number;
  killParticipation: number; // %
  level: number;
}

/** Compute the compact top-right stat panel for the active player. */
export function computeStatPanel(
  data: AllGameData,
  me: LivePlayer,
  costs: ItemCostMap,
): StatPanel {
  const t = Math.max(1, data.gameData.gameTime);
  const mins = t / 60;
  const myTeam = me.team;
  const allies = data.allPlayers.filter((p) => p.team === myTeam);
  const enemies = data.allPlayers.filter((p) => p.team !== myTeam);

  const teamGold = allies.reduce((a, p) => a + itemsGold(p, costs), 0);
  const enemyGold = enemies.reduce((a, p) => a + itemsGold(p, costs), 0);
  const teamKills = allies.reduce((a, p) => a + p.scores.kills, 0) || 1;

  return {
    teamGold,
    teamGoldDelta: teamGold - enemyGold,
    csPerMin: me.scores.creepScore / mins,
    goldPerMin: itemsGold(me, costs) / mins,
    visionPerMin: me.scores.wardScore / mins,
    killParticipation: Math.round(
      (100 * (me.scores.kills + me.scores.assists)) / teamKills,
    ),
    level: me.level,
  };
}

export interface LaneGold {
  position: string;
  ally?: LivePlayer;
  enemy?: LivePlayer;
  allyGold: number;
  enemyGold: number;
  diff: number; // ally − enemy
}

export interface GoldDiff {
  blueGold: number;
  redGold: number;
  diff: number; // (your team) − (enemy)
  lanes: LaneGold[];
}

const LANE_POSITIONS = [
  "TOP",
  "JUNGLE",
  "MIDDLE",
  "BOTTOM",
  "UTILITY",
] as const;

/** Team totals + per-lane gold diffs (matched by position), from item values. */
export function computeGoldDiff(
  data: AllGameData,
  me: LivePlayer | undefined,
  costs: ItemCostMap,
): GoldDiff {
  const myTeam = me?.team ?? "ORDER";
  const allies = data.allPlayers.filter((p) => p.team === myTeam);
  const enemies = data.allPlayers.filter((p) => p.team !== myTeam);

  const blueGold = allies.reduce((a, p) => a + itemsGold(p, costs), 0);
  const redGold = enemies.reduce((a, p) => a + itemsGold(p, costs), 0);

  const lanes: LaneGold[] = LANE_POSITIONS.map((pos) => {
    const ally = allies.find((p) => p.position === pos);
    const enemy = enemies.find((p) => p.position === pos);
    const allyGold = ally ? itemsGold(ally, costs) : 0;
    const enemyGold = enemy ? itemsGold(enemy, costs) : 0;
    return {
      position: pos,
      ally,
      enemy,
      allyGold,
      enemyGold,
      diff: allyGold - enemyGold,
    };
  }).filter((l) => l.ally || l.enemy);

  return { blueGold, redGold, diff: blueGold - redGold, lanes };
}

/** Find the player the overlay belongs to (the active/local player). */
export function findActivePlayer(data: AllGameData): LivePlayer | undefined {
  const me =
    data.activePlayer?.riotIdGameName || data.activePlayer?.summonerName;
  if (!me) return undefined;
  return data.allPlayers.find(
    (p) => p.riotIdGameName === me || p.summonerName === me || p.riotId === me,
  );
}

export interface NextSkill {
  /** 1-based level the next point goes into, or null if maxed. */
  atLevel: number | null;
  slot: string | null; // "Q" | "W" | "E" | "R"
}

/** Given the player's current level, what skill the build levels next. */
export function nextSkill(build: OverlayBuild, level: number): NextSkill {
  const idx = Math.max(0, Math.min(level, build.skillOrder.length - 1));
  const slot = build.skillOrder[idx] ?? null;
  return { atLevel: idx + 1, slot };
}

export interface CoachAdvice {
  /** Next core item the player hasn't built yet. */
  nextItem: BuildItem | null;
  goldHave: number;
  goldNeeded: number; // remaining gold for nextItem (>=0)
  canAfford: boolean;
  /** True when it's worth backing (can afford the next item / a big chunk). */
  recommendBack: boolean;
  /** Item the player just completed this tick (power spike), if any. */
  spike: BuildItem | null;
}

export interface CoachState {
  ownedCoreIds: Set<number>;
}

export function newCoachState(): CoachState {
  return { ownedCoreIds: new Set() };
}

/**
 * Compute coaching advice from live gold + owned items vs the recommended core
 * build. Detects the next item to buy, whether to back, and power spikes.
 */
export function computeAdvice(
  data: AllGameData,
  me: LivePlayer | undefined,
  build: OverlayBuild | null,
  state: CoachState,
): CoachAdvice {
  const goldHave = Math.round(data.activePlayer?.currentGold ?? 0);
  const empty: CoachAdvice = {
    nextItem: null,
    goldHave,
    goldNeeded: 0,
    canAfford: false,
    recommendBack: false,
    spike: null,
  };
  if (!build || !me) return empty;

  const owned = new Set(me.items.map((i) => i.itemID));

  // Power spike: did we complete a core item since last tick?
  let spike: BuildItem | null = null;
  for (const item of build.coreItems) {
    if (owned.has(item.id) && !state.ownedCoreIds.has(item.id)) {
      spike = item;
    }
  }
  state.ownedCoreIds = new Set(
    build.coreItems.filter((c) => owned.has(c.id)).map((c) => c.id),
  );

  // Next item = first core item not yet owned.
  const nextItem = build.coreItems.find((c) => !owned.has(c.id)) ?? null;
  const cost = nextItem?.gold ?? 0;
  const goldNeeded = Math.max(0, cost - goldHave);
  const canAfford = nextItem != null && goldHave >= cost;

  // Recommend backing once we can afford the next item (or ~90% of it).
  const recommendBack =
    nextItem != null && cost > 0 && goldHave >= cost * 0.9 && !me.isDead;

  return { nextItem, goldHave, goldNeeded, canAfford, recommendBack, spike };
}

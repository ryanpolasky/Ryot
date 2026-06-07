/**
 * Types and helpers for Riot's Live Client Data API.
 * This API is served locally by the running League client at
 * https://127.0.0.1:2999/liveclientdata/* and is the ONLY sanctioned source
 * of in-game data for overlays (no memory reading, ToS compliant).
 */

export const LIVE_CLIENT_BASE = "https://127.0.0.1:2999/liveclientdata";

export interface LiveScores {
  kills: number;
  deaths: number;
  assists: number;
  creepScore: number;
  wardScore: number;
}

export interface LiveItem {
  itemID: number;
  slot: number;
  count: number;
}

export interface LivePlayer {
  championName: string;
  rawChampionName: string;
  summonerName: string;
  riotId?: string;
  riotIdGameName?: string;
  isBot: boolean;
  isDead: boolean;
  respawnTimer: number;
  level: number;
  position: string;
  team: "ORDER" | "CHAOS" | string;
  scores: LiveScores;
  items: LiveItem[];
  summonerSpells: {
    summonerSpellOne: { displayName: string };
    summonerSpellTwo: { displayName: string };
  };
}

export interface LiveEvent {
  EventID: number;
  EventName: string;
  EventTime: number;
  DragonType?: string;
  KillerName?: string;
}

export interface LiveGameData {
  gameMode: string;
  gameTime: number;
  mapName: string;
  mapNumber: number;
}

export interface AllGameData {
  activePlayer?: {
    summonerName?: string;
    riotIdGameName?: string;
    currentGold?: number;
    level?: number;
  };
  allPlayers: LivePlayer[];
  events: { Events: LiveEvent[] };
  gameData: LiveGameData;
}

export interface ObjectiveTimer {
  label: string;
  /** seconds until next spawn, or null if up/unknown */
  secondsUntil: number | null;
  up: boolean;
}

const RESPAWN = { dragon: 300, baron: 360, herald: 240 };
const BARON_FIRST_SPAWN = 20 * 60;
const HERALD_DESPAWN = 19 * 60 + 55;
const INHIB_REBUILD = 300; // 5:00 rebuild

// ── jungle camp first-spawn times (Season 2025) ─────────────────────────────
// After the first spawn, we have no API signal for when a camp was cleared, so
// timers only show the countdown to the initial spawn. Post-first-spawn the
// chip disappears (state unknown).
interface CampDef {
  label: string;
  firstSpawn: number; // seconds
}
const CAMPS: CampDef[] = [
  { label: "Blue (B)", firstSpawn: 90 },
  { label: "Blue (R)", firstSpawn: 90 },
  { label: "Red (B)", firstSpawn: 90 },
  { label: "Red (R)", firstSpawn: 90 },
  { label: "Gromp (B)", firstSpawn: 90 },
  { label: "Gromp (R)", firstSpawn: 90 },
  { label: "Wolves (B)", firstSpawn: 90 },
  { label: "Wolves (R)", firstSpawn: 90 },
  { label: "Raptors (B)", firstSpawn: 90 },
  { label: "Raptors (R)", firstSpawn: 90 },
  { label: "Krugs (B)", firstSpawn: 90 },
  { label: "Krugs (R)", firstSpawn: 90 },
  { label: "Scuttle Top", firstSpawn: 210 }, // 3:30
  { label: "Scuttle Bot", firstSpawn: 210 },
];

/**
 * Detect which map the live game is on. Howling Abyss (ARAM) is map number 12
 * and reports gameMode "ARAM" (Clash/ARAM Mayhem variants also run on map 12).
 * Everything else is treated as Summoner's Rift for layout purposes.
 */
export function detectMapMode(data: AllGameData): "rift" | "aram" {
  const g = data.gameData;
  if (!g) return "rift";
  if (g.mapNumber === 12) return "aram";
  if (typeof g.gameMode === "string" && g.gameMode.toUpperCase() === "ARAM") {
    return "aram";
  }
  return "rift";
}

/** Derive Dragon / Baron / Herald timers from the event log + current game time. */
export function computeObjectiveTimers(data: AllGameData): ObjectiveTimer[] {
  const now = data.gameData.gameTime;
  const events = data.events?.Events ?? [];
  const lastTime = (name: string) =>
    events
      .filter((e) => e.EventName === name)
      .reduce((m, e) => Math.max(m, e.EventTime), -Infinity);

  const dragonKill = lastTime("DragonKill");
  const baronKill = lastTime("BaronKill");
  const heraldKill = lastTime("HeraldKill");

  const timers: ObjectiveTimer[] = [];

  // Dragon: first spawns ~5:00; respawns 5:00 after each kill.
  const dragonNext =
    dragonKill > -Infinity ? dragonKill + RESPAWN.dragon : 5 * 60;
  timers.push(makeTimer("Dragon", dragonNext, now));

  // Baron: first spawns 20:00; respawns 6:00 after each kill.
  const baronNext =
    baronKill > -Infinity ? baronKill + RESPAWN.baron : BARON_FIRST_SPAWN;
  timers.push(makeTimer("Baron", baronNext, now));

  // Herald: spawns ~14:00, despawns 19:55. Hide once Baron territory begins.
  if (now < HERALD_DESPAWN) {
    const heraldNext =
      heraldKill > -Infinity ? heraldKill + RESPAWN.herald : 14 * 60;
    timers.push(makeTimer("Herald", Math.min(heraldNext, HERALD_DESPAWN), now));
  }

  return timers;
}

/** First-spawn-only countdowns for all jungle camps + scuttles.
 *  Returns timers only when `gameTime < firstSpawn` (pre-first-spawn). */
export function computeCampTimers(data: AllGameData): ObjectiveTimer[] {
  const now = data.gameData.gameTime;
  return CAMPS.filter((c) => now < c.firstSpawn).map((c) =>
    makeTimer(c.label, c.firstSpawn, now),
  );
}

/** Inhibitor rebuild countdowns from InhibKilled events.
 *  The API fires `InhibKilled` with a `KillerName` field; the event's
 *  `InhibKilled` property isn't reliably named, so we track all of them
 *  and show a 5:00 countdown per unique inhib destroyed. */
export function computeInhibTimers(data: AllGameData): ObjectiveTimer[] {
  const now = data.gameData.gameTime;
  const events = data.events?.Events ?? [];
  const inhibKills = events.filter((e) => e.EventName === "InhibKilled");
  // The Live Client API only gives EventTime; we don't know which specific
  // inhib was destroyed (no lane tag). Track the last 6 events (max 6 inhibs)
  // and show a countdown for each that hasn't rebuilt yet.
  const timers: ObjectiveTimer[] = [];
  const seen = new Set<number>(); // dedup by EventTime
  for (const ev of inhibKills) {
    if (seen.has(ev.EventTime)) continue;
    seen.add(ev.EventTime);
    const rebuildAt = ev.EventTime + INHIB_REBUILD;
    if (now < rebuildAt) {
      timers.push(makeTimer("Inhib", rebuildAt, now));
    }
  }
  return timers;
}

function makeTimer(
  label: string,
  nextSpawn: number,
  now: number,
): ObjectiveTimer {
  const secondsUntil = Math.max(0, Math.round(nextSpawn - now));
  return {
    label,
    secondsUntil: secondsUntil > 0 ? secondsUntil : 0,
    up: secondsUntil <= 0,
  };
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

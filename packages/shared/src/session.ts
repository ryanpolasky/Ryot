/**
 * Session / LP tracker.
 *
 * A "session" is one continuous sitting of games: consecutive matches separated
 * by less than `gapMinutes` of downtime. We split a player's recent match list
 * into sessions, then summarise the most recent one (wins, losses, win rate,
 * current streak) and tag it with lighthearted, positive/neutral labels
 * (Heater, Win Streak, Bounce Back, Up Session, Coin Flip).
 *
 * Riot's match-v5 API does NOT expose per-game LP changes, so net LP is an
 * estimate (a flat average per win/loss) and is always labelled as such.
 *
 * Pure module, no API calls, so it unit tests and runs on either side.
 */
import type { MatchDTO } from "./riot/types.js";

export type SessionTagTone = "good" | "bad" | "neutral";

export interface SessionTag {
  id: string;
  label: string;
  icon: string;
  tone: SessionTagTone;
  description: string;
}

export interface SessionGame {
  matchId: string;
  championName: string;
  queueId: number;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  gameCreation: number;
  gameDuration: number;
  /** Estimated LP gained/lost for this game (match-v5 has no real LP data). */
  lpDeltaEst: number;
}

export interface PlayerSession {
  /** Games in this session, newest first. */
  games: SessionGame[];
  wins: number;
  losses: number;
  winRate: number; // 0..1
  /** "W" | "L" for the current run from the newest game, or null if empty. */
  streakType: "W" | "L" | null;
  streakLen: number;
  /** Estimated net LP across the session. Always an estimate. */
  netLpEst: number;
  /** Always true: LP figures are estimated, never from Riot. */
  lpEstimated: true;
  startedAt: number; // ms epoch of oldest game in session
  endedAt: number; // ms epoch of newest game end
  durationMs: number;
  tags: SessionTag[];
}

export interface SessionOptions {
  /** Downtime (minutes) that ends a session. Default 180 (3h). */
  gapMinutes?: number;
  /** Only count ranked solo/flex games (queues 420/440). Default true. */
  rankedOnly?: boolean;
  /** Estimated LP per win. Default 21. */
  lpPerWin?: number;
  /** Estimated LP per loss. Default 18. */
  lpPerLoss?: number;
}

const RANKED_QUEUES = new Set([420, 440]);

function kdaValue(k: number, d: number, a: number): number {
  return d === 0 ? k + a : Math.round(((k + a) / d) * 100) / 100;
}

function endOf(m: MatchDTO): number {
  return (
    m.info.gameEndTimestamp ?? m.info.gameCreation + m.info.gameDuration * 1000
  );
}

/**
 * Split a player's matches into sessions (newest session first, games inside a
 * session newest first). Each session is a run of games with < gapMinutes of
 * downtime between the end of one and the start of the next.
 */
export function splitSessions(
  matches: MatchDTO[],
  focusPuuid: string,
  opts: SessionOptions = {},
): PlayerSession[] {
  const gapMs = (opts.gapMinutes ?? 180) * 60_000;
  const rankedOnly = opts.rankedOnly ?? true;
  const lpWin = opts.lpPerWin ?? 21;
  const lpLoss = opts.lpPerLoss ?? 18;

  const usable = matches
    .filter((m) => !rankedOnly || RANKED_QUEUES.has(m.info.queueId))
    .filter((m) => m.info.participants.some((p) => p.puuid === focusPuuid))
    .sort((a, b) => b.info.gameCreation - a.info.gameCreation); // newest first

  const sessions: PlayerSession[] = [];
  let bucket: MatchDTO[] = [];

  const flush = () => {
    if (bucket.length)
      sessions.push(summarise(bucket, focusPuuid, lpWin, lpLoss));
    bucket = [];
  };

  for (let i = 0; i < usable.length; i++) {
    const m = usable[i]!;
    if (bucket.length === 0) {
      bucket.push(m);
      continue;
    }
    // `prev` is newer than `m` (list is newest-first). Gap = prev.start - m.end.
    const prev = bucket[bucket.length - 1]!;
    const gap = prev.info.gameCreation - endOf(m);
    if (gap <= gapMs) {
      bucket.push(m);
    } else {
      flush();
      bucket.push(m);
    }
  }
  flush();
  return sessions;
}

/** Summarise the player's most recent session, or null if no usable games. */
export function currentSession(
  matches: MatchDTO[],
  focusPuuid: string,
  opts: SessionOptions = {},
): PlayerSession | null {
  return splitSessions(matches, focusPuuid, opts)[0] ?? null;
}

function summarise(
  bucket: MatchDTO[],
  focusPuuid: string,
  lpWin: number,
  lpLoss: number,
): PlayerSession {
  // bucket is newest-first.
  const games: SessionGame[] = bucket.map((m) => {
    const p = m.info.participants.find((x) => x.puuid === focusPuuid)!;
    return {
      matchId: m.metadata.matchId,
      championName: p.championName,
      queueId: m.info.queueId,
      win: p.win,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      kda: kdaValue(p.kills, p.deaths, p.assists),
      gameCreation: m.info.gameCreation,
      gameDuration: m.info.gameDuration,
      lpDeltaEst: p.win ? lpWin : -lpLoss,
    };
  });

  const wins = games.filter((g) => g.win).length;
  const losses = games.length - wins;
  const winRate = games.length ? wins / games.length : 0;
  const netLpEst = games.reduce((s, g) => s + g.lpDeltaEst, 0);

  // Current streak from the newest game backward.
  let streakType: "W" | "L" | null = null;
  let streakLen = 0;
  if (games.length) {
    streakType = games[0]!.win ? "W" : "L";
    for (const g of games) {
      if ((g.win ? "W" : "L") === streakType) streakLen++;
      else break;
    }
  }

  const startedAt = bucket.length
    ? bucket[bucket.length - 1]!.info.gameCreation
    : 0;
  const endedAt = bucket.length ? endOf(bucket[0]!) : 0;

  return {
    games,
    wins,
    losses,
    winRate,
    streakType,
    streakLen,
    netLpEst,
    lpEstimated: true,
    startedAt,
    endedAt,
    durationMs: Math.max(0, endedAt - startedAt),
    tags: computeTags(games, streakType, streakLen, wins, losses),
  };
}

/** Is the W/L pattern strictly alternating over the last `n` games? */
function isAlternating(games: SessionGame[], n: number): boolean {
  if (games.length < n) return false;
  for (let i = 1; i < n; i++) {
    if (games[i]!.win === games[i - 1]!.win) return false;
  }
  return true;
}

function computeTags(
  games: SessionGame[],
  streakType: "W" | "L" | null,
  streakLen: number,
  wins: number,
  losses: number,
): SessionTag[] {
  const tags: SessionTag[] = [];
  if (games.length === 0) return tags;

  // ── Streak-driven headline tag (at most one) ──────────────────────────────
  if (streakType === "W") {
    if (streakLen >= 4) {
      tags.push({
        id: "heater",
        label: "Heater",
        icon: "🔥",
        tone: "good",
        description: `${streakLen}-game win streak, riding it.`,
      });
    } else if (streakLen >= 2) {
      tags.push({
        id: "win-streak",
        label: "Win Streak",
        icon: "📈",
        tone: "good",
        description: `${streakLen} wins in a row.`,
      });
    } else if (games.length >= 2 && !games[1]!.win) {
      // Single win that broke a loss → bounce back.
      tags.push({
        id: "bounce-back",
        label: "Bounce Back",
        icon: "↩",
        tone: "good",
        description: "Won right after a loss, recovered the tilt.",
      });
    }
  }

  // ── Pattern / shape tags ──────────────────────────────────────────────────
  if (isAlternating(games, 4)) {
    tags.push({
      id: "coin-flip",
      label: "Coin Flip",
      icon: "🪙",
      tone: "neutral",
      description: "Alternating wins and losses, pure coin flip.",
    });
  }

  // Overall session shape, only meaningful with a few games and no streak tag.
  if (games.length >= 3 && tags.length === 0) {
    if (wins >= losses * 2) {
      tags.push({
        id: "up-session",
        label: "Up Session",
        icon: "✦",
        tone: "good",
        description: `Net positive: ${wins}W ${losses}L.`,
      });
    }
  }

  return tags;
}

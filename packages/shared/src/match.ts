/**
 * Match-v5 duration helpers.
 *
 * Riot changed the unit of `info.gameDuration` in patch 11.20:
 *   - post-11.20 matches carry `gameEndTimestamp` and report duration in SECONDS
 *   - pre-11.20 matches have NO `gameEndTimestamp` and report MILLISECONDS
 *
 * Reading the raw field therefore renders a 32-minute 2021 game as "1920:00"
 * and makes every per-minute stat (CS/min, damage share) ~1000x too small. Every
 * consumer should go through these helpers instead of touching `gameDuration`.
 *
 * See: https://developer.riotgames.com/apis#match-v5 (gameDuration field note).
 */
import type { MatchInfo } from "./riot/types.js";

/** Match length in seconds, normalised across the 11.20 unit change. */
export function matchDurationSeconds(info: MatchInfo): number {
  const raw = info.gameDuration;
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  // No end timestamp => pre-11.20 payload, where the value is milliseconds.
  return info.gameEndTimestamp === undefined ? Math.round(raw / 1000) : raw;
}

/** Match length in minutes, floored at 1 so per-minute rates never divide by ~0. */
export function matchDurationMinutes(info: MatchInfo): number {
  return Math.max(1, matchDurationSeconds(info) / 60);
}

/** When the game ended (ms epoch), derived from the duration when absent. */
export function matchEndTimestamp(info: MatchInfo): number {
  return (
    info.gameEndTimestamp ??
    info.gameCreation + matchDurationSeconds(info) * 1000
  );
}

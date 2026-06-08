import {
  ChampionMasteryDTO,
  CurrentGameParticipant,
  groupPremades,
  LeagueEntryDTO,
  MatchDTO,
  MatchTimelineDTO,
  Platform,
  RiotAccount,
  RiotApiError,
  RiotClient,
  sharedGameCounts,
  SummonerDTO,
} from "@lc/shared";
import { cache } from "../cache.js";
import { config } from "../config.js";
import { getChampionNameById, getVersion } from "../ddragonStore.js";
import { limiter } from "../ratelimit.js";

let client: RiotClient | null = null;

/**
 * Returns a Riot client. When a per-request BYOK key is supplied, a transient
 * client is created for that one call and discarded; the key is never stored,
 * logged, or cached. Otherwise the shared server-key singleton is used.
 */
function riot(byokKey?: string): RiotClient {
  if (byokKey) {
    return new RiotClient({ apiKey: byokKey });
  }
  if (!config.riotApiKey) {
    throw new ServiceError(
      503,
      "RIOT_API_KEY is not configured on the server.",
    );
  }
  if (!client) client = new RiotClient({ apiKey: config.riotApiKey });
  return client;
}

export class ServiceError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

function mapRiotError(err: unknown): never {
  if (err instanceof RiotApiError) {
    if (err.isNotFound) throw new ServiceError(404, "Not found.");
    if (err.isRateLimited)
      throw new ServiceError(429, "Rate limited by Riot. Try again shortly.");
    if (err.status === 401 || err.status === 403)
      throw new ServiceError(
        err.status,
        "Riot API key invalid or expired. Update RIOT_API_KEY.",
      );
    throw new ServiceError(502, `Riot API error (${err.status}).`);
  }
  throw err;
}

export interface RiotKeyHealth {
  status: "operational" | "degraded" | "down";
  detail: string;
}

/**
 * Validates that the shared server key actually works, for the status page.
 * Probes account-v1 with a sentinel Riot ID that is extremely unlikely to
 * exist: a 404 (not found) proves the key authenticated successfully, while
 * 401/403 means the shared key is dead. Account-independent, so it never
 * relies on a specific summoner staying registered.
 */
export async function probeSharedKey(): Promise<RiotKeyHealth> {
  if (!config.riotApiKey) {
    return {
      status: "degraded",
      detail: "No shared key set. Account features need a personal key (BYOK).",
    };
  }
  try {
    await limiter.schedule(() =>
      riot().getAccountByRiotId("na1", "ryotstatusprobe", "0000"),
    );
    return {
      status: "operational",
      detail: "Shared key valid. Account features available.",
    };
  } catch (err) {
    if (err instanceof RiotApiError) {
      if (err.isNotFound)
        return {
          status: "operational",
          detail: "Shared key valid. Account features available.",
        };
      if (err.isRateLimited)
        return {
          status: "degraded",
          detail: "Rate limited by Riot. Try again shortly.",
        };
      if (err.status === 401 || err.status === 403)
        return {
          status: "down",
          detail:
            "Shared key invalid or expired. Use your own key via Settings (BYOK).",
        };
      return {
        status: "degraded",
        detail: `Riot API responded with an error (${err.status}).`,
      };
    }
    return { status: "down", detail: "Could not reach the Riot API." };
  }
}

const soloFirst = (entries: LeagueEntryDTO[]): LeagueEntryDTO[] =>
  [...entries].sort((a, b) => {
    const rank = (q: string) =>
      q === "RANKED_SOLO_5x5" ? 0 : q === "RANKED_FLEX_SR" ? 1 : 2;
    return rank(a.queueType) - rank(b.queueType);
  });

export interface ProfileResult {
  version: string;
  account: RiotAccount;
  summoner: SummonerDTO;
  ranked: LeagueEntryDTO[];
}

export async function getProfile(
  platform: Platform,
  gameName: string,
  tagLine: string,
  byokKey?: string,
): Promise<ProfileResult> {
  try {
    const account = await cache.wrap(
      `account:${platform}:${gameName}:${tagLine}`.toLowerCase(),
      config.cacheTtl.summoner,
      () =>
        limiter.schedule(() =>
          riot(byokKey).getAccountByRiotId(platform, gameName, tagLine),
        ),
    );
    const [summoner, ranked, version] = await Promise.all([
      cache.wrap(
        `summoner:${platform}:${account.puuid}`,
        config.cacheTtl.summoner,
        () =>
          limiter.schedule(() =>
            riot(byokKey).getSummonerByPuuid(platform, account.puuid),
          ),
      ),
      getRanked(platform, account.puuid, byokKey),
      getVersion(),
    ]);
    return { version, account, summoner, ranked: soloFirst(ranked) };
  } catch (err) {
    mapRiotError(err);
  }
}

async function getRanked(
  platform: Platform,
  puuid: string,
  byokKey?: string,
): Promise<LeagueEntryDTO[]> {
  return cache.wrap(
    `ranked:${platform}:${puuid}`,
    config.cacheTtl.summoner,
    () =>
      limiter.schedule(() =>
        riot(byokKey).getLeagueEntriesByPuuid(platform, puuid),
      ),
  );
}

export interface MatchesResult {
  version: string;
  matches: MatchDTO[];
}

export async function getMatches(
  platform: Platform,
  puuid: string,
  start: number,
  count: number,
  byokKey?: string,
  filter?: { queue?: number; type?: string },
): Promise<MatchesResult> {
  try {
    const ids = await limiter.schedule(() =>
      riot(byokKey).getMatchIdsByPuuid(platform, puuid, {
        start,
        count,
        queue: filter?.queue,
        type: filter?.type,
      }),
    );
    const matches = await Promise.all(
      ids.map((id) =>
        cache.wrap(`match:${id}`, config.cacheTtl.match, () =>
          limiter.schedule(() => riot(byokKey).getMatch(platform, id)),
        ),
      ),
    );
    const version = await getVersion();
    return { version, matches };
  } catch (err) {
    mapRiotError(err);
  }
}

export interface MatchTimelineResult {
  version: string;
  match: MatchDTO;
  timeline: MatchTimelineDTO;
}

/** Deep post-game analytics: full match + its timeline. BYOK-gated (heavy). */
export async function getMatchTimeline(
  platform: Platform,
  matchId: string,
  byokKey?: string,
): Promise<MatchTimelineResult> {
  try {
    const [match, timeline, version] = await Promise.all([
      cache.wrap(`match:${matchId}`, config.cacheTtl.match, () =>
        limiter.schedule(() => riot(byokKey).getMatch(platform, matchId)),
      ),
      cache.wrap(`timeline:${matchId}`, config.cacheTtl.match, () =>
        limiter.schedule(() =>
          riot(byokKey).getMatchTimeline(platform, matchId),
        ),
      ),
      getVersion(),
    ]);
    return { version, match, timeline };
  } catch (err) {
    mapRiotError(err);
  }
}

export interface ScoutParticipant extends CurrentGameParticipant {
  gameName?: string;
  tagLine?: string;
  ranked: LeagueEntryDTO[];
  /** Premade grouping within the team (1-based index), if detected. */
  premade?: { group: number; size: number; sharedGames: number };
  /** Deep recent-form data for lane-opponent compare (best-effort). */
  recent?: PlayerRecent;
}

export interface PlayerRecent {
  /** Win/loss of the player's last N games, newest first. */
  form: boolean[];
  /** Their most-played champion across the sampled games. */
  mainChamp?: { championId: number; championName: string; games: number };
  /** Their record on the champion they are playing in THIS game. */
  onPick?: { championId: number; games: number; wins: number };
}

/**
 * Best-effort deep form for the live scout: sample each player's recent matches
 * once (cached) and derive last-N form, their main champion, and their record
 * on the champion they're locked into this game. Bounded to keep key usage sane.
 */
async function annotateRecentForm(
  platform: Platform,
  participants: ScoutParticipant[],
  byokKey?: string,
): Promise<void> {
  const SAMPLE = 8;
  await Promise.all(
    participants.map(async (p) => {
      try {
        const ids = await cache.wrap(
          `recentIds:${platform}:${p.puuid}`,
          config.cacheTtl.spectator,
          () =>
            limiter.schedule(() =>
              riot(byokKey).getMatchIdsByPuuid(platform, p.puuid, {
                start: 0,
                count: 15,
              }),
            ),
        );
        const matches = await Promise.all(
          ids
            .slice(0, SAMPLE)
            .map((id) =>
              cache
                .wrap(`match:${platform}:${id}`, config.cacheTtl.match, () =>
                  limiter.schedule(() => riot(byokKey).getMatch(platform, id)),
                )
                .catch(() => undefined),
            ),
        );

        const form: boolean[] = [];
        const champGames = new Map<number, { name: string; games: number }>();
        let onPickGames = 0;
        let onPickWins = 0;
        for (const m of matches) {
          if (!m) continue;
          const me = m.info.participants.find((x) => x.puuid === p.puuid);
          if (!me) continue;
          form.push(me.win);
          const c = champGames.get(me.championId) ?? {
            name: me.championName,
            games: 0,
          };
          c.games += 1;
          champGames.set(me.championId, c);
          if (me.championId === p.championId) {
            onPickGames += 1;
            if (me.win) onPickWins += 1;
          }
        }

        let mainChamp: PlayerRecent["mainChamp"];
        for (const [championId, v] of champGames) {
          if (!mainChamp || v.games > mainChamp.games) {
            mainChamp = { championId, championName: v.name, games: v.games };
          }
        }

        p.recent = {
          form,
          mainChamp,
          onPick:
            onPickGames > 0
              ? {
                  championId: p.championId,
                  games: onPickGames,
                  wins: onPickWins,
                }
              : undefined,
        };
      } catch {
        /* best-effort: leave this player without recent form */
      }
    }),
  );
}

/**
 * Infer premade groups per team by overlapping the players' recent match IDs.
 * One cheap match-id list call per player (cached briefly). Best-effort: any
 * failure leaves the team ungrouped rather than failing the whole scout.
 */
async function annotatePremades(
  platform: Platform,
  participants: ScoutParticipant[],
  byokKey?: string,
): Promise<void> {
  const recentByPuuid: Record<string, string[]> = {};
  await Promise.all(
    participants.map(async (p) => {
      recentByPuuid[p.puuid] = await cache
        .wrap(
          `recentIds:${platform}:${p.puuid}`,
          config.cacheTtl.spectator,
          () =>
            limiter.schedule(() =>
              riot(byokKey).getMatchIdsByPuuid(platform, p.puuid, {
                start: 0,
                count: 15,
              }),
            ),
        )
        .catch(() => [] as string[]);
    }),
  );

  for (const teamId of [...new Set(participants.map((p) => p.teamId))]) {
    const team = participants.filter((p) => p.teamId === teamId);
    const edges = sharedGameCounts(
      team.map((p) => p.puuid),
      recentByPuuid,
    );
    const groups = groupPremades(edges, 2);
    groups.forEach((g, gi) => {
      for (const puuid of g.puuids) {
        const part = team.find((p) => p.puuid === puuid);
        if (part)
          part.premade = {
            group: gi + 1,
            size: g.puuids.length,
            sharedGames: g.sharedGames,
          };
      }
    });
  }
}

export interface LiveGameResult {
  version: string;
  found: boolean;
  gameMode?: string;
  gameQueueConfigId?: number;
  gameLength?: number;
  gameStartTime?: number;
  participants: ScoutParticipant[];
}

export async function getLiveGame(
  platform: Platform,
  gameName: string,
  tagLine: string,
  byokKey?: string,
  detectPremades = false,
): Promise<LiveGameResult> {
  const version = await getVersion();
  try {
    const account = await cache.wrap(
      `account:${platform}:${gameName}:${tagLine}`.toLowerCase(),
      config.cacheTtl.summoner,
      () =>
        limiter.schedule(() =>
          riot(byokKey).getAccountByRiotId(platform, gameName, tagLine),
        ),
    );
    const game = await cache.wrap(
      `spectator:${platform}:${account.puuid}`,
      config.cacheTtl.spectator,
      () =>
        limiter.schedule(() =>
          riot(byokKey).getActiveGameByPuuid(platform, account.puuid),
        ),
    );

    const participants: ScoutParticipant[] = await Promise.all(
      game.participants.map(async (p) => {
        const [acct, ranked] = await Promise.all([
          cache
            .wrap(
              `accountByPuuid:${platform}:${p.puuid}`,
              config.cacheTtl.match,
              () =>
                limiter.schedule(() =>
                  riot(byokKey).getAccountByPuuid(platform, p.puuid),
                ),
            )
            .catch(() => undefined),
          getRanked(platform, p.puuid, byokKey).catch(
            () => [] as LeagueEntryDTO[],
          ),
        ]);
        return {
          ...p,
          gameName: acct?.gameName,
          tagLine: acct?.tagLine,
          ranked: soloFirst(ranked),
        };
      }),
    );

    if (detectPremades) {
      await Promise.all([
        annotatePremades(platform, participants, byokKey).catch(() => {
          /* best-effort: leave teams ungrouped on failure */
        }),
        annotateRecentForm(platform, participants, byokKey).catch(() => {
          /* best-effort: leave players without deep form */
        }),
      ]);
    }

    return {
      version,
      found: true,
      gameMode: game.gameMode,
      gameQueueConfigId: game.gameQueueConfigId,
      gameLength: game.gameLength,
      gameStartTime: game.gameStartTime,
      participants,
    };
  } catch (err) {
    if (err instanceof RiotApiError && err.isNotFound) {
      // 404 from spectator just means "not currently in a game".
      return { version, found: false, participants: [] };
    }
    mapRiotError(err);
  }
}

// ── account aggregate stats (Feature 2) ───────────────────────────────────────

export interface ChampStat {
  championId: number;
  championName: string;
  games: number;
  wins: number;
  losses: number;
  winRate: number;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  csPerMin: number;
}

export interface RoleStat {
  role: string; // TOP/JUNGLE/MIDDLE/BOTTOM/UTILITY
  games: number;
  share: number; // 0..1
}

export interface MasteryStat {
  championId: number;
  championName: string;
  level: number;
  points: number;
}

export interface AccountStatsResult {
  version: string;
  account: RiotAccount;
  sampleSize: number; // matches analyzed
  champions: ChampStat[];
  roles: RoleStat[];
  mastery: MasteryStat[];
  overall: {
    games: number;
    wins: number;
    losses: number;
    winRate: number;
    kda: number;
  };
}

/**
 * Aggregates per-champion / per-role stats from a player's recent matches plus
 * champion mastery. Heavy on Riot calls (one per match), so BYOK-gated.
 */
export async function getAccountStats(
  platform: Platform,
  gameName: string,
  tagLine: string,
  sample: number,
  byokKey?: string,
): Promise<AccountStatsResult> {
  const championMap = await getChampionNameById();
  try {
    const account = await cache.wrap(
      `account:${platform}:${gameName}:${tagLine}`.toLowerCase(),
      config.cacheTtl.summoner,
      () =>
        limiter.schedule(() =>
          riot(byokKey).getAccountByRiotId(platform, gameName, tagLine),
        ),
    );

    const [{ matches }, masteryRaw, version] = await Promise.all([
      getMatches(platform, account.puuid, 0, sample, byokKey),
      cache
        .wrap(
          `mastery:${platform}:${account.puuid}`,
          config.cacheTtl.summoner,
          () =>
            limiter.schedule(() =>
              riot(byokKey).getChampionMasteries(platform, account.puuid),
            ),
        )
        .catch(() => [] as ChampionMasteryDTO[]),
      getVersion(),
    ]);

    const byChamp = new Map<number, ChampStat>();
    const byRole = new Map<string, number>();
    let oWins = 0,
      oKills = 0,
      oDeaths = 0,
      oAssists = 0;

    for (const m of matches) {
      const me = m.info.participants.find((p) => p.puuid === account.puuid);
      if (!me) continue;
      const mins = Math.max(1, m.info.gameDuration / 60);
      const cs = me.totalMinionsKilled + me.neutralMinionsKilled;

      let c = byChamp.get(me.championId);
      if (!c) {
        c = {
          championId: me.championId,
          championName:
            championMap.get(me.championId) ??
            me.championName ??
            String(me.championId),
          games: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          kills: 0,
          deaths: 0,
          assists: 0,
          kda: 0,
          csPerMin: 0,
        };
        byChamp.set(me.championId, c);
      }
      c.games += 1;
      c.kills += me.kills;
      c.deaths += me.deaths;
      c.assists += me.assists;
      c.csPerMin += cs / mins;
      if (me.win) c.wins += 1;
      else c.losses += 1;

      if (me.teamPosition)
        byRole.set(me.teamPosition, (byRole.get(me.teamPosition) ?? 0) + 1);

      if (me.win) oWins += 1;
      oKills += me.kills;
      oDeaths += me.deaths;
      oAssists += me.assists;
    }

    const champions = [...byChamp.values()]
      .map((c) => ({
        ...c,
        winRate: c.games ? c.wins / c.games : 0,
        kda: c.deaths ? (c.kills + c.assists) / c.deaths : c.kills + c.assists,
        csPerMin: c.games ? c.csPerMin / c.games : 0,
      }))
      .sort((a, b) => b.games - a.games);

    const totalRoleGames = [...byRole.values()].reduce((a, b) => a + b, 0) || 1;
    const roles: RoleStat[] = [...byRole.entries()]
      .map(([role, games]) => ({ role, games, share: games / totalRoleGames }))
      .sort((a, b) => b.games - a.games);

    const mastery: MasteryStat[] = masteryRaw.slice(0, 10).map((mm) => ({
      championId: mm.championId,
      championName: championMap.get(mm.championId) ?? String(mm.championId),
      level: mm.championLevel,
      points: mm.championPoints,
    }));

    const games = matches.length;
    return {
      version,
      account,
      sampleSize: games,
      champions,
      roles,
      mastery,
      overall: {
        games,
        wins: oWins,
        losses: games - oWins,
        winRate: games ? oWins / games : 0,
        kda: oDeaths ? (oKills + oAssists) / oDeaths : oKills + oAssists,
      },
    };
  } catch (err) {
    mapRiotError(err);
  }
}

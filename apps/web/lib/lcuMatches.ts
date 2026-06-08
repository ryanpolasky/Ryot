// Normalize the League Client's local match history (legacy match-v4 shape) into
// the match-v5 `MatchDTO` the web already renders. This is how the desktop app
// surfaces event/RGM modes (ARAM Mayhem, Brawl, ...) that Riot's public
// match-v5 API never returns. Pure + defensive: malformed games are skipped.

import type { DDragonChampion, MatchDTO, MatchParticipant } from "@lc/shared";
import type {
  LcuGame,
  LcuGameParticipant,
  LcuGamePlayer,
} from "@/lib/desktop";

const num = (v: number | undefined): number => v ?? 0;

/** Best-effort map of the LCU timeline lane/role to match-v5 teamPosition. */
function teamPosition(timeline?: { lane?: string; role?: string }): string {
  const lane = (timeline?.lane ?? "").toUpperCase();
  const role = (timeline?.role ?? "").toUpperCase();
  if (lane === "BOTTOM" || lane === "BOT")
    return role.includes("SUPPORT") ? "UTILITY" : "BOTTOM";
  if (lane === "MIDDLE" || lane === "MID") return "MIDDLE";
  if (lane === "TOP") return "TOP";
  if (lane === "JUNGLE") return "JUNGLE";
  return "";
}

function toParticipant(
  p: LcuGameParticipant,
  player: LcuGamePlayer,
  byKey: Map<string, DDragonChampion>,
): MatchParticipant {
  const s = p.stats ?? {};
  return {
    puuid: player.puuid ?? "",
    riotIdGameName: player.gameName || player.summonerName || undefined,
    riotIdTagline: player.tagLine || undefined,
    summonerName: player.summonerName,
    championId: p.championId,
    // The LCU only gives championId; resolve the display name from Data Dragon
    // (needed for the build link + champion filter). MatchRow renders the icon
    // from championId regardless, so an unknown id still shows correctly.
    championName: byKey.get(String(p.championId))?.name ?? "",
    champLevel: num(s.champLevel),
    teamId: p.teamId,
    teamPosition: teamPosition(p.timeline),
    win: Boolean(s.win),
    kills: num(s.kills),
    deaths: num(s.deaths),
    assists: num(s.assists),
    totalMinionsKilled: num(s.totalMinionsKilled),
    neutralMinionsKilled: num(s.neutralMinionsKilled),
    goldEarned: num(s.goldEarned),
    visionScore: num(s.visionScore),
    totalDamageDealtToChampions: num(s.totalDamageDealtToChampions),
    item0: num(s.item0),
    item1: num(s.item1),
    item2: num(s.item2),
    item3: num(s.item3),
    item4: num(s.item4),
    item5: num(s.item5),
    item6: num(s.item6),
    summoner1Id: num(p.spell1Id),
    summoner2Id: num(p.spell2Id),
    perks: {
      statPerks: {
        offense: num(s.statPerk0),
        flex: num(s.statPerk1),
        defense: num(s.statPerk2),
      },
      styles: [
        {
          description: "primaryStyle",
          style: num(s.perkPrimaryStyle),
          selections: [s.perk0, s.perk1, s.perk2, s.perk3].map((perk) => ({
            perk: perk ?? 0,
            var1: 0,
            var2: 0,
            var3: 0,
          })),
        },
        {
          description: "subStyle",
          style: num(s.perkSubStyle),
          selections: [s.perk4, s.perk5].map((perk) => ({
            perk: perk ?? 0,
            var1: 0,
            var2: 0,
            var3: 0,
          })),
        },
      ],
    },
  };
}

/** Convert one raw LCU game into a match-v5 MatchDTO. */
export function lcuGameToMatch(
  g: LcuGame,
  byKey: Map<string, DDragonChampion>,
): MatchDTO {
  const playerByPid = new Map<number, LcuGamePlayer>(
    (g.participantIdentities ?? []).map((pi) => [pi.participantId, pi.player]),
  );
  const participants = (g.participants ?? []).map((p) =>
    toParticipant(p, playerByPid.get(p.participantId) ?? {}, byKey),
  );
  // LCU gameDuration is usually seconds, but some client versions report ms.
  const durSec =
    g.gameDuration >= 100000
      ? Math.round(g.gameDuration / 1000)
      : g.gameDuration;
  const platformId = g.platformId ?? "";
  return {
    metadata: {
      matchId: `${platformId}_${g.gameId}`,
      participants: participants.map((p) => p.puuid),
    },
    info: {
      gameCreation: g.gameCreation,
      gameDuration: durSec,
      gameEndTimestamp: g.gameCreation + durSec * 1000,
      gameMode: g.gameMode ?? "",
      gameType: g.gameType ?? "",
      gameVersion: g.gameVersion,
      queueId: g.queueId,
      mapId: num(g.mapId),
      platformId,
      participants,
    },
  };
}

/** Convert a list of raw LCU games, skipping any that are malformed. */
export function lcuGamesToMatches(
  games: LcuGame[],
  byKey: Map<string, DDragonChampion>,
): MatchDTO[] {
  const out: MatchDTO[] = [];
  for (const g of games) {
    try {
      if (g && typeof g.gameId === "number") out.push(lcuGameToMatch(g, byKey));
    } catch {
      /* skip a malformed game rather than dropping the whole list */
    }
  }
  return out;
}

/**
 * Merge client-sourced games on top of the server's match-v5 list. Server rows
 * are canonical (dedupe by matchId); client-only games (event/RGM modes) fill
 * the gaps. Sorted newest-first.
 */
export function mergeRecentMatches(
  lcu: MatchDTO[],
  server: MatchDTO[],
): MatchDTO[] {
  const seen = new Set(server.map((m) => m.metadata.matchId));
  const merged = server.concat(lcu.filter((m) => !seen.has(m.metadata.matchId)));
  return merged.sort((a, b) => b.info.gameCreation - a.info.gameCreation);
}
